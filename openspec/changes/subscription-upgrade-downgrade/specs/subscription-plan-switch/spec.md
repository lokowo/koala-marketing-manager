## ADDED Requirements

### Requirement: Preview subscription plan change
The system SHALL expose `POST /api/stripe/upgrade/preview` that returns cost/timing details for switching from the user's current subscription tier to a target tier.

#### Scenario: Upgrade preview (Starter → Pro)
- **WHEN** authenticated user on Starter sends `{ targetTierId: "pro" }`
- **THEN** system returns `{ type: "upgrade", currentTier: "starter", targetTier: "pro", proratedAmount: <number>, newMonthlyPrice: 49, creditsDiff: 20, effectiveNow: true }`

#### Scenario: Downgrade preview (Pro → Starter)
- **WHEN** authenticated user on Pro sends `{ targetTierId: "starter" }`
- **THEN** system returns `{ type: "downgrade", currentTier: "pro", targetTier: "starter", effectiveDate: "<ISO date>", newMonthlyPrice: 19.9, newMonthlyCredits: 10, effectiveNow: false }`

#### Scenario: No active subscription
- **WHEN** user without active subscription sends preview request
- **THEN** system returns 400 with `{ error: "No active subscription" }`

#### Scenario: Same tier
- **WHEN** user sends targetTierId matching current tier
- **THEN** system returns 400 with `{ error: "Already on this plan" }`

### Requirement: Confirm subscription plan change
The system SHALL expose `POST /api/stripe/upgrade/confirm` that executes the plan switch via Stripe API.

#### Scenario: Confirm upgrade
- **WHEN** authenticated user confirms upgrade to higher tier
- **THEN** system updates Stripe subscription with `proration_behavior: 'create_prorations'`, adds credit diff immediately, updates DB tier and plan_type
- **AND** returns `{ success: true, type: "upgrade", creditsDiff: <number> }`

#### Scenario: Confirm downgrade
- **WHEN** authenticated user confirms downgrade to lower tier
- **THEN** system updates Stripe subscription with `proration_behavior: 'none'`, does NOT change credits or DB tier immediately
- **AND** returns `{ success: true, type: "downgrade", effectiveDate: "<ISO date>" }`

#### Scenario: Idempotent credit add on upgrade
- **WHEN** upgrade confirm is called twice rapidly
- **THEN** credits are only added once (idempotent via reference_id)

### Requirement: Shared credit utility
The `addCredits()` and `idempotentCheck()` functions SHALL be extracted to `app/lib/server/credits.ts` and imported by both the webhook handler and the upgrade/confirm endpoint.
