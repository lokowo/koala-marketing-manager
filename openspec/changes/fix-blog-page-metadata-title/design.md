## Design

### Root Cause

`app/koala/blog/[id]/layout.tsx` line 15:
```ts
.or(`id.eq.${id},slug.eq.${id}`)
.single();
```

When the URL param is a slug (e.g., `my-blog-post`):
1. `id.eq.my-blog-post` attempts UUID cast on a non-UUID string → PostgreSQL type error
2. `.single()` throws PGRST116 when 0 rows match (unlike `.maybeSingle()` which returns null)
3. `data` is null → `if (!post)` → returns `{ title: '文章未找到' }`

Meanwhile `page.tsx` works correctly because it:
- Tries `.eq('slug', id).maybeSingle()` first
- Only attempts `.eq('id', id)` if the param matches UUID regex

### Fix Strategy

Align `generateMetadata` with the page component's query strategy:

1. **Query by slug first** using `.eq('slug', id).eq('status', 'published').maybeSingle()`
2. **Fallback to UUID** only if slug misses AND param matches UUID pattern
3. **Wrap in try-catch** to ensure metadata never throws — return fallback metadata on error

### Single File Change

Only `app/koala/blog/[id]/layout.tsx` needs modification. No new files, no API changes, no schema changes.
