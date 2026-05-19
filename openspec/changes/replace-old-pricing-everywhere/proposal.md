## Why

The `/koala/pricing` page has been fully integrated with Stripe, but other pages (`/koala/tools`, home, professor detail, chat) still display legacy pricing (single email AUD 1, 10/30/100 packs) with non-functional purchase buttons. This creates a broken user experience and pricing inconsistency.

## What Changes

- Replace legacy credit package display (单封/10封包/30封包/100封包) with new Stripe-backed packages (入门包/标准包/专业包/旗舰包) across all pages
- Wire all purchase buttons to POST `/api/stripe/checkout` using env-based Price IDs
- Wire subscription "立即订阅" buttons to the same checkout flow
- Update pricing text references (AUD 1/封, A$0.01/封 etc.) to match new pricing
- Reorder tools page: subscriptions above credit packs

## Capabilities

### New Capabilities
_None — this is a UI consistency fix, not a new capability._

### Modified Capabilities
_None — no spec-level requirement changes, only UI alignment._

## Impact

- **Files**: `app/koala/tools/page.tsx`, `app/koala/home/HomeClient.tsx`, `app/koala/professors/[id]/ProfessorDetailClient.tsx`, `app/koala/chat/page.tsx`, `app/lib/eval/test-ai-chat.ts`
- **No backend changes** — `/api/stripe/checkout` route remains untouched
- **No database changes**
