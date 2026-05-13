## Why

The Koala PhD platform has critical security vulnerabilities: ~30 API routes under `/api/admin/` and `/api/blog/` have **zero authentication**, exposing user PII (emails via `auth.admin.listUsers()`), allowing unauthenticated Anthropic/OpenAI API spending, and enabling IDOR attacks on chat history and user dashboards. Additionally, 22+ database tables lack RLS policies entirely, and the `blog_posts` RLS policy uses `USING (true)` granting anyone full write access. These issues must be fixed before any public launch to prevent data breaches and cost runaway.

## What Changes

### CRITICAL — API Authentication Hardening
- Add `requireAdmin()` / `requireSuperAdmin()` to 6 admin routes: `/api/admin/analytics`, `/api/admin/stats`, `/api/admin/stats/trend`, `/api/admin/quality`, `/api/admin/knowledge-stats`, `/api/admin/search`
- Add `getServerUser()` session auth to IDOR-vulnerable routes: `/api/chat-history`, `/api/user/dashboard` (replace query-param userId with session user)
- Add `requireAdmin()` to all 9 `/api/blog/generate-*` and `/api/blog/batch-generate` routes (these burn Anthropic/OpenAI credits)
- Add `requireAdmin()` to `/api/grants` POST/PUT/DELETE, `/api/publishing` POST, `/api/professors/auto-search`, `/api/professors/web-search`
- Replace spoofable `x-user-id` header in `/api/outreach/send` and `/api/outreach/credits` with `getServerUser()` session auth
- Add `getServerUser()` to `/api/outreach/generate`, `/api/outreach/status`, `/api/report/generate`, `/api/voice/transcribe`

### CRITICAL — Database RLS Enforcement
- Add RLS + restrictive policies to 22 tables currently without any RLS: `professors`, `grants`, `topics`, `content_cards`, `publishing_items`, `pipeline_runs`, `sensitive_words`, `knowledge_chunks`, `ai_conversations`, `feedback`, `user_credits`, `outreach_emails`, `user_achievements`, `daily_tasks`, `user_activity_log`, `outreach_history`, `olive_branches`, `recruitment_posts`, `ai_repair_log`, `papers`, `email_verifications`, `admin_user_notes`
- Replace `blog_posts_admin_all USING (true)` with a proper admin-only policy

### HIGH — Security Headers
- Add CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy headers via `next.config.ts`

### HIGH — Secret Leakage Fix
- Remove `NEXT_PUBLIC_CRON_SECRET` usage in client component (`app/dashboard/koala/pipeline/page.tsx`); route through a server-side API proxy instead

### MEDIUM — Frontend State Management Fixes
- `app/dashboard/koala/kpi-settings/page.tsx`: re-fetch KPI data after `saveKpi()` 
- `app/dashboard/sales/customer/[id]/page.tsx`: re-fetch full customer after `handleLogContact()`

### LOW — Brand Consistency Cleanup
- Replace remaining `koalastudy.net` reference in `/api/professor-portal/verify/route.ts` with BRAND constant

## Capabilities

### New Capabilities
- `api-auth-hardening`: Add authentication guards (requireAdmin, getServerUser, requireSales) to all unprotected API routes. ~30 routes across admin, blog, outreach, professors, grants, publishing, and user-facing endpoints.
- `rls-policy-enforcement`: Add Row Level Security policies to 22 unprotected database tables and fix the overly permissive blog_posts policy. Migration-based approach with restrictive default policies.
- `security-headers`: Configure HTTP security headers (CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy) in next.config.ts.
- `secret-leakage-fix`: Remove NEXT_PUBLIC_CRON_SECRET from client code, create server-side proxy route for pipeline sync trigger.

### Modified Capabilities
- (none — no existing specs to modify)

## Impact

- **API routes**: ~30 route files modified to add auth guards
- **Database**: 1 new migration file adding RLS policies to 22 tables + fixing blog_posts policy
- **Config**: `next.config.ts` updated with security headers
- **Frontend**: 3 files updated (pipeline page, kpi-settings, customer detail) for state management and secret removal
- **Breaking changes**: None — all changes add server-side guards that existing authenticated dashboard users already pass. Unauthenticated external callers (if any exist) will start getting 401s, which is the intended behavior.
- **Risk**: RLS changes could block legitimate service_role queries if policies are too restrictive. Must ensure `supabaseAdmin` (service_role) bypasses RLS as designed.
