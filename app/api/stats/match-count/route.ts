import { createClient } from '@supabase/supabase-js';

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data, error } = await supabase.rpc('get_professor_match_count');

    if (error) {
      console.error('[match-count]', error);
      return Response.json({ count: 0 });
    }

    return Response.json(
      { count: data || 0 },
      { headers: { 'Cache-Control': 'public, max-age=60' } }
    );
  } catch (e) {
    console.error('[match-count]', e);
    return Response.json({ count: 0 });
  }
}
