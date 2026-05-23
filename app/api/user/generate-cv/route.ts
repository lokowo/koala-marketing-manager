import { getServerUser } from '../../../lib/auth';
import { supabaseAdmin } from '../../../lib/supabase/server';
import Anthropic from '@anthropic-ai/sdk';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

type CVVersion = 'supervisor' | 'scholarship' | 'general';

const VERSION_PROMPTS: Record<CVVersion, string> = {
  supervisor: `你正在帮助一位学生生成一份面向潜在导师（PhD Supervisor）的学术简历。
重点突出：
- 研究经历和学术成果（论文、项目）放在最前面
- 研究兴趣与潜在导师方向的匹配
- 学术推荐人信息
- 弱化非学术工作经历，除非与研究相关
格式：Research Experience → Education → Publications → Skills → Awards`,

  scholarship: `你正在帮助一位学生生成一份面向奖学金评审委员会的学术简历。
重点突出：
- GPA 和学术荣誉放在教育板块最显眼位置
- 领导力经历、社区贡献、课外活动
- 所有获奖和荣誉（Awards & Honours 单独一节）
- 研究潜力和职业规划
格式：Education → Awards & Honours → Research Experience → Leadership & Service → Skills`,

  general: `你正在帮助一位学生生成一份通用学术简历，适合多种申请场景。
均衡展示：
- 教育背景
- 研究经历
- 工作/实习经历
- 技能与语言
格式：Education → Research Experience → Work Experience → Skills → Awards`,
};

export async function POST(req: Request) {
  try {
    const user = await getServerUser();
    if (!user) return Response.json({ error: '请先登录' }, { status: 401 });

    const body = await req.json();
    const version: CVVersion = body.version ?? 'general';

    if (!['supervisor', 'scholarship', 'general'].includes(version)) {
      return Response.json({ error: 'Invalid version' }, { status: 400 });
    }

    const [profileRes, eduRes, workRes] = await Promise.all([
      db.from('user_profiles').select('*').eq('id', user.id).single(),
      db.from('education_history').select('*').eq('user_id', user.id).order('start_year', { ascending: false }),
      db.from('work_history').select('*').eq('user_id', user.id).order('start_year', { ascending: false }),
    ]);

    const profile = profileRes.data;
    const education = eduRes.data ?? [];
    const work = workRes.data ?? [];

    if (!profile) {
      return Response.json({ error: '请先完善个人资料' }, { status: 400 });
    }

    const userDataSummary = JSON.stringify({
      name: profile.display_name ?? profile.name ?? '',
      email: user.email,
      university: profile.university,
      major: profile.major,
      degree_level: profile.degree_level,
      gpa: profile.gpa,
      gpa_scale: profile.gpa_scale,
      target_field: profile.target_field,
      english_level: profile.english_level,
      research_interests: profile.research_interests,
      research_description: profile.research_description,
      has_research_experience: profile.has_research_experience,
      publications: profile.publications,
      strengths: profile.strengths,
      career_goal: profile.career_goal,
      education: education.map((e: Record<string, unknown>) => ({
        institution: e.institution,
        major: e.major,
        degree_type: e.degree_type,
        gpa: e.gpa,
        gpa_scale: e.gpa_scale,
        start_year: e.start_year,
        end_year: e.end_year,
        status: e.status,
        description: e.description,
      })),
      work: work.map((w: Record<string, unknown>) => ({
        company: w.company,
        position: w.position,
        start_year: w.start_year,
        end_year: w.end_year,
        is_current: w.is_current,
        description: w.description,
      })),
    }, null, 2);

    const systemPrompt = `你是一位专业的学术简历顾问，帮助学生生成高质量的学术 CV。

${VERSION_PROMPTS[version]}

请根据用户数据生成结构化的 CV JSON。

规则：
1. 所有文本输出为英文（学术 CV 标准）
2. 如果用户某项经历的描述太简单（少于 15 个英文词），在该条目标记 "needs_enhancement": true
3. 如果用户缺少某些关键信息，用占位符标注，如 "[To be added]"
4. 日期格式统一为 "YYYY" 或 "YYYY - YYYY" 或 "YYYY - Present"
5. GPA 格式化为 "X.XX/Y.YY"
6. 不要编造任何数据，只用用户提供的真实信息

输出格式（严格 JSON）：
{
  "version": "${version}",
  "header": {
    "name": "string",
    "email": "string",
    "phone": "string or null",
    "address": "string or null",
    "linkedin": "string or null",
    "website": "string or null"
  },
  "sections": [
    {
      "title": "Section Name",
      "items": [
        {
          "title": "string",
          "subtitle": "string or null",
          "date": "string",
          "details": ["bullet point 1", "bullet point 2"],
          "needs_enhancement": false
        }
      ]
    }
  ],
  "skills": {
    "languages": ["string"],
    "technical": ["string"],
    "soft": ["string"]
  }
}`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 3000,
      system: systemPrompt,
      messages: [{ role: 'user', content: `请根据以下用户数据生成 ${version} 版本的学术 CV：\n\n${userDataSummary}` }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return Response.json({ error: 'CV generation failed — invalid response' }, { status: 500 });
    }

    const cvData = JSON.parse(jsonMatch[0]);

    return Response.json({ cv: cvData, version });
  } catch (error) {
    console.error('[generate-cv]', error);
    return Response.json({ error: 'CV 生成失败' }, { status: 500 });
  }
}
