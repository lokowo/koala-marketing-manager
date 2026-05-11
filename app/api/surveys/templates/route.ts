import { NextRequest } from 'next/server';
import { getServerUser, getUserRole } from '../../../lib/auth';
import { SURVEY_TEMPLATES } from '../../../lib/services/surveyTemplates';

export async function GET(req: NextRequest) {
  try {
    const user = await getServerUser();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const role = await getUserRole(user.id);
    if (!role || !['super_admin', 'admin'].includes(role)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    void req;
    return Response.json({ templates: SURVEY_TEMPLATES });
  } catch (error) {
    console.error('[templates GET]', error);
    return Response.json({ error: 'Internal error' }, { status: 500 });
  }
}
