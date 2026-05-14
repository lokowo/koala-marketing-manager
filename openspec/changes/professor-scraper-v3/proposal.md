## Status: ALREADY IMPLEMENTED

The 3-layer professor scraper was already built and committed as `scripts/scrape-professors-v2.ts` in commit `82d1e7b`.

## Why

当前数据库有 20,244 位教授，仅 4,238 位 Verified。之前的采集方案（`scrape-university-professors.ts`）使用 Claude Sonnet + web_search tool，token 消耗过高。需要一个三层递进方案将成本从 ~$0.05/教授降到 ~$0.003/教授。

## What Was Built

`scripts/scrape-professors-v2.ts` (630 lines) — 三层教授数据采集脚本：
- **Layer 1**: fetch + cheerio 抓取 8 所 Go8 大学官网，每校独立 CSS selector
- **Layer 2**: OpenAlex API 按 ROR ID 补充 h_index、works_count、cited_by_count、topics
- **Layer 3**: Claude Haiku 仅对缺少 research_areas 的教授生成研究方向

CLI: `npm run scrape:v2 -- "UNSW Sydney"` 或 `npm run scrape:v2 -- all`

## Next Steps

脚本已就绪，但**尚未运行**。用户明确要求先 push 确认代码再跑。
需要实际运行脚本并验证各大学的 CSS selector 是否正确抓取到数据。
