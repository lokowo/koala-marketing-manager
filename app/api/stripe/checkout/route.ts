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
    const msg = error instanceof Error ? error.message : String(error);
    console.error('[stripe/checkout]', msg, error);
    if (msg.includes('No such price')) {
      return Response.json({ error: 'Price configuration error. Please contact support.' }, { status: 500 });
    }
    if (msg.includes('No API key') || msg.includes('Invalid API Key')) {
      return Response.json({ error: 'Payment system not configured' }, { status: 500 });
    }
    return Response.json({ error: 'Checkout failed. Please try again.' }, { status: 500 });
  }
}
