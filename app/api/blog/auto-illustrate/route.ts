import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { supabaseAdmin } from '../../../lib/supabase/server';
import { requireAdmin } from '../../../lib/auth';

export const maxDuration = 300;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function callWithRetry(fn: () => Promise<any>, maxRetries = 3): Promise<any> {
  for (let i = 0; i < maxRetries; i++) {
    try { return await fn(); }
    catch (e: unknown) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((e as any)?.status === 429 && i < maxRetries - 1) {
        console.log(`[auto-illustrate] Rate limited, waiting 15s before retry ${i + 1}/${maxRetries}`);
        await new Promise(r => setTimeout(r, 15000));
      } else throw e;
    }
  }
}

export async function POST(req: NextRequest) {
  try { await requireAdmin(); } catch { return Response.json({ error: 'Forbidden' }, { status: 403 }); }
  try {
    const { postId, imageCount: rawCount } = await req.json();
    const imageCount = Math.min(Math.max(1, rawCount || 1), 2);

    if (!postId) {
      return Response.json({ error: 'postId required' }, { status: 400 });
    }

    if (!process.env.OPENAI_API_KEY) {
      console.error('[auto-illustrate] OPENAI_API_KEY not configured');
      return Response.json({ error: 'OpenAI API key 未配置' }, { status: 503 });
    }

    const { data: post, error: fetchErr } = await db
      .from('blog_posts')
      .select('content_zh')
      .eq('id', postId)
      .single();

    if (fetchErr || !post?.content_zh) {
      console.error('[auto-illustrate] Post not found:', fetchErr);
      return Response.json({ error: 'Post not found' }, { status: 404 });
    }

    console.log(`[auto-illustrate] Starting for post ${postId}, ${imageCount} images`);

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY!, timeout: 150000 });

    // Step 1: Get image placement suggestions from Haiku
    console.log('[auto-illustrate] Step 1: Getting placement suggestions...');
    const placementRes = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 500,
      system: 'Return ONLY a valid JSON array. No markdown code blocks, no explanation.',
      messages: [{
        role: 'user',
        content: `Given this article, suggest exactly ${imageCount} image placements (maximum 2). Space them evenly throughout the article. For each return: suggestedHeading (exact ## heading text from the article, without the ## prefix), promptEn (30-50 word photorealistic scene description, NO text in image).\n\nArticle:\n${post.content_zh.slice(0, 3000)}\n\nReturn JSON array: [{"suggestedHeading": "...", "promptEn": "..."}]`,
      }],
    });

    const placementText = placementRes.content[0].type === 'text' ? placementRes.content[0].text : '[]';
    const cleaned = placementText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();

    let prompts: { suggestedHeading: string; promptEn: string }[] = [];
    try {
      let jsonStr = cleaned;
      const arrMatch = cleaned.match(/\[[\s\S]*\]/);
      if (arrMatch) jsonStr = arrMatch[0];
      try { JSON.parse(jsonStr); } catch { jsonStr = jsonStr.replace(/,\s*([}\]])/g, '$1'); }
      const parsed = JSON.parse(jsonStr);
      prompts = parsed.slice(0, imageCount).map((p: { suggestedHeading?: string; insertAfterHeading?: string; promptEn: string }) => ({
        suggestedHeading: p.suggestedHeading || p.insertAfterHeading || '',
        promptEn: p.promptEn,
      }));
    } catch {
      console.error('[auto-illustrate] Failed to parse placement suggestions');
      return Response.json({ error: 'Failed to parse prompts' }, { status: 500 });
    }

    if (prompts.length === 0) {
      console.log('[auto-illustrate] No prompts generated');
      return Response.json({ success: true, imagesInserted: 0 });
    }

    console.log(`[auto-illustrate] Step 2: Generating ${prompts.length} images...`);

    // Step 2: Generate images sequentially (to respect rate limits)
    const generatedImages: { url: string; heading: string }[] = [];
    for (let i = 0; i < prompts.length; i++) {
      const prompt = prompts[i];
      try {
        const imgPrompt = `Editorial photograph captured on Kodak Portra 400 film with a Hasselblad 500C medium format camera. Natural ambient lighting, subtle film grain, organic color rendering with warm undertones. Shallow depth of field, f/2.8. No AI artifacts, no synthetic textures, no CGI elements. Subject: ${prompt.promptEn}. Style: photojournalistic documentary aesthetic, as published in National Geographic or The New York Times Magazine. Absolutely NO text, NO words, NO letters, NO watermarks anywhere in the image.`;

        const response = await callWithRetry(() => openai.images.generate({
          model: 'gpt-image-2',
          prompt: imgPrompt,
          n: 1,
          size: '1024x1024',
          quality: 'high',
        }));

        const item = response.data?.[0];
        let imageB64 = item?.b64_json;
        if (!imageB64 && item?.url) {
          const imgRes = await fetch(item.url);
          if (imgRes.ok) {
            const arrBuf = await imgRes.arrayBuffer();
            imageB64 = Buffer.from(arrBuf).toString('base64');
          }
        }

        if (!imageB64) {
          console.error(`[auto-illustrate] Image ${i} returned no data`);
          continue;
        }

        const imgBuffer = Buffer.from(imageB64, 'base64');
        const fileName = `inline/${postId}-${i}-${Date.now()}.png`;

        const { error: uploadErr } = await db.storage
          .from('blog-images')
          .upload(fileName, imgBuffer, { contentType: 'image/png', upsert: true });

        if (uploadErr) {
          await db.storage.createBucket('blog-images', { public: true }).catch(() => {});
          const { error: retryErr } = await db.storage
            .from('blog-images')
            .upload(fileName, imgBuffer, { contentType: 'image/png', upsert: true });
          if (retryErr) {
            console.error(`[auto-illustrate] Upload failed for image ${i}:`, retryErr);
            continue;
          }
        }

        const { data: urlData } = db.storage.from('blog-images').getPublicUrl(fileName);
        generatedImages.push({ url: urlData.publicUrl, heading: prompt.suggestedHeading });
        console.log(`[auto-illustrate] Image ${i} generated and uploaded`);
      } catch (err) {
        console.error(`[auto-illustrate] Image ${i} failed:`, (err as Error).message);
      }
    }

    if (generatedImages.length === 0) {
      console.log('[auto-illustrate] All image generation failed');
      return Response.json({ success: true, imagesInserted: 0 });
    }

    // Step 3: Insert images into article content
    console.log(`[auto-illustrate] Step 3: Inserting ${generatedImages.length} images into content...`);
    let updatedContent = post.content_zh;

    const withPositions = generatedImages.map(img => {
      const pattern = new RegExp(
        `(##\\s*${img.heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^\n]*)`,
        'i'
      );
      const match = updatedContent.match(pattern);
      return { ...img, matchIndex: match?.index ?? -1, matchLength: match?.[0].length ?? 0 };
    });

    withPositions
      .filter(img => img.matchIndex >= 0)
      .sort((a, b) => b.matchIndex - a.matchIndex)
      .forEach(img => {
        const insertPos = img.matchIndex + img.matchLength;
        const imageMarkdown = `\n\n![](${img.url})\n`;
        updatedContent = updatedContent.slice(0, insertPos) + imageMarkdown + updatedContent.slice(insertPos);
      });

    const { error: updateErr } = await db
      .from('blog_posts')
      .update({ content_zh: updatedContent })
      .eq('id', postId);

    if (updateErr) {
      console.error('[auto-illustrate] DB update failed:', updateErr);
      return Response.json({ error: 'Failed to update content' }, { status: 500 });
    }

    console.log(`[auto-illustrate] Done: ${generatedImages.length} images inserted for post ${postId}`);
    return Response.json({ success: true, imagesInserted: generatedImages.length });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error('[auto-illustrate] Fatal error:', errMsg);
    return Response.json({ error: errMsg }, { status: 500 });
  }
}
