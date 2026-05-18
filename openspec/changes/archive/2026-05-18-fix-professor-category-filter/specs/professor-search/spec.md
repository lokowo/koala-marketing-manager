## MODIFIED Requirements

### Requirement: Category keyword matching uses word boundaries
The `search_professors_v2` RPC function SHALL match category keywords against `research_areas` using PostgreSQL word-boundary regex (`~*` with `\m...\M`) instead of ILIKE substring matching (`%keyword%`).

#### Scenario: Short keyword exact word match
- **WHEN** a professor has research area "RNA Sequencing"
- **THEN** the bio category keyword "RNA" SHALL match this professor

#### Scenario: Short keyword false positive prevention
- **WHEN** a professor has research area "Global Maternal and Child Health"
- **THEN** the bio category keyword "RNA" SHALL NOT match this professor (because "RNA" appears only inside "Maternal", not as a standalone word)

#### Scenario: Multi-word keyword matching
- **WHEN** a professor has research area "Deep Learning and Computer Vision"
- **THEN** the CS category keyword "Computer Vision" SHALL match this professor

#### Scenario: Case-insensitive matching preserved
- **WHEN** a professor has research area "dna methylation studies"
- **THEN** the bio category keyword "DNA" SHALL match this professor

#### Scenario: Count consistency
- **WHEN** category "bio" is selected and the main professor list returns total=N
- **THEN** the category count badge for "bio" SHALL also display N
