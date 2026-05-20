## Context

The homepage (`/koala/home`) currently has: Hero with BannerCarousel, Three Steps, Hot Professors carousel, Research Areas grid, Blog carousel, and Bottom CTA. The nav "首页" incorrectly links to `/koala/discover`. No "博客" entry exists in desktop nav. Theme toggle occupies prime nav space.

HomeClient.tsx is ~680 lines. The server component page.tsx fetches professors and blog posts via Supabase. The page already has good bones — the redesign adds AI tools grid, pricing preview, footer, and restructures existing sections.

## Goals / Non-Goals

**Goals:**
- Fix "首页" link in TopNavBar and BottomTabBar to point to `/koala/home`
- Add "博客" to desktop nav between "定价" and "我的"
- Remove theme toggle from nav, add it to my-profile settings section
- Add AI tools card grid (6 cards linking to Ola chat modes)
- Add pricing preview section with credit pack highlights
- Add footer with brand info, links, and legal text
- Keep existing sections (Hero, Three Steps, Professors, Research Areas, Blog)

**Non-Goals:**
- Changing mobile BottomTabBar tab count (stays 4)
- Redesigning the professor card component
- Adding new API endpoints
- Changing blog or professor data fetching logic

## Decisions

**Keep existing HomeClient structure, add sections**: Rather than rewriting from scratch, we add the new sections (AI tools, pricing preview, footer) to the existing HomeClient component. The hero, three steps, professor carousel, research areas, and blog carousel are already well-built.

**AI tools grid uses 6 cards mapped to Ola chat modes**: Each card links to `/koala/chat?mode=X` with appropriate icons and descriptions. Uses the same card style as the existing research areas grid but larger.

**Pricing preview shows 3 credit pack highlights**: Not the full pricing page — just a teaser with a "查看完整定价" CTA link to `/koala/pricing`.

**Theme toggle relocates to my-profile as a simple row**: Add a settings section to my-profile with the same light/dark/system toggle logic. Use a simple pill-style segmented control.

**BottomTabBar "首页" link fix**: Change href from `/koala/discover` to `/koala/home`. Update `isActive` to match `/koala/home` path. The existing logic already treats `/koala/home` as active for the center Ola button — we need to adjust that.

## Risks / Trade-offs

[Homepage gets longer] → Sections are independently scrollable and the mobile experience uses natural vertical scroll. Each section is self-contained.

[Theme toggle less discoverable in my-profile] → The vast majority of users set theme once. Nav space is more valuable for frequently-used navigation links.

[BottomTabBar active state overlap] → The center Ola button currently treats `/koala/home` as active. After changing "首页" to point to `/koala/home`, we need to ensure only the left tab highlights on home, not the center button. Fix: center button is active only on `/koala/chat` paths.
