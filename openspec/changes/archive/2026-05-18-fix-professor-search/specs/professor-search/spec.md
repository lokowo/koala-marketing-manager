## MODIFIED Requirements

### Requirement: Multi-word search returns correct results
The system SHALL return professors matching ALL search terms across name, university, and faculty fields when multiple words are entered.

#### Scenario: Two-word name search
- **WHEN** user searches "dewei chu"
- **THEN** results SHALL include professor "Dewei Chu" and no unrelated professors

#### Scenario: Name plus university search
- **WHEN** user searches "unsw machine learning"
- **THEN** results SHALL include UNSW professors in machine learning, not random UNSW professors or random ML professors

#### Scenario: Single word search unchanged
- **WHEN** user searches "dewei"
- **THEN** results SHALL include all professors with "dewei" in name, university, or faculty (existing behavior preserved)

### Requirement: Search results reset on filter change
The system SHALL fully replace the professor list when search terms or filters change. Stale results from prior searches SHALL NOT persist or accumulate.

#### Scenario: Rapid search term change
- **WHEN** user searches "dewei", then quickly changes to "john"
- **THEN** results SHALL contain only "john" matches, with zero "dewei" results remaining

#### Scenario: In-flight loadMore during filter change
- **WHEN** a loadMore request is in-flight and user changes search term
- **THEN** the loadMore response SHALL be discarded and not appended to the new result set

#### Scenario: No duplicate cards
- **WHEN** user performs any sequence of searches and scrolls
- **THEN** no professor card SHALL appear more than once in the list

### Requirement: Search button always triggers search
The search button (magnifying glass) SHALL trigger a new search every time it is clicked, regardless of whether the current search term matches the debounced value.

#### Scenario: Click after debounce settled
- **WHEN** user types "dewei", waits 1 second (debounce fires), then clicks search button without changing text
- **THEN** a new search request SHALL be sent and results SHALL refresh

#### Scenario: Click with new text before debounce
- **WHEN** user types "john" and immediately clicks search button (before 300ms debounce)
- **THEN** search SHALL execute immediately with "john"

### Requirement: AI deep search entry points are consistent
All AI deep search entry points SHALL use `debouncedSearch` as the search term source and SHALL have predictable, consistent behavior.

#### Scenario: No-results deep search prompt
- **WHEN** database search returns 0 results and search term is non-empty
- **THEN** system SHALL show deep search button with the debounced search term
- **AND** clicking it SHALL immediately start deep search (auto-invoke)

#### Scenario: Has-results deep search banner
- **WHEN** database search returns results and search term is non-empty
- **THEN** system SHALL show "not the professor you want?" banner below results
- **AND** clicking it SHALL expand deep search panel AND auto-invoke search

#### Scenario: Deep search term consistency
- **WHEN** any deep search entry point is activated
- **THEN** the search term pre-filled SHALL match `debouncedSearch`, not the real-time `search` value
