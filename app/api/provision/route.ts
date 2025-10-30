import { NextRequest, NextResponse } from 'next/server';
import { getAllLRs } from '@/lib/database';
import { generateProvisionSheet } from '@/lib/excelGenerator';

export async function POST(request: NextRequest) {
  try {
    const { submissionDate } = await request.json().catch(() => ({ submissionDate: undefined }));
    const effectiveDate = submissionDate || new Date().toISOString().slice(0, 10);

    const lrs = await getAllLRs();

    const filePath = await generateProvisionSheet(lrs, effectiveDate);

    const path = require('path');
    const relativePath = filePath.split(path.sep + 'invoices' + path.sep)[1] || filePath;

    return NextResponse.json({ success: true, filePath: relativePath });
  } catch (error) {
    console.error('[PROVISION] Failed:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate provision sheet' },
      { status: 500 }
    );
  }
}


