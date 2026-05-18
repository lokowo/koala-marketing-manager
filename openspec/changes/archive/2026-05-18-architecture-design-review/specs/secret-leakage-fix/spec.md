## ADDED Requirements

### Requirement: CRON_SECRET must not be exposed to client-side code
The pipeline page (`app/dashboard/koala/pipeline/page.tsx`) MUST NOT reference `NEXT_PUBLIC_CRON_SECRET` or any other secret via a `NEXT_PUBLIC_` prefixed environment variable. Instead, it SHALL call a new server-side API route `/api/admin/trigger-sync` that:
1. Calls `requireAdmin()` to verify the caller is an admin
2. Internally reads `CRON_SECRET` (server-only env var) and forwards the request to the cron sync endpoint
3. Returns the sync result to the client

#### Scenario: Pipeline page triggers sync via server proxy
- **WHEN** an admin clicks the sync button on the pipeline page
- **THEN** the page calls `POST /api/admin/trigger-sync` (no secret in the request)
- **THEN** the server reads `CRON_SECRET` from env and calls the sync endpoint internally
- **THEN** the sync result is returned to the page

#### Scenario: Unauthenticated trigger-sync request is rejected
- **WHEN** an unauthenticated user calls `POST /api/admin/trigger-sync`
- **THEN** the API returns 403 with `{ error: 'Forbidden' }`

#### Scenario: Client bundle does not contain CRON_SECRET
- **WHEN** the application is built for production
- **THEN** the string `NEXT_PUBLIC_CRON_SECRET` does not appear in any client-side JavaScript bundle

### Requirement: Professor portal verify uses correct domain
The error message in `/api/professor-portal/verify/route.ts` MUST use `info@koalaphd.com` instead of `info@koalastudy.net`.

#### Scenario: Professor verification failure shows correct email
- **WHEN** a professor submits an unrecognized email to the verify endpoint
- **THEN** the error message references `info@koalaphd.com`
