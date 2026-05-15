export const maxDuration = 60;

import type { NextRequest } from 'next/server';
import { getServerUser } from '../../../lib/auth';
import { supabaseAdmin } from '../../../lib/supabase/server';
import { urlImportLimiter, safeLimit } from '../../../lib/ratelimit';
import { notifyUser } from '../../../lib/notifications';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

const ALLOWED_DOMAINS = [
  '.edu.au',
  'scholar.google.com',
  'scholar.google.com.au',
  'researchgate.net',
  'orcid.org',
];

function isAllowedDomain(url: string): boolean {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    return ALLOWED_DOMAINS.some(d =>
      d.startsWith('.') ? hostname.endsWith(d) : hostname === d || hostname.endsWith('.' + d)
    );
  } catch {
    return false;
  }
}

function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#\d+;/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 15000);
}

export async function POST(req: NextRequest) {
  try {
    const user = await getServerUser();
    if (!user) return Response.json({ error: '请先登录' }, { status: 401 });

    const allowed = await safeLimit(urlImportLimiter, user.id);
    if (!allowed) return Response.json({ error: '每天最多录入 5 位教授，请明天再试' }, { status: 429 });

    const { url } = await req.json();
    if (!url || typeof url !== 'string') {
      return Response.json({ error: '请提供有效的 URL' }, { status: 400 });
    }

    if (!isAllowedDomain(url)) {
      return Response.json({
        error: '仅支持以下来源：澳洲大学官网 (.edu.au)、Google Scholar、ResearchGate、ORCID',
      }, { status: 400 });
    }

    let html: string;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      const res = await fetch(url, {
        signal: controller.signal,
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; KoalaPhD/1.0)' },
      });
      clearTimeout(timeout);
      if (!res.ok) return Response.json({ error: `无法访问该页面 (HTTP ${res.status})` }, { status: 400 });
      html = await res.text();
    } catch (e) {
      const msg = e instanceof Error && e.name === 'AbortError' ? '页面加载超时（15秒）' : '无法访问该页面';
      return Response.json({ error: msg }, { status: 400 });
    }

    const pageText = htmlToText(html);
    if (pageText.length < 50) {
      return Response.json({ error: '页面内容过少，无法提取教授信息' }, { status: 400 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return Response.json({ error: 'AI 服务不可用' }, { status: 500 });

    let extracted;
    try {
      const Anthropic = (await import('@anthropic-ai/sdk')).default;
      const client = new Anthropic({ apiKey });

      const response = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: `Extract professor information from this university profile page. URL: ${url}

Page content:
${pageText}

Return ONLY a JSON object with these fields (use null for missing info):
{
  "name": "full English name",
  "position_title": "exact academic title (e.g. Professor, Associate Professor, Senior Lecturer)",
  "university": "full official university name",
  "faculty": "department or school name",
  "research_areas": ["area1", "area2", "area3"],
  "email": "email if listed",
  "bio_en": "1-2 sentence summary of their research focus",
  "h_index": null,
  "paper_count": null,
  "citation_count": null
}

For Google Scholar pages, extract h_index, paper_count (total publications), and citation_count if visible.
Only extract what is explicitly on the page. Do NOT guess or fabricate.`,
        }],
      });

      const textBlocks = response.content.filter(b => b.type === 'text');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const text = textBlocks.map((b: any) => b.text).join('');
      const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return Response.json({ error: 'AI 无法从该页面提取教授信息' }, { status: 400 });

      extracted = JSON.parse(jsonMatch[0]);
    } catch (e) {
      console.error('[import-from-url] Claude extraction failed:', e);
      return Response.json({ error: 'AI 提取失败，请稍后重试' }, { status: 500 });
    }

    if (!extracted.name || !extracted.university) {
      return Response.json({ error: '无法从页面中提取教授姓名和大学信息' }, { status: 400 });
    }

    const { data: existing } = await db
      .from('professors')
      .select('*')
      .ilike('name', extracted.name)
      .ilike('university', `%${extracted.university.split(' ').slice(0, 3).join(' ')}%`)
      .maybeSingle();

    if (existing) {
      return Response.json({
        success: true,
        professor: existing,
        alreadyExists: true,
      });
    }

    const { data: professor, error: insertError } = await db
      .from('professors')
      .insert({
        name: extracted.name,
        university: extracted.university,
        position_title: extracted.position_title || 'Researcher',
        faculty: extracted.faculty || null,
        research_areas: extracted.research_areas || [],
        email: extracted.email || null,
        profile_url: url,
        h_index: extracted.h_index || null,
        paper_count: extracted.paper_count || null,
        citation_count: extracted.citation_count || null,
        ai_summary: extracted.bio_en || null,
        verification_status: 'user_contributed',
        contributed_by: user.id,
        contributed_at: new Date().toISOString(),
        data_sources: ['url_import'],
      })
      .select()
      .single();

    if (insertError) {
      console.error('[import-from-url] insert failed:', insertError);
      return Response.json({ error: '录入失败' }, { status: 500 });
    }

    let creditsAwarded = 0;
    let newBalance = 0;
    try {
      const { data: profile } = await db.from('user_profiles')
        .select('credits_remaining')
        .eq('id', user.id).single();
      const currentBalance = profile?.credits_remaining ?? 30;
      newBalance = currentBalance + 10;
      creditsAwarded = 10;

      await db.from('user_profiles').update({
        credits_remaining: newBalance,
        updated_at: new Date().toISOString(),
      }).eq('id', user.id);

      await db.from('credit_transactions').insert({
        user_id: user.id,
        amount: 10,
        balance_after: newBalance,
        type: 'earn_contribute',
        description: `通过链接录入教授：${extracted.name}`,
      });

      await notifyUser(
        user.id,
        '感谢录入教授数据！+10 积分',
        `您帮助录入了 ${extracted.name}（${extracted.university}）的信息，获得 10 积分奖励！`,
        'info',
        '/koala/my-profile',
      );
    } catch (e) {
      console.error('[import-from-url] credit reward failed:', e);
    }

    return Response.json({
      success: true,
      professor,
      reward: creditsAwarded > 0 ? { credits: creditsAwarded, newBalance } : undefined,
    });
  } catch (error) {
    console.error('[professors/import-from-url POST]', error);
    return Response.json({ error: '服务器内部错误' }, { status: 500 });
  }
}
