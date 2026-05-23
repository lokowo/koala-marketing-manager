import { type NextRequest } from 'next/server';
import { getServerUser } from '../../../lib/auth';
import { supabaseAdmin } from '../../../lib/supabase/server';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

export async function GET() {
  const user = await getServerUser();
  if (!user) {
    return Response.json({ error: '请先登录' }, { status: 401 });
  }

  const { data, error } = await db
    .from('cold_emails')
    .select(`
      id,
      professor_id,
      subject,
      body,
      highlights,
      match_scores,
      status,
      sent_at,
      reply_received_at,
      notes,
      professor_snapshot,
      created_at
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[cold-emails GET]', error);
    return Response.json({ error: '查询失败' }, { status: 500 });
  }

  // Collect professor IDs to batch-fetch names/universities
  const profIds = [...new Set((data ?? []).map((e: { professor_id: string }) => e.professor_id).filter(Boolean))];
  let profMap: Record<string, { name: string; university: string }> = {};

  if (profIds.length > 0) {
    const { data: profs } = await db
      .from('professors')
      .select('id, name, university')
      .in('id', profIds);

    if (profs) {
      profMap = Object.fromEntries(
        profs.map((p: { id: string; name: string; university: string }) => [p.id, { name: p.name, university: p.university }]),
      );
    }
  }

  const emails = (data ?? []).map((e: Record<string, unknown>) => {
    const snapshot = e.professor_snapshot as { name?: string; university?: string } | null;
    const prof = profMap[e.professor_id as string];
    return {
      ...e,
      professor_name: prof?.name ?? snapshot?.name ?? 'Unknown',
      professor_university: prof?.university ?? snapshot?.university ?? '',
    };
  });

  return Response.json({ emails });
}

export async function PATCH(request: NextRequest) {
  const user = await getServerUser();
  if (!user) {
    return Response.json({ error: '请先登录' }, { status: 401 });
  }

  const body = await request.json();
  const { id, status, notes } = body as {
    id?: string;
    status?: string;
    notes?: string;
  };

  if (!id) {
    return Response.json({ error: 'Missing id' }, { status: 400 });
  }

  const allowedStatuses = ['draft', 'sent', 'replied', 'no_reply', 'interview'];

  const update: Record<string, unknown> = {};
  if (status && allowedStatuses.includes(status)) {
    update.status = status;
    if (status === 'sent' && !body.sent_at) update.sent_at = new Date().toISOString();
    if (status === 'replied' && !body.reply_received_at) update.reply_received_at = new Date().toISOString();
  }
  if (notes !== undefined) update.notes = notes;

  if (Object.keys(update).length === 0) {
    return Response.json({ error: 'Nothing to update' }, { status: 400 });
  }

  const { error } = await db
    .from('cold_emails')
    .update(update)
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    console.error('[cold-emails PATCH]', error);
    return Response.json({ error: '更新失败' }, { status: 500 });
  }

  return Response.json({ ok: true });
}
