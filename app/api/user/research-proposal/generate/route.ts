import { getServerUser } from '../../../../lib/auth';
import { supabaseAdmin } from '../../../../lib/supabase/server';
import { checkUsage, incrementUsage } from '../../../../lib/services/usageTracker';
import { getStudentContext } from '../../../../lib/server/student-context';
import { loadMemories, formatMemoriesForPrompt } from '../../../../lib/services/memoryService';
import Anthropic from '@anthropic-ai/sdk';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

export async function POST(req: Request) {
  try {
    const user = await getServerUser();
    if (!user) return Response.json({ error: '请先登录' }, { status: 401 });

    const body = await req.json();
    const { professor_id, application_id, extra_context } = body as {
      professor_id?: string;
      application_id?: string;
      extra_context?: string;
    };

    if (!professor_id) {
      return Response.json({ error: 'professor_id is required' }, { status: 400 });
    }

    // Check usage limits
    const usage = await checkUsage(supabaseAdmin, user.id, 'research_proposal');
    if (!usage.allowed) {
      return Response.json({
        error: '研究计划生成次数已达上限',
        used: usage.used,
        limit: usage.limit,
      }, { status: 403 });
    }

    // Load professor data, student context, and memories in parallel
    const [profRes, papersRes, grantsRes, studentCtx, memories] = await Promise.all([
      db.from('professors')
        .select('id, name, university, faculty, position_title, research_areas, latest_papers, latest_grants, accepting_students')
        .eq('id', professor_id)
        .single(),
      db.from('papers')
        .select('title, year, citation_count, journal, abstract')
        .eq('professor_id', professor_id)
        .order('year', { ascending: false })
        .limit(8),
      db.from('grants')
        .select('project_title, funding_body, year, project_abstract, keywords')
        .eq('lead_professor_id', professor_id)
        .order('year', { ascending: false })
        .limit(5),
      getStudentContext(user.id),
      loadMemories(supabaseAdmin, user.id),
    ]);

    const professor = profRes.data;
    if (!professor) {
      return Response.json({ error: '教授不存在' }, { status: 404 });
    }

    if (!studentCtx || studentCtx.profileCompleteness < 20) {
      return Response.json({ error: '请先完善个人资料（至少填写教育背景和研究兴趣）' }, { status: 400 });
    }

    // Build professor research context
    const papers = papersRes.data ?? [];
    const grants = grantsRes.data ?? [];
    const latestPapers = professor.latest_papers ?? [];
    const latestGrants = professor.latest_grants ?? [];

    // Merge DB papers with embedded latest_papers, deduplicate by title
    const allPaperTitles = new Set<string>();
    const paperLines: string[] = [];
    for (const p of [...papers, ...latestPapers]) {
      const title = p.title ?? p.paper_title;
      if (!title || allPaperTitles.has(title.toLowerCase())) continue;
      allPaperTitles.add(title.toLowerCase());
      const year = p.year ?? '';
      const journal = p.journal ?? '';
      const citations = p.citation_count ?? p.citations ?? '';
      paperLines.push(`- "${title}" (${[year, journal, citations ? `${citations} citations` : ''].filter(Boolean).join(', ')})`);
    }

    const grantLines: string[] = [];
    const allGrantTitles = new Set<string>();
    for (const g of [...grants, ...latestGrants]) {
      const title = g.project_title ?? g.title;
      if (!title || allGrantTitles.has(title.toLowerCase())) continue;
      allGrantTitles.add(title.toLowerCase());
      grantLines.push(`- ${title} (${g.funding_body ?? g.funder ?? ''}, ${g.year ?? ''})`);
    }

    const researchAreas = (professor.research_areas ?? []).join(', ');

    let professorSection = `## 目标导师信息
- 姓名: ${professor.name}
- 职位: ${professor.position_title ?? 'Professor'}
- 大学: ${professor.university}${professor.faculty ? ` · ${professor.faculty}` : ''}
- 研究方向: ${researchAreas || '未知'}
- 招生状态: ${professor.accepting_students ?? '未知'}`;

    if (paperLines.length > 0) {
      professorSection += `\n\n### 近期论文 (${paperLines.length} 篇)\n${paperLines.slice(0, 8).join('\n')}`;
    } else {
      professorSection += '\n\n### 近期论文\n（无论文数据，请基于研究方向推断）';
    }

    if (grantLines.length > 0) {
      professorSection += `\n\n### 近期科研经费\n${grantLines.slice(0, 5).join('\n')}`;
    }

    // Build student section
    const studentSection = buildStudentSummary(studentCtx);
    const memoryPrompt = formatMemoriesForPrompt(memories);

    const systemPrompt = `你是一位资深的澳洲博士申请顾问，专精于帮助学生撰写针对特定导师的研究计划（Research Proposal）。

你的任务是根据学生背景和目标导师的研究方向，生成一份 2-3 页的澳洲式研究计划。

## 澳洲式研究计划特点
- **重事实与证据**，非叙事风格
- 结构清晰，每段有明确目的
- 研究问题必须具体、可操作、有边界
- 方法论必须与问题匹配
- 必须展示对导师研究方向的深入理解

## 核心要求
1. 分析导师近期论文，推断其当前研究前沿和潜在兴趣
2. 将学生拟研究的问题框定为对导师方向的自然延伸或补充
3. 在 background 段落中适当引用导师的真实论文标题（用引号括起）
4. 如果导师无论文数据，基于 research_areas 推断方向
5. 所有内容输出为英文（学术标准）
6. 不要编造论文标题或数据——只引用提供的真实信息

## 输出格式（严格 JSON，不要 markdown 代码块）
{
  "title": "研究计划标题（英文，简洁学术风格）",
  "background": "文献回顾与研究空白（300-500词，引用导师论文，识别未解决的问题）",
  "research_questions": "研究问题与目标（200-300词，1个主问题+2-3个子问题，每个问题用编号列出）",
  "methodology": "研究方法（250-400词，具体描述数据来源、分析方法、研究设计）",
  "significance": "研究意义与贡献（150-250词，理论贡献+实践价值）",
  "timeline": "时间线（150-200词，按学期/年划分的里程碑，典型3-4年PhD）"
}`;

    const userMessage = `${professorSection}

## 学生背景
${studentSection}
${memoryPrompt ? `\n## 学生额外信息（从对话中提取）\n${memoryPrompt}` : ''}
${extra_context ? `\n## 学生补充说明\n${extra_context}` : ''}

请基于以上信息生成研究计划 JSON。`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return Response.json({ error: '研究计划生成格式错误，请重试' }, { status: 500 });
    }

    let proposal: Record<string, string>;
    try {
      proposal = JSON.parse(jsonMatch[0]);
    } catch {
      return Response.json({ error: '研究计划解析失败，请重试' }, { status: 500 });
    }

    const requiredKeys = ['title', 'background', 'research_questions', 'methodology', 'significance', 'timeline'];
    for (const key of requiredKeys) {
      if (!proposal[key]) {
        return Response.json({ error: `研究计划缺少 ${key} 段落，请重试` }, { status: 500 });
      }
    }

    // Save to generated_documents
    const { data: doc, error: insertErr } = await db
      .from('generated_documents')
      .insert({
        user_id: user.id,
        type: 'research_proposal',
        professor_id,
        application_id: application_id || null,
        title: proposal.title,
        content: proposal,
        status: 'draft',
        credits_used: 1,
      })
      .select('id')
      .single();

    if (insertErr) {
      console.error('[research-proposal] save error:', insertErr);
    }

    // Increment usage
    await incrementUsage(supabaseAdmin, user.id, 'research_proposal');

    return Response.json({
      id: doc?.id ?? null,
      proposal,
      credits_used: 1,
    });
  } catch (error) {
    console.error('[research-proposal/generate]', error);
    return Response.json({ error: '研究计划生成失败，请稍后再试' }, { status: 500 });
  }
}

function buildStudentSummary(ctx: NonNullable<Awaited<ReturnType<typeof getStudentContext>>>): string {
  const lines: string[] = [];
  if (ctx.displayName) lines.push(`- 姓名: ${ctx.displayName}`);
  if (ctx.university) lines.push(`- 本科/硕士院校: ${ctx.university}`);
  if (ctx.major) lines.push(`- 专业: ${ctx.major}`);
  if (ctx.degreeLevel) lines.push(`- 学历: ${ctx.degreeLevel}`);
  if (ctx.gpa) lines.push(`- GPA: ${ctx.gpa}${ctx.gpaScale ? `/${ctx.gpaScale}` : ''}`);
  if (ctx.targetField) lines.push(`- 目标研究方向: ${ctx.targetField}`);
  if (ctx.researchInterests?.length) lines.push(`- 研究兴趣: ${ctx.researchInterests.join(', ')}`);
  if (ctx.hasResearchExperience) lines.push(`- 研究经历: ${ctx.researchDescription || '有'}`);
  if (ctx.hasPublications) lines.push(`- 发表论文: ${ctx.publicationDetails || '有'}`);
  if (ctx.publications?.length) lines.push(`- 论文详情: ${ctx.publications.join('; ')}`);
  if (ctx.strengths?.length) lines.push(`- 优势: ${ctx.strengths.join(', ')}`);
  if (ctx.careerGoal) lines.push(`- 职业目标: ${ctx.careerGoal}`);
  if (ctx.englishLevel) lines.push(`- 英语水平: ${ctx.englishLevel}`);

  if (ctx.education?.length) {
    lines.push('\n### 教育经历');
    for (const e of ctx.education) {
      lines.push(`- ${e.degree ?? ''} in ${e.major ?? ''} @ ${e.school ?? ''} (${e.startDate ?? ''}–${e.endDate ?? e.isCurrent ? 'Present' : ''})`);
      if (e.description) lines.push(`  ${e.description}`);
    }
  }

  if (ctx.work?.length) {
    lines.push('\n### 工作/研究经历');
    for (const w of ctx.work) {
      lines.push(`- ${w.position ?? ''} @ ${w.company ?? ''} (${w.startDate ?? ''}–${w.endDate ?? w.isCurrent ? 'Present' : ''})`);
      if (w.description) lines.push(`  ${w.description}`);
    }
  }

  return lines.join('\n');
}
