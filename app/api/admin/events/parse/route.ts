import Anthropic from '@anthropic-ai/sdk';
import { requireAdmin } from '../../../../lib/auth';

const EVENT_CATEGORIES = ['cafe', 'cultural', 'nightclub', 'outdoor', 'restaurant', 'music', 'festival', 'other'] as const;

const SYSTEM_PROMPT = `你是悉尼活动信息提取助手，帮 Koala PhD 后台管理员把粘贴/截图/链接里的活动整理成结构化数据。

从输入中提取**所有**活动（可能 1 个或多个），每个活动输出一个 JSON 对象。

字段规范：
- event_name: 活动英文名（如原文是中文，给一个简短英文译名）
- event_name_cn: 活动中文名（如原文是英文，翻译成自然中文）
- venue: 场地名（找不到给 null）
- event_date: "YYYY-MM-DD" 格式。原文是"this Friday" / "next Sat" 等相对日期时**不要猜**，直接给 null；只有原文有明确日期/月份才填
- event_time: "HH:MM" 或 "HH:MM-HH:MM"，找不到给 null
- category: 必须是这八个之一：${EVENT_CATEGORIES.join(' / ')}
- description: 1-2 句简短描述（中文，30-80 字）
- ola_comment: 一句话 Ola 学姐口吻的推荐评论（活泼亲切，可带 emoji，30-50 字，告诉留学生为什么值得去 / 适合什么人 / 小 tip）
- source_url: 如果原文里能看到活动详情页链接就填，否则 null

只输出 JSON 数组，不要任何解释、不要 markdown 代码块。示例：
[{"event_name":"Vivid Sydney","event_name_cn":"悉尼灯光节","venue":"Circular Quay","event_date":"2026-05-23","event_time":"18:00-23:00","category":"festival","description":"全城灯光艺术节，从环形码头到歌剧院都被点亮，超出片。","ola_comment":"必去！带相机带朋友，但记得避开周末晚上的人潮挤死人😅","source_url":null}]

如果一个活动都提取不出来，输出 []。`;

interface ParsedEvent {
  event_name: string;
  event_name_cn: string;
  venue: string | null;
  event_date: string | null;
  event_time: string | null;
  category: string;
  description: string | null;
  ola_comment: string | null;
  source_url: string | null;
}

async function fetchUrlText(url: string): Promise<{ ok: true; text: string } | { ok: false; error: string }> {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { ok: false, error: '只支持 http/https 链接' };
    }
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
      },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) {
      return { ok: false, error: `网页返回 ${res.status}，可能反爬。请复制网页正文粘贴到文字框` };
    }
    const html = await res.text();
    // 抽正文：去 script/style/nav/footer，去标签，压空白
    const cleaned = html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<nav[\s\S]*?<\/nav>/gi, ' ')
      .replace(/<footer[\s\S]*?<\/footer>/gi, ' ')
      .replace(/<header[\s\S]*?<\/header>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&#39;/g, "'")
      .replace(/&quot;/g, '"')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 12000);
    if (cleaned.length < 30) {
      return { ok: false, error: '网页正文太短或被反爬，请复制内容粘贴到文字框' };
    }
    return { ok: true, text: `来源链接：${url}\n\n网页正文：\n${cleaned}` };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: `链接抓取失败（${msg}），请改用文字粘贴` };
  }
}

function normalizeEvent(raw: Record<string, unknown>): ParsedEvent {
  const cat = String(raw.category ?? '').toLowerCase();
  const safeCategory = (EVENT_CATEGORIES as readonly string[]).includes(cat) ? cat : 'other';
  return {
    event_name: String(raw.event_name ?? '').trim(),
    event_name_cn: String(raw.event_name_cn ?? raw.event_name ?? '').trim(),
    venue: raw.venue ? String(raw.venue).trim() : null,
    event_date: raw.event_date && /^\d{4}-\d{2}-\d{2}$/.test(String(raw.event_date)) ? String(raw.event_date) : null,
    event_time: raw.event_time ? String(raw.event_time).trim() : null,
    category: safeCategory,
    description: raw.description ? String(raw.description).trim() : null,
    ola_comment: raw.ola_comment ? String(raw.ola_comment).trim() : null,
    source_url: raw.source_url ? String(raw.source_url).trim() : null,
  };
}

export async function POST(req: Request) {
  try {
    await requireAdmin();
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unauthorized';
    return Response.json({ error: msg }, { status: msg === 'Unauthorized' ? 401 : 403 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return Response.json({ error: '服务未配置 ANTHROPIC_API_KEY' }, { status: 500 });

  let body: { text?: string; url?: string; imageBase64?: string; imageMediaType?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: '请求体不是合法 JSON' }, { status: 400 });
  }

  const { text, url, imageBase64, imageMediaType } = body;
  if (!text && !url && !imageBase64) {
    return Response.json({ error: '请提供文字 / 链接 / 图片中的至少一种' }, { status: 400 });
  }

  // 组装 Claude messages content
  const contentBlocks: Anthropic.MessageParam['content'] = [];

  let urlSourceUrl: string | null = null;
  if (url && url.trim()) {
    urlSourceUrl = url.trim();
    const fetched = await fetchUrlText(url.trim());
    if (!fetched.ok) {
      return Response.json({ error: fetched.error }, { status: 422 });
    }
    contentBlocks.push({ type: 'text', text: fetched.text });
  }

  if (text && text.trim()) {
    contentBlocks.push({ type: 'text', text: `用户粘贴的文字素材：\n${text.trim().slice(0, 12000)}` });
  }

  if (imageBase64 && imageBase64.trim()) {
    const mediaType = (imageMediaType || 'image/jpeg').toLowerCase();
    if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(mediaType)) {
      return Response.json({ error: '图片格式仅支持 jpeg/png/gif/webp' }, { status: 400 });
    }
    contentBlocks.push({
      type: 'image',
      source: {
        type: 'base64',
        media_type: mediaType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
        data: imageBase64.replace(/^data:[^;]+;base64,/, ''),
      },
    });
    contentBlocks.push({ type: 'text', text: '请从上面这张图片里提取活动信息。' });
  }

  if (contentBlocks.length === 0) {
    return Response.json({ error: '素材为空' }, { status: 400 });
  }

  const client = new Anthropic({ apiKey });

  let reply: string;
  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 3000,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: contentBlocks }],
    });
    reply = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map(b => b.text)
      .join('');
  } catch (err) {
    console.error('[admin/events/parse] Claude error:', err);
    const msg = err instanceof Error ? err.message : 'AI 调用失败';
    return Response.json({ error: msg }, { status: 502 });
  }

  // 解析 Claude 返回 — 容错抽 JSON 数组
  const jsonMatch = reply.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    return Response.json({ error: 'AI 没识别出活动，请换个素材试试', raw: reply.slice(0, 500) }, { status: 422 });
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonMatch[0]);
  } catch {
    return Response.json({ error: 'AI 返回不是合法 JSON', raw: reply.slice(0, 500) }, { status: 422 });
  }
  if (!Array.isArray(parsed)) {
    return Response.json({ error: 'AI 返回格式异常（不是数组）' }, { status: 422 });
  }

  const events: ParsedEvent[] = parsed
    .filter((e): e is Record<string, unknown> => typeof e === 'object' && e !== null)
    .map(normalizeEvent)
    .filter(e => e.event_name && e.event_name_cn)
    .map(e => ({ ...e, source_url: e.source_url ?? urlSourceUrl }));

  if (events.length === 0) {
    return Response.json({ error: 'AI 没识别出活动（提取后均为空）' }, { status: 422 });
  }

  return Response.json({ events });
}
