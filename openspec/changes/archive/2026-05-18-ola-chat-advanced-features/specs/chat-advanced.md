# Spec: Chat Advanced Features

## Knowledge Admin
- Add "重建索引" button to existing knowledge page
- Show missing embedding count
- Call POST /api/admin/knowledge/backfill on click
- Show progress/result

## Session History Sidebar
- GET /api/ola/sessions: list modes with message counts for authenticated user
- ChatHistorySidebar component: collapsible, lists modes, search, new conversation
- Desktop: 280px left sidebar; Mobile: overlay
- Chat page: sidebar toggle, mode switching via sidebar

## File Attachment Preview
- File preview chip above input bar after file selection
- Upload + extract text on send
- Include extracted text in Claude context
- Clear attachment after send
