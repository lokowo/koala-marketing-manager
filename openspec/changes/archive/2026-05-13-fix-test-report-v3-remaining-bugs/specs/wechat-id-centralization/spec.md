## MODIFIED Requirements

### Requirement: WeChat ID is referenced from BRAND constant
All files that display or embed a WeChat ID SHALL import and use `BRAND.wechat` from `app/lib/constants.ts` instead of hardcoding the value. This ensures a single source of truth for the WeChat ID across the entire codebase.

#### Scenario: Survey success page displays WeChat ID
- **WHEN** a respondent sees the success page after completing a survey
- **THEN** the displayed WeChat ID matches `BRAND.wechat` (currently `MissKoalaAu`)

#### Scenario: Public survey page displays WeChat ID
- **WHEN** a respondent views the survey footer on `/s/{code}`
- **THEN** the displayed WeChat ID matches `BRAND.wechat`

#### Scenario: AI chat page displays WeChat link
- **WHEN** the AI chat page renders a WeChat deep link
- **THEN** the URL uses `BRAND.wechat` (e.g., `weixin://dl/chat?username=${BRAND.wechat}`)

#### Scenario: System prompts reference WeChat ID
- **WHEN** the AI system prompt is assembled
- **THEN** the WeChat ID in the prompt text matches `BRAND.wechat`

#### Scenario: User messages API references WeChat ID
- **WHEN** the messages API generates a message containing the WeChat ID
- **THEN** the WeChat ID matches `BRAND.wechat`

#### Scenario: Admin settings page displays WeChat ID
- **WHEN** an admin views the settings page
- **THEN** the displayed WeChat ID matches `BRAND.wechat`

### Requirement: Changing BRAND.wechat updates all displays
When `BRAND.wechat` in `app/lib/constants.ts` is changed, all user-facing WeChat displays MUST reflect the new value without additional code changes.

#### Scenario: WeChat ID is updated in constants
- **WHEN** a developer changes `BRAND.wechat` from `MissKoalaAu` to a new value
- **THEN** all 6+ locations that display the WeChat ID automatically show the new value after rebuild
