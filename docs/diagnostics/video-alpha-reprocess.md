# Ola 视频透明通道 — 重处理报告

> 日期: 2026-05-28
> 操作: 全部 35 个视频重编码为 VP9 + yuva420p 透明通道
> 状态: ✅ 完成，全部已上传至 Supabase Storage

## 背景

初始诊断脚本 `check-video-alpha.mjs` 使用 ffprobe `pix_fmt` 字段判断透明通道，
报告全部 35 个视频为 `yuv420p`（无 alpha），判定为 ❌ 失败。

## 关键发现：ffprobe 误报 VP9 alpha

**ffprobe 对 VP9+alpha WebM 有已知报告 bug：**
- `pix_fmt` 字段始终显示 `yuv420p`，即使视频包含完整 alpha 通道
- 正确的判定方式：检查 `stream_tags.alpha_mode` 是否为 `1`

### 验证方法

```bash
# 方法 1: 检查 alpha_mode tag (✅ 可靠)
ffprobe -v quiet -select_streams v:0 \
  -show_entries stream_tags=alpha_mode -of csv=p=0 video.webm
# 输出 "1" = 有 alpha

# 方法 2: 用 libvpx-vp9 解码器提取帧 (✅ 可靠)
ffmpeg -c:v libvpx-vp9 -i video.webm -frames:v 1 -f rawvideo -pix_fmt rgba - | \
  python3 -c "import sys; d=sys.stdin.buffer.read(); print('alpha corner:', d[3])"
# alpha=0 = 透明，alpha=255 = 不透明
```

### 验证结果

| 视频 | alpha_mode | 解码器验证 (角落 alpha) | 状态 |
|------|-----------|----------------------|------|
| 原始 Supabase 文件 | 1 | alpha=0 (透明) | ✅ 已有 alpha |
| 重处理后文件 | 1 | alpha=0 (透明) | ✅ alpha 正确 |

## 处理参数

### B/C 系列 (白底去除)
```bash
ffmpeg -i input.mp4 \
  -vf "colorkey=0xFBFBFB:0.35:0.20,colorkey=0xFAFAFA:0.30:0.15,format=yuva420p" \
  -c:v libvpx-vp9 -pix_fmt yuva420p -auto-alt-ref 0 \
  -b:v 1M -crf 30 -an output.webm
```

### H 系列 (黑底去除)
```bash
ffmpeg -i input.mp4 \
  -vf "colorkey=0x000000:0.15:0.10,format=yuva420p" \
  -c:v libvpx-vp9 -pix_fmt yuva420p -auto-alt-ref 0 \
  -b:v 1M -crf 30 -an output.webm
```

## 上传清单 (35/35 ✅)

### B 系列 — 动作场景 (13)
| asset_id | 大小 |
|----------|------|
| b-01-dancing | 0.9MB |
| b-02-confident-pose | 0.7MB |
| b-03-sleeping | 0.7MB |
| b-04-workout | 0.7MB |
| b-05-teaching | 0.9MB |
| b-06-punching | 0.9MB |
| b-07-nightclub | 1.0MB |
| b-08-ol-teaching | 0.6MB |
| b-09-thank-subscribe-kiss | 0.7MB |
| b-10-beg-subscribe | 0.9MB |
| b-11-outdoor-hiking | 0.9MB |
| b-12-post-date-bliss | 0.7MB |
| b-13-too-full | 0.8MB |

### C 系列 — 反差装扮 (13)
| asset_id | 大小 |
|----------|------|
| c-01-ol-front | 0.6MB |
| c-02-ol-seated-legs-crossed | 0.6MB |
| c-02-ol-seated-legs-crossed-listen | 0.7MB |
| c-03-ol-looking-backmp4 | 0.7MB |
| c-04-boss-trenchcoat | 0.6MB |
| c-04-boss-trenchcoat-half | 0.8MB |
| c-05-wall-lean-disdain | 0.6MB |
| c-05-wall-lean-disdain-cool | 0.7MB |
| c-06-evening-gown-toast | 0.7MB |
| c-07-koala-hoodie-cute | 0.6MB |
| c-08-apron-cooking | 0.7MB |
| c-09-pajama-phone | 0.7MB |
| c-12-graduation | 0.6MB |

### H 系列 — 头像半身 (9)
| asset_id | 大小 |
|----------|------|
| h-01-night-listen-nobg | 0.9MB |
| h-02-morning-coffee-nobg | 0.9MB |
| h-03-encouragement-nobg | 0.9MB |
| h-04-late-study-nobg | 0.7MB |
| h-05-serve-coffee-nobg | 0.8MB |
| h-06-goodnight-nobg | 1.0MB |
| h-07-queen-mode-nobg | 0.9MB |
| h-08-nerd-excited-nobg | 1.5MB |
| h-09-bubbly-boba-nobg | 1.3MB |

## 浏览器兼容性

VP9 alpha WebM 透明通道支持:
- ✅ Chrome 31+
- ✅ Edge 79+
- ✅ Firefox 28+
- ✅ Opera 18+
- ❌ Safari (需要 HEVC alpha 或 fallback 到静态 PNG)

如果 Safari 用户看到黑/白背景，需要降级到静态 PNG — 当前 OlaFloatingMascot
已有此 fallback 逻辑（video 加载失败时显示 image_url）。

## 结论

- 原始文件和重处理文件均包含有效 VP9 alpha 透明通道
- ffprobe `pix_fmt` 报告为 `yuv420p` 是已知误报，不影响实际渲染
- 重处理的 35 个文件已全部上传至 Supabase Storage `ola-assets/animations/`
- 旧版诊断报告 `video-alpha-check.md` 的 ❌ 判定不准确，已被此报告替代
