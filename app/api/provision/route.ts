import { NextRequest, NextResponse } from 'next/server';
import { getAllLRs } from '@/lib/database';
import { generateProvisionSheet } from '@/lib/excelGenerator';
import { computeProvisionCalculation } from '@/lib/utils/provisionCalculator';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const {
      submissionDate,
      month,
      year,
      includeLdkPickups = false,
      previewOnly = false,
    } = body || {};

    const effectiveDate = submissionDate || new Date().toISOString().slice(0, 10);
    const lrs = await getAllLRs();

    const calculation = computeProvisionCalculation(lrs, {
      month,
      year,
      includeLdkPickups: !!includeLdkPickups,
    });

    if (previewOnly) {
      return NextResponse.json({ success: true, calculation });
    }

    const filePath = await generateProvisionSheet(lrs, effectiveDate, {
      month,
      year,
      includeLdkPickups: !!includeLdkPickups,
    });

    const path = require('path');
    const relativePath = filePath.split(path.sep + 'invoices' + path.sep)[1] || filePath;

    return NextResponse.json({
      success: true,
      filePath: relativePath,
      calculation,
    });
  } catch (error) {
    console.error('[PROVISION] Failed:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate provision sheet' },
      { status: 500 }
    );
  }
}
