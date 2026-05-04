import { NextRequest } from 'next/server';
import { requireAdmin } from '../../../../lib/auth';
import { supabaseAdmin } from '../../../../lib/supabase/server';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const [
      authUserRes,
      profileRes,
      savedRes,
      outreachRes,
      chatRes,
      notesRes,
    ] = await Promise.all([
      supabaseAdmin.auth.admin.getUserById(id),
      db.from('user_profiles').select('*').eq('id', id).single(),
      db.from('saved_professors')
        .select('id, created_at, professor_id, professors(id, name, university, position_title, research_areas, h_index)')
        .eq('user_id', id)
        .order('created_at', { ascending: false })
        .limit(50),
      db.from('outreach_emails')
        .select('id, subject_line, email_body, followup_body, status, purpose, created_at, professor_id, professors(id, name, university)')
        .eq('user_id', id)
        .order('created_at', { ascending: false })
        .limit(50),
      db.from('chat_messages')
        .select('id, mode, role, content, created_at')
        .eq('user_id', id)
        .order('created_at', { ascending: false })
        .limit(200),
      db.from('admin_user_notes')
        .select('id, note, admin_id, created_at')
        .eq('user_id', id)
        .order('created_at', { ascending: false })
        .limit(20)
        .then((r: { data: unknown[] | null }) => r)
        .catch(() => ({ data: [] })),
    ]);

    // Group chat messages by mode
    const chatMessages = (chatRes.data ?? []) as {
      id: string; mode: string; role: string; content: string; created_at: string;
    }[];
    type ChatGroup = { count: number; lastAt: string; messages: typeof chatMessages };
    const chatSummary = chatMessages.reduce<Record<string, ChatGroup>>((acc, msg) => {
      if (!acc[msg.mode]) acc[msg.mode] = { count: 0, lastAt: msg.created_at, messages: [] };
      acc[msg.mode].count++;
      if (msg.created_at > acc[msg.mode].lastAt) acc[msg.mode].lastAt = msg.created_at;
      acc[msg.mode].messages.push(msg);
      return acc;
    }, {});

    return Response.json({
      authUser: authUserRes.data?.user ?? null,
      profile: profileRes.data ?? null,
      savedProfessors: savedRes.data ?? [],
      outreachEmails: outreachRes.data ?? [],
      chatSummary,
      adminNotes: notesRes.data ?? [],
    });
  } catch (error) {
    const msg = (error as Error).message;
    if (msg === 'Unauthorized') return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (msg === 'Forbidden') return Response.json({ error: 'Forbidden' }, { status: 403 });
    console.error('[admin/users/[id] GET]', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user: caller } = await requireAdmin();
    const { id } = await params;
    const body = await req.json();
    const { action, plan_type, credits_remaining, admin_status, note } = body;

    if (action === 'update_profile') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updates: Record<string, any> = {};
      if (plan_type !== undefined) updates.plan_type = plan_type;
      if (credits_remaining !== undefined) updates.credits_remaining = Number(credits_remaining);
      if (admin_status !== undefined) updates.admin_status = admin_status;

      if (Object.keys(updates).length > 0) {
        const { error } = await db.from('user_profiles').update(updates).eq('id', id);
        if (error) throw error;
      }
    }

    if (action === 'add_note' && note?.trim()) {
      const { error } = await db.from('admin_user_notes').insert({
        user_id: id,
        admin_id: caller.id,
        note: note.trim(),
      });
      // Table may not exist yet — return a hint rather than crashing
      if (error?.code === '42P01') {
        return Response.json({
          success: false,
          hint: '请先运行 supabase/admin_notes.sql 创建 admin_user_notes 表',
        });
      }
      if (error) throw error;
    }

    return Response.json({ success: true });
  } catch (error) {
    const msg = (error as Error).message;
    if (msg === 'Unauthorized') return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (msg === 'Forbidden') return Response.json({ error: 'Forbidden' }, { status: 403 });
    console.error('[admin/users/[id] PATCH]', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
