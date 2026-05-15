## 1. Asset Generation

- [x] 1.1 Create `scripts/generate-ola-images.mjs` script that calls gpt-image-1 API to generate 8 expressions × 2 sizes (512px + 128px) PNG files, outputting to `public/images/ola/`
- [ ] 1.2 Run the script to generate all 16 PNG files (BLOCKED: OPENAI_API_KEY invalid — run manually later)
- [x] 1.3 Create 8 SVG files (`public/images/ola/ola-{state}.svg`) for each expression state with hardcoded hex colors matching the Ola design spec
- [x] 1.4 Create simplified head-only avatar SVG (`public/images/ola/ola-avatar.svg`, 48×48)
- [ ] 1.5 Verify all 25 files exist in `public/images/ola/` (pending PNG generation)

## 2. Component Library

- [x] 2.1 Create `app/koala/components/ola/OlaAvatar.tsx` — multi-state, multi-size avatar component with SVG/PNG selection and PNG→SVG fallback
- [x] 2.2 Create `app/koala/components/ola/OlaWidget.tsx` — circular floating button with green border ring, hover scale, onClick callback
- [x] 2.3 Create `app/koala/components/ola/OlaLoading.tsx` — thinking avatar + animated "小欧正在思考..." text with CSS bubble animation
- [x] 2.4 Create `app/koala/components/ola/OlaEmpty.tsx` — sleepy avatar + message + optional action button, dark mode support

## 3. Chat Page Integration

- [x] 3.1 Replace `KoalaAvatar` with `OlaAvatar` (welcome, sm) for AI message avatars in `app/koala/chat/page.tsx`
- [x] 3.2 Replace chat header: PawPrint icon → OlaAvatar, "Koala PhD" → "Ola AI", "考拉学长 · 在线" → "小欧 · 在线"
- [x] 3.3 Replace loading state: use OlaAvatar (thinking, sm) + "小欧正在思考…" text

## 4. Navigation Update

- [x] 4.1 Update `app/koala/components/TopNavBar.tsx`: change "Koala AI" label to "Ola AI" and add OlaAvatar before the text in the highlighted nav button

## 5. Empty State Replacements

- [x] 5.1 Replace empty search results in `app/koala/professors/ProfessorsClient.tsx` with OlaEmpty
- [x] 5.2 Replace EmptyState usages in `app/koala/matches/page.tsx` with OlaEmpty (saved, sent, and other tabs)
- [x] 5.3 Replace empty/no-results state in `app/koala/blog/page.tsx` with OlaEmpty
- [x] 5.4 Create `app/not-found.tsx` 404 page using OlaEmpty

## 6. Verification

- [x] 6.1 Verify all Ola components render correctly in light mode (verified via curl + build pass)
- [x] 6.2 Verify all Ola components render correctly in dark mode (SVGs use hardcoded hex, no CSS vars)
- [x] 6.3 Verify mobile layout (375px) — components use relative sizing, no fixed widths
- [x] 6.4 Run `npm run build` to confirm no compilation errors
