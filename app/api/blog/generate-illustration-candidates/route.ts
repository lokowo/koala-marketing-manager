import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { supabaseAdmin } from '../../../lib/supabase/server';
import { requireAdmin } from '../../../lib/auth';

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
        await new Promise(r => setTimeout(r, 15000));
      } else throw e;
    }
  }
}

export async function POST(req: NextRequest) {
  try { await requireAdmin(); } catch { return Response.json({ error: 'Forbidden' }, { status: 403 }); }
  try {
    const { title, content, count: rawCount = 2 } = await req.json();
    const count = Math.min(Math.max(1, rawCount), 2);

    if (!title && !content) {
      return Response.json({ error: 'title or content required' }, { status: 400 });
    }

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

    const keywordRes = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 500,
      system: 'Return ONLY a valid JSON array. No markdown code blocks, no explanation.',
      messages: [{
        role: 'user',
        content: `Given this article title and content, extract exactly ${count} (maximum 2) distinct visual keywords/themes that would make good illustrations. For each, provide a short keyword label and a detailed image prompt (30-50 words, film photography aesthetic, documentary style, NO text in image).

Title: ${title}
Content: ${(content || '').slice(0, 2000)}

Return JSON array: [{"keyword": "short label", "promptEn": "detailed scene description for image generation"}]`,
      }],
    });

    const placementText = keywordRes.content[0].type === 'text' ? keywordRes.content[0].text : '[]';
    const cleaned = placementText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();

    let keywords: Array<{ keyword: string; promptEn: string }> = [];
    try {
      keywords = JSON.parse(cleaned);
    } catch {
      return Response.json({ error: 'Failed to parse keywords', images: [] });
    }

    keywords = keywords.slice(0, count);
    if (keywords.length === 0) {
      return Response.json({ error: 'No keywords found', images: [] });
    }

    if (!process.env.OPENAI_API_KEY) {
      console.error('[generate-illustration-candidates] OPENAI_API_KEY not configured');
      return Response.json({ error: 'OpenAI API key 未配置' }, { status: 503 });
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY!, timeout: 150000 });

    const generateOne = async (kw: { keyword: string; promptEn: string }, idx: number) => {
      const imgPrompt = `Editorial photograph captured on Kodak Portra 400 film with a Hasselblad 500C medium format camera. Natural ambient lighting, subtle film grain, organic color rendering with warm undertones. Shallow depth of field, f/2.8. No AI artifacts, no synthetic textures, no CGI elements. Subject: ${kw.promptEn}. Style: photojournalistic documentary aesthetic, as published in National Geographic or The New York Times Magazine. Absolutely NO text, NO words, NO letters, NO watermarks anywhere in the image.`;

      const response = await callWithRetry(() => openai.images.generate({
        model: 'gpt-image-2',
        prompt: imgPrompt,
        n: 1,
        size: '1024x1024',
        quality: 'high',
      }));

      const item = response.data?.[0];
      let imageB64 = item?.b64_json;
      if (!imageB64 && item?.url) {
        const imgRes = await fetch(item.url);
        if (imgRes.ok) {
          const arrBuf = await imgRes.arrayBuffer();
          imageB64 = Buffer.from(arrBuf).toString('base64');
        }
      }
      if (!imageB64) throw new Error('No image data returned');

      const imgBuffer = Buffer.from(imageB64, 'base64');
      const fileName = `illustrations/${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 8)}.png`;

      const { error: uploadErr } = await db.storage
        .from('blog-images')
        .upload(fileName, imgBuffer, { contentType: 'image/png', upsert: true });

      if (uploadErr) {
        await db.storage.createBucket('blog-images', { public: true }).catch(() => {});
        const { error: retryErr } = await db.storage
          .from('blog-images')
          .upload(fileName, imgBuffer, { contentType: 'image/png', upsert: true });
        if (retryErr) throw retryErr;
      }

      const { data: urlData } = db.storage.from('blog-images').getPublicUrl(fileName);
      return { url: urlData.publicUrl, prompt: kw.promptEn, keyword: kw.keyword };
    };

    console.log(`[generate-illustration-candidates] Generating ${keywords.length} images in parallel...`);
    const results = await Promise.allSettled(
      keywords.map((kw, i) => generateOne(kw, i))
    );

    const imageResults: Array<{ url: string; prompt: string; keyword: string }> = [];
    for (const r of results) {
      if (r.status === 'fulfilled') {
        imageResults.push(r.value);
      } else {
        console.error('[generate-illustration-candidates] Image failed:', r.reason?.message || r.reason);
      }
    }

    console.log(`[generate-illustration-candidates] ${imageResults.length}/${keywords.length} images succeeded`);
    return Response.json({ images: imageResults });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error('[generate-illustration-candidates]', errMsg);
    return Response.json({ error: errMsg }, { status: 500 });
  }
}
