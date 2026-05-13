## ADDED Requirements

### Requirement: Survey can be paused from the UI
The system SHALL provide a "暂停" (pause) button for surveys with `status === 'active'`. Clicking the button MUST send a PUT request to `/api/surveys/{id}` with `{ status: 'paused' }` and refresh the survey list upon success.

#### Scenario: Sales user pauses an active survey they own
- **WHEN** a Sales user clicks "暂停" on an active survey they created
- **THEN** the system sends `PUT /api/surveys/{id}` with `status: 'paused'`, the survey status updates to "已暂停" in the list, and the button changes to "恢复"

#### Scenario: Admin pauses an active survey
- **WHEN** an Admin user clicks "暂停" on an active survey in the koala surveys page
- **THEN** the same pause behavior applies as for Sales

### Requirement: Paused survey can be resumed
The system SHALL provide a "恢复" (resume) button for surveys with `status === 'paused'`. Clicking the button MUST send a PUT request with `{ status: 'active' }` and refresh the survey list.

#### Scenario: Sales user resumes a paused survey
- **WHEN** a Sales user clicks "恢复" on a paused survey they own
- **THEN** the system sends `PUT /api/surveys/{id}` with `status: 'active'`, the survey status updates to "进行中" in the list, and the button changes back to "暂停"

### Requirement: Paused survey stops collecting responses
The system SHALL NOT accept new responses for a paused survey. The public survey page (`/s/[code]`) MUST display a message indicating the survey is paused.

#### Scenario: User tries to submit a response to a paused survey
- **WHEN** a respondent loads `/s/{code}` for a paused survey
- **THEN** the page displays a message like "该问卷已暂停收集" instead of the survey form
