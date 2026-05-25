import { supabaseAdmin } from '../../../lib/supabase/server';
import { requireAdmin } from '../../../lib/auth';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { data: rows, error } = await db
      .from('feedback')
      .select('rating, mode, created_at');

    if (error) throw error;

    const all: Array<{ rating: string; mode: string; created_at: string }> = rows ?? [];
    const total = all.length;

    const helpful = all.filter(r => r.rating === 'helpful').length;
    const partial = all.filter(r => r.rating === 'partial').length;
    const unhelpful = all.filter(r => r.rating === 'unhelpful').length;

    const byMode: Record<string, { helpful: number; partial: number; unhelpful: number; total: number }> = {};
    for (const r of all) {
      const m = r.mode || 'chat';
      if (!byMode[m]) byMode[m] = { helpful: 0, partial: 0, unhelpful: 0, total: 0 };
      byMode[m].total++;
      if (r.rating === 'helpful') byMode[m].helpful++;
      else if (r.rating === 'partial') byMode[m].partial++;
      else if (r.rating === 'unhelpful') byMode[m].unhelpful++;
    }

    return Response.json({
      total,
      helpful,
      partial,
      unhelpful,
      byMode,
    });
  } catch (error) {
    console.error('[admin/feedback-stats]', error);
    return Response.json({
      total: 0,
      helpful: 0,
      partial: 0,
      unhelpful: 0,
      byMode: {},
    });
  }
}
