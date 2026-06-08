import Anthropic from '@anthropic-ai/sdk';
import { supabaseAdmin } from '../supabase/server';
import { getProfessor } from './professorService';
import { refreshProfessorData } from './professorRefreshService';
import { checkUsage, incrementUsage } from './usageTracker';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

export interface Highlight {
  text: string;
  type: 'student' | 'professor';
  source?: string;
}

export interface MatchScore {
  dimension: string;
  score: number;
  reason: string;
}

export interface ColdEmailResult {
  id: string | null;
  subject: string;
  body: string;
  highlights: Highlight[];
  matchScores: MatchScore[];
  creditsUsed: number;
  creditsRemaining: number;
  professorId: string;
  professorName: string;
  professorEmail: string | null;
  professorUniversity: string;
  error?: string;
  billingExhausted?: boolean;
}

export function buildStudentSummary(profile: Record<string, unknown>): string {
  const parts: string[] = [];
  if (profile.display_name) parts.push(`Name: ${profile.display_name}`);
  if (profile.university) parts.push(`University: ${profile.university}`);
  if (profile.major) parts.push(`Major: ${profile.major}`);
  if (profile.degree_level) parts.push(`Current degree: ${profile.degree_level}`);
  if (profile.gpa) parts.push(`GPA: ${profile.gpa}${profile.gpa_scale ? `/${profile.gpa_scale}` : ''}`);
  if (profile.target_field) parts.push(`Target research field: ${profile.target_field}`);
  if (profile.english_level) parts.push(`English: ${profile.english_level}`);
  if (profile.has_research_experience) parts.push(`Has research experience: yes`);
  if (profile.research_description) parts.push(`Research experience: ${profile.research_description}`);
  if (profile.has_publications) parts.push(`Has publications: yes`);
  if (profile.publication_details) parts.push(`Publications: ${profile.publication_details}`);
  if (profile.career_goal) parts.push(`Career goal: ${profile.career_goal}`);
  if (profile.work_experience) parts.push(`Work experience: ${profile.work_experience}`);
  if (profile.strengths && Array.isArray(profile.strengths) && (profile.strengths as string[]).length > 0) {
    parts.push(`Strengths: ${(profile.strengths as string[]).join(', ')}`);
  }
  return parts.join('\n') || 'Minimal profile available';
}

type ProfessorData = NonNullable<Awaited<ReturnType<typeof getProfessor>>>;

export function buildProfessorSummary(
  prof: ProfessorData,
  papers: Array<{ title: string; year: number | null; citation_count: number | null; journal: string | null; doi_url: string | null; abstract: string | null }>,
  grants: Array<{ project_title: string; funding_body: string; year: string; amount: string | null }>,
): string {
  const parts: string[] = [
    `Name: ${prof.name}`,
    `University: ${prof.university}`,
    `Faculty: ${prof.faculty || 'N/A'}`,
    `Position: ${prof.positionTitle || prof.title || 'N/A'}`,
    `Research areas: ${prof.researchAreas.join(', ')}`,
    `H-index: ${prof.hIndex ?? 'N/A'}`,
    `Paper count: ${prof.paperCount ?? 'N/A'}`,
    `Citation count: ${prof.citationCount ?? 'N/A'}`,
    `Accepting students: ${prof.acceptingStudents ?? 'unknown'}`,
  ];

  if (prof.suitableStudentBackgrounds.length > 0) {
    parts.push(`Suitable student backgrounds: ${prof.suitableStudentBackgrounds.join('; ')}`);
  }
  if (prof.potentialRpTopics.length > 0) {
    parts.push(`Potential RP topics: ${prof.potentialRpTopics.join('; ')}`);
  }

  if (papers.length > 0) {
    parts.push('\nRecent papers:');
    for (const p of papers) {
      const line = `- "${p.title}" (${p.year ?? 'n/a'}, ${p.journal ?? 'n/a'}, citations: ${p.citation_count ?? 0})`;
      parts.push(line);
      if (p.abstract) parts.push(`  Abstract: ${p.abstract.slice(0, 200)}...`);
    }
  }

  if (grants.length > 0) {
    parts.push('\nRecent grants:');
    for (const g of grants) {
      parts.push(`- "${g.project_title}" (${g.funding_body}, ${g.year}${g.amount ? `, ${g.amount}` : ''})`);
    }
  }

  return parts.join('\n');
}

export function calculateMatchScores(
  profile: Record<string, unknown>,
  prof: ProfessorData,
): MatchScore[] {
  const scores: MatchScore[] = [];

  const studentField = ((profile.target_field as string) ?? '').toLowerCase();
  const profAreas = prof.researchAreas.map((a) => a.toLowerCase());
  const areaOverlap = profAreas.some((a) => studentField.includes(a) || a.includes(studentField));
  scores.push({
    dimension: 'research_alignment',
    score: areaOverlap && studentField ? 85 : studentField ? 60 : 30,
    reason: areaOverlap ? '研究方向高度匹配' : studentField ? '研究方向部分相关' : '缺少学生研究方向信息',
  });

  const backgrounds = prof.suitableStudentBackgrounds.map((b) => b.toLowerCase());
  const studentMajor = ((profile.major as string) ?? '').toLowerCase();
  const bgMatch = backgrounds.some((b) => studentMajor.includes(b) || b.includes(studentMajor));
  scores.push({
    dimension: 'background_fit',
    score: bgMatch && studentMajor ? 80 : studentMajor ? 55 : 30,
    reason: bgMatch ? '学术背景符合教授要求' : studentMajor ? '学术背景部分匹配' : '缺少学生专业信息',
  });

  const hasResearch = profile.has_research_experience as boolean;
  const hasPubs = profile.has_publications as boolean;
  scores.push({
    dimension: 'research_readiness',
    score: hasPubs ? 90 : hasResearch ? 70 : 40,
    reason: hasPubs ? '有发表经历，科研准备度高' : hasResearch ? '有科研经验' : '尚无科研经验',
  });

  const opScore = prof.opportunityScore ?? 50;
  scores.push({
    dimension: 'opportunity',
    score: opScore,
    reason:
      prof.acceptingStudents === 'yes'
        ? '教授明确招生中'
        : prof.grantStatus === 'Active'
          ? '教授有活跃科研经费'
          : '招生状态未知',
  });

  return scores;
}

export async function generateColdEmailForProfessor(
  userId: string,
  userEmail: string,
  professorId: string,
): Promise<ColdEmailResult> {
  const emptyResult = (professorName: string, professorEmail: string | null, professorUniversity: string, error: string, billingExhausted?: boolean): ColdEmailResult => ({
    id: null, subject: '', body: '', highlights: [], matchScores: [], creditsUsed: 0, creditsRemaining: 0,
    professorId, professorName, professorEmail, professorUniversity, error, billingExhausted,
  });

  await refreshProfessorData(supabaseAdmin, professorId).catch((err) =>
    console.error('[cold-email] refresh failed:', err),
  );

  const professor = await getProfessor(professorId);
  if (!professor) {
    return emptyResult('Unknown', null, '', '教授不存在');
  }

  const { data: profile } = await db
    .from('user_profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (!profile) {
    return emptyResult(professor.name, professor.email || null, professor.university, '请先完善个人画像');
  }

  // ── Billing: monthly quota first, then credits ──
  const quota = await checkUsage(supabaseAdmin, userId, 'email');
  let usedCredits = false;

  if (!quota.allowed) {
    const credits = (profile.credits_remaining as number) ?? 0;
    if (credits <= 0) {
      return { ...emptyResult(professor.name, professor.email || null, professor.university, '本月申请信额度已用完，请升级订阅或购买积分包'), billingExhausted: true, creditsRemaining: 0 };
    }
    usedCredits = true;
  }

  const [papersRes, grantsRes] = await Promise.all([
    db.from('papers').select('title, year, citation_count, journal, doi_url, abstract').eq('professor_id', professorId).order('year', { ascending: false }).limit(5),
    db.from('grants').select('project_title, funding_body, year, amount').eq('lead_professor_id', professorId).order('year', { ascending: false }).limit(3),
  ]);
  const papers = papersRes.data ?? [];
  const grants = grantsRes.data ?? [];

  const studentInfo = buildStudentSummary(profile);
  const professorInfo = buildProfessorSummary(professor, papers, grants);
  const hasPapers = papers.length > 0;

  const generatePrompt = `You are a PhD application cold email specialist. Generate a concise, professional cold email from a prospective PhD student to an Australian professor.

## Student Profile
${studentInfo}

## Professor Profile
${professorInfo}

## Requirements
1. First paragraph: brief self-introduction based on the student profile (university, major, research experience)
2. ${hasPapers ? "Second paragraph: reference at least one specific paper from the professor's 'Recent papers' list above — use the EXACT paper title verbatim, never alter or invent it. Explain why it interests the student." : "Second paragraph: NO specific papers are available for this professor. Do NOT invent or cite any paper title, journal name, or publication year. Instead, engage with the professor's research areas and potential RP topics in general terms."}
3. Third paragraph: identify research intersections between the student's interests and the professor's potential RP topics (${professor.potentialRpTopics.join(', ') || 'general research areas'}). Be specific about shared methodologies or questions.
4. Closing: express interest in PhD supervision, mention attaching CV, and propose a brief meeting.
5. Total length: 250-350 words in English.
6. Tone: professional but personable — not overly formal.
7. Subject line: specific, referencing the research area.
8. CRITICAL ANTI-FABRICATION RULE: Only reference papers that explicitly appear in the Professor Profile's "Recent papers" list above. Never fabricate paper titles, journals, years, DOIs, or any publication details. If no papers are listed, discuss research directions only.

## Output Format
Return a valid JSON object with exactly this structure (no markdown fencing):
{
  "subject": "Email subject line",
  "body": "Full email body text"
}`;

  const generateResponse = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1500,
    system: 'You are a PhD application email expert. Output only valid JSON, no markdown code fences.',
    messages: [{ role: 'user', content: generatePrompt }],
  });

  const genText = (generateResponse.content[0] as { type: 'text'; text: string }).text.trim();
  let emailData: { subject: string; body: string };
  try {
    emailData = JSON.parse(genText.replace(/```json|```/g, ''));
  } catch {
    return { id: null, subject: '', body: '', highlights: [], matchScores: [], creditsUsed: 0, creditsRemaining: 0, professorId, professorName: professor.name, professorEmail: professor.email || null, professorUniversity: professor.university, error: '邮件生成格式错误' };
  }

  const WATERMARK = '\n\n---\nCrafted with Koala PhD | AI-powered PhD advisor\nProfessor portal: koalaphd.com/professor/claim';
  emailData.body += WATERMARK;

  const matchScores = calculateMatchScores(profile, professor);

  // Highlight annotation (best-effort, non-blocking)
  let highlights: Highlight[] = [];
  try {
    const highlightResponse = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1500,
      system: 'You are a text analysis assistant. Output only valid JSON arrays, no markdown code fences.',
      messages: [{ role: 'user', content: `Analyze this cold email and annotate each sentence with its source.\n\nEmail:\n${emailData.body}\n\nStudent data used: ${studentInfo}\nProfessor data used: ${professorInfo}\n\nFor each sentence, determine if the information primarily comes from:\n- "student": student's background, experience, interests, or qualifications\n- "professor": professor's research, papers, grants, or academic profile\n\nReturn a valid JSON array (no markdown fencing):\n[\n  { "text": "sentence text", "type": "student" or "professor", "source": "brief explanation of data source" }\n]` }],
    });
    const hlText = (highlightResponse.content[0] as { type: 'text'; text: string }).text.trim();
    highlights = JSON.parse(hlText.replace(/```json|```/g, ''));
  } catch {
    // Non-critical
  }

  // ── Execute billing ──
  await incrementUsage(supabaseAdmin, userId, 'email', {
    professor_id: professorId,
    professor_name: professor.name,
  });

  if (usedCredits) {
    const newBalance = (profile.credits_remaining as number) - 1;
    await db
      .from('user_profiles')
      .update({ credits_remaining: newBalance })
      .eq('id', userId);

    await db.from('credit_transactions').insert({
      user_id: userId,
      amount: -1,
      balance_after: newBalance,
      type: 'cold_email',
      description: `套磁信生成（额度外） - ${professor.name} (${professor.university})`,
      reference_id: professorId,
    });
  }

  const { data: savedEmail } = await db
    .from('cold_emails')
    .insert({
      user_id: userId,
      professor_id: professorId,
      subject: emailData.subject,
      body: emailData.body,
      highlights,
      match_scores: matchScores,
      student_snapshot: {
        university: profile.university,
        major: profile.major,
        degree_level: profile.degree_level,
        target_field: profile.target_field,
        research_description: profile.research_description,
      },
      professor_snapshot: {
        name: professor.name,
        university: professor.university,
        research_areas: professor.researchAreas,
        h_index: professor.hIndex,
        potential_rp_topics: professor.potentialRpTopics,
      },
    })
    .select('id')
    .single();

  const { data: updatedProfile } = await db
    .from('user_profiles')
    .select('credits_remaining')
    .eq('id', userId)
    .single();

  return {
    id: savedEmail?.id ?? null,
    subject: emailData.subject,
    body: emailData.body,
    highlights,
    matchScores,
    creditsUsed: usedCredits ? 1 : 0,
    creditsRemaining: updatedProfile?.credits_remaining ?? 0,
    professorId,
    professorName: professor.name,
    professorEmail: professor.email || null,
    professorUniversity: professor.university,
  };
}
