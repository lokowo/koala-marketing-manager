import type { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import type { AIMode } from '../../../lib/constants';
import type { ChatMessage, UserStyleProfile, ProfessorContext } from '../../../lib/types';
import { buildSystemPrompt, describeUserStyle } from '../../../lib/prompts/index';
import { searchAcademicSources, papersToRAGContext, type AcademicPaper } from '../../../lib/server/academic-search';
import { searchKnowledgeBase, searchPaperAbstracts, searchProfessorProfiles, searchProfessorPapers, searchProfessorsByTags, assembleRAGContext } from '../../../lib/server/rag-engine';
import { filterSensitiveContent } from '../../../lib/server/sensitive-filter';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

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

// Detect user intent to route to the right search strategy
function detectIntent(message: string): 'outreach' | 'matching' | 'academic' | 'general' {
  const m = message.toLowerCase();
  if (/套磁|cold email|outreach|联系导师|给.*写.*信|写邮件/.test(m)) return 'outreach';
  if (/找导师|推荐导师|哪个导师|导师匹配|谁在做|what professor|supervisor/.test(m)) return 'matching';
  if (/实验|论文|研究|方法|材料|数据|合成|分析|algorithm|electrode|catalyst|protein|gene|model|dataset/.test(m)) return 'academic';
  return 'general';
}

// Extract professor name from outreach query
function extractProfessorName(message: string): string | null {
  const m = message.match(/(?:给|写给|联系|套磁|email to|write to|contact)\s+(?:Prof\.?\s+|Professor\s+|Dr\.?\s+)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})/);
  if (m) return m[1];
  // Try Chinese pattern: "XX教授"
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      mode,
      messages,
      professorContext,
      userStyleProfile,
      professorId,
    }: {
      mode: AIMode;
      messages: ChatMessage[];
      professorContext?: ProfessorContext;
      userStyleProfile?: UserStyleProfile;
      professorId?: string;
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

    // Fetch full professor data from DB when ID is provided (write mode outreach)
    if (professorId && mode === 'write') {
      try {
        const { getProfessor } = await import('../../../lib/services/professorService');
        const prof = await getProfessor(professorId);
        if (prof) {
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

请根据以上真实资料为用户生成个性化套磁信。邮件中必须：
1. 引用该教授的具体研究方向（不要泛泛而谈）
2. 说明与学生研究兴趣的契合点
3. 提到该教授所在大学和院系
4. 语气专业但不过分拘谨`;
        }
      } catch (err) {
        console.error('[Prof Fetch]', err);
      }
    } else if (professorContext) {
      extraContext += `\n\n## 用户正在了解的教授\n${JSON.stringify(professorContext)}`;
    }

    // 2. RAG (parallel) — enhanced for research mode
    let allCitations: ReturnType<typeof papersToCitations> = [];
    let academicSearchMeta: { sources: string[]; totalFound: number; queries: string[] } | null = null;

    if (mode === 'research' && messages.length > 0) {
      const lastMsg = messages[messages.length - 1].content;
      try {
        // Three parallel fetches: academic APIs + knowledge base + professors
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

        // Build RAG context from knowledge base + professors
        const kbContext = assembleRAGContext({ knowledgeChunks, papers: [], professors });
        // Build paper context from live API results
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
          // Outreach: deep search target professor's papers + their profile
          const profName = extractProfessorName(lastMsg);
          const [profPapers, profProfiles, profTags] = await Promise.all([
            profName ? searchProfessorPapers(profName, 8).catch(() => []) : searchPaperAbstracts(lastMsg, 6).catch(() => []),
            searchProfessorProfiles(lastMsg, 3).catch(() => []),
            searchProfessorsByTags(lastMsg, 2).catch(() => []),
          ]);
          const ragContext = assembleRAGContext({ knowledgeChunks: [...profPapers, ...profProfiles], papers: [], professors: profTags });
          if (ragContext) extraContext += '\n\n' + ragContext;
        } else if (intent === 'matching') {
          // Matching: professor profiles first, then papers for context
          const [profProfiles, papers, profTags] = await Promise.all([
            searchProfessorProfiles(lastMsg, 5).catch(() => []),
            searchPaperAbstracts(lastMsg, 4).catch(() => []),
            searchProfessorsByTags(lastMsg, 4).catch(() => []),
          ]);
          const ragContext = assembleRAGContext({ knowledgeChunks: [...profProfiles, ...papers], papers: [], professors: profTags });
          if (ragContext) extraContext += '\n\n' + ragContext;
        } else if (intent === 'academic') {
          // Academic question: paper abstracts first, then professor profiles for context
          const [papers, profProfiles, profTags] = await Promise.all([
            searchPaperAbstracts(lastMsg, 8).catch(() => []),
            searchProfessorProfiles(lastMsg, 2).catch(() => []),
            searchProfessorsByTags(lastMsg, 2).catch(() => []),
          ]);
          const ragContext = assembleRAGContext({ knowledgeChunks: [...papers, ...profProfiles], papers: [], professors: profTags });
          if (ragContext) extraContext += '\n\n' + ragContext;
        } else {
          // General: balanced search
          const [knowledgeChunks, professors] = await Promise.all([
            searchKnowledgeBase(lastMsg, 4).catch(() => []),
            searchProfessorsByTags(lastMsg, 2).catch(() => []),
          ]);
          const ragContext = assembleRAGContext({ knowledgeChunks, papers: [], professors });
          if (ragContext) extraContext += '\n\n' + ragContext;
        }
      } catch {}
    }

    const systemPrompt = buildSystemPrompt(mode, extraContext);

    // 3. Call Claude with prompt caching
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      system: [
        {
          type: 'text',
          text: systemPrompt,
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: messages.map(m => ({ role: m.role, content: m.content })),
    });

    const textBlock = response.content.find(b => b.type === 'text');
    const rawReply = textBlock?.type === 'text' ? textBlock.text : '抱歉，我没能生成回复，请再试一次。';

    // 4. Filter + extract
    const { filtered } = filterSensitiveContent(rawReply);
    const blocks = extractAllBlocks(filtered);
    const cleanedReply = cleanReply(filtered);

    // 5. Build response
    const result: Record<string, unknown> = { reply: cleanedReply };

    if (blocks.scoreCard) {
      result.scoreCard = { totalScore: blocks.scoreCard.totalScore, dimensions: blocks.scoreCard.dimensions };
    }

    // For research mode: prefer live API papers; fallback to any cited in blocks
    if (mode === 'research' && allCitations.length > 0) {
      result.citations = allCitations;
      result.academicSearch = academicSearchMeta;
    }

    if (blocks.professors) {
      result.matchedProfessors = (blocks.professors as { professors: unknown[] }).professors;
    }

    if (blocks.email) {
      result.emailPackage = blocks.email;
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
