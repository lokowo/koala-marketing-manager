import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

function getNewsQueries(todayStr: string) {
  return [
    `Australia PhD funding news ${todayStr}`,
    `Australian university policy news today`,
    `international student Australia ${todayStr}`,
    `OpenAI DeepMind AI research news today`,
    `Australia cost of living students news today`,
    `tech industry hiring PhD Australia news today`,
  ];
}

const FALLBACK_PROMPT = `You are a content strategist for Koala PhD (koalaphd.com), an academic matching platform connecting Chinese students with Australian PhD supervisors.

Since no real-time news is available, generate {count} trending blog article topics based on your knowledge of current trends.

Consider these 6 news source categories:
1. 澳洲教育政策 — university funding, international student caps, policy changes
2. 学术圈动态 — rankings, ARC grants, new research centres, academic hiring
3. 国际时事与留学 — geopolitics affecting education, China-Australia relations
4. 科技公司与AI — OpenAI, DeepMind, Google AI, biotech breakthroughs → research trends
5. 留学生活 — cost of living, mental health, community, part-time work rules
6. 职业与产业 — industry partnerships, career outcomes, post-PhD employment

Return a JSON array: [{"title": "中文标题", "category": "category_key", "style": "professional|casual|news", "source": "Koala Research", "sourceDate": "${new Date().toISOString().slice(0, 10)}", "reason": "为什么这个主题好"}].

Categories: phd_guide, application, scholarship, visa, supervisor, research, student_life, news, professor_spotlight.

DIVERSITY RULES:
- At most 2/8 can directly mention PhD申请/申请信/导师选择
- At least 3 should be broader: education policy, visa, scholarship news, tech/AI trends, geopolitics
- Each topic must connect naturally to PhD preparation using the CONNECTION FRAMEWORK:
  * Geopolitics → research funding → scholarship
  * Immigration policy → visa → application timeline
  * AI/tech → research trends → hot directions
  * Economy → cost of living → scholarship importance`;

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const count = Math.min(10, parseInt(url.searchParams.get('count') || '8'));

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const cutoffDate = new Date(today.getTime() - 48 * 60 * 60 * 1000);
    const cutoffStr = cutoffDate.toISOString().split('T')[0];

    const selectedQueries = getNewsQueries(todayStr)
      .sort(() => Math.random() - 0.5)
      .slice(0, 4);

    let newsData = '';
    let newsCount = 0;

    try {
      const searchResponse = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 4096,
        tools: [{ type: 'web_search_20250305', name: 'web_search' }] as any[],
        messages: [{
          role: 'user',
          content: `Today's date is ${todayStr}.

CRITICAL CONSTRAINTS:
- ONLY return news published between ${cutoffStr} and ${todayStr}
- DO NOT include any article older than 48 hours
- If a search returns old results, skip them and only keep recent ones
- If no recent news found for a topic, skip that topic entirely

Search for the LATEST news (past 48 hours only) about: ${selectedQueries.join(', ')}.

For each recent news item return:
- Title
- Source name
- Publication date (MUST be ${cutoffStr} or later)
- One-sentence summary

Return as a numbered list. Reject anything older than ${cutoffStr}.`,
        }],
      });

      const textBlocks = searchResponse.content.filter((b: any) => b.type === 'text');
      newsData = textBlocks.map((b: any) => b.text).join('\n').trim();

      if (newsData) {
        const lines = newsData.split('\n').filter(l => l.trim().length > 0);
        const numberedLines = lines.filter(l => /^\d+[\.\)]/.test(l.trim()));
        const newsLines = numberedLines.length > 0 ? numberedLines : lines;

        // Filter out news with dates clearly older than cutoff
        const filteredLines = newsLines.filter(line => {
          const dateMatch = line.match(/(\d{4}-\d{2}-\d{2})/);
          if (dateMatch) {
            return dateMatch[1] >= cutoffStr;
          }
          // If no parseable date, keep the line (avoid false negatives)
          return true;
        });

        newsCount = filteredLines.length;
        newsData = filteredLines.join('\n');
      }
    } catch (error) {
      console.error('[blog/topics] web_search failed:', error);
    }

    let prompt: string;

    if (newsData.length > 0) {
      prompt = `Based on the following real-time news gathered via web search, suggest ${count} blog article topics for Koala PhD (koalaphd.com), an academic matching platform connecting Chinese students with Australian PhD supervisors.

NEWS (all from the past 48 hours):
${newsData}

Consider these 6 news source categories when selecting angles:
1. 澳洲教育政策 2. 学术圈动态 3. 国际时事与留学 4. 科技公司与AI 5. 留学生活 6. 职业与产业

Return a JSON array of objects: [{"title": "中文标题", "category": "category_key", "style": "professional|casual|news", "source": "news source name", "sourceDate": "date string", "reason": "为什么这个主题好"}].

Categories: phd_guide, application, scholarship, visa, supervisor, research, student_life, news, professor_spotlight.

DIVERSITY RULES:
- At most 2/${count} can directly mention PhD申请/申请信/导师选择
- At least 3 should be broader: education policy, visa, scholarship news, tech/AI trends
- All topics must connect naturally to PhD preparation`;
    } else {
      prompt = FALLBACK_PROMPT.replace('{count}', String(count));
    }

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
      system: 'You are a content strategist for Koala PhD (koalaphd.com), an academic matching platform connecting Chinese students with Australian PhD supervisors. Return valid JSON array only, no markdown code blocks or extra text.',
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '[]';
    let topics = [];
    try {
      const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
      topics = JSON.parse(cleaned);
    } catch {
      topics = [];
    }

    return Response.json({ topics, newsCount, dateRange: `${cutoffStr} to ${todayStr}` });
  } catch (error) {
    console.error('[blog/topics]', error);
    return Response.json({ error: 'Internal server error', details: String(error) }, { status: 500 });
  }
}
