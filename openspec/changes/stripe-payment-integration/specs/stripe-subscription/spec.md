## ADDED Requirements

### Requirement: Query current subscription status
The system SHALL expose `GET /api/stripe/subscription` that returns the authenticated user's active subscription details from the `subscriptions` table. If no active subscription exists, the system SHALL return `{ subscription: null, plan_type: 'free' }`.

#### Scenario: User with active Pro subscription
- **WHEN** authenticated user with active Pro subscription sends GET
- **THEN** system returns `{ subscription: { tier: "pro", status: "active", current_period_end: "...", cancel_at_period_end: false }, plan_type: "pro" }`

#### Scenario: User with no subscription
- **WHEN** authenticated user with no subscription sends GET
- **THEN** system returns `{ subscription: null, plan_type: "free" }`

#### Scenario: User with canceled subscription still in period
- **WHEN** authenticated user with `cancel_at_period_end: true` and `current_period_end` in the future sends GET
- **THEN** system returns subscription with `cancel_at_period_end: true` and active status

### Requirement: Create Stripe Customer Portal session
The system SHALL expose `POST /api/stripe/portal` that creates a Stripe Billing Portal session for the authenticated user, allowing them to manage subscriptions, update payment methods, and view invoices. The return URL SHALL be `/koala/pricing`.

#### Scenario: User accesses Customer Portal
- **WHEN** authenticated user with `stripe_customer_id` sends POST to `/api/stripe/portal`
- **THEN** system creates a portal session and returns `{ url: "https://billing.stripe.com/..." }`

#### Scenario: User without Stripe Customer ID
- **WHEN** authenticated user without `stripe_customer_id` sends POST to `/api/stripe/portal`
- **THEN** system returns 400 with `{ error: "No payment history found" }`

### Requirement: Subscription tier determines feature access
The system SHALL enforce feature access based on `user_profiles.plan_type`. Free users SHALL have limited daily AI turns (10), limited professor matches (10 preview), and 1 free email. Subscribed users SHALL have unlimited AI turns and their tier's monthly credit allocation. Elite users SHALL have zero credit cost for all AI features.

#### Scenario: Free user hits daily AI turn limit
- **WHEN** free user has used 10 AI conversation turns today
- **THEN** system returns 429 with message about upgrading or waiting until tomorrow

#### Scenario: Elite user uses AI features
- **WHEN** Elite user requests any AI feature via `/api/user/credits/spend`
- **THEN** system logs transaction with `amount: 0` and proceeds without deduction
