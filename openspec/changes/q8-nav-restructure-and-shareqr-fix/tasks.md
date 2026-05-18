## Tasks

### Task 1: TopNavBar — reduce to 4 items

**File**: `app/koala/components/TopNavBar.tsx`

- Remove 博客 entry from NAV_ITEMS
- Rename "发现" → "首页"
- Rename "教授&学者库" → "教授库"
- Remove unused `BookOpen` import

### Task 2: BottomTabBar — restructure to 4 tabs

**File**: `app/koala/components/BottomTabBar.tsx`

- LEFT_TABS: [首页 → /koala/discover]
- CENTER: Ola AI (keep as-is)
- RIGHT_TABS: [教授库 → /koala/professors, 我的 → /koala/my-profile]
- Remove 博客 and 匹配 tabs
- Update imports (remove BookOpen/Heart, add Users/UserCircle as needed)

### Task 3: ShareQR — add sharing lock

**File**: `app/dashboard/sales/page.tsx`

- Add `isSharing` state
- Wrap navigator.share() in try/catch with guard
- Handle AbortError silently

### Verification

- `npm run build` passes
- Desktop nav shows: 首页 / Ola AI / 教授库 / 我的
- Mobile bottom bar shows: 首页 / Ola (center) / 教授库 / 我的
- /koala/blog still accessible via direct URL
- shareQR double-click no longer throws
