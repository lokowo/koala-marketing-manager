import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

const BATCH_SIZE = 200;
const EMBED_BATCH_SIZE = 100;
const SLEEP_MS = 200;

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

async function createEmbeddingsBatch(texts: string[]): Promise<number[][]> {
  const res = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: texts.map(t => t.slice(0, 8000)),
    dimensions: 1536,
  });
  return res.data.map(d => d.embedding);
}

interface PaperRow {
  id: string;
  professor_id: string | null;
  title: string;
  year: number | null;
  journal: string | null;
  abstract: string;
}

async function main() {
  console.log('=== 论文文献 RAG 回填 ===');
  console.log('查询总数...');

  const { count } = await supabase
    .from('papers')
    .select('id', { count: 'exact', head: true })
    .not('abstract', 'is', null);

  const total = count ?? 0;
  console.log(`papers 表中有摘要的论文: ${total} 篇`);

  // Pre-fetch existing literature chunks for idempotency
  console.log('查询已入库的 literature chunks...');
  const existingIds = new Set<string>();
  let exOffset = 0;
  while (true) {
    const { data: exRows } = await supabase
      .from('knowledge_chunks')
      .select('source_id')
      .eq('source_type', 'literature')
      .range(exOffset, exOffset + 999);
    if (!exRows || exRows.length === 0) break;
    for (const r of exRows) if (r.source_id) existingIds.add(r.source_id);
    exOffset += exRows.length;
    if (exRows.length < 1000) break;
  }
  console.log(`已入库 literature chunks: ${existingIds.size} 条`);

  // Pre-fetch professor research_areas for field tagging
  console.log('加载教授研究方向...');
  const profAreas = new Map<string, string[]>();
  let profOffset = 0;
  while (true) {
    const { data: profRows } = await supabase
      .from('professors')
      .select('id, research_areas')
      .range(profOffset, profOffset + 999);
    if (!profRows || profRows.length === 0) break;
    for (const p of profRows) {
      if (p.research_areas?.length) profAreas.set(p.id, p.research_areas);
    }
    profOffset += profRows.length;
    if (profRows.length < 1000) break;
  }
  console.log(`教授研究方向: ${profAreas.size} 位有数据`);

  let processed = 0;
  let inserted = 0;
  let skipped = 0;
  let failed = 0;
  let offset = 0;

  while (offset < total) {
    const { data: papers, error } = await supabase
      .from('papers')
      .select('id, professor_id, title, year, journal, abstract')
      .not('abstract', 'is', null)
      .range(offset, offset + BATCH_SIZE - 1)
      .order('id');

    if (error) {
      console.error(`查询 papers 失败 (offset=${offset}):`, error.message);
      break;
    }
    if (!papers || papers.length === 0) break;

    const toProcess: { paper: PaperRow; content: string }[] = [];

    for (const paper of papers as PaperRow[]) {
      if (existingIds.has(paper.id)) {
        skipped++;
        continue;
      }

      let content = `Title: ${paper.title}`;
      if (paper.year) content += `\nYear: ${paper.year}`;
      if (paper.journal) content += `\nJournal: ${paper.journal}`;

      if (paper.professor_id) {
        const areas = profAreas.get(paper.professor_id);
        if (areas?.length) content += `\nField: ${areas.join(', ')}`;
      }

      content += `\nAbstract: ${paper.abstract}`;
      toProcess.push({ paper, content });
    }

    // Embed + insert in sub-batches of EMBED_BATCH_SIZE
    for (let i = 0; i < toProcess.length; i += EMBED_BATCH_SIZE) {
      const batch = toProcess.slice(i, i + EMBED_BATCH_SIZE);
      try {
        const embeddings = await createEmbeddingsBatch(batch.map(b => b.content));

        const rows = batch.map((b, idx) => ({
          source_type: 'literature',
          source_title: `[LIT] ${b.paper.title}`,
          content: b.content,
          source_id: b.paper.id,
          embedding: JSON.stringify(embeddings[idx]),
        }));

        const { error: insertErr } = await supabase
          .from('knowledge_chunks')
          .insert(rows);

        if (insertErr) {
          console.error(`插入失败 (batch ${i}-${i + batch.length}):`, insertErr.message);
          failed += batch.length;
        } else {
          inserted += batch.length;
          for (const b of batch) existingIds.add(b.paper.id);
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`Embedding/插入异常 (batch ${i}-${i + batch.length}):`, msg);
        failed += batch.length;
      }

      await sleep(SLEEP_MS);
    }

    processed += papers.length;
    offset += papers.length;
    console.log(`进度: ${processed}/${total} | 新增: ${inserted} | 跳过: ${skipped} | 失败: ${failed}`);
  }

  console.log('\n=== 完成 ===');
  console.log(`总处理: ${processed}`);
  console.log(`新增: ${inserted}`);
  console.log(`跳过(已存在): ${skipped}`);
  console.log(`失败: ${failed}`);
}

main().catch(err => {
  console.error('脚本异常退出:', err);
  process.exit(1);
});
