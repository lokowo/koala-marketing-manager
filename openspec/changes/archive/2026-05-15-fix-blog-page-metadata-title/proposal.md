## Why

Blog detail pages show "文章未找到" as the browser tab title even when the article content renders correctly. The `generateMetadata` in the layout uses a different query strategy than the page component — it combines `id.eq` and `slug.eq` in a single `.or()` filter with `.single()`, which fails when the URL param is a slug string (not a UUID), causing the metadata fallback to trigger.

## What Changes

- Fix `generateMetadata` in `app/koala/blog/[id]/layout.tsx` to use the same slug-first query strategy as `page.tsx`
- Replace `.single()` with `.maybeSingle()` for graceful null handling
- Add `status = 'published'` filter to metadata query (currently missing, inconsistent with page query)
- Add try-catch to prevent metadata generation from failing silently

## Capabilities

### New Capabilities
_(none)_

### Modified Capabilities
_(none — this is a bug fix in existing code, no spec-level behavior changes)_

## Impact

- **File**: `app/koala/blog/[id]/layout.tsx` — `generateMetadata` function
- **SEO**: Fixes broken `<title>`, `og:title`, and `twitter:title` for all blog posts
- **Risk**: Low — only changes metadata generation, page rendering logic untouched
