# Spec: Chat UX Upgrade

## Quick Actions
- Welcome screen component with OlaAvatar welcome state, 4 action cards
- Cards: 找导师, 写套磁信, 审文书, 模拟面试
- Click sends corresponding message via existing callApi flow
- Shown only when messages.length === 1 (initial welcome only)

## Suggestion Chips
- System prompt directive: include `<suggestions>` tag in replies
- Backend parsing in chat route: regex extract, strip from reply, return as `suggestions` array
- Frontend: render chips below assistant messages, click sends message

## Rating
- DB: rating, rating_comment, rated_at on ola_sessions
- Trigger: 5+ messages + 30s idle, once per session
- UI: 5 stars + optional comment + submit/skip
- API: POST /api/ola/rating { session_id, rating, comment? }

## PDF Export
- Header button with download icon
- API: POST /api/ola/export-pdf { messages }
- @react-pdf/renderer with Koala branding
- Download as ola-chat-YYYY-MM-DD.pdf

## Typewriter
- Simulated reveal: requestAnimationFrame, ~20ms/char
- Typing cursor (blinking |) during reveal
- Rotating thinking messages (6 variants, 3s interval)
