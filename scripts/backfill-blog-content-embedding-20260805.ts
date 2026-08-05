import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

// ============================================================
// 新闻类文章去重 · 第 3 步之一：blog_posts 向量回填（两列）
//
// 对全部 category != 'professor_spotlight' 的文章回填：
//   - topic_embedding   : 标题+摘要（title_zh + excerpt_zh）—— 选题闸门比对口径
//   - content_embedding : 正文全文（content_zh）—— 整篇级去重/阈值标定对照
// 均用 text-embedding-3-small(1536 维)。
// - 两列各自独立幂等：分别只取该列 IS NULL 的行，已有值天然跳过；
// - 断点续跑：中断后重跑仅处理各列剩余 NULL 行；
// - 文本为空退化（正文→摘要→标题 / 标题口径→标题）并在日志显式标注。
//
// 前置：先执行 supabase/migrations/20260805_blog_content_embedding.sql 的增列语句。
// 运行：npx tsx scripts/backfill-blog-content-embedding-20260805.ts
//   （.env.local 环境：DOTENV_CONFIG_PATH=.env.local npx tsx scripts/...）
// ============================================================

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

const EMBEDDING_MODEL = 'text-embedding-3-small';
const EMBEDDING_DIMS = 1536;
const EMBED_BATCH_SIZE = 50;
const SLEEP_MS = 200;

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

async function createEmbeddingsBatch(texts: string[]): Promise<number[][]> {
  const res = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: texts.map(t => t.slice(0, 8000)),
    dimensions: EMBEDDING_DIMS,
  });
  return res.data.map(d => d.embedding);
}

interface PostRow {
  id: string;
  title_zh: string | null;
  excerpt_zh: string | null;
  content_zh: string | null;
  category: string | null;
}

// 只取指定向量列为 NULL 的非教授类文章（独立幂等 + 断点续跑）
async function fetchNullRows(col: 'topic_embedding' | 'content_embedding'): Promise<PostRow[]> {
  const rows: PostRow[] = [];
  let offset = 0;
  while (true) {
    const { data, error } = await supabase
      .from('blog_posts')
      .select('id, title_zh, excerpt_zh, content_zh, category')
      .neq('category', 'professor_spotlight')
      .is(col, null)
      .order('id')
      .range(offset, offset + 999);
    if (error) { console.error(`查询 ${col} 待回填失败:`, error.message); process.exit(1); }
    if (!data || data.length === 0) break;
    rows.push(...(data as PostRow[]));
    offset += data.length;
    if (data.length < 1000) break;
  }
  return rows;
}

// 通用回填：对 col 为空的行，用 buildText 取文本，embedding 后写入该列
async function backfillColumn(
  col: 'topic_embedding' | 'content_embedding',
  buildText: (row: PostRow) => { text: string; usedFallback: boolean } | null,
): Promise<void> {
  console.log(`\n--- 回填 ${col} ---`);
  const rows = await fetchNullRows(col);
  console.log(`待回填（${col} IS NULL 且非教授类）: ${rows.length} 篇`);
  if (rows.length === 0) { console.log('无待回填，跳过。'); return; }

  const prepared: { id: string; text: string; usedFallback: boolean }[] = [];
  const skippedEmpty: string[] = [];
  for (const row of rows) {
    const built = buildText(row);
    if (built && built.text) prepared.push({ id: row.id, ...built });
    else { console.error(`[skip] ${col} 无可用文本，跳过: id=${row.id}`); skippedEmpty.push(row.id); }
  }

  let updated = 0, failed = 0, fallbackCount = 0;
  for (let i = 0; i < prepared.length; i += EMBED_BATCH_SIZE) {
    const batch = prepared.slice(i, i + EMBED_BATCH_SIZE);
    try {
      const vecs = await createEmbeddingsBatch(batch.map(b => b.text));
      for (let j = 0; j < batch.length; j++) {
        const { id, usedFallback } = batch[j];
        const { error: upErr } = await supabase
          .from('blog_posts')
          .update({ [col]: JSON.stringify(vecs[j]) })
          .eq('id', id);
        if (upErr) { console.error(`更新 ${col} 失败 id=${id}:`, upErr.message); failed++; }
        else { updated++; if (usedFallback) fallbackCount++; }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`${col} embedding 批次异常 (${i}-${i + batch.length}):`, msg);
      failed += batch.length;
    }
    await sleep(SLEEP_MS);
    console.log(`${col} 进度: ${Math.min(i + EMBED_BATCH_SIZE, prepared.length)}/${prepared.length} | 已写入: ${updated} | 失败: ${failed}`);
  }

  console.log(`${col} 完成 → 写入: ${updated}（退化文本: ${fallbackCount}）| 失败: ${failed} | 全空跳过: ${skippedEmpty.length}${skippedEmpty.length ? ' → ' + skippedEmpty.join(', ') : ''}`);
}

async function main() {
  console.log('=== blog_posts 向量回填（topic_embedding + content_embedding） ===');

  // topic_embedding：标题 + 摘要（选题闸门比对口径）；标题口径下正文不参与。
  await backfillColumn('topic_embedding', (row) => {
    const title = (row.title_zh || '').trim();
    const excerpt = (row.excerpt_zh || '').trim();
    if (title) return { text: excerpt ? `${title}。${excerpt}` : title, usedFallback: false };
    // 标题为空（异常，title_zh 通常 NOT NULL）：退化用摘要并标注
    if (excerpt) { console.warn(`[topic fallback] 标题为空，改用摘要: id=${row.id}`); return { text: excerpt, usedFallback: true }; }
    return null;
  });

  // content_embedding：正文全文；正文为空退化用摘要→标题，均标注。
  await backfillColumn('content_embedding', (row) => {
    const body = (row.content_zh || '').trim();
    if (body) return { text: body, usedFallback: false };
    const excerpt = (row.excerpt_zh || '').trim();
    if (excerpt) { console.warn(`[content fallback] 正文为空，改用摘要: id=${row.id} title="${row.title_zh ?? ''}"`); return { text: excerpt, usedFallback: true }; }
    const title = (row.title_zh || '').trim();
    if (title) { console.warn(`[content fallback] 正文与摘要均为空，改用标题: id=${row.id}`); return { text: title, usedFallback: true }; }
    return null;
  });

  console.log('\n=== 全部完成 ===');
}

main().catch(err => {
  console.error('脚本异常退出:', err);
  process.exit(1);
});
