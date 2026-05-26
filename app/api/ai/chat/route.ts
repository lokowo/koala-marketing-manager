import type { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import type { AIMode } from '../../../lib/constants';
import type { ChatMessage, UserStyleProfile, ProfessorContext } from '../../../lib/types';
import { buildSystemPrompt, describeUserStyle } from '../../../lib/prompts/index';
import { searchAcademicSources, papersToRAGContext, type AcademicPaper } from '../../../lib/server/academic-search';
import { searchKnowledgeBase, searchPaperAbstracts, searchProfessorProfiles, searchProfessorPapers, searchProfessorsByTags, assembleRAGContext } from '../../../lib/server/rag-engine';
import { filterSensitiveContent } from '../../../lib/server/sensitive-filter';
import { searchProfessorsForAI, getProfessor } from '../../../lib/services/professorService';
import { findOrCreateProfessor } from '../../../lib/services/professorAutoAdd';
import type { Professor } from '../../../lib/types';
import { getStudentContext, buildStudentContextPrompt } from '../../../lib/server/student-context';
import { aiLimiter, anonDailyLimiter, safeLimit } from '../../../lib/ratelimit';
import { matchFAQ } from '../../../lib/ola/ola-faq';
import { upsertSession } from '../../../lib/ola/ola-session';
import { recordEvent } from '../../../lib/ola/ola-events';
import { detectEmotion, getEmotionPromptSuffix } from '../../../lib/ola/ola-emotion';
import { getOlaPersonaPrompt } from '../../../lib/prompts/ola-persona';
import { getDeadlineContext } from '../../../lib/ola/ola-deadlines';
import { loadMemories, formatMemoriesForPrompt, extractMemories, saveMemories, syncToProfile } from '../../../lib/services/memoryService';
import { logConversation, parseOlaStateTag, detectUserReaction } from '../../../lib/services/olaConversationLogger';
import { getOrCreateMemory, updateIntimacy, updateMemoryFromConversation, buildOlaMemoryPrompt, type OlaUserMemory } from '../../../lib/services/olaMemoryService';
import { buildLocalKnowledgePrompt } from '../../../lib/services/olaLocalKnowledgeService';

if (!process.env.ANTHROPIC_API_KEY) {
  console.error('[AI Chat] ANTHROPIC_API_KEY is not configured');
}

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ─── Tool definitions for Claude ─────────────────────────────────────────────

const PROFESSOR_SEARCH_TOOL: Anthropic.Tool = {
  name: 'searchProfessors',
  description: '从 Koala 数据库搜索真实澳洲教授。根据研究方向关键词匹配，返回教授列表（含 ID、姓名、学校、H指数、研究方向、招生状态）。当你需要推荐教授时必须调用此工具，绝不可以编造教授信息。',
  input_schema: {
    type: 'object' as const,
    properties: {
      researchArea: {
        type: 'string',
        description: '研究方向关键词，多个用逗号分隔，如 "machine learning, computer vision" 或 "cancer, immunotherapy"',
      },
      university: {
        type: 'string',
        description: '可选，指定大学名称筛选，如 "University of Melbourne"',
      },
      universityGroup: {
        type: 'string',
        description: '可选，按大学联盟筛选：Go8（八大）、ATN（科技联盟）、IRU（创新研究联盟）',
        enum: ['Go8', 'ATN', 'IRU'],
      },
      scholarshipRequired: {
        type: 'boolean',
        description: '可选，为 true 时只返回有活跃科研经费（可能提供奖学金）的教授',
      },
      limit: {
        type: 'number',
        description: '返回数量，默认 8，最多 15',
      },
    },
    required: ['researchArea'],
  },
};

interface ToolPaper {
  title: string;
  journal: string | null;
  year: number | null;
  doi_url: string | null;
  citation_count: number;
}

function professorToToolResult(p: Professor, score?: number, reasons?: string[], latestPapers?: ToolPaper[]) {
  return {
    id: p.id,
    name: p.name,
    university: p.university,
    faculty: p.faculty,
    positionTitle: p.positionTitle || null,
    researchAreas: p.researchAreas,
    hIndex: p.hIndex ?? null,
    paperCount: p.paperCount ?? null,
    citationCount: p.citationCount ?? null,
    acceptingStudents: p.acceptingStudents ?? 'unknown',
    grantStatus: p.grantStatus ?? null,
    opportunityScore: p.opportunityScore ?? null,
    matchScore: score ?? null,
    matchReasons: reasons ?? [],
    suitableStudentBackgrounds: p.suitableStudentBackgrounds,
    potentialRpTopics: p.potentialRpTopics,
    detailUrl: `/koala/professors/${p.id}`,
    latest_papers: latestPapers ?? [],
  };
}

async function fetchLatestPapersForProfessors(professorIds: string[]): Promise<Record<string, ToolPaper[]>> {
  if (professorIds.length === 0) return {};
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
    const { data } = await supabase
      .from('papers')
      .select('professor_id, title, journal, year, doi_url, citation_count')
      .in('professor_id', professorIds)
      .order('year', { ascending: false })
      .limit(professorIds.length * 3);
    const map: Record<string, ToolPaper[]> = {};
    for (const row of (data ?? []) as Array<{ professor_id: string; title: string; journal: string | null; year: number | null; doi_url: string | null; citation_count: number }>) {
      if (!map[row.professor_id]) map[row.professor_id] = [];
      if (map[row.professor_id].length < 2) {
        map[row.professor_id].push({
          title: row.title,
          journal: row.journal,
          year: row.year,
          doi_url: row.doi_url,
          citation_count: row.citation_count,
        });
      }
    }
    return map;
  } catch {
    return {};
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function extractAllBlocks(text: string): {
  scoreCard?: { totalScore: number; dimensions: Array<{ name: string; score: number }> };
  professors?: { professors: unknown[] };
  email?: unknown;
  quickReplies?: { replies: string[] };
} {
  const result: Record<string, unknown> = {};
  const regex = /```json\n([\s\S]*?)\n```/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    try {
      const obj = JSON.parse(match[1]) as { type?: string };
      if (obj.type === 'scoreCard') result.scoreCard = obj;
      if (obj.type === 'professorMatches') result.professors = obj;
      if (obj.type === 'email') result.email = obj;
      if (obj.type === 'quickReplies') result.quickReplies = obj;
    } catch {}
  }
  return result;
}

function cleanReply(text: string): string {
  return text.replace(/```json\n[\s\S]*?\n```/g, '').replace(/\n{3,}/g, '\n\n').trim();
}

function detectIntent(message: string): 'outreach' | 'matching' | 'academic' | 'general' {
  const m = message.toLowerCase();
  if (/套磁|cold email|outreach|联系导师|给.*写.*信|写邮件/.test(m)) return 'outreach';
  if (/找导师|推荐导师|哪个导师|导师匹配|谁在做|what professor|supervisor/.test(m)) return 'matching';
  // Broad academic intent detection — any research/technical question
  if (/实验|论文|研究|方法|材料|数据|合成|分析|原理|机制|理论|假设|变量|模型|框架|范式/.test(m)) return 'academic';
  if (/algorithm|electrode|catalyst|protein|gene|model|dataset|methodology|hypothesis|regression|neural|spectrum|synthesis|kinetics|thermodynamics|optimization|simulation|statistical/.test(m)) return 'academic';
  if (/怎么做|如何设计|什么原理|为什么会|区别是什么|比较|对比|前沿|进展|综述|review|survey|state.of.the.art|benchmark/.test(m)) return 'academic';
  if (/machine learning|deep learning|nlp|computer vision|reinforcement|transformer|diffusion|quantum|nano|bio|chem|phys/.test(m)) return 'academic';
  return 'general';
}

const HIGH_VALUE_INTENT_RE = /找导师|选校|匹配|申请\s*(?:PhD|博士|phd)|套磁|奖学金|research\s*proposal|选方向|写申请信|导师推荐|转专业读博|联系教授|cold\s*email|supervisor|scholarship|phd\s*application|professor\s*matching/i;

const UPDATE_PROFILE_RE = /更新我的信息|更新.*(?:画像|资料|背景)|修改.*(?:画像|资料|背景)|我发了.*(?:论文|paper)|新(?:论文|经历|实习|工作)|update.*(?:profile|info)|换了.*(?:专业|方向|学校)/i;

function hasHighValueIntent(message: string): boolean {
  return HIGH_VALUE_INTENT_RE.test(message);
}

function hasUpdateProfileIntent(message: string): boolean {
  return UPDATE_PROFILE_RE.test(message);
}

function extractProfessorName(message: string): string | null {
  const m = message.match(/(?:给|写给|联系|套磁|email to|write to|contact)\s+(?:Prof\.?\s+|Professor\s+|Dr\.?\s+)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})/);
  if (m) return m[1];
  const m2 = message.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z.]+){1,3})\s*教授/);
  if (m2) return m2[1];
  return null;
}

/** Fire-and-forget: record professor interactions for the match counter */
async function recordProfessorInteractions(
  userId: string | null,
  professorIds: string[],
  interactionType: string,
) {
  if (professorIds.length === 0) return;
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return;
    const supabase = createClient(url, key);
    const rows = professorIds.map(pid => ({
      user_id: userId || null,
      professor_id: pid,
      interaction_type: interactionType,
    }));
    await supabase.from('professor_interactions').insert(rows);
  } catch (err) {
    console.error('[recordProfessorInteractions]', err);
  }
}

function shouldSuggestConsultation(messages: ChatMessage[], mode: AIMode): boolean {
  if (messages.length < 6) return false;
  if (mode === 'path' && messages.length >= 8) return true;
  const anxious = messages.some(m =>
    m.role === 'user' && /焦虑|崩溃|绝望|放弃|怎么办|不知道|迷茫/i.test(m.content)
  );
  return anxious && messages.length > 4;
}

function papersToCitations(papers: AcademicPaper[]) {
  return papers.map(p => ({
    title: p.title,
    authors: p.authors.join(', '),
    year: p.year,
    journal: p.journal,
    doi: p.doi ?? '',
    url: p.referenceLink,
    openAccessUrl: p.openAccessUrl,
    arxivUrl: p.arxivUrl,
    citations: p.citations,
    abstract: p.abstract,
  }));
}

// ─── Main handler ─────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      mode,
      messages,
      professorContext,
      userStyleProfile,
      professorId,
      studentProfile: studentMatchProfile,
    }: {
      mode: AIMode;
      messages: ChatMessage[];
      professorContext?: ProfessorContext;
      userStyleProfile?: UserStyleProfile;
      professorId?: string;
      studentProfile?: { languagePreference?: string; personalityTags?: string[]; careerGoal?: string; preferredCity?: string[]; budget?: string };
    } = body;

    if (!mode || !messages || !Array.isArray(messages)) {
      return Response.json({ error: 'Invalid request' }, { status: 400 });
    }

    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const allowed = await safeLimit(aiLimiter, ip);
    if (!allowed) return Response.json({ error: '请求过于频繁，请稍后再试' }, { status: 429 });

    // Resolve user ID early for session/event tracking
    let trackingUserId: string | null = (body.userId as string) || null;
    if (!trackingUserId) {
      try {
        const { getServerUser: getUser } = await import('../../../lib/auth');
        const u = await getUser();
        if (u) trackingUserId = u.id;
      } catch { /* anonymous */ }
    }

    const sessionId = (body.sessionId as string) || `session_${Date.now()}`;

    // Anonymous daily limit: 10 requests/day per IP (backend enforcement)
    if (!trackingUserId) {
      const anonAllowed = await safeLimit(anonDailyLimiter, `anon:${ip}`);
      if (!anonAllowed) {
        return Response.json({
          error: 'daily_limit_reached',
          reply: '今日免费体验次数已用完，登录后可继续使用',
        }, { status: 403 });
      }
    }

    // Daily usage check — free users limited to FREE_LIMITS.dailyAiTurns (10/day)
    if (trackingUserId) {
      try {
        const { createClient } = await import('@supabase/supabase-js');
        const usageDb = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!,
        );
        const { checkUsage } = await import('../../../lib/services/usageTracker');
        const usage = await checkUsage(usageDb, trackingUserId, 'chat');
        if (!usage.allowed) {
          return Response.json(
            {
              error: 'daily_limit_reached',
              reply: `今日免费对话次数已用完（${usage.used}/${usage.limit}），升级订阅可不限次对话`,
              usageInfo: { used: usage.used, limit: usage.limit },
            },
            { status: 403 },
          );
        }
      } catch (err) {
        console.error('[AI Chat] usage check failed, allowing request:', err);
      }
    }

    // Session tracking (fire-and-forget)
    upsertSession(sessionId, { userId: trackingUserId ?? undefined, mode }).catch(err =>
      console.error('[ola-session]', err)
    );

    // FAQ matching — intercept before LLM if high-confidence hit (≥0.85)
    if (messages.length > 0) {
      const lastUserMsg = messages[messages.length - 1];
      if (lastUserMsg.role === 'user') {
        try {
          const faqMatch = await matchFAQ(lastUserMsg.content);
          if (faqMatch && faqMatch.score >= 0.85) {
            recordEvent(sessionId, 'faq_hit', {
              faq_id: faqMatch.id,
              category: faqMatch.category,
              score: faqMatch.score,
            }, trackingUserId).catch(() => {});

            // Persist FAQ answer into ai_conversations so history sidebar picks it up
            saveFAQConversationAsync(sessionId, mode, messages, faqMatch.answer_zh, trackingUserId).catch(() => {});

            return Response.json({
              reply: faqMatch.answer_zh,
              reply_en: faqMatch.answer_en,
              faqMatch: {
                id: faqMatch.id,
                category: faqMatch.category,
                score: faqMatch.score,
                rich_card_type: faqMatch.rich_card_type,
                rich_card_data: faqMatch.rich_card_data,
              },
            });
          }
        } catch (err) {
          console.error('[FAQ match]', err);
        }
      }
    }

    // Record LLM call event (FAQ missed, proceeding to LLM)
    const currentIntent = messages.length > 0 ? detectIntent(messages[messages.length - 1].content) : 'general';
    recordEvent(sessionId, 'llm_call', { mode, intent: currentIntent }, trackingUserId).catch(() => {});

    // 1. Build system prompt — standard assembly order:
    //    persona → emotion → user context → RAG → stage tracking → professor rules
    let extraContext = '';

    // Emotion detection
    if (messages.length > 0) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg.role === 'user') {
        const emotion = detectEmotion(lastMsg.content);
        if (emotion) {
          extraContext += `\n\n## 情绪检测\n${getEmotionPromptSuffix(emotion)}`;
        }
      }
    }

    if (userStyleProfile) {
      const styleDesc = describeUserStyle(userStyleProfile);
      if (styleDesc) extraContext += `\n\n## 用户说话风格\n${styleDesc}。请匹配用户风格回复。`;
    }

    // Load full student profile from DB (replaces thin frontend-passed data)
    let studentCtx: Awaited<ReturnType<typeof getStudentContext>> = null;
    try {
      const { getServerUser } = await import('../../../lib/auth');
      const user = await getServerUser();
      if (user) {
        studentCtx = await getStudentContext(user.id);
      }
    } catch { /* anonymous user */ }

    // Load user memories for prompt injection (graceful degradation — never block chat)
    let memoryPrompt = '';
    if (trackingUserId) {
      try {
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (url && key) {
          const { createClient } = await import('@supabase/supabase-js');
          const memDb = createClient(url, key);
          const memories = await loadMemories(memDb, trackingUserId);
          memoryPrompt = formatMemoriesForPrompt(memories);
        }
      } catch (err) {
        console.error('[memoryService] Failed to load memories, continuing without:', err);
      }
    }

    if (memoryPrompt) {
      extraContext += '\n\n' + memoryPrompt;
    }

    // Load Ola user memory (intimacy, MBTI, personal details, memorable events)
    let olaMemory: OlaUserMemory | null = null;
    if (trackingUserId) {
      try {
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (url && key) {
          const { createClient } = await import('@supabase/supabase-js');
          const olaDb = createClient(url, key);
          olaMemory = await getOrCreateMemory(olaDb, trackingUserId);
          const olaMemoryPrompt = buildOlaMemoryPrompt(olaMemory);
          extraContext += '\n\n' + olaMemoryPrompt;
        }
      } catch (err) {
        console.error('[olaMemory] Failed to load, continuing without:', err);
      }
    }

    // Load local knowledge (calendar, events, venues, time-based greeting)
    try {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (url && key) {
        const { createClient } = await import('@supabase/supabase-js');
        const localDb = createClient(url, key);
        const userCity = olaMemory?.city ?? 'sydney';
        const localPrompt = await buildLocalKnowledgePrompt(localDb, userCity);
        if (localPrompt) extraContext += '\n\n' + localPrompt;
      }
    } catch (err) {
      console.error('[olaLocalKnowledge] Failed to load, continuing without:', err);
    }

    // Profile completeness check for intent-triggered collection
    const profileAlreadyCompleted = !!studentCtx?.profileCompletedAt;
    const profileComplete = profileAlreadyCompleted || (studentCtx ? (studentCtx.profileCompleteness ?? 0) >= 50 : false);
    const lastUserMsg = messages.length > 0 ? messages[messages.length - 1] : null;

    // Detect "update my info" intent — re-enter collection mode even if profile is complete
    const userWantsProfileUpdate =
      lastUserMsg?.role === 'user'
      && hasUpdateProfileIntent(lastUserMsg.content);

    const triggerProfileCollection =
      !profileComplete
      && lastUserMsg?.role === 'user'
      && hasHighValueIntent(lastUserMsg.content)
      && messages.filter(m => m.role === 'user').length <= 3;

    if (studentCtx) {
      extraContext += '\n\n' + buildStudentContextPrompt(studentCtx);
    } else if (studentMatchProfile) {
      // Fallback to frontend-passed thin profile for anonymous users
      const parts: string[] = [];
      if (studentMatchProfile.languagePreference) parts.push(`语言偏好：${studentMatchProfile.languagePreference}`);
      if (studentMatchProfile.careerGoal) parts.push(`职业目标：${studentMatchProfile.careerGoal}`);
      if (studentMatchProfile.preferredCity?.length) parts.push(`偏好城市：${studentMatchProfile.preferredCity.join('、')}`);
      if (studentMatchProfile.budget) parts.push(`经费情况：${studentMatchProfile.budget}`);
      if (studentMatchProfile.personalityTags?.length) parts.push(`性格特点：${studentMatchProfile.personalityTags.join('、')}`);
      if (parts.length > 0) {
        extraContext += `\n\n## 已知用户画像\n${parts.join('\n')}`;
      } else {
        extraContext += `\n\n## 用户画像状态\n画像信息较少，请在对话中自然地引导用户补充背景信息。`;
      }
    }

    if (userWantsProfileUpdate) {
      extraContext += `\n\n## 🔄 用户请求更新画像
用户希望更新个人信息。请进入画像更新模式：
1. 确认用户想更新哪些信息（新论文？新经历？换方向？）
2. 收集更新内容后，输出更新后的完整画像 JSON 块
3. 更新完成后告知用户"已更新，后续推荐将基于最新信息"`;
    } else if (triggerProfileCollection) {
      extraContext += `\n\n## ⚠️ 画像不完整
用户发出了高价值意图（找导师/申请/匹配等），但尚未建立完整画像。
请先简要回应用户的问题，然后按照【意图识别与画像触发】规则，自然地提议收集用户背景信息。
这是本次对话的第一次触发，请执行画像收集引导。`;
    }

    // Fetch full professor data when professorId is provided
    let outreachProfessor: Professor | null = null;
    const activeProfId = professorId || professorContext?.professorId;

    if (activeProfId) {
      try {
        const prof = await getProfessor(activeProfId);
        if (prof) {
          outreachProfessor = prof;

          if (mode === 'write') {
            extraContext += `\n\n## 套磁目标教授（完整资料）
姓名：${prof.name}
大学：${prof.university}
院系：${prof.faculty || '未知'}
职称：${prof.positionTitle || '未知'}
研究方向：${prof.researchAreas.join('、')}
H指数：${prof.hIndex ?? '未知'}，论文数：${prof.paperCount ?? '未知'}，引用数：${prof.citationCount ?? '未知'}
招生状态：${prof.acceptingStudents === 'yes' ? '招生中' : prof.acceptingStudents === 'no' ? '暂不招生' : '未知'}
邮箱：${prof.email || '未知'}
大学主页：${prof.profileUrl || '无'}
Google Scholar：${prof.googleScholarUrl || '无'}
适合学生背景：${prof.suitableStudentBackgrounds.join('；') || '未知'}
潜在研究课题：${prof.potentialRpTopics.join('；') || '未知'}

请根据以上真实资料为用户生成个性化申请信。邮件中必须：
1. 引用该教授的具体研究方向（不要泛泛而谈）
2. 说明与学生研究兴趣的契合点
3. 提到该教授所在大学和院系
4. 语气专业但不过分拘谨`;
          } else {
            extraContext += `\n\n## 用户正在了解的教授
姓名：${prof.name}
大学：${prof.university}
研究方向：${prof.researchAreas.join('、')}
H指数：${prof.hIndex ?? '未知'}`;
          }

          // Fetch professor spotlight article for richer context
          try {
            const { createClient } = await import('@supabase/supabase-js');
            const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
            const { data: article } = await supabase
              .from('blog_posts')
              .select('content_zh')
              .eq('professor_id', activeProfId)
              .eq('category', 'professor_spotlight')
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle();

            if (article?.content_zh) {
              extraContext += `\n\n## 关于 ${prof.name} 的详细介绍文章（可作为回答参考）\n${article.content_zh}`;
            }
          } catch { /* no article available */ }
        }
      } catch (err) {
        console.error('[Prof Fetch]', err);
      }
    } else if (professorContext) {
      extraContext += `\n\n## 用户正在了解的教授\n${JSON.stringify(professorContext)}`;
    }

    // 2. RAG (parallel)
    let allCitations: ReturnType<typeof papersToCitations> = [];
    let academicSearchMeta: { sources: string[]; totalFound: number; queries: string[] } | null = null;

    if (mode === 'research' && messages.length > 0) {
      const lastMsg = messages[messages.length - 1].content;
      try {
        const [academicResult, knowledgeChunks, professors] = await Promise.all([
          searchAcademicSources(lastMsg, { limit: 15, yearFrom: new Date().getFullYear() - 4 }).catch(() => ({ papers: [], searchQueries: [], sources: [], totalFound: 0 })),
          searchKnowledgeBase(lastMsg, 8).catch(() => []),
          searchProfessorsByTags(lastMsg, 5).catch(() => []),
        ]);

        allCitations = papersToCitations(academicResult.papers);
        academicSearchMeta = {
          sources: academicResult.sources,
          totalFound: academicResult.totalFound,
          queries: academicResult.searchQueries,
        };

        const kbContext = assembleRAGContext({ knowledgeChunks, papers: [], professors });
        // Full abstracts for research mode — gives Claude enough context for deep analysis
        const paperContext = papersToRAGContext(academicResult.papers, { fullAbstract: true, maxPapers: 12 });

        if (kbContext || paperContext) {
          extraContext += '\n\n' + [paperContext, kbContext].filter(Boolean).join('\n\n');
        }
      } catch (ragErr) {
        console.error('[RAG]', ragErr);
      }
    } else if (mode !== 'research' && messages.length > 0) {
      const lastMsg = messages[messages.length - 1].content;
      const intent = detectIntent(lastMsg);
      try {
        if (intent === 'outreach') {
          const profName = extractProfessorName(lastMsg);
          const [profPapers, profProfiles, profTags] = await Promise.all([
            profName ? searchProfessorPapers(profName, 8).catch(() => []) : searchPaperAbstracts(lastMsg, 6).catch(() => []),
            searchProfessorProfiles(lastMsg, 3).catch(() => []),
            searchProfessorsByTags(lastMsg, 2).catch(() => []),
          ]);
          const ragContext = assembleRAGContext({ knowledgeChunks: [...profPapers, ...profProfiles], papers: [], professors: profTags });
          if (ragContext) extraContext += '\n\n' + ragContext;
        } else if (intent === 'matching') {
          const [profProfiles, papers, profTags] = await Promise.all([
            searchProfessorProfiles(lastMsg, 5).catch(() => []),
            searchPaperAbstracts(lastMsg, 4).catch(() => []),
            searchProfessorsByTags(lastMsg, 4).catch(() => []),
          ]);
          const ragContext = assembleRAGContext({ knowledgeChunks: [...profProfiles, ...papers], papers: [], professors: profTags });
          if (ragContext) extraContext += '\n\n' + ragContext;
        } else if (intent === 'academic') {
          // Academic intent in non-research modes: fire LIVE academic search too
          // This gives deep, paper-backed answers even in chat/companion mode
          const [academicResult, papers, profProfiles, profTags] = await Promise.all([
            searchAcademicSources(lastMsg, { limit: 10, yearFrom: new Date().getFullYear() - 3 }).catch(() => ({ papers: [], searchQueries: [], sources: [], totalFound: 0 })),
            searchPaperAbstracts(lastMsg, 6).catch(() => []),
            searchProfessorProfiles(lastMsg, 2).catch(() => []),
            searchProfessorsByTags(lastMsg, 3).catch(() => []),
          ]);

          // Store citations for cross-mode academic responses
          if (academicResult.papers.length > 0) {
            allCitations = papersToCitations(academicResult.papers);
            academicSearchMeta = {
              sources: academicResult.sources,
              totalFound: academicResult.totalFound,
              queries: academicResult.searchQueries,
            };
          }

          const ragContext = assembleRAGContext({ knowledgeChunks: [...papers, ...profProfiles], papers: [], professors: profTags });
          const paperContext = papersToRAGContext(academicResult.papers, { fullAbstract: true, maxPapers: 8 });

          if (ragContext || paperContext) {
            extraContext += '\n\n' + [paperContext, ragContext].filter(Boolean).join('\n\n');
          }

          // Add academic depth instruction for non-research modes with academic intent
          extraContext += `\n\n## 学术问题检测
用户的问题涉及学术/科研内容。即使当前不在"科研深潜"模式，也请：
1. 引用检索到的真实论文作为依据
2. 给出有深度的专业回答，而非泛泛而谈
3. 如果话题适合深入讨论，建议用户切换到"科研深潜"模式获得更完整的分析`;
        } else {
          const [knowledgeChunks, professors] = await Promise.all([
            searchKnowledgeBase(lastMsg, 4).catch(() => []),
            searchProfessorsByTags(lastMsg, 2).catch(() => []),
          ]);
          const ragContext = assembleRAGContext({ knowledgeChunks, papers: [], professors });
          if (ragContext) extraContext += '\n\n' + ragContext;
        }
      } catch {}
    }

    // CV / 简历 guidance: when user mentions CV, inject completeness context
    if (messages.length > 0) {
      const lastMsg = messages[messages.length - 1].content;
      const cvIntent = /cv|简历|resume|学术简历|academic cv|生成.*cv|补全.*cv|完善.*简历/i.test(lastMsg);
      if (cvIntent && studentCtx) {
        const cvSections: string[] = [];
        if (!studentCtx.displayName || !studentCtx.email) cvSections.push('个人信息（姓名/邮箱）');
        if (!studentCtx.education?.length) cvSections.push('教育背景');
        if (!studentCtx.hasResearchExperience && !studentCtx.researchDescription) cvSections.push('研究经历');
        if (!studentCtx.work?.length) cvSections.push('工作/实习经历');
        if (!studentCtx.hasPublications && !studentCtx.publicationDetails) cvSections.push('论文发表');
        if (!studentCtx.researchInterests?.length) cvSections.push('技能特长');

        if (cvSections.length > 0) {
          extraContext += `\n\n## CV 补全引导
用户提到了 CV/简历。检测到以下板块数据为空：${cvSections.join('、')}。
请主动引导用户补全这些信息。逐个板块引导，不要一次问太多。示例：
"我看到你的教育背景已经有了，但研究经历还没有。你有参与过什么研究项目吗？比如本科毕设、实验室实习、或者跟教授合作的课题？跟我说说，我帮你整理成CV格式。"
收集到信息后，用自然语言确认并告诉用户可以去"我的文档"页面生成完整 CV。`;
        }
      }
    }

    // For modes that need professor search, add tool instruction to system prompt
    if (mode === 'path' || mode === 'chat' || mode === 'write' || mode === 'rp' || mode === 'interview') {
      extraContext += `\n\n## 教授推荐规则
当你需要推荐教授时，必须调用 searchProfessors 工具从数据库检索真实教授数据。
绝不可以凭记忆编造教授信息。
调用工具后，用返回的真实数据向用户展示推荐。
使用工具返回的 matchScore 和 matchReasons 字段展示推荐理由，格式如下：

🎯 推荐 Prof. XXX（University）— 匹配度 XX%
推荐理由：
• 理由1
• 理由2
• 理由3

同时在回复末尾输出 professorMatches JSON 块，professorId 必须使用工具返回的真实 id。`;
    }

    // Stage tracking instruction (funnel tracking)
    extraContext += `\n\n## 对话阶段标记
在每条回复的最末尾，附加 <stage>N</stage> 标记当前对话阶段（1-8），不要向用户展示此标记。
1=greeting 2=needs_discovery 3=professor_matching 4=letter_generation
5=document_review 6=interview_prep 7=application_tracking 8=offer_celebration
根据对话内容判断当前处于哪个阶段，每条回复都必须附加。`;

    // Inject university deadline context if user has target universities
    if (studentCtx?.targetUniversities) {
      const deadlineCtx = await getDeadlineContext(studentCtx.targetUniversities);
      if (deadlineCtx) extraContext += deadlineCtx;
    }

    // Suggestion chips directive
    extraContext += `\n\n## 快捷回复建议
如果合适，在回复末尾（stage 标记之前）用 <suggestions>建议1|建议2|建议3</suggestions> 提供 2-3 个快捷回复选项。
用户不可见此标记。根据对话阶段选择合适的建议，例如：
- 初始阶段：找导师 | 了解申请流程 | 查看奖学金
- 匹配后：写套磁信 | 换个教授 | 了解这所大学
- 套磁后：审文书 | 模拟面试 | 再写一封
- 通用：转人工咨询
不要每条都加，只在自然合适时添加。`;

    // Build system prompt — use Ola persona as base, append mode-specific + extras
    const systemPrompt = getOlaPersonaPrompt() + '\n\n---\n\n' + buildSystemPrompt(mode, extraContext);

    // 3. Call Claude — with tool use for professor search
    const useTools = mode === 'path' || mode === 'chat' || mode === 'write' || mode === 'rp' || mode === 'interview';

    const apiMessages: Anthropic.MessageParam[] = messages.map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));

    const llmStartTime = Date.now();
    let rawReply = '';
    let toolSearchedProfessors: Professor[] = [];
    let toolPapersMap: Record<string, ToolPaper[]> = {};

    // Determine max tokens: research mode and academic-intent get more room for deep answers
    const maxTokens = (mode === 'research' || currentIntent === 'academic') ? 4000 : 2000;

    if (useTools) {
      // Tool use loop: Claude may call searchProfessors, we execute and feed back
      let currentMessages: Anthropic.MessageParam[] = [...apiMessages];
      let iterations = 0;
      const MAX_ITERATIONS = 3;

      while (iterations < MAX_ITERATIONS) {
        iterations++;

        const response = await client.messages.create({
          model: 'claude-sonnet-4-6',
          max_tokens: maxTokens,
          system: [{ type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } }],
          tools: [PROFESSOR_SEARCH_TOOL],
          messages: currentMessages,
        });

        // Check if Claude wants to use a tool
        const toolUseBlock = response.content.find(b => b.type === 'tool_use');
        const textBlock = response.content.find(b => b.type === 'text');

        if (toolUseBlock && toolUseBlock.type === 'tool_use' && toolUseBlock.name === 'searchProfessors') {
          const toolInput = toolUseBlock.input as { researchArea: string; university?: string; universityGroup?: string; scholarshipRequired?: boolean; limit?: number };

          // Check match usage for logged-in users
          if (trackingUserId) {
            try {
              const { createClient } = await import('@supabase/supabase-js');
              const matchDb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
              const { checkUsage: checkMatchUsage } = await import('../../../lib/services/usageTracker');
              const matchUsage = await checkMatchUsage(matchDb, trackingUserId, 'match');
              if (!matchUsage.allowed) {
                return Response.json({
                  reply: `今日教授匹配次数已用完（${matchUsage.used}/${matchUsage.limit}），升级订阅可获得更多匹配次数`,
                  matchedProfessors: [],
                }, { status: 200 });
              }
            } catch (err) {
              console.error('[AI Chat] match usage check failed:', err);
            }
          }

          let toolResult: string;
          try {
            // Extract userId from request headers/auth if available
            const userId = body.userId as string | undefined;

            let searchResults = await searchProfessorsForAI({
              researchArea: toolInput.researchArea,
              university: toolInput.university,
              universityGroup: toolInput.universityGroup,
              scholarshipRequired: toolInput.scholarshipRequired,
              limit: toolInput.limit,
              studentProfile: studentMatchProfile,
              studentContext: studentCtx,
              userId,
            });

            if (searchResults.length === 0) {
              const autoResult = await findOrCreateProfessor(toolInput.researchArea, toolInput.university);
              if (autoResult.professors.length > 0) {
                searchResults = autoResult.professors.map(p => ({ professor: p, score: 50, reasons: [] }));
              }
            }

            toolSearchedProfessors = searchResults.map(r => ({ ...r.professor, _matchScore: r.score, _matchReasons: r.reasons }));

            // Record 'searched' interactions (fire-and-forget for match counter)
            if (searchResults.length > 0) {
              const interactionUserId = userId || (studentCtx as { userId?: string } | null)?.userId || null;
              const profIds = searchResults.map(r => r.professor.id);
              recordProfessorInteractions(interactionUserId, profIds, 'searched').catch(() => {});

              recordEvent(sessionId, 'professor_match', {
                count: searchResults.length,
                query: toolInput.researchArea,
                university: toolInput.university ?? null,
              }, trackingUserId).catch(() => {});

              // Increment match usage
              if (trackingUserId) {
                import('@supabase/supabase-js').then(({ createClient }) => {
                  const matchDb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
                  return import('../../../lib/services/usageTracker').then(({ incrementUsage }) =>
                    incrementUsage(matchDb, trackingUserId!, 'match')
                  );
                }).catch(err => console.error('[AI Chat] match increment failed:', err));
              }
            }

            if (searchResults.length === 0) {
              toolResult = JSON.stringify({ professors: [], message: '未找到匹配的教授。数据库中可能没有该研究方向的教授数据。' });
            } else {
              // Check for auto-imported professors that need verification warnings
              const hasAutoImported = searchResults.some(r =>
                r.professor.dataSources?.includes('manual') && !r.professor.email
              );
              const hasDuplicateNames = new Set(searchResults.map(r => r.professor.name)).size < searchResults.length;

              let warning = '';
              if (hasAutoImported) {
                warning = '\n\n⚠️ 注意：以下部分教授信息来自学术数据库自动匹配，建议你在学校官网确认后再发送套磁信。';
              }
              if (hasDuplicateNames) {
                warning += '\n⚠️ 搜索结果中存在同名教授，请特别注意核实是否为你想联系的那位教授。';
              }

              const profIds2 = searchResults.map(r => r.professor.id);
              const papersMap = await fetchLatestPapersForProfessors(profIds2);
              toolPapersMap = papersMap;

              toolResult = JSON.stringify({
                professors: searchResults.map(r => professorToToolResult(r.professor, r.score, r.reasons, papersMap[r.professor.id])),
                total: searchResults.length,
                warning: warning || undefined,
              });
            }
          } catch (err) {
            toolResult = JSON.stringify({ error: '数据库查询失败', message: String(err) });
          }

          // Append assistant message with tool use + tool result
          currentMessages = [
            ...currentMessages,
            { role: 'assistant' as const, content: response.content },
            {
              role: 'user' as const,
              content: [{ type: 'tool_result' as const, tool_use_id: toolUseBlock.id, content: toolResult }],
            },
          ];

          // If there was also text alongside tool_use, capture partial text
          if (textBlock && textBlock.type === 'text') {
            rawReply = textBlock.text;
          }

          // Continue loop — Claude will process tool results
          if (response.stop_reason === 'end_turn') break;
          continue;
        }

        // No tool use — final text response
        if (textBlock && textBlock.type === 'text') {
          rawReply = (rawReply ? rawReply + '\n\n' : '') + textBlock.text;
        }
        break;
      }
    } else {
      // Non-tool path (research mode) — uses higher maxTokens for deep academic answers
      const response = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: maxTokens,
        system: [{ type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } }],
        messages: apiMessages,
      });

      const textBlock = response.content.find(b => b.type === 'text');
      rawReply = textBlock?.type === 'text' ? textBlock.text : '抱歉，我没能生成回复，请再试一次。';
    }

    if (!rawReply) {
      rawReply = '抱歉，我没能生成回复，请再试一次。';
    }

    // 4. Filter + extract
    const { filtered } = filterSensitiveContent(rawReply);
    const blocks = extractAllBlocks(filtered);
    let cleanedReply = cleanReply(filtered);

    // Extract and strip stage tag for funnel tracking
    const stageMatch = cleanedReply.match(/<stage>(\d)<\/stage>/);
    if (stageMatch) {
      const stage = parseInt(stageMatch[1], 10);
      cleanedReply = cleanedReply.replace(/<stage>\d<\/stage>/g, '').trim();

      // Update session conversation_stage (fire-and-forget)
      import('../../../lib/supabase/server').then(({ supabaseAdmin }) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabaseAdmin as any)
          .from('ola_sessions')
          .update({ metadata: { conversation_stage: stage } })
          .eq('session_id', sessionId)
          .then(() => {})
          .catch((err: unknown) => console.error('[stage update]', err));
      }).catch(() => {});
    }

    // Extract and strip suggestions tag
    let suggestions: string[] | undefined;
    const suggestionsMatch = cleanedReply.match(/<suggestions>(.*?)<\/suggestions>/);
    if (suggestionsMatch) {
      suggestions = suggestionsMatch[1].split('|').map(s => s.trim()).filter(Boolean);
      cleanedReply = cleanedReply.replace(/<suggestions>.*?<\/suggestions>/g, '').trim();
    }

    // Extract and strip ola_action tag (matchmaker card triggers)
    let olaAction: { type: string; userId?: string } | undefined;
    const olaActionMatch = cleanedReply.match(/<!--\s*ola_action\s*:\s*(\{[^}]*\})\s*-->/);
    if (olaActionMatch) {
      try {
        olaAction = JSON.parse(olaActionMatch[1]) as { type: string; userId?: string };
      } catch { /* ignore parse errors */ }
      cleanedReply = cleanedReply.replace(/<!--\s*ola_action\s*:\s*\{[^}]*\}\s*-->/g, '').trim();
    }

    // 5. Build response
    const result: Record<string, unknown> = { reply: cleanedReply };

    if (olaAction) {
      result.olaAction = olaAction;
    }

    if (suggestions && suggestions.length > 0) {
      result.suggestions = suggestions;
    }

    if (blocks.scoreCard) {
      result.scoreCard = { totalScore: blocks.scoreCard.totalScore, dimensions: blocks.scoreCard.dimensions };
    }

    // Return citations for research mode AND any mode with academic intent
    if (allCitations.length > 0) {
      result.citations = allCitations;
      result.academicSearch = academicSearchMeta;
    }

    // Professor matches: prefer tool-searched real data over AI-generated JSON blocks
    if (toolSearchedProfessors.length > 0) {
      const aiMatches = blocks.professors
        ? (blocks.professors as { professors: Array<{ professorId?: string; name?: string; matchScore?: number; reason?: string; researchTags?: string[] }> }).professors
        : [];

      result.matchedProfessors = toolSearchedProfessors.map(p => {
        const aiMatch = aiMatches.find(a => a.professorId === p.id || a.name === p.name);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const pAny = p as any;
        const matchScore = pAny._matchScore ?? aiMatch?.matchScore ?? (p.opportunityScore ?? 50);
        const matchReasons: string[] = pAny._matchReasons ?? [];
        return {
          professorId: p.id,
          name: p.name,
          institution: p.university,
          positionTitle: p.positionTitle || undefined,
          matchScore,
          reason: matchReasons.length > 0
            ? matchReasons.join('；')
            : (aiMatch?.reason ?? `研究方向：${p.researchAreas.slice(0, 3).join('、')}`),
          researchTags: p.researchAreas.slice(0, 5),
          opportunityLabel: p.acceptingStudents === 'yes' ? '招生中' : p.grantStatus === 'Active' ? '有活跃经费' : undefined,
          hIndex: p.hIndex,
          paperCount: p.paperCount,
          citationCount: p.citationCount,
          acceptingStudents: p.acceptingStudents ?? 'unknown',
          opportunityScore: p.opportunityScore ?? undefined,
          latestPapers: (toolPapersMap[p.id] ?? []).slice(0, 2),
        };
      });
    } else if (blocks.professors) {
      result.matchedProfessors = (blocks.professors as { professors: unknown[] }).professors;
    }

    if (blocks.email) {
      result.emailPackage = {
        ...blocks.email,
        professorEmail: outreachProfessor?.email || null,
        professorGoogleScholar: outreachProfessor?.googleScholarUrl || null,
        professorProfileUrl: outreachProfessor?.profileUrl || null,
        professorUniversity: outreachProfessor?.university || null,
      };
    }

    if (blocks.quickReplies) {
      result.quickReplies = blocks.quickReplies.replies;
    }

    result.suggestConsultation = shouldSuggestConsultation(messages, mode);

    if (triggerProfileCollection) {
      result.profileCollectionSuggested = true;
    }

    // 6. Record 'matched' interactions when AI recommends professors
    //    and 'email_generated' when writing mode produces an email
    {
      const interactionUserId = (body.userId as string | undefined) || null;
      if (toolSearchedProfessors.length > 0 && result.matchedProfessors) {
        const matchedIds = toolSearchedProfessors.map(p => p.id);
        recordProfessorInteractions(interactionUserId, matchedIds, 'matched').catch(() => {});
      }
      if (mode === 'write' && blocks.email && activeProfId) {
        recordProfessorInteractions(interactionUserId, [activeProfId], 'email_generated').catch(() => {});
      }
    }

    // 7. Save async + extract user profile
    try {
      const { getServerUser: getUser } = await import('../../../lib/auth');
      const u = await getUser();
      saveConversationAsync(sessionId, mode, messages, cleanedReply, u?.id).catch(() => {});
    } catch {
      saveConversationAsync(sessionId, mode, messages, cleanedReply).catch(() => {});
    }

    const userId = body.userId as string | undefined;
    if (userId && messages.length > 0) {
      const lastUserMsg = messages[messages.length - 1];
      if (lastUserMsg.role === 'user') {
        extractAndUpdateProfile(userId, lastUserMsg.content).catch(err =>
          console.error('[profile extraction] Failed:', err)
        );
      }
    }

    // Async memory extraction — every 5 user messages or on first message
    const userMsgCount = messages.filter(m => m.role === 'user').length;
    const resolvedUserId = userId || trackingUserId;
    if (resolvedUserId && userMsgCount > 0 && (userMsgCount === 1 || userMsgCount % 5 === 0)) {
      extractAndSaveMemories(resolvedUserId, messages, sessionId).catch(err =>
        console.error('[memory extraction] Failed:', err)
      );
    }

    // Log to ola_conversation_logs (fire-and-forget, authenticated users only)
    {
      const logUserId = userId || trackingUserId;
      if (logUserId && messages.length > 0) {
        const lastUserMsg = messages[messages.length - 1];
        if (lastUserMsg.role === 'user') {
          const olaTag = parseOlaStateTag(rawReply);
          const prevMsg = messages.length >= 3 ? messages[messages.length - 3] : undefined;
          const reaction = detectUserReaction(lastUserMsg.content, prevMsg?.role === 'assistant' ? mode : undefined);
          logConversation({
            userId: logUserId,
            sessionId,
            userMessage: lastUserMsg.content,
            olaResponse: cleanedReply,
            olaMode: mode,
            emotionTag: olaTag.emotionTag,
            imageUsed: olaTag.imageUsed,
            userReaction: reaction,
            responseTimeMs: Date.now() - llmStartTime,
            triggeredBy: 'chat',
          }).catch(err => console.error('[olaConversationLogger]', err));
        }
      }
    }

    // Ola memory updates: intimacy + extract personal info (fire-and-forget)
    {
      const memUserId = userId || trackingUserId;
      if (memUserId && messages.length > 0) {
        const lastUserMsg = messages[messages.length - 1];
        if (lastUserMsg.role === 'user') {
          const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
          const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
          if (url && key) {
            import('@supabase/supabase-js').then(({ createClient }) => {
              const db = createClient(url, key);
              updateIntimacy(db, memUserId).catch(err =>
                console.error('[olaMemory] intimacy update failed:', err));
              updateMemoryFromConversation(db, memUserId, lastUserMsg.content, cleanedReply).catch(err =>
                console.error('[olaMemory] memory extraction failed:', err));
            }).catch(() => {});
          }
        }
      }
    }

    // Increment daily chat usage for logged-in users (fire-and-forget)
    const chatUserId = userId || trackingUserId;
    if (chatUserId) {
      import('@supabase/supabase-js').then(({ createClient }) => {
        const usageDb = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!,
        );
        return import('../../../lib/services/usageTracker').then(({ incrementUsage }) =>
          incrementUsage(usageDb, chatUserId, 'chat')
        );
      }).catch(err => console.error('[AI Chat] usage increment failed:', err));
    }

    return Response.json(result);
  } catch (e: unknown) {
    console.error('[AI Chat]', e);
    const errMsg = e instanceof Error ? e.message : String(e);
    const isAuthError = errMsg.includes('API key') || errMsg.includes('authentication') || errMsg.includes('401');
    const isRateLimit = errMsg.includes('429') || errMsg.includes('rate');
    const reply = isAuthError
      ? '抱歉，AI 服务配置异常，请联系管理员。'
      : isRateLimit
        ? '请求过于频繁，请稍后再试。'
        : '抱歉，AI 服务暂时不可用，请稍后再试。';
    return Response.json(
      { error: 'AI service error', reply },
      { status: isRateLimit ? 429 : 500 }
    );
  }
}

async function saveConversationAsync(sessionId: string, mode: AIMode, messages: ChatMessage[], reply: string, userId?: string) {
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return;
    const supabase = createClient(url, key);
    const allMessages = [...messages, { role: 'assistant', content: reply }];

    const { data: existing } = await supabase
      .from('ai_conversations')
      .select('id')
      .eq('session_id', sessionId)
      .limit(1)
      .maybeSingle();

    if (existing) {
      await supabase
        .from('ai_conversations')
        .update({ messages: allMessages, updated_at: new Date().toISOString() })
        .eq('id', existing.id);
    } else {
      await supabase.from('ai_conversations').insert({
        session_id: sessionId,
        mode,
        user_id: userId ?? null,
        messages: allMessages,
      });
    }
  } catch {}
}

async function saveFAQConversationAsync(sessionId: string, mode: AIMode, messages: ChatMessage[], faqReply: string, userId?: string | null) {
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return;
    const supabase = createClient(url, key);
    const allMessages = [...messages, { role: 'assistant', content: faqReply }];

    const { data: existing } = await supabase
      .from('ai_conversations')
      .select('id')
      .eq('session_id', sessionId)
      .limit(1)
      .maybeSingle();

    if (existing) {
      await supabase
        .from('ai_conversations')
        .update({ messages: allMessages, updated_at: new Date().toISOString() })
        .eq('id', existing.id);
    } else {
      await supabase.from('ai_conversations').insert({
        session_id: sessionId,
        mode,
        user_id: userId ?? null,
        messages: allMessages,
      });
    }
  } catch {}
}

async function extractAndUpdateProfile(userId: string, message: string) {
  const hasProfileInfo = /(?:我是|我在|我的|本科|硕士|PhD|GPA|雅思|IELTS|TOEFL|专业|学校|毕业|研究|工作|实习)/i.test(message)
    || /(?:unsw|usyd|unimelb|anu|uq|monash|uwa|adelaide|qut|uts|rmit|macquarie)/i.test(message);

  if (!hasProfileInfo) return;

  const extraction = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 300,
    system: '你是一个信息提取助手。从用户消息中提取个人学术信息，返回纯 JSON。只包含能确认的字段，不确定的不要猜。如果没有有用信息返回 {}。',
    messages: [{
      role: 'user',
      content: `提取以下消息中的个人信息：\n"${message}"\n\n可能的字段（全部可选）：\n{"university":"学校名","major":"专业","degree_level":"本科/硕士/博士","gpa":"GPA数值","gpa_scale":"满分","target_field":"目标研究方向","english_level":"英语水平如雅思7.0","has_research_experience":true/false,"research_description":"科研描述","career_goal":"职业目标"}\n\n返回纯 JSON，不要 markdown。`,
    }],
  });

  try {
    const text = (extraction.content[0] as { type: 'text'; text: string }).text.trim();
    const info = JSON.parse(text.replace(/```json|```/g, ''));

    if (Object.keys(info).length === 0) return;

    const updates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(info)) {
      if (value !== null && value !== undefined && value !== '') {
        updates[key] = value;
      }
    }

    if (Object.keys(updates).length > 0) {
      const { createClient } = await import('@supabase/supabase-js');
      const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
      await supabaseAdmin.from('user_profiles')
        .update(updates)
        .eq('id', userId);
      console.log(`[profile extraction] Updated for ${userId}:`, Object.keys(updates));
    }
  } catch {
    // Parse failure — silently ignore
  }
}

async function extractAndSaveMemories(
  userId: string,
  messages: Array<{ role: string; content: string }>,
  conversationId?: string,
) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return;

    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(url, key);

    let extracted: Awaited<ReturnType<typeof extractMemories>> = [];
    try {
      extracted = await extractMemories(messages, userId, conversationId);
    } catch (err) {
      console.error('[memoryService] Failed to extract memories, skipping:', err);
      return;
    }
    if (extracted.length === 0) return;

    try {
      await saveMemories(supabase, userId, extracted, conversationId);
      console.log(`[memory extraction] Saved ${extracted.length} memories for ${userId}`);
    } catch (err) {
      console.error('[memoryService] Failed to save memories, skipping sync:', err);
      return;
    }

    try {
      await syncToProfile(supabase, userId);
    } catch (err) {
      console.error('[memoryService] Failed to sync profile, non-critical:', err);
    }
  } catch (err) {
    console.error('[memoryService] Unexpected error in extractAndSaveMemories:', err);
  }
}
