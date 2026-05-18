## Why

Blog posts with Chinese characters in slug cause 404 on detail pages due to URL encoding mismatch.

## What Changes

- Fix slug generation in `generate-professor/route.ts` to use English title instead of Chinese
- Add fallback in `generate/route.ts` for when English title is empty
- Backfill 22 existing bad slugs in database to pure ASCII

## Capabilities

### New Capabilities
_(none)_

### Modified Capabilities
_(none)_

## Impact

- **Code**: `app/api/blog/generate/route.ts`, `app/api/blog/generate-professor/route.ts`
- **Data**: 22 blog_posts rows updated with clean ASCII slugs
