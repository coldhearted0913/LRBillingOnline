import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getAllLRs } from '@/lib/database';
import { generateProvisionSheet } from '@/lib/excelGenerator';
import { computeProvisionCalculation } from '@/lib/utils/provisionCalculator';

export async function POST(request: NextRequest) {
  try {
    // Provision exposes financial totals — restrict to CEO and MANAGER.
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as any)?.role;
    if (!session?.user || (userRole !== 'CEO' && userRole !== 'MANAGER')) {
      return NextResponse.json(
        { success: false, error: 'Forbidden. Only CEO and MANAGER can generate provision.' },
        { status: 403 }
      );
    }

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
