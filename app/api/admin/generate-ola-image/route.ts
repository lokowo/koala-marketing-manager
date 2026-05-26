import { NextRequest } from 'next/server';
import { requireAdmin } from '../../../lib/auth';
import { generateImage } from '../../../lib/services/liblibService';
import { supabaseAdmin } from '../../../lib/supabase/server';

export const maxDuration = 300;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { prompt, expressionId, width, height, loraModelId } = await req.json();

    if (!prompt) {
      return Response.json({ error: 'prompt required' }, { status: 400 });
    }

    const result = await generateImage({
      prompt,
      width: width || 800,
      height: height || 1200,
      loraModelId,
    });

    if (!result?.imageUrl) {
      return Response.json({ error: 'Image generation failed' }, { status: 500 });
    }

    // Download and persist to Supabase Storage
    const imgRes = await fetch(result.imageUrl);
    if (!imgRes.ok) {
      return Response.json({ error: 'Failed to download generated image' }, { status: 500 });
    }

    const imgBuffer = Buffer.from(await imgRes.arrayBuffer());
    const fileName = `ola-expressions/${expressionId || 'custom'}-${Date.now()}.png`;

    const { error: uploadErr } = await db.storage
      .from('ola-assets')
      .upload(fileName, imgBuffer, { contentType: 'image/png', upsert: true });

    if (uploadErr) {
      await db.storage.createBucket('ola-assets', { public: true });
      const { error: retryErr } = await db.storage
        .from('ola-assets')
        .upload(fileName, imgBuffer, { contentType: 'image/png', upsert: true });
      if (retryErr) {
        return Response.json({ error: 'Storage upload failed' }, { status: 500 });
      }
    }

    const { data: urlData } = db.storage.from('ola-assets').getPublicUrl(fileName);

    return Response.json({
      success: true,
      imageUrl: urlData.publicUrl,
      liblibUrl: result.imageUrl,
      generateUuid: result.generateUuid,
    });
  } catch (error) {
    console.error('[generate-ola-image]', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
