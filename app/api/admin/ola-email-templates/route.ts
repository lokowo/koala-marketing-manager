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
    const { data: templates, error } = await db
      .from('ola_email_templates')
      .select('*')
      .order('created_at');

    if (error) {
      return Response.json({ error: 'Failed to fetch templates' }, { status: 500 });
    }

    const { data: logs } = await db.from('ola_email_logs').select('template_key, opened, clicked');

    const statsMap: Record<string, { sent: number; opened: number; clicked: number }> = {};
    for (const log of logs ?? []) {
      if (!statsMap[log.template_key]) statsMap[log.template_key] = { sent: 0, opened: 0, clicked: 0 };
      statsMap[log.template_key].sent++;
      if (log.opened) statsMap[log.template_key].opened++;
      if (log.clicked) statsMap[log.template_key].clicked++;
    }

    const templatesWithStats = (templates ?? []).map((t: Record<string, unknown>) => ({
      ...t,
      stats: statsMap[t.template_key as string] ?? { sent: 0, opened: 0, clicked: 0 },
    }));

    return Response.json({ templates: templatesWithStats });
  } catch (error) {
    console.error('[ola-email-templates GET]', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    await requireAdmin();
  } catch {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { id, enabled } = await req.json();

    if (!id || typeof enabled !== 'boolean') {
      return Response.json({ error: 'Missing id or enabled (boolean)' }, { status: 400 });
    }

    const { error } = await db
      .from('ola_email_templates')
      .update({ enabled })
      .eq('id', id);

    if (error) {
      return Response.json({ error: 'Failed to update template' }, { status: 500 });
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('[ola-email-templates PATCH]', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
