import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { supabaseAdmin } from '../../../lib/supabase/server';
import { requireAdmin } from '../../../lib/auth';
import { aiLimiter, safeLimit } from '../../../lib/ratelimit';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

const CATEGORY_IMAGE_CONTEXT: Record<string, string> = {
  phd_guide: 'students reading in a sunlit modern university library with floor-to-ceiling windows warm wood tones',
  application: 'neat organized desk with laptop notebook and coffee soft morning light through window minimalist',
  scholarship: 'aerial view of beautiful Australian university campus with green lawns and sandstone buildings',
  visa: 'modern airport terminal with natural light clean architecture',
  supervisor: 'bright modern university office with bookshelves plants natural light warm atmosphere',
  research: 'clean modern research laboratory with glass equipment natural light organized workspace',
  student_life: 'cozy university campus courtyard with trees autumn light',
  news: 'modern glass university building exterior at golden hour dramatic sky architectural photography',
  professor_spotlight: 'elegant university corridor with arched windows warm sunlight streaming in academic atmosphere',
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function callWithRetry(fn: () => Promise<any>, maxRetries = 3): Promise<any> {
  for (let i = 0; i < maxRetries; i++) {
    try { return await fn(); }
    catch (e: unknown) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((e as any)?.status === 429 && i < maxRetries - 1) {
        console.log(`[generate-cover] Rate limited, waiting 15s before retry ${i + 1}/${maxRetries}`);
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

    const { postId } = await req.json();
    console.log('[generate-cover] Starting for post:', postId);
    console.log('[generate-cover] OPENAI_API_KEY exists:', !!process.env.OPENAI_API_KEY, '| prefix:', process.env.OPENAI_API_KEY?.slice(0, 8));
    console.log('[generate-cover] ANTHROPIC_API_KEY exists:', !!process.env.ANTHROPIC_API_KEY);

    if (!postId) {
      return Response.json({ error: 'postId required' }, { status: 400 });
    }

    const { data: post, error: fetchErr } = await db
      .from('blog_posts')
      .select('title_zh, title_en, category, tags')
      .eq('id', postId)
      .single();

    if (fetchErr || !post) {
      console.error('[generate-cover] Post not found:', fetchErr);
      return Response.json({ error: 'Post not found' }, { status: 404 });
    }

    const title = post.title_zh || post.title_en || '';
    const category = post.category || 'phd_guide';

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY!, timeout: 60000 });

    // Step 1: Extract keywords via Haiku
    console.log('[generate-cover] Step 1: Extracting keywords via Haiku...');
    let keywords: string[] = [];
    try {
      const kwRes = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 200,
        system: 'Return ONLY a valid JSON array of 3-5 English strings. No markdown, no explanation.',
        messages: [{ role: 'user', content: `Extract 3-5 English photography keywords for a cover image from this article title: "${title}"` }],
      });
      const kwText = kwRes.content[0].type === 'text' ? kwRes.content[0].text : '[]';
      keywords = JSON.parse(kwText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim());
      console.log('[generate-cover] Keywords:', keywords);
    } catch (e) {
      console.error('[generate-cover] Keyword extraction failed:', e);
      keywords = ['university', 'research', 'Australia'];
    }

    // Step 2: Generate image with model fallback chain
    const categoryContext = CATEGORY_IMAGE_CONTEXT[category] || CATEGORY_IMAGE_CONTEXT.news;
    const coverPrompt = `Background/scene: ${categoryContext}. Subject: ${keywords.join(', ')}. Key details: Professional editorial photography, golden hour natural lighting, shallow depth of field, clean composition, magazine cover quality. Constraints: Absolutely NO text, NO words, NO letters, NO numbers, NO watermarks, NO logos, NO signs anywhere in the image. No clearly visible human faces. Photorealistic style, not illustrated or CGI. IMPORTANT: The image must contain ZERO text of any kind.`;

    console.log('[generate-cover] Step 2: Generating image with fallback chain...');
    console.log('[generate-cover] Prompt length:', coverPrompt.length);

    const IMAGE_MODELS = ['gpt-image-1'];
    let imageB64: string | undefined;
    let usedModel = '';

    for (const model of IMAGE_MODELS) {
      try {
        console.log(`[generate-cover] Trying model: ${model}`);

        const response = await callWithRetry(() => openai.images.generate({
          model,
          prompt: coverPrompt,
          n: 1,
          size: '1536x1024',
          quality: 'high',
        }));

        const imageUrl = response.data?.[0]?.url;
        if (imageUrl) {
          console.log(`[generate-cover] ${model} returned URL, fetching...`);
          const imgRes = await fetch(imageUrl);
          if (imgRes.ok) {
            const arrBuf = await imgRes.arrayBuffer();
            imageB64 = Buffer.from(arrBuf).toString('base64');
          }
        }

        if (imageB64) {
          usedModel = model;
          console.log(`[generate-cover] Success with model: ${model}`);
          break;
        }
      } catch (err) {
        const errDetail = err instanceof Error ? err.message : String(err);
        console.error(`[generate-cover] Model ${model} failed:`, errDetail);
        if (err && typeof err === 'object' && 'status' in err) {
          console.error(`[generate-cover] ${model} HTTP status:`, (err as { status: number }).status);
        }
      }
    }

    if (!imageB64) {
      return Response.json({ error: 'All image models failed' }, { status: 500 });
    }

    // Step 3: Upload to Supabase Storage
    console.log(`[generate-cover] Step 3: Uploading to Supabase Storage (model: ${usedModel})...`);
    let permanentUrl = '';

    const buffer = Buffer.from(imageB64, 'base64');
    const fileName = `covers/${postId}-${Date.now()}.png`;

    const { error: uploadErr } = await db.storage
      .from('blog-images')
      .upload(fileName, buffer, {
        contentType: 'image/png',
        upsert: true,
      });

    if (uploadErr) {
      console.error('[generate-cover] Storage upload failed:', uploadErr);
      try {
        await db.storage.createBucket('blog-images', { public: true });
        const { error: retryErr } = await db.storage
          .from('blog-images')
          .upload(fileName, buffer, { contentType: 'image/png', upsert: true });
        if (retryErr) throw retryErr;
      } catch (bucketErr) {
        console.error('[generate-cover] Bucket creation/retry failed:', bucketErr);
        return Response.json({ error: 'Storage upload failed' }, { status: 500 });
      }
    }

    const { data: urlData } = db.storage.from('blog-images').getPublicUrl(fileName);
    permanentUrl = urlData.publicUrl;

    // Step 4: Update blog_posts
    console.log('[generate-cover] Step 4: Updating DB with URL:', permanentUrl.slice(0, 80) + '...');
    const { error: updateErr } = await db
      .from('blog_posts')
      .update({ cover_image_url: permanentUrl })
      .eq('id', postId);

    if (updateErr) {
      console.error('[generate-cover] DB update failed:', updateErr);
      return Response.json({ error: updateErr.message, imageUrl: permanentUrl }, { status: 500 });
    }

    console.log('[generate-cover] Done for post:', postId);
    return Response.json({ success: true, imageUrl: permanentUrl, coverUrl: permanentUrl });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error('[generate-cover] Fatal error:', errMsg);
    return Response.json({ error: errMsg }, { status: 500 });
  }
}
