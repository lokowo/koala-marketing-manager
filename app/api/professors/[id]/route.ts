import type { NextRequest } from 'next/server';
import { getProfessor, updateProfessor, deleteProfessor } from '../../../lib/services/professorService';
import { getServerUser } from '../../../lib/auth';
import { logAdminAction } from '../../../lib/worklog';
import { notifySuperAdmins } from '../../../lib/notifications';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const professor = await getProfessor(id);
  if (!professor) return Response.json({ error: 'Not found' }, { status: 404 });
  return Response.json({ data: professor });
}

export async function PUT(request: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const body = await request.json();
  const professor = await updateProfessor(id, body);
  if (!professor) return Response.json({ error: 'Not found' }, { status: 404 });
  return Response.json({ data: professor });
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const user = await getServerUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await ctx.params;
  const deleted = await deleteProfessor(id);
  if (!deleted) return Response.json({ error: 'Not found' }, { status: 404 });

  await logAdminAction(user.id, 'professor_delete', 'professor', id);
  await notifySuperAdmins('教授删除', `教授 ${id} 已被删除。`).catch(() => {});

  return Response.json({ success: true });
}
