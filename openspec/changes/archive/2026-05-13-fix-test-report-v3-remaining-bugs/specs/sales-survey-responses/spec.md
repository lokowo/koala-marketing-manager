## ADDED Requirements

### Requirement: Sales can view survey responses from their own dashboard
The system SHALL provide a survey responses page at `/dashboard/sales/surveys/[id]/responses` that displays all responses for a given survey. This page MUST be accessible to users with the `sales` role without being redirected by the koala layout.

#### Scenario: Sales user opens responses page for a survey they created
- **WHEN** a Sales user navigates to `/dashboard/sales/surveys/{surveyId}/responses` for a survey they created
- **THEN** the system displays all responses for that survey, including respondent contact info (name, phone, email, WeChat) and question answers

#### Scenario: Sales user opens responses page for a survey they promoted
- **WHEN** a Sales user navigates to `/dashboard/sales/surveys/{surveyId}/responses` for a survey they did not create but promoted via QR code
- **THEN** the system displays only responses that came through this Sales user's share links (filtered by `sales_code`)

#### Scenario: Responses page shows answer details
- **WHEN** a Sales user clicks on a response row
- **THEN** a detail panel displays the full set of question-answer pairs for that response, plus contact info and submission metadata

### Requirement: Survey list provides response viewing entry point
The system SHALL display a "回复" (responses) button in the survey list table's action column on the Sales surveys page.

#### Scenario: Active survey with responses
- **WHEN** a Sales user views the "我的问卷" tab and a survey has `response_count > 0`
- **THEN** a "回复" link appears in the action column, linking to `/dashboard/sales/surveys/{id}/responses`

#### Scenario: Survey with zero responses
- **WHEN** a survey has `response_count === 0` or no responses
- **THEN** the "回复" link still appears but the responses page shows an empty state message
