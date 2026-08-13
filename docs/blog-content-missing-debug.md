# 博客正文缺失 —— 只读诊断报告

- 日期：2026-08-14
- 范围：只读诊断，**未修改任何代码或数据**
- 现象：后台 AI 选题生成的新文章，预览只显示标题、封面、一段 CTA 引用块和标签，正文核心内容不存在
- 结论先行：**这是数据层问题（正文确实没入库），不是渲染层问题。** 根因在 `app/api/blog/generate/route.ts` 的 `parseArticleResponse` + JSON 修复回退路径：当元数据 JSON 因**未转义的引号**解析失败时，代码会走 Haiku「修复」回退，而该回退**只恢复元数据、显式丢弃正文**，最终只把系统追加的 CTA 存进库。

---

## 1. 数据层还是渲染层？→ 数据层

直接查库确认存储的 `content_zh` 本身就只剩 CTA，与前端渲染无关。

受影响文章（用户说的「2026-08-14 生成」对应 UTC `2026-08-13 23:19`，悉尼时区 UTC+10 即 08-14 早上）：

| 字段 | 值 |
|---|---|
| id | `c90ef045-3d8c-4008-891c-7ca72d5390cf` |
| slug | `australias-phd-student-mental-health-support-system-2026-latest-upgrade-has-your-1786663238187` |
| title_zh | 澳洲博士生心理健康支持体系2026年最新升级：你的大学有没有跟上？ |
| category / status | student_life / draft |
| created_at | 2026-08-13 23:20:38 UTC |
| **length(content_zh)** | **86** |
| length(content_en) | 0 |
| excerpt_zh | 完整（约 120 字，正常）|
| tags | 完整（5 个，正常）|
| content_embedding / topic_embedding | 均非空 |

`content_zh` 全文（前 300 字，实际总长仅 86）：

```
\n\n> 从选方向到联系导师，如果你需要一点澳洲本地的学术内线，Koala PhD（koalaphd.com）汇集了各校在研课题与导师资源，帮你把 PhD 申请规划得更清楚。
```

**关键量化对齐**：CTA 变体 #4（zh）长度 = 84 字符，`\n\n` + CTA = **86**，与 `length(content_zh)=86` 精确吻合。
即 `content_zh = "" .trim() + "\n\n" + CTA#4` —— **正文核心为空字符串，只剩系统追加的 CTA。**

明确判定：**正文确实缺失（未入库）**，标题/摘要/标签/封面都正常。渲染层无需排查。

### 2026-08-05（CTA 改造）之后非教授类文章正文长度分布

| 日期(UTC) | 篇数 | zh_min | zh_avg | zh_max | <200字 | 空(=0) |
|---|---|---|---|---|---|---|
| 2026-08-05 | 1 | 1309 | 1309 | 1309 | 0 | 0 |
| 2026-08-06 | 1 | 3796 | 3796 | 3796 | 0 | 0 |
| 2026-08-10 | 1 | 3796 | 3796 | 3796 | 0 | 0 |
| 2026-08-12 | 1 | 3369 | 3369 | 3369 | 0 | 0 |
| **2026-08-13** | **1** | **86** | **86** | **86** | **1** | 0 |

CTA 改造后只有 08-13 这 1 篇异常（86 字，只剩 CTA），其余正文长度正常。

---

## 2. 生成链路逐段排查

文件：`app/api/blog/generate/route.ts`

### 环节 A — 正文核心产出（LLM 调用）

```ts
const zhResponse = await withTimeout(
  anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 16000,
    messages: [{ role: 'user', content: `... 首先返回一行 JSON（只含元数据）...
      然后输出分隔符 ---CONTENT--- 然后输出正文 markdown 原文（不要转义、不要包在 JSON 里）。` }],
    system: SYSTEM_PROMPT,
  }),
  120000, '中文文章生成',
);
const zhText = zhResponse.content[0].type === 'text' ? zhResponse.content[0].text : '';
```

设计意图：正文以**裸 markdown** 放在 `---CONTENT---` 之后，只有元数据在 JSON 里——本意就是让正文避开 JSON 转义风险。

运行时日志（trace `c2e9bfa3…`，23:19:33）：

```
[blog/generate] zh stop_reason: end_turn output_tokens: 2811 text_len: 3093
[blog/generate] body gate PASSED: { topic: '澳洲博士生心理健康支持体系…', maxSim: 0.1823, matchedId: '8eef3088…' }
```

→ `stop_reason=end_turn`（**未被截断**），`output_tokens=2811`，**`text_len=3093`**。
**LLM 确实返回了完整约 3093 字的内容**，正文并非没生成。问题在解析/组装环节。

### 环节 B — 解析（这是丢失正文的地方）

```ts
function parseArticleResponse(text: string) {
  const SEP = '---CONTENT---';
  const idx = text.indexOf(SEP);
  if (idx === -1) {
    // 无分隔符：整体当 JSON 解析，取 obj.contentZh
    const obj = safeParseJSON(text);
    return { ...contentZh: String(obj.contentZh || '') };
  }
  const metaPart = text.slice(0, idx);
  const contentPart = text.slice(idx + SEP.length).trim();
  const meta = safeParseJSON(metaPart);          // ← 若 metaPart 是坏 JSON，这里抛错
  return { titleZh, excerptZh, contentZh: contentPart, tags };
}
```

`safeParseJSON` 只做两件事：剥 ```` ``` ```` 围栏、去掉尾逗号。**无法修复字符串内未转义的引号。**

调用处的 try/catch 回退：

```ts
try {
  zhData = parseArticleResponse(zhText);
} catch {
  try {
    // ↓↓↓ 用 Haiku 修 JSON，但 prompt 明确要求"只要元数据、不要正文"
    const fixResponse = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      messages: [{ role: 'user', content:
        `... return ONLY valid JSON with fields: titleZh, excerptZh, tags, imageKeywords.
         Do NOT include the article body — only the metadata fields. ...\n\n${zhText.slice(0, 8000)}` }],
      ...
    });
    const fixText = ...;
    zhData = parseArticleResponse(fixText);   // fixText 无 ---CONTENT---、无 contentZh → contentZh=''
  } catch {
    console.error('[blog/generate] JSON fix failed …');   // ← 只有"修复也失败"才打日志
    return Response.json({ error: 'AI 返回格式异常，请重试' }, { status: 500 });
  }
}
```

**触发链（本篇的确切路径）**：

1. 库中存储的 `excerpt_zh` 含 **ASCII 双引号**：`…这些"隐形福利"同样值得…`。
   这说明 LLM 产出的元数据 JSON 那一行里，`excerptZh` 的值内嵌了**未转义的 `"`**：
   `{"excerptZh":"…这些"隐形福利"同样…", …}` → JSON 非法。
2. `parseArticleResponse` 走 `SEP` 分支 → `safeParseJSON(metaPart)` 抛错（尾逗号修复救不了未转义引号）→ `parseArticleResponse` 整体抛错。
   ⚠️ **注意**：此时 `contentPart`（分隔符后的裸 markdown 正文）本来是完好的，但因为整个函数抛错，**这段好正文被一起丢弃**。
3. 进入 Haiku 修复回退。修复 prompt 明确 **"Do NOT include the article body"** → 返回的 `fixText` 只有元数据、且**正确转义**了引号（这正是库里 excerpt 双引号被保留下来的原因）。
4. `parseArticleResponse(fixText)`：`fixText` 里无 `---CONTENT---` → 走无分隔符分支 → `obj.contentZh` 不存在 → **`contentZh = ''`**。
5. 修复**成功**（未抛错）→ 不会打印任何日志（`JSON fix failed` 只在失败时打）→ **静默丢正文**。

这与日志完全自洽：没有 `JSON fix failed`、没有 fail-closed、`body gate PASSED` 照常打印。

### 环节 C — 剥离旧 CTA？→ 不存在剥离逻辑

排查项提到"剥离旧 CTA 的匹配逻辑是否贪婪截断正文"。**代码里没有任何剥离/正则截断旧 CTA 的逻辑**（08-05 改造已改为让 LLM 不自写 CTA，故无需剥离）。因此"贪婪正则吃掉正文"这一假设**排除**，不是本次原因。

### 环节 D — 追加 CTA：是"拼接"，非"覆盖"

```ts
const postId = randomUUID();
const cta = CTA_VARIANTS[ctaIndexFromId(postId, CTA_VARIANTS.length)];
const finalContentZh = `${(zhData.contentZh || '').trim()}\n\n${cta.zh}`;   // 拼接
```

是拼接不是覆盖。但当 `zhData.contentZh === ''` 时，`finalContentZh` 退化为 `"\n\n" + CTA`（86 字），CTA 反而成了"唯一可见内容"，制造了"只有 CTA 引用块"的观感。CTA 逻辑本身无 bug，只是**放大**了上游正文丢失的后果。

### 环节 E — 正文闸门未拦住"空正文"（次要缺陷）

```ts
bodyEmbedding = await createEmbedding(zhData.contentZh || '');   // 对空串求 embedding
```

`createEmbedding('')` 未抛错、正常返回向量，`body gate` 以 `maxSim=0.1823` **PASSED**。
即**空/近空正文能顺利穿过查重闸门**——闸门只防重复，不防"正文为空"。这让空正文一路写库、无告警。

---

## 3. 运行时日志（Vercel）

项目 `prj_4SHGAqd0QemSpJ9lc9kl04hlkNYQ` / team `team_1CQedB1JlAgycVXNoQJjVws3`，窗口 2026-08-13T22:30–2026-08-14T00:30Z：

| 时间(UTC) | 事件 | 关键输出 |
|---|---|---|
| 23:19:33 | POST /api/blog/generate **200** | `zh stop_reason: end_turn  output_tokens: 2811  text_len: 3093`；`body gate PASSED maxSim 0.1823` |
| 23:20:38 | POST /api/blog/generate-cover 403 | 首次触发（cookie/鉴权）|
| 23:21:32 | POST /api/blog/generate-cover 200 | 封面成功（post c90ef045）|
| 23:23:10 | POST /api/blog/generate-cover 200 | 二次封面（post c90ef045）|

日志解读：
- **LLM 返回长度 = 3093 字符（output_tokens 2811）**，`end_turn`，**未截断**。正文核心已生成。
- **闸门判定**：`body gate PASSED, maxSim 0.1823`——对（已被清空的）正文求 embedding 后放行。
- **入库前后正文长度**：入库前 `zhData.contentZh=''`（经 Haiku 修复回退后被清空）→ 拼接 CTA → 入库 `content_zh` 长度 **86**。
- 全程**无** `JSON fix failed`、**无** `TRUNCATED by max_tokens`、**无** fail-closed —— 印证是"修复成功但丢正文"的**静默**路径。

---

## 4. 影响面

只读全站统计（`category <> 'professor_spotlight'` 且 `length(content_zh) < 300`）：

| id | 日期(UTC) | category | status | zh_len | 说明 |
|---|---|---|---|---|---|
| `c90ef045-3d8c-4008-891c-7ca72d5390cf` | 2026-08-13 | student_life | draft | 86 | **本次 CTA 时代受影响文章**：只剩 CTA#4 |
| `c9ce10f2-8afb-4521-b01f-42264bd565a5` | 2026-08-02 | student_life | published | 0 | CTA 改造（08-05）**之前**：完全空正文、无 CTA。属同类"正文丢失"但早于本次机制，需单列关注 |

- **本次报告核心受影响文章数：1**（`c90ef045`，草稿状态，尚未发布）。
- 另有 1 篇 08-02 的历史空正文文章（`c9ce10f2`，已发布），早于 CTA 改造，为独立的历史遗留数据。
- CTA 改造（08-05）后其余文章正文长度均正常（1300–3800 字）。

---

## 5. 根因小结与（仅建议、未实施）修复方向

**根因**：`parseArticleResponse` 在 `---CONTENT---` 分支里，一旦**元数据 JSON 因未转义引号非法**就整体抛错，把分隔符后**本来完好的裸 markdown 正文**一并丢弃；随后的 Haiku 修复回退**被明确要求只返回元数据、不返回正文**，于是 `contentZh` 变成空串。此路径修复成功时**不打任何日志**，正文空又能**通过查重闸门**，形成"静默丢正文、只剩 CTA"的最终现象。

**建议方向（本报告不改动代码，仅记录）**：
1. 解析容错：`SEP` 分支下即便 `metaPart` 解析失败，也应**保留 `contentPart` 正文**，仅用 Haiku 修复元数据后**回填原正文**，绝不丢弃分隔符后的裸文本。
2. 元数据传输避免内嵌引号风险：让 LLM 用不含引号的字段格式，或对 `metaPart` 做更强的 JSON 清洗（转义裸引号）。
3. 入库前增加"空正文"硬校验：`contentZh.trim().length` 低于阈值（如 < 200）时拒绝入库并告警，而非交由 CTA 拼接掩盖。
4. 修复回退成功路径也应打日志（记录"走了修复分支"），避免静默降级。

（以上为诊断结论，未对任何代码或数据做修改。）
