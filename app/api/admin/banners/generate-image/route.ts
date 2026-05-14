import { NextRequest } from 'next/server';
import OpenAI from 'openai';
import { supabaseAdmin } from '../../../../lib/supabase/server';
import { getServerUser } from '../../../../lib/auth';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const basePrompt = `Professional website banner image for an education technology platform called "Koala PhD" that helps Chinese students find PhD supervisors in Australia.

Mandatory requirements:
- Photorealistic style, high quality, cinematic lighting, professional composition
- Square or near-square aspect ratio (1:1), suitable for a side panel in a hero section
- Clean, modern, inspiring, premium feel
- If there is any text in the image, it MUST be in correct Simplified Chinese (简体中文). Every Chinese character must be accurate with zero errors. Double-check all Chinese text for correctness. If unsure about a character, do not include text.
- No watermarks, no stock photo feel, no generic clip art
- Color palette should complement gold (#D4A843) and teal (#4ECDC4) accent colors
- Suitable for a university/academic/PhD application context
- Images should feel aspirational and professional, targeting Chinese international students

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
