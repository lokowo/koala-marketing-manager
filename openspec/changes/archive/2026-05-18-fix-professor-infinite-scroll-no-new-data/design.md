## Architecture

Single-file change in `ProfessorsClient.tsx`. No new components, no API changes.

## Key Decision: Ref-only page tracking

**Problem**: `page` state + `pageRef` ref creates a race condition. `setPage()` schedules a re-render but `pageRef.current = page` only syncs on the *next* render. Between `.finally()` unlocking `loadingMoreRef` and React re-rendering, the observer can fire `loadMore` with a stale `pageRef`.

**Solution**: Remove `page` state entirely. Use `pageRef` as the sole page counter, mutated synchronously in `.then()`.

```
Before (broken):
  .then() → setPage(p + 1)  [async, waits for render]
  .finally() → unlock        [sync, immediate]
  observer fires → pageRef still old value

After (fixed):
  .then() → pageRef.current += 1  [sync, immediate]
  .finally() → unlock              [sync, immediate]
  observer fires → pageRef already incremented
```

## Dedup removal rationale

The `ids.has(p.id)` filter in `setProfessors` was added to work around duplicate data from fetching the same page twice. With correct page tracking, this cannot happen. Removing it ensures future pagination bugs surface immediately rather than being silently masked.

## Changes

| Location | What |
|----------|------|
| Line 153 | Remove `const [page, setPage] = useState(1)` |
| Line 210 | No change needed — `filters` already hardcodes `page: 1` for initial fetch |
| Line 219 | Replace `setPage(1)` with `pageRef.current = 1` |
| Line 228 | Replace `setPage(2)` with `pageRef.current = 2` |
| Lines 320-323 | Remove dedup: `setProfessors(prev => [...prev, ...d.data])` |
| Line 326 | Replace `setPage(p => p + 1)` with `pageRef.current += 1` |
