import { getServerUser } from '../../../lib/auth';
import { supabaseAdmin } from '../../../lib/supabase/server';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

export async function GET() {
  try {
    const user = await getServerUser();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const [{ data: unlocks }, { data: allAssets }] = await Promise.all([
      db.from('ola_animation_unlocks').select('asset_id, unlocked_at, credits_awarded').eq('user_id', user.id).order('unlocked_at', { ascending: true }),
      db.from('ola_assets').select('asset_id, image_url, emotion_tag').eq('is_active', true).not('video_url', 'is', null).order('asset_id'),
    ]);

    return Response.json({
      unlocks: unlocks ?? [],
      assets: allAssets ?? [],
      total: allAssets?.length ?? 0,
      unlocked: unlocks?.length ?? 0,
    });
  } catch (error) {
    console.error('[animation-unlocks] GET error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getServerUser();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { assetId } = await req.json();
    if (!assetId || typeof assetId !== 'string') {
      return Response.json({ error: 'Missing assetId' }, { status: 400 });
    }

    const { data: existing } = await db
      .from('ola_animation_unlocks')
      .select('id')
      .eq('user_id', user.id)
      .eq('asset_id', assetId)
      .maybeSingle();

    if (existing) {
      return Response.json({ newUnlock: false });
    }

    const { data: asset } = await db.from('ola_assets').select('video_url').eq('asset_id', assetId).maybeSingle();
    if (!asset?.video_url) return Response.json({ newUnlock: false, reason: 'static_image' });

    const CREDITS_PER_UNLOCK = 2;

    const { error: insertErr } = await db
      .from('ola_animation_unlocks')
      .insert({ user_id: user.id, asset_id: assetId, credits_awarded: CREDITS_PER_UNLOCK });

    if (insertErr) {
      if (insertErr.code === '23505') return Response.json({ newUnlock: false });
      throw insertErr;
    }

    const { data: profile } = await db
      .from('user_profiles')
      .select('credits_remaining')
      .eq('id', user.id)
      .single();

    const newBalance = ((profile as { credits_remaining?: number } | null)?.credits_remaining ?? 0) + CREDITS_PER_UNLOCK;
    await db.from('user_profiles').update({ credits_remaining: newBalance }).eq('id', user.id);

    const { count: unlocked } = await db
      .from('ola_animation_unlocks')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    const { count: totalAssets } = await db
      .from('ola_assets')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true)
      .not('video_url', 'is', null);

    return Response.json({
      newUnlock: true,
      creditsAwarded: CREDITS_PER_UNLOCK,
      unlocked: unlocked ?? 0,
      total: totalAssets ?? 0,
    });
  } catch (error) {
    console.error('[animation-unlocks] POST error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
