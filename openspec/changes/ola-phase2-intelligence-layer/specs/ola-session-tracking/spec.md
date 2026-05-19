## ADDED Requirements

### Requirement: Session table tracks conversation lifecycle

The system SHALL store session records in `ola_sessions` with: session_id, user_id (nullable for anonymous), mode, status (active/completed/abandoned), message_count, first_message_at, last_message_at, metadata (JSONB).

#### Scenario: New session created on first message
- **WHEN** a user sends a message with a new session_id
- **THEN** an `ola_sessions` row is created with status='active' and message_count=1

#### Scenario: Session updated on subsequent messages
- **WHEN** a user sends another message in the same session
- **THEN** message_count is incremented and last_message_at is updated

---

### Requirement: Conversation events table records funnel actions

The system SHALL store events in `ola_conversation_events` with: id, session_id, user_id (nullable), event_type, event_data (JSONB), created_at. Event types SHALL include: session_start, faq_hit, llm_call, professor_match, credit_action.

#### Scenario: FAQ hit event recorded
- **WHEN** FAQ matching returns a result
- **THEN** a faq_hit event is inserted with event_data containing faq_id and category

#### Scenario: LLM call event recorded
- **WHEN** Claude API is called (FAQ miss)
- **THEN** an llm_call event is inserted with event_data containing mode and intent

#### Scenario: Professor match event recorded
- **WHEN** the searchProfessors tool returns results
- **THEN** a professor_match event is inserted with event_data containing professor count and query
