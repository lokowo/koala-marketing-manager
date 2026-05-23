import { type NextRequest } from 'next/server';
import { getServerUser } from '../../../../lib/auth';
import { supabaseAdmin } from '../../../../lib/supabase/server';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getServerUser();
    if (!user) return Response.json({ error: '请先登录' }, { status: 401 });

    const { id } = await params;

    const { data, error } = await db
      .from('cold_emails')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (error || !data) {
      return Response.json({ error: '邮件不存在' }, { status: 404 });
    }

    // Fetch professor name
    const { data: prof } = await db
      .from('professors')
      .select('name, university')
      .eq('id', data.professor_id)
      .single();

    const snapshot = data.professor_snapshot as { name?: string; university?: string } | null;

    return Response.json({
      email: {
        ...data,
        professor_name: prof?.name ?? snapshot?.name ?? 'Unknown',
        professor_university: prof?.university ?? snapshot?.university ?? '',
      },
    });
  } catch (error) {
    console.error('[cold-emails/[id] GET]', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getServerUser();
    if (!user) return Response.json({ error: '请先登录' }, { status: 401 });

    const { id } = await params;
    const body = await request.json();
    const { subject, body: emailBody, status, notes } = body as {
      subject?: string;
      body?: string;
      status?: string;
      notes?: string;
    };

    const allowedStatuses = ['draft', 'sent', 'replied', 'no_reply', 'interview'];
    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (subject !== undefined) update.subject = subject;
    if (emailBody !== undefined) update.body = emailBody;
    if (notes !== undefined) update.notes = notes;

    if (status && allowedStatuses.includes(status)) {
      update.status = status;
      if (status === 'sent') update.sent_at = update.sent_at ?? new Date().toISOString();
      if (status === 'replied') update.reply_received_at = new Date().toISOString();
    }

    if (Object.keys(update).length <= 1) {
      return Response.json({ error: 'Nothing to update' }, { status: 400 });
    }

    const { error } = await db
      .from('cold_emails')
      .update(update)
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('[cold-emails/[id] PATCH]', error);
      return Response.json({ error: '更新失败' }, { status: 500 });
    }

    return Response.json({ ok: true });
  } catch (error) {
    console.error('[cold-emails/[id] PATCH]', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getServerUser();
    if (!user) return Response.json({ error: '请先登录' }, { status: 401 });

    const { id } = await params;

    const { error } = await db
      .from('cold_emails')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('[cold-emails/[id] DELETE]', error);
      return Response.json({ error: '删除失败' }, { status: 500 });
    }

    return Response.json({ ok: true });
  } catch (error) {
    console.error('[cold-emails/[id] DELETE]', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
