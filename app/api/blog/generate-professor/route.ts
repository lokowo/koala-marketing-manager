import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { supabaseAdmin } from '../../../lib/supabase/server';
import { getServerUser } from '../../../lib/auth';
import { logAdminAction } from '../../../lib/worklog';

export const maxDuration = 300;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

function safeParseJSON(text: string): Record<string, unknown> {
  let cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (jsonMatch) cleaned = jsonMatch[0];
  try {
    return JSON.parse(cleaned);
  } catch {
    try {
      cleaned = cleaned.replace(/,\s*([}\]])/g, '$1');
      return JSON.parse(cleaned);
    } catch {
      throw new Error(`JSON 解析失败: ${cleaned.substring(0, 200)}`);
    }
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`${label}超时（${Math.round(ms / 1000)}秒）`)), ms)
    ),
  ]);
}

const TOP_JOURNALS = ['Nature', 'Science', 'Cell', 'Nature Materials', 'Nature Energy',
  'Nature Chemistry', 'Nature Communications', 'PNAS', 'Advanced Materials',
  'Chemical Reviews', 'Chemical Society Reviews', 'Energy & Environmental Science',
  'Joule', 'Angewandte Chemie', 'Advanced Energy Materials', 'ACS Nano',
  'Journal of the American Chemical Society', 'Nano Letters'];

const isTopJournal = (journal: string) =>
  TOP_JOURNALS.some(t => journal?.toLowerCase().includes(t.toLowerCase()));

export async function POST(req: NextRequest) {
  const user = await getServerUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { professorId } = await req.json().catch(() => ({ professorId: null }));

  if (!professorId) {
    return Response.json({ error: 'professorId required' }, { status: 400 });
  }

  // Step 1: Read professor
  const { data: professor, error: profError } = await db
    .from('professors')
    .select('*')
    .eq('id', professorId)
    .single();

  if (profError || !professor) {
    return Response.json({ error: 'Professor not found', details: profError?.message }, { status: 404 });
  }

  const profName = professor.name || professor.name_en || 'Unknown';
  // Mutable so the verification step can swap in the corrected current affiliation
  // before article generation runs.
  let university = professor.university || professor.institution || '';
  const faculty = professor.faculty || '';
  const positionTitle = professor.position_title || professor.title || 'Researcher';
  const researchAreas = (professor.research_areas || professor.research_tags || []).join(', ');

  // Step 2: Read papers + grants in parallel
  const [papersResult, grantsResult] = await Promise.allSettled([
    db.from('papers')
      .select('title, year, journal, citation_count, doi_url')
      .eq('professor_id', professorId)
      .order('citation_count', { ascending: false })
      .limit(10),
    db.from('grants')
      .select('grant_name, funding_body, year, amount, project_title, phd_relevance, industry_scholarship_potential')
      .eq('lead_professor_id', professorId)
      .order('year', { ascending: false }),
  ]);

  const papers: { title: string; year: number; journal: string; citation_count: number; doi_url?: string }[] =
    papersResult.status === 'fulfilled' ? (papersResult.value.data || []) : [];
  const grants: { grant_name: string; funding_body: string; year: number; amount: number; project_title: string; phd_relevance: string; industry_scholarship_potential: string }[] =
    grantsResult.status === 'fulfilled' ? (grantsResult.value.data || []) : [];

  // Build context for AI
  const papersContext = papers.length > 0
    ? papers.map((p, i) =>
      `${isTopJournal(p.journal) ? '⭐' : '  '} ${i + 1}. "${p.title}" — ${p.journal}, ${p.year}, cited ${p.citation_count} times`
    ).join('\n')
    : '暂无论文数据';

  const grantsContext = grants.length > 0
    ? grants.map(g =>
      `- ${g.grant_name} (${g.funding_body}, ${g.year}): $${g.amount?.toLocaleString() || 'N/A'}\n  Project: "${g.project_title}"\n  PhD Relevance: ${g.phd_relevance || 'N/A'}`
    ).join('\n')
    : '';

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

  // Step 3.5: Verify professor identity via web search (with timeout).
  //
  // 历史误拦修复:
  // - 教授换学校(如 Lemuria Carter: UNSW -> USYD)曾被 verified=false/warning 阻断生成。
  // - 现在仅 identityMismatch===true(根本不是同一人)才阻断。
  // - affiliationChanged + 官网佐证 → 自动 update professors.university + previous_affiliation,留痕。
  let verifiedProfileUrl = professor.profile_url || '';
  let verifiedGoogleScholarUrl = professor.google_scholar_url || '';
  let affiliationInfo: {
    affiliationChanged?: boolean;
    previousAffiliation?: string | null;
    currentUniversity?: string | null;
    officialProfileConfirmed?: boolean;
    affiliationUpdated?: boolean;
    needsManualMerge?: boolean;
    note?: string | null;
  } = {};
  try {
    const verifyResponse = await withTimeout(anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1200,
      tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 3 }],
      messages: [{
        role: 'user',
        content: `Verify the following professor's identity and current institutional affiliation.

Name in our DB: ${profName}
University in our DB: ${university}

Priority data source: the official university staff page (e.g., sydney.edu.au, unsw.edu.au). Google Scholar and Wikipedia are secondary.

Distinguish two cases carefully:
  (A) WRONG PERSON — the search returned a different individual whose name/research/affiliation do not match.
      Only in this case set identityMismatch=true.
  (B) SAME RESEARCHER, MOVED INSTITUTION — name + research fields match our DB, but their CURRENT staff page is at a different university than what we have.
      This is NOT a mismatch. Set identityMismatch=false, affiliationChanged=true, currentUniversity=<the official full name of the new university>,
      previousAffiliation=<the old university name from our DB>, officialProfileConfirmed=true if you actually saw the new staff page, false otherwise.

If you cannot confirm anything either way (no web result, ambiguous), set verified=false but DO NOT set identityMismatch=true. We will not block in that case.

Return JSON ONLY:
{
  "verified": true|false,
  "identityMismatch": true|false,
  "affiliationChanged": true|false,
  "officialProfileConfirmed": true|false,
  "currentUniversity": "official full name, or null",
  "previousAffiliation": "old university, or null",
  "correctedInfo": {
    "name": "correct name",
    "position": "correct position",
    "faculty": "correct department",
    "researchAreas": ["accurate research areas"],
    "profileUrl": "official staff page URL",
    "googleScholarUrl": "Google Scholar URL",
    "email": "if publicly listed"
  },
  "note": "one short sentence describing what you found (e.g. 'Confirmed on USYD staff page; previously at UNSW.')"
}`,
      }],
    }), 60000, '教授身份验证');

    let verifyText = '';
    for (const block of verifyResponse.content) {
      if (block.type === 'text') { verifyText = block.text; break; }
    }
    if (verifyText) {
      const verifiedData = safeParseJSON(verifyText) as {
        verified?: boolean;
        identityMismatch?: boolean;
        affiliationChanged?: boolean;
        officialProfileConfirmed?: boolean;
        currentUniversity?: string | null;
        previousAffiliation?: string | null;
        note?: string | null;
        correctedInfo?: { profileUrl?: string; googleScholarUrl?: string };
      };

      // 阻断条件:仅"根本不是同一人"。卡片已匹配(professor 行存在) → 默认视为通过。
      if (verifiedData.identityMismatch === true) {
        return Response.json({
          error: `身份验证警告：${verifiedData.note || '搜索结果与该卡片不是同一位研究者'}`,
          suggestion: '请核实教授姓名和大学后重试',
        }, { status: 400 });
      }

      if (verifiedData.correctedInfo?.profileUrl) verifiedProfileUrl = verifiedData.correctedInfo.profileUrl;
      if (verifiedData.correctedInfo?.googleScholarUrl) verifiedGoogleScholarUrl = verifiedData.correctedInfo.googleScholarUrl;

      // 自动补全 profile_url / google_scholar_url(仅在原本为空时)
      if (verifiedProfileUrl || verifiedGoogleScholarUrl) {
        const updates: Record<string, string> = {};
        if (verifiedProfileUrl && !professor.profile_url) updates.profile_url = verifiedProfileUrl;
        if (verifiedGoogleScholarUrl && !professor.google_scholar_url) updates.google_scholar_url = verifiedGoogleScholarUrl;
        if (Object.keys(updates).length > 0) {
          await db.from('professors').update(updates).eq('id', professorId);
        }
      }

      // 机构变更自动更新 + 留痕
      affiliationInfo = {
        affiliationChanged: !!verifiedData.affiliationChanged,
        previousAffiliation: verifiedData.previousAffiliation ?? null,
        currentUniversity: verifiedData.currentUniversity ?? null,
        officialProfileConfirmed: !!verifiedData.officialProfileConfirmed,
        note: verifiedData.note ?? null,
      };

      if (
        verifiedData.affiliationChanged &&
        verifiedData.officialProfileConfirmed &&
        verifiedData.currentUniversity &&
        verifiedData.currentUniversity !== professor.university
      ) {
        const prevUniversity: string = professor.university || verifiedData.previousAffiliation || '';
        const nowIso = new Date().toISOString();
        try {
          const { error: affUpdErr } = await db
            .from('professors')
            .update({
              previous_affiliation: prevUniversity || null,
              university: verifiedData.currentUniversity,
              affiliation_updated_at: nowIso,
            })
            .eq('id', professorId);

          if (affUpdErr) throw affUpdErr;

          affiliationInfo.affiliationUpdated = true;
          // Sync local var so article generation reflects the updated affiliation
          university = verifiedData.currentUniversity;
          await logAdminAction(user.id, 'professor_affiliation_updated', 'professor', professorId, {
            from: prevUniversity || null,
            to: verifiedData.currentUniversity,
            source: 'official_profile',
            profName,
          });
        } catch (affErr) {
          const errCode = (affErr as { code?: string } | null)?.code;
          const errMsg = (affErr as Error)?.message ?? '';
          const isUniqueConflict = errCode === '23505' || /duplicate key|unique/i.test(errMsg);
          if (isUniqueConflict) {
            // 撞 (name, university) 唯一索引 → 目标 (name, currentUniversity) 已存在另一行。
            // 跳过 university 改动,但仍记录 previous_affiliation,标注"需人工合并",绝不中断文章生成。
            console.warn(
              '[generate-professor] affiliation unique conflict — needs manual merge:',
              { professorId, profName, from: prevUniversity, to: verifiedData.currentUniversity },
            );
            try {
              await db.from('professors')
                .update({
                  previous_affiliation: prevUniversity || null,
                  affiliation_updated_at: nowIso,
                })
                .eq('id', professorId);
            } catch (e2) {
              console.error('[generate-professor] previous_affiliation write failed:', (e2 as Error).message);
            }
            affiliationInfo.affiliationUpdated = false;
            affiliationInfo.needsManualMerge = true;
          } else {
            console.error('[generate-professor] affiliation update failed (non-blocking):', errMsg);
          }
        }
      }
    }
  } catch (e) {
    console.error('[generate-professor] Verification failed (non-blocking):', (e as Error).message);
  }

  // Step 4: Generate Chinese article (Sonnet, with timeout)
  let zhData: { titleZh: string; excerptZh: string; contentZh: string; tags: string[] };
  try {
    const zhResponse = await withTimeout(anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      messages: [{ role: 'user', content: `请为以下教授撰写一篇800-1200字的中文教授推荐文章。

PROFESSOR PROFILE:
Name: ${profName}
University: ${university}${faculty ? ` · ${faculty}` : ''}
Position: ${positionTitle}
Research Areas: ${researchAreas}
H-Index: ${professor.h_index || 'N/A'} | Papers: ${professor.paper_count || papers.length} | Citations: ${professor.citation_count || 'N/A'}
Accepting Students: ${professor.accepting_students ? '是' : '未知'}
Suitable Backgrounds: ${(professor.suitable_student_backgrounds || []).join(', ') || 'N/A'}
Potential RP Topics: ${(professor.potential_rp_topics || []).join(', ') || 'N/A'}

TOP PUBLICATIONS (⭐ = top-tier journal):
${papersContext}

${grantsContext ? `GRANTS & FUNDING (${grants.length} total):\n${grantsContext}` : '(无经费数据)'}

文章结构：
1. 开头亮点 — 如果有 Nature/Science 等顶刊论文，开头就提；如果有大额 grant，也值得强调
2. 研究方向解读 — 用通俗语言，让本科生也能理解这个领域在做什么、为什么重要
3. 代表性论文 — 顶刊论文重点用2-3句解释为什么这篇论文重要
4. 在研经费与项目 — 有 grant 说明有钱，有钱意味着有奖学��名额（如果没有 grant 数据跳过这段）
5. 对PhD学生的价值 — 跟这位教授读博能获得什么
6. 申请建议 — 什么背景适合，如何准备申请信

写作规则（严格遵守）：
- 语气：考拉学长风格，温暖专业，像一个了解情况的学长在分享
- 绝对不要用 emoji 或表情符号
- 不要用 AI 模板开头（禁止："让我们来看看"、"今天我们来聊聊"、"在当今"、"众所周知"、"不得不说"）
- 不要用过度夸张的形容词（禁止："令人瞩目"、"首屈一指"、"举世闻名"）
- 不要用 AI 过渡词（禁止："值得一提的是"、"简单来说"、"具体来说"、"总的来说"、"换句话说"、"不难发现"）
- 句式要自然多变，避免排比和重复句式
- 不要编造任何数据，所有数字来自上面提供的数据
- Markdown 格式，但禁止使用 --- 水平线和 > 引用块
- 涉及数据对比（如论文引用、H-index、经费金额）时，用 markdown 表格展示，不要把数字堆在文字段落里
- 教授名字始终用英文原名，不要翻译成中文。例如写 "Wenjie Zhang" 不要写 "张文杰"
- 大学名始终用英文官方名称，可以在括号里加中文注释。例如 "UNSW Sydney（新南威尔士大学）"
- 研究方向、学科术语、期刊名、论文标题保持英文
- 文章末尾必须附上信息来源，格式：
  📎 信息来源
  • 官方主页：${verifiedProfileUrl || '暂无'}
  • Google Scholar：${verifiedGoogleScholarUrl || '暂无'}
  • 数据更新时间：${new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long' })}
- 如果某些信息无法确认，必须标注「⚠️ 此信息待确认」
- 文末加一句引导：想了解更多？在 Koala PhD 查看 ${profName} 教授的完整档案

返回JSON：{"titleZh": "中文标题", "excerptZh": "100字摘要", "contentZh": "正文markdown", "tags": ["标签1","标签2",...]}` }],
      system: 'You MUST return ONLY valid JSON. All string values must use proper JSON escaping: use \\n for newlines, \\" for quotes inside strings. Do not use markdown code fences. Do not add any text before or after the JSON object.',
    }), 120000, '教授中文文章生成');

    let zhText = '';
    for (const block of zhResponse.content) {
      if (block.type === 'text') { zhText = block.text; break; }
    }

    try {
      zhData = safeParseJSON(zhText) as typeof zhData;
    } catch {
      const fixResponse = await withTimeout(anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 6000,
        messages: [{
          role: 'user',
          content: `The following text is malformed JSON. Fix it and return ONLY valid JSON with fields: titleZh (string), excerptZh (string), contentZh (string), tags (array of strings). Ensure all string values properly escape quotes and newlines.\n\n${zhText.slice(0, 8000)}`,
        }],
        system: 'Return ONLY valid JSON. No markdown, no explanation, no code fences.',
      }), 30000, 'JSON修复');
      const fixText = fixResponse.content[0].type === 'text' ? fixResponse.content[0].text : '';
      zhData = safeParseJSON(fixText) as typeof zhData;
    }
  } catch (e) {
    console.error('[generate-professor] Chinese article failed:', (e as Error).message);
    const msg = e instanceof Error ? e.message : '';
    if (msg.includes('超时')) {
      return Response.json({ error: `教授文章生成超时：${msg}，请重试` }, { status: 504 });
    }
    return Response.json({ error: '教授文章生成失败，请稍后重试', details: msg }, { status: 500 });
  }

  // Step 5+6 (parallel, Haiku): Translate + SEO
  let enData = { titleEn: '', excerptEn: '', contentEn: '' };
  let seo = { seoTitleZh: '', seoDescriptionZh: '', seoKeywordsZh: '' };

  const [enResult, seoResult] = await withTimeout(
    Promise.allSettled([
      anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 3000,
        messages: [{ role: 'user', content: `Translate this Chinese professor profile article to English. Keep markdown format.\n\nTitle: ${zhData.titleZh}\nExcerpt: ${zhData.excerptZh}\nContent:\n${zhData.contentZh}\n\nReturn JSON: {"titleEn": "...", "excerptEn": "...", "contentEn": "..."}` }],
        system: 'Professional translator. Return valid JSON only, no markdown code blocks.',
      }),
      anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 500,
        messages: [{ role: 'user', content: `Generate Chinese SEO metadata for a professor profile article.\nProfessor: ${profName} at ${university}\nResearch: ${researchAreas}\nTitle: ${zhData.titleZh}\n\nReturn JSON: {"seoTitleZh": "max 60 chars Chinese", "seoDescriptionZh": "max 160 chars Chinese", "seoKeywordsZh": "comma-separated Chinese keywords, include 澳洲PhD and professor name"}` }],
        system: 'Return valid JSON only, no markdown code blocks.',
      }),
    ]),
    60000,
    '翻译与SEO生成',
  );

  if (enResult.status === 'fulfilled') {
    try {
      const enText = enResult.value.content[0].type === 'text' ? enResult.value.content[0].text : '{}';
      enData = safeParseJSON(enText) as typeof enData;
    } catch { /* defaults */ }
  }

  if (seoResult.status === 'fulfilled') {
    try {
      const seoText = seoResult.value.content[0].type === 'text' ? seoResult.value.content[0].text : '{}';
      seo = safeParseJSON(seoText) as typeof seo;
    } catch { /* defaults */ }
  }

  // Step 7: Reading time
  const charCount = (zhData.contentZh || '').length;
  const readingTimeZh = Math.max(3, Math.ceil(charCount / 400));

  // Step 8: Build tags
  const tags = [...(zhData.tags || [])];
  if (!tags.includes(profName)) tags.unshift(profName);
  if (university && !tags.includes(university)) tags.push(university);
  const topPaperJournals = papers.filter(p => isTopJournal(p.journal)).map(p => p.journal);
  topPaperJournals.slice(0, 2).forEach(j => { if (!tags.includes(j)) tags.push(j); });

  // Step 9: Insert to blog_posts
  const slugSource = enData.titleEn || profName + ' ' + (university || '') + ' professor';
  const slug = slugSource
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80)
    .replace(/^-|-$/g, '') + '-' + Date.now();

  const row = {
    slug,
    title_zh: zhData.titleZh,
    title_en: enData.titleEn || null,
    excerpt_zh: zhData.excerptZh,
    excerpt_en: enData.excerptEn || null,
    content_zh: zhData.contentZh,
    content_en: enData.contentEn || null,
    category: 'professor_spotlight',
    tags,
    status: 'draft',
    professor_id: professorId,
    seo_title_zh: seo.seoTitleZh || null,
    seo_description_zh: seo.seoDescriptionZh || null,
    seo_keywords_zh: seo.seoKeywordsZh || null,
    reading_time_zh: readingTimeZh,
    cover_image_url: null,
    cover_image_status: !!process.env.OPENAI_API_KEY ? 'generating' : 'none',
  };

  const { data: post, error } = await db.from('blog_posts').insert(row).select().single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  const imageAvailable = !!process.env.OPENAI_API_KEY;
  if (post?.id && imageAvailable) {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const cookieHeader = req.headers.get('cookie') || '';
    fetch(`${baseUrl}/api/blog/generate-cover`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookieHeader },
      body: JSON.stringify({ postId: post.id }),
    }).catch(err => console.error('[generate-professor] Cover image trigger failed:', err));

    fetch(`${baseUrl}/api/blog/auto-illustrate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookieHeader },
      body: JSON.stringify({ postId: post.id, imageCount: 1 }),
    }).catch(err => console.error('[generate-professor] Auto illustrate failed:', err));
  }

  await logAdminAction(user.id, 'blog_generate_professor', 'blog_post', post?.id, { professorId, profName });

  return Response.json({
    success: true,
    post,
    title: zhData.titleZh,
    affiliation: affiliationInfo,
  });
}
