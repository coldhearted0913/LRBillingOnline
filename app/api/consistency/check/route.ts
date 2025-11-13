import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getAllLRs } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions as any);
    const s: any = session;
    if (!s || s?.user?.role !== 'CEO') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const lrs = await getAllLRs();
    const issues: Array<{ lrNo: string; field: string; message: string }> = [];

    const dateRegex = /^\d{2}-\d{2}-\d{4}$/; // DD-MM-YYYY
    for (const lr of lrs) {
      if (!lr['LR No']) issues.push({ lrNo: '(missing)', field: 'LR No', message: 'Missing LR No' });
      if (!lr['LR Date'] || !dateRegex.test(lr['LR Date'])) issues.push({ lrNo: lr['LR No'] || '(missing)', field: 'LR Date', message: 'Invalid or missing date' });
      if (!lr['Vehicle Type']) issues.push({ lrNo: lr['LR No'] || '(missing)', field: 'Vehicle Type', message: 'Missing vehicle type' });
    }

    return NextResponse.json({ success: true, total: lrs.length, issuesCount: issues.length, issues });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message || 'Failed' }, { status: 500 });
  }
}


