import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

// Constant-time string comparison to avoid leaking password length/content
// through response timing.
function timingSafeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  // crypto.timingSafeEqual requires equal-length buffers; hash first so we
  // always compare fixed-length digests regardless of input length.
  const hashA = crypto.createHash('sha256').update(bufA).digest();
  const hashB = crypto.createHash('sha256').update(bufB).digest();
  return crypto.timingSafeEqual(hashA, hashB);
}

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json().catch(() => ({ password: '' }));
    const expected = process.env.STATS_PASSWORD || '';

    if (!expected) {
      return NextResponse.json({ success: false, error: 'Stats password not configured' }, { status: 500 });
    }

    const ok = typeof password === 'string' && password.length > 0 && timingSafeEqual(password, expected);
    if (!ok) {
      return NextResponse.json({ success: false, error: 'Invalid password' }, { status: 401 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to verify password' }, { status: 500 });
  }
}


