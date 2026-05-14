## ADDED Requirements

### Requirement: Resend Webhook receives delivery status
The system SHALL expose a POST endpoint at `/api/webhooks/resend` that receives Resend Webhook events and updates `survey_responses.metadata.email_status` based on delivery outcome.

#### Scenario: Email delivered successfully
- **WHEN** Resend sends a `email.delivered` webhook with metadata containing `survey_response_id`
- **THEN** the system SHALL update that response's `metadata.email_status` to `'valid'`

#### Scenario: Email bounced
- **WHEN** Resend sends a `email.bounced` webhook with metadata containing `survey_response_id`
- **THEN** the system SHALL update that response's `metadata.email_status` to `'invalid'`

#### Scenario: Email complained (spam report)
- **WHEN** Resend sends a `email.complained` webhook with metadata containing `survey_response_id`
- **THEN** the system SHALL update that response's `metadata.email_status` to `'invalid'`

#### Scenario: Invalid webhook signature
- **WHEN** a request arrives at the webhook endpoint with an invalid or missing Svix signature
- **THEN** the system SHALL return HTTP 401 and NOT modify any data

#### Scenario: Unknown event type
- **WHEN** Resend sends a webhook event that is not `email.delivered`, `email.bounced`, or `email.complained`
- **THEN** the system SHALL return HTTP 200 and NOT modify any data

### Requirement: Sales dashboard shows email validation status
The Sales dashboard client list SHALL display a visual indicator for each lead's email validation status.

#### Scenario: Email validated
- **WHEN** a survey response has `metadata.email_status = 'valid'`
- **THEN** the system SHALL display a green checkmark badge next to the email

#### Scenario: Email invalid
- **WHEN** a survey response has `metadata.email_status = 'invalid'`
- **THEN** the system SHALL display a red cross badge next to the email

#### Scenario: Email pending validation
- **WHEN** a survey response has `metadata.email_status = 'pending'` or no email_status
- **THEN** the system SHALL display a gray "验证中" badge next to the email
