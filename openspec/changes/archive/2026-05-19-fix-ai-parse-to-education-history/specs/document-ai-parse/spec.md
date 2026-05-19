## ADDED Requirements

### Requirement: AI parse MUST persist document status correctly
The parse API SHALL update `user_documents.ai_parsed` to `true` and `user_documents.ai_summary` to the parsed JSON after successful Claude Vision analysis. The update MUST NOT include columns that do not exist on the table.

#### Scenario: Successful parse updates document record
- **WHEN** Claude Vision returns valid JSON for an uploaded document
- **THEN** `user_documents.ai_parsed` is set to `true` AND `user_documents.ai_summary` contains the parsed JSON string

#### Scenario: Document shows as "已解析" after parse
- **WHEN** the parse API returns successfully
- **THEN** the frontend re-fetches documents and the document's `parse_status` maps to `'done'`

### Requirement: AI parse MUST create education history records
The parse API SHALL insert one `education_history` row for each education entry extracted by Claude Vision. Each insert MUST check the Supabase return for errors and log failures.

#### Scenario: Graduation certificate creates education record
- **WHEN** user uploads a graduation certificate and clicks "AI解析"
- **THEN** an `education_history` record is created with `institution`, `degree_type`, `major`, `start_year`, `end_year` extracted from the document

#### Scenario: Education list refreshes after parse
- **WHEN** the parse API returns successfully
- **THEN** the frontend calls `loadEducation()` and the new record appears in the education section

### Requirement: AI parse MUST NOT create duplicate records
The parse API SHALL check for existing records before inserting. If an `education_history` row with the same `user_id` + `institution` + `degree_type` + `major` already exists, the insert MUST be skipped.

#### Scenario: Re-parsing same document does not duplicate
- **WHEN** user clicks "AI解析" on a document that was previously parsed successfully
- **THEN** no new duplicate `education_history` rows are created

### Requirement: AI parse MUST handle insert errors gracefully
When an `education_history` or `work_history` insert fails, the parse API SHALL log the error and continue processing remaining entries. Partial failures MUST NOT prevent the overall parse from succeeding.

#### Scenario: One education insert fails but others succeed
- **WHEN** a document contains two education entries and the first insert fails
- **THEN** the second insert is still attempted AND the API returns success with a `warnings` array describing the failure
