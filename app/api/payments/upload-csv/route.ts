import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { applyApiMiddleware } from '@/lib/middleware/apiMiddleware';
import { PaymentMatchingService } from '@/lib/services/paymentMatching';
import { PaymentCSVRow } from '@/lib/services/oracleEBSIntegration';
import { parse } from 'csv-parse/sync';

/**
 * POST /api/payments/upload-csv
 * Manually upload CSV file for payment processing
 * This is a fallback if automated Oracle EBS download doesn't work
 */
export async function POST(request: NextRequest) {
  const middlewareResponse = await applyApiMiddleware(request);
  if (middlewareResponse) return middlewareResponse;

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = (session.user as any)?.role;
    if (userRole !== 'CEO' && userRole !== 'MANAGER') {
      return NextResponse.json(
        { error: 'Forbidden. Only CEO and MANAGER can upload payments.' },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const autoSave = formData.get('autoSave') === 'true';

    if (!file) {
      return NextResponse.json(
        { error: 'CSV file is required' },
        { status: 400 }
      );
    }

    // Read and parse CSV file
    const fileContent = await file.text();
    const payments: PaymentCSVRow[] = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true,
    }) as PaymentCSVRow[];

    if (payments.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No payment records found in CSV file',
      }, { status: 400 });
    }

    // Match payments with LRs
    const matchingService = new PaymentMatchingService();
    const matchingResult = await matchingService.matchPayments(payments);

    // Create sync log
    const { prisma } = await import('@/lib/prisma');
    const syncLog = await prisma.paymentSyncLog.create({
      data: {
        status: matchingResult.stats.unmatched === 0 ? 'success' : 'partial',
        totalRecords: matchingResult.stats.total,
        matchedRecords: matchingResult.stats.matched,
        unmatchedRecords: matchingResult.stats.unmatched,
        syncedBy: session.user.email,
        csvFilePath: file.name,
      },
    });

    // Auto-save matched payments if requested
    let savedCount = 0;
    if (autoSave) {
      savedCount = await matchingService.savePayments(
        matchingResult.matched,
        session.user.email,
        true // autoMarkPaid - automatically mark LRs as paid
      );
    }

    return NextResponse.json({
      success: true,
      message: 'CSV processed successfully',
      syncLogId: syncLog.id,
      stats: {
        ...matchingResult.stats,
        saved: savedCount,
      },
      matched: matchingResult.matched.map(m => ({
        lrNo: m.lrNo,
        amount: m.payment.paymentAmount,
        date: m.payment.paymentDate,
        matchType: m.matchType,
        matchConfidence: m.matchConfidence,
        matchReason: m.matchReason,
      })),
      unmatched: matchingResult.unmatched.map(p => ({
        billNumber: p.billNumber,
        invoiceNo: p.invoiceNo,
        lrNo: p.lrNo,
        amount: p.paymentAmount,
        date: p.paymentDate,
      })),
    });
  } catch (error: any) {
    console.error('[Upload CSV] Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to process CSV file',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

