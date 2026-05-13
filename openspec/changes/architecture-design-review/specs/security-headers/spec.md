## ADDED Requirements

### Requirement: HTTP security headers on all responses
The application MUST set the following HTTP security headers on all responses via `next.config.ts` `headers()`:

- `X-Frame-Options: DENY` — prevent clickjacking
- `X-Content-Type-Options: nosniff` — prevent MIME type sniffing
- `Referrer-Policy: strict-origin-when-cross-origin` — limit referrer leakage
- `X-DNS-Prefetch-Control: on` — improve performance
- `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload` — enforce HTTPS

#### Scenario: Response includes security headers
- **WHEN** any page or API route returns a response
- **THEN** the response includes all 5 security headers listed above

#### Scenario: X-Frame-Options prevents embedding
- **WHEN** a third-party site attempts to embed the app in an iframe
- **THEN** the browser blocks the embed due to `X-Frame-Options: DENY`

### Requirement: KPI settings refreshes data after save
`app/dashboard/koala/kpi-settings/page.tsx` MUST re-fetch KPI data from the API after a successful `saveKpi()` call, so the displayed `perSalesKpi` and `history` arrays reflect the updated targets.

#### Scenario: Admin saves KPI and sees updated data
- **WHEN** an admin saves new KPI targets on the settings page
- **THEN** the page re-fetches `/api/admin/kpi` and displays the updated data without requiring a manual page reload

### Requirement: Customer detail refreshes after contact log
`app/dashboard/sales/customer/[id]/page.tsx` MUST re-fetch the full customer object from the API after `handleLogContact()`, so fields like `last_contact_at` and `follow_up_status` are current.

#### Scenario: Sales logs a contact and sees updated customer
- **WHEN** a sales user logs a contact on the customer detail page
- **THEN** the page re-fetches the customer data and displays updated `last_contact_at`
