import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { supabaseAdmin } from '../../../lib/supabase/server';
import { requireAdmin } from '../../../lib/auth';
import { aiLimiter, safeLimit } from '../../../lib/ratelimit';

export const maxDuration = 300;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

const CATEGORY_IMAGE_CONTEXT: Record<string, string> = {
  phd_guide: 'university students studying in a sunlit heritage library with tall arched windows, warm wood reading desks, scattered open textbooks',
  application: 'organized writing desk with a leather-bound notebook, fountain pen, and a cup of flat white, soft morning light through sheer curtains',
  scholarship: 'aerial view of a sandstone Australian university quad with manicured lawns, jacaranda trees in bloom, students walking paths',
  visa: 'passport and boarding pass resting on a weathered leather satchel at an airport gate, natural window light',
  supervisor: 'a cluttered but warm professor office with overflowing bookshelves, a green desk lamp, and handwritten notes on a whiteboard',
  research: 'modern chemistry laboratory bench with glass flasks, amber liquid, and natural light from high clerestory windows',
  student_life: 'outdoor university courtyard café with autumn leaves, students in conversation, dappled afternoon light through eucalyptus trees',
  news: 'imposing sandstone university façade at golden hour, dramatic cumulus clouds, long shadows across the forecourt',
  professor_spotlight: 'sunlit university corridor with arched Gothic Revival windows casting geometric shadow patterns on terrazzo floors',
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
  let postId: string | undefined;
  try {
    const allowed = await safeLimit(aiLimiter, adminUser.user.id);
    if (!allowed) return Response.json({ error: '操作太频繁，请稍后再试' }, { status: 429 });

    ({ postId } = await req.json());
    console.log('[generate-cover] Starting for post:', postId);
    console.log('[generate-cover] OPENAI_API_KEY exists:', !!process.env.OPENAI_API_KEY, '| prefix:', process.env.OPENAI_API_KEY?.slice(0, 8));
    console.log('[generate-cover] ANTHROPIC_API_KEY exists:', !!process.env.ANTHROPIC_API_KEY);

    if (!postId) {
      return Response.json({ error: 'postId required' }, { status: 400 });
    }

    if (!process.env.OPENAI_API_KEY) {
      console.error('[generate-cover] OPENAI_API_KEY not configured');
      if (postId) await db.from('blog_posts').update({ cover_image_status: 'failed' }).eq('id', postId);
      return Response.json({ error: '封面图生成暂不可用（API key 未配置）' }, { status: 503 });
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
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY!, timeout: 150000 });

    // Step 1: Extract keywords via Haiku
    console.log('[generate-cover] Step 1: Extracting keywords via Haiku...');
    let keywords: string[] = [];
    try {
      const kwRes = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 200,
        system: 'Return ONLY a valid JSON array of 3-5 English strings. No markdown, no explanation.',
        messages: [{ role: 'user', content: `Extract 3-5 English documentary photography keywords for a film-aesthetic cover image from this article title: "${title}". Focus on tangible objects, textures, and scenes — not abstract concepts.` }],
      });
      const kwText = kwRes.content[0].type === 'text' ? kwRes.content[0].text : '[]';
      keywords = JSON.parse(kwText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim());
      console.log('[generate-cover] Keywords:', keywords);
    } catch (e) {
      console.error('[generate-cover] Keyword extraction failed:', e);
      keywords = ['university', 'research', 'Australia'];
    }

    // Step 2: Generate image with gpt-image-2
    const categoryContext = CATEGORY_IMAGE_CONTEXT[category] || CATEGORY_IMAGE_CONTEXT.news;
    const coverPrompt = `Editorial photograph captured on Kodak Portra 400 film with a Hasselblad 500C medium format camera. Natural ambient lighting, subtle film grain, organic color rendering with warm undertones. Shallow depth of field, f/2.8. No AI artifacts, no synthetic textures, no CGI elements. Subject: ${categoryContext}, ${keywords.join(', ')}. Style: photojournalistic documentary aesthetic, as published in National Geographic or The New York Times Magazine. Constraints: Absolutely NO text, NO words, NO letters, NO numbers, NO watermarks, NO logos, NO signs anywhere in the image. No clearly visible human faces. The image must contain ZERO text of any kind.`;

    console.log('[generate-cover] Step 2: Generating image with gpt-image-2...');
    console.log('[generate-cover] Prompt length:', coverPrompt.length);

    let imageB64: string | undefined;
    const usedModel = 'gpt-image-2';

    try {
      console.log('[generate-cover] Trying model: gpt-image-2');

      const response = await callWithRetry(() => openai.images.generate({
        model: 'gpt-image-2',
        prompt: coverPrompt,
        n: 1,
        size: '1536x1024',
        quality: 'high',
      }));

      const item = response.data?.[0];
      if (item?.b64_json) {
        console.log('[generate-cover] gpt-image-2 returned b64_json directly');
        imageB64 = item.b64_json;
      } else if (item?.url) {
        console.log('[generate-cover] gpt-image-2 returned URL, fetching...');
        const imgRes = await fetch(item.url);
        if (imgRes.ok) {
          const arrBuf = await imgRes.arrayBuffer();
          imageB64 = Buffer.from(arrBuf).toString('base64');
        }
      }

      if (imageB64) {
        console.log('[generate-cover] Success with gpt-image-2');
      }
    } catch (err) {
      const errDetail = err instanceof Error ? err.message : String(err);
      console.error('[generate-cover] gpt-image-2 failed:', errDetail);
      if (err && typeof err === 'object' && 'status' in err) {
        console.error('[generate-cover] HTTP status:', (err as { status: number }).status);
      }
    }

    if (!imageB64) {
      await db.from('blog_posts').update({ cover_image_status: 'failed' }).eq('id', postId);
      return Response.json({ error: '封面图生成失败，请检查 OpenAI API key 是否有效' }, { status: 500 });
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

    // Step 4: Update blog_posts with URL + status
    console.log('[generate-cover] Step 4: Updating DB with URL:', permanentUrl.slice(0, 80) + '...');
    const { error: updateErr } = await db
      .from('blog_posts')
      .update({ cover_image_url: permanentUrl, cover_image_status: 'done' })
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
    if (postId) await db.from('blog_posts').update({ cover_image_status: 'failed' }).eq('id', postId).catch(() => {});
    return Response.json({ error: errMsg }, { status: 500 });
  }
}
