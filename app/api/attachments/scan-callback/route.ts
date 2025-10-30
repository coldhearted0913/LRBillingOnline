import { NextRequest, NextResponse } from 'next/server';
import { getLRByNumber, updateLR } from '@/lib/database';

// Lambda (ClamAV) webhook to update scan status for a given object key
export async function POST(request: NextRequest) {
  try {
    const secret = process.env.SCAN_WEBHOOK_SECRET || '';
    if (!secret) return NextResponse.json({ success: false, error: 'Secret not configured' }, { status: 500 });

    // Simple shared secret header check
    const provided = request.headers.get('x-webhook-secret') || '';
    if (provided !== secret) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { lrNo, key, infected } = body as { lrNo: string; key: string; infected: boolean };
    if (!lrNo || !key) return NextResponse.json({ success: false, error: 'Missing lrNo or key' }, { status: 400 });

    const lr = await getLRByNumber(lrNo);
    if (!lr) return NextResponse.json({ success: false, error: 'LR not found' }, { status: 404 });

    const updated = (lr.attachments || []).map((att: any) => {
      // match by url ending with key or by key in url
      if (typeof att?.url === 'string' && att.url.includes(key)) {
        return { ...att, scanned: true, infected: !!infected };
      }
      return att;
    });

    await updateLR(lrNo, { attachments: updated } as any);
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message || 'Failed' }, { status: 500 });
  }
}


