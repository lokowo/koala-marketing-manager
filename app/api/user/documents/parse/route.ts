import { getServerUser } from '../../../../lib/auth';
import { supabaseAdmin } from '../../../../lib/supabase/server';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

function extractYear(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null;
  const y = parseInt(dateStr.slice(0, 4), 10);
  return isNaN(y) ? null : y;
}

export async function POST(req: Request) {
  try {
    const user = await getServerUser();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { document_id } = await req.json();
    if (!document_id) {
      return Response.json({ error: 'document_id is required' }, { status: 400 });
    }

    const { data: doc } = await db
      .from('user_documents')
      .select('*')
      .eq('id', document_id)
      .eq('user_id', user.id)
      .single();

    if (!doc) {
      return Response.json({ error: 'Document not found' }, { status: 404 });
    }

    await db
      .from('user_documents')
      .update({ ai_parsed: false, updated_at: new Date().toISOString() })
      .eq('id', document_id);

    const storagePath = doc.file_url?.includes('user-documents/')
      ? doc.file_url.split('user-documents/').pop()
      : null;

    if (!storagePath) {
      await db
        .from('user_documents')
        .update({ ai_summary: JSON.stringify({ error: 'Invalid file path' }), updated_at: new Date().toISOString() })
        .eq('id', document_id);
      return Response.json({ error: 'Invalid file path' }, { status: 500 });
    }

    const { data: fileData, error: dlError } = await db.storage
      .from('user-documents')
      .download(storagePath);

    if (dlError || !fileData) {
      await db
        .from('user_documents')
        .update({ ai_summary: JSON.stringify({ error: 'Failed to download file' }), updated_at: new Date().toISOString() })
        .eq('id', document_id);
      return Response.json({ error: 'Failed to download file' }, { status: 500 });
    }

    const buffer = Buffer.from(await fileData.arrayBuffer());
    const base64 = buffer.toString('base64');
    const mediaType = doc.file_type.startsWith('image/') ? doc.file_type : 'application/pdf';

    const Anthropic = (await import('@anthropic-ai/sdk')).default;
    const client = new Anthropic();

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4000,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: doc.file_type.startsWith('image/')
                ? 'image' as const
                : 'document' as const,
              source: {
                type: 'base64' as const,
                media_type: mediaType,
                data: base64,
              },
            },
            {
              type: 'text' as const,
              text: `请解析这份文档（简历/成绩单/学历证明），提取以下信息并以JSON格式返回。

返回格式：
{
  "education": [
    {
      "school": "学校名",
      "major": "专业",
      "degree": "本科|硕士|博士|大专|高中|博士后|其他",
      "gpa": 3.8,
      "gpa_scale": "4.0|5.0|7.0|100",
      "start_date": "2020-09",
      "end_date": "2024-06",
      "is_current": false,
      "description": "相关描述"
    }
  ],
  "work": [
    {
      "company": "公司名",
      "position": "职位",
      "start_date": "2023-06",
      "end_date": "2024-01",
      "is_current": false,
      "description": "工作描述"
    }
  ],
  "profile": {
    "display_name": "姓名",
    "target_field": "研究方向（如果能推断）",
    "english_level": "英语水平（如果有）",
    "has_research_experience": true/false,
    "research_description": "科研经历描述",
    "has_publications": true/false,
    "publication_details": "论文详情"
  }
}

只返回JSON，不要其他文字。如果某个字段无法从文档中提取，设为null。`,
            },
          ],
        },
      ],
    });

    const responseText = message.content[0].type === 'text' ? message.content[0].text : '';
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      await db
        .from('user_documents')
        .update({ ai_summary: JSON.stringify({ error: 'Failed to parse AI response' }), updated_at: new Date().toISOString() })
        .eq('id', document_id);
      return Response.json({ error: 'Failed to parse AI response' }, { status: 500 });
    }

    const parsed = JSON.parse(jsonMatch[0]);

    await db
      .from('user_documents')
      .update({
        ai_parsed: true,
        ai_summary: JSON.stringify(parsed),
        updated_at: new Date().toISOString(),
      })
      .eq('id', document_id);

    if (parsed.education && Array.isArray(parsed.education)) {
      for (const edu of parsed.education) {
        if (!edu.school) continue;
        await db.from('education_history').insert({
          user_id: user.id,
          institution: edu.school,
          major: edu.major || null,
          degree_type: edu.degree || 'Other',
          gpa: edu.gpa ? parseFloat(edu.gpa) : null,
          gpa_scale: edu.gpa_scale || null,
          start_year: extractYear(edu.start_date),
          end_year: extractYear(edu.end_date),
          status: edu.is_current ? 'current' : 'completed',
          description: edu.description || null,
        });
      }
    }

    if (parsed.work && Array.isArray(parsed.work)) {
      for (const w of parsed.work) {
        if (!w.company) continue;
        await db.from('work_history').insert({
          user_id: user.id,
          company: w.company,
          position: w.position || '未填写',
          start_year: extractYear(w.start_date),
          end_year: extractYear(w.end_date),
          is_current: w.is_current ?? false,
          status: w.is_current ? 'current' : 'completed',
          description: w.description || null,
        });
      }
    }

    if (parsed.profile) {
      const profileUpdates: Record<string, unknown> = {};
      const fields = [
        'display_name', 'target_field', 'english_level',
        'has_research_experience', 'research_description',
        'has_publications', 'publication_details',
      ];
      for (const f of fields) {
        if (parsed.profile[f] !== null && parsed.profile[f] !== undefined) {
          profileUpdates[f] = parsed.profile[f];
        }
      }
      if (Object.keys(profileUpdates).length > 0) {
        profileUpdates.updated_at = new Date().toISOString();
        await db
          .from('user_profiles')
          .update(profileUpdates)
          .eq('id', user.id);
      }
    }

    return Response.json({
      success: true,
      parsed,
      education_count: parsed.education?.length ?? 0,
      work_count: parsed.work?.length ?? 0,
    });
  } catch (error) {
    console.error('[user/documents/parse POST]', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
