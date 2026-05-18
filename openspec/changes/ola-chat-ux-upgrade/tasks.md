# Tasks: Ola Chat UX Upgrade

## Feature 1: Quick Actions + Suggestions
- [x] 1.1 Create OlaWelcome.tsx component with 4 quick action cards
- [x] 1.2 Integrate OlaWelcome into chat page (replace initial welcome text)
- [x] 1.3 Add `<suggestions>` directive to system prompt in chat route
- [x] 1.4 Parse `<suggestions>` tag in chat route, return as `suggestions` field
- [x] 1.5 Render suggestion chips in chat page from API response

## Feature 2: Chat Rating
- [x] 2.1 Add rating columns to ola_sessions (DB migration)
- [x] 2.2 Create POST /api/ola/rating endpoint
- [x] 2.3 Create OlaRatingPrompt.tsx component
- [x] 2.4 Integrate rating prompt into chat page (trigger after 5+ messages, 30s idle)

## Feature 3: PDF Export
- [x] 3.1 Create POST /api/ola/export-pdf endpoint with @react-pdf/renderer
- [x] 3.2 Add export button to chat header + frontend download logic

## Feature 4: Typewriter Effect
- [x] 4.1 Add typewriter reveal hook/logic for assistant messages
- [x] 4.2 Implement rotating thinking messages during loading state
