## ADDED Requirements

### Requirement: Admin can test semantic search via dedicated API

The system SHALL provide a POST /api/admin/knowledge/search endpoint that accepts a query string, generates an embedding, runs `match_knowledge()` RPC, and returns matching chunks with similarity scores. This is independent from the AI chat RAG flow — it is a direct search interface for Admin debugging and quality assessment.

#### Scenario: Successful semantic search
- **WHEN** Admin sends POST /api/admin/knowledge/search with { "query": "PhD scholarship deadlines in Australia" }
- **THEN** system returns an array of matching chunks with id, source_type, source_title, content snippet, and similarity score, ordered by similarity DESC

#### Scenario: Search with custom threshold
- **WHEN** Admin sends POST /api/admin/knowledge/search with { "query": "...", "threshold": 0.5, "limit": 10 }
- **THEN** system uses the specified threshold and limit instead of defaults (0.7 / 5)

#### Scenario: No matches found
- **WHEN** Admin sends POST /api/admin/knowledge/search with a query that has no chunks above the threshold
- **THEN** system returns an empty array with 200 status

#### Scenario: Empty query
- **WHEN** Admin sends POST /api/admin/knowledge/search with empty or missing query
- **THEN** system returns 400 with error "Query is required"

---

### Requirement: Admin UI provides search testing panel

The knowledge base page SHALL include a search testing panel where Admin can type a query, optionally adjust threshold and limit, execute the search, and view results with similarity scores displayed as percentage badges. This replaces the current search test that routes through the AI chat endpoint.

#### Scenario: Test search from UI
- **WHEN** Admin types a query in the search panel and clicks "测试"
- **THEN** page sends POST /api/admin/knowledge/search and displays results with similarity percentages

#### Scenario: Adjust search parameters
- **WHEN** Admin changes threshold slider to 0.5 and limit to 10
- **THEN** these values are sent as parameters in the search API call
