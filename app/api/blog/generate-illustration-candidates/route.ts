import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
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
        await new Promise(r => setTimeout(r, 15000));
      } else throw e;
    }
  }
}

export async function POST(req: NextRequest) {
  try { await requireAdmin(); } catch { return Response.json({ error: 'Forbidden' }, { status: 403 }); }
  try {
    const { title, content, count = 4 } = await req.json();

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
        content: `Given this article title and content, extract ${count} distinct visual keywords/themes that would make good illustrations. For each, provide a short keyword label and a detailed image prompt (30-50 words, photorealistic, NO text in image).

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

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
    const IMAGE_MODELS = ['gpt-image-2', 'gpt-image-1', 'dall-e-3'];

    const imageResults: Array<{ url: string; prompt: string; keyword: string }> = [];

    for (const kw of keywords) {
      const imgPrompt = `Photorealistic editorial photograph: ${kw.promptEn}. Professional DSLR, natural lighting, sharp focus. Absolutely NO text, NO words, NO letters, NO watermarks anywhere in the image.`;

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
        } catch {
          continue;
        }
      }

      if (!imageB64) continue;

      const imgBuffer = Buffer.from(imageB64, 'base64');
      const fileName = `illustrations/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.png`;

      const { error: uploadErr } = await db.storage
        .from('blog-images')
        .upload(fileName, imgBuffer, { contentType: 'image/png', upsert: true });

      if (uploadErr) {
        try {
          await db.storage.createBucket('blog-images', { public: true });
          const { error: retryErr } = await db.storage
            .from('blog-images')
            .upload(fileName, imgBuffer, { contentType: 'image/png', upsert: true });
          if (retryErr) continue;
        } catch { continue; }
      }

      const { data: urlData } = db.storage.from('blog-images').getPublicUrl(fileName);

      imageResults.push({
        url: urlData.publicUrl,
        prompt: kw.promptEn,
        keyword: kw.keyword,
      });
    }

    return Response.json({ images: imageResults });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error('[generate-illustration-candidates]', errMsg);
    return Response.json({ error: errMsg }, { status: 500 });
  }
}
