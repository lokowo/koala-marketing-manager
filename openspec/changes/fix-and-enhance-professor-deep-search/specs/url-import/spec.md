## ADDED Requirements

### Requirement: POST /api/professors/import-from-url endpoint
The system SHALL provide an API endpoint that accepts a URL, fetches the page, extracts professor data via Claude Haiku, and saves to the database.

#### Scenario: Valid .edu.au profile URL
- **WHEN** user submits a URL matching *.edu.au domain
- **THEN** the system SHALL fetch the page HTML, extract professor fields via Claude Haiku, dedup against existing records, and insert with verification_status='user_contributed'

#### Scenario: Valid Google Scholar URL
- **WHEN** user submits a URL matching scholar.google.com or scholar.google.com.au
- **THEN** the system SHALL extract name, research areas, h-index, citation count, and paper count

#### Scenario: Non-whitelisted URL is rejected
- **WHEN** user submits a URL not matching any whitelisted domain
- **THEN** the system SHALL return 400 with error message listing accepted domains

#### Scenario: Duplicate professor detected
- **WHEN** extracted name + university matches an existing record in professors table
- **THEN** the system SHALL return the existing professor instead of creating a duplicate

#### Scenario: Unauthenticated request
- **WHEN** request has no valid session
- **THEN** the system SHALL return 401

### Requirement: Domain whitelist validation
The system SHALL only accept URLs from trusted academic domains: *.edu.au, scholar.google.com, scholar.google.com.au, researchgate.net, orcid.org.

#### Scenario: Accepted domains
- **WHEN** URL hostname ends with .edu.au or matches scholar.google.com
- **THEN** validation SHALL pass

#### Scenario: Rejected domain
- **WHEN** URL hostname is weibo.com, facebook.com, or any non-whitelisted domain
- **THEN** validation SHALL fail with descriptive error

### Requirement: Rate limiting
URL import SHALL be rate-limited to 5 requests per user per day.

#### Scenario: Rate limit exceeded
- **WHEN** user has already imported 5 URLs today
- **THEN** the system SHALL return 429 with a message indicating daily limit

### Requirement: Frontend paste-URL UI
The professors search page SHALL display a "paste URL" input when both database search and AI deep search return no results.

#### Scenario: Paste URL card appears after exhausting search options
- **WHEN** database search returns 0 results AND AI deep search returns 0 results
- **THEN** a URL input with "录入" button SHALL appear below the "AI 未找到" message

#### Scenario: Successful import shows result
- **WHEN** user submits a valid URL and extraction succeeds
- **THEN** the newly created professor SHALL appear as a candidate card with option to view details

### Requirement: Credit reward for URL import
User SHALL receive +10 credits for each successful URL import (consistent with existing auto-search reward).

#### Scenario: Credits awarded on success
- **WHEN** URL import creates a new professor record
- **THEN** user SHALL receive 10 credits and see a reward notification

#### Scenario: No credits for duplicate
- **WHEN** URL import finds an existing matching professor
- **THEN** no credits SHALL be awarded
