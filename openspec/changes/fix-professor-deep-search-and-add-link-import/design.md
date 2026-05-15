## Diagnosis

### Local test results
- `searchClaudeCandidates("Xianghai An")` → returns correct result in 5.2s
- `/api/professors/auto-search?name=Xianghai+An` → returns 3 candidates (claude_web_search + 2 openalex)
- `/api/professors/import-from-url` → works (tested previously with URL extraction)
- No production error logs for auto-search in past 7 days

### Root cause: silent error swallowing + no timeout config

1. **`searchClaudeCandidates` catch block** (line 427 of `professorAutoAdd.ts`):
   ```typescript
   } catch (e) {
     console.error('[professorSearch] Claude search failed:', e);
     return []; // ← swallows error, returns empty
   }
   ```
   Route returns `{ candidates: [], total: 0 }` with HTTP 200. User sees "AI 未找到" instead of actual error.

2. **No `maxDuration` on auto-search route**: Claude + web_search takes 5-15s. On Vercel, serverless functions have a default timeout. Without explicit `maxDuration`, requests may be killed silently.

3. **No `maxDuration` on import-from-url route**: Same issue — HTML fetch (15s timeout) + Claude extraction can exceed default timeout.

## Fix Plan

### Fix 1: Add Vercel function timeout config
Add `export const maxDuration = 60` to both routes:
- `app/api/professors/auto-search/route.ts`
- `app/api/professors/import-from-url/route.ts`

### Fix 2: Surface Claude errors to frontend
In `searchClaudeCandidates`, re-throw errors with a descriptive message instead of silently returning `[]`. Let the caller (`searchProfessorDeep` / `searchProfessorAllSources`) decide how to handle. Update the route handler to return error details in the response.

### Fix 3: Improve error display in frontend
When the auto-search API returns an error (instead of empty candidates), display the actual error message to the user instead of generic "AI 未找到该教授的信息".

### Fix 4: End-to-end verification
- Deploy to Vercel
- Test deep search for "Xianghai An" on production
- Test URL import with `https://profiles.sydney.edu.au/xianghai.an`
- Verify duplicate detection, credit reward, error cases

## Non-changes
- `searchClaudeCandidates` Claude prompt and web_search tool config — already working correctly
- `normalizeProfessorName` — already working
- URL import API logic — already working
- URL import UI — already implemented
