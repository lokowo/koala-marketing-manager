import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const NEWS_SEARCH_QUERIES = [
  'Australia PhD scholarship 2026',
  'Australia university ranking',
  'Australia student visa 500 changes',
  'Australia international student news',
  'ARC grant results 2026',
  'PhD application Australia tips',
  'academic job market Australia',
  'world university ranking 2026',
  'Australia immigration policy student',
  'Australian Government RTP scholarship',
  'cost of living Australia student',
  'mental health PhD student',
];

async function fetchGoogleNewsRSS(query: string): Promise<{ title: string; source: string; date: string; link: string }[]> {
  try {
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-AU&gl=AU&ceid=AU:en`;
    const res = await fetch(url, { next: { revalidate: 3600 } });
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

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const count = Math.min(10, parseInt(url.searchParams.get('count') || '6'));

    // Fetch news from multiple queries (pick 4 random queries)
    const shuffled = [...NEWS_SEARCH_QUERIES].sort(() => Math.random() - 0.5).slice(0, 4);
    const newsResults = await Promise.all(shuffled.map(q => fetchGoogleNewsRSS(q)));
    const allNews = newsResults.flat();

    if (allNews.length === 0) {
      return Response.json({ topics: [], newsCount: 0, message: 'No news sources available' });
    }

    // Use AI to generate topics from news
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
    const newsContext = allNews.map((n, i) => `${i + 1}. [${n.source}] ${n.title} (${n.date})`).join('\n');

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [{ role: 'user', content: `Based on the following real news, suggest ${count} blog article topics for Koala PhD (koalaphd.com).\n\nNEWS:\n${newsContext}\n\nReturn a JSON array of objects: [{"title": "中文标题", "category": "category_key", "style": "professional|casual|news", "source": "news source name", "sourceDate": "date string", "reason": "为什么这个主题好"}].\n\nCategories: phd_guide, application, scholarship, visa, supervisor, research, student_life, news.\n\nDIVERSITY RULES:\n- At most 2 can directly mention PhD申请/套磁信/导师\n- At least 3 should be broader: education policy, visa, scholarship news, research trends\n- All topics must connect naturally to PhD preparation` }],
      system: 'You are a content strategist for Koala Study Advisors (koalaphd.com), an Australian PhD advisory platform. Return valid JSON only.',
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '[]';
    let topics = [];
    try { topics = JSON.parse(text); } catch { topics = []; }

    return Response.json({ topics, newsCount: allNews.length });
  } catch (error) {
    console.error('[blog/topics]', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
