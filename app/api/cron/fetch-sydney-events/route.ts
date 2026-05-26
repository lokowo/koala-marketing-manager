import { supabaseAdmin } from '../../../lib/supabase/server';
import Anthropic from '@anthropic-ai/sdk';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

interface RawEvent {
  event_name: string;
  venue: string | null;
  event_date: string;
  event_time: string | null;
  category: string;
  description: string | null;
  source: string;
  source_url: string | null;
}

// ─── HTML scrapers ──────────────────────────────────

async function fetchCityOfSydneyEvents(): Promise<RawEvent[]> {
  try {
    const res = await fetch('https://whatson.cityofsydney.nsw.gov.au/events', {
      headers: { 'User-Agent': 'KoalaPhD-EventBot/1.0' },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return [];
    const html = await res.text();
    return parseCityOfSydney(html);
  } catch {
    console.log('[fetch-sydney-events] City of Sydney fetch failed, skipping');
    return [];
  }
}

function parseCityOfSydney(html: string): RawEvent[] {
  const events: RawEvent[] = [];

  // Match event card blocks — the site uses structured article/card elements
  // Pattern: title in <h3> or heading tags, date nearby, links to /events/slug
  const cardRegex = /<a[^>]*href="(\/events\/[^"]+)"[^>]*>[\s\S]*?<\/a>/gi;
  const titleRegex = /<(?:h[2-4]|span|div)[^>]*class="[^"]*(?:title|heading|name)[^"]*"[^>]*>([^<]+)<\//gi;
  const dateRegex = /(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+\d{4})/gi;
  const venueRegex = /(?:at|venue|location)[:\s]*([^<,]+)/gi;

  // Broader approach: extract all event links and nearby text
  const linkBlocks = html.match(/<a[^>]*href="\/events\/[^"]*"[^>]*>[\s\S]*?<\/a>/gi) ?? [];

  for (const block of linkBlocks.slice(0, 30)) {
    const hrefMatch = block.match(/href="(\/events\/[^"]+)"/);
    const textContent = block.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    if (!textContent || textContent.length < 5) continue;

    // Extract title — first substantial text chunk
    const titleMatch = textContent.match(/^(.{5,80}?)(?:\s+\d|\s+at\s|$)/i);
    const title = titleMatch?.[1]?.trim() ?? textContent.slice(0, 80).trim();

    const dateMatch = textContent.match(dateRegex)?.[0];
    const venueMatch = textContent.match(venueRegex)?.[0]?.replace(/^(?:at|venue|location)[:\s]*/i, '').trim();

    if (!title) continue;

    events.push({
      event_name: title,
      venue: venueMatch ?? null,
      event_date: dateMatch ? parseLooseDate(dateMatch) : getFallbackDate(),
      event_time: null,
      category: 'community',
      description: textContent.length > 80 ? textContent.slice(80, 300).trim() : null,
      source: 'cityofsydney',
      source_url: hrefMatch ? `https://whatson.cityofsydney.nsw.gov.au${hrefMatch[1]}` : null,
    });
  }

  // Fallback: try extracting from structured data (JSON-LD) if present
  if (events.length === 0) {
    const jsonLdBlocks = html.match(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi) ?? [];
    for (const block of jsonLdBlocks) {
      try {
        const jsonStr = block.replace(/<\/?script[^>]*>/gi, '').trim();
        const data = JSON.parse(jsonStr);
        const items = Array.isArray(data) ? data : data['@graph'] ?? [data];
        for (const item of items) {
          if (item['@type'] === 'Event' && item.name) {
            events.push({
              event_name: item.name,
              venue: item.location?.name ?? null,
              event_date: item.startDate ? item.startDate.slice(0, 10) : getFallbackDate(),
              event_time: item.startDate?.slice(11, 16) ?? null,
              category: 'community',
              description: item.description?.slice(0, 300) ?? null,
              source: 'cityofsydney',
              source_url: item.url ?? null,
            });
          }
        }
      } catch { /* ignore parse errors */ }
    }
  }

  return events.slice(0, 15);
}

async function fetchIvyEvents(): Promise<RawEvent[]> {
  try {
    const res = await fetch('https://merivale.com/venues/ivy', {
      headers: { 'User-Agent': 'KoalaPhD-EventBot/1.0' },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return [];
    const html = await res.text();
    return parseIvy(html);
  } catch {
    console.log('[fetch-sydney-events] Ivy fetch failed, skipping');
    return [];
  }
}

function parseIvy(html: string): RawEvent[] {
  const events: RawEvent[] = [];

  // Try JSON-LD first
  const jsonLdBlocks = html.match(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi) ?? [];
  for (const block of jsonLdBlocks) {
    try {
      const jsonStr = block.replace(/<\/?script[^>]*>/gi, '').trim();
      const data = JSON.parse(jsonStr);
      const items = Array.isArray(data) ? data : data['@graph'] ?? [data];
      for (const item of items) {
        if (item['@type'] === 'Event' && item.name) {
          events.push({
            event_name: item.name,
            venue: 'Ivy Sydney',
            event_date: item.startDate ? item.startDate.slice(0, 10) : getFallbackDate(),
            event_time: item.startDate?.slice(11, 16) ?? null,
            category: 'nightlife',
            description: item.description?.slice(0, 300) ?? null,
            source: 'ivy',
            source_url: item.url ?? `https://merivale.com/venues/ivy`,
          });
        }
      }
    } catch { /* ignore */ }
  }

  // Fallback: scrape event-like blocks from HTML
  if (events.length === 0) {
    const dateRegex = /(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*(?:\s+\d{4})?)/gi;
    const timeRegex = /(\d{1,2}(?::\d{2})?\s*(?:am|pm|AM|PM))/g;

    // Look for event card patterns
    const sections = html.match(/<(?:article|div|section)[^>]*class="[^"]*(?:event|whats-on|listing|card)[^"]*"[^>]*>[\s\S]*?<\/(?:article|div|section)>/gi) ?? [];

    for (const section of sections.slice(0, 20)) {
      const text = section.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      if (text.length < 10) continue;

      const titleMatch = text.match(/^(.{5,60}?)(?:\s+\d|\s+from\s|$)/i);
      const title = titleMatch?.[1]?.trim() ?? text.slice(0, 60).trim();
      const dateMatch = text.match(dateRegex)?.[0];
      const timeMatch = text.match(timeRegex)?.[0];

      if (!title) continue;

      events.push({
        event_name: title,
        venue: 'Ivy Sydney',
        event_date: dateMatch ? parseLooseDate(dateMatch) : getFallbackDate(),
        event_time: timeMatch ?? null,
        category: 'nightlife',
        description: text.length > 60 ? text.slice(60, 300).trim() : null,
        source: 'ivy',
        source_url: 'https://merivale.com/venues/ivy',
      });
    }
  }

  return events.slice(0, 10);
}

// ─── Date helpers ───────────────────────────────────

function parseLooseDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  } catch { /* fall through */ }
  return getFallbackDate();
}

function getFallbackDate(): string {
  // Default to next Saturday if date can't be parsed
  const d = new Date();
  d.setDate(d.getDate() + (6 - d.getDay() + 7) % 7);
  return d.toISOString().slice(0, 10);
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

// ─── AI translation + comment ───────────────────────

async function enrichWithAI(events: RawEvent[]): Promise<Array<RawEvent & { event_name_cn: string; ola_comment: string }>> {
  if (events.length === 0) return [];

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return events.map(e => ({
      ...e,
      event_name_cn: e.event_name,
      ola_comment: '学姐还没来得及点评～',
    }));
  }

  const client = new Anthropic({ apiKey });

  const eventList = events.map((e, i) =>
    `${i + 1}. "${e.event_name}" at ${e.venue ?? 'TBD'} on ${e.event_date}${e.description ? ` — ${e.description.slice(0, 100)}` : ''}`
  ).join('\n');

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: `你是小欧（Ola），一个在悉尼读博的学姐，帮留学生推荐活动。

对以下 ${events.length} 个悉尼活动：
${eventList}

请为每个活动输出 JSON 数组，每项包含：
- "index": 活动编号（从1开始）
- "name_cn": 活动名中文翻译（简短自然）
- "comment": 学姐风格的一句话点评（20-40字，活泼俏皮，偶尔用emoji，帮留学生判断值不值得去）

只输出 JSON 数组，不要其他文字。示例：
[{"index":1,"name_cn":"悉尼灯光节","comment":"超出片的！带上相机去Circular Quay，学姐上次拍了200张📸"}]`,
      }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]) as Array<{ index: number; name_cn: string; comment: string }>;
      return events.map((e, i) => {
        const enrichment = parsed.find(p => p.index === i + 1);
        return {
          ...e,
          event_name_cn: enrichment?.name_cn ?? e.event_name,
          ola_comment: enrichment?.comment ?? '学姐还没来得及点评～',
        };
      });
    }
  } catch (err) {
    console.error('[fetch-sydney-events] AI enrichment failed:', err);
  }

  return events.map(e => ({
    ...e,
    event_name_cn: e.event_name,
    ola_comment: '学姐还没来得及点评～',
  }));
}

// ─── Main handler ───────────────────────────────────

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // 1. Expire past events
    await db
      .from('ola_events')
      .update({ is_active: false })
      .lt('event_date', todayStr())
      .eq('is_active', true);

    // 2. Fetch events from both sources in parallel
    const [cityEvents, ivyEvents] = await Promise.all([
      fetchCityOfSydneyEvents(),
      fetchIvyEvents(),
    ]);

    const allRaw = [...cityEvents, ...ivyEvents];
    console.log(`[fetch-sydney-events] Scraped ${cityEvents.length} city + ${ivyEvents.length} ivy = ${allRaw.length} raw events`);

    if (allRaw.length === 0) {
      return Response.json({ ok: true, inserted: 0, expired: true, message: 'No events scraped' });
    }

    // 3. Deduplicate against existing DB entries
    const { data: existing } = await db
      .from('ola_events')
      .select('event_name, event_date')
      .eq('is_active', true);

    const existingKeys = new Set(
      (existing ?? []).map((e: { event_name: string; event_date: string }) =>
        `${e.event_name.toLowerCase().trim()}|${e.event_date}`
      )
    );

    const newEvents = allRaw.filter(e =>
      !existingKeys.has(`${e.event_name.toLowerCase().trim()}|${e.event_date}`)
    );

    if (newEvents.length === 0) {
      return Response.json({ ok: true, inserted: 0, expired: true, message: 'All events already exist' });
    }

    // 4. Enrich with AI (translate + comment)
    const enriched = await enrichWithAI(newEvents);

    // 5. Insert into DB
    const rows = enriched.map(e => ({
      city: 'sydney',
      event_name: e.event_name,
      event_name_cn: e.event_name_cn,
      venue: e.venue,
      event_date: e.event_date,
      event_time: e.event_time,
      category: e.category,
      description: e.description,
      ola_comment: e.ola_comment,
      source: e.source,
      source_url: e.source_url,
      is_active: true,
    }));

    const { error } = await db.from('ola_events').insert(rows);
    if (error) {
      console.error('[fetch-sydney-events] DB insert error:', error);
      return Response.json({ ok: false, error: error.message }, { status: 500 });
    }

    console.log(`[fetch-sydney-events] Inserted ${rows.length} new events`);
    return Response.json({ ok: true, inserted: rows.length, expired: true });
  } catch (error) {
    console.error('[fetch-sydney-events]', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
