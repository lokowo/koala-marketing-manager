# Design: Ola Chat UX Upgrade

## Architecture

### Feature 1: Quick Actions + Suggestion Chips

**Welcome Screen**: Replace the initial text-only welcome message with a rich welcome component containing OlaAvatar (welcome state, 80px), title, subtitle, and 4 quick-action cards. When user has no messages (only the initial welcome), show this instead of the text bubble.

**Suggestion Chips**: Add `<suggestions>` directive to system prompt. Backend parses `<suggestions>建议1|建议2|建议3</suggestions>` from Claude reply, strips the tag, returns suggestions array in response JSON. Frontend renders as clickable chips below each AI message.

**Data flow**: System prompt addition → Claude includes `<suggestions>` → `cleanReply()` strips tag + extracts array → response JSON `suggestions` field → chat page renders chips.

### Feature 2: Chat Rating

**Database**: Add 3 columns to `ola_sessions`: `rating integer CHECK (rating >= 1 AND rating <= 5)`, `rating_comment text`, `rated_at timestamptz`.

**Component** (`OlaRatingPrompt.tsx`): Slide-up card triggered after 5+ messages and 30s idle. Shows 5 stars, optional comment input, submit/skip. Same session only shows once (tracked via ref). On submit, POST to `/api/ola/rating`.

**API** (`/api/ola/rating`): Updates `ola_sessions` with rating, comment, timestamp. Matches by session_id.

**Admin**: New section on existing analytics page showing average rating, distribution bar chart, recent low-rating list.

### Feature 3: PDF Export

**Button**: Download icon in chat header bar (next to settings gear).

**API** (`/api/ola/export-pdf`): POST with `{ messages }` array. Server-side renders PDF using `@react-pdf/renderer` with Koala branding (title, date, user/assistant message blocks with different styling, footer with logo+URL).

**Frontend**: Click → loading state → fetch PDF blob → trigger browser download as `ola-chat-YYYY-MM-DD.pdf`.

### Feature 4: Typewriter Effect

**Approach**: Simulated typewriter (not real SSE streaming). When assistant message arrives, reveal characters progressively using `requestAnimationFrame` at ~20ms/char.

**Thinking State**: Replace simple "小欧正在思考…" with rotating messages every 3 seconds from a pool of 6 messages. Use the existing OlaAvatar thinking state.

## Component Map

```
app/koala/chat/page.tsx          — integrate welcome, suggestions, rating, typewriter, export
app/koala/components/ola/
  OlaWelcome.tsx                 — welcome screen with quick actions (NEW)
  OlaRatingPrompt.tsx            — rating slide-up card (NEW)
app/api/ola/rating/route.ts      — POST rating (NEW)
app/api/ola/export-pdf/route.ts  — POST generate PDF (NEW)
app/api/ai/chat/route.ts         — add <suggestions> parsing + system prompt directive
```
