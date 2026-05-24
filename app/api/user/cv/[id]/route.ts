import { getServerUser } from '../../../../lib/auth';
import { supabaseAdmin } from '../../../../lib/supabase/server';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getServerUser();
    if (!user) return Response.json({ error: '请先登录' }, { status: 401 });

    const { id } = await params;
    const body = await req.json();
    const { content, title, status } = body as {
      content?: Record<string, unknown>;
      title?: string;
      status?: 'draft' | 'final';
    };

    const { data: doc, error: fetchErr } = await db
      .from('generated_documents')
      .select('id, user_id, type')
      .eq('id', id)
      .single();

    if (fetchErr || !doc) {
      return Response.json({ error: '文档不存在' }, { status: 404 });
    }
    if (doc.user_id !== user.id) {
      return Response.json({ error: '无权限' }, { status: 403 });
    }
    if (doc.type !== 'cv') {
      return Response.json({ error: '文档类型不匹配' }, { status: 400 });
    }

    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (content !== undefined) update.content = content;
    if (title !== undefined) update.title = title;
    if (status !== undefined) {
      if (!['draft', 'final'].includes(status)) {
        return Response.json({ error: 'status 只能是 draft 或 final' }, { status: 400 });
      }
      update.status = status;
    }

    const { error: updateErr } = await db
      .from('generated_documents')
      .update(update)
      .eq('id', id);

    if (updateErr) {
      console.error('[cv/[id] PATCH]', updateErr);
      return Response.json({ error: '更新失败' }, { status: 500 });
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('[cv/[id] PATCH]', error);
    return Response.json({ error: '更新失败' }, { status: 500 });
  }
}
