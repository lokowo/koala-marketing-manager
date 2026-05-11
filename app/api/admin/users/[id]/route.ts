import { NextRequest } from 'next/server';
import { requireAdmin, requireSuperAdmin } from '../../../../lib/auth';
import { supabaseAdmin } from '../../../../lib/supabase/server';
import { logWork } from '../../../../lib/worklog';
import { notifyUser, notifySuperAdmins, notifyUserAction } from '../../../../lib/notifications';

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
      db.from('ai_conversations')
        .select('id, mode, messages, created_at')
        .eq('user_id', id)
        .order('created_at', { ascending: false })
        .limit(50),
      db.from('admin_user_notes')
        .select('id, note, admin_id, created_at')
        .eq('user_id', id)
        .order('created_at', { ascending: false })
        .limit(20)
        .then((r: { data: unknown[] | null }) => r)
        .catch(() => ({ data: [] })),
    ]);

    // Group ai_conversations by mode
    interface ConvMsg { role: string; content: string }
    interface ConvRow { id: string; mode: string; messages: ConvMsg[]; created_at: string }
    interface FlatMsg { id: string; mode: string; role: string; content: string; created_at: string }
    const conversations = (chatRes.data ?? []) as ConvRow[];
    const chatMessages: FlatMsg[] = [];
    for (const conv of conversations) {
      const msgs = Array.isArray(conv.messages) ? conv.messages : [];
      for (const m of msgs) {
        chatMessages.push({
          id: conv.id,
          mode: conv.mode,
          role: m.role,
          content: m.content,
          created_at: conv.created_at,
        });
      }
    }
    type ChatGroup = { count: number; lastAt: string; messages: FlatMsg[] };
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

      if (credits_remaining !== undefined) {
        await notifyUser(id, '积分变更', `管理员已将你的积分余额调整为 ${Number(credits_remaining)}。`).catch(() => {});
        await notifySuperAdmins('积分手动充值', `用户 ${id} 的积分已被调整为 ${Number(credits_remaining)}。`).catch(() => {});
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

    await logWork({
      userId: caller.id,
      role: 'admin',
      action: action === 'add_note' ? '添加用户备注' : '更新用户资料',
      actionCategory: 'user_management',
      targetType: 'user',
      targetId: id,
      details: body,
    }).catch(() => {});

    return Response.json({ success: true });
  } catch (error) {
    const msg = (error as Error).message;
    if (msg === 'Unauthorized') return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (msg === 'Forbidden') return Response.json({ error: 'Forbidden' }, { status: 403 });
    console.error('[admin/users/[id] PATCH]', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user: caller } = await requireSuperAdmin();
    const { id } = await params;

    if (id === caller.id) {
      return Response.json({ error: '不能删除自己' }, { status: 400 });
    }

    const { data: targetAuth } = await supabaseAdmin.auth.admin.getUserById(id);
    const targetEmail = targetAuth?.user?.email || id;

    const { error: delErr } = await supabaseAdmin.auth.admin.deleteUser(id);
    if (delErr) throw delErr;

    const { data: callerProfile } = await db
      .from('user_profiles')
      .select('display_name')
      .eq('id', caller.id)
      .single();

    await logWork({
      userId: caller.id,
      role: 'admin',
      action: '删除用户',
      actionCategory: 'user_management',
      targetType: 'user',
      targetId: id,
      targetName: targetEmail,
    }).catch(() => {});

    await notifyUserAction({
      actionBy: caller.id,
      actionByName: callerProfile?.display_name || caller.email || 'Admin',
      action: '删除了用户',
      targetUserId: id,
      targetUserEmail: targetEmail,
    }).catch(() => {});

    return Response.json({ success: true });
  } catch (error) {
    const msg = (error as Error).message;
    if (msg === 'Unauthorized') return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (msg === 'Forbidden') return Response.json({ error: 'Forbidden' }, { status: 403 });
    console.error('[admin/users/[id] DELETE]', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
