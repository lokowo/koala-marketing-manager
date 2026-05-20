## Why

The "首页" nav link points to `/koala/discover` (professor discovery page), not the actual homepage at `/koala/home`. The navbar lacks a "博客" entry, and the theme toggle wastes prime navigation space. The homepage itself needs a complete redesign to serve as a proper platform landing page showcasing all core features rather than just professor discovery.

## What Changes

- Fix "首页" link in both TopNavBar and BottomTabBar to point to `/koala/home` instead of `/koala/discover`
- Add "博客" link (`/koala/blog`) to desktop TopNavBar between "定价" and "我的"
- Remove theme toggle button from TopNavBar, relocate to my-profile settings
- Redesign `/koala/home` page with: Hero section, data stats bar, AI tools card grid, professor carousel, blog carousel, pricing preview, and footer
- Desktop nav order: `[🐨 Koala PhD]  首页  Ola AI  教授库  定价  博客  [我的]`
- Mobile BottomTabBar keeps 4 tabs: `[首页] [Ola AI] [教授库] [我的]`

## Capabilities

### New Capabilities
- `homepage-redesign`: Full homepage redesign with hero, stats, AI tools grid, professor recommendations, blog carousel, pricing preview, and footer sections
- `navbar-restructure`: Fix nav links, add blog entry, remove theme toggle from nav bar

### Modified Capabilities
- `homepage-blog-carousel`: Blog carousel section moves into the redesigned homepage layout (no spec-level behavior change, just placement)

## Impact

- `app/koala/components/TopNavBar.tsx` — nav items, remove theme toggle
- `app/koala/components/BottomTabBar.tsx` — fix 首页 href
- `app/koala/home/HomeClient.tsx` — complete rewrite with new sections
- `app/koala/home/page.tsx` — add professor data fetching
- `app/koala/my-profile/page.tsx` — add theme toggle to settings area
