## ADDED Requirements

### Requirement: pageRef is the sole source of truth for pagination
`pageRef.current` SHALL be incremented directly inside the fetch `.then()` callback, before `loadingMoreRef` is unlocked. The `page` React state and `setPage` SHALL be removed entirely.

#### Scenario: loadMore fetches the correct next page
- **WHEN** `loadMore` is invoked by IntersectionObserver
- **THEN** it SHALL call `apiFetch` with `pageRef.current` as the page number, and increment `pageRef.current` by 1 inside `.then()` before `.finally()` runs

#### Scenario: Rapid observer re-fires do not duplicate pages
- **WHEN** `.finally()` unlocks `loadingMoreRef` and the observer fires `loadMore` again before React re-renders
- **THEN** `pageRef.current` SHALL already reflect the incremented value, preventing a duplicate fetch of the same page

### Requirement: Initial fetch resets pageRef correctly
The initial fetch effect SHALL set `pageRef.current = 1` before fetching, then set `pageRef.current = 2` on success, matching the existing behavior of `setPage(2)`.

#### Scenario: Filter change resets pagination
- **WHEN** any filter (search, category, university, etc.) changes and the initial fetch effect fires
- **THEN** `pageRef.current` SHALL be reset to 1 before fetching, and set to 2 after data arrives

### Requirement: No dedup logic in loadMore
The `loadMore` function SHALL NOT filter results by existing IDs. With correct page tracking, duplicate data cannot occur, and dedup would mask pagination bugs.

#### Scenario: All fetched results are appended
- **WHEN** `loadMore` fetches page N and receives data
- **THEN** all results SHALL be appended to the professors array without any ID-based filtering
