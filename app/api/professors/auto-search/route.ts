import type { NextRequest } from 'next/server';
import { searchProfessorAllSources, saveCandidateToDb } from '../../../lib/services/professorAutoAdd';
import type { ProfessorCandidate } from '../../../lib/services/professorAutoAdd';

export async function GET(req: NextRequest) {
  try {
    const name = req.nextUrl.searchParams.get('name');
    const university = req.nextUrl.searchParams.get('university') || undefined;
    const deep = req.nextUrl.searchParams.get('deep') === 'true';

    if (!name || name.trim().length < 2) {
      return Response.json({ error: 'Missing or too short name param' }, { status: 400 });
    }

    const candidates = await searchProfessorAllSources(name.trim(), university);

    return Response.json({
      candidates,
      total: candidates.length,
    });
  } catch (error) {
    console.error('[professors/auto-search GET]', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const candidate = body.candidate as ProfessorCandidate;

    if (!candidate?.name || !candidate?.university) {
      return Response.json({ error: 'candidate with name and university required' }, { status: 400 });
    }

    const professor = await saveCandidateToDb(candidate);
    if (professor) {
      return Response.json({ success: true, professor });
    }
    return Response.json({ error: '录入失败' }, { status: 500 });
  } catch (error) {
    console.error('[professors/auto-search POST]', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
