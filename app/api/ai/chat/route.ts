import type { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import type { AIMode } from '../../../lib/constants';
import type { ChatMessage, UserStyleProfile, ProfessorContext } from '../../../lib/types';
import { buildSystemPrompt, describeUserStyle } from '../../../lib/prompts/index';
import { searchAcademicSources, papersToRAGContext, type AcademicPaper } from '../../../lib/server/academic-search';
import { searchKnowledgeBase, searchPaperAbstracts, searchProfessorProfiles, searchProfessorPapers, searchProfessorsByTags, assembleRAGContext } from '../../../lib/server/rag-engine';
import { filterSensitiveContent } from '../../../lib/server/sensitive-filter';
import { searchProfessorsForAI, getProfessor } from '../../../lib/services/professorService';
import type { Professor } from '../../../lib/types';

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
      limit: {
        type: 'number',
        description: '返回数量，默认 8，最多 15',
      },
    },
    required: ['researchArea'],
  },
};

function professorToToolResult(p: Professor) {
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
    suitableStudentBackgrounds: p.suitableStudentBackgrounds,
    potentialRpTopics: p.potentialRpTopics,
    detailUrl: `/koala/professors/${p.id}`,
  };
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
  if (/实验|论文|研究|方法|材料|数据|合成|分析|algorithm|electrode|catalyst|protein|gene|model|dataset/.test(m)) return 'academic';
  return 'general';
}

function extractProfessorName(message: string): string | null {
  const m = message.match(/(?:给|写给|联系|套磁|email to|write to|contact)\s+(?:Prof\.?\s+|Professor\s+|Dr\.?\s+)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})/);
  if (m) return m[1];
  const m2 = message.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z.]+){1,3})\s*教授/);
  if (m2) return m2[1];
  return null;
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

    // 1. Build base system prompt
    let extraContext = '';

    if (userStyleProfile) {
      const styleDesc = describeUserStyle(userStyleProfile);
      if (styleDesc) extraContext += `\n\n## 用户说话风格\n${styleDesc}。请匹配用户风格回复。`;
    }

    if (studentMatchProfile) {
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
          searchAcademicSources(lastMsg, { limit: 12, yearFrom: new Date().getFullYear() - 4 }).catch(() => ({ papers: [], searchQueries: [], sources: [], totalFound: 0 })),
          searchKnowledgeBase(lastMsg, 6).catch(() => []),
          searchProfessorsByTags(lastMsg, 3).catch(() => []),
        ]);

        allCitations = papersToCitations(academicResult.papers);
        academicSearchMeta = {
          sources: academicResult.sources,
          totalFound: academicResult.totalFound,
          queries: academicResult.searchQueries,
        };

        const kbContext = assembleRAGContext({ knowledgeChunks, papers: [], professors });
        const paperContext = papersToRAGContext(academicResult.papers);

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
          const [papers, profProfiles, profTags] = await Promise.all([
            searchPaperAbstracts(lastMsg, 8).catch(() => []),
            searchProfessorProfiles(lastMsg, 2).catch(() => []),
            searchProfessorsByTags(lastMsg, 2).catch(() => []),
          ]);
          const ragContext = assembleRAGContext({ knowledgeChunks: [...papers, ...profProfiles], papers: [], professors: profTags });
          if (ragContext) extraContext += '\n\n' + ragContext;
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

    // For path/chat/write modes, add tool instruction to system prompt
    if (mode === 'path' || mode === 'chat' || mode === 'write') {
      extraContext += `\n\n## 教授推荐规则
当你需要推荐教授时，必须调用 searchProfessors 工具从数据库检索真实教授数据。
绝不可以凭记忆编造教授信息。
调用工具后，用返回的真实数据向用户展示推荐。
每位教授的推荐需包含：姓名、学校、职位、H指数、研究方向匹配原因。
同时在回复末尾输出 professorMatches JSON 块，professorId 必须使用工具返回的真实 id。`;
    }

    const systemPrompt = buildSystemPrompt(mode, extraContext);

    // 3. Call Claude — with tool use for professor search
    const useTools = mode === 'path' || mode === 'chat' || mode === 'write';

    const apiMessages: Anthropic.MessageParam[] = messages.map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));

    let rawReply = '';
    let toolSearchedProfessors: Professor[] = [];

    if (useTools) {
      // Tool use loop: Claude may call searchProfessors, we execute and feed back
      let currentMessages: Anthropic.MessageParam[] = [...apiMessages];
      let iterations = 0;
      const MAX_ITERATIONS = 3;

      while (iterations < MAX_ITERATIONS) {
        iterations++;

        const response = await client.messages.create({
          model: 'claude-sonnet-4-6',
          max_tokens: 2000,
          system: [{ type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } }],
          tools: [PROFESSOR_SEARCH_TOOL],
          messages: currentMessages,
        });

        // Check if Claude wants to use a tool
        const toolUseBlock = response.content.find(b => b.type === 'tool_use');
        const textBlock = response.content.find(b => b.type === 'text');

        if (toolUseBlock && toolUseBlock.type === 'tool_use' && toolUseBlock.name === 'searchProfessors') {
          const toolInput = toolUseBlock.input as { researchArea: string; university?: string; limit?: number };

          let toolResult: string;
          try {
            const professors = await searchProfessorsForAI({
              researchArea: toolInput.researchArea,
              university: toolInput.university,
              limit: toolInput.limit,
              studentProfile: studentMatchProfile,
            });
            toolSearchedProfessors = professors;

            if (professors.length === 0) {
              toolResult = JSON.stringify({ professors: [], message: '未找到匹配的教授。数据库中可能没有该研究方向的教授数据。' });
            } else {
              toolResult = JSON.stringify({
                professors: professors.map(professorToToolResult),
                total: professors.length,
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
      // Non-tool path (research mode)
      const response = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 2000,
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
    const cleanedReply = cleanReply(filtered);

    // 5. Build response
    const result: Record<string, unknown> = { reply: cleanedReply };

    if (blocks.scoreCard) {
      result.scoreCard = { totalScore: blocks.scoreCard.totalScore, dimensions: blocks.scoreCard.dimensions };
    }

    if (mode === 'research' && allCitations.length > 0) {
      result.citations = allCitations;
      result.academicSearch = academicSearchMeta;
    }

    // Professor matches: prefer tool-searched real data over AI-generated JSON blocks
    if (toolSearchedProfessors.length > 0) {
      // Build matchedProfessors from real DB data, enrich with AI-generated match reasons
      const aiMatches = blocks.professors
        ? (blocks.professors as { professors: Array<{ professorId?: string; name?: string; matchScore?: number; reason?: string; researchTags?: string[] }> }).professors
        : [];

      result.matchedProfessors = toolSearchedProfessors.map(p => {
        const aiMatch = aiMatches.find(a => a.professorId === p.id || a.name === p.name);
        return {
          professorId: p.id,
          name: p.name,
          institution: p.university,
          positionTitle: p.positionTitle || undefined,
          matchScore: aiMatch?.matchScore ?? (p.opportunityScore ?? 50),
          reason: aiMatch?.reason ?? `研究方向：${p.researchAreas.slice(0, 3).join('、')}`,
          researchTags: p.researchAreas.slice(0, 5),
          opportunityLabel: p.acceptingStudents === 'yes' ? '招生中' : undefined,
          hIndex: p.hIndex,
          paperCount: p.paperCount,
          citationCount: p.citationCount,
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

    // 6. Save async
    saveConversationAsync(mode, messages, cleanedReply).catch(() => {});

    return Response.json(result);
  } catch (e) {
    console.error('[AI Chat]', e);
    return Response.json(
      { error: 'AI service error', reply: '抱歉，AI 服务暂时不可用，请稍后再试。' },
      { status: 500 }
    );
  }
}

async function saveConversationAsync(mode: AIMode, messages: ChatMessage[], reply: string) {
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return;
    const supabase = createClient(url, key);
    await supabase.from('ai_conversations').insert({
      session_id: `session_${Date.now()}`,
      mode,
      messages: [...messages, { role: 'assistant', content: reply }],
    });
  } catch {}
}
