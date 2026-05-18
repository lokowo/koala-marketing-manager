## 1. Fix Search Threshold

- [x] 1.1 Lower default threshold in `/api/admin/knowledge/search/route.ts` from 0.7 to 0.45
- [x] 1.2 Lower threshold in `app/lib/server/rag-engine.ts` searchKnowledgeBase from 0.7 to 0.45

## 2. UI Error Handling

- [x] 2.1 Update search UI in knowledge-base page to show error messages from API responses

## 3. Backfill API

- [x] 3.1 Create `app/api/admin/knowledge/backfill/route.ts` — query NULL embeddings, batch generate and update
- [x] 3.2 Add "重建索引" button to knowledge-base page that calls the backfill endpoint
