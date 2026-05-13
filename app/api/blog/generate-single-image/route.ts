import { NextRequest } from 'next/server';
import OpenAI from 'openai';
import { supabaseAdmin } from '../../../lib/supabase/server';
import { requireAdmin } from '../../../lib/auth';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function callWithRetry(fn: () => Promise<any>, maxRetries = 3): Promise<any> {
  for (let i = 0; i < maxRetries; i++) {
    try { return await fn(); }
    catch (e: unknown) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((e as any)?.status === 429 && i < maxRetries - 1) {
        console.log(`[generate-single-image] Rate limited, waiting 15s before retry ${i + 1}/${maxRetries}`);
        await new Promise(r => setTimeout(r, 15000));
      } else throw e;
    }
  }
}

export async function POST(req: NextRequest) {
  try { await requireAdmin(); } catch { return Response.json({ error: 'Forbidden' }, { status: 403 }); }
  try {
    const { postId, promptEn, index } = await req.json();

    if (!postId || !promptEn) {
      return Response.json({ error: 'postId and promptEn required' }, { status: 400 });
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
    const IMAGE_MODELS = ['gpt-image-2', 'gpt-image-1', 'dall-e-3'];
    const imgPrompt = `Photorealistic editorial photograph: ${promptEn}. Professional DSLR, natural lighting, sharp focus. Absolutely NO text, NO words, NO letters, NO watermarks anywhere in the image.`;

    let imageB64: string | undefined;

    for (const model of IMAGE_MODELS) {
      try {
        if (model === 'dall-e-3') {
          const response = await callWithRetry(() => openai.images.generate({
            model: 'dall-e-3',
            prompt: imgPrompt,
            n: 1,
            size: '1024x1024',
            quality: 'standard',
            response_format: 'b64_json',
          }));
          imageB64 = response.data?.[0]?.b64_json ?? undefined;
        } else {
          const response = await callWithRetry(() => openai.images.generate({
            model,
            prompt: imgPrompt,
            n: 1,
            size: '1024x1024',
            quality: 'low',
          }));
          imageB64 = response.data?.[0]?.b64_json ?? undefined;
        }
        if (imageB64) break;
      } catch (err) {
        console.error(`[generate-single-image] Model ${model} failed:`, (err as Error).message);
      }
    }

    if (!imageB64) {
      return Response.json({ error: 'All image models failed' }, { status: 500 });
    }

    const imgBuffer = Buffer.from(imageB64, 'base64');
    const fileName = `inline/${postId}-${index ?? 0}-${Date.now()}.png`;

    const { error: uploadErr } = await db.storage
      .from('blog-images')
      .upload(fileName, imgBuffer, { contentType: 'image/png', upsert: true });

    if (uploadErr) {
      try {
        await db.storage.createBucket('blog-images', { public: true });
        const { error: retryErr } = await db.storage
          .from('blog-images')
          .upload(fileName, imgBuffer, { contentType: 'image/png', upsert: true });
        if (retryErr) {
          return Response.json({ error: 'Storage upload failed' }, { status: 500 });
        }
      } catch {
        return Response.json({ error: 'Storage upload failed' }, { status: 500 });
      }
    }

    const { data: urlData } = db.storage.from('blog-images').getPublicUrl(fileName);

    return Response.json({ success: true, imageUrl: urlData.publicUrl, index });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error('[generate-single-image] Fatal error:', errMsg);
    return Response.json({ error: errMsg }, { status: 500 });
  }
}
