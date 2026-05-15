import { getServerUser } from '../../../lib/auth';
import {
  getStripe,
  isValidPriceId,
  isCreditPackPrice,
  isSubscriptionPrice,
  getOrCreateCustomer,
  getUserActiveSubscription,
} from '../../../lib/server/stripe';

export async function POST(req: Request) {
  try {
    const user = await getServerUser();
    if (!user) return Response.json({ error: 'Authentication required' }, { status: 401 });

    const { priceId } = await req.json();
    if (!priceId || !isValidPriceId(priceId)) {
      return Response.json({ error: 'Invalid price ID' }, { status: 400 });
    }

    const customerId = await getOrCreateCustomer(user.id, user.email!);

    const stripe = getStripe();

    if (isSubscriptionPrice(priceId)) {
      const activeSub = await getUserActiveSubscription(user.id);
      if (activeSub) {
        return Response.json(
          { error: 'Active subscription exists. Use Customer Portal to manage.' },
          { status: 400 },
        );
      }

      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: 'subscription',
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://koalaphd.com'}/koala/pricing?success=true&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://koalaphd.com'}/koala/pricing?canceled=true`,
        metadata: { supabase_user_id: user.id },
      });

      return Response.json({ url: session.url });
    }

    if (isCreditPackPrice(priceId)) {
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: 'payment',
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://koalaphd.com'}/koala/pricing?success=true&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://koalaphd.com'}/koala/pricing?canceled=true`,
        metadata: { supabase_user_id: user.id },
      });

      return Response.json({ url: session.url });
    }

    return Response.json({ error: 'Invalid price ID' }, { status: 400 });
  } catch (error) {
    console.error('[stripe/checkout]', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
