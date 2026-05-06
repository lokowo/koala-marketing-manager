import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { supabaseAdmin } from '../../../lib/supabase/server';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

interface ImagePlacement {
  insertAfterHeading: string;
  promptEn: string;
}

export async function POST(req: NextRequest) {
  try {
    const { postId, imageCount } = await req.json();

    if (!postId || !imageCount || imageCount < 1) {
      return Response.json({ success: true, imagesInserted: 0 });
    }

    console.log('[generate-images] Starting for post:', postId, 'count:', imageCount);

    // Step 1: Read post content
    console.log('[generate-images] Step 1: Reading post content...');
    const { data: post, error: fetchErr } = await db
      .from('blog_posts')
      .select('content_zh')
      .eq('id', postId)
      .single();

    if (fetchErr || !post?.content_zh) {
      console.error('[generate-images] Post not found:', fetchErr);
      return Response.json({ error: 'Post not found or has no content' }, { status: 404 });
    }
    console.log('[generate-images] Post content length:', post.content_zh.length);

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

    // Step 2: Determine image placements via Haiku
    console.log('[generate-images] Step 2: Determining placements via Haiku...');
    const placementRes = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 500,
      system: 'Return ONLY a valid JSON array. No markdown code blocks, no explanation.',
      messages: [{
        role: 'user',
        content: `Given this article, suggest ${imageCount} image placements. For each return: insertAfterHeading (exact ## heading text from the article, without the ## prefix), promptEn (30-50 word photorealistic scene description, NO text in image).\n\nArticle:\n${post.content_zh.slice(0, 3000)}\n\nReturn JSON array: [{"insertAfterHeading": "...", "promptEn": "..."}]`,
      }],
    });

    const placementText = placementRes.content[0].type === 'text' ? placementRes.content[0].text : '[]';
    const cleaned = placementText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();

    let placements: ImagePlacement[] = [];
    try {
      placements = JSON.parse(cleaned);
    } catch {
      console.error('[generate-images] Failed to parse placements:', cleaned.slice(0, 200));
      return Response.json({ success: true, imagesInserted: 0 });
    }

    placements = placements.slice(0, imageCount);
    console.log('[generate-images] Placements:', placements.length, placements.map(p => p.insertAfterHeading));

    if (placements.length === 0) {
      console.log('[generate-images] No placements found');
      return Response.json({ success: true, imagesInserted: 0 });
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
    let updatedContent = post.content_zh;
    let imagesInserted = 0;

    for (let idx = 0; idx < placements.length; idx++) {
      const placement = placements[idx];
      try {
        // Step 3: Generate image via OpenAI
        console.log(`[generate-images] Step 3.${idx + 1}: Generating image for: "${placement.insertAfterHeading}"`);
        const response = await openai.images.generate({
          model: 'gpt-image-2',
          prompt: `Photorealistic editorial photograph: ${placement.promptEn}. Professional DSLR, natural lighting, sharp focus. Absolutely NO text, NO words, NO letters, NO watermarks anywhere in the image.`,
          n: 1,
          size: '1024x1024',
          quality: 'low',
        });

        const imageData = response.data?.[0];
        if (!imageData) {
          console.error(`[generate-images] No image data returned for placement ${idx + 1}`);
          continue;
        }
        console.log(`[generate-images] Image ${idx + 1} format: b64_json=${!!imageData.b64_json}, url=${!!imageData.url}`);

        // Step 4: Download image data
        console.log(`[generate-images] Step 4.${idx + 1}: Preparing image buffer...`);
        let imgBuffer: Buffer;

        if (imageData.b64_json) {
          imgBuffer = Buffer.from(imageData.b64_json, 'base64');
          console.log(`[generate-images] Decoded b64_json, buffer size: ${imgBuffer.length}`);
        } else if (imageData.url) {
          console.log(`[generate-images] Downloading from temp URL: ${imageData.url.slice(0, 80)}...`);
          const imgRes = await fetch(imageData.url);
          if (!imgRes.ok) {
            console.error(`[generate-images] Download failed: ${imgRes.status} ${imgRes.statusText}`);
            continue;
          }
          imgBuffer = Buffer.from(await imgRes.arrayBuffer());
          console.log(`[generate-images] Downloaded, buffer size: ${imgBuffer.length}`);
        } else {
          console.error(`[generate-images] No b64_json or url in response for placement ${idx + 1}`);
          continue;
        }

        // Step 5: Upload to Supabase Storage
        const fileName = `inline/${postId}-${idx}-${Date.now()}.png`;
        console.log(`[generate-images] Step 5.${idx + 1}: Uploading to Supabase Storage: ${fileName}`);

        const { error: uploadErr } = await db.storage
          .from('blog-images')
          .upload(fileName, imgBuffer, {
            contentType: 'image/png',
            upsert: true,
          });

        if (uploadErr) {
          console.error(`[generate-images] Upload failed:`, uploadErr);
          try {
            await db.storage.createBucket('blog-images', { public: true });
            const { error: retryErr } = await db.storage
              .from('blog-images')
              .upload(fileName, imgBuffer, { contentType: 'image/png', upsert: true });
            if (retryErr) {
              console.error(`[generate-images] Retry upload failed:`, retryErr);
              continue;
            }
          } catch (bucketErr) {
            console.error(`[generate-images] Bucket creation failed:`, bucketErr);
            continue;
          }
        }

        const { data: urlData } = db.storage.from('blog-images').getPublicUrl(fileName);
        const permanentUrl = urlData.publicUrl;
        console.log(`[generate-images] Permanent URL: ${permanentUrl.slice(0, 80)}...`);

        // Step 6: Insert into markdown content
        const headingPattern = new RegExp(
          `(##\\s*${placement.insertAfterHeading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^\n]*)`,
          'i'
        );

        const match = updatedContent.match(headingPattern);
        if (match && match.index !== undefined) {
          const insertPos = match.index + match[0].length;
          const imageMarkdown = `\n\n![${placement.insertAfterHeading}](${permanentUrl})\n`;
          updatedContent = updatedContent.slice(0, insertPos) + imageMarkdown + updatedContent.slice(insertPos);
          imagesInserted++;
          console.log(`[generate-images] Step 6.${idx + 1}: Inserted image after: "${placement.insertAfterHeading}"`);
        } else {
          console.warn(`[generate-images] Heading not found in content: "${placement.insertAfterHeading}"`);
        }
      } catch (e: unknown) {
        const errMsg = e instanceof Error ? e.message : String(e);
        console.error(`[generate-images] Image ${idx + 1} failed:`, errMsg);
      }
    }

    // Step 7: Update post content in DB
    if (imagesInserted > 0) {
      console.log(`[generate-images] Step 7: Updating DB with ${imagesInserted} new images...`);
      await db
        .from('blog_posts')
        .update({ content_zh: updatedContent })
        .eq('id', postId);
    }

    console.log('[generate-images] Done! Inserted', imagesInserted, 'images for post:', postId);
    return Response.json({ success: true, imagesInserted });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error('[generate-images] Fatal error:', errMsg);
    return Response.json({ error: errMsg }, { status: 500 });
  }
}
