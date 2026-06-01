import { requireAdmin } from '../../../lib/auth';
import { supabaseAdmin } from '../../../lib/supabase/server';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

type CustomerRow = {
  id: string;
  customer_user_id: string | null;
  subject_name: string | null;
};

type ProfileRow = {
  id: string;
  display_name: string | null;
  email: string | null;
  university: string | null;
  major: string | null;
};

export async function GET() {
  let caller: { id: string };
  try {
    const result = await requireAdmin();
    caller = result.user;
  } catch (e) {
    const msg = (e as Error).message;
    return Response.json(
      { error: msg === 'Unauthorized' ? 'Unauthorized' : 'Forbidden' },
      { status: msg === 'Unauthorized' ? 401 : 403 }
    );
  }

  try {
    const { data: customersRaw, error } = await db
      .from('sales_customers')
      .select('id, customer_user_id, subject_name')
      .eq('sales_user_id', caller.id)
      .not('customer_user_id', 'is', null)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[ola/clients]', error);
      return Response.json({ error: error.message }, { status: 500 });
    }

    const customers = (customersRaw ?? []) as CustomerRow[];
    const customerUserIds = customers
      .map((c) => c.customer_user_id)
      .filter((id): id is string => !!id);

    const profilesMap = new Map<string, ProfileRow>();
    if (customerUserIds.length > 0) {
      const { data: profiles } = await db
        .from('user_profiles')
        .select('id, display_name, email, university, major')
        .in('id', customerUserIds);
      for (const p of (profiles ?? []) as ProfileRow[]) {
        profilesMap.set(p.id, p);
      }
    }

    const clients = customers.map((c) => {
      const profile = c.customer_user_id ? profilesMap.get(c.customer_user_id) : null;
      const name =
        c.subject_name ||
        profile?.display_name ||
        profile?.email?.split('@')[0] ||
        '未命名客户';
      return {
        id: c.id,
        customer_user_id: c.customer_user_id,
        name,
        school: profile?.university ?? null,
        major: profile?.major ?? null,
      };
    });

    return Response.json({ clients });
  } catch (e) {
    console.error('[ola/clients]', e);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
