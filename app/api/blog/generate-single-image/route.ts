import { NextRequest } from 'next/server';
import OpenAI from 'openai';
import { supabaseAdmin } from '../../../lib/supabase/server';
import { requireAdmin } from '../../../lib/auth';
import { aiLimiter, safeLimit } from '../../../lib/ratelimit';

export const maxDuration = 300;

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
  let adminUser: { user: { id: string } };
  try { adminUser = await requireAdmin(); } catch { return Response.json({ error: 'Forbidden' }, { status: 403 }); }
  try {
    const allowed = await safeLimit(aiLimiter, adminUser.user.id);
    if (!allowed) return Response.json({ error: '操作太频繁，请稍后再试' }, { status: 429 });

    const { postId, promptEn, index } = await req.json();

    if (!postId || !promptEn) {
      return Response.json({ error: 'postId and promptEn required' }, { status: 400 });
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY!, timeout: 240000 });
    const imgPrompt = `Editorial photograph captured on Kodak Portra 400 film with a Hasselblad 500C medium format camera. Natural ambient lighting, subtle film grain, organic color rendering with warm undertones. Shallow depth of field, f/2.8. No AI artifacts, no synthetic textures, no CGI elements. Subject: ${promptEn}. Style: photojournalistic documentary aesthetic, as published in National Geographic or The New York Times Magazine. Absolutely NO text, NO words, NO letters, NO watermarks anywhere in the image.`;

    let imageB64: string | undefined;

    try {
      const response = await callWithRetry(() => openai.images.generate({
        model: 'gpt-image-2',
        prompt: imgPrompt,
        n: 1,
        size: '1024x1024',
        quality: 'low',
      }));
      const item = response.data?.[0];
      if (item?.b64_json) {
        imageB64 = item.b64_json;
      } else if (item?.url) {
        const imgRes = await fetch(item.url);
        if (imgRes.ok) {
          const arrBuf = await imgRes.arrayBuffer();
          imageB64 = Buffer.from(arrBuf).toString('base64');
        }
      }
    } catch (err) {
      console.error('[generate-single-image] gpt-image-2 failed:', (err as Error).message);
      if (err && typeof err === 'object' && 'status' in err) {
        console.error('[generate-single-image] HTTP status:', (err as { status: number }).status);
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
