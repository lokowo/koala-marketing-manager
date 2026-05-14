## ADDED Requirements

### Requirement: Revenue overview dashboard
The Admin dashboard SHALL display a revenue overview panel showing total revenue for today, this week, and this month. Revenue data SHALL be calculated from `credit_transactions` records with `type IN ('purchase', 'subscription_credit')` joined with payment amounts, or queried from Stripe API.

#### Scenario: Admin views revenue overview
- **WHEN** admin navigates to the dashboard revenue section
- **THEN** system displays three metrics: today's revenue (AUD), this week's revenue, and this month's revenue

#### Scenario: No revenue today
- **WHEN** no payments have been received today
- **THEN** today's revenue shows $0.00

### Requirement: Paying users list
The Admin dashboard SHALL display a list of users who have made at least one payment or have an active subscription. The list SHALL show user email, plan type, total spent, subscription status, and last payment date. The list SHALL be sortable by total spent and last payment date.

#### Scenario: Admin views paying users
- **WHEN** admin navigates to paying users section
- **THEN** system displays a paginated table of users with payment history, sorted by most recent payment

### Requirement: Subscription statistics
The Admin dashboard SHALL display subscription aggregate statistics: total active subscriptions by tier, MRR (Monthly Recurring Revenue), churn count this month, and new subscriptions this month.

#### Scenario: Admin views subscription stats
- **WHEN** admin navigates to subscription statistics
- **THEN** system displays: active Starter count, active Pro count, active Elite count, total MRR, new subscriptions this month, cancellations this month
