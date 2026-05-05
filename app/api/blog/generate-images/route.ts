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
      return Response.json({ error: 'postId and imageCount (1-3) required' }, { status: 400 });
    }

    const { data: post, error: fetchErr } = await db
      .from('blog_posts')
      .select('content_zh')
      .eq('id', postId)
      .single();

    if (fetchErr || !post?.content_zh) {
      return Response.json({ error: 'Post not found or has no content' }, { status: 404 });
    }

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

    const placementRes = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 500,
      messages: [{
        role: 'user',
        content: `Given this article, suggest ${imageCount} image placements. For each: insertAfterHeading (exact heading text from the article, without the ## prefix), promptEn (English image description, 30-50 words, photographic style, no text in image).\n\nArticle:\n${post.content_zh.slice(0, 3000)}\n\nReturn JSON array only: [{"insertAfterHeading": "...", "promptEn": "..."}]`,
      }],
      system: 'Return valid JSON array only. No markdown code blocks.',
    });

    const placementText = placementRes.content[0].type === 'text' ? placementRes.content[0].text : '[]';
    const cleaned = placementText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();

    let placements: ImagePlacement[] = [];
    try {
      placements = JSON.parse(cleaned);
    } catch {
      return Response.json({ error: 'Failed to parse image placements' }, { status: 500 });
    }

    placements = placements.slice(0, imageCount);
    if (placements.length === 0) {
      return Response.json({ success: true, imagesInserted: 0 });
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
    let updatedContent = post.content_zh;
    let imagesInserted = 0;

    for (const placement of placements) {
      let imageUrl: string | null = null;

      try {
        const response = await openai.images.generate({
          model: 'dall-e-3',
          prompt: `${placement.promptEn}. Style: clean, modern editorial photography. No text or words in the image.`,
          n: 1,
          size: '1024x1024',
          quality: 'standard',
        });
        imageUrl = response.data?.[0]?.url || null;
      } catch {
        continue;
      }

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
      }
    }

    if (imagesInserted > 0) {
      await db
        .from('blog_posts')
        .update({ content_zh: updatedContent })
        .eq('id', postId);
    }

    return Response.json({ success: true, imagesInserted });
  } catch (error) {
    console.error('[blog/generate-images]', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
