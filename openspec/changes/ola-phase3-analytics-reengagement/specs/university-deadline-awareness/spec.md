## ADDED Requirements

### Requirement: University deadlines table
The system SHALL create a Supabase table via migration:

`university_deadlines`: id (uuid PK), university (text), program_type (text default 'PhD'), intake_period (text), deadline_date (date), scholarship_deadline (date nullable), description (text nullable), year (integer), created_at (timestamptz).

#### Scenario: Table exists after migration
- **WHEN** the migration SQL is applied
- **THEN** university_deadlines table exists with all specified columns

### Requirement: Seed Go8 deadlines
The system SHALL provide `POST /api/admin/university-deadlines/seed` that inserts 9 Go8 university deadline records for 2026-2027.

#### Scenario: Seed creates deadlines
- **WHEN** POST /api/admin/university-deadlines/seed is called
- **THEN** 9 records are upserted (Sydney ×2, Melbourne, UNSW, ANU, UQ, Monash, UWA, Adelaide)

### Requirement: Deadline injection into Ola chat
When building the Ola system prompt, if the user's collected_data contains target_universities, the system SHALL query university_deadlines for those universities and inject deadline context into the prompt.

Format: "用户目标大学截止日：{University} {intake} → {date}（还有 {N} 天）"

#### Scenario: User has target universities with upcoming deadlines
- **WHEN** user's collected_data.target_universities includes "University of Sydney" and a deadline exists
- **THEN** the system prompt includes the deadline with days remaining

#### Scenario: No target universities
- **WHEN** user has no target_universities in collected_data
- **THEN** no deadline context is injected

### Requirement: Deadline trigger rules
The system SHALL seed 2 trigger rules into ola_triggers:
- `deadline_approaching_30d`: fires when user's target university deadline is within 30 days
- `deadline_approaching_7d`: fires when within 7 days (higher priority)

#### Scenario: 30-day trigger fires
- **WHEN** user visits any page and their target university deadline is 25 days away
- **THEN** Ola bubble appears with deadline reminder message

### Requirement: Admin deadline CRUD
The system SHALL provide:
- `GET /api/admin/university-deadlines` — list all deadlines
- `POST /api/admin/university-deadlines` — create a deadline
- `PUT /api/admin/university-deadlines/[id]` — update
- `DELETE /api/admin/university-deadlines/[id]` — delete

And a management page or section in the admin dashboard.

#### Scenario: Admin adds a deadline
- **WHEN** admin POSTs a new deadline record
- **THEN** it appears in the deadlines list and is available for prompt injection

#### Scenario: Admin deletes an outdated deadline
- **WHEN** admin DELETEs a deadline
- **THEN** it is removed and no longer injected into prompts
