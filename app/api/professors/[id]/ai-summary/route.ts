import type { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { supabaseAdmin } from '../../../../lib/supabase/server';
import { aiLimiter } from '../../../../lib/ratelimit';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  if (aiLimiter) {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const { success } = await aiLimiter.limit(`ai-summary:${ip}`);
    if (!success) return Response.json({ summary: null, error: '操作太频繁，请稍后再试' }, { status: 429 });
  }

  const { data: prof, error } = await db
    .from('professors')
    .select('ai_summary, name, university, research_areas, h_index, paper_count, citation_count, grant_status, accepting_students, position_title')
    .eq('id', id)
    .single();

  if (error || !prof) {
    return Response.json({ summary: null }, { status: 404 });
  }

  if (prof.ai_summary) {
    return Response.json({ summary: prof.ai_summary });
  }

  try {
    const areas = (prof.research_areas ?? []).join('、');
    const prompt = `请用中文写2-3句话介绍以下澳洲大学教授，面向准备申请PhD的学生。要求自然流畅，突出对申请者的参考价值。不要使用"该教授"开头，直接用姓名。

教授信息：
- 姓名：${prof.name}
- 大学：${prof.university}
- 职位：${prof.position_title || '未知'}
- 研究方向：${areas || '未知'}
- H-Index：${prof.h_index ?? '未知'}
- 论文数量：${prof.paper_count ?? '未知'}
- 引用次数：${prof.citation_count ?? '未知'}
- 经费状态：${prof.grant_status === 'Active' ? '有活跃经费' : '未知'}
- 招生状态：${prof.accepting_students === 'yes' ? '正在招生' : prof.accepting_students === 'likely' ? '可能招生' : '未知'}

只输出介绍文字，不要加标题或格式。`;

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      messages: [{ role: 'user', content: prompt }],
    });

    const summary = response.content[0].type === 'text' ? response.content[0].text.trim() : null;

    if (summary) {
      await db.from('professors').update({ ai_summary: summary }).eq('id', id);
    }

    return Response.json({ summary });
  } catch (e) {
    console.error('[ai-summary] generation failed:', e);
    return Response.json({ summary: null, error: '生成失败' });
  }
}
