## MODIFIED Requirements

### Requirement: Registration referral code processing
The registration API SHALL process invite codes by matching against three sources in priority order: (1) `user_profiles.referral_code` for normal user or admin invites, (2) `sales_qrcodes.code` for sales channel invites. Each source has different rules for limits and side effects.

#### Scenario: Normal user referral code with remaining invites
- **WHEN** registration request contains a `referralCode` that matches a `user_profiles.referral_code` where the referrer's role is not "admin" and `referral_codes.uses < max_uses` (default 3)
- **THEN** referrer gets +15 credits, new user gets +5 credits, `referral_codes.uses` increments by 1, new user's `referred_by` is set to referrer's ID

#### Scenario: Normal user referral code with no remaining invites
- **WHEN** registration request contains a `referralCode` that matches a normal user's code but `referral_codes.uses >= max_uses`
- **THEN** registration succeeds but no credits are awarded, response includes `creditApplied: false`

#### Scenario: Admin referral code (no invite limit)
- **WHEN** registration request contains a `referralCode` that matches a `user_profiles.referral_code` where the referrer's role is "admin"
- **THEN** referrer gets +15 credits, new user gets +5 credits, `referral_codes.uses` increments by 1, no KPI tracking, no `max_uses` check

#### Scenario: Sales QR code
- **WHEN** registration request contains a `referralCode` that does not match any `user_profiles.referral_code` but matches a `sales_qrcodes.code`
- **THEN** system creates a `sales_customers` record linking the sales user to the new user, increments `sales_qrcodes.register_count`, new user gets +5 credits, no referrer credits

#### Scenario: Invalid referral code
- **WHEN** registration request contains a `referralCode` that matches neither `user_profiles.referral_code` nor `sales_qrcodes.code`
- **THEN** registration succeeds with no credits applied, `creditApplied: false`

#### Scenario: Referral processing failure does not block registration
- **WHEN** any error occurs during referral code processing (database error, table missing, etc.)
- **THEN** registration still completes successfully, error is logged, `creditApplied: false`

#### Scenario: Self-referral prevention
- **WHEN** the referral code belongs to the same user who is registering
- **THEN** no credits are awarded, registration succeeds normally
