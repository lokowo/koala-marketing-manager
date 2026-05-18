## ADDED Requirements

### Requirement: Name normalization before Claude web search
The system SHALL normalize user input before constructing the Claude search query. Normalization MUST:
1. Split camelCase boundaries (e.g., "xianghaiAN" → "xianghai AN")
2. Normalize to title case (e.g., "xianghai AN" → "Xianghai An")
3. Collapse multiple spaces

#### Scenario: CamelCase input is correctly normalized
- **WHEN** user searches for "xianghaiAN"
- **THEN** the search query sent to Claude SHALL contain "Xianghai An"

#### Scenario: Already-correct name passes through unchanged
- **WHEN** user searches for "Xianghai An"
- **THEN** the search query sent to Claude SHALL contain "Xianghai An"

#### Scenario: ALL-CAPS input is normalized
- **WHEN** user searches for "XIANGHAI AN"
- **THEN** the search query sent to Claude SHALL contain "Xianghai An"

### Requirement: Claude prompt includes name-variation instruction
The Claude prompt SHALL instruct the model that user input may be misspelled or oddly cased, and that the model should try reasonable name variations when searching.

#### Scenario: Prompt includes variation instruction
- **WHEN** `searchClaudeCandidates` constructs the Claude message
- **THEN** the prompt SHALL include instructions to try name variations and not give up on first search failure

### Requirement: Multiple search query strategies
The Claude prompt SHALL suggest multiple search approaches: name alone, name + "professor Australia", name + ".edu.au", to maximize hit rate.

#### Scenario: Search uses multiple query strategies
- **WHEN** Claude performs web searches for a professor
- **THEN** it SHALL try at least 2 different query formulations if the first search yields no results
