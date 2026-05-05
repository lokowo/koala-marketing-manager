import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const NEWS_CATEGORIES: Record<string, string[]> = {
  '澳洲教育政策': ['Australia international student policy 2026', 'Australia university funding cap changes'],
  '学术圈动态': ['Australia ARC research grant 2026', 'world university ranking QS THE 2026'],
  '国际时事与留学': ['China Australia education relations 2026', 'geopolitics international students'],
  '科技公司与AI': ['AI research breakthrough 2026', 'OpenAI DeepMind biotech discovery'],
  '留学生活': ['Australia student cost of living 2026', 'PhD student mental health support'],
  '职业与产业': ['Australia PhD career outcomes industry', 'academic job market Australia 2026'],
};

async function fetchNewsWithWebSearch(anthropic: Anthropic, keywords: string[]): Promise<string> {
  try {
    const searchQuery = keywords.join('; ');
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      tools: [{ type: 'web_search' as any, name: 'web_search' }] as any,
      messages: [{
        role: 'user',
        content: `Search for the latest news about each of these topics and return a summary of 8-10 recent news items with title, source, date, and a one-sentence summary:\n\n${searchQuery}\n\nFormat each item as: [Source] Title (Date) - Summary`,
      }],
    });

    const textBlocks = response.content.filter((b: any) => b.type === 'text');
    return textBlocks.map((b: any) => b.text).join('\n');
  } catch (error) {
    console.error('[blog/topics] web_search failed:', error);
    return '';
  }
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

    const categoryKeys = Object.keys(NEWS_CATEGORIES);
    const selectedCategories = categoryKeys.sort(() => Math.random() - 0.5).slice(0, 4);
    const keywords = selectedCategories.map(cat => {
      const queries = NEWS_CATEGORIES[cat];
      return queries[Math.floor(Math.random() * queries.length)];
    });

    const newsContext = await fetchNewsWithWebSearch(anthropic, keywords);

    let prompt: string;
    let newsCount = 0;

    if (newsContext.trim().length > 0) {
      newsCount = (newsContext.match(/\[.*?\]/g) || []).length;
      prompt = `Based on the following real-time news gathered via web search, suggest ${count} blog article topics for Koala PhD (koalaphd.com), an academic matching platform connecting Chinese students with Australian PhD supervisors.

NEWS:
${newsContext}

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
      model: 'claude-sonnet-4-20250514',
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

    return Response.json({ topics, newsCount: newsCount || topics.length });
  } catch (error) {
    console.error('[blog/topics]', error);
    return Response.json({ error: 'Internal server error', details: String(error) }, { status: 500 });
  }
}
