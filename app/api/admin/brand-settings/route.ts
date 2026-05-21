import { getServerUserWithRole } from '../../../lib/auth';
import { supabaseAdmin } from '../../../lib/supabase/server';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

const ALLOWED_FIELDS = [
  'brand_name', 'slogan', 'logo_url', 'contact_email',
  'wechat_id', 'xiaohongshu', 'primary_color', 'secondary_color',
] as const;

export async function GET() {
  try {
    const result = await getServerUserWithRole();
    if (!result || !['admin', 'super_admin'].includes(result.role)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data, error } = await db
      .from('brand_settings')
      .select('*')
      .limit(1)
      .single();

    if (error) throw error;
    return Response.json(data);
  } catch (error) {
    console.error('[admin/brand-settings GET]', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const result = await getServerUserWithRole();
    if (!result || result.role !== 'super_admin') {
      return Response.json({ error: 'Only super_admin can modify brand settings' }, { status: 403 });
    }

    const body = await req.json();

    const updates: Record<string, string> = {};
    for (const key of ALLOWED_FIELDS) {
      if (key in body && typeof body[key] === 'string') {
        updates[key] = body[key].trim();
      }
    }

    if (Object.keys(updates).length === 0) {
      return Response.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const { data: existing } = await db
      .from('brand_settings')
      .select('id')
      .limit(1)
      .single();

    if (!existing) {
      return Response.json({ error: 'Brand settings not initialized' }, { status: 404 });
    }

    const { error } = await db
      .from('brand_settings')
      .update({ ...updates, updated_at: new Date().toISOString(), updated_by: result.user.id })
      .eq('id', existing.id);

    if (error) throw error;

    await db.from('sales_audit_logs').insert({
      actor_id: result.user.id,
      actor_email: result.user.email || '',
      actor_role: result.role,
      action: 'brand_settings_updated',
      target_type: 'brand_settings',
      details: updates,
    });

    return Response.json({ ok: true });
  } catch (error) {
    console.error('[admin/brand-settings PATCH]', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
