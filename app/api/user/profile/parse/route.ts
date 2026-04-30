import { getServerUser } from '../../../../lib/auth';
import { parseStudentCV } from '../../../../lib/server/profile-parser';

export async function POST(req: Request) {
  try {
    const user = await getServerUser();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return Response.json({ error: 'No file provided' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const profile = await parseStudentCV(buffer);

    return Response.json({ profile, fileName: file.name, fileSize: file.size });
  } catch (error) {
    console.error('[user/profile/parse]', error);
    return Response.json({ error: 'Failed to parse file' }, { status: 500 });
  }
}
