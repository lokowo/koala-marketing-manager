## Tasks

### Task 1: Homepage (HomeClient.tsx)
- [x] Line ~338: `从 ${profCount} 位导师/学者中` → `从 ${profCount} 位学者中`
- [x] Line ~339: `${profCount} 导师库` → `${profCount} 学者库`

### Task 2: Homepage SEO (page.tsx + layout.tsx)
- [x] `app/koala/home/page.tsx` meta: "4,200+ 位教授" → "4,200+ 位学者"
- [x] `app/koala/layout.tsx` meta description: "4,200+ 位教授" → "4,200+ 位学者"
- [x] `app/koala/layout.tsx` OG description: "4,200+ 位教授" → "4,200+ 位学者"

### Task 3: Professors list page (ProfessorsClient.tsx)
- [x] Search results: "位匹配导师" → "位匹配学者", "位导师" → "位学者"
- [x] Loaded all message: "位导师" → "位学者"

### Task 4: Tools page
- [x] `app/koala/tools/page.tsx`: "10 位导师" → "10 位学者"

### Task 5: Blog pages
- [x] `app/dashboard/koala/blog/edit/page.tsx`: "4,200+ 位教授" → "4,200+ 位学者"
- [x] `app/koala/blog/[id]/BlogDetailClient.tsx`: "4,200+ 位教授" → "4,200+ 位学者"

### Task 6: OG invite poster
- [x] `app/api/og/invite/route.tsx`: "24,000+ 教授库" → "24,000+ 学者库"

### Task 7: Ola FAQ seed data
- [x] "在教授库中" → "在学者库中"
- [x] "我们的教授库" → "我们的学者库"
- [x] "24,000+ 澳洲教授数据库" → "24,000+ 澳洲学者数据库"
- [x] "24,000+ Australian Professor Database" → "24,000+ Australian Scholar Database"
- [x] "24,000+ 位澳洲教授的数据库" → "24,000+ 位澳洲学者的数据库"
- [x] "24,000+ Australian professors" → "24,000+ Australian scholars"

### Task 8: Ola triggers seed data
- [x] "去教授库逛逛" → "去学者库逛逛"
- [x] "browse the professor database" → "browse the scholar database"

### Task 9: Ola persona prompt
- [x] `app/lib/prompts/ola-persona.ts`: "24,000+ 位导师数据" → "24,000+ 位学者数据"

### Task 10: Knowledge import & report generation
- [x] `app/api/admin/knowledge/import-go8/route.ts`: "24,000+ 位澳洲大学教授信息" → "24,000+ 位澳洲学者信息"
- [x] `app/api/report/generate/route.ts`: "教授数据库" → "学者数据库" (2 occurrences)

### Task 11: Chat page loading text
- [x] `app/koala/chat/page.tsx`: "正在查询教授数据库…" → "正在查询学者数据库…"

### Task 12: Admin professors page
- [x] `app/dashboard/koala/professors/page.tsx`: "位教授" → "位学者" (2 occurrences)
- [x] `app/dashboard/koala/professors/quality/page.tsx`: "位教授有数据问题" → "位学者有数据问题"

### Task 13: Email template seed
- [x] `app/api/admin/ola-email-templates/seed/route.ts`: "5000位教授" → "5000位学者"

### Verification
- [x] `npm run build` passes
- [x] grep confirms no remaining "24.*位导师" or "24.*位教授" in content text
