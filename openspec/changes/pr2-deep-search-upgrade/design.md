## Design

### Model upgrade
`searchClaudeCandidates` changes model from `claude-haiku-4-5-20251001` to `claude-sonnet-4-6`. Sonnet's web_search has significantly better query formulation and result extraction.

### Prompt improvements
- Include reversed name variant in prompt (many Chinese names get reversed in Western systems)
- Add "PhD supervisor" and university-specific queries
- Increase max_uses to 8 for more thorough search
- Explicitly request h_index, citation_count from Google Scholar if found

### Remove OpenAlex from professor search
Per architecture decision: OpenAlex is for literature database only, not professor search. Remove `searchOpenAlexCandidates` call from `searchProfessorAllSources`. Keep the function itself for potential future use by literature features.

### No changes needed
- Name normalization: already handles "xianghaiAN" correctly
- URL import: fully implemented
- Frontend: already shows deep search results + URL paste fallback
