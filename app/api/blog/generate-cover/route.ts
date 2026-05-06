import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { supabaseAdmin } from '../../../lib/supabase/server';

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

export async function POST(req: NextRequest) {
  try {
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
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

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

    // Step 2: Generate image via OpenAI gpt-image-2
    const categoryContext = CATEGORY_IMAGE_CONTEXT[category] || CATEGORY_IMAGE_CONTEXT.news;
    const coverPrompt = `Background/scene: ${categoryContext}. Subject: ${keywords.join(', ')}. Key details: Professional editorial photography, golden hour natural lighting, shallow depth of field, clean composition, magazine cover quality. Constraints: Absolutely NO text, NO words, NO letters, NO numbers, NO watermarks, NO logos, NO signs anywhere in the image. No clearly visible human faces. Photorealistic style, not illustrated or CGI. IMPORTANT: The image must contain ZERO text of any kind.`;

    console.log('[generate-cover] Step 2: Calling OpenAI gpt-image-2...');
    console.log('[generate-cover] Prompt length:', coverPrompt.length);

    let response;
    try {
      response = await openai.images.generate({
        model: 'gpt-image-2',
        prompt: coverPrompt,
        n: 1,
        size: '1536x1024',
        quality: 'high',
      });
      console.log('[generate-cover] OpenAI response received, data length:', response.data?.length);
    } catch (openaiErr: unknown) {
      const errDetail = openaiErr instanceof Error ? openaiErr.message : String(openaiErr);
      console.error('[generate-cover] OpenAI API error:', errDetail);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const status = (openaiErr as any)?.status || (openaiErr as any)?.response?.status;
      console.error('[generate-cover] OpenAI status:', status);
      return Response.json({ error: `OpenAI error: ${errDetail}` }, { status: 502 });
    }

    const imageData = response.data?.[0];
    if (!imageData) {
      console.error('[generate-cover] No image data returned');
      return Response.json({ error: 'No image generated' }, { status: 500 });
    }
    console.log('[generate-cover] Image format: b64_json=', !!imageData.b64_json, 'url=', !!imageData.url);

    // Step 3: Upload to Supabase Storage
    console.log('[generate-cover] Step 3: Uploading to Supabase Storage...');
    let permanentUrl = '';

    // gpt-image-2 returns b64_json by default, but if url is present, download it
    if (imageData.b64_json) {
      const buffer = Buffer.from(imageData.b64_json, 'base64');
      const fileName = `covers/${postId}-${Date.now()}.png`;

      const { error: uploadErr } = await db.storage
        .from('blog-images')
        .upload(fileName, buffer, {
          contentType: 'image/png',
          upsert: true,
        });

      if (uploadErr) {
        console.error('[generate-cover] Storage upload failed:', uploadErr);
        // Fallback: try creating bucket first
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
    } else if (imageData.url) {
      // Download from temporary URL and upload to storage
      const imgRes = await fetch(imageData.url);
      const imgBuffer = Buffer.from(await imgRes.arrayBuffer());
      const fileName = `covers/${postId}-${Date.now()}.png`;

      const { error: uploadErr } = await db.storage
        .from('blog-images')
        .upload(fileName, imgBuffer, {
          contentType: 'image/png',
          upsert: true,
        });

      if (uploadErr) {
        console.error('[generate-cover] Storage upload failed:', uploadErr);
        try {
          await db.storage.createBucket('blog-images', { public: true });
          const { error: retryErr } = await db.storage
            .from('blog-images')
            .upload(fileName, imgBuffer, { contentType: 'image/png', upsert: true });
          if (retryErr) throw retryErr;
        } catch (bucketErr) {
          console.error('[generate-cover] Bucket creation/retry failed:', bucketErr);
          // Last resort: store the temp URL (will expire)
          permanentUrl = imageData.url;
          console.warn('[generate-cover] Using temporary URL as fallback');
        }
      }

      if (!permanentUrl) {
        const { data: urlData } = db.storage.from('blog-images').getPublicUrl(fileName);
        permanentUrl = urlData.publicUrl;
      }
    } else {
      console.error('[generate-cover] No b64_json or url in response');
      return Response.json({ error: 'Unexpected image response format' }, { status: 500 });
    }

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
