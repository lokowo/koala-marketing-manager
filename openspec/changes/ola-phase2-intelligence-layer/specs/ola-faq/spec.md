## ADDED Requirements

### Requirement: FAQ table stores structured Q&A data

The system SHALL store FAQ entries in an `ola_faq` table with: category, keywords array, question patterns array, Chinese answer, English answer, optional rich card type and data, priority, enabled flag.

#### Scenario: Insert a FAQ entry
- **WHEN** an entry is inserted with category='pricing', keywords=['价格','多少钱','充值'], answer_zh and answer_en
- **THEN** the row is stored with auto-generated UUID and enabled=true by default

#### Scenario: Disable a FAQ entry
- **WHEN** an entry has enabled set to false
- **THEN** the FAQ matching engine SHALL NOT return this entry as a match

---

### Requirement: FAQ matching engine scores user messages against keywords

The system SHALL provide a function `matchFAQ(message: string)` that: tokenizes the user message, expands synonyms, compares against all enabled FAQ entries' keywords, returns the highest-scoring match if score >= 0.5, or null otherwise.

#### Scenario: Exact keyword match
- **WHEN** user sends "怎么充值"
- **THEN** matchFAQ returns the pricing FAQ entry (keyword "充值" matches)

#### Scenario: Synonym expansion match
- **WHEN** user sends "how to get credits"
- **THEN** matchFAQ matches the credits FAQ (synonym: credits → 积分)

#### Scenario: Below threshold returns null
- **WHEN** user sends "我想研究量子计算在澳洲的发展"
- **THEN** matchFAQ returns null (no FAQ keywords match above 0.5 threshold)

#### Scenario: Multiple matches returns highest priority
- **WHEN** user sends "Go8 大学奖学金" which matches both go8 and scholarship FAQs
- **THEN** matchFAQ returns the one with higher priority field, or higher keyword score if equal priority

---

### Requirement: Synonym dictionary covers common variations

The system SHALL include a synonym dictionary mapping at minimum: 积分↔credits↔points, 套磁信↔cold email↔contact letter, 价格↔pricing↔price↔多少钱, 奖学金↔scholarship↔全奖, 签证↔visa, 教授↔professor↔导师, 申请↔apply↔application.

#### Scenario: Chinese-English synonym expansion
- **WHEN** user message contains "scholarship"
- **THEN** the token set is expanded to also include "奖学金" and "全奖"

---

### Requirement: FAQ integrated before LLM in chat flow

The `/api/ai/chat` route SHALL call `matchFAQ` before intent detection and LLM call. If FAQ matches, the route SHALL return the FAQ answer directly without calling Claude, and SHALL record a `faq_hit` event.

#### Scenario: FAQ hit bypasses LLM
- **WHEN** user sends "怎么获取积分" and FAQ matches credits entry
- **THEN** API returns the FAQ answer_zh as reply, does NOT call Anthropic API

#### Scenario: FAQ miss proceeds to LLM
- **WHEN** user sends "帮我分析一下 UNSW 的 CS PhD 方向" and no FAQ matches
- **THEN** API proceeds with normal intent detection → RAG → LLM flow

---

### Requirement: 15 initial FAQ entries are seeded

The system SHALL provide a seed mechanism (API route or script) that inserts at least 15 FAQ entries covering: pricing, credits, usage, go8, process, company, invite, visa, csc, proposal, interview, ielts, scholarship, timeline, ola identity.

#### Scenario: Seed creates all entries
- **WHEN** the seed is executed
- **THEN** 15 FAQ entries exist in `ola_faq` with non-empty answer_zh and answer_en

---

### Requirement: Admin can manage FAQ entries via API

The system SHALL provide CRUD endpoints at `/api/admin/ola-faq` for listing, creating, updating, and deleting FAQ entries. All endpoints require Admin authentication.

#### Scenario: List all FAQs
- **WHEN** Admin sends GET /api/admin/ola-faq
- **THEN** system returns all FAQ entries ordered by category, then priority DESC
