## ADDED Requirements

### Requirement: Survey overview endpoint returns all-survey summary
The system SHALL provide `GET /api/admin/survey-overview` that returns a summary of all surveys with per-survey metrics.

Response shape:
```json
{
  "summary": {
    "total_surveys": 5,
    "active_surveys": 3,
    "ended_surveys": 2,
    "total_valid_responses": 120,
    "total_registrations": 30,
    "active_sales_count": 4
  },
  "surveys": [
    {
      "id": "uuid",
      "title": "PhD意向调研",
      "status": "active",
      "total_scans": 45,
      "total_responses": 30,
      "valid_responses": 25,
      "invalid_responses": 5,
      "completion_rate": 0.83,
      "registrations": 8,
      "registration_rate": 0.32,
      "sales_count": 3
    }
  ]
}
```

#### Scenario: Super admin fetches overview
- **WHEN** a super_admin user calls `GET /api/admin/survey-overview` with no query params
- **THEN** the system returns summary cards and per-survey row data with all metrics

#### Scenario: Admin fetches overview
- **WHEN** an admin user calls `GET /api/admin/survey-overview` with no query params
- **THEN** the system returns the same summary and survey rows but with `sales_count` omitted

#### Scenario: Non-admin user denied
- **WHEN** a sales or viewer user calls `GET /api/admin/survey-overview`
- **THEN** the system returns 403 Forbidden

### Requirement: Valid response definition
A survey response SHALL be classified as "valid" when ALL of the following are true:
- `status` = 'completed'
- `respondent_name` is not null and not empty
- `respondent_email` is not null and matches the pattern `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`

All other completed responses SHALL be classified as "invalid".
Non-completed responses (in_progress) SHALL not be counted in either category.

#### Scenario: Complete response with valid email
- **WHEN** a response has status='completed', respondent_name='张三', respondent_email='zs@gmail.com'
- **THEN** it is classified as valid

#### Scenario: Complete response with missing name
- **WHEN** a response has status='completed', respondent_name=null, respondent_email='zs@gmail.com'
- **THEN** it is classified as invalid

#### Scenario: Complete response with bad email
- **WHEN** a response has status='completed', respondent_name='张三', respondent_email='fake@x'
- **THEN** it is classified as invalid

### Requirement: Sales breakdown per survey
The system SHALL return per-Sales metrics when `survey_id` query param is provided.

Response shape:
```json
{
  "survey": { "id": "uuid", "title": "PhD意向" },
  "sales": [
    {
      "user_id": "uuid",
      "name": "Winnie",
      "total_scans": 20,
      "valid_responses": 15,
      "invalid_responses": 2,
      "registrations": 5,
      "conversion_rate": 0.33,
      "last_active": "2026-05-14T10:00:00Z",
      "daily_breakdown": [
        {
          "date": "2026-05-14",
          "scans": 5,
          "new_responses": 3,
          "valid": 3,
          "invalid": 0,
          "registrations": 1,
          "follow_up_actions": 2,
          "status": "active"
        }
      ]
    }
  ]
}
```

`daily_breakdown` SHALL cover the last 14 days.

#### Scenario: Super admin drills into survey
- **WHEN** super_admin calls `GET /api/admin/survey-overview?survey_id=xxx`
- **THEN** the system returns per-Sales breakdown with daily activity

#### Scenario: Admin denied from sales breakdown
- **WHEN** admin calls `GET /api/admin/survey-overview?survey_id=xxx`
- **THEN** the system returns 403 Forbidden

### Requirement: Daily activity status indicator
Each day in a Sales user's daily breakdown SHALL have a `status` field:
- `"active"`: the day has new responses AND follow-up actions in `admin_work_logs`
- `"warning"`: the day has new responses BUT zero follow-up actions
- `"inactive"`: the day has zero responses AND zero follow-up actions

Follow-up actions are defined as `admin_work_logs` entries where `admin_id` = sales user id AND `action_category` = 'sales_customer'.

#### Scenario: Day with responses and follow-ups
- **WHEN** Sales user has 3 new responses and 2 work log entries on 2026-05-14
- **THEN** status is "active"

#### Scenario: Day with responses but no follow-ups
- **WHEN** Sales user has 3 new responses but 0 work log entries on 2026-05-14
- **THEN** status is "warning"

#### Scenario: Day with no activity
- **WHEN** Sales user has 0 new responses and 0 work log entries on 2026-05-14
- **THEN** status is "inactive"

### Requirement: Client detail list per Sales
The system SHALL return individual client records when both `survey_id` and `sales_id` query params are provided.

Response shape:
```json
{
  "survey": { "id": "uuid", "title": "PhD意向" },
  "sales": { "user_id": "uuid", "name": "Winnie" },
  "clients": [
    {
      "response_id": "uuid",
      "name": "张三",
      "phone": "+61481234567",
      "email": "zs@gmail.com",
      "wechat": "zs_wx",
      "is_valid": true,
      "is_registered": true,
      "follow_up_status": "contacted",
      "follow_up_notes": "已联系，有PhD意向",
      "last_follow_up": "2026-05-14T10:00:00Z",
      "value_score": 85,
      "completed_at": "2026-05-13T15:30:00Z",
      "answer_summary": { "target_country": "Australia", "budget": "5000+" }
    }
  ]
}
```

#### Scenario: Super admin views client list
- **WHEN** super_admin calls `GET /api/admin/survey-overview?survey_id=xxx&sales_id=yyy`
- **THEN** the system returns full client list with PII, follow-up status, and answer summaries

#### Scenario: Admin denied from client details
- **WHEN** admin calls `GET /api/admin/survey-overview?survey_id=xxx&sales_id=yyy`
- **THEN** the system returns 403 Forbidden
