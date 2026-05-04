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

const FALLBACK_PROMPT = `You are a content strategist for Koala Study Advisors (koalaphd.com), an Australian PhD advisory platform helping Chinese students apply to Australian universities.

Since no real-time news is available, generate {count} trending blog article topics based on your knowledge of current trends in Australian higher education, PhD applications, and international student life.

Consider these timely angles:
- Australian university ranking changes and implications
- New scholarship rounds (RTP, university-specific)
- Visa policy updates (subclass 500, post-study work rights)
- ARC funding results and what they mean for students
- Cost of living changes for students
- Mental health resources for PhD students
- AI/tech impact on research and academia
- Supervisor selection strategies

Return a JSON array: [{"title": "中文标题", "category": "category_key", "style": "professional|casual|news", "source": "Koala Research", "sourceDate": "${new Date().toISOString().slice(0, 10)}", "reason": "为什么这个主题好"}].

Categories: phd_guide, application, scholarship, visa, supervisor, research, student_life, news.

DIVERSITY RULES:
- At most 2 can directly mention PhD申请/套磁信/导师
- At least 3 should be broader: education policy, visa, scholarship news, research trends
- All topics must connect naturally to PhD preparation`;

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const count = Math.min(10, parseInt(url.searchParams.get('count') || '6'));

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

    // Try fetching news from multiple queries (pick 4 random queries)
    const shuffled = [...NEWS_SEARCH_QUERIES].sort(() => Math.random() - 0.5).slice(0, 4);
    const newsResults = await Promise.all(shuffled.map(q => fetchGoogleNewsRSS(q)));
    const allNews = newsResults.flat();

    let prompt: string;
    let newsCount = allNews.length;

    if (allNews.length > 0) {
      const newsContext = allNews.map((n, i) => `${i + 1}. [${n.source}] ${n.title} (${n.date})`).join('\n');
      prompt = `Based on the following real news, suggest ${count} blog article topics for Koala PhD (koalaphd.com).\n\nNEWS:\n${newsContext}\n\nReturn a JSON array of objects: [{"title": "中文标题", "category": "category_key", "style": "professional|casual|news", "source": "news source name", "sourceDate": "date string", "reason": "为什么这个主题好"}].\n\nCategories: phd_guide, application, scholarship, visa, supervisor, research, student_life, news.\n\nDIVERSITY RULES:\n- At most 2 can directly mention PhD申请/套磁信/导师\n- At least 3 should be broader: education policy, visa, scholarship news, research trends\n- All topics must connect naturally to PhD preparation`;
    } else {
      // Fallback: generate topics without news
      prompt = FALLBACK_PROMPT.replace('{count}', String(count));
      newsCount = 0;
    }

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
      system: 'You are a content strategist for Koala Study Advisors (koalaphd.com), an Australian PhD advisory platform. Return valid JSON array only, no markdown code blocks or extra text.',
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
