## 1. Clean up tools page

- [x] 1.1 Remove credit packs grid, credit usage explanation, handleCheckout function, and unused imports (CREDIT_PACKAGES, Loader2, Zap, useState for loadingId/toast) from `app/koala/tools/page.tsx`
- [x] 1.2 Update page title from "工具 & 定价" to "免费工具箱" and subtitle accordingly
- [x] 1.3 Add "需要更多积分？查看定价 →" link at bottom of tools page pointing to `/koala/pricing`

## 2. Add navigation entry points

- [x] 2.1 Add "定价" link with CreditCard icon to TopNavBar NAV_ITEMS between "教授库" and "我的"
- [x] 2.2 Add "充值/订阅 →" link in my-profile credits card next to "查看积分明细 →", linking to `/koala/pricing`

## 3. Verify

- [x] 3.1 npm run build passes
- [x] 3.2 /koala/tools shows only free tools, no credit packs
- [x] 3.3 TopNavBar shows "定价" link on desktop
- [x] 3.4 /koala/my-profile credits card has "充值/订阅 →" link (requires auth to render)
