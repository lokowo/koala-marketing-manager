# Ola 视频透明通道诊断报告

> 生成时间: 2026-05-28 10:41:32
> 总计: 35 个视频 | ✅ 0 | ⚠️ 0 | ❌ 35 | ❓ 0

## 判定标准

- **✅ 通过**: pix_fmt 含 alpha 通道，且第 1 帧四角像素 alpha < 10（透明）
- **⚠️ 警告**: 有 alpha 通道但四角不全透明（colorkey 不完美或角落有内容）
- **❌ 失败**: 无 alpha 通道（pix_fmt 不含 'a'），需要重新处理
- **❓ 未知**: 无法提取帧或探测失败

## 详细结果

| # | asset_id | play_mode | pix_fmt | 状态 | 说明 |
|---|----------|-----------|---------|------|------|
| 1 | `b-01-dancing` | loop | `yuv420p` | ❌ | pix_fmt=yuv420p, NO alpha channel — top-left(rgba=254,254,254,255), top-right(rgba=254,254,254,255), bottom-left(rgba=254,254,254,255), bottom-right(rgba=254,254,254,255) |
| 2 | `b-02-confident-pose` | action | `yuv420p` | ❌ | pix_fmt=yuv420p, NO alpha channel — top-left(rgba=251,251,251,255), top-right(rgba=251,251,251,255), bottom-left(rgba=251,251,251,255), bottom-right(rgba=251,251,251,255) |
| 3 | `b-03-sleeping` | idle | `yuv420p` | ❌ | pix_fmt=yuv420p, NO alpha channel — top-left(rgba=242,236,231,255), top-right(rgba=247,239,236,255), bottom-left(rgba=246,240,236,255), bottom-right(rgba=246,240,238,255) |
| 4 | `b-04-workout` | action | `yuv420p` | ❌ | pix_fmt=yuv420p, NO alpha channel — top-left(rgba=250,250,250,255), top-right(rgba=251,251,251,255), bottom-left(rgba=250,250,250,255), bottom-right(rgba=250,250,250,255) |
| 5 | `b-05-teaching` | action | `yuv420p` | ❌ | pix_fmt=yuv420p, NO alpha channel — top-left(rgba=250,250,250,255), top-right(rgba=250,250,250,255), bottom-left(rgba=250,250,250,255), bottom-right(rgba=250,250,250,255) |
| 6 | `b-06-punching` | emotion | `yuv420p` | ❌ | pix_fmt=yuv420p, NO alpha channel — top-left(rgba=250,250,250,255), top-right(rgba=250,250,250,255), bottom-left(rgba=250,250,250,255), bottom-right(rgba=250,250,250,255) |
| 7 | `b-07-nightclub` | loop | `yuv420p` | ❌ | pix_fmt=yuv420p, NO alpha channel — top-left(rgba=250,250,250,255), top-right(rgba=250,250,250,255), bottom-left(rgba=250,250,250,255), bottom-right(rgba=250,250,250,255) |
| 8 | `b-08-ol-teaching` | idle | `yuv420p` | ❌ | pix_fmt=yuv420p, NO alpha channel — top-left(rgba=250,250,250,255), top-right(rgba=250,250,250,255), bottom-left(rgba=251,252,250,255), bottom-right(rgba=251,252,250,255) |
| 9 | `b-09-thank-subscribe-kiss` | action | `yuv420p` | ❌ | pix_fmt=yuv420p, NO alpha channel — top-left(rgba=254,254,254,255), top-right(rgba=252,252,252,255), bottom-left(rgba=254,254,254,255), bottom-right(rgba=254,254,254,255) |
| 10 | `b-10-beg-subscribe` | emotion | `yuv420p` | ❌ | pix_fmt=yuv420p, NO alpha channel — top-left(rgba=254,254,254,255), top-right(rgba=254,254,254,255), bottom-left(rgba=254,254,254,255), bottom-right(rgba=254,254,254,255) |
| 11 | `b-11-outdoor-hiking` | action | `yuv420p` | ❌ | pix_fmt=yuv420p, NO alpha channel — top-left(rgba=247,246,253,255), top-right(rgba=129,151,118,255), bottom-left(rgba=31,30,24,255), bottom-right(rgba=58,62,38,255) |
| 12 | `b-12-post-date-bliss` | emotion | `yuv420p` | ❌ | pix_fmt=yuv420p, NO alpha channel — top-left(rgba=250,250,250,255), top-right(rgba=250,250,250,255), bottom-left(rgba=250,250,250,255), bottom-right(rgba=250,250,250,255) |
| 13 | `b-13-too-full` | emotion | `yuv420p` | ❌ | pix_fmt=yuv420p, NO alpha channel — top-left(rgba=250,250,250,255), top-right(rgba=251,251,251,255), bottom-left(rgba=251,251,251,255), bottom-right(rgba=250,250,250,255) |
| 14 | `c-01-ol-front` | action | `yuv420p` | ❌ | pix_fmt=yuv420p, NO alpha channel — top-left(rgba=250,250,250,255), top-right(rgba=250,250,250,255), bottom-left(rgba=251,251,251,255), bottom-right(rgba=250,250,250,255) |
| 15 | `c-02-ol-seated-legs-crossed` | idle | `yuv420p` | ❌ | pix_fmt=yuv420p, NO alpha channel — top-left(rgba=250,250,250,255), top-right(rgba=250,250,250,255), bottom-left(rgba=250,250,250,255), bottom-right(rgba=250,250,250,255) |
| 16 | `c-02-ol-seated-legs-crossed-listen` | idle | `yuv420p` | ❌ | pix_fmt=yuv420p, NO alpha channel — top-left(rgba=250,250,250,255), top-right(rgba=250,250,250,255), bottom-left(rgba=249,249,249,255), bottom-right(rgba=249,249,249,255) |
| 17 | `c-03-ol-looking-back` | action | `yuv420p` | ❌ | pix_fmt=yuv420p, NO alpha channel — top-left(rgba=251,251,251,255), top-right(rgba=251,251,251,255), bottom-left(rgba=251,251,251,255), bottom-right(rgba=250,250,250,255) |
| 18 | `c-04-boss-trenchcoat` | action | `yuv420p` | ❌ | pix_fmt=yuv420p, NO alpha channel — top-left(rgba=250,250,250,255), top-right(rgba=250,250,250,255), bottom-left(rgba=250,250,250,255), bottom-right(rgba=249,249,249,255) |
| 19 | `c-04-boss-trenchcoat-half` | idle | `yuv420p` | ❌ | pix_fmt=yuv420p, NO alpha channel — top-left(rgba=250,250,250,255), top-right(rgba=250,250,250,255), bottom-left(rgba=249,249,249,255), bottom-right(rgba=250,250,250,255) |
| 20 | `c-05-wall-lean-disdain` | action | `yuv420p` | ❌ | pix_fmt=yuv420p, NO alpha channel — top-left(rgba=250,250,250,255), top-right(rgba=250,250,250,255), bottom-left(rgba=250,250,250,255), bottom-right(rgba=250,250,250,255) |
| 21 | `c-05-wall-lean-disdain-cool` | action | `yuv420p` | ❌ | pix_fmt=yuv420p, NO alpha channel — top-left(rgba=250,250,250,255), top-right(rgba=250,250,250,255), bottom-left(rgba=250,250,250,255), bottom-right(rgba=250,250,250,255) |
| 22 | `c-06-evening-gown-toast` | action | `yuv420p` | ❌ | pix_fmt=yuv420p, NO alpha channel — top-left(rgba=251,251,251,255), top-right(rgba=251,251,251,255), bottom-left(rgba=250,250,250,255), bottom-right(rgba=250,250,250,255) |
| 23 | `c-07-koala-hoodie-cute` | idle | `yuv420p` | ❌ | pix_fmt=yuv420p, NO alpha channel — top-left(rgba=250,250,250,255), top-right(rgba=250,250,250,255), bottom-left(rgba=250,250,250,255), bottom-right(rgba=250,250,250,255) |
| 24 | `c-08-apron-cooking` | idle | `yuv420p` | ❌ | pix_fmt=yuv420p, NO alpha channel — top-left(rgba=250,250,250,255), top-right(rgba=251,251,251,255), bottom-left(rgba=250,250,250,255), bottom-right(rgba=250,250,250,255) |
| 25 | `c-09-pajama-phone` | idle | `yuv420p` | ❌ | pix_fmt=yuv420p, NO alpha channel — top-left(rgba=251,251,251,255), top-right(rgba=251,251,251,255), bottom-left(rgba=251,251,251,255), bottom-right(rgba=251,251,251,255) |
| 26 | `c-12-graduation` | action | `yuv420p` | ❌ | pix_fmt=yuv420p, NO alpha channel — top-left(rgba=251,251,251,255), top-right(rgba=251,251,251,255), bottom-left(rgba=251,251,251,255), bottom-right(rgba=251,251,251,255) |
| 27 | `h-01-night-listen-nobg` | idle | `yuv420p` | ❌ | pix_fmt=yuv420p, NO alpha channel — top-left(rgba=0,0,0,255), top-right(rgba=0,0,0,255), bottom-left(rgba=41,35,31,255), bottom-right(rgba=0,0,0,255) |
| 28 | `h-02-morning-coffee-nobg` | action | `yuv420p` | ❌ | pix_fmt=yuv420p, NO alpha channel — top-left(rgba=0,0,0,255), top-right(rgba=0,0,0,255), bottom-left(rgba=5,4,3,255), bottom-right(rgba=0,0,0,255) |
| 29 | `h-03-encouragement-nobg` | action | `yuv420p` | ❌ | pix_fmt=yuv420p, NO alpha channel — top-left(rgba=0,0,0,255), top-right(rgba=0,0,0,255), bottom-left(rgba=0,0,0,255), bottom-right(rgba=0,0,0,255) |
| 30 | `h-04-late-study-nobg` | idle | `yuv420p` | ❌ | pix_fmt=yuv420p, NO alpha channel — top-left(rgba=0,0,0,255), top-right(rgba=0,0,0,255), bottom-left(rgba=0,0,0,255), bottom-right(rgba=0,0,0,255) |
| 31 | `h-05-serve-coffee-nobg` | action | `yuv420p` | ❌ | pix_fmt=yuv420p, NO alpha channel — top-left(rgba=0,0,0,255), top-right(rgba=0,0,0,255), bottom-left(rgba=0,0,0,255), bottom-right(rgba=0,0,0,255) |
| 32 | `h-06-goodnight-nobg` | action | `yuv420p` | ❌ | pix_fmt=yuv420p, NO alpha channel — top-left(rgba=0,0,0,255), top-right(rgba=0,0,0,255), bottom-left(rgba=1,0,2,255), bottom-right(rgba=1,1,1,255) |
| 33 | `h-07-queen-mode-nobg` | action | `yuv420p` | ❌ | pix_fmt=yuv420p, NO alpha channel — top-left(rgba=0,0,0,255), top-right(rgba=0,0,0,255), bottom-left(rgba=0,0,0,255), bottom-right(rgba=0,0,0,255) |
| 34 | `h-08-nerd-excited-nobg` | action | `yuv420p` | ❌ | pix_fmt=yuv420p, NO alpha channel — top-left(rgba=0,0,0,255), top-right(rgba=0,0,0,255), bottom-left(rgba=0,0,0,255), bottom-right(rgba=4,4,4,255) |
| 35 | `h-09-bubbly-boba-nobg` | idle | `yuv420p` | ❌ | pix_fmt=yuv420p, NO alpha channel — top-left(rgba=0,0,0,255), top-right(rgba=0,0,0,255), bottom-left(rgba=0,0,2,255), bottom-right(rgba=0,0,0,255) |

## ❌ 需要重新处理的文件 (35)

- `b-01-dancing` — pix_fmt=yuv420p, NO alpha channel — top-left(rgba=254,254,254,255), top-right(rgba=254,254,254,255), bottom-left(rgba=254,254,254,255), bottom-right(rgba=254,254,254,255)
- `b-02-confident-pose` — pix_fmt=yuv420p, NO alpha channel — top-left(rgba=251,251,251,255), top-right(rgba=251,251,251,255), bottom-left(rgba=251,251,251,255), bottom-right(rgba=251,251,251,255)
- `b-03-sleeping` — pix_fmt=yuv420p, NO alpha channel — top-left(rgba=242,236,231,255), top-right(rgba=247,239,236,255), bottom-left(rgba=246,240,236,255), bottom-right(rgba=246,240,238,255)
- `b-04-workout` — pix_fmt=yuv420p, NO alpha channel — top-left(rgba=250,250,250,255), top-right(rgba=251,251,251,255), bottom-left(rgba=250,250,250,255), bottom-right(rgba=250,250,250,255)
- `b-05-teaching` — pix_fmt=yuv420p, NO alpha channel — top-left(rgba=250,250,250,255), top-right(rgba=250,250,250,255), bottom-left(rgba=250,250,250,255), bottom-right(rgba=250,250,250,255)
- `b-06-punching` — pix_fmt=yuv420p, NO alpha channel — top-left(rgba=250,250,250,255), top-right(rgba=250,250,250,255), bottom-left(rgba=250,250,250,255), bottom-right(rgba=250,250,250,255)
- `b-07-nightclub` — pix_fmt=yuv420p, NO alpha channel — top-left(rgba=250,250,250,255), top-right(rgba=250,250,250,255), bottom-left(rgba=250,250,250,255), bottom-right(rgba=250,250,250,255)
- `b-08-ol-teaching` — pix_fmt=yuv420p, NO alpha channel — top-left(rgba=250,250,250,255), top-right(rgba=250,250,250,255), bottom-left(rgba=251,252,250,255), bottom-right(rgba=251,252,250,255)
- `b-09-thank-subscribe-kiss` — pix_fmt=yuv420p, NO alpha channel — top-left(rgba=254,254,254,255), top-right(rgba=252,252,252,255), bottom-left(rgba=254,254,254,255), bottom-right(rgba=254,254,254,255)
- `b-10-beg-subscribe` — pix_fmt=yuv420p, NO alpha channel — top-left(rgba=254,254,254,255), top-right(rgba=254,254,254,255), bottom-left(rgba=254,254,254,255), bottom-right(rgba=254,254,254,255)
- `b-11-outdoor-hiking` — pix_fmt=yuv420p, NO alpha channel — top-left(rgba=247,246,253,255), top-right(rgba=129,151,118,255), bottom-left(rgba=31,30,24,255), bottom-right(rgba=58,62,38,255)
- `b-12-post-date-bliss` — pix_fmt=yuv420p, NO alpha channel — top-left(rgba=250,250,250,255), top-right(rgba=250,250,250,255), bottom-left(rgba=250,250,250,255), bottom-right(rgba=250,250,250,255)
- `b-13-too-full` — pix_fmt=yuv420p, NO alpha channel — top-left(rgba=250,250,250,255), top-right(rgba=251,251,251,255), bottom-left(rgba=251,251,251,255), bottom-right(rgba=250,250,250,255)
- `c-01-ol-front` — pix_fmt=yuv420p, NO alpha channel — top-left(rgba=250,250,250,255), top-right(rgba=250,250,250,255), bottom-left(rgba=251,251,251,255), bottom-right(rgba=250,250,250,255)
- `c-02-ol-seated-legs-crossed` — pix_fmt=yuv420p, NO alpha channel — top-left(rgba=250,250,250,255), top-right(rgba=250,250,250,255), bottom-left(rgba=250,250,250,255), bottom-right(rgba=250,250,250,255)
- `c-02-ol-seated-legs-crossed-listen` — pix_fmt=yuv420p, NO alpha channel — top-left(rgba=250,250,250,255), top-right(rgba=250,250,250,255), bottom-left(rgba=249,249,249,255), bottom-right(rgba=249,249,249,255)
- `c-03-ol-looking-back` — pix_fmt=yuv420p, NO alpha channel — top-left(rgba=251,251,251,255), top-right(rgba=251,251,251,255), bottom-left(rgba=251,251,251,255), bottom-right(rgba=250,250,250,255)
- `c-04-boss-trenchcoat` — pix_fmt=yuv420p, NO alpha channel — top-left(rgba=250,250,250,255), top-right(rgba=250,250,250,255), bottom-left(rgba=250,250,250,255), bottom-right(rgba=249,249,249,255)
- `c-04-boss-trenchcoat-half` — pix_fmt=yuv420p, NO alpha channel — top-left(rgba=250,250,250,255), top-right(rgba=250,250,250,255), bottom-left(rgba=249,249,249,255), bottom-right(rgba=250,250,250,255)
- `c-05-wall-lean-disdain` — pix_fmt=yuv420p, NO alpha channel — top-left(rgba=250,250,250,255), top-right(rgba=250,250,250,255), bottom-left(rgba=250,250,250,255), bottom-right(rgba=250,250,250,255)
- `c-05-wall-lean-disdain-cool` — pix_fmt=yuv420p, NO alpha channel — top-left(rgba=250,250,250,255), top-right(rgba=250,250,250,255), bottom-left(rgba=250,250,250,255), bottom-right(rgba=250,250,250,255)
- `c-06-evening-gown-toast` — pix_fmt=yuv420p, NO alpha channel — top-left(rgba=251,251,251,255), top-right(rgba=251,251,251,255), bottom-left(rgba=250,250,250,255), bottom-right(rgba=250,250,250,255)
- `c-07-koala-hoodie-cute` — pix_fmt=yuv420p, NO alpha channel — top-left(rgba=250,250,250,255), top-right(rgba=250,250,250,255), bottom-left(rgba=250,250,250,255), bottom-right(rgba=250,250,250,255)
- `c-08-apron-cooking` — pix_fmt=yuv420p, NO alpha channel — top-left(rgba=250,250,250,255), top-right(rgba=251,251,251,255), bottom-left(rgba=250,250,250,255), bottom-right(rgba=250,250,250,255)
- `c-09-pajama-phone` — pix_fmt=yuv420p, NO alpha channel — top-left(rgba=251,251,251,255), top-right(rgba=251,251,251,255), bottom-left(rgba=251,251,251,255), bottom-right(rgba=251,251,251,255)
- `c-12-graduation` — pix_fmt=yuv420p, NO alpha channel — top-left(rgba=251,251,251,255), top-right(rgba=251,251,251,255), bottom-left(rgba=251,251,251,255), bottom-right(rgba=251,251,251,255)
- `h-01-night-listen-nobg` — pix_fmt=yuv420p, NO alpha channel — top-left(rgba=0,0,0,255), top-right(rgba=0,0,0,255), bottom-left(rgba=41,35,31,255), bottom-right(rgba=0,0,0,255)
- `h-02-morning-coffee-nobg` — pix_fmt=yuv420p, NO alpha channel — top-left(rgba=0,0,0,255), top-right(rgba=0,0,0,255), bottom-left(rgba=5,4,3,255), bottom-right(rgba=0,0,0,255)
- `h-03-encouragement-nobg` — pix_fmt=yuv420p, NO alpha channel — top-left(rgba=0,0,0,255), top-right(rgba=0,0,0,255), bottom-left(rgba=0,0,0,255), bottom-right(rgba=0,0,0,255)
- `h-04-late-study-nobg` — pix_fmt=yuv420p, NO alpha channel — top-left(rgba=0,0,0,255), top-right(rgba=0,0,0,255), bottom-left(rgba=0,0,0,255), bottom-right(rgba=0,0,0,255)
- `h-05-serve-coffee-nobg` — pix_fmt=yuv420p, NO alpha channel — top-left(rgba=0,0,0,255), top-right(rgba=0,0,0,255), bottom-left(rgba=0,0,0,255), bottom-right(rgba=0,0,0,255)
- `h-06-goodnight-nobg` — pix_fmt=yuv420p, NO alpha channel — top-left(rgba=0,0,0,255), top-right(rgba=0,0,0,255), bottom-left(rgba=1,0,2,255), bottom-right(rgba=1,1,1,255)
- `h-07-queen-mode-nobg` — pix_fmt=yuv420p, NO alpha channel — top-left(rgba=0,0,0,255), top-right(rgba=0,0,0,255), bottom-left(rgba=0,0,0,255), bottom-right(rgba=0,0,0,255)
- `h-08-nerd-excited-nobg` — pix_fmt=yuv420p, NO alpha channel — top-left(rgba=0,0,0,255), top-right(rgba=0,0,0,255), bottom-left(rgba=0,0,0,255), bottom-right(rgba=4,4,4,255)
- `h-09-bubbly-boba-nobg` — pix_fmt=yuv420p, NO alpha channel — top-left(rgba=0,0,0,255), top-right(rgba=0,0,0,255), bottom-left(rgba=0,0,2,255), bottom-right(rgba=0,0,0,255)

---
_由 scripts/check-video-alpha.mjs 自动生成_
