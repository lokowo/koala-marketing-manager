import { createClient } from '@supabase/supabase-js';

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const now = new Date().toISOString();

    // Fetch active banners within date range
    let query = supabase
      .from('banners')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    const { data: allBanners, error: bErr } = await query;
    if (bErr) {
      console.error('[banners GET]', bErr);
      return Response.json({ banners: [], settings: {} });
    }

    // Filter by date range client-side (simpler than complex SQL)
    const banners = (allBanners || []).filter(b => {
      if (b.start_date && new Date(b.start_date) > new Date(now)) return false;
      if (b.end_date && new Date(b.end_date) < new Date(now)) return false;
      return true;
    });

    // Fetch settings
    const { data: settings } = await supabase
      .from('banner_settings')
      .select('auto_play, interval_seconds, transition_speed')
      .limit(1)
      .maybeSingle();

    return Response.json(
      {
        banners,
        settings: settings || { auto_play: true, interval_seconds: 5, transition_speed: 500 },
      },
      { headers: { 'Cache-Control': 'public, max-age=60' } }
    );
  } catch (e) {
    console.error('[banners GET]', e);
    return Response.json({ banners: [], settings: {} });
  }
}
