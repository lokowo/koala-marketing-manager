## ADDED Requirements

### Requirement: Create Checkout Session for credit pack purchase
The system SHALL expose `POST /api/stripe/checkout` that creates a Stripe Checkout Session in `payment` mode when `type === 'credit_pack'`. The session SHALL include the selected price ID, set `success_url` to `/koala/pricing?success=true&session_id={CHECKOUT_SESSION_ID}`, and `cancel_url` to `/koala/pricing?canceled=true`. The endpoint SHALL require an authenticated user and create or reuse a Stripe Customer linked to the user's `stripe_customer_id`.

#### Scenario: Authenticated user purchases a credit pack
- **WHEN** authenticated user sends POST with `{ type: "credit_pack", priceId: "price_xxx" }`
- **THEN** system creates a Stripe Checkout Session in payment mode and returns `{ url: "https://checkout.stripe.com/..." }`

#### Scenario: Unauthenticated user attempts purchase
- **WHEN** unauthenticated request sends POST to `/api/stripe/checkout`
- **THEN** system returns 401 with `{ error: "Authentication required" }`

#### Scenario: First-time purchaser has no Stripe Customer
- **WHEN** authenticated user with no `stripe_customer_id` sends POST
- **THEN** system creates a new Stripe Customer with user's email and `metadata.supabase_user_id`, stores the `stripe_customer_id` in `user_profiles`, and proceeds with session creation

### Requirement: Create Checkout Session for subscription
The system SHALL create a Stripe Checkout Session in `subscription` mode when `type === 'subscription'`. The session SHALL use the same success/cancel URL pattern. If the user already has an active subscription, the system SHALL return 400 with guidance to use Customer Portal for changes.

#### Scenario: User subscribes to Pro plan
- **WHEN** authenticated user sends POST with `{ type: "subscription", priceId: "price_pro_xxx" }`
- **THEN** system creates a Checkout Session in subscription mode and returns `{ url }`

#### Scenario: User with active subscription tries to subscribe again
- **WHEN** authenticated user with an active subscription sends POST with `type: "subscription"`
- **THEN** system returns 400 with `{ error: "Active subscription exists. Use Customer Portal to manage." }`

### Requirement: Validate price ID against allowed prices
The system SHALL maintain a whitelist of valid Stripe Price IDs (4 credit packs + 3 subscriptions). Requests with unknown `priceId` values SHALL be rejected with 400.

#### Scenario: Invalid price ID
- **WHEN** user sends POST with `{ priceId: "price_unknown" }`
- **THEN** system returns 400 with `{ error: "Invalid price ID" }`
