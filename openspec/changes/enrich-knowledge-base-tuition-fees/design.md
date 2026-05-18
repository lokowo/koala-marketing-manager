# Design: Enrich Knowledge Base — Tuition Fees

## Approach
Insert 8 guide entries into `knowledge_chunks` via the existing batch API. No code changes needed.

## Data Format
Each entry:
- `source_type`: `"guide"`
- `source_title`: `"{University Name} 国际研究生学费指南（2025-2026）"`
- `content`: Markdown with PhD fees by faculty, Masters by Research fees, RTP info, fee estimator link, source URL

## Pipeline
1. Collect fee data from Go8 university websites
2. Format as 8 knowledge chunk entries
3. Insert via `POST /api/admin/knowledge/batch` (embeddings auto-generated)
4. Verify RAG retrieval with test queries

## No Code Changes
The existing RAG pipeline (`searchKnowledgeBase` → `match_knowledge` RPC → cosine similarity) will automatically surface these guides when users ask about tuition fees.
