import type { NextRequest } from 'next/server';
import { findOrCreateProfessor } from '../../../lib/services/professorAutoAdd';

export async function GET(req: NextRequest) {
  try {
    const name = req.nextUrl.searchParams.get('name');
    const university = req.nextUrl.searchParams.get('university') || undefined;
    const skipDb = req.nextUrl.searchParams.get('skipDb') === 'true';

    if (!name || name.trim().length < 2) {
      return Response.json({ error: 'Missing or too short name param' }, { status: 400 });
    }

    const result = await findOrCreateProfessor(name.trim(), university, { skipDb });

    return Response.json({
      source: result.source,
      results: result.professors,
      created: result.created,
      total: result.professors.length,
    });
  } catch (error) {
    console.error('[professors/auto-search GET]', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
