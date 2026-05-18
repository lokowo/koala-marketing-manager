## 1. Admin API Auth Hardening

- [x] 1.1 Add `requireAdmin()` to `/api/admin/analytics/route.ts`
- [x] 1.2 Add `requireAdmin()` to `/api/admin/stats/route.ts`
- [x] 1.3 Add `requireAdmin()` to `/api/admin/stats/trend/route.ts`
- [x] 1.4 Add `requireAdmin()` to `/api/admin/quality/route.ts`
- [x] 1.5 Add `requireAdmin()` to `/api/admin/knowledge-stats/route.ts`
- [x] 1.6 Add `requireAdmin()` to `/api/admin/search/route.ts`

## 2. Blog Generation API Auth Hardening

- [x] 2.1 Add `requireAdmin()` to `/api/blog/ai-assist/route.ts`
- [x] 2.2 Add `requireAdmin()` to `/api/blog/batch-generate/route.ts`
- [x] 2.3 Add `requireAdmin()` to `/api/blog/generate-cover/route.ts`
- [x] 2.4 Add `requireAdmin()` to `/api/blog/generate-illustration-candidates/route.ts`
- [x] 2.5 Add `requireAdmin()` to `/api/blog/generate-images/route.ts`
- [x] 2.6 Add `requireAdmin()` to `/api/blog/generate-single-image/route.ts`
- [x] 2.7 Add `requireAdmin()` to `/api/blog/insert-images/route.ts`
- [x] 2.8 Add `requireAdmin()` to `/api/blog/regenerate-all-covers/route.ts`

## 3. Professor & Grants & Publishing API Auth

- [x] 3.1 Add `requireAdmin()` to `/api/professors/auto-search/route.ts`
- [x] 3.2 Add `requireAdmin()` to `/api/professors/web-search/route.ts`
- [x] 3.3 Add `requireAdmin()` to `/api/professors/[id]/interactions/route.ts`
- [x] 3.4 Add `requireAdmin()` to `/api/professors/[id]/repair-log/route.ts`
- [x] 3.5 Add `requireAdmin()` to POST/PUT/DELETE in `/api/grants/route.ts` and `/api/grants/[id]/route.ts` (keep GET public)
- [x] 3.6 Add `requireAdmin()` to POST in `/api/publishing/route.ts` (keep GET public)

## 4. IDOR Fixes (User-Scoped Routes)

- [x] 4.1 Add `getServerUser()` to `/api/chat-history/route.ts` and enforce `userId === user.id` on both GET and POST
- [x] 4.2 Add `getServerUser()` to `/api/user/dashboard/route.ts` and enforce `userId === user.id`

## 5. AI-Spending User Routes Auth

- [x] 5.1 Add `getServerUser()` to `/api/outreach/generate/route.ts`
- [x] 5.2 Add `getServerUser()` to `/api/outreach/status/route.ts`
- [x] 5.3 Add `getServerUser()` to `/api/outreach/batch-generate/route.ts`
- [x] 5.4 Add `getServerUser()` to `/api/report/generate/route.ts`
- [x] 5.5 Add `getServerUser()` to `/api/voice/transcribe/route.ts`
- [x] 5.6 Add `getServerUser()` to `/api/ai/feedback/route.ts`
- [x] 5.7 Add `getServerUser()` to `/api/ai/export/route.ts`

## 6. RLS Policy Enforcement

- [x] 6.1 Create Supabase migration file with RLS enabled + deny-all for admin-only tables: `pipeline_runs`, `sensitive_words`, `knowledge_chunks`, `admin_user_notes`, `ai_repair_log`, `publishing_items`, `recruitment_posts`, `olive_branches`, `email_verifications`
- [x] 6.2 Add RLS + user-scoped SELECT/INSERT policies for: `ai_conversations`, `outreach_emails`, `user_credits`, `user_achievements`, `daily_tasks`
- [x] 6.3 Add RLS + insert-own-data policies for: `feedback`, `user_activity_log`, `outreach_history`
- [x] 6.4 Add RLS + public SELECT-only policies for: `professors`, `grants`, `topics`, `papers`, `content_cards`
- [x] 6.5 Fix `blog_posts` RLS: drop `blog_posts_admin_all` policy, create SELECT-only policy for published posts

## 7. Security Headers

- [x] 7.1 Add `headers()` function to `next.config.ts` with X-Frame-Options, X-Content-Type-Options, Referrer-Policy, X-DNS-Prefetch-Control, Strict-Transport-Security

## 8. Secret Leakage Fix

- [x] 8.1 Create `/api/admin/trigger-sync/route.ts` that calls `requireAdmin()` then proxies to cron sync with server-side `CRON_SECRET`
- [x] 8.2 Update `app/dashboard/koala/pipeline/page.tsx` to call `/api/admin/trigger-sync` instead of using `NEXT_PUBLIC_CRON_SECRET`

## 9. State Management & Brand Fixes

- [x] 9.1 Add re-fetch after `saveKpi()` in `app/dashboard/koala/kpi-settings/page.tsx`
- [x] 9.2 Add full customer re-fetch after `handleLogContact()` in `app/dashboard/sales/customer/[id]/page.tsx`
- [x] 9.3 Replace `info@koalastudy.net` with `info@koalaphd.com` in `/api/professor-portal/verify/route.ts`

## 10. Verification

- [x] 10.1 Run `npx tsc --noEmit` to verify no type errors
- [x] 10.2 Run `npm run build` to verify build succeeds
