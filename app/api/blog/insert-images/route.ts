import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { supabaseAdmin } from '../../../lib/supabase/server';
import { requireAdmin } from '../../../lib/auth';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

interface ImageToInsert {
  url: string;
  alt?: string;
  position: 'auto' | string; // 'auto' or 'after:heading_text'
}

export async function POST(req: NextRequest) {
  try { await requireAdmin(); } catch { return Response.json({ error: 'Forbidden' }, { status: 403 }); }
  try {
    const { postId, images } = await req.json() as { postId: string; images: ImageToInsert[] };

    if (!postId || !images?.length) {
      return Response.json({ error: 'postId and images required' }, { status: 400 });
    }

    const { data: post, error: fetchErr } = await db
      .from('blog_posts')
      .select('content_zh, content_en')
      .eq('id', postId)
      .single();

    if (fetchErr || !post?.content_zh) {
      return Response.json({ error: 'Post not found' }, { status: 404 });
    }

    const autoImages = images.filter(img => img.position === 'auto');
    const manualImages = images.filter(img => img.position !== 'auto');

    const resolvedImages: { url: string; alt: string; heading: string }[] = [];

    // Resolve auto positions via Claude
    if (autoImages.length > 0) {
      const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

      const headings = (post.content_zh.match(/^##\s+(.+)$/gm) || [])
        .map((h: string) => h.replace(/^##\s+/, ''));

      const res = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 300,
        system: 'Return ONLY a valid JSON array. No markdown code blocks, no explanation.',
        messages: [{
          role: 'user',
          content: `I have ${autoImages.length} images to insert into an article. The article has these ## headings: ${JSON.stringify(headings)}. Choose the best heading to insert each image after. Space them out evenly — never put two images next to each other. Return JSON: [{"imageIndex": 0, "afterHeading": "exact heading text"}]`,
        }],
      });

      const text = res.content[0].type === 'text' ? res.content[0].text : '[]';
      const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();

      try {
        const placements = JSON.parse(cleaned) as { imageIndex: number; afterHeading: string }[];
        for (const p of placements) {
          const img = autoImages[p.imageIndex];
          if (img) {
            resolvedImages.push({
              url: img.url,
              alt: img.alt || '',
              heading: p.afterHeading,
            });
          }
        }
      } catch {
        // Fallback: distribute evenly
        for (let i = 0; i < autoImages.length; i++) {
          const headingIdx = Math.floor((i + 1) * headings.length / (autoImages.length + 1));
          resolvedImages.push({
            url: autoImages[i].url,
            alt: autoImages[i].alt || '',
            heading: headings[headingIdx] || headings[headings.length - 1] || '',
          });
        }
      }
    }

    // Add manual positions
    for (const img of manualImages) {
      const heading = img.position.startsWith('after:') ? img.position.slice(6) : img.position;
      resolvedImages.push({ url: img.url, alt: img.alt || '', heading });
    }

    // Insert images into content (process from bottom to avoid offset issues)
    let updatedContent = post.content_zh;

    // Sort by position in content (descending) so we insert from bottom up
    const withPositions = resolvedImages.map(img => {
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
        const imageMarkdown = `\n\n![${img.alt}](${img.url})\n`;
        updatedContent = updatedContent.slice(0, insertPos) + imageMarkdown + updatedContent.slice(insertPos);
      });

    // Update DB
    await db
      .from('blog_posts')
      .update({ content_zh: updatedContent })
      .eq('id', postId);

    return Response.json({ success: true, updatedContent });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error('[insert-images] Fatal error:', errMsg);
    return Response.json({ error: errMsg }, { status: 500 });
  }
}
