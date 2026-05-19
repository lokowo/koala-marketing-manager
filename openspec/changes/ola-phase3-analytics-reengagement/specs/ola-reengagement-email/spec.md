## ADDED Requirements

### Requirement: Email template and log tables
The system SHALL create two Supabase tables via migration:

`ola_email_templates`: id (uuid PK), template_key (text UNIQUE), subject_zh, subject_en, body_zh, body_en, trigger_condition (jsonb), enabled (bool default true), created_at.

`ola_email_logs`: id (uuid PK), user_id (uuid), template_key (text), sent_at (timestamptz), opened (bool), clicked (bool).

#### Scenario: Tables exist after migration
- **WHEN** the migration SQL is applied
- **THEN** both tables exist with all specified columns

### Requirement: Seed 5 email templates
The system SHALL provide a seed API at `POST /api/admin/ola-email-templates/seed` that inserts 5 templates: inactive_3d, letter_unsent_7d, deadline_30d, deadline_7d, dormant_30d.

#### Scenario: Seed creates templates
- **WHEN** POST /api/admin/ola-email-templates/seed is called
- **THEN** 5 templates are upserted into ola_email_templates with Chinese and English subject/body

### Requirement: Reengagement email send API
The system SHALL provide `POST /api/ola/send-reengagement` that sends a single reengagement email to a specified user using a specified template.

The API SHALL:
- Look up user email from profiles table
- Select zh/en version based on user language preference
- Send via Resend using the shared getResend() singleton
- Include Ola welcome image in email
- Include unsubscribe link
- Log to ola_email_logs

#### Scenario: Send email successfully
- **WHEN** POST with valid userId and templateKey
- **THEN** email is sent, ola_email_logs entry created, returns 200

#### Scenario: User has no email
- **WHEN** POST with userId whose profile has no email
- **THEN** returns 400 with error "no email"

### Requirement: Cron reengagement check
The system SHALL provide `POST /api/cron/ola-reengagement` that checks all enabled templates' trigger conditions against user data and sends emails.

Rules:
- Each user receives max 1 Ola email per day
- Each template has a 30-day cooldown per user (check ola_email_logs)
- Only process users who have not unsubscribed

#### Scenario: Cron finds eligible users
- **WHEN** cron runs and user matches inactive_3d condition (registered 3+ days ago, no ola_sessions)
- **THEN** email is sent and logged

#### Scenario: Cooldown prevents duplicate
- **WHEN** user already received inactive_3d email 5 days ago
- **THEN** that template is skipped for this user

### Requirement: Admin email management tab
The analytics page's "再激活邮件" tab SHALL display:
- List of 5 templates with enable/disable toggle
- Per-template stats: sent count, open rate, click rate
- "手动触发" button per template (calls send-reengagement for test)

#### Scenario: Toggle template
- **WHEN** admin toggles a template's enabled switch
- **THEN** ola_email_templates.enabled is updated

#### Scenario: View stats
- **WHEN** admin views the email tab
- **THEN** each template shows sent/opened/clicked counts from ola_email_logs
