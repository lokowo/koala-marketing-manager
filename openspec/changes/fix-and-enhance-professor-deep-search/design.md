## Architecture

Two independent changes sharing one user decision path:
1. Fix deep search (modify existing `professorAutoAdd.ts`)
2. Add URL import (new API route + frontend UI)

## Task A: Deep Search Fix

### Name normalization function

```typescript
function normalizeProfessorName(raw: string): string {
  // Split camelCase: "xianghaiAN" → "xianghai AN"
  let name = raw.replace(/([a-z])([A-Z])/g, '$1 $2');
  // Collapse multiple spaces, trim
  name = name.replace(/\s+/g, ' ').trim();
  // Title case each word
  return name.replace(/\b\w/g, c => c.toUpperCase())
             .replace(/\b(\w)(\w*)/g, (_, first, rest) => first + rest.toLowerCase());
}
```

Applied before both the DB search (ilike) and the Claude search query.

### Improved Claude prompt

Current prompt is too terse — single search query, no variation strategy. New prompt:
- Tells Claude the input may be misspelled/oddly cased
- Instructs to try multiple search queries (name alone, name + university Australia, name + site:.edu.au)
- Increases `max_uses` from 3 to 5 for more search attempts
- Adds explicit instruction to check .edu.au university staff pages

### No structural changes

Same function signature, same return type, same API route.

## Task B: URL Import

### API: POST /api/professors/import-from-url

```
Request:  { url: string }
Response: { success: true, professor: Professor, reward?: { credits, newBalance } }
       or { error: string, existing?: Professor }
```

Flow:
1. Auth check → 401
2. Rate limit check (5/day/user) → 429
3. URL parse + domain whitelist → 400
4. `fetch(url)` with 15s timeout, extract text content (strip HTML tags)
5. Send first ~15000 chars to Claude Haiku for structured extraction
6. Dedup: query professors by name + university
7. If exists: return existing (no credits)
8. Insert with verification_status='user_contributed', contributed_by=user.id
9. Award credits (reuse pattern from auto-search POST)

### Domain whitelist

```typescript
const ALLOWED_DOMAINS = [
  '.edu.au',
  'scholar.google.com',
  'scholar.google.com.au',
  'researchgate.net',
  'orcid.org',
];
```

### HTML → text extraction

No cheerio dependency needed. Use regex to strip tags + decode entities, keep first 15000 chars for Claude context window efficiency:

```typescript
function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 15000);
}
```

### Frontend UI

In `ProfessorsClient.tsx`, after the "AI 也未找到" message (line ~888), add a collapsible card:
- URL text input + "录入" button
- Loading state while importing
- Success state showing the new professor card
- Error state with message

### Rate limiter

New `urlImportLimiter` in `app/lib/ratelimit.ts`: 5 requests per 24 hours per user.

## Files Changed

| File | Change |
|------|--------|
| `app/lib/services/professorAutoAdd.ts` | Add `normalizeProfessorName()`, improve Claude prompt |
| `app/api/professors/import-from-url/route.ts` | New file |
| `app/koala/professors/ProfessorsClient.tsx` | Add URL paste UI |
| `app/lib/ratelimit.ts` | Add `urlImportLimiter` |
