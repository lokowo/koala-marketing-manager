## ADDED Requirements

### Requirement: Handoff API creates escalation record
#### Scenario: User requests human help
- **WHEN** POST /api/ola/handoff is called with reason, collected_data, conversation_summary
- **THEN** a handoff_requests row is created with status='pending'
- **AND** an email notification is sent to admin via Resend
- **AND** response includes wechat info and success status

### Requirement: Handoff card in chat
#### Scenario: Handoff triggered in conversation
- **WHEN** the system determines a handoff is needed
- **THEN** OlaHandoffCard is displayed showing WeChat QR, consultation booking link, and contact email
