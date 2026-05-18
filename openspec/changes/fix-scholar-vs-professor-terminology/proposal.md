## Why

The database contains 24,494 Australian scholars (学者), not professors. Only ~10% are confirmed active professors who supervise PhD students. The rest are postdocs, retired, visiting scholars, etc. Current copy across the site incorrectly labels them all as "导师" or "教授", which is misleading. Need to correct to "学者" (scholars) where referring to the database population.

## What Changes

- All references to "XX 位导师/教授" when describing the database count → "XX 位学者"
- "导师库" in content text → "学者库" (navigation labels stay as "教授库")
- "教授数据库" in content → "学者数据库"
- English equivalents: "professors" → "scholars", "professor database" → "scholar database"
- SEO meta descriptions updated
- Ola FAQ/trigger seed data updated
- OG invite poster text updated

**Not changed:**
- Navigation labels "教授库" (user search habit)
- "AI 匹配导师" (matching results are supervisors)
- "浏览导师库" button text (product name)
- Individual professor references in email/outreach context
- "帮你找教授" in Ola dialogue (colloquial)

## Capabilities

### New Capabilities
(none — text-only change)

### Modified Capabilities
(none — no spec-level behavior changes)

## Impact

- ~15 frontend/API files with text changes
- No API, database, or dependency changes
- SEO meta descriptions change (may affect search indexing)
