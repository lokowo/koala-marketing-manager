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

    const { data: post, error: fetchErr } = await db
      .from('blog_posts')
      .select('content_zh')
      .eq('id', postId)
      .single();

    if (fetchErr || !post?.content_zh) {
      console.error('[generate-images] Post not found:', fetchErr);
      return Response.json({ error: 'Post not found or has no content' }, { status: 404 });
    }

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

    console.log('[generate-images] Determining placements via Haiku...');
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
    if (placements.length === 0) {
      console.log('[generate-images] No placements found');
      return Response.json({ success: true, imagesInserted: 0 });
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
    let updatedContent = post.content_zh;
    let imagesInserted = 0;

    for (const placement of placements) {
      try {
        console.log('[generate-images] Generating image for:', placement.insertAfterHeading);
        const response = await openai.images.generate({
          model: 'gpt-image-1',
          prompt: `Photorealistic editorial photograph: ${placement.promptEn}. Professional DSLR, natural lighting, sharp focus. Absolutely NO text, NO words, NO letters, NO watermarks anywhere in the image.`,
          n: 1,
          size: '1024x1024',
          quality: 'low',
        });

        const imageUrl = response.data?.[0]?.url || null;
        if (!imageUrl) continue;

        const headingPattern = new RegExp(
          `(##\\s*${placement.insertAfterHeading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^\n]*)`,
          'i'
        );

        const match = updatedContent.match(headingPattern);
        if (match && match.index !== undefined) {
          const insertPos = match.index + match[0].length;
          const imageMarkdown = `\n\n![${placement.insertAfterHeading}](${imageUrl})\n`;
          updatedContent = updatedContent.slice(0, insertPos) + imageMarkdown + updatedContent.slice(insertPos);
          imagesInserted++;
          console.log('[generate-images] Inserted image after:', placement.insertAfterHeading);
        }
      } catch (e: unknown) {
        const errMsg = e instanceof Error ? e.message : String(e);
        console.error('[generate-images] Image generation failed for:', placement.insertAfterHeading, errMsg);
      }
    }

    if (imagesInserted > 0) {
      await db
        .from('blog_posts')
        .update({ content_zh: updatedContent })
        .eq('id', postId);
    }

    console.log('[generate-images] Done! Inserted', imagesInserted, 'images');
    return Response.json({ success: true, imagesInserted });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error('[generate-images] Fatal error:', errMsg);
    return Response.json({ error: errMsg }, { status: 500 });
  }
}
