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
    const ch = channel || 'wechat';
    const lbl = (label || '').trim();

    if (!lbl) {
      return Response.json({ error: '备注不能为空，请填写备注方便追踪不同渠道' }, { status: 400 });
    }

    // Check for existing code with same (sales_user_id, channel, label)
    let existingQuery = db
      .from('sales_qrcodes')
      .select('*')
      .eq('sales_user_id', user.id)
      .eq('channel', ch);

    if (lbl) {
      existingQuery = existingQuery.eq('label', lbl);
    } else {
      existingQuery = existingQuery.is('label', null);
    }

    const { data: existing } = await existingQuery.maybeSingle();

    if (existing) {
      return Response.json({
        data: existing,
        existing: true,
        message: '该渠道+标签已有推广码',
      });
    }

    const code = `S${user.id.slice(0, 4).toUpperCase()}${Date.now().toString(36).toUpperCase()}`;

    const { data, error } = await db
      .from('sales_qrcodes')
      .insert({
        sales_user_id: user.id,
        code,
        channel: ch,
        label: lbl || null,
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
      targetName: lbl || code,
      details: { channel: ch, label: lbl },
    });

    return Response.json({ data }, { status: 201 });
  } catch (e) {
    console.error('[sales/qrcode POST]', e);
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}
