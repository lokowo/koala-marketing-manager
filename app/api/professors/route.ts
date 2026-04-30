import type { NextRequest } from 'next/server';
import { listProfessors, countProfessors, createProfessor } from '../../lib/services/professorService';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '50', 10), 200);
    const page = Math.max(parseInt(searchParams.get('page') ?? '1', 10), 1);

    const filters = {
      university: searchParams.get('university') ?? undefined,
      verificationStatus: searchParams.get('verificationStatus') ?? undefined,
      researchArea: searchParams.get('researchArea') ?? undefined,
      category: searchParams.get('category') ?? undefined,
      search: searchParams.get('search') ?? undefined,
      acceptingStudents: searchParams.get('acceptingStudents') ?? undefined,
      grantStatus: searchParams.get('grantStatus') ?? undefined,
      hIndexMin: searchParams.get('hIndexMin') ? parseInt(searchParams.get('hIndexMin')!, 10) : undefined,
      sortBy: searchParams.get('sortBy') ?? undefined,
    };

    const [professors, total] = await Promise.all([
      listProfessors({ ...filters, limit, offset: (page - 1) * limit }),
      countProfessors(filters),
    ]);

    const response = Response.json({
      data: professors,
      total,
      page,
      limit,
      hasMore: page * limit < total,
    });
    response.headers.set('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
    return response;
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
