import type { NextRequest } from 'next/server';
import { getServerUser, getUserRole } from '../../../lib/auth';
import { supabaseAdmin } from '../../../lib/supabase/server';
import { logWork } from '../../../lib/worklog';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

export async function GET() {
  try {
    const user = await getServerUser();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const role = await getUserRole(user.id);
    if (!role || !['super_admin', 'admin', 'sales'].includes(role)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data, error } = await db
      .from('sales_qrcodes')
      .select('*')
      .eq('sales_user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return Response.json({ data: data ?? [] });
  } catch (e) {
    console.error('[sales/qrcode GET]', e);
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getServerUser();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const role = await getUserRole(user.id);
    if (!role || !['super_admin', 'admin', 'sales'].includes(role)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { channel, label } = await req.json();

    const code = `S${user.id.slice(0, 4).toUpperCase()}${Date.now().toString(36).toUpperCase()}`;

    const { data, error } = await db
      .from('sales_qrcodes')
      .insert({
        sales_user_id: user.id,
        code,
        channel: channel || 'wechat',
        label: label || null,
      })
      .select()
      .single();

    if (error) throw error;

    await logWork({
      userId: user.id,
      role: 'sales',
      action: 'create_qrcode',
      actionCategory: 'sales_marketing',
      targetType: 'sales_qrcode',
      targetId: data.id,
      targetName: label || code,
      details: { channel: channel || 'wechat', label },
    });

    return Response.json({ data }, { status: 201 });
  } catch (e) {
    console.error('[sales/qrcode POST]', e);
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}
