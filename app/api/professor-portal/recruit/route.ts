import { NextRequest } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabase/server';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { professor_id, research_topic, required_background, scholarship_info, deadline } = body;

    if (!professor_id || !research_topic) {
      return Response.json({ error: '缺少必要字段' }, { status: 400 });
    }

    const { data, error } = await db.from('recruitment_posts').insert({
      professor_id,
      research_topic,
      required_background: required_background || null,
      scholarship_info: scholarship_info || null,
      deadline: deadline || null,
      is_active: true,
    }).select().single();

    if (error) {
      // Table may not exist yet
      console.error('[professor-portal/recruit]', error);
      return Response.json({ error: '发布失败，recruitment_posts 表可能不存在' }, { status: 500 });
    }

    return Response.json({ success: true, post: data });
  } catch (error) {
    console.error('[professor-portal/recruit]', error);
    return Response.json({ error: 'Internal error' }, { status: 500 });
  }
}
