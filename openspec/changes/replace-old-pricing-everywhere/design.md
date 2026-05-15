## Design

### tools/page.tsx rewrite
- Remove local `CREDIT_PACKAGES` array using legacy `CREDIT_PRICES`
- Import `CREDIT_PACKAGES` from `../../lib/constants` (already has stripePriceId)
- Add `handleCheckout(priceId, itemId)` function (same pattern as pricing page)
- TierCard: wire "立即订阅" button to `handleCheckout(tier.stripePriceId, tier.id)`
- Credit pack cards: wire "购买" button to `handleCheckout(pack.stripePriceId, pack.id)`
- Show loading state on clicked button
- Handle 401 → redirect to `/login?redirect=/koala/tools`
- Move subscription section above credit packs section
- Remove `showCredits` toggle — always show credit packs
- Preserve bonus labels (+20%/+40%/+60%) and "最划算" highlight on 专业包

### HomeClient.tsx
- Replace "📧 A$1/封起" with "📧 积分制 · 低至 AUD 0.06/积分"

### ProfessorDetailClient.tsx
- Replace "✍️ 生成申请信 (AUD 1)" with "✍️ 生成申请信 (1 积分)"

### chat/page.tsx
- Update credit insufficient message to link to `/koala/pricing`

### test-ai-chat.ts
- Update test assertion to not check for "AUD 1"
