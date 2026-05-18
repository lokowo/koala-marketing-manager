## ADDED Requirements

### Requirement: Conversation stage tracking via LLM output

The system SHALL instruct Claude to append a `<stage>N</stage>` tag at the end of each reply indicating the current conversation stage (1-8).

Stages: 1=greeting, 2=needs_discovery, 3=professor_matching, 4=letter_generation, 5=document_review, 6=interview_prep, 7=application_tracking, 8=offer_celebration

#### Scenario: Stage tag parsed from reply
- **WHEN** Claude's reply contains `<stage>3</stage>`
- **THEN** the backend extracts stage=3 and updates the session's conversation_stage

#### Scenario: Stage tag stripped from user-facing reply
- **WHEN** the backend extracts a stage tag
- **THEN** the `<stage>N</stage>` text is removed from the reply before sending to the frontend

#### Scenario: No stage tag in reply
- **WHEN** Claude's reply does not contain a stage tag
- **THEN** the session's conversation_stage remains unchanged
