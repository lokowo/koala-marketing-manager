## ADDED Requirements

### Requirement: Trigger rules stored in database
The system SHALL store proactive trigger rules in `ola_triggers` with: trigger_key (unique), page, condition (JSONB), ola_state, message_zh, message_en, action_type, action_payload, frequency_limit, priority, enabled.

### Requirement: Trigger logs track user interactions
The system SHALL log trigger impressions in `ola_trigger_logs` with: user_id, trigger_id, page, shown_at, clicked, dismissed.

### Requirement: Trigger API returns page-relevant rules
#### Scenario: Fetch triggers for a page
- **WHEN** GET /api/ola/triggers?page=home is called
- **THEN** return enabled triggers where page matches or page='*', ordered by priority DESC

### Requirement: Trigger engine evaluates conditions client-side
#### Scenario: Time-based trigger fires
- **WHEN** user stays on professors/[id] for 10 seconds
- **AND** the professor_detail_10s trigger hasn't been shown in 24h
- **THEN** OlaProactiveBubble appears with the trigger message

#### Scenario: Only one bubble at a time
- **WHEN** multiple triggers match simultaneously
- **THEN** only the highest priority trigger is shown

#### Scenario: 24h cooldown after dismiss
- **WHEN** user dismisses a bubble
- **THEN** the same trigger_key is not shown again for 24 hours

### Requirement: Proactive bubble UI
#### Scenario: Bubble appearance
- **WHEN** a trigger fires
- **THEN** a speech bubble slides in from bottom-right near OlaWidget, showing Ola avatar + message + optional CTA button + close button

#### Scenario: Auto-collapse
- **WHEN** user doesn't interact with bubble for 10 seconds
- **THEN** bubble collapses to a small indicator dot
