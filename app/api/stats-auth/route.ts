import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json().catch(() => ({ password: '' }));
    const expected = process.env.STATS_PASSWORD || '';

    if (!expected) {
      return NextResponse.json({ success: false, error: 'Stats password not configured' }, { status: 500 });
    }

    const ok = typeof password === 'string' && password.length > 0 && password === expected;
    if (!ok) {
      return NextResponse.json({ success: false, error: 'Invalid password' }, { status: 401 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to verify password' }, { status: 500 });
  }
}


