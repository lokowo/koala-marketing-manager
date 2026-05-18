## 1. Database Tables

- [x] 1.1 Create `ola_triggers` + `ola_trigger_logs` tables via Supabase migration
- [x] 1.2 Create `handoff_requests` table via Supabase migration
- [x] 1.3 Create `ola_milestones` + `user_milestones` tables via Supabase migration

## 2. Trigger System

- [x] 2.1 Create trigger seed API `app/api/admin/ola-triggers/seed/route.ts` with 10 trigger rules
- [x] 2.2 Create trigger CRUD API `app/api/admin/ola-triggers/route.ts` (GET list + POST create) and `[id]/route.ts` (PUT + DELETE)
- [x] 2.3 Create public trigger API `app/api/ola/triggers/route.ts` (GET by page) and `app/api/ola/trigger-log/route.ts` (POST log)
- [x] 2.4 Create `app/koala/components/ola/OlaProactiveBubble.tsx` — speech bubble with avatar, message, CTA, close, auto-collapse
- [x] 2.5 Create `app/koala/components/ola/OlaTriggerEngine.tsx` — route listener, condition evaluator, frequency limiter, bubble orchestrator
- [x] 2.6 Integrate OlaTriggerEngine into KoalaShell.tsx

## 3. Handoff

- [x] 3.1 Create handoff API `app/api/ola/handoff/route.ts` — insert DB record + send Resend email notification
- [x] 3.2 Create `app/koala/components/ola/OlaHandoffCard.tsx` — WeChat QR, consultation link, contact email

## 4. Milestones

- [x] 4.1 Create milestone seed API `app/api/admin/ola-milestones/seed/route.ts` with 7 milestones
- [x] 4.2 Create `app/lib/ola/ola-milestones.ts` — checkMilestone() function (detect + insert + award credits)
- [x] 4.3 Create `app/koala/components/ola/OlaCelebration.tsx` — full-screen celebration overlay with confetti
- [x] 4.4 Add achievements section to `app/koala/my-profile/page.tsx`

## 5. Admin Pages

- [x] 5.1 Add "Ola 触发" and "Handoff 队列" entries to admin sidebar
- [x] 5.2 Create admin triggers management page `app/dashboard/koala/ola-triggers/page.tsx`
- [x] 5.3 Create admin handoff queue page `app/dashboard/koala/handoff/page.tsx`
