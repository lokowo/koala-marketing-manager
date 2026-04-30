import { getServerUserWithRole } from '../../../lib/auth';

export async function GET() {
  try {
    const result = await getServerUserWithRole();
    if (!result) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    return Response.json({ role: result.role, userId: result.user.id });
  } catch (error) {
    console.error('[admin/me]', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
