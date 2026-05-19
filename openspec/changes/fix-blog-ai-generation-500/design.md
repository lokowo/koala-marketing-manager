## Context

20+ API routes use Upstash Redis rate limiters that fail-closed — Redis token expired → `.limit()` throws → uncaught → 500. Stripe checkout has a separate Stripe SDK error.

## Goals / Non-Goals

**Goals:**
- Rate limiters fail-open (Redis down = skip limiting, not kill request)
- Stripe checkout returns actionable error messages
- Blog generate routes have adequate Vercel timeouts

**Non-Goals:**
- Fix Upstash Redis token (env var issue, handled outside code)
- Refactor rate limiting architecture
- Change rate limit thresholds

## Decisions

### D1: safeLimit wrapper in ratelimit.ts
Single wrapper function that catches Redis errors and returns `true` (allow). All routes switch to this. Avoids changing 20+ files' error handling individually.

### D2: Stripe error classification
Parse Stripe error message string to return specific user-facing messages instead of generic 500.
