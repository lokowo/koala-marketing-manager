import type { NextRequest } from 'next/server';
import { getServerUser } from '../../../lib/auth';
import { supabaseAdmin } from '../../../lib/supabase/server';
import { notifyNewSupportTicket } from '../../../lib/server/slack';
import { BRAND } from '../../../lib/constants';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

const CATEGORIES = ['general', 'account', 'professor', 'outreach', 'payment', 'bug', 'suggestion'] as const;

export async function GET(req: NextRequest) {
  try {
    const user = await getServerUser();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const sp = req.nextUrl.searchParams;
    const threadId = sp.get('threadId');

    if (threadId) {
      const [threadRes, msgsRes] = await Promise.all([
        db.from('admin_message_threads').select('*').eq('id', threadId).eq('user_id', user.id).single(),
        db.from('admin_messages').select('id, thread_id, sender_id, sender_role, content, created_at').eq('thread_id', threadId).order('created_at', { ascending: true }),
      ]);

      if (!threadRes.data) return Response.json({ error: 'Thread not found' }, { status: 404 });

      return Response.json({
        thread: threadRes.data,
        messages: (msgsRes.data ?? []).map((m: { id: string; sender_id: string; sender_role: string; content: string; created_at: string }) => ({
          ...m,
          isMe: m.sender_id === user.id,
          isStaff: ['admin', 'super_admin', 'sales'].includes(m.sender_role),
        })),
      });
    }

    const { data, error } = await db
      .from('admin_message_threads')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .order('last_message_at', { ascending: false })
      .limit(50);

    if (error) throw error;

    return Response.json({ data: data ?? [] });
  } catch (e) {
    console.error('[user/messages GET]', e);
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getServerUser();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { action, threadId, content, subject, category } = await req.json();

    if (action === 'create' && content) {
      const cat = CATEGORIES.includes(category) ? category : 'general';
      const subj = subject || categoryLabel(cat);

      const { data: thread, error: tErr } = await db.from('admin_message_threads').insert({
        user_id: user.id,
        subject: subj,
        status: 'open',
      }).select().single();

      if (tErr) throw tErr;

      await db.from('admin_messages').insert({
        thread_id: thread.id,
        sender_id: user.id,
        sender_role: 'user',
        content,
      });

      const autoReply = getAutoReply(cat);
      await db.from('admin_messages').insert({
        thread_id: thread.id,
        sender_id: user.id,
        sender_role: 'system',
        content: autoReply,
      });

      await db.from('notifications').insert({
        user_id: user.id,
        title: `工单已创建: ${subj}`,
        content: '我们已收到您的消息，客服团队将尽快回复。',
        type: 'info',
        link: '/dashboard/koala/notifications',
      });

      notifyNewSupportTicket({
        userName: user.email ?? 'Unknown',
        category: categoryLabel(cat),
        preview: content,
        threadId: thread.id,
      });

      return Response.json({ success: true, threadId: thread.id });
    }

    if (action === 'reply' && threadId && content) {
      const { data: thread } = await db
        .from('admin_message_threads')
        .select('id, user_id, status')
        .eq('id', threadId)
        .eq('user_id', user.id)
        .single();

      if (!thread) return Response.json({ error: 'Thread not found' }, { status: 404 });
      if (thread.status === 'closed') return Response.json({ error: '该对话已关闭' }, { status: 400 });

      await db.from('admin_messages').insert({
        thread_id: threadId,
        sender_id: user.id,
        sender_role: 'user',
        content,
      });

      await db.from('admin_message_threads').update({
        last_message_at: new Date().toISOString(),
      }).eq('id', threadId);

      return Response.json({ success: true });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (e) {
    console.error('[user/messages POST]', e);
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}

function categoryLabel(cat: string): string {
  const labels: Record<string, string> = {
    general: '一般咨询',
    account: '账户问题',
    professor: '教授信息反馈',
    outreach: '套磁信问题',
    payment: '付款/积分问题',
    bug: 'Bug 反馈',
    suggestion: '功能建议',
  };
  return labels[cat] ?? '一般咨询';
}

function getAutoReply(category: string): string {
  const replies: Record<string, string> = {
    general: `您好！感谢您联系 Koala 客服团队。我们已收到您的消息，将在 24 小时内回复。如有紧急问题，请添加微信 ${BRAND.wechat}。`,
    account: '您好！我们已收到您的账户问题反馈。客服团队将核实您的账户信息并尽快回复。请勿在对话中分享密码等敏感信息。',
    professor: '您好！感谢您对教授信息的反馈。我们的数据团队将核实并更新相关信息。这对提升平台数据质量非常重要！',
    outreach: '您好！我们已收到您关于套磁信的问题。套磁信专员将尽快处理。如需查看已购买的套磁信，请访问"我的套磁信"页面。',
    payment: '您好！我们已收到您的付款/积分相关问题。财务团队将核实交易记录并尽快回复。如遇支付失败，建议先检查银行卡余额。',
    bug: '感谢您报告此问题！我们的技术团队将尽快调查并修复。如果方便的话，请提供截图或详细的复现步骤。',
    suggestion: '感谢您的宝贵建议！我们非常重视用户反馈，产品团队将认真评估您的建议。',
  };
  return replies[category] ?? replies.general;
}
