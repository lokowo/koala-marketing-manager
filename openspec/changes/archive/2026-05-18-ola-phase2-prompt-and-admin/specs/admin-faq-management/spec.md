## ADDED Requirements

### Requirement: Admin sidebar includes FAQ management

#### Scenario: FAQ link in sidebar
- **WHEN** an admin views the dashboard sidebar
- **THEN** a "FAQ 管理" link appears below the "知识库" entry

---

### Requirement: FAQ management page with CRUD

#### Scenario: List all FAQ entries
- **WHEN** the admin navigates to the FAQ management page
- **THEN** all FAQ entries are displayed with category, keywords, and enabled status

#### Scenario: Create new FAQ entry
- **WHEN** the admin fills in category, keywords (comma-separated), answer_zh, answer_en, and optionally rich_card_type
- **AND** submits the form
- **THEN** a new FAQ entry is created via POST /api/admin/ola-faq

#### Scenario: Edit existing FAQ entry
- **WHEN** the admin edits a FAQ entry's fields
- **AND** saves changes
- **THEN** the entry is updated via PUT /api/admin/ola-faq/[id]

#### Scenario: Delete FAQ entry
- **WHEN** the admin clicks delete on a FAQ entry and confirms
- **THEN** the entry is deleted via DELETE /api/admin/ola-faq/[id]

#### Scenario: Toggle FAQ enabled/disabled
- **WHEN** the admin toggles the enabled switch
- **THEN** the entry's enabled field is updated via PUT /api/admin/ola-faq/[id]

---

### Requirement: FAQ test panel

#### Scenario: Test FAQ matching
- **WHEN** the admin types a test message in the test panel
- **AND** clicks test
- **THEN** the system calls the matchFAQ engine and displays: matched FAQ entry (or "no match"), match score, and matched answer
