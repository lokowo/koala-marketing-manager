## 1. Database Migration

- [x] 1.1 Alter `knowledge_chunks` table CHECK constraint to add `guide` and `manual` source types

## 2. Knowledge CRUD API

- [x] 2.1 Create `app/api/admin/knowledge/route.ts` — GET (paginated list with source_type filter and keyword search) + POST (create with auto embedding)
- [x] 2.2 Create `app/api/admin/knowledge/[id]/route.ts` — GET (single chunk detail) + PUT (update, regenerate embedding if content changed) + DELETE (hard delete)
- [x] 2.3 Create `app/api/admin/knowledge/batch/route.ts` — POST (batch import up to 20 items with batch embedding)

## 3. Knowledge Search API

- [x] 3.1 Create `app/api/admin/knowledge/search/route.ts` — POST (semantic search with configurable threshold and limit)

## 4. Admin UI Upgrade

- [x] 4.1 Upgrade `app/dashboard/koala/knowledge-base/page.tsx` — fetch real data from API, display paginated list with source_type filter
- [x] 4.2 Add create/edit modal — form with source_title, content, source_type fields, calls POST/PUT API
- [x] 4.3 Add delete with confirmation dialog — calls DELETE API and removes from list
- [x] 4.4 Add batch import UI — JSON textarea + import button, calls batch API with progress feedback
- [x] 4.5 Replace search test to use dedicated `/api/admin/knowledge/search` endpoint with threshold/limit controls and similarity score display
