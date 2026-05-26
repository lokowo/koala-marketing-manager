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
    // Fetch latest report
    const { data: latestReport } = await db
      .from('ola_evolution_reports')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // Fetch pending fixes (not yet executed)
    const { data: pendingFixes } = await db
      .from('ola_pending_fixes')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(50);

    // Fetch recently executed fixes
    const { data: executedFixes } = await db
      .from('ola_pending_fixes')
      .select('*')
      .eq('status', 'executed')
      .order('executed_at', { ascending: false })
      .limit(20);

    // Fetch items needing human review
    const { data: humanFixes } = await db
      .from('ola_pending_fixes')
      .select('*')
      .eq('status', 'needs_human')
      .order('created_at', { ascending: false })
      .limit(20);

    // Fetch failed fixes
    const { data: failedFixes } = await db
      .from('ola_pending_fixes')
      .select('*')
      .eq('status', 'failed')
      .order('created_at', { ascending: false })
      .limit(10);

    return Response.json({
      latestReport: latestReport ?? null,
      pendingFixes: pendingFixes ?? [],
      executedFixes: executedFixes ?? [],
      humanFixes: humanFixes ?? [],
      failedFixes: failedFixes ?? [],
      counts: {
        pending: (pendingFixes ?? []).length,
        executed: (executedFixes ?? []).length,
        needsHuman: (humanFixes ?? []).length,
        failed: (failedFixes ?? []).length,
      },
    });
  } catch (error) {
    console.error('[ola-evolution-status]', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
