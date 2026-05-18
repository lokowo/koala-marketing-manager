## 1. Database Tables

- [x] 1.1 Create `ola_faq` table via Supabase migration
- [x] 1.2 Create `ola_sessions` table via Supabase migration
- [x] 1.3 Create `ola_conversation_events` table via Supabase migration

## 2. FAQ Engine

- [x] 2.1 Create `app/lib/ola/ola-faq.ts` — synonym dictionary + keyword tokenizer + matchFAQ function
- [x] 2.2 Create FAQ seed API route `app/api/admin/ola-faq/seed/route.ts` with 15 initial entries
- [x] 2.3 Create FAQ CRUD API `app/api/admin/ola-faq/route.ts` (GET list + POST create) and `app/api/admin/ola-faq/[id]/route.ts` (PUT + DELETE)

## 3. Session & Event Tracking

- [x] 3.1 Create `app/lib/ola/ola-session.ts` — upsertSession (create or increment) + updateSessionStatus
- [x] 3.2 Create `app/lib/ola/ola-events.ts` — recordEvent function for all event types

## 4. Chat Route Integration

- [x] 4.1 Integrate FAQ matching into `app/api/ai/chat/route.ts` — call matchFAQ before LLM, return FAQ answer on hit
- [x] 4.2 Add session tracking to chat route — upsert session on each message
- [x] 4.3 Add event recording to chat route — faq_hit, llm_call, professor_match events
