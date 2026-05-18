## ADDED Requirements

### Requirement: Admin can list knowledge chunks with filtering and pagination

The system SHALL provide a paginated list of knowledge chunks. The list SHALL support filtering by `source_type` and text search on `source_title` and `content`. Default page size SHALL be 20. Only authenticated Admin users SHALL access this endpoint.

#### Scenario: List all chunks with default pagination
- **WHEN** Admin sends GET /api/admin/knowledge without query params
- **THEN** system returns the first 20 chunks ordered by created_at DESC, with total count

#### Scenario: Filter by source_type
- **WHEN** Admin sends GET /api/admin/knowledge?source_type=guide
- **THEN** system returns only chunks where source_type = 'guide', paginated

#### Scenario: Search by keyword
- **WHEN** Admin sends GET /api/admin/knowledge?search=scholarship
- **THEN** system returns chunks where source_title or content contains 'scholarship' (case-insensitive)

#### Scenario: Unauthorized access
- **WHEN** a non-admin user sends GET /api/admin/knowledge
- **THEN** system returns 403 Forbidden

---

### Requirement: Admin can create a knowledge chunk with auto-generated embedding

The system SHALL allow Admin to create a new knowledge chunk by providing `source_title`, `content`, and `source_type`. The system SHALL automatically generate an OpenAI embedding (text-embedding-3-small, 1536 dims) from the content before inserting. The system MUST NOT store a chunk without a valid embedding.

#### Scenario: Successful creation
- **WHEN** Admin sends POST /api/admin/knowledge with valid source_title, content, and source_type
- **THEN** system generates embedding, inserts the chunk, and returns the created chunk with id

#### Scenario: Missing required fields
- **WHEN** Admin sends POST /api/admin/knowledge without content
- **THEN** system returns 400 with error message describing missing fields

#### Scenario: Embedding generation fails
- **WHEN** Admin sends POST /api/admin/knowledge but OpenAI API returns an error
- **THEN** system returns 500 with error message "Failed to generate embedding" and does NOT insert the chunk

#### Scenario: Invalid source_type
- **WHEN** Admin sends POST /api/admin/knowledge with source_type = 'invalid'
- **THEN** system returns 400 with error listing valid source_type values

---

### Requirement: Admin can view a single knowledge chunk

The system SHALL return the full details of a knowledge chunk by id, excluding the raw embedding vector.

#### Scenario: View existing chunk
- **WHEN** Admin sends GET /api/admin/knowledge/{id} with a valid UUID
- **THEN** system returns the chunk's id, source_type, source_title, content, and created_at

#### Scenario: Chunk not found
- **WHEN** Admin sends GET /api/admin/knowledge/{id} with a non-existent UUID
- **THEN** system returns 404

---

### Requirement: Admin can update a knowledge chunk

The system SHALL allow Admin to update `source_title`, `content`, and/or `source_type` of an existing chunk. If `content` is changed, the system SHALL regenerate the embedding. If only `source_title` or `source_type` changes, embedding SHALL NOT be regenerated.

#### Scenario: Update content triggers embedding regeneration
- **WHEN** Admin sends PUT /api/admin/knowledge/{id} with new content
- **THEN** system regenerates embedding, updates the chunk, and returns updated data

#### Scenario: Update only source_type skips embedding regeneration
- **WHEN** Admin sends PUT /api/admin/knowledge/{id} with only source_type changed
- **THEN** system updates source_type without calling OpenAI API

#### Scenario: Update non-existent chunk
- **WHEN** Admin sends PUT /api/admin/knowledge/{id} with a non-existent UUID
- **THEN** system returns 404

---

### Requirement: Admin can delete a knowledge chunk

The system SHALL allow Admin to delete a knowledge chunk by id. Deletion SHALL be permanent (hard delete).

#### Scenario: Successful deletion
- **WHEN** Admin sends DELETE /api/admin/knowledge/{id} with a valid UUID
- **THEN** system deletes the chunk and returns 200 with confirmation

#### Scenario: Delete non-existent chunk
- **WHEN** Admin sends DELETE /api/admin/knowledge/{id} with a non-existent UUID
- **THEN** system returns 404

---

### Requirement: Admin can batch import knowledge chunks

The system SHALL accept a JSON array of chunks (each with source_title, content, source_type) and insert them with auto-generated embeddings. The system SHALL use batch embedding API to minimize OpenAI calls. Maximum batch size SHALL be 20 items per request.

#### Scenario: Successful batch import
- **WHEN** Admin sends POST /api/admin/knowledge/batch with an array of 10 valid chunks
- **THEN** system generates embeddings in batch, inserts all 10 chunks, and returns count of imported items

#### Scenario: Batch exceeds maximum size
- **WHEN** Admin sends POST /api/admin/knowledge/batch with 25 items
- **THEN** system returns 400 with error "Maximum batch size is 20"

#### Scenario: Partial failure in batch
- **WHEN** Admin sends POST /api/admin/knowledge/batch but embedding generation fails for some items
- **THEN** system inserts the successfully processed items and returns the count of successes and failures

---

### Requirement: Admin UI supports full CRUD on knowledge base page

The existing `dashboard/koala/knowledge-base/page.tsx` SHALL be upgraded to support: viewing chunks from the API (not empty state), creating new chunks via a form/modal, editing existing chunks inline or via modal, deleting chunks with confirmation, batch importing via JSON textarea, and filtering by source_type. The page SHALL fetch real data from `/api/admin/knowledge`.

#### Scenario: Page loads with real data
- **WHEN** Admin navigates to knowledge base page
- **THEN** page fetches GET /api/admin/knowledge and displays chunk list with pagination

#### Scenario: Create new chunk via form
- **WHEN** Admin clicks "添加知识" button and fills in the form
- **THEN** page sends POST /api/admin/knowledge and adds the new chunk to the list on success

#### Scenario: Delete chunk with confirmation
- **WHEN** Admin clicks delete on a chunk and confirms in the dialog
- **THEN** page sends DELETE /api/admin/knowledge/{id} and removes the chunk from the list

---

### Requirement: Extend source_type CHECK constraint

The `knowledge_chunks` table's `source_type` CHECK constraint SHALL be updated to include `guide` and `manual` in addition to the existing types (`professor_paper`, `arc_grant`, `blog_post`, `faq`, `user_feedback`).

#### Scenario: Insert with source_type 'manual'
- **WHEN** a row is inserted with source_type = 'manual'
- **THEN** the insert succeeds

#### Scenario: Insert with source_type 'guide'
- **WHEN** a row is inserted with source_type = 'guide'
- **THEN** the insert succeeds
