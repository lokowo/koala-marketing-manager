## Tasks

### Task 1: Upgrade Claude model and prompt
- [x] Change model from `claude-haiku-4-5-20251001` to `claude-sonnet-4-6` in `searchClaudeCandidates`
- [x] Increase `max_uses` from 5 to 8
- [x] Rewrite prompt with reversed name variants, more search queries, .edu.au priority
- [x] Add h_index and citation_count extraction from Google Scholar

### Task 2: Remove OpenAlex from professor search
- [x] Remove `searchOpenAlexCandidates` call from `searchProfessorAllSources`
- [x] Keep `searchOpenAlexCandidates` function (may be used by literature features)

### Task 3: Verify
- [x] `npm run build` passes
- [ ] Test "xianghaiAN" → deep search returns Xianghai An
- [ ] Test "wei wang sydney" → returns relevant results
