import type { NextRequest } from 'next/server';
import { listProfessors, createProfessor } from '../../lib/services/professorService';
import { getServerUser } from '../../lib/auth';
import { logAdminAction } from '../../lib/worklog';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '20', 10), 200);
    const page = Math.max(parseInt(searchParams.get('page') ?? '1', 10), 1);

    const filters = {
      category: searchParams.get('category') ?? undefined,
      search: searchParams.get('search') ?? undefined,
      university: searchParams.get('university') ?? undefined,
      acceptingStudents: searchParams.get('acceptingStudents') ?? undefined,
      hIndexMin: searchParams.get('hIndexMin') ? parseInt(searchParams.get('hIndexMin')!, 10) : undefined,
      sortBy: searchParams.get('sortBy') ?? undefined,
    };

    const result = await listProfessors({ ...filters, limit, offset: (page - 1) * limit });

    const response = Response.json({
      data: result.data,
      total: result.total,
      page,
      limit,
      hasMore: page * limit < result.total,
    });
    response.headers.set('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
    return response;
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  let body: Record<string, unknown> = {};
  try {
    const user = await getServerUser();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    body = await request.json();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const professor = await createProfessor(body as any);

    await logAdminAction(user.id, 'professor_create', 'professor', professor?.id, { name: body.name || body.name_en });

    return Response.json({ data: professor }, { status: 201 });
  } catch (e) {
    console.error('[professors POST]', (e as Error).message, body);
    return Response.json({ error: (e as Error).message, details: JSON.stringify(body).slice(0, 200) }, { status: 500 });
  }
}
