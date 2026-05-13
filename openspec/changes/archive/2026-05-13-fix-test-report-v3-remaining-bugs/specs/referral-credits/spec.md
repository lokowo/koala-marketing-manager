## MODIFIED Requirements

### Requirement: New user profile initializes with explicit credit balance
When a new user registers, the `user_profiles` record MUST be created with `credits_remaining: 30` explicitly set, not relying on a fallback default of `|| 30` when reading.

#### Scenario: User registers without referral code
- **WHEN** a user registers without a referral code
- **THEN** their `user_profiles.credits_remaining` is set to `30` in the database at creation time

#### Scenario: User registers with referral code
- **WHEN** a user registers with a valid referral code
- **THEN** their `user_profiles.credits_remaining` is set to `30` at creation, then updated to `35` after the referral bonus of `5` is applied

### Requirement: Referral credit errors are surfaced, not swallowed
The registration API SHALL still succeed even if referral credit application fails, but the response MUST indicate whether credits were applied.

#### Scenario: Referral credit application succeeds
- **WHEN** a user registers with a valid referral code and the referrer exists with < 3 referrals
- **THEN** the API response includes `creditApplied: true`
- **AND** the referrer receives 15 credits, the new user receives 5 bonus credits
- **AND** `credit_transactions` records are created for both users

#### Scenario: Referral credit application fails due to database error
- **WHEN** a user registers with a valid referral code but the credit update query fails
- **THEN** the registration still succeeds (user account is created)
- **AND** the API response includes `creditApplied: false`
- **AND** the error is logged with full context

### Requirement: Post-verification claim waits for authenticated session
The referral claim call after email verification MUST be awaited (not fire-and-forget) and MUST only execute after the user's session is established via `signInWithPassword`.

#### Scenario: User verifies email and claim executes
- **WHEN** a user completes email verification and `signInWithPassword` succeeds
- **THEN** the system awaits the `/api/user/referral/claim` call
- **AND** if the claim returns an error, the user sees a non-blocking notification

#### Scenario: User verifies but referral was already applied at registration
- **WHEN** a user verifies email and `referred_by` is already set in their profile
- **THEN** the claim API returns early without double-crediting
