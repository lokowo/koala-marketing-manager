## 1. API — Survey Overview Endpoint

- [x] 1.1 Create `GET /api/admin/survey-overview/route.ts` with auth check (super_admin full access, admin partial, others 403)
- [x] 1.2 Implement Layer 1 logic: aggregate all surveys with total_scans (from survey_share_links), total_responses, valid/invalid counts, completion_rate, registrations, sales_count; return summary cards + per-survey rows
- [x] 1.3 Implement Layer 2 logic (when `survey_id` param): group survey_responses by sales_user_id, join user_profiles for names, compute per-Sales metrics + 14-day daily breakdown with activity status from admin_work_logs
- [x] 1.4 Implement Layer 3 logic (when `survey_id` + `sales_id` params): return full client list with PII, follow_up_status, value_score, and answer summary from survey_answers

## 2. Frontend — Analytics Page Rewrite

- [x] 2.1 Rewrite `/dashboard/koala/surveys/analytics/page.tsx`: detect role + query params to render correct layer; add breadcrumb navigation component
- [x] 2.2 Implement Layer 1 UI: summary cards (total surveys, valid responses, registrations, active sales) + survey table with status badges, metrics columns, and detail buttons
- [x] 2.3 Implement Layer 2 UI: Sales performance table with expandable daily breakdown rows, activity status indicators (✅⚠️🔴), conversion rates
- [x] 2.4 Implement Layer 3 UI: client detail table with PII columns, validity/registration/follow-up badges, value score display, expandable answer summary rows
- [x] 2.5 Handle Admin-only view: hide Sales-specific columns and detail buttons in Layer 1, block navigation to Layer 2/3

## 3. Build & Push

- [x] 3.1 Run `npm run build` to verify no type/compilation errors
- [ ] 3.2 Git commit and push
