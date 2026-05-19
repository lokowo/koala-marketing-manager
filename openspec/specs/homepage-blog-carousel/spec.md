## ADDED Requirements

### Requirement: Blog section renders as horizontal scroll carousel
The homepage blog section SHALL render blog cards in a single horizontal row inside a scrollable container with `scroll-snap-type: x mandatory`. Each card SHALL have `scroll-snap-align: start`. The scrollbar SHALL be hidden via CSS.

#### Scenario: Desktop horizontal scroll
- **WHEN** user views the homepage on desktop (≥768px)
- **THEN** blog cards are arranged in a single horizontal row, overflow is scrollable, and scroll snaps to each card boundary

#### Scenario: Mobile horizontal scroll
- **WHEN** user views the homepage on mobile (<768px)
- **THEN** blog cards are arranged in a single horizontal row with touch swipe scrolling and scroll-snap

#### Scenario: Scrollbar hidden
- **WHEN** the blog carousel is rendered on any device
- **THEN** the native scrollbar is not visible (webkit-scrollbar hidden + scrollbar-width none)

### Requirement: Fixed-width blog cards
Each blog card SHALL have a fixed width of 320px on desktop (≥768px) and 280px on mobile (<768px). Cards SHALL NOT shrink. Cards SHALL be separated by a 16px gap.

#### Scenario: Card width on desktop
- **WHEN** viewport is ≥768px
- **THEN** each blog card width is 320px with 16px gap between cards

#### Scenario: Card width on mobile
- **WHEN** viewport is <768px
- **THEN** each blog card width is 280px with 16px gap between cards

### Requirement: Desktop arrow navigation
On desktop viewports (≥768px), the carousel SHALL display left and right arrow buttons. Clicking an arrow SHALL scroll the container by one card width (plus gap) with smooth animation. An arrow SHALL be hidden when the scroll position is at the corresponding boundary.

#### Scenario: Right arrow scrolls forward
- **WHEN** user clicks the right arrow on desktop
- **THEN** the container scrolls right by 336px (320px card + 16px gap) with smooth behavior

#### Scenario: Left arrow scrolls backward
- **WHEN** user clicks the left arrow on desktop
- **THEN** the container scrolls left by 336px with smooth behavior

#### Scenario: Left arrow hidden at start
- **WHEN** the container scroll position is at the left edge (scrollLeft ≈ 0)
- **THEN** the left arrow button is not displayed

#### Scenario: Right arrow hidden at end
- **WHEN** the container scroll position is at the right edge (scrollLeft + clientWidth ≈ scrollWidth)
- **THEN** the right arrow button is not displayed

#### Scenario: Arrows hidden on mobile
- **WHEN** viewport is <768px
- **THEN** arrow buttons are not displayed

### Requirement: Display 6-8 blog posts
The homepage SHALL fetch up to 8 blog posts from Supabase (pinned first, then latest). All fetched posts SHALL be rendered in the carousel.

#### Scenario: 8 posts available
- **WHEN** Supabase has 8+ published blog posts
- **THEN** the carousel displays 8 blog cards

#### Scenario: Fewer than 8 posts
- **WHEN** Supabase has fewer than 8 published blog posts
- **THEN** the carousel displays all available posts without empty placeholders

#### Scenario: Arrows with insufficient content
- **WHEN** the total width of all cards fits within the container without overflow
- **THEN** no arrow buttons are displayed (no scrolling needed)
