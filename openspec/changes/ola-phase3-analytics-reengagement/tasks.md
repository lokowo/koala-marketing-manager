## 1. Database Migrations

- [ ] 1.1 Create migration SQL for `ola_email_templates` table and apply via Supabase MCP
- [ ] 1.2 Create migration SQL for `ola_email_logs` table and apply via Supabase MCP
- [ ] 1.3 Create migration SQL for `university_deadlines` table and apply via Supabase MCP

## 2. Seed Data APIs

- [ ] 2.1 Create `POST /api/admin/ola-email-templates/seed` — upsert 5 reengagement email templates
- [ ] 2.2 Create `POST /api/admin/university-deadlines/seed` — upsert 9 Go8 deadline records for 2026-2027

## 3. Analytics API

- [ ] 3.1 Create `GET /api/admin/ola-analytics` with section param (kpi, funnel, ratings, triggers) — aggregates from ola_sessions, ola_trigger_logs

## 4. Reengagement Email System

- [ ] 4.1 Create `POST /api/ola/send-reengagement` — send single email via Resend, log to ola_email_logs
- [ ] 4.2 Create `POST /api/cron/ola-reengagement` — check trigger conditions, respect cooldowns, send eligible emails
- [ ] 4.3 Create `GET/PATCH /api/admin/ola-email-templates` — list templates + toggle enabled

## 5. University Deadlines

- [ ] 5.1 Create `GET/POST/PUT/DELETE /api/admin/university-deadlines` CRUD routes
- [ ] 5.2 Integrate deadline context into Ola chat system prompt (query user's target universities, inject deadline countdown)
- [ ] 5.3 Seed 2 deadline trigger rules into ola_triggers (deadline_approaching_30d, deadline_approaching_7d)

## 6. Admin Dashboard Page

- [ ] 6.1 Add "Ola 分析" to admin sidebar in layout.tsx
- [ ] 6.2 Create `/dashboard/koala/ola-analytics/page.tsx` with 3 tabs (概览, 详情, 再激活邮件)
- [ ] 6.3 Implement 概览 tab: 4 KPI cards + funnel chart + rating distribution (CSS-only)
- [ ] 6.4 Implement 详情 tab: trigger effectiveness table + placeholder for Tool stats and knowledge gaps
- [ ] 6.5 Implement 再激活邮件 tab: template list with enable/disable toggles, stats, manual trigger button

## 7. Verification

- [ ] 7.1 Run seed APIs (email templates + deadlines)
- [ ] 7.2 Verify analytics page loads with all 3 tabs
- [ ] 7.3 Run `npm run build` to confirm no compilation errors
