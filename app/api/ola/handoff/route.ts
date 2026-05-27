import { supabaseAdmin } from '../../../lib/supabase/server';
import { getResend } from '../../../lib/email/resend';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { reason, collected_data, conversation_summary, user_id } = body;

    const { data, error } = await db
      .from('handoff_requests')
      .insert({
        user_id: user_id ?? null,
        reason: reason ?? null,
        collected_data: collected_data ?? null,
        conversation_summary: conversation_summary ?? null,
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      console.error('[handoff insert]', error);
      return Response.json({ error: 'Failed to create handoff request' }, { status: 500 });
    }

    // Send email notification to admin (fire-and-forget)
    try {
      const resend = getResend();
      await resend.emails.send({
        from: 'Ola AI <noreply@koalaphd.com>',
        to: ['info@koalaphd.com'],
        subject: `[Handoff] 新的转人工请求 — ${reason || '未指定原因'}`,
        html: `
          <h2>Ola AI 转人工请求</h2>
          <p><strong>原因：</strong>${reason || '未指定'}</p>
          <p><strong>用户 ID：</strong>${user_id || '匿名用户'}</p>
          <p><strong>对话摘要：</strong></p>
          <pre>${conversation_summary || '无'}</pre>
          <p><strong>收集的用户信息：</strong></p>
          <pre>${JSON.stringify(collected_data, null, 2) || '无'}</pre>
          <hr />
          <p>请在 <a href="https://koalaphd.com/dashboard/koala/handoff">Admin Handoff 队列</a> 中处理。</p>
        `,
      });
    } catch (emailErr) {
      console.error('[handoff email]', emailErr);
    }

    return Response.json({
      success: true,
      handoff_id: data.id,
      wechat_id: 'MissKoalaAu',
      contact_email: 'info@koalastudy.net',
    });
  } catch (error) {
    console.error('[handoff POST]', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
