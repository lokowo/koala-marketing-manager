## ADDED Requirements

### Requirement: Verify Stripe webhook signature
The system SHALL expose `POST /api/webhooks/stripe` that reads the raw request body and verifies the `stripe-signature` header using `STRIPE_WEBHOOK_SECRET`. Invalid signatures SHALL be rejected with 400.

#### Scenario: Valid webhook signature
- **WHEN** Stripe sends a POST with valid signature header
- **THEN** system accepts the event and processes it, returning 200

#### Scenario: Invalid webhook signature
- **WHEN** a POST arrives with missing or invalid `stripe-signature` header
- **THEN** system returns 400 with `{ error: "Invalid signature" }`

### Requirement: Handle checkout.session.completed for credit packs
The system SHALL listen for `checkout.session.completed` events where `mode === 'payment'`. Upon receiving, the system SHALL read the `credits` value from the session's line item price metadata, add that amount to the user's `credits_remaining`, and insert a `credit_transactions` record with `type: 'purchase'` and `reference_id` set to the Stripe Session ID.

#### Scenario: Credit pack payment completed
- **WHEN** webhook receives `checkout.session.completed` with `mode: "payment"` and price metadata `credits: "120"`
- **THEN** system adds 120 to user's `credits_remaining`, inserts a credit_transaction with `type: 'purchase'`, `amount: 120`, `reference_id: session_id`

#### Scenario: Duplicate event for same session
- **WHEN** webhook receives a second `checkout.session.completed` for the same session ID
- **THEN** system detects existing `credit_transactions` record with matching `reference_id` and skips processing, returning 200

### Requirement: Handle checkout.session.completed for subscriptions
The system SHALL listen for `checkout.session.completed` events where `mode === 'subscription'`. Upon receiving, the system SHALL create a `subscriptions` record, update `user_profiles.plan_type` to the matching tier, and grant the first month's credits.

#### Scenario: New subscription activated
- **WHEN** webhook receives `checkout.session.completed` with `mode: "subscription"` and subscription metadata `tier: "pro"`, `monthly_credits: "30"`
- **THEN** system creates a `subscriptions` record with `status: 'active'`, sets `user_profiles.plan_type` to `'pro'`, and adds 30 credits with `type: 'subscription_credit'`

### Requirement: Handle invoice.paid for subscription renewal
The system SHALL listen for `invoice.paid` events with `billing_reason === 'subscription_cycle'`. Upon receiving, the system SHALL grant the monthly credits for the subscription tier and update `subscriptions.current_period_end`.

#### Scenario: Monthly renewal payment succeeds
- **WHEN** webhook receives `invoice.paid` with `billing_reason: "subscription_cycle"` for a Pro subscription
- **THEN** system adds 30 credits with `type: 'subscription_credit'`, `reference_id: invoice_id`, and updates `current_period_end`

#### Scenario: Duplicate invoice event
- **WHEN** webhook receives a second `invoice.paid` for the same invoice ID
- **THEN** system skips credit grant (idempotent check on `reference_id`)

### Requirement: Handle customer.subscription.updated
The system SHALL listen for `customer.subscription.updated` to track plan changes (upgrades/downgrades) and cancellation scheduling. The system SHALL update the `subscriptions` table and `user_profiles.plan_type` accordingly.

#### Scenario: User upgrades from Starter to Pro
- **WHEN** webhook receives `customer.subscription.updated` with new price matching Pro tier
- **THEN** system updates `subscriptions.tier` to `'pro'` and `user_profiles.plan_type` to `'pro'`

#### Scenario: User schedules cancellation
- **WHEN** webhook receives `customer.subscription.updated` with `cancel_at_period_end: true`
- **THEN** system sets `subscriptions.cancel_at_period_end` to `true` (plan remains active until period end)

### Requirement: Handle customer.subscription.deleted
The system SHALL listen for `customer.subscription.deleted` to finalize cancellation. The system SHALL set `subscriptions.status` to `'canceled'` and reset `user_profiles.plan_type` to `'free'`.

#### Scenario: Subscription period ends after cancellation
- **WHEN** webhook receives `customer.subscription.deleted`
- **THEN** system sets `subscriptions.status` to `'canceled'`, `user_profiles.plan_type` to `'free'`
