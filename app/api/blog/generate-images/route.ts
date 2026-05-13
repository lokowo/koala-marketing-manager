import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { supabaseAdmin } from '../../../lib/supabase/server';
import { requireAdmin } from '../../../lib/auth';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

export async function POST(req: NextRequest) {
  try { await requireAdmin(); } catch { return Response.json({ error: 'Forbidden' }, { status: 403 }); }
  try {
    const { postId, imageCount } = await req.json();

    if (!postId || !imageCount || imageCount < 1) {
      return Response.json({ prompts: [] });
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
      system: 'Return ONLY a valid JSON array. No markdown code blocks, no explanation.',
      messages: [{
        role: 'user',
        content: `Given this article, suggest ${imageCount} image placements. For each return: suggestedHeading (exact ## heading text from the article, without the ## prefix), promptEn (30-50 word photorealistic scene description, NO text in image).\n\nArticle:\n${post.content_zh.slice(0, 3000)}\n\nReturn JSON array: [{"suggestedHeading": "...", "promptEn": "..."}]`,
      }],
    });

    const placementText = placementRes.content[0].type === 'text' ? placementRes.content[0].text : '[]';
    const cleaned = placementText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();

    let prompts: { suggestedHeading: string; promptEn: string }[] = [];
    try {
      const parsed = JSON.parse(cleaned);
      prompts = parsed.slice(0, imageCount).map((p: { suggestedHeading?: string; insertAfterHeading?: string; promptEn: string }, i: number) => ({
        index: i,
        suggestedHeading: p.suggestedHeading || p.insertAfterHeading || '',
        promptEn: p.promptEn,
      }));
    } catch {
      return Response.json({ prompts: [] });
    }

    return Response.json({ prompts });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error('[generate-images] Fatal error:', errMsg);
    return Response.json({ error: errMsg }, { status: 500 });
  }
}
