## Tasks

- [x] Remove `const [page, setPage] = useState(1)` from ProfessorsPageInner
- [x] In the initial fetch effect: replace `setPage(1)` with `pageRef.current = 1`
- [x] In the initial fetch `.then()`: replace `setPage(2)` with `pageRef.current = 2`
- [x] In `loadMore` `.then()`: replace `setPage(p => p + 1)` with `pageRef.current += 1`
- [x] In `loadMore` `.then()`: remove dedup logic — append all results directly
- [x] Remove stale `pageRef.current = page` sync line (no longer needed without page state)
- [x] Build passes (`npm run build`)
