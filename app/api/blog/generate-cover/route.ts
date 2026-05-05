import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { supabaseAdmin } from '../../../lib/supabase/server';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

const CATEGORY_CONTEXT: Record<string, string> = {
  phd_guide: 'Australian university campus, academic atmosphere, warm natural light',
  application: 'documents and laptop on clean desk, PhD application preparation',
  scholarship: 'golden graduation cap, academic achievement, Australian university',
  visa: 'Australian landmarks, travel documents, student visa concept',
  supervisor: 'professor mentoring student in modern university office',
  research: 'scientific laboratory with modern research equipment',
  student_life: 'international students enjoying Australian campus life',
  news: 'modern Australian university architecture, aerial perspective',
  professor_spotlight: 'distinguished professor in research lab environment',
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
    const { postId, title, category, customPrompt } = await req.json();

    if (!postId) {
      return Response.json({ error: 'postId required' }, { status: 400 });
    }

    let imageUrl: string | null = null;

    try {
      const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

      let prompt = customPrompt;
      if (!prompt) {
        const categoryCtx = CATEGORY_CONTEXT[category] || CATEGORY_CONTEXT.phd_guide;
        const kwRes = await anthropic.messages.create({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 200,
          messages: [{ role: 'user', content: `Given this blog title and category context, generate a concise English image prompt (30-50 words) for a professional blog cover photo.\n\nTitle: ${title}\nCategory context: ${categoryCtx}\n\nRequirements: photographic style, no text in image, clean modern editorial look, 16:9 composition.\n\nReturn ONLY the prompt text, nothing else.` }],
          system: 'Return only the image prompt text. No quotes, no explanation.',
        });
        prompt = kwRes.content[0].type === 'text' ? kwRes.content[0].text.trim() : '';
        if (!prompt) prompt = `Professional blog cover: ${categoryCtx}. Clean editorial photography, no text.`;
      }

      const response = await openai.images.generate({
        model: 'gpt-image-1',
        prompt: `${prompt}. Style: clean, modern editorial photography. No text or words in the image.`,
        n: 1,
        size: '1536x1024',
        quality: 'high',
      });

      imageUrl = response.data?.[0]?.url || null;
    } catch (imgError) {
      console.error('[blog/generate-cover] Image generation failed, using Unsplash fallback:', imgError);
    }

    if (!imageUrl) {
      const keywords = CATEGORY_KEYWORDS[category] || 'university,academic';
      imageUrl = `https://source.unsplash.com/1200x630/?${keywords}`;
    }

    const { error } = await db
      .from('blog_posts')
      .update({ cover_image_url: imageUrl })
      .eq('id', postId);

    if (error) {
      return Response.json({ error: error.message, imageUrl }, { status: 500 });
    }

    return Response.json({ success: true, imageUrl });
  } catch (error) {
    console.error('[blog/generate-cover]', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
