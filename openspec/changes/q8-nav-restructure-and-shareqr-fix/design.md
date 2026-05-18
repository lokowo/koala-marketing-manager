## Approach

Minimal edits to three files. No new components or routes.

## TopNavBar Changes

Current NAV_ITEMS (5 items):
- 发现 → /koala/discover
- 教授&学者库 → /koala/professors
- Ola AI → /koala/chat (highlight)
- 博客 → /koala/blog
- 我的 → /koala/my-profile

New NAV_ITEMS (4 items):
- 首页 → /koala/discover
- Ola AI → /koala/chat (highlight)
- 教授库 → /koala/professors
- 我的 → /koala/my-profile

Theme toggle button stays as-is (it's "系统/浅色/深色" cycling, not a nav item).

## BottomTabBar Changes

Current: LEFT_TABS [发现, 教授] + CENTER [Ola] + RIGHT_TABS [博客, 匹配]

New: LEFT_TABS [首页, 教授库] + CENTER [Ola] + RIGHT_TABS [我的] (drop 博客 and 匹配, add 我的)

Actually simpler: LEFT [首页] + CENTER [Ola AI] + RIGHT [教授库, 我的]

## ShareQR Fix

Add `isSharing` state lock. Guard entry, set true, try/catch navigator.share(), finally set false. Disable button during share.

## Already Done (no work needed)

- Blog preview on homepage: already at HomeClient.tsx line 546
- System/admin entry in 我的: already at my-profile/page.tsx line 1750
