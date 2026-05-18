## Why

Top navigation has 6 items (系统/发现/教授&学者库/Ola AI/博客/我的) which is cluttered. Reducing to 4 core items (首页/Ola AI/教授库/我的) improves UX. Blog access moves to homepage preview section. System access already exists in "我的" page for admin/sales. Also fixing a Sentry error where double-clicking share triggers `InvalidStateError`.

## What Changes

- **TopNavBar**: Remove 博客 from nav items, rename 发现→首页, shorten 教授&学者库→教授库
- **BottomTabBar**: Restructure to 4 tabs: 首页/Ola AI (center)/教授库/我的
- **Homepage**: Blog preview section already exists (line 546) — no new work needed
- **My Profile**: Admin/sales entry already exists (line 1750) — no new work needed
- **ShareQR**: Add isSharing lock to prevent double-click error

## Capabilities

### New Capabilities
(none)

### Modified Capabilities
(none — UI restructuring and bug fix only)

## Impact

- `app/koala/components/TopNavBar.tsx` — nav items
- `app/koala/components/BottomTabBar.tsx` — tab structure
- `app/dashboard/sales/page.tsx` — shareQR function
- All existing routes remain accessible via direct URL
