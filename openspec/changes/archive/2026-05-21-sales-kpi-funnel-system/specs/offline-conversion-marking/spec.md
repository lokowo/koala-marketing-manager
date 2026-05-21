## ADDED Requirements

### Requirement: Referral-users table includes offline conversion column
The Sales referral-users page (`/dashboard/sales/referral-users`) MUST add a "线下" column after the "佣金" column. For already-converted referrals, it MUST show a purple badge with checkmark and conversion date. For unconverted referrals, it MUST show a "标记转化" button.

#### Scenario: Referral already converted offline
- **WHEN** referral has offline_converted=true and offline_converted_at="2026-05-15"
- **THEN** cell shows a purple badge "✅ 2026/5/15"

#### Scenario: Referral not yet converted
- **WHEN** referral has offline_converted=false
- **THEN** cell shows a "标记转化" button with border styling

### Requirement: Offline conversion confirmation dialog
Clicking "标记转化" MUST open a dialog asking for confirmation. The dialog MUST show the user's name, an optional notes textarea, and Cancel/Confirm buttons. On confirm, it MUST call `PATCH /api/sales/mark-offline` with `{ referral_id, notes }`. On success, the referral list MUST refresh to show the updated state.

#### Scenario: Successful offline marking
- **WHEN** sales user clicks "标记转化" for user "张三", enters notes "线下面谈后签约", and clicks confirm
- **THEN** API is called with referral_id and notes, dialog closes, and the row updates to show the purple converted badge

#### Scenario: Cancel dialog
- **WHEN** sales user clicks "标记转化" then clicks "取消"
- **THEN** dialog closes and no API call is made

### Requirement: Referral interface includes offline fields
The Referral TypeScript interface MUST include `offline_converted: boolean`, `offline_converted_at: string | null`, and `offline_notes: string | null`.

#### Scenario: Interface type safety
- **WHEN** referral data is loaded from API
- **THEN** offline fields are available with correct types for rendering
