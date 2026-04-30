import type { NextRequest } from 'next/server';
import { listGrants, createGrant } from '../../lib/services/grantService';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const grants = await listGrants({
      fundingBody: searchParams.get('fundingBody') ?? undefined,
      university: searchParams.get('university') ?? undefined,
      verificationStatus: searchParams.get('verificationStatus') ?? undefined,
      phdRelevance: searchParams.get('phdRelevance') ?? undefined,
    });
    return Response.json({ data: grants, total: grants.length });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const grant = await createGrant(body);
    return Response.json({ data: grant }, { status: 201 });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}
