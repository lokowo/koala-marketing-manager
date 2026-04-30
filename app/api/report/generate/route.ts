import type { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import type { StudentProfile } from '../../../lib/types';
import { GLOBAL_SYSTEM_PROMPT } from '../../../lib/prompts/system';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { studentProfile, stage1Score, userGoal } = body as {
      studentProfile: StudentProfile;
      stage1Score?: number;
      userGoal?: string;
    };

    const { createClient } = await import('@supabase/supabase-js');
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(url, key);

    // Get top matching professors from DB
    const { data: professors } = await supabase
      .from('professors')
      .select('id, name, university, position_title, research_areas, h_index, opportunity_score, arc_project_ids')
      .eq('verification_status', 'Verified')
      .order('opportunity_score', { ascending: false })
      .limit(10);

    const profContext = JSON.stringify(professors ?? []);
    const studentContext = JSON.stringify(studentProfile);

    const prompt = `${GLOBAL_SYSTEM_PROMPT}

你是 KSA 的学术路径分析系统。请根据以下学生信息和教授数据库，生成一份教授匹配报告。

## 学生信息
${studentContext}

## 初评分数
${stage1Score ?? '未评分'}

## 用户目标
${userGoal ?? '攻读 PhD'}

## 教授数据库（已预筛选）
${profContext}

## 匹配逻辑权重
1. 专业匹配度（40%）
2. 均分可行性（20%）
3. 项目活跃度（20%）
4. 跨专业合理性（10%）
5. 时间窗口（10%）

请为排名前 3 位的教授各生成一个匹配分析，输出以下 JSON 格式：
\`\`\`json
{
  "matches": [
    {
      "professorId": "...",
      "name": "...",
      "institution": "...",
      "positionTitle": "...",
      "matchScore": 85,
      "reason": "详细的匹配原因（中文，3-4句）",
      "proposalDirections": ["方向1", "方向2"],
      "researchTags": ["标签1", "标签2"]
    }
  ],
  "overallAssessment": "整体申请可行性评估（中文，2-3句）",
  "actionItems": ["行动建议1", "行动建议2", "行动建议3"],
  "disclaimer": "本报告由 AI 基于公开数据生成，仅供参考。教授信息请以院校官方为准。"
}
\`\`\`

只输出 JSON 块，不要有其他文字。`;

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    });

    const textBlock = response.content.find(b => b.type === 'text');
    const rawText = textBlock?.type === 'text' ? textBlock.text : '';

    const match = rawText.match(/```json\n([\s\S]*?)\n```/);
    if (!match) {
      return Response.json({ error: 'Report generation failed' }, { status: 500 });
    }

    const reportData = JSON.parse(match[1]);

    // Save report to DB
    const { data: saved } = await supabase
      .from('ai_conversations')
      .insert({
        session_id: `report_${Date.now()}`,
        mode: 'path',
        messages: [{ role: 'assistant', content: rawText }],
        student_profile_snapshot: studentProfile,
      })
      .select('id')
      .single();

    return Response.json({ reportId: saved?.id, ...reportData });
  } catch (e) {
    console.error('[Report Generate]', e);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
