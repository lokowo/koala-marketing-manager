## ADDED Requirements

### Requirement: All database tables MUST have RLS enabled
Every table in the Supabase database MUST have Row Level Security enabled. Tables that are only accessed via `supabaseAdmin` (service_role) SHALL have RLS enabled with no policies (deny-all for non-service-role).

#### Scenario: Admin-only table blocks anon access
- **WHEN** a browser Supabase client (anon key) queries `pipeline_runs`
- **THEN** the query returns zero rows (RLS denies all non-service-role access)

#### Scenario: Service role bypasses RLS
- **WHEN** an API route using `supabaseAdmin` queries `pipeline_runs`
- **THEN** the query returns all matching rows (service_role bypasses RLS)

### Requirement: User-scoped tables enforce ownership
Tables that contain per-user data (`ai_conversations`, `outreach_emails`, `user_credits`, `user_achievements`, `daily_tasks`) MUST have RLS policies that restrict authenticated users to rows where `user_id = auth.uid()`.

#### Scenario: User reads own conversations
- **WHEN** user A queries `ai_conversations` via browser Supabase client
- **THEN** only rows where `user_id = auth.uid()` are returned

#### Scenario: User cannot read other users' outreach emails
- **WHEN** user A queries `outreach_emails` via browser Supabase client
- **THEN** only rows where `user_id = auth.uid()` are returned

### Requirement: Write-only tables allow insert of own data
Tables for user-generated records (`feedback`, `user_activity_log`, `outreach_history`) MUST allow `INSERT` where `user_id = auth.uid()` and `SELECT` of own rows only.

#### Scenario: User submits feedback
- **WHEN** user A inserts into `feedback` with `user_id = auth.uid()`
- **THEN** the insert succeeds

#### Scenario: User cannot insert feedback as another user
- **WHEN** user A inserts into `feedback` with `user_id = <userB-id>`
- **THEN** the insert is denied by RLS

### Requirement: Public-read tables allow SELECT only
Tables with public-facing data (`professors`, `grants`, `topics`, `papers`, `content_cards`) MUST allow `SELECT` for the `authenticated` role but deny `INSERT`, `UPDATE`, `DELETE`.

#### Scenario: Authenticated user reads professors
- **WHEN** an authenticated browser client queries `professors`
- **THEN** all professor rows are returned

#### Scenario: Authenticated user cannot modify professors
- **WHEN** an authenticated browser client attempts `UPDATE` on `professors`
- **THEN** the update is denied by RLS

### Requirement: blog_posts RLS restricts writes to service_role
The existing `blog_posts_admin_all` policy with `USING (true)` MUST be replaced. The `authenticated` role SHALL only have `SELECT` access to published posts. All write operations (`INSERT`, `UPDATE`, `DELETE`) SHALL only be possible via `supabaseAdmin` (service_role).

#### Scenario: Browser client reads published blog posts
- **WHEN** an authenticated browser client queries `blog_posts` where `status = 'published'`
- **THEN** published posts are returned

#### Scenario: Browser client cannot delete blog posts
- **WHEN** an authenticated browser client attempts `DELETE` on `blog_posts`
- **THEN** the delete is denied by RLS

#### Scenario: Admin API route manages blog posts
- **WHEN** an API route using `supabaseAdmin` updates a blog post
- **THEN** the update succeeds (service_role bypasses RLS)

### Requirement: Admin-only tables deny all non-service-role access
Tables used exclusively by admin backend code (`sensitive_words`, `knowledge_chunks`, `admin_user_notes`, `ai_repair_log`, `publishing_items`, `pipeline_runs`, `recruitment_posts`, `olive_branches`, `email_verifications`) MUST have RLS enabled with zero policies, so only `supabaseAdmin` can access them.

#### Scenario: Browser client cannot query sensitive_words
- **WHEN** an authenticated browser client queries `sensitive_words`
- **THEN** the query returns zero rows

#### Scenario: API route reads sensitive_words via service_role
- **WHEN** an API route using `supabaseAdmin` queries `sensitive_words`
- **THEN** all matching rows are returned
