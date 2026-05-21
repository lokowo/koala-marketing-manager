## manual-channel-attribution

### Purpose
Allow users who manually type a referral code (without scanning a QR link) to optionally specify which channel they came from, ensuring accurate sales attribution analytics.

### Requirements

#### Auth Page Channel Selector
- MUST appear on `app/koala/auth/page.tsx` registration form
- MUST only be visible when ALL of these conditions are true:
  1. User is in register mode (not login)
  2. Referral code input field has a value
  3. No channel info exists from URL param (`ch`) or cookie (`koala_ref.ch`)
- Renders as a `<select>` dropdown below the referral code input
- Label: "从哪里知道我们？（可选）"
- Options: 请选择（可选）[empty value], 微信, 小红书, 抖音, 微博, 知乎, B站, 邮件, WhatsApp, 线下活动, 朋友推荐, 其他
- Value stored in component state as `manualChannel`
- Selection is optional — empty value is valid

#### Attribution API Update
- `POST /api/sales/attribute` MUST accept optional `manual_channel` field in request body
- Channel resolution priority: cookie `ch` > body `manual_channel` > fallback `'unknown'`
- The auth page MUST send `manual_channel` in the body when calling `/api/sales/attribute` (if a value was selected)
- Request body is currently empty (POST with no body); change to send JSON body with `manual_channel` field

#### Data Flow
1. User fills referral code manually → channel dropdown appears
2. User selects channel (optional) → stored in state
3. User registers → email verification → auto-login
4. Auth page calls `POST /api/sales/attribute` with body `{ manual_channel: "wechat" }`
5. API checks cookie first; if no `ch` in cookie, uses `manual_channel` from body
6. `sales_referrals.channel` column gets the resolved value

### Boundaries
- Does NOT add new database columns or tables
- Does NOT modify the cookie-based attribution flow (QR scan → cookie → attribute still works exactly as before)
- Only affects manual-entry referral code scenario
- The dropdown does NOT appear for users who arrived via QR scan (they already have channel in cookie/URL)
