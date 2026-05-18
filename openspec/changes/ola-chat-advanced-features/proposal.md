# Proposal: Ola Chat Advanced Features

## Problem
1. Knowledge chunks with NULL embeddings break RAG search — admin needs a visible "rebuild" button
2. Users can't browse or switch between past conversations — each mode has one flat history
3. File upload exists but doesn't support "attach file to current message" pattern with preview

## Solution
1. **Knowledge backfill button** — Add "重建索引" to admin knowledge page (API already exists)
2. **Session history sidebar** — Collapsible sidebar listing past conversations, with search, load, and new-conversation support
3. **File attachment flow** — Enhance chat input to show attached file preview, send extracted text alongside user message

## Already Implemented (no work needed)
- Voice input: VoiceInputButton + useVoiceInput hook + /api/voice/transcribe
- File upload storage: FileUploadSheet + /api/user/files
- Knowledge backfill API: /api/admin/knowledge/backfill

## Scope
- New APIs: GET /api/ola/sessions, GET /api/ola/sessions/[id]/messages
- New components: ChatHistorySidebar
- Modified: chat page (sidebar integration, file attachment preview)
- Modified: admin knowledge page (add rebuild button)
