## Tasks

### Task A: Fix AI Deep Search

- [x] Add `normalizeProfessorName()` function to `professorAutoAdd.ts`
- [x] Apply normalization in `searchClaudeCandidates` before constructing search query
- [x] Apply normalization in `searchProfessorDeep` and `searchProfessorAllSources` DB queries
- [x] Improve Claude prompt: name-variation instructions, multiple query strategies, .edu.au priority
- [x] Increase web_search max_uses from 3 to 5

### Task B: URL Import API

- [x] Add `urlImportLimiter` to `app/lib/ratelimit.ts` (5/day/user)
- [x] Create `app/api/professors/import-from-url/route.ts` with: auth, rate limit, domain whitelist, HTML fetch, Claude extraction, dedup, insert, credit reward
- [x] Add URL paste UI to `ProfessorsClient.tsx` — appears after AI deep search returns no results

### Verification

- [x] Build passes (`npm run build`)
