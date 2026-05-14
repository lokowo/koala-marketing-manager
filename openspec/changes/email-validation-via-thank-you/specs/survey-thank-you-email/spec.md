## ADDED Requirements

### Requirement: Auto-send thank-you email after survey completion
The system SHALL send a branded thank-you email via Resend to the respondent after successful survey submission, if a valid-format email was provided.

#### Scenario: Survey submitted with valid email format
- **WHEN** a survey response is completed and the email passes regex format validation
- **THEN** the system SHALL asynchronously send a thank-you email to that address using Resend API with `survey_response_id` in the metadata
- **AND** set `metadata.email_status` to `'pending'`
- **AND** store the Resend `email_id` in `metadata.resend_email_id`

#### Scenario: Survey submitted with invalid email format
- **WHEN** a survey response is completed and the email fails regex validation
- **THEN** the system SHALL NOT send any email
- **AND** `metadata.email_status` SHALL remain `'invalid'`

#### Scenario: Survey submitted without email
- **WHEN** a survey response is completed without an email field
- **THEN** the system SHALL NOT send any email

#### Scenario: Resend API unavailable
- **WHEN** the thank-you email fails to send (API error, missing key, etc.)
- **THEN** the survey submission SHALL still succeed (HTTP 201)
- **AND** `metadata.email_status` SHALL remain `'pending'`

### Requirement: Thank-you email content
The thank-you email SHALL use the existing `brandTemplate()` and contain branded content consistent with Koala PhD.

#### Scenario: Email content structure
- **WHEN** a thank-you email is sent
- **THEN** the email SHALL include: a thank-you message, brief Koala PhD introduction, a CTA link to register/explore, and standard brand footer
- **AND** the sender SHALL be `hello@koalaphd.com`
- **AND** the subject SHALL be in Chinese, welcoming the respondent
