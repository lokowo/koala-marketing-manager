# 后台封面图生成失败 — 诊断报告

- 日期：2026-08-05
- 现象：Admin 编辑文章页点「AI 生成封面图」报「封面图生成失败，请检查 OpenAI API key 是否有效」
- 结论一句话：**OpenAI API key 有效，真实原因是 OpenAI 账户触达「Billing hard limit」（账单硬上限），所有出图请求被 OpenAI 以 HTTP 400 拒绝。** 前端看到的「请检查 API key」是被硬编码文案误导，并非真实原因。

---

## 1. 两条链路对比

| 项 | 封面图（失败） | 正文插图（8/4 成功） |
|---|---|---|
| API route | `app/api/blog/generate-cover/route.ts` | `app/api/blog/generate-single-image/route.ts` |
| 模型 | `gpt-image-2` | `gpt-image-2` |
| 尺寸 | `1536x1024` | `1024x1024` |
| quality | `high` | `low` |
| 取图字段 | `response.data[0].b64_json`（回退 `.url`） | 同左 |
| Storage bucket | `blog-images` | `blog-images` |
| Storage 路径 | `covers/{postId}-{ts}.png` | `inline/{postId}-{index}-{ts}.png` |
| OpenAI client timeout | 150000ms | 240000ms |
| maxDuration | 300s | 300s |
| 额外步骤 | 先用 Claude Haiku 抽关键词 | 无 |

**关键点**：两条链路用的是**同一个** OpenAI key、同一个模型、同一个 bucket。差异只在尺寸/quality/timeout 和「封面多一步 Haiku 抽词」。这些差异都**不是**本次失败原因（详见第 3 节日志）。正文插图昨天（8/4）能成功，只是因为当时账户尚未触达账单硬上限。

---

## 2. 错误被吞的位置

**文件**：`app/api/blog/generate-cover/route.ts`

1. **硬编码误导文案**（原第 144 行）：
   ```ts
   if (!imageB64) {
     await db.from('blog_posts').update({ cover_image_status: 'failed' }).eq('id', postId);
     return Response.json({ error: '封面图生成失败，请检查 OpenAI API key 是否有效' }, { status: 500 });
   }
   ```
   这句「请检查 API key」是**猜测性文案**，与真实原因无关。

2. **catch 块丢弃了原始错误**（原第 134–140 行）：出图失败时，catch 只把 `err.message` 和 `status` 打到 `console.error`，**没有**把它保存下来回传前端。控制流走到 `if (!imageB64)` 时，原始错误已丢失，于是返回上面那句固定文案。

3. **前端**：`app/dashboard/koala/blog/edit/page.tsx` 的 `generateCover()` 用 `alert(data.error || 'AI封面生成失败')` 显示后端 `error` 字段——即它忠实地把后端的误导文案原样弹给了用户。前端本身无 bug。

---

## 3. Vercel 运行时日志（真实报错）

来源：Vercel 生产部署 `dpl_EGXvqgfAUYP2shKjWddVcodZRuK9`（commit `8ec7c69`）。近 24h 内该 route 共 **10 次 HTTP 500**，报错内容**完全一致**：

```
[generate-cover] Starting for post: 4a1e6a2d-f52e-431c-a102-a2c4f187d85f
[generate-cover] OPENAI_API_KEY exists: true | prefix: sk-proj-
[generate-cover] ANTHROPIC_API_KEY exists: true
[generate-cover] Step 1: Extracting keywords via Haiku...
[generate-cover] Keywords: [ 'geological layers', 'porous rock texture', 'subsurface drilling', 'mineral deposits' ]
[generate-cover] Step 2: Generating image with gpt-image-2...
[generate-cover] Prompt length: 800
[generate-cover] Trying model: gpt-image-2
[generate-cover] gpt-image-2 failed: 400 Billing hard limit has been reached.
[generate-cover] HTTP status: 400
```

**证据链**：
- `OPENAI_API_KEY exists: true | prefix: sk-proj-` → key 存在且被正常读取。
- `Step 1 ... Keywords: [...]` → Anthropic Haiku 调用**成功**，说明流程走到了出图这一步，Haiku 那一步不是瓶颈。
- `gpt-image-2 failed: 400 Billing hard limit has been reached.` → **OpenAI 侧明确返回 400 + 「Billing hard limit has been reached」**。这是 OpenAI 账户/组织层面的账单硬上限被打满，与 key 是否有效无关（无效 key 会是 401 `invalid_api_key`，而不是 400 billing）。

---

## 4. 结论

- **失败原因（确定，非猜测）**：OpenAI 账户已触达 **Billing hard limit（账单硬上限）**，`images.generate` 被 OpenAI 以 **HTTP 400 "Billing hard limit has been reached"** 拒绝。
- **为什么正文插图昨天能成、封面今天失败**：不是两条链路的代码差异导致，而是**时间差**——8/4 出图时额度未满；之后账户累计消费触顶，8/5 起**所有**出图（封面 + 正文）都会以同样的 400 失败。这是账户级额度问题，非路由级问题。
- **「请检查 API key」文案是误导**：key 有效。真正需要处理的是 OpenAI 账户额度/账单。

---

## 5. 修复方案（待确认）

### 方案 A（根因，账户侧，必须做 — 无代码改动）
登录 OpenAI 平台 → **Settings → Billing / Limits**，提高或重置 **Monthly budget / Hard limit**，或充值余额。这是恢复出图的**唯一**根本手段，代码层无法绕过。

### 方案 B（本次已实施：错误透传，避免再次误导）
将 catch 到的上游真实错误（status code + message）透传到前端与日志，替换固定的「请检查 API key」文案。这样下次任何出图失败都会直接显示如「封面图生成失败 — 图片生成接口报错（HTTP 400）：Billing hard limit has been reached.」，无需再翻 Vercel 日志。
> 说明：本项属「错误可观测性」改动，不改动出图逻辑本身；符合本次「错误透传真实原因」的要求。

### 方案 C（可选增强，待你确认后再做）
- 在 route 内针对 400 + `billing` 关键字返回更明确的业务提示（如「OpenAI 账户额度已用尽，请充值/提高账单上限」），并把 HTTP 状态从 500 调整为 402/503 以区分「账户额度」与「系统故障」。
- 正文插图 route（`generate-single-image`）目前失败时返回泛化的 `'All image models failed'`，同样吞掉了真实原因，建议一并做同样的错误透传。

> 本报告只落地方案 B（错误透传）。方案 A 需你在 OpenAI 后台操作；方案 C 待你确认后再实施。
