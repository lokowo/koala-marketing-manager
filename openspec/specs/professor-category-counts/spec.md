## ADDED Requirements

### Requirement: Batch category count endpoint
The system SHALL provide a single API endpoint `GET /api/professors/counts` that returns the professor count for every predefined category in one response.

#### Scenario: Fetch all category counts
- **WHEN** the client sends `GET /api/professors/counts`
- **THEN** the response SHALL be JSON with shape `{ counts: Record<string, number> }` containing keys for each category (`health`, `physics`, `bio`, `earth`, `neuro`, `cs`, `eng`, `soc`) and an `all` key for the unfiltered total

#### Scenario: Counts reflect current keyword matching
- **WHEN** a professor's `research_areas` contain "RNA" as a standalone word (e.g., "RNA Sequencing")
- **THEN** that professor SHALL be counted in the `bio` category
- **WHEN** a professor's `research_areas` contain "RNA" only as a substring of another word (e.g., "Maternal")
- **THEN** that professor SHALL NOT be counted in the `bio` category

### Requirement: Frontend uses batch count endpoint
The frontend `ProfessorsClient.tsx` SHALL fetch category counts from `GET /api/professors/counts` in a single request on mount, replacing the current 8 parallel `/api/professors?category=X&limit=1` calls.

#### Scenario: Category counts load on page mount
- **WHEN** the professors page loads
- **THEN** exactly one `GET /api/professors/counts` request is made
- **THEN** all category badges display the returned counts

#### Scenario: Count fetch failure
- **WHEN** the `GET /api/professors/counts` request fails
- **THEN** category badges SHALL show no count (hidden), not "0"
