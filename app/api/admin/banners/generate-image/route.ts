import { NextRequest } from 'next/server';
import OpenAI from 'openai';
import { supabaseAdmin } from '../../../../lib/supabase/server';
import { getServerUser } from '../../../../lib/auth';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const basePrompt = `A real photograph taken with a Canon EOS R5 camera, 85mm f/1.4 lens.

MANDATORY STYLE REQUIREMENTS:
- Must look like a REAL photograph taken by a professional photographer, NOT AI-generated
- Shot on film stock Kodak Portra 400 — warm skin tones, soft natural grain, muted highlights
- Natural lens imperfections: subtle bokeh, slight vignetting at edges, natural depth of field
- Real-world lighting ONLY: golden hour sunlight, overcast diffused light, or indoor ambient light
- NO perfect symmetry, NO plastic skin, NO HDR over-processing, NO over-sharpening
- Skin texture must be visible and natural — pores, subtle blemishes, natural shadows under eyes
- Clothing should have natural wrinkles and fabric texture
- Background should have natural blur (shallow depth of field) with real bokeh circles
- Colors should be slightly desaturated, NOT oversaturated or neon
- NO lens flare effects, NO dramatic color grading, NO cinematic blue/orange toning
- Avoid uncanny valley — if there are people, they must look completely real

COMPOSITION:
- Rule of thirds framing
- Natural candid moment, not posed or staged looking
- Environmental context: real university buildings, real libraries, real laboratories

ABSOLUTELY NO TEXT, NO WORDS, NO LETTERS, NO CHARACTERS of any language in the image.

CONTEXT: This is for Koala PhD, a platform helping Chinese students find PhD supervisors in Australian universities.

Specific scene requested: `;

export async function POST(req: NextRequest) {
  try {
    const user = await getServerUser();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { prompt, size } = await req.json();

    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return Response.json({ success: false, error: '请输入图片描述' }, { status: 400 });
    }

    const fullPrompt = basePrompt + prompt.trim();

    const response = await openai.images.generate({
      model: 'gpt-image-1',
      prompt: fullPrompt,
      size: size || '1024x1024',
      quality: 'medium',
      n: 1,
    });

    const imageBase64 = response.data?.[0]?.b64_json;
    if (!imageBase64) {
      return Response.json({ success: false, error: 'AI 未返回图片' }, { status: 500 });
    }

    const fileName = `ai-banner-${Date.now()}_${Math.random().toString(36).slice(2, 8)}.png`;
    const buffer = Buffer.from(imageBase64, 'base64');

    const { error: uploadError } = await db.storage
      .from('banners')
      .upload(fileName, buffer, {
        contentType: 'image/png',
        upsert: false,
      });

    if (uploadError) {
      console.error('[ai-banner upload]', uploadError);
      return Response.json({ success: false, error: '图片上传失败' }, { status: 500 });
    }

    const { data: urlData } = db.storage.from('banners').getPublicUrl(fileName);

    return Response.json({ success: true, imageUrl: urlData.publicUrl });
  } catch (e) {
    console.error('[ai-banner generate]', e);
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return Response.json({ success: false, error: `生成失败: ${msg}` }, { status: 500 });
  }
}
