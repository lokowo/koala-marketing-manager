import { NextRequest } from 'next/server';
import OpenAI from 'openai';
import { supabaseAdmin } from '../../../lib/supabase/server';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

const CATEGORY_STYLES: Record<string, string> = {
  phd_guide: 'modern university campus, warm lighting, academic atmosphere',
  application: 'laptop with documents, clean desk, professional workspace',
  scholarship: 'graduation cap, golden theme, achievement concept',
  visa: 'travel documents, Australian landmarks in background',
  supervisor: 'professor and student in discussion, university office',
  research: 'scientific laboratory, modern research equipment',
  student_life: 'diverse students on campus, Australian university',
  news: 'Australian university aerial view, modern architecture',
  professor_spotlight: 'distinguished academic in modern research environment',
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
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

      const baseStyle = CATEGORY_STYLES[category] || CATEGORY_STYLES.phd_guide;
      const prompt = customPrompt
        ? customPrompt
        : `Create a professional blog cover image. Theme: ${baseStyle}. The image should relate to: "${title}". Style: clean, modern, editorial photography look, suitable for an academic blog. No text or words in the image. Aspect ratio 16:9.`;

      const response = await openai.images.generate({
        model: 'dall-e-3',
        prompt,
        n: 1,
        size: '1792x1024',
        quality: 'standard',
      });

      imageUrl = response.data?.[0]?.url || null;
    } catch (dalleError) {
      console.error('[blog/generate-cover] DALL-E failed, using Unsplash fallback:', dalleError);
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
