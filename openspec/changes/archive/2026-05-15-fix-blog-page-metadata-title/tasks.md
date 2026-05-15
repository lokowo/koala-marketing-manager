## Tasks

- [x] **Fix generateMetadata query in blog layout** — File: `app/koala/blog/[id]/layout.tsx`. Replace `.or()` + `.single()` with slug-first strategy matching `page.tsx`: (1) query by slug with `.maybeSingle()`, (2) fallback to UUID only if param matches UUID regex, (3) wrap in try-catch. Verify `npm run build` passes.
- [x] **Local verification** — Start dev server, open blog detail pages, confirm tab title shows article title (not "文章未找到"), check page source for correct `<title>`, `og:title`, `twitter:title`.
