import { NextRequest } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabase/server';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let savedCount = 0;
  let outreachCount = 0;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let students: any[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let outreachList: any[] = [];

  // Saved professors - graceful if table doesn't exist
  try {
    const { count } = await db
      .from('saved_professors')
      .select('*', { count: 'exact', head: true })
      .eq('professor_id', id);
    savedCount = count ?? 0;

    const { data } = await db
      .from('saved_professors')
      .select('id, created_at, user_id')
      .eq('professor_id', id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (data) {
      students = data.map((s: { user_id: string; created_at: string }) => ({
        email_masked: maskId(s.user_id),
        created_at: s.created_at,
      }));
    }
  } catch { /* table may not exist */ }

  // Outreach emails
  try {
    const { count } = await db
      .from('outreach_emails')
      .select('*', { count: 'exact', head: true })
      .eq('professor_id', id);
    outreachCount = count ?? 0;

    const { data } = await db
      .from('outreach_emails')
      .select('id, subject_line, email_body, status, created_at, user_id')
      .eq('professor_id', id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (data) {
      outreachList = data.map((o: { user_id: string; subject_line: string; email_body: string; status: string; created_at: string }) => ({
        ...o,
        email_masked: maskId(o.user_id),
      }));
    }
  } catch { /* table may not exist */ }

  return Response.json({ savedCount, outreachCount, students, outreachList });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: professorId } = await params;

  try {
    const body = await req.json();
    const { type, userId, notes } = body as {
      type: 'viewed' | 'saved' | 'email_generated' | 'email_sent' | 'rejected' | 'contacted';
      userId?: string;
      notes?: string;
    };

    if (!type) {
      return Response.json({ error: 'Missing interaction type' }, { status: 400 });
    }

    const { error } = await db
      .from('professor_interactions')
      .insert({
        professor_id: professorId,
        user_id: userId || null,
        interaction_type: type,
        notes: notes || null,
      });

    if (error) {
      console.error('[interactions POST]', error);
      return Response.json({ error: 'Failed to record interaction' }, { status: 500 });
    }

    return Response.json({ success: true });
  } catch (e) {
    console.error('[interactions POST]', e);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function maskId(id: string) {
  if (!id) return '***';
  return id.slice(0, 4) + '***' + id.slice(-3);
}
