# Proposal: Ola Chat UX Upgrade

## Problem
The Ola AI chat experience lacks polish in four areas: (1) new users see a plain welcome message with no guidance, (2) there's no way to rate conversations, (3) users can't export chat/email PDFs, (4) AI replies appear instantly which feels unnatural.

## Solution
Four targeted upgrades:
1. **Quick Actions** — Welcome screen with 4 action cards + AI-driven suggestion chips via `<suggestions>` tag parsing
2. **Chat Rating** — 5-star rating prompt after 5+ messages, stored in `ola_sessions`, viewable in Admin
3. **PDF Export** — Full conversation + individual email/review card export using `@react-pdf/renderer`
4. **Typewriter Effect** — Simulated character-by-character reveal with rotating thinking messages

## Scope
- Frontend: chat page (`app/koala/chat/page.tsx`), new components
- Backend: chat route `<suggestions>` parsing, rating API, PDF generation API
- Database: 3 new columns on `ola_sessions` (rating, rating_comment, rated_at)
- Admin: rating analytics section on existing dashboard

## Out of Scope
- Real SSE streaming (too complex for current architecture; simulated typewriter achieves same UX)
- Individual email card PDF export (defer — full conversation export covers the need)
