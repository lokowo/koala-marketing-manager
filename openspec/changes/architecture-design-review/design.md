## Context

The Koala PhD platform has ~90 API routes under `app/api/`. About 60 use auth helpers from `app/lib/auth.ts` (`getServerUser`, `requireAdmin`, `requireSuperAdmin`, `getUserRole`). The remaining ~30 have no authentication at all — including admin endpoints that expose user PII and AI generation endpoints that burn paid API credits.

All API routes use `supabaseAdmin` (service_role key), which bypasses RLS. This means RLS policies only protect against direct Supabase client access (anon key from browser). Currently 22+ tables have no RLS enabled at all, and `blog_posts` has a `USING (true)` policy that grants everyone full access.

The auth helpers throw errors on failure:
- `requireAdmin()` → throws if not logged in or role not in `['super_admin', 'admin']`
- `requireSuperAdmin()` → throws if role ≠ `super_admin`
- `getServerUser()` → returns `User | null`

Existing pattern in protected routes (e.g. `app/api/admin/banners/route.ts`):
```typescript
const user = await getServerUser();
if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
```

Or for admin-only routes (e.g. `app/api/admin/roles/route.ts`):
```typescript
try { await requireAdmin(); } catch { return Response.json({ error: 'Forbidden' }, { status: 403 }); }
```

## Goals / Non-Goals

**Goals:**
- Add authentication to all ~30 unprotected API routes using existing auth helpers
- Add RLS policies to 22 unprotected tables as defense-in-depth
- Fix the overly permissive `blog_posts` RLS policy
- Add HTTP security headers via `next.config.ts`
- Remove `NEXT_PUBLIC_CRON_SECRET` from client code
- Fix 2 state management bugs (KPI save, customer contact log)

**Non-Goals:**
- Migrating from `supabaseAdmin` to per-user Supabase clients in API routes (would be a much larger refactor; `supabaseAdmin` + API-level auth is an acceptable pattern)
- Adding rate limiting to API routes (important but separate concern)
- Rewriting the auth system (the existing `app/lib/auth.ts` helpers work well)
- Changing the `x-user-id` pattern in outreach routes to full session auth (mark as follow-up — requires frontend changes)

## Decisions

### 1. Auth guard selection per route category

| Route category | Guard | Rationale |
|---|---|---|
| `/api/admin/*` (analytics, stats, search, quality, knowledge-stats) | `requireAdmin()` | Admin dashboard data, consistent with other admin routes |
| `/api/blog/generate-*`, `batch-generate`, `ai-assist`, `insert-images`, `regenerate-all-covers` | `requireAdmin()` | These burn Anthropic/OpenAI credits and write to DB |
| `/api/grants` POST/PUT/DELETE | `requireAdmin()` | Write operations on research grants |
| `/api/publishing` POST | `requireAdmin()` | Write operations on publishing records |
| `/api/professors/auto-search`, `web-search` | `requireAdmin()` | Burns Anthropic credits, writes candidates to DB |
| `/api/professors/[id]/interactions`, `repair-log` | `requireAdmin()` | Internal admin data |
| `/api/chat-history` | `getServerUser()` + enforce `userId === user.id` | IDOR fix — users can only read their own history |
| `/api/user/dashboard` | `getServerUser()` + enforce `userId === user.id` | IDOR fix — users can only read their own dashboard |
| `/api/outreach/generate`, `status`, `batch-generate` | `getServerUser()` | User-facing but must be authenticated |
| `/api/report/generate` | `getServerUser()` | User-facing, burns Anthropic credits |
| `/api/voice/transcribe` | `getServerUser()` | User-facing, burns OpenAI Whisper credits |
| `/api/ai/feedback`, `export` | `getServerUser()` | User-facing write operations |
| `/api/outreach/send`, `credits` | Keep `x-user-id` for now | **Non-goal** — requires frontend refactor; document as tech debt |

**Alternative considered**: Creating a middleware-based auth layer. Rejected because the route-level pattern is already established across 60+ routes, and middleware can't distinguish between public and protected routes without a route manifest.

### 2. RLS policy strategy

All 22 tables get: `ALTER TABLE <table> ENABLE ROW LEVEL SECURITY;` with a restrictive default (no policies = deny all for anon/authenticated roles). Then add specific policies only where direct browser-client access is needed:

- `user_profiles`, `saved_professors`: Already have RLS + user-scoped policies
- `professors`, `grants`, `topics`, `papers`, `blog_posts`, `content_cards`: Read-only for `authenticated` role (`SELECT` only)
- `ai_conversations`, `outreach_emails`, `user_credits`, `user_achievements`, `daily_tasks`: User-scoped (`auth.uid() = user_id`)
- `feedback`, `user_activity_log`, `outreach_history`: Insert-only for own data
- Admin tables (`pipeline_runs`, `sensitive_words`, `knowledge_chunks`, `admin_user_notes`, `ai_repair_log`, `publishing_items`, `recruitment_posts`, `olive_branches`, `email_verifications`): No policies → only `supabaseAdmin` (service_role) can access

**Key invariant**: `supabaseAdmin` uses `service_role` key which always bypasses RLS. All API routes use `supabaseAdmin`, so the RLS changes won't break any server-side code. RLS only affects direct PostgREST calls from the browser Supabase client.

Fix `blog_posts`: Replace `FOR ALL USING (true)` with `FOR SELECT USING (status = 'published')` for authenticated role.

### 3. Security headers approach

Add headers via `next.config.ts` `headers()` function rather than middleware, because:
- It's declarative and doesn't add runtime overhead
- Applies to all responses including static assets
- Easier to audit

Headers to add:
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `X-DNS-Prefetch-Control: on`
- `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`

CSP deferred as non-goal — requires auditing all inline scripts and third-party resources first.

### 4. Pipeline secret fix

Replace `NEXT_PUBLIC_CRON_SECRET` in `app/dashboard/koala/pipeline/page.tsx` with a new server-side API route `/api/admin/trigger-sync` that:
1. Calls `requireAdmin()`
2. Internally calls the cron sync endpoint with the server-side `CRON_SECRET`

This removes the secret from client-side code entirely.

## Risks / Trade-offs

**[RLS breaks existing queries]** → Mitigation: All API routes use `supabaseAdmin` (service_role) which bypasses RLS. Only browser-client Supabase calls are affected. Verify no dashboard pages use the anon client for admin data.

**[Auth guards break legitimate unauthenticated access]** → Mitigation: Intentionally public routes are excluded from the fix list: `/api/surveys/public/*`, `/api/auth/*`, `/api/s/*`, `/api/banners` GET, `/api/niv/assess`. Blog read endpoints (`/api/blog` GET, `/api/blog/[id]` GET) already have auth and will continue to work.

**[Migration file conflicts]** → Mitigation: Single migration file with `IF NOT EXISTS` guards on policies. Use `DROP POLICY IF EXISTS` before `CREATE POLICY` for the blog_posts fix.

## Open Questions

1. Should `/api/outreach/send` and `/api/outreach/credits` be migrated from `x-user-id` header to session auth now or as a follow-up? (Marked as non-goal for this change, but it's a real vulnerability.)
2. Should CSP headers be included now or deferred? (Deferred — requires full audit of inline scripts and third-party resources.)
