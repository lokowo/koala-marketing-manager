import type { NextRequest } from 'next/server';
import { listProfessors, createProfessor } from '../../lib/services/professorService';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '20', 10), 200);
    const page = Math.max(parseInt(searchParams.get('page') ?? '1', 10), 1);
    const professors = await listProfessors({
      university: searchParams.get('university') ?? undefined,
      verificationStatus: searchParams.get('verificationStatus') ?? undefined,
      researchArea: searchParams.get('researchArea') ?? undefined,
      search: searchParams.get('search') ?? undefined,
      limit,
      offset: (page - 1) * limit,
    });
    return Response.json({ data: professors, professors, total: professors.length, page, limit });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const professor = await createProfessor(body);
    return Response.json({ data: professor }, { status: 201 });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}
