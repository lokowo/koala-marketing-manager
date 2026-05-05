import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export async function POST(req: NextRequest) {
  try {
    const { name, university } = await req.json();

    if (!name || typeof name !== 'string') {
      return Response.json({ error: 'Missing professor name' }, { status: 400 });
    }

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

    const searchTarget = university
      ? `professor ${name} at ${university}`
      : `professor ${name} at Australian universities`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      tools: [{ type: 'web_search_20250305', name: 'web_search' }] as any[],
      messages: [{
        role: 'user',
        content: `Search for ${searchTarget}. Find their: full name, current university, faculty/department, position title, email address, research areas (as an array of keywords), H-index, number of papers, citation count, university profile URL, and Google Scholar URL.

Return ONLY a JSON object in this exact format (no markdown, no explanation):
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

If you cannot find a field, use null. For opportunityScore use 50 as default. For researchAreas, provide at least 3-5 keywords based on their publications.`,
      }],
    });

    const textBlocks = response.content.filter((b: any) => b.type === 'text');
    const text = textBlocks.map((b: any) => b.text).join('\n');

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return Response.json({ error: 'Could not parse professor data from search results' }, { status: 422 });
    }

    const professor = JSON.parse(jsonMatch[0]);

    if (!professor.name || !professor.university) {
      return Response.json({ error: 'Professor not found or insufficient data' }, { status: 404 });
    }

    return Response.json({ professor });
  } catch (error) {
    console.error('[professors/web-search]', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
