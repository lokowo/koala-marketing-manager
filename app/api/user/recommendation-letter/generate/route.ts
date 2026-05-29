import { getServerUser } from '../../../../lib/auth';
import { supabaseAdmin } from '../../../../lib/supabase/server';
import { checkUsage, incrementUsage } from '../../../../lib/services/usageTracker';
import { getStudentContext } from '../../../../lib/server/student-context';
import { loadMemories, formatMemoriesForPrompt } from '../../../../lib/services/memoryService';
import Anthropic from '@anthropic-ai/sdk';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

interface RecommenderInfo {
  name: string;
  title: string;
  institution: string;
  relationship: string;
  endorsement_areas: string[];
}

export async function POST(req: Request) {
  try {
    const user = await getServerUser();
    if (!user) return Response.json({ error: '请先登录' }, { status: 401 });

    const body = await req.json();

    // Support both nested { recommender: {...} } and flat { recommender_name, recommender_title, ... } formats
    let recommender: RecommenderInfo;
    if (body.recommender?.name) {
      recommender = body.recommender;
    } else if (body.recommender_name) {
      recommender = {
        name: body.recommender_name,
        title: body.recommender_title || '',
        institution: body.recommender_institution || '',
        relationship: body.relationship || '',
        endorsement_areas: body.endorsement_areas || [],
      };
    } else {
      return Response.json({ error: '推荐人信息不完整（至少需要姓名）' }, { status: 400 });
    }
    const { professor_id, application_id } = body as {
      professor_id?: string;
      application_id?: string;
    };

    if (!recommender.name) {
      return Response.json({ error: '推荐人姓名不能为空' }, { status: 400 });
    }

    const usage = await checkUsage(supabaseAdmin, user.id, 'recommendation_letter');
    if (!usage.allowed) {
      return Response.json({
        error: '推荐信生成次数已达上限',
        used: usage.used,
        limit: usage.limit,
      }, { status: 403 });
    }

    const [studentCtx, memories, profRes] = await Promise.all([
      getStudentContext(user.id),
      loadMemories(supabaseAdmin, user.id),
      professor_id
        ? db.from('professors')
            .select('id, name, university, faculty, position_title, research_areas')
            .eq('id', professor_id)
            .single()
        : Promise.resolve({ data: null }),
    ]);

    if (!studentCtx || studentCtx.profileCompleteness < 20) {
      return Response.json({ error: '请先完善个人资料（至少填写教育背景和研究兴趣）' }, { status: 400 });
    }

    const professor = profRes.data;
    const studentSection = buildStudentSummary(studentCtx);
    const memoryPrompt = formatMemoriesForPrompt(memories);

    const recommenderSection = `## 推荐人信息
- 姓名: ${recommender.name}
- 职称: ${recommender.title}
- 机构: ${recommender.institution}
- 与学生关系: ${recommender.relationship}
- 可背书方面: ${recommender.endorsement_areas?.length ? recommender.endorsement_areas.join('、') : '综合能力'}`;

    let targetSection = '';
    if (professor) {
      const researchAreas = (professor.research_areas ?? []).join(', ');
      targetSection = `\n\n## 申请目标导师
- 姓名: ${professor.name}
- 职位: ${professor.position_title ?? 'Professor'}
- 大学: ${professor.university}${professor.faculty ? ` · ${professor.faculty}` : ''}
- 研究方向: ${researchAreas || '未知'}`;
    }

    const systemPrompt = `你是一位资深的澳洲博士申请顾问，擅长帮助学生准备推荐信材料。

你的任务是生成两部分内容：
1. **推荐信草稿 (letter)**: 以推荐人的口吻撰写，约 1 页（400-600 词英文）
2. **给推荐人的说明邮件 (cover_note)**: 学生发给推荐人的简短说明（150-250 词中文）

## 推荐信要求
- 以推荐人第一人称撰写，语气学术、得体、适合澳洲博士申请
- 开头说明推荐人与学生的关系和认识时长
- 基于学生真实经历突出推荐人可背书的方面（学术能力、研究潜力、个人品质等）
- 如有目标导师信息，在信中提及学生的研究兴趣与目标方向的契合度
- 不浮夸、不编造具体数据或不存在的经历
- 结尾明确推荐学生攻读 PhD，表达对学生潜力的信心
- 使用标准学术推荐信格式（Date, To whom it may concern, 正文, Sincerely）

## 说明邮件要求
- 用中文撰写，语气礼貌、简洁
- 说明学生正在申请的项目/方向
- 简要告知推荐人需要做什么（审阅草稿、根据实际情况修改、签名提交）
- 提及附件中有推荐信草稿供参考
- 表达感谢

## 输出格式（严格 JSON，不要 markdown 代码块）
{
  "letter": "完整推荐信文本",
  "cover_note": "给推荐人的说明邮件文本"
}`;

    const userMessage = `${recommenderSection}
${targetSection}

## 学生背景
${studentSection}
${memoryPrompt ? `\n## 学生额外信息（从对话中提取）\n${memoryPrompt}` : ''}

请基于以上信息生成推荐信 JSON。`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 3000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return Response.json({ error: '推荐信生成格式错误，请重试' }, { status: 500 });
    }

    let result: { letter: string; cover_note: string };
    try {
      result = JSON.parse(jsonMatch[0]);
    } catch {
      return Response.json({ error: '推荐信解析失败，请重试' }, { status: 500 });
    }

    if (!result.letter || !result.cover_note) {
      return Response.json({ error: '推荐信内容不完整，请重试' }, { status: 500 });
    }

    const { data: doc, error: insertErr } = await db
      .from('generated_documents')
      .insert({
        user_id: user.id,
        type: 'recommendation_letter',
        professor_id: professor_id || null,
        application_id: application_id || null,
        title: `Recommendation Letter — ${recommender.name} for ${studentCtx.displayName || 'Student'}`,
        content: {
          letter: result.letter,
          cover_note: result.cover_note,
          recommender,
        },
        status: 'draft',
        credits_used: 1,
      })
      .select('id')
      .single();

    if (insertErr || !doc) {
      console.error('[recommendation-letter] save error:', insertErr);
      return Response.json({ error: '推荐信已生成但保存失败，请重试' }, { status: 500 });
    }

    await incrementUsage(supabaseAdmin, user.id, 'recommendation_letter');

    return Response.json({
      id: doc.id,
      letter: result.letter,
      cover_note: result.cover_note,
      credits_used: 1,
    });
  } catch (error) {
    console.error('[recommendation-letter/generate]', error);
    return Response.json({ error: '推荐信生成失败，请稍后再试' }, { status: 500 });
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
      lines.push(`- ${e.degree ?? ''} in ${e.major ?? ''} @ ${e.school ?? ''} (${e.startYear ?? ''}–${e.endYear ?? (e.isCurrent ? 'Present' : '')})`);
      if (e.description) lines.push(`  ${e.description}`);
    }
  }

  if (ctx.work?.length) {
    lines.push('\n### 工作/研究经历');
    for (const w of ctx.work) {
      lines.push(`- ${w.position ?? ''} @ ${w.company ?? ''} (${w.startYear ?? ''}–${w.endYear ?? (w.isCurrent ? 'Present' : '')})`);
      if (w.description) lines.push(`  ${w.description}`);
    }
  }

  return lines.join('\n');
}
