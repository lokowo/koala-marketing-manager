import type { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { requireAdmin } from '../../../../lib/auth';
import { getProfessor, updateProfessor } from '../../../../lib/services/professorService';
import type { Professor } from '../../../../lib/types';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

type Ctx = { params: Promise<{ id: string }> };

type RepairableField = 'email' | 'profileUrl' | 'googleScholarUrl' | 'positionTitle' | 'faculty';

const POSITION_TITLES = [
  'Professor',
  'Associate Professor',
  'Senior Lecturer',
  'Lecturer',
  'Research Fellow',
  'Senior Research Fellow',
  'Postdoctoral Fellow',
] as const;

function isMissing(prof: Professor, field: RepairableField): boolean {
  switch (field) {
    case 'email': return !prof.email;
    case 'profileUrl': return !prof.profileUrl;
    case 'googleScholarUrl': return !prof.googleScholarUrl;
    case 'positionTitle': return !prof.positionTitle;
    case 'faculty': return !prof.faculty;
  }
}

function getMissingFields(prof: Professor): RepairableField[] {
  const fields: RepairableField[] = ['email', 'profileUrl', 'googleScholarUrl', 'positionTitle', 'faculty'];
  return fields.filter(f => isMissing(prof, f));
}

export async function POST(_req: NextRequest, ctx: Ctx) {
  try {
    await requireAdmin();
    const { id } = await ctx.params;

    const prof = await getProfessor(id);
    if (!prof) return Response.json({ error: 'Professor not found' }, { status: 404 });

    const missing = getMissingFields(prof);
    if (missing.length === 0) {
      return Response.json({
        updated: {},
        confidence: {},
        notes: '所有字段均已存在，无需修复。',
        missing: [],
      });
    }

    const fieldDescriptions: Record<RepairableField, string> = {
      email:           'official university email address',
      profileUrl:      'official university staff profile page URL',
      googleScholarUrl:'Google Scholar profile URL',
      positionTitle:   `academic position/title (must be one of: ${POSITION_TITLES.join(', ')})`,
      faculty:         'faculty or department name',
    };

    const searchTarget = missing.map(f => `• ${f}: ${fieldDescriptions[f]}`).join('\n');

    const prompt = `You are a research assistant helping complete professor profile data.

Professor: ${prof.name}
University: ${prof.university}
Research Areas: ${prof.researchAreas.join(', ')}
Current known email: ${prof.email || '(missing)'}
Current known profile URL: ${prof.profileUrl || '(missing)'}
Current Google Scholar: ${prof.googleScholarUrl || '(missing)'}
Current position title: ${prof.positionTitle || '(missing)'}
Current faculty/department: ${prof.faculty || '(missing)'}

Please search the web to find the following missing information for this professor:
${searchTarget}

Search the university website, Google Scholar, and other academic sources.
Return ONLY a JSON object with the fields you found (omit fields you could not confirm with high confidence):

{
  "email": "found@university.edu.au" or null,
  "profileUrl": "https://..." or null,
  "googleScholarUrl": "https://scholar.google.com/citations?user=..." or null,
  "positionTitle": "Professor|Associate Professor|Senior Lecturer|Lecturer|Research Fellow|Senior Research Fellow|Postdoctoral Fellow" or null,
  "faculty": "School of Computer Science" or null,
  "confidence": {
    "email": "high|medium|low",
    "profileUrl": "high|medium|low",
    "googleScholarUrl": "high|medium|low",
    "positionTitle": "high|medium|low",
    "faculty": "high|medium|low"
  },
  "notes": "brief explanation of sources used"
}

Only include fields that are in the missing list: ${missing.join(', ')}.
For positionTitle, you MUST use one of the exact strings listed. Do not invent new titles.
Return only valid JSON, no markdown fences.`;

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      tools: [{ type: 'web_search_20250305', name: 'web_search' }],
      messages: [{ role: 'user', content: prompt }],
    });

    // Extract the final text block from the response
    const textBlock = response.content.findLast(b => b.type === 'text');
    const rawText = textBlock?.type === 'text' ? textBlock.text.trim() : '';

    let parsed: {
      email?: string | null;
      profileUrl?: string | null;
      googleScholarUrl?: string | null;
      positionTitle?: string | null;
      faculty?: string | null;
      confidence?: Record<string, string>;
      notes?: string;
    };

    try {
      // Strip markdown fences if Claude wrapped them anyway
      const clean = rawText.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim();
      parsed = JSON.parse(clean);
    } catch {
      return Response.json({
        updated: {},
        confidence: {},
        notes: `AI 返回格式异常，无法解析。原始内容: ${rawText.slice(0, 200)}`,
        missing,
      });
    }

    // Only update fields that were missing AND AI found a value
    const updates: Partial<Omit<Professor, 'id' | 'createdAt'>> = {};
    const updated: Record<string, string> = {};
    const confidence: Record<string, string> = parsed.confidence ?? {};

    for (const field of missing) {
      const val = parsed[field];
      if (!val) continue;

      // Validate positionTitle against allowed values
      if (field === 'positionTitle') {
        if (!POSITION_TITLES.includes(val as typeof POSITION_TITLES[number])) continue;
        updates.positionTitle = val as Professor['positionTitle'];
        updated.positionTitle = val;
        continue;
      }

      // Basic URL validation
      if (field === 'profileUrl' || field === 'googleScholarUrl') {
        if (!val.startsWith('http')) continue;
        (updates as Record<string, string>)[field] = val;
        updated[field] = val;
        continue;
      }

      // Basic email validation
      if (field === 'email') {
        if (!val.includes('@')) continue;
        updates.email = val;
        updated.email = val;
        continue;
      }

      // faculty — free text
      if (field === 'faculty') {
        updates.faculty = val;
        updated.faculty = val;
      }
    }

    // Persist to DB only if we found something
    if (Object.keys(updates).length > 0) {
      await updateProfessor(id, updates);
    }

    return Response.json({
      updated,
      confidence,
      notes: parsed.notes ?? '',
      missing,
    });
  } catch (error) {
    const msg = (error as Error).message;
    if (msg === 'Unauthorized') return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (msg === 'Forbidden') return Response.json({ error: 'Forbidden' }, { status: 403 });
    console.error('[ai-repair]', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
