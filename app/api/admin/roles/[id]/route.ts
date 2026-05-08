import type { NextRequest } from 'next/server';
import { requireSuperAdmin } from '../../../../lib/auth';
import { supabaseAdmin } from '../../../../lib/supabase/server';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

type Ctx = { params: Promise<{ id: string }> };

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  try {
    await requireSuperAdmin();
    const { id: userId } = await ctx.params;

    await db.from('user_roles').delete().eq('user_id', userId);
    await db.from('user_profiles').update({ role: null, role_status: null }).eq('id', userId);

    await db.from('notifications').insert({
      user_id: userId,
      type: 'role_revoked',
      title: '角色已被撤销',
      body: '你的管理角色已被撤销。如有疑问请联系管理员。',
    });

    return Response.json({ success: true });
  } catch (e) {
    const msg = (e as Error).message;
    if (msg === 'Unauthorized') return Response.json({ error: msg }, { status: 401 });
    if (msg === 'Forbidden') return Response.json({ error: msg }, { status: 403 });
    console.error('[admin/roles DELETE]', e);
    return Response.json({ error: msg }, { status: 500 });
  }
}
