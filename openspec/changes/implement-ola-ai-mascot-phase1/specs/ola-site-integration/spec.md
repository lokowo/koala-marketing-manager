## ADDED Requirements

### Requirement: AI chat avatar replacement
In `app/koala/chat/page.tsx`, all instances of `KoalaAvatar` used for AI message avatars SHALL be replaced with `OlaAvatar` in `welcome` state at `sm` size.

The import SHALL change from `KoalaAvatar` to `OlaAvatar` from `../components/ola/OlaAvatar`. The `UserAvatar` import SHALL remain unchanged.

#### Scenario: AI message displays Ola avatar
- **WHEN** an AI message is rendered in the chat
- **THEN** the avatar next to the message is OlaAvatar (welcome, 32px) instead of the old KoalaAvatar

### Requirement: AI chat loading state replacement
In `app/koala/chat/page.tsx`, the loading indicator shown while AI is generating a response SHALL display OlaAvatar in `thinking` state with animated text.

The existing loading block (KoalaAvatar + "正在思考中…" text) SHALL be replaced with OlaAvatar thinking state + "小欧正在思考…" text.

#### Scenario: Loading state shows Ola thinking
- **WHEN** the AI is generating a response (loading === true)
- **THEN** the loading indicator shows OlaAvatar (thinking, sm) with "小欧正在思考…" or "🔬 正在检索论文…" (for research mode)

### Requirement: AI chat header update
In `app/koala/chat/page.tsx`, the chat header SHALL be updated:
- The PawPrint icon in the header circle SHALL be replaced with OlaAvatar (welcome, sm)
- "Koala PhD" text SHALL change to "Ola AI"
- "考拉学长 · 在线" subtitle SHALL change to "小欧 · 在线"

#### Scenario: Chat header displays Ola branding
- **WHEN** the chat page is loaded
- **THEN** the header shows OlaAvatar, "Ola AI" title, and "小欧 · 在线" subtitle

### Requirement: Navigation bar update
In `app/koala/components/TopNavBar.tsx`, the "Koala AI" navigation item SHALL be updated:
- Label text SHALL change from "Koala AI" to "Ola AI"
- An OlaAvatar (welcome, sm) SHALL be displayed before the text in the highlighted button

#### Scenario: Desktop nav shows Ola AI
- **WHEN** the desktop navigation bar is rendered
- **THEN** the highlighted nav item shows OlaAvatar + "Ola AI" text

### Requirement: Professor search empty state
In `app/koala/professors/ProfessorsClient.tsx`, the empty search results UI SHALL be replaced with OlaEmpty component:
- message: "暂无匹配数据，尝试调整筛选条件或搜索教授名字"
- actionLabel: "浏览全部"
- actionHref: "/koala/professors"

#### Scenario: Professor search returns no results
- **WHEN** a professor search yields no matches
- **THEN** OlaEmpty is displayed with Ola sleepy avatar, the message, and a "浏览全部" button

### Requirement: Matches page empty states
In `app/koala/matches/page.tsx`, the existing `EmptyState` component usages SHALL be replaced with `OlaEmpty`:
- Saved professors empty: message "还没有收藏的教授", actionLabel "去发现", actionHref "/koala/discover"
- Sent emails empty: message "还没有生成申请信", actionLabel "去写申请信", actionHref "/koala/chat"
- Other empty states in the file SHALL also use OlaEmpty

#### Scenario: No saved professors
- **WHEN** user has no saved professors and views the saved tab
- **THEN** OlaEmpty is displayed with sleepy Ola and "还没有收藏的教授" message

#### Scenario: No sent emails
- **WHEN** user has no sent emails and views the sent tab
- **THEN** OlaEmpty is displayed with sleepy Ola and "还没有生成申请信" message

### Requirement: Blog empty state
In `app/koala/blog/page.tsx`, the empty/no-results state SHALL use OlaEmpty when no articles are found.

#### Scenario: Blog search returns no articles
- **WHEN** a blog search yields no results
- **THEN** OlaEmpty is displayed with appropriate message

### Requirement: 404 Not Found page
The system SHALL provide a `app/not-found.tsx` page using OlaEmpty:
- message: "这个页面走丢了..."
- actionLabel: "回首页"
- actionHref: "/koala/home"

#### Scenario: User visits non-existent route
- **WHEN** a user navigates to a route that does not exist
- **THEN** the 404 page displays OlaEmpty with sleepy Ola and a link back to home

### Requirement: Welcome message update
In `app/koala/chat/page.tsx`, the welcome messages for each AI mode SHALL remain as-is (mode-specific), but the chat header subtitle SHALL reference Ola persona.

The existing mode welcome messages are already well-crafted and mode-specific. They SHALL NOT be replaced with a generic Ola greeting.

#### Scenario: Mode welcome messages preserved
- **WHEN** user switches to any AI mode
- **THEN** the mode-specific welcome message is displayed (unchanged from current)
