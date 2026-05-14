import { NextRequest } from 'next/server';
import OpenAI from 'openai';
import { supabaseAdmin } from '../../../../lib/supabase/server';
import { getServerUser } from '../../../../lib/auth';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const basePrompt = `Professional website banner photograph for "Koala PhD", an education platform helping Chinese students find PhD supervisors in Australia.

CRITICAL RULES:
- ABSOLUTELY NO TEXT, NO WORDS, NO LETTERS, NO CHARACTERS in the image. The image must be purely visual with ZERO text of any kind.
- Photorealistic style, looks like a real professional photograph, NOT AI-generated looking
- Real human faces must look natural, not plastic or uncanny
- Natural lighting, no oversaturated colors
- Clean composition suitable for a website banner
- Academic/university/research context
- Color palette: warm tones that complement gold and teal accents
- NO watermarks, NO logos, NO icons, NO overlays

User's specific request: `;

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
