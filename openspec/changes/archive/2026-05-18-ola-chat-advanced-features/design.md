# Design: Ola Chat Advanced Features

## Architecture

### Knowledge Admin Button
The backfill API at `/api/admin/knowledge/backfill` already exists. Add a "重建索引" button to the existing admin knowledge page at `app/dashboard/koala/ai-content/knowledge/page.tsx`. Show missing count from stats, button triggers POST to backfill endpoint.

### Session History Sidebar

**Data model**: Use existing `chat_messages` table (per-user, per-mode messages with timestamps). Group by mode to form "sessions". Each mode's messages form one conversation thread.

**API**:
- `GET /api/ola/sessions` — Returns list of modes with message counts and last message time for the authenticated user. Also returns any `ola_sessions` entries that have ratings.
- `GET /api/ola/sessions/[sessionId]/messages` — Returns messages for a specific mode (sessionId = mode name like "path", "chat", etc.)

**Sidebar Component** (`ChatHistorySidebar.tsx`):
- Desktop: 280px left sidebar, collapsible via toggle button
- Mobile: full-screen overlay opened via history icon in chat header
- Lists conversation modes with: title (mode label), last message preview, message count, time
- Current mode highlighted
- "New conversation" button clears current mode's history
- Search bar filters by mode label or message content (client-side)

**Chat page integration**:
- Add sidebar state (open/closed)
- Desktop: flex layout with sidebar + chat area
- Mobile: overlay on top
- History icon button in header to toggle

### File Attachment Flow
Enhance the existing chat input area:
- When user selects a file via FileUploadSheet, show a preview chip above the input bar (filename + size + X button)
- On send: upload file via existing /api/user/files, then include extracted text in the message sent to Claude
- For PDFs: the existing /api/user/profile/parse already extracts text
- For images: pass as description text ("用户上传了图片 [filename]")
- Clear attachment after send

## Component Map
```
app/dashboard/koala/ai-content/knowledge/page.tsx  — add rebuild button
app/koala/components/ola/ChatHistorySidebar.tsx     — NEW sidebar component
app/api/ola/sessions/route.ts                       — NEW session list API
app/api/ola/sessions/[sessionId]/messages/route.ts  — NEW session messages API  
app/koala/chat/page.tsx                             — integrate sidebar + file attachment
```
