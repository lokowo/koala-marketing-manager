import { NextRequest } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabase/server';
import { requireAdmin } from '../../../../lib/auth';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try { await requireAdmin(); } catch { return Response.json({ error: 'Forbidden' }, { status: 403 }); }
  const { id } = await params;
  try {
    const { data, error } = await db
      .from('ai_repair_log')
      .select('*')
      .eq('professor_id', id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) throw error;
    return Response.json({ data: data || [] });
  } catch {
    return Response.json({ data: [] });
  }
}
