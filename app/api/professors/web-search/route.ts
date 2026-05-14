import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { requireAdmin } from '../../../lib/auth';
import { aiLimiter } from '../../../lib/ratelimit';

export async function GET(req: NextRequest) {
  try {
    let adminUser: { user: { id: string } };
    try { adminUser = await requireAdmin(); } catch { return Response.json({ error: 'Forbidden' }, { status: 403 }); }
    if (aiLimiter) {
      const { success } = await aiLimiter.limit(adminUser.user.id);
      if (!success) return Response.json({ error: '操作太频繁，请稍后再试' }, { status: 429 });
    }
    const name = req.nextUrl.searchParams.get('name');
    if (!name || typeof name !== 'string') {
      return Response.json({ error: 'Missing name param' }, { status: 400 });
    }
    return doSearch(name);
  } catch (error) {
    console.error('[professors/web-search GET]', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    if (aiLimiter) {
      const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
      const { success } = await aiLimiter.limit(ip);
      if (!success) return Response.json({ error: '操作太频繁，请稍后再试' }, { status: 429 });
    }
    const { name, university } = await req.json();
    if (!name || typeof name !== 'string') {
      return Response.json({ error: 'Missing professor name' }, { status: 400 });
    }
    return doSearch(name, university);
  } catch (error) {
    console.error('[professors/web-search POST]', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function doSearch(name: string, university?: string) {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

  const searchTarget = university
    ? `professor ${name} at ${university}`
    : `professors named "${name}" OR professors researching "${name}" at Australian universities`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4000,
    tools: [{ type: 'web_search_20250305', name: 'web_search' }] as any[],
    messages: [{
      role: 'user',
      content: `Search for ${searchTarget}. Find up to 5 professors. For each professor, find: full name, current university, faculty/department, position title, email address, research areas (as an array of keywords), H-index, number of papers, citation count, university profile URL, and Google Scholar URL.

Return ONLY a JSON array in this exact format (no markdown, no explanation):
[
  {
    "name": "Full Name",
    "university": "University Name",
    "faculty": "Faculty/Department",
    "positionTitle": "Professor/Associate Professor/Senior Lecturer/etc",
    "email": "email@university.edu.au",
    "researchAreas": ["area1", "area2", "area3"],
    "hIndex": 25,
    "paperCount": 100,
    "citationCount": 3000,
    "profileUrl": "https://...",
    "googleScholarUrl": "https://scholar.google.com/...",
    "opportunityScore": 50
  }
]

If you cannot find a field, use null. For opportunityScore use 50 as default. For researchAreas, provide at least 3-5 keywords. If you find only one professor, return a single-element array. If you find none, return an empty array [].`,
    }],
  });

  const textBlocks = response.content.filter((b: any) => b.type === 'text');
  const text = textBlocks.map((b: any) => b.text).join('\n');

  const arrayMatch = text.match(/\[[\s\S]*\]/);
  if (arrayMatch) {
    const results = JSON.parse(arrayMatch[0]).filter(
      (p: any) => p && p.name && p.university
    );
    return Response.json({ results, professor: results[0] ?? null });
  }

  const objMatch = text.match(/\{[\s\S]*\}/);
  if (objMatch) {
    const professor = JSON.parse(objMatch[0]);
    if (professor.name && professor.university) {
      return Response.json({ results: [professor], professor });
    }
  }

  return Response.json({ results: [], professor: null });
}
