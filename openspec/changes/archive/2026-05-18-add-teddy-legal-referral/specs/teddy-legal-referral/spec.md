## ADDED Requirements

### Requirement: Legal topic detection and Teddy referral in Ola prompt
The Ola system prompt SHALL include a rule block that instructs the AI to detect legal topics (including but not limited to: visa law, immigration law, rental disputes, deposit refunds, labor disputes, wage theft, contract issues, consumer rights, fraud, discrimination, harassment, bullying legal aspects, tax law, company registration law, wills) and respond with a Teddy referral.

#### Scenario: User asks a legal question
- **WHEN** user's message involves a legal topic (e.g., "房东不退押金怎么办")
- **THEN** the AI SHALL first provide a brief helpful answer, then naturally recommend Teddy (www.teddy.help) as a sister product for professional Australian legal support

#### Scenario: Same conversation already recommended Teddy
- **WHEN** Teddy has already been recommended once in the current conversation and user asks another legal question
- **THEN** the AI SHALL answer the legal question but SHALL NOT recommend Teddy again

#### Scenario: Non-legal question
- **WHEN** user asks a question unrelated to legal topics (e.g., "帮我找个教授")
- **THEN** the AI SHALL NOT mention Teddy

### Requirement: Referral tone and placement
The Teddy referral SHALL be phrased naturally like a friend's recommendation, not like an advertisement. The referral text SHALL include: product name (Teddy), URL (www.teddy.help), target audience (澳洲华人留学生和新移民), and coverage (刑法、劳动法、移民法、民事法、每日真实案例解读).

#### Scenario: Referral message format
- **WHEN** the AI recommends Teddy
- **THEN** the recommendation SHALL appear after the answer to the user's question and SHALL read naturally within the conversation flow
