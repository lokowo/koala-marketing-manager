## Tasks

### Task 1: Add Vercel maxDuration to API routes
- [x] Add `export const maxDuration = 60` to `app/api/professors/auto-search/route.ts`
- [x] Add `export const maxDuration = 60` to `app/api/professors/import-from-url/route.ts`

### Task 2: Surface Claude errors instead of swallowing
- [x] In `searchClaudeCandidates`, throw errors instead of returning `[]`
- [x] In `searchProfessorDeep` and `searchProfessorAllSources`, catch Claude errors and include error info in return
- [x] Update auto-search route to return `{ candidates, total, error? }` when Claude fails
- [x] Update ProfessorsClient deep search UI to display actual error message (added `deepError` state)

### Task 3: Build and deploy
- [x] `npm run build` passes
- [ ] Push to main and deploy to Vercel

### Task 4: End-to-end verification on production
- [ ] Deep search "Xianghai An" → returns professor info (not error)
- [ ] Paste `https://profiles.sydney.edu.au/xianghai.an` → imports successfully
- [ ] Duplicate paste → shows "already exists"
- [ ] Non-whitelisted URL → shows domain error
