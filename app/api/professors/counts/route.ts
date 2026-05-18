import { supabaseAdmin } from '../../../lib/supabase/server';

export async function GET() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabaseAdmin as any).rpc('get_professor_category_counts');
    if (error) throw new Error(error.message);

    const response = Response.json({ counts: data });
    response.headers.set('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    return response;
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}
