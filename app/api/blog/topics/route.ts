import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const NEWS_SEARCH_QUERIES = [
  'Australia education policy international students 2026',
  'Australia university research grant ARC',
  'geopolitics impact international education Australia China',
  'OpenAI DeepMind Google AI biotech research breakthrough',
  'Australia student visa immigration policy changes',
  'PhD student life cost living mental health Australia',
  'Australia academic job market career industry',
  'world university ranking QS THE 2026',
  'Australia China relations education research',
  'scholarship RTP CSIRO research fellowship Australia',
];

async function fetchGoogleNewsRSS(query: string): Promise<{ title: string; source: string; date: string; link: string }[]> {
  try {
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-AU&gl=AU&ceid=AU:en`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) return [];
    const xml = await res.text();

    const items: { title: string; source: string; date: string; link: string }[] = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match;
    while ((match = itemRegex.exec(xml)) !== null && items.length < 3) {
      const itemXml = match[1];
      const title = itemXml.match(/<title>(.*?)<\/title>/)?.[1]?.replace(/<!\[CDATA\[(.*?)\]\]>/, '$1') || '';
      const link = itemXml.match(/<link>(.*?)<\/link>/)?.[1] || '';
      const pubDate = itemXml.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] || '';
      const source = itemXml.match(/<source.*?>(.*?)<\/source>/)?.[1] || 'Google News';
      items.push({ title, source, date: pubDate, link });
    }
    return items;
  } catch {
    return [];
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

    const shuffled = [...NEWS_SEARCH_QUERIES].sort(() => Math.random() - 0.5).slice(0, 4);
    const newsResults = await Promise.all(shuffled.map(q => fetchGoogleNewsRSS(q)));
    const allNews = newsResults.flat();

    let prompt: string;
    let newsCount = allNews.length;

    if (allNews.length > 0) {
      const newsContext = allNews.map((n, i) => `${i + 1}. [${n.source}] ${n.title} (${n.date})`).join('\n');
      prompt = `Based on the following real news, suggest ${count} blog article topics for Koala PhD (koalaphd.com), an academic matching platform connecting Chinese students with Australian PhD supervisors.

NEWS:
${newsContext}

Consider these 6 news source categories when selecting angles:
1. 澳洲教���政策 2. 学术圈动态 3. 国际时事与留学 4. 科技公司与AI 5. 留学生活 6. 职业与产业

Return a JSON array of objects: [{"title": "中文标题", "category": "category_key", "style": "professional|casual|news", "source": "news source name", "sourceDate": "date string", "reason": "为什么这个主题好"}].

Categories: phd_guide, application, scholarship, visa, supervisor, research, student_life, news, professor_spotlight.

DIVERSITY RULES:
- At most 2/${count} can directly mention PhD申请/申请信/导师选择
- At least 3 should be broader: education policy, visa, scholarship news, tech/AI trends
- All topics must connect naturally to PhD preparation`;
    } else {
      prompt = FALLBACK_PROMPT.replace('{count}', String(count));
      newsCount = 0;
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
