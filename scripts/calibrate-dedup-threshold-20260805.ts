import 'dotenv/config';
import { writeFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

// ============================================================
// 新闻类文章去重 · 阈值标定（只读，不写 DB）
//
// 正样本：docs/blog-content-duplication-audit.md 第 3 节整篇余弦 >0.90 的 28 对。
// 负样本：从同一非教授类文章池随机抽取等量（28）不在正样本中的组合（固定种子，可复现）。
// 分别计算两种粒度的两两余弦：
//   - title 空间：title_zh + excerpt_zh（= topic_embedding 口径，选题闸门用）
//   - body  空间：content_zh 正文全文（= content_embedding 口径，整篇级去重参考）
// 输出两组（正/负）在两种空间的 min/max/均值/分位数，及各空间的建议阈值（Youden's J 最大）。
// 结果写 docs/threshold-calibration.md。
//
// 运行：DOTENV_CONFIG_PATH=.env.local npx tsx scripts/calibrate-dedup-threshold-20260805.ts
// ============================================================

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

const EMBEDDING_MODEL = 'text-embedding-3-small';
const EMBEDDING_DIMS = 1536;
const RANDOM_SEED = 20260805;

// docs/blog-content-duplication-audit.md 第 3 节 · 整篇余弦 >0.90 的 28 对（8 位 id 前缀）
const POSITIVE_PREFIX_PAIRS: [string, string][] = [
  ['7850afae', '2ca86d9a'], ['cae95b41', '9992522d'], ['ad1f561c', 'a2add0c2'],
  ['13685d92', '6ef2edea'], ['020cf417', '9992522d'], ['adc8988e', '9992522d'],
  ['bf3d4acf', '3d67ceea'], ['adc8988e', 'cae95b41'], ['009b372c', 'cae95b41'],
  ['009b372c', '9992522d'], ['bf3d4acf', 'ca719435'], ['adc8988e', '009b372c'],
  ['020cf417', 'cae95b41'], ['6f17e697', '9dbcdba9'], ['0cf6e701', 'ca719435'],
  ['a813d003', '825cc13f'], ['a813d003', 'e844f279'], ['020cf417', 'adc8988e'],
  ['0cf6e701', 'bf3d4acf'], ['a813d003', 'a2add0c2'], ['6572ba56', 'a2add0c2'],
  ['ad1f561c', 'a813d003'], ['735a4a67', 'a2add0c2'], ['265f4098', '3d67ceea'],
  ['020cf417', '009b372c'], ['d2c873d2', '2ca86d9a'], ['e844f279', '825cc13f'],
  ['6d488381', '1d909482'],
];

interface PostRow {
  id: string;
  title_zh: string | null;
  excerpt_zh: string | null;
  content_zh: string | null;
}

// 固定种子 PRNG（mulberry32），保证负样本可复现
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function cosine(a: number[], b: number[]): number {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

async function embedAll(texts: string[]): Promise<number[][]> {
  const out: number[][] = [];
  for (let i = 0; i < texts.length; i += 100) {
    const chunk = texts.slice(i, i + 100).map(t => t.slice(0, 8000));
    const res = await openai.embeddings.create({ model: EMBEDDING_MODEL, input: chunk, dimensions: EMBEDDING_DIMS });
    out.push(...res.data.map(d => d.embedding));
  }
  return out;
}

function pct(sortedAsc: number[], p: number): number {
  if (sortedAsc.length === 0) return NaN;
  const idx = (p / 100) * (sortedAsc.length - 1);
  const lo = Math.floor(idx), hi = Math.ceil(idx);
  if (lo === hi) return sortedAsc[lo];
  return sortedAsc[lo] + (sortedAsc[hi] - sortedAsc[lo]) * (idx - lo);
}

interface Stats { n: number; min: number; max: number; mean: number; p10: number; p25: number; p50: number; p75: number; p90: number; }
function stats(xs: number[]): Stats {
  const s = [...xs].sort((a, b) => a - b);
  const mean = s.reduce((acc, v) => acc + v, 0) / (s.length || 1);
  return { n: s.length, min: s[0], max: s[s.length - 1], mean, p10: pct(s, 10), p25: pct(s, 25), p50: pct(s, 50), p75: pct(s, 75), p90: pct(s, 90) };
}

// 扫描阈值，取 Youden's J = TPR - FPR 最大者（预测重复 = sim >= t）
function suggestThreshold(pos: number[], neg: number[]): { threshold: number; tpr: number; fpr: number; j: number } {
  let best = { threshold: 0.5, tpr: 0, fpr: 1, j: -1 };
  for (let t = 0.50; t <= 1.0001; t += 0.001) {
    const tpr = pos.filter(v => v >= t).length / (pos.length || 1);
    const fpr = neg.filter(v => v >= t).length / (neg.length || 1);
    const j = tpr - fpr;
    if (j > best.j) best = { threshold: +t.toFixed(3), tpr, fpr, j };
  }
  return best;
}

function fmt(x: number): string { return Number.isNaN(x) ? 'N/A' : x.toFixed(4); }
function statsRow(label: string, s: Stats): string {
  return `| ${label} | ${s.n} | ${fmt(s.min)} | ${fmt(s.max)} | ${fmt(s.mean)} | ${fmt(s.p10)} | ${fmt(s.p25)} | ${fmt(s.p50)} | ${fmt(s.p75)} | ${fmt(s.p90)} |`;
}

async function main() {
  console.log('=== 去重阈值标定（只读） ===');

  // 1. 拉全部非教授类文章
  const pool: PostRow[] = [];
  let offset = 0;
  while (true) {
    const { data, error } = await supabase
      .from('blog_posts')
      .select('id, title_zh, excerpt_zh, content_zh')
      .neq('category', 'professor_spotlight')
      .order('id')
      .range(offset, offset + 999);
    if (error) { console.error('查询失败:', error.message); process.exit(1); }
    if (!data || data.length === 0) break;
    pool.push(...(data as PostRow[]));
    offset += data.length;
    if (data.length < 1000) break;
  }
  console.log(`非教授类文章池: ${pool.length} 篇`);

  // 2. 解析正样本前缀 → 完整 id
  const resolvePrefix = (pfx: string) => pool.filter(r => r.id.startsWith(pfx));
  const positivePairs: [string, string][] = [];
  const unresolved: string[] = [];
  for (const [a, b] of POSITIVE_PREFIX_PAIRS) {
    const ra = resolvePrefix(a), rb = resolvePrefix(b);
    if (ra.length !== 1) unresolved.push(`${a}(${ra.length})`);
    if (rb.length !== 1) unresolved.push(`${b}(${rb.length})`);
    if (ra.length === 1 && rb.length === 1) positivePairs.push([ra[0].id, rb[0].id]);
  }
  if (unresolved.length) console.warn('⚠️ 未能唯一解析的前缀:', unresolved.join(', '));
  console.log(`正样本对: ${positivePairs.length}/${POSITIVE_PREFIX_PAIRS.length}`);

  // 3. 负样本：固定种子随机抽取等量、不在正样本中的组合
  const rand = mulberry32(RANDOM_SEED);
  const key = (x: string, y: string) => (x < y ? `${x}|${y}` : `${y}|${x}`);
  const posKeys = new Set(positivePairs.map(([a, b]) => key(a, b)));
  const ids = pool.map(r => r.id);
  const negativePairs: [string, string][] = [];
  const negKeys = new Set<string>();
  let guard = 0;
  while (negativePairs.length < positivePairs.length && guard++ < 100000) {
    const i = Math.floor(rand() * ids.length);
    const j = Math.floor(rand() * ids.length);
    if (i === j) continue;
    const k = key(ids[i], ids[j]);
    if (posKeys.has(k) || negKeys.has(k)) continue;
    negKeys.add(k);
    negativePairs.push([ids[i], ids[j]]);
  }
  console.log(`负样本对: ${negativePairs.length}（种子 ${RANDOM_SEED}）`);

  // 4. 组装两种空间的文本并 embedding
  const titleText = (r: PostRow) => {
    const t = (r.title_zh || '').trim(), e = (r.excerpt_zh || '').trim();
    return t ? (e ? `${t}。${e}` : t) : e;
  };
  const bodyText = (r: PostRow) => (r.content_zh || '').trim() || (r.excerpt_zh || '').trim() || (r.title_zh || '').trim();

  console.log('embedding title 空间...');
  const titleVecs = await embedAll(pool.map(titleText));
  console.log('embedding body 空间...');
  const bodyVecs = await embedAll(pool.map(bodyText));
  const idx = new Map(pool.map((r, i) => [r.id, i]));

  const simFor = (pairs: [string, string][], vecs: number[][]) =>
    pairs.map(([a, b]) => cosine(vecs[idx.get(a)!], vecs[idx.get(b)!]));

  const posTitle = simFor(positivePairs, titleVecs);
  const negTitle = simFor(negativePairs, titleVecs);
  const posBody = simFor(positivePairs, bodyVecs);
  const negBody = simFor(negativePairs, bodyVecs);

  const sPosTitle = stats(posTitle), sNegTitle = stats(negTitle);
  const sPosBody = stats(posBody), sNegBody = stats(negBody);
  const sugTitle = suggestThreshold(posTitle, negTitle);
  const sugBody = suggestThreshold(posBody, negBody);

  // 5. 写报告
  const md = `# 去重阈值标定报告（只读输出）

> 生成脚本：\`scripts/calibrate-dedup-threshold-20260805.ts\`（只读 DB + OpenAI embedding，不写库）
> 正样本：\`docs/blog-content-duplication-audit.md\` 第 3 节整篇余弦 >0.90 的 28 对
> 负样本：同一非教授类文章池随机抽取等量组合（mulberry32 固定种子 ${RANDOM_SEED}，可复现）
> 文章池：${pool.length} 篇 · 正样本对：${positivePairs.length} · 负样本对：${negativePairs.length}
${unresolved.length ? `> ⚠️ 未唯一解析前缀：${unresolved.join(', ')}\n` : ''}
## 口径说明

- **title 空间** = \`title_zh + excerpt_zh\`（即 \`topic_embedding\` 口径，选题闸门 \`/api/blog/topics\` 用此比对）。
- **body 空间** = \`content_zh\` 正文全文（即 \`content_embedding\` 口径，整篇级去重参考）。
- ⚠️ 选题闸门实际比对是「候选**裸标题**（无摘要）↔ 已有 \`topic_embedding\`」，候选侧信息略少于本报告 title 空间（title+excerpt↔title+excerpt），故线上真实相似度可能**略低**于此处 title 分布；title 建议阈值宜作**上界参考**，可酌情下调。

## 余弦分布

| 组 | n | min | max | 均值 | p10 | p25 | p50 | p75 | p90 |
|---|---|---|---|---|---|---|---|---|---|
${statsRow('正样本 · title', sPosTitle)}
${statsRow('负样本 · title', sNegTitle)}
${statsRow('正样本 · body', sPosBody)}
${statsRow('负样本 · body', sNegBody)}

## 建议阈值（Youden's J = TPR − FPR 最大）

| 空间 | 建议阈值 | TPR(召回正样本) | FPR(误伤负样本) | J | 正样本 min | 负样本 max |
|---|---|---|---|---|---|---|
| title | **${sugTitle.threshold.toFixed(3)}** | ${(sugTitle.tpr * 100).toFixed(1)}% | ${(sugTitle.fpr * 100).toFixed(1)}% | ${sugTitle.j.toFixed(3)} | ${fmt(sPosTitle.min)} | ${fmt(sNegTitle.max)} |
| body | ${sugBody.threshold.toFixed(3)} | ${(sugBody.tpr * 100).toFixed(1)}% | ${(sugBody.fpr * 100).toFixed(1)}% | ${sugBody.j.toFixed(3)} | ${fmt(sPosBody.min)} | ${fmt(sNegBody.max)} |

## 结论与建议

- 选题闸门 \`SIM_THRESHOLD\` 作用于 **title 空间**，当前代码沿用 **0.88**（未改）。
- 本次标定建议 title 阈值约 **${sugTitle.threshold.toFixed(3)}**（考虑候选裸标题信息更少，可视情在此基础上略降）。
- 正/负样本在 title 空间的分隔：正样本 min=${fmt(sPosTitle.min)} vs 负样本 max=${fmt(sNegTitle.max)}${sPosTitle.min > sNegTitle.max ? '（完全可分）' : '（存在重叠，阈值需权衡召回/误伤）'}。
- body 空间仅供整篇级去重（第 2 步存量清理）参考，不用于选题闸门。

> 是否据此调整 \`app/api/blog/topics/route.ts\` 的 \`SIM_THRESHOLD\`，待人工确认。
`;

  writeFileSync('docs/threshold-calibration.md', md, 'utf8');
  console.log('\n已写入 docs/threshold-calibration.md');
  console.log(`title 建议阈值: ${sugTitle.threshold} | body 建议阈值: ${sugBody.threshold}`);
}

main().catch(err => { console.error('脚本异常退出:', err); process.exit(1); });
