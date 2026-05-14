import { NextRequest } from 'next/server';
import OpenAI from 'openai';
import { supabaseAdmin } from '../../../../lib/supabase/server';
import { getServerUser } from '../../../../lib/auth';
import { aiLimiter } from '../../../../lib/ratelimit';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const basePrompt = `CRITICAL: The image must contain ABSOLUTELY NO text, words, letters, numbers, signs, or characters of any language. No watermarks. No logos.

Style: Documentary photography. Kodak Portra 400 film. Warm muted tones, visible film grain, soft natural light. Shallow depth of field with circular bokeh. Slight vignetting at edges.

Lighting: Golden hour or overcast diffused daylight only. No flash, no studio lighting.

People (if any): East Asian university students in their 20s. Natural skin with visible texture and pores. Candid expressions, not posed. Natural clothing with wrinkles.

Setting: Australian university campus environment.

Scene: `;

export async function POST(req: NextRequest) {
  try {
    const user = await getServerUser();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    if (aiLimiter) {
      const { success } = await aiLimiter.limit(user.id);
      if (!success) return Response.json({ error: '操作太频繁，请稍后再试' }, { status: 429 });
    }

    const { prompt, size } = await req.json();

    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return Response.json({ success: false, error: '请输入图片描述' }, { status: 400 });
    }

    const fullPrompt = basePrompt + prompt.trim();

    const response = await openai.images.generate({
      model: 'gpt-image-1',
      prompt: fullPrompt,
      size: size || '1536x1024',
      quality: 'high',
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
