## Approach

Direct string replacement in `app/koala/home/HomeClient.tsx`. No logic changes, no new components, no refactoring.

## Changes

| Location | Line ~  | Current | New |
|----------|---------|---------|-----|
| Stats card label | 627 | `认证导师` | `教授·学者·研究员` |
| Stats card number | 630 | `8` | `30+` |
| Stats card label | 631 | `Go8 大学` | `澳洲大学` |
| Step 1 features | 329 | `覆盖 8 所 Go8 大学` | `覆盖全澳 30+ 所大学` |
| Step 2 desc | 338 | `导师中` | `导师/学者中` |

## Decisions

- Keep `profCount` dynamic variable for the professor count stat — only change the label beneath it
- Step 2 features array `${profCount} 导师库` stays unchanged (导师库 is a product name)
- "免费匹配导师" and "浏览导师库" buttons unchanged per requirements
