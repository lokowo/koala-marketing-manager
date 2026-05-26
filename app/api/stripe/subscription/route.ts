import { getServerUser } from '../../../lib/auth';
import { getUserActiveSubscription } from '../../../lib/server/stripe';
import { supabaseAdmin } from '../../../lib/supabase/server';
import { getPrivilegedRole } from '../../../lib/services/usageTracker';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

export async function GET() {
  try {
    const user = await getServerUser();
    if (!user) return Response.json({ error: 'Authentication required' }, { status: 401 });

    const privileged = await getPrivilegedRole(supabaseAdmin, user.id);
    if (privileged === 'admin' || privileged === 'super_admin') {
      return Response.json({ subscription: null, plan_type: 'elite' });
    }
    if (privileged === 'sales') {
      return Response.json({ subscription: null, plan_type: 'pro' });
    }

    const { data: profile } = await db
      .from('user_profiles')
      .select('plan_type')
      .eq('id', user.id)
      .single();

    const subscription = await getUserActiveSubscription(user.id);

    return Response.json({
      subscription: subscription || null,
      plan_type: profile?.plan_type || 'free',
    });
  } catch (error) {
    console.error('[stripe/subscription]', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
