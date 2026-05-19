## 1. Data Layer

- [x] 1.1 Update `app/koala/home/page.tsx` Supabase blog query limit from 4 to 8 (both pinned and fallback queries)

## 2. Carousel Container

- [x] 2.1 Replace blog section grid layout in `HomeClient.tsx` with horizontal scroll container (overflow-x auto, scroll-snap-type x mandatory, flex row, gap-4)
- [x] 2.2 Add scrollbar-hide CSS (webkit-scrollbar none + scrollbar-width none) — either inline style or global CSS class
- [x] 2.3 Make blog cards fixed-width (`w-[280px] md:w-[320px] flex-shrink-0`) with scroll-snap-align start
- [x] 2.4 Remove the `slice(0,2)` / `slice(2,4)` split and `hidden md:flex` — render all posts in a single loop

## 3. Arrow Navigation

- [x] 3.1 Add `useRef<HTMLDivElement>` for the scroll container
- [x] 3.2 Add left/right arrow buttons (absolute positioned, `hidden md:flex`, semi-transparent circular style)
- [x] 3.3 Implement scroll handler: `scrollBy({ left: ±336, behavior: 'smooth' })` on click (±296 on mobile if needed)
- [x] 3.4 Add scroll event listener to track `canScrollLeft` / `canScrollRight` state, hide arrows at boundaries

## 4. Verification

- [x] 4.1 Desktop: confirm horizontal scroll with arrow navigation and snap alignment
- [x] 4.2 Mobile: confirm touch swipe with snap alignment, no arrows visible
- [x] 4.3 Confirm 6+ blog cards render when data is available
- [x] 4.4 Confirm scrollbar is not visible on Chrome, Safari, Firefox
