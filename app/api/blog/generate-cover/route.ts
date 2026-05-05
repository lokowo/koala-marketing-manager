import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { supabaseAdmin } from '../../../lib/supabase/server';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

const CATEGORY_IMAGE_CONTEXT: Record<string, string> = {
  phd_guide: 'students reading in a sunlit modern university library with floor-to-ceiling windows warm wood tones',
  application: 'neat organized desk with laptop notebook and coffee soft morning light through window minimalist',
  scholarship: 'aerial view of beautiful Australian university campus with green lawns and sandstone buildings',
  visa: 'modern airport terminal with natural light clean architecture',
  supervisor: 'bright modern university office with bookshelves plants natural light warm atmosphere',
  research: 'clean modern research laboratory with glass equipment natural light organized workspace',
  student_life: 'cozy university campus courtyard with trees autumn light',
  news: 'modern glass university building exterior at golden hour dramatic sky architectural photography',
  professor_spotlight: 'elegant university corridor with arched windows warm sunlight streaming in academic atmosphere',
};

const CATEGORY_KEYWORDS: Record<string, string> = {
  phd_guide: 'university,campus,study',
  application: 'documents,laptop,workspace',
  scholarship: 'graduation,achievement,academic',
  visa: 'travel,passport,australia',
  supervisor: 'professor,meeting,office',
  research: 'laboratory,science,research',
  student_life: 'students,campus,university',
  news: 'university,architecture,modern',
  professor_spotlight: 'academic,professor,research',
};

export async function POST(req: NextRequest) {
  try {
    const { postId } = await req.json();
    console.log('[generate-cover] Starting for post:', postId);

    if (!postId) {
      return Response.json({ error: 'postId required' }, { status: 400 });
    }

    const { data: post, error: fetchErr } = await db
      .from('blog_posts')
      .select('title_zh, title_en, category, tags')
      .eq('id', postId)
      .single();

    if (fetchErr || !post) {
      console.error('[generate-cover] Post not found:', fetchErr);
      return Response.json({ error: 'Post not found' }, { status: 404 });
    }

    const title = post.title_zh || post.title_en || '';
    const category = post.category || 'phd_guide';
    let imageUrl: string | null = null;

    try {
      const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

      console.log('[generate-cover] Extracting keywords via Haiku...');
      let keywords: string[] = [];
      try {
        const kwRes = await anthropic.messages.create({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 200,
          system: 'Return ONLY a valid JSON array of 3-5 English strings. No markdown, no explanation.',
          messages: [{ role: 'user', content: `Extract 3-5 English photography keywords for a cover image from this article title: "${title}"` }],
        });
        const kwText = kwRes.content[0].type === 'text' ? kwRes.content[0].text : '[]';
        keywords = JSON.parse(kwText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim());
      } catch (e) {
        console.error('[generate-cover] Keyword extraction failed:', e);
        keywords = ['university', 'research', 'Australia'];
      }

      const categoryContext = CATEGORY_IMAGE_CONTEXT[category] || CATEGORY_IMAGE_CONTEXT.news;
      const coverPrompt = `Background/scene: ${categoryContext}. Subject: ${keywords.join(', ')}. Key details: Professional editorial photography, golden hour natural lighting, shallow depth of field, clean composition, magazine cover quality. Constraints: Absolutely NO text, NO words, NO letters, NO numbers, NO watermarks, NO logos, NO signs anywhere in the image. No clearly visible human faces. Photorealistic style, not illustrated or CGI. IMPORTANT: The image must contain ZERO text of any kind.`;

      console.log('[generate-cover] Calling OpenAI gpt-image-1...', { postId, keywords });

      const response = await openai.images.generate({
        model: 'gpt-image-1',
        prompt: coverPrompt,
        n: 1,
        size: '1536x1024',
        quality: 'high',
      });

      imageUrl = response.data?.[0]?.url || null;
      if (imageUrl) {
        console.log('[generate-cover] Image generated:', imageUrl.slice(0, 80) + '...');
      }
    } catch (imgError: unknown) {
      const errMsg = imgError instanceof Error ? imgError.message : String(imgError);
      console.error('[generate-cover] OpenAI error:', errMsg);
    }

    if (!imageUrl) {
      console.log('[generate-cover] Using Unsplash fallback');
      const keywords = CATEGORY_KEYWORDS[category] || 'university,academic';
      imageUrl = `https://source.unsplash.com/1200x630/?${keywords}`;
    }

    const { error } = await db
      .from('blog_posts')
      .update({ cover_image_url: imageUrl })
      .eq('id', postId);

    if (error) {
      console.error('[generate-cover] DB update failed:', error);
      return Response.json({ error: error.message, imageUrl }, { status: 500 });
    }

    console.log('[generate-cover] Done for post:', postId);
    return Response.json({ success: true, imageUrl });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error('[generate-cover] Fatal error:', errMsg);
    return Response.json({ error: errMsg }, { status: 500 });
  }
}
