## ADDED Requirements

### Requirement: Real-time word count display

The system SHALL display the current word count at the bottom of the content textarea in real-time as the admin types. Chinese characters SHALL be counted individually. English words SHALL be counted by whitespace separation.

#### Scenario: Chinese content word count
- **WHEN** admin types "你好世界" in the content field
- **THEN** the system SHALL display "当前字数：4 字"

#### Scenario: Mixed language content
- **WHEN** admin types "你好 Hello World"
- **THEN** the system SHALL display the total count combining Chinese characters (2) and English words (2) = "当前字数：4 字"

#### Scenario: Empty content
- **WHEN** the content field is empty
- **THEN** the system SHALL display "当前字数：0 字"

### Requirement: Platform suitability hints based on word count

The system SHALL display a non-blocking platform suitability hint based on the current word count. The hint SHALL update in real-time and SHALL NOT restrict saving or publishing.

Thresholds:
- < 300 字: "适合小红书、微博"
- 300–800 字: "适合微信公众号"
- 800–2000 字: "适合博客网站"
- > 2000 字: "内容较长，建议分篇或精简"

#### Scenario: Short content hint
- **WHEN** the content word count is 150
- **THEN** the system SHALL display "适合小红书、微博" as a hint below the word count

#### Scenario: Medium content hint
- **WHEN** the content word count is 600
- **THEN** the system SHALL display "适合微信公众号"

#### Scenario: Long content hint
- **WHEN** the content word count is 1500
- **THEN** the system SHALL display "适合博客网站"

#### Scenario: Very long content warning
- **WHEN** the content word count exceeds 2000
- **THEN** the system SHALL display "内容较长，建议分篇或精简" with a warning style

#### Scenario: Hint does not block save
- **WHEN** admin clicks save with any word count (including > 2000)
- **THEN** the system SHALL save the article regardless of the platform hint
