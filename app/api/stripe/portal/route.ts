import { getServerUser } from '../../../lib/auth';
import { getStripe } from '../../../lib/server/stripe';
import { supabaseAdmin } from '../../../lib/supabase/server';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

export async function POST() {
  try {
    const user = await getServerUser();
    if (!user) return Response.json({ error: 'Authentication required' }, { status: 401 });

    const { data: profile } = await db
      .from('user_profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single();

    if (!profile?.stripe_customer_id) {
      return Response.json({ error: 'No payment history found' }, { status: 400 });
    }

    const session = await getStripe().billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://koalaphd.com'}/koala/pricing`,
    });

    return Response.json({ url: session.url });
  } catch (error) {
    console.error('[stripe/portal]', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
