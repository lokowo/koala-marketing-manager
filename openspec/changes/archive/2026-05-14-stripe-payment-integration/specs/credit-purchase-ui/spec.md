## ADDED Requirements

### Requirement: Pricing page displays purchasable credit packs
The `/koala/pricing` page SHALL display 4 credit pack cards (入门 $4.99/50, 标准 $9.99/120, 专业 $19.99/280, 旗舰 $49.99/800) with a "购买" button on each. Clicking the button SHALL POST to `/api/stripe/checkout` with the corresponding price ID and redirect to Stripe Checkout.

#### Scenario: User clicks buy on Standard credit pack
- **WHEN** user clicks "购买" on the $9.99 / 120 credits pack
- **THEN** browser redirects to Stripe Checkout with the correct price pre-selected

#### Scenario: Unauthenticated user clicks buy
- **WHEN** unauthenticated user clicks any "购买" button
- **THEN** system redirects to login page with return URL back to pricing

### Requirement: Pricing page displays subscription plans with purchase action
The `/koala/pricing` page SHALL display the 3 subscription tiers (Starter $19.90, Pro $49.00, Elite $99.00) with "订阅" buttons. Users with an active subscription SHALL see "管理订阅" button that opens Stripe Customer Portal instead.

#### Scenario: Free user subscribes to Pro
- **WHEN** free user clicks "订阅" on Pro plan
- **THEN** browser redirects to Stripe Checkout in subscription mode

#### Scenario: Subscribed user sees management option
- **WHEN** user with active Starter subscription views pricing page
- **THEN** Starter card shows "当前方案" badge, other cards show "升级" button, and a "管理订阅" link is visible

### Requirement: Display current credit balance on pricing page
The pricing page SHALL show the user's current `credits_remaining` balance prominently at the top. Balance SHALL refresh after returning from a successful Stripe Checkout.

#### Scenario: User returns from successful purchase
- **WHEN** URL contains `?success=true`
- **THEN** page shows success toast "积分购买成功，正在到账..." and polls `/api/user/credits` until balance updates

### Requirement: Insufficient credits modal
When `/api/user/credits/spend` returns 402, the frontend SHALL display a modal showing: the feature name, required credits, current balance, and two action buttons: "充值积分" (→ `/koala/pricing#credit-packs`) and "查看订阅" (→ `/koala/pricing#subscriptions`).

#### Scenario: User tries to generate email with 0 credits
- **WHEN** user clicks "生成套磁信" and has 0 credits remaining
- **THEN** modal appears: "生成套磁信需要 5 积分，当前余额 0 积分" with [充值积分] and [查看订阅] buttons

#### Scenario: User dismisses modal
- **WHEN** user closes the insufficient credits modal
- **THEN** modal closes, no navigation occurs, user stays on current page

### Requirement: Purchase history display
The pricing page or user profile SHALL show a list of past purchases from `credit_transactions` where `type IN ('purchase', 'subscription_credit')`, showing date, amount, description, and balance after.

#### Scenario: User views purchase history
- **WHEN** user navigates to pricing page and scrolls to purchase history section
- **THEN** system displays a chronological list of payment-related transactions with dates, amounts, and descriptions
