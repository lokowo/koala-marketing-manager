import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

// ============================================================
// 正文闸门验证（只读，不写库、不建文章）
// 复刻 app/api/blog/generate 的正文闸门逻辑：
//   新正文 → createEmbedding → 与库内 content_embedding 逐一余弦 → maxSim > BODY_SIM_THRESHOLD 则拒绝。
// A) 模拟「重复投稿」：取一篇已知重复文的正文，重新 embedding，与语料（剔除其自身）比对 → 应 REJECT。
// B) 模拟「全新投稿」：一段无关正文 → 与全语料比对 → 应 PASS。
// C) 语料自扫：用已落库向量算每篇最近邻余弦，统计 > 阈值 的文章数（这些是重写会被拦下的）。
//
// 运行：DOTENV_CONFIG_PATH=.env.local npx tsx scripts/verify-body-gate-20260805.ts
// ============================================================

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

const BODY_SIM_THRESHOLD = 0.875; // 与 app/lib/server/dedup.ts 保持一致
const DUP_PREFIX = 'cae95b41';    // 已知重复文（AI工具，audit body-cos 0.944 与 9992522d）

function cosine(a: number[], b: number[]): number {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}
function parseVector(v: unknown): number[] | null {
  if (Array.isArray(v)) return v as number[];
  if (typeof v === 'string' && v.length > 0) { try { const a = JSON.parse(v); return Array.isArray(a) ? a : null; } catch { return null; } }
  return null;
}
async function embed(text: string): Promise<number[]> {
  const r = await openai.embeddings.create({ model: 'text-embedding-3-small', input: text.slice(0, 8000), dimensions: 1536 });
  return r.data[0].embedding;
}

interface Row { id: string; title_zh: string | null; content_zh: string | null; content_embedding: unknown; }

async function main() {
  const { data, error } = await supabase
    .from('blog_posts')
    .select('id, title_zh, content_zh, content_embedding')
    .neq('category', 'professor_spotlight')
    .not('content_embedding', 'is', null)
    .limit(1000);
  if (error) { console.error('查询失败:', error.message); process.exit(1); }
  const rows = (data || []) as Row[];
  const corpus = rows.map(r => ({ id: r.id, title: r.title_zh || '', vec: parseVector(r.content_embedding)! })).filter(c => c.vec);
  console.log(`语料（含 content_embedding 的非教授类文章）: ${corpus.length} 篇`);
  console.log(`阈值 BODY_SIM_THRESHOLD = ${BODY_SIM_THRESHOLD}\n`);

  const titleOf = (id: string) => corpus.find(c => c.id === id)?.title || '(?)';
  const gate = (vec: number[], excludeId?: string) => {
    let maxSim = -1, matchedId = '';
    for (const c of corpus) { if (c.id === excludeId) continue; const s = cosine(vec, c.vec); if (s > maxSim) { maxSim = s; matchedId = c.id; } }
    return { maxSim, matchedId };
  };

  // A) 重复投稿 → REJECT
  const dup = rows.find(r => r.id.startsWith(DUP_PREFIX));
  if (!dup || !dup.content_zh) { console.error(`未找到 ${DUP_PREFIX} 或其正文为空`); }
  else {
    console.log(`【A｜模拟重复投稿】重新提交已存在文章的正文（剔除其自身作对照）`);
    console.log(`   文章: ${dup.id.slice(0, 8)} "${dup.title_zh}"`);
    const v = await embed(dup.content_zh);
    const { maxSim, matchedId } = gate(v, dup.id);
    const verdict = maxSim > BODY_SIM_THRESHOLD ? 'REJECTED ✅（闸门拦截）' : 'PASSED ❌（未拦截，异常）';
    console.log(`   最大余弦: ${maxSim.toFixed(4)} → 命中 ${matchedId.slice(0, 8)} "${titleOf(matchedId)}"`);
    console.log(`   判定: ${verdict}\n`);
  }

  // B) 全新投稿 → PASS
  console.log(`【B｜模拟全新投稿】一段与站内主题无关的正文`);
  const novel = '本文介绍如何用铸铁锅慢炖一锅经典的意式番茄牛肉酱：先小火煸炒洋葱与胡萝卜丁，加入牛肩肉块与红酒收汁，再倒入去皮番茄慢炖三小时，最后用罗勒与帕玛森芝士收尾，配手工意面食用。';
  const vb = await embed(novel);
  const rb = gate(vb);
  const verdictB = rb.maxSim > BODY_SIM_THRESHOLD ? 'REJECTED ❌（误伤，异常）' : 'PASSED ✅（正常放行）';
  console.log(`   最大余弦: ${rb.maxSim.toFixed(4)} → 最近 ${rb.matchedId.slice(0, 8)} "${titleOf(rb.matchedId)}"`);
  console.log(`   判定: ${verdictB}\n`);

  // C) 语料自扫（用已落库向量，无新 API 调用）
  console.log(`【C｜语料最近邻自扫】每篇 vs 其他篇的最近邻余弦（用已落库 content_embedding）`);
  const nn: { id: string; title: string; sim: number; other: string }[] = [];
  for (const c of corpus) {
    let mx = -1, oid = '';
    for (const d of corpus) { if (d.id === c.id) continue; const s = cosine(c.vec, d.vec); if (s > mx) { mx = s; oid = d.id; } }
    nn.push({ id: c.id, title: c.title, sim: mx, other: oid });
  }
  const over = nn.filter(x => x.sim > BODY_SIM_THRESHOLD).sort((a, b) => b.sim - a.sim);
  const sims = nn.map(x => x.sim).sort((a, b) => a - b);
  const med = sims[Math.floor(sims.length / 2)];
  console.log(`   最近邻余弦: min ${sims[0].toFixed(4)} / 中位 ${med.toFixed(4)} / max ${sims[sims.length - 1].toFixed(4)}`);
  console.log(`   最近邻 > ${BODY_SIM_THRESHOLD} 的文章: ${over.length}/${corpus.length}（这些主题若被重写投稿会被闸门拦下）`);
  for (const x of over.slice(0, 12)) console.log(`     - ${x.sim.toFixed(4)}  ${x.id.slice(0, 8)} "${x.title}"  ↔  ${x.other.slice(0, 8)} "${titleOf(x.other)}"`);
  console.log('\n=== 验证完成 ===');
}

main().catch(e => { console.error('脚本异常:', e); process.exit(1); });
