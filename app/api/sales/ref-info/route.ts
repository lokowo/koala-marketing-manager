import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const refCookie = req.cookies.get('koala_ref')?.value;
  if (!refCookie) return NextResponse.json({ ref: null, ch: null });

  try {
    const data = JSON.parse(refCookie);
    return NextResponse.json({ ref: data.ref || null, ch: data.ch || null });
  } catch {
    return NextResponse.json({ ref: null, ch: null });
  }
}
