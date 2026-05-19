## 1. Fix parse route — document status update

- [x] 1.1 Remove `updated_at` from all `user_documents` update calls in `app/api/user/documents/parse/route.ts` (lines 36, 46, 58, 74, 82, 173, 185)
- [x] 1.2 Add error checking on the `ai_parsed: true` / `ai_summary` update (line 180-187) — if this fails, log and return 500

## 2. Fix parse route — education/work insert error handling

- [x] 2.1 Check `{ error }` return on every `education_history` insert (line 192-203) — log failures to console.error, collect in `warnings` array
- [x] 2.2 Check `{ error }` return on every `work_history` insert (line 210-220) — same pattern
- [x] 2.3 Include `warnings` array in the API response JSON (line 244-249)

## 3. Add duplicate prevention

- [x] 3.1 Before education insert loop, query existing `education_history` rows for this `user_id` to build a dedup set (key = `institution + degree_type + major`)
- [x] 3.2 Skip insert if matching record already exists
- [x] 3.3 Before work insert loop, query existing `work_history` rows for this `user_id` to build a dedup set (key = `company + position`)
- [x] 3.4 Skip insert if matching record already exists

## 4. Sync SQL schema file

- [x] 4.1 Update `supabase/education-work-documents.sql` to match production column names (`institution`, `degree_type`, `start_year`, `end_year`, `status` etc.) — documentation only, not executed

## 5. Verify

- [x] 5.1 `npm run build` passes with no errors
- [ ] 5.2 Manual test: upload an image, click AI解析, confirm education_history record appears
