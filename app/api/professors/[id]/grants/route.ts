import { NextRequest } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabase/server';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const { data, error } = await db
      .from('grants')
      .select('*')
      .eq('professor_id', id)
      .order('start_year', { ascending: false })
      .limit(50);

    if (error) throw error;
    return Response.json({ data: data || [] });
  } catch (error) {
    console.error('[professors/grants]', error);
    return Response.json({ data: [] });
  }
}
