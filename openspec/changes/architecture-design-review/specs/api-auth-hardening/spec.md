## ADDED Requirements

### Requirement: Admin analytics routes require admin authentication
All admin data-reading routes under `/api/admin/` that currently lack auth MUST call `requireAdmin()` and return 403 if the caller is not an admin or super_admin.

Affected routes: `/api/admin/analytics`, `/api/admin/stats`, `/api/admin/stats/trend`, `/api/admin/quality`, `/api/admin/knowledge-stats`, `/api/admin/search`.

#### Scenario: Unauthenticated request to admin analytics
- **WHEN** an unauthenticated user calls `GET /api/admin/analytics`
- **THEN** the API returns 403 with `{ error: 'Forbidden' }`

#### Scenario: Authenticated admin request to admin analytics
- **WHEN** an admin user calls `GET /api/admin/analytics`
- **THEN** the API returns 200 with analytics data as before

#### Scenario: Authenticated sales user request to admin search
- **WHEN** a sales-role user calls `GET /api/admin/search?q=test`
- **THEN** the API returns 403 with `{ error: 'Forbidden' }`

### Requirement: Blog generation routes require admin authentication
All blog content generation routes that call Anthropic/OpenAI APIs MUST call `requireAdmin()` and return 403 if unauthorized.

Affected routes: `/api/blog/ai-assist`, `/api/blog/batch-generate`, `/api/blog/generate-cover`, `/api/blog/generate-illustration-candidates`, `/api/blog/generate-images`, `/api/blog/generate-single-image`, `/api/blog/insert-images`, `/api/blog/regenerate-all-covers`.

#### Scenario: Unauthenticated request to blog generation
- **WHEN** an unauthenticated user calls `POST /api/blog/batch-generate`
- **THEN** the API returns 403 with `{ error: 'Forbidden' }`

#### Scenario: Admin generates blog content
- **WHEN** an admin calls `POST /api/blog/ai-assist` with valid body
- **THEN** the API processes the request normally

### Requirement: Professor admin routes require admin authentication
Routes that write professor data or call AI APIs for professor enrichment MUST call `requireAdmin()`.

Affected routes: `/api/professors/auto-search`, `/api/professors/web-search`, `/api/professors/[id]/interactions`, `/api/professors/[id]/repair-log`.

#### Scenario: Unauthenticated request to auto-search
- **WHEN** an unauthenticated user calls `GET /api/professors/auto-search?q=machine+learning`
- **THEN** the API returns 403 with `{ error: 'Forbidden' }`

### Requirement: Grants write operations require admin authentication
`POST`, `PUT`, and `DELETE` on `/api/grants` and `/api/grants/[id]` MUST call `requireAdmin()`.

`GET` on `/api/grants` and `/api/grants/[id]` MAY remain public (professor data is public-facing).

#### Scenario: Unauthenticated POST to grants
- **WHEN** an unauthenticated user calls `POST /api/grants` with a grant body
- **THEN** the API returns 403 with `{ error: 'Forbidden' }`

#### Scenario: Unauthenticated GET on grants
- **WHEN** any user calls `GET /api/grants`
- **THEN** the API returns 200 with grants data (public read is allowed)

### Requirement: Publishing write operations require admin authentication
`POST` on `/api/publishing` MUST call `requireAdmin()`.

#### Scenario: Unauthenticated POST to publishing
- **WHEN** an unauthenticated user calls `POST /api/publishing`
- **THEN** the API returns 403 with `{ error: 'Forbidden' }`

### Requirement: Chat history enforces user-scoped access
`GET` and `POST` on `/api/chat-history` MUST call `getServerUser()` and enforce that the `userId` parameter matches the authenticated user's ID. Users SHALL NOT read or write another user's chat history.

#### Scenario: Unauthenticated request to chat history
- **WHEN** an unauthenticated user calls `GET /api/chat-history?userId=xxx`
- **THEN** the API returns 401 with `{ error: 'Unauthorized' }`

#### Scenario: User tries to read another user's chat history
- **WHEN** user A calls `GET /api/chat-history?userId=<userB-id>`
- **THEN** the API returns 403 with `{ error: 'Forbidden' }`

#### Scenario: User reads their own chat history
- **WHEN** user A calls `GET /api/chat-history?userId=<userA-id>`
- **THEN** the API returns 200 with user A's chat history

### Requirement: User dashboard enforces user-scoped access
`GET` on `/api/user/dashboard` MUST call `getServerUser()` and enforce that the `userId` parameter matches the authenticated user's ID.

#### Scenario: Unauthenticated request to user dashboard
- **WHEN** an unauthenticated user calls `GET /api/user/dashboard?userId=xxx`
- **THEN** the API returns 401 with `{ error: 'Unauthorized' }`

#### Scenario: User tries to read another user's dashboard
- **WHEN** user A calls `GET /api/user/dashboard?userId=<userB-id>`
- **THEN** the API returns 403 with `{ error: 'Forbidden' }`

### Requirement: AI-spending user routes require authentication
Routes that call paid AI APIs on behalf of users MUST call `getServerUser()`.

Affected routes: `/api/outreach/generate`, `/api/outreach/status`, `/api/outreach/batch-generate`, `/api/report/generate`, `/api/voice/transcribe`.

#### Scenario: Unauthenticated request to generate outreach
- **WHEN** an unauthenticated user calls `POST /api/outreach/generate`
- **THEN** the API returns 401 with `{ error: 'Unauthorized' }`

#### Scenario: Authenticated user generates outreach email
- **WHEN** an authenticated user calls `POST /api/outreach/generate` with valid body
- **THEN** the API processes the request normally

### Requirement: AI feedback and export require authentication
`POST` on `/api/ai/feedback` and `/api/ai/export` MUST call `getServerUser()`.

#### Scenario: Unauthenticated feedback submission
- **WHEN** an unauthenticated user calls `POST /api/ai/feedback`
- **THEN** the API returns 401 with `{ error: 'Unauthorized' }`
