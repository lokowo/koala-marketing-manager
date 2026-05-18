## ADDED Requirements

### Requirement: Emotion detection from user messages

The system SHALL detect two emotional states from user messages using keyword matching: anxious and frustrated.

#### Scenario: Anxious emotion detected
- **WHEN** a user message contains anxiety keywords (焦虑, 压力大, 来不及, 怎么办, 崩溃, 没信心, 害怕, 被拒, anxious, stressed, worried, rejected, nervous, scared, panic)
- **THEN** `detectEmotion()` returns `'anxious'`

#### Scenario: Frustrated emotion detected
- **WHEN** a user message contains frustration keywords (没用, 不行, 放弃, 搞不定, 太难了, 垃圾, hopeless, give up, frustrated, useless, impossible)
- **THEN** `detectEmotion()` returns `'frustrated'`

#### Scenario: No emotion detected
- **WHEN** a user message contains no emotion keywords
- **THEN** `detectEmotion()` returns `null`

---

### Requirement: Emotion-aware prompt injection

#### Scenario: Anxious user prompt adjustment
- **WHEN** emotion is `'anxious'`
- **THEN** the system prompt includes instruction to use warm, reassuring tone, slow pace, share positive examples, and encourage

#### Scenario: Frustrated user prompt adjustment
- **WHEN** emotion is `'frustrated'`
- **THEN** the system prompt includes instruction to empathize first, then suggest concrete actionable next steps
