import { supabaseAdmin } from '../supabase/server';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

export interface StudentContext {
  displayName: string;
  email: string;
  university?: string;
  major?: string;
  degreeLevel?: string;
  gpa?: string;
  gpaScale?: string;
  targetField?: string;
  targetUniversities?: string[];
  englishLevel?: string;
  englishScores?: Record<string, number>;
  hasResearchExperience?: boolean;
  researchDescription?: string;
  hasPublications?: boolean;
  publicationDetails?: string;
  strengths?: string[];
  careerGoal?: string;
  preferredCity?: string[];
  budget?: string;
  startSemester?: string;
  workExperience?: string;
  personalityTags?: string[];
  languagePreference?: string;
  education: Array<{
    school: string;
    major: string;
    degree: string;
    gpa?: string;
    startDate?: string;
    endDate?: string;
    isCurrent?: boolean;
    description?: string;
  }>;
  work: Array<{
    company: string;
    position: string;
    startDate?: string;
    endDate?: string;
    isCurrent?: boolean;
    description?: string;
  }>;
  parsedDocuments: Array<{
    fileName: string;
    fileType: string;
    parsedData?: Record<string, unknown>;
  }>;
  profileCompleteness: number;
  profileCompletedAt?: string;
  researchInterests?: string[];
  publications?: unknown[];
}

export async function getStudentContext(userId: string): Promise<StudentContext | null> {
  try {
    const [profileRes, eduRes, workRes, docsRes] = await Promise.all([
      db.from('user_profiles').select('*').eq('id', userId).single(),
      db.from('education_history').select('*').eq('user_id', userId).order('start_date', { ascending: false }),
      db.from('work_history').select('*').eq('user_id', userId).order('start_date', { ascending: false }),
      db.from('user_documents').select('file_name, file_type, parsed_data, parse_status').eq('user_id', userId).eq('parse_status', 'done'),
    ]);

    const p = profileRes.data;
    if (!p) return null;

    return {
      displayName: p.display_name || '',
      email: p.email || '',
      university: p.university || undefined,
      major: p.major || undefined,
      degreeLevel: p.degree_level || undefined,
      gpa: p.gpa != null ? String(p.gpa) : undefined,
      gpaScale: p.gpa_scale || undefined,
      targetField: p.target_field || undefined,
      targetUniversities: p.target_universities || undefined,
      englishLevel: p.english_level || undefined,
      englishScores: p.english_scores || undefined,
      hasResearchExperience: p.has_research_experience ?? undefined,
      researchDescription: p.research_description || undefined,
      hasPublications: p.has_publications ?? undefined,
      publicationDetails: p.publication_details || undefined,
      strengths: p.strengths || undefined,
      careerGoal: p.career_goal || undefined,
      preferredCity: p.preferred_city || undefined,
      budget: p.budget || undefined,
      startSemester: p.start_semester || undefined,
      workExperience: p.work_experience || undefined,
      personalityTags: p.personality_tags || undefined,
      languagePreference: p.language_preference || undefined,
      education: (eduRes.data ?? []).map((e: Record<string, unknown>) => ({
        school: e.school as string,
        major: e.major as string,
        degree: e.degree as string,
        gpa: e.gpa != null ? String(e.gpa) : undefined,
        startDate: e.start_date as string | undefined,
        endDate: e.end_date as string | undefined,
        isCurrent: e.is_current as boolean | undefined,
        description: e.description as string | undefined,
      })),
      work: (workRes.data ?? []).map((w: Record<string, unknown>) => ({
        company: w.company as string,
        position: w.position as string,
        startDate: w.start_date as string | undefined,
        endDate: w.end_date as string | undefined,
        isCurrent: w.is_current as boolean | undefined,
        description: w.description as string | undefined,
      })),
      parsedDocuments: (docsRes.data ?? []).map((d: Record<string, unknown>) => ({
        fileName: d.file_name as string,
        fileType: d.file_type as string,
        parsedData: d.parsed_data as Record<string, unknown> | undefined,
      })),
      profileCompleteness: p.profile_completeness ?? 0,
      profileCompletedAt: p.profile_completed_at || undefined,
      researchInterests: p.research_interests || undefined,
      publications: p.publications || undefined,
    };
  } catch (e) {
    console.error('[student-context] Failed to load:', e);
    return null;
  }
}

export function buildStudentContextPrompt(ctx: StudentContext): string {
  const sections: string[] = [];

  sections.push('## 当前用户完整画像（系统自动加载，用于精准匹配和个性化回复）');

  // Basic academic info
  const basic: string[] = [];
  if (ctx.displayName) basic.push(`姓名：${ctx.displayName}`);
  if (ctx.university) basic.push(`本校：${ctx.university}`);
  if (ctx.major) basic.push(`专业：${ctx.major}`);
  if (ctx.degreeLevel) basic.push(`学历：${ctx.degreeLevel}`);
  if (ctx.gpa) basic.push(`GPA：${ctx.gpa}${ctx.gpaScale ? `/${ctx.gpaScale}` : ''}`);
  if (ctx.targetField) basic.push(`目标研究方向：${ctx.targetField}`);
  if (ctx.targetUniversities?.length) basic.push(`目标院校：${ctx.targetUniversities.join('、')}`);
  if (ctx.startSemester) basic.push(`计划入学：${ctx.startSemester}`);
  if (basic.length > 0) sections.push(`### 基本信息\n${basic.join('\n')}`);

  // English
  const eng: string[] = [];
  if (ctx.englishLevel) eng.push(`英语水平：${ctx.englishLevel}`);
  if (ctx.englishScores) {
    const scores = Object.entries(ctx.englishScores).map(([k, v]) => `${k}: ${v}`).join(', ');
    if (scores) eng.push(`语言成绩：${scores}`);
  }
  if (eng.length > 0) sections.push(`### 语言能力\n${eng.join('\n')}`);

  // Research
  const research: string[] = [];
  if (ctx.researchInterests?.length) research.push(`研究兴趣：${ctx.researchInterests.join('、')}`);
  if (ctx.hasResearchExperience != null) research.push(`科研经历：${ctx.hasResearchExperience ? '有' : '无'}`);
  if (ctx.researchDescription) research.push(`科研详情：${ctx.researchDescription}`);
  if (ctx.hasPublications != null) research.push(`发表论文：${ctx.hasPublications ? '有' : '无'}`);
  if (ctx.publicationDetails) research.push(`论文详情：${ctx.publicationDetails}`);
  if (ctx.publications && Array.isArray(ctx.publications) && ctx.publications.length > 0) {
    research.push(`论文列表：${JSON.stringify(ctx.publications).slice(0, 500)}`);
  }
  if (ctx.strengths?.length) research.push(`优势：${ctx.strengths.join('、')}`);
  if (research.length > 0) sections.push(`### 科研背景\n${research.join('\n')}`);

  // Education history
  if (ctx.education.length > 0) {
    const eduLines = ctx.education.map(e => {
      const parts = [`${e.school} - ${e.major} (${e.degree})`];
      if (e.gpa) parts.push(`GPA: ${e.gpa}`);
      if (e.isCurrent) parts.push('在读');
      else if (e.endDate) parts.push(`毕业: ${e.endDate}`);
      if (e.description) parts.push(e.description);
      return '- ' + parts.join(', ');
    });
    sections.push(`### 教育经历\n${eduLines.join('\n')}`);
  }

  // Work history
  if (ctx.work.length > 0) {
    const workLines = ctx.work.map(w => {
      const parts = [`${w.company} - ${w.position}`];
      if (w.isCurrent) parts.push('在职');
      else if (w.endDate) parts.push(`至 ${w.endDate}`);
      if (w.description) parts.push(w.description);
      return '- ' + parts.join(', ');
    });
    sections.push(`### 工作经历\n${workLines.join('\n')}`);
  }

  // Parsed document extracts
  if (ctx.parsedDocuments.length > 0) {
    const docLines: string[] = [];
    for (const doc of ctx.parsedDocuments) {
      if (doc.parsedData && Object.keys(doc.parsedData).length > 0) {
        docLines.push(`- ${doc.fileName} (${doc.fileType}): ${JSON.stringify(doc.parsedData).slice(0, 500)}`);
      }
    }
    if (docLines.length > 0) {
      sections.push(`### 已解析文档摘要\n${docLines.join('\n')}`);
    }
  }

  // Preferences
  const prefs: string[] = [];
  if (ctx.careerGoal) prefs.push(`职业目标：${ctx.careerGoal}`);
  if (ctx.preferredCity?.length) prefs.push(`偏好城市：${ctx.preferredCity.join('、')}`);
  if (ctx.budget) prefs.push(`经费情况：${ctx.budget}`);
  if (ctx.workExperience) prefs.push(`工作经验：${ctx.workExperience}`);
  if (ctx.personalityTags?.length) prefs.push(`性格特点：${ctx.personalityTags.join('、')}`);
  if (ctx.languagePreference) prefs.push(`语言偏好：${ctx.languagePreference}`);
  if (prefs.length > 0) sections.push(`### 个人偏好\n${prefs.join('\n')}`);

  // Profile status
  if (ctx.profileCompletedAt) {
    sections.push(`### ✅ 画像已完善（${ctx.profileCompleteness}%，上次更新：${ctx.profileCompletedAt}）\n用户已完成画像收集，不需要再次收集。直接基于以上信息提供个性化建议。如果用户主动说"更新我的信息"或"我有新论文/新经历"，则重新进入画像更新模式。`);
  } else if (ctx.profileCompleteness < 40) {
    sections.push(`### ⚠️ 用户画像不完整（${ctx.profileCompleteness}%）\n请在对话中自然地引导用户补充以下关键信息：专业背景、GPA、科研经历、目标研究方向。信息越完整，匹配和推荐越精准。`);
  }

  return sections.join('\n\n');
}

export function extractSearchKeywords(ctx: StudentContext): string[] {
  const raw: string[] = [];
  if (ctx.targetField) raw.push(ctx.targetField);
  if (ctx.major) raw.push(ctx.major);
  if (ctx.researchDescription) raw.push(ctx.researchDescription);
  if (ctx.strengths?.length) raw.push(...ctx.strengths);

  for (const edu of ctx.education) {
    if (edu.major) raw.push(edu.major);
    if (edu.description) raw.push(edu.description);
  }
  for (const doc of ctx.parsedDocuments) {
    const pd = doc.parsedData;
    if (pd?.researchSummary) raw.push(String(pd.researchSummary));
    if (pd?.technicalSkills) raw.push(String(pd.technicalSkills));
    if (pd?.researchInterests) raw.push(String(pd.researchInterests));
  }

  const words = raw
    .join(' ')
    .toLowerCase()
    .split(/[,;，；、\s/()（）]+/)
    .map(w => w.trim())
    .filter(w => w.length >= 2);

  return [...new Set(words)];
}

export function buildStudentBackgroundForEmail(ctx: StudentContext): string {
  const parts: string[] = [];
  if (ctx.major) parts.push(`专业：${ctx.major}`);
  if (ctx.degreeLevel) parts.push(`学历：${ctx.degreeLevel}`);
  if (ctx.gpa) parts.push(`GPA：${ctx.gpa}${ctx.gpaScale ? `/${ctx.gpaScale}` : ''}`);
  if (ctx.university) parts.push(`毕业院校：${ctx.university}`);
  if (ctx.researchDescription) parts.push(`科研经历：${ctx.researchDescription}`);
  if (ctx.publicationDetails) parts.push(`发表情况：${ctx.publicationDetails}`);
  if (ctx.targetField) parts.push(`目标方向：${ctx.targetField}`);
  if (ctx.strengths?.length) parts.push(`优势：${ctx.strengths.join('、')}`);

  if (ctx.education.length > 0) {
    const edu = ctx.education[0];
    parts.push(`最高学历：${edu.school} ${edu.degree} ${edu.major}${edu.gpa ? ` (GPA: ${edu.gpa})` : ''}`);
  }

  if (ctx.work.length > 0) {
    const w = ctx.work[0];
    parts.push(`工作经历：${w.company} ${w.position}`);
  }

  for (const doc of ctx.parsedDocuments) {
    if (doc.parsedData) {
      const pd = doc.parsedData;
      if (pd.researchSummary) parts.push(`简历摘要：${String(pd.researchSummary).slice(0, 200)}`);
      if (pd.technicalSkills) parts.push(`技术技能：${String(pd.technicalSkills)}`);
    }
  }

  return parts.length > 0 ? parts.join('\n') : '学生背景未提供，请生成通用版本的申请信框架。';
}
