import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { applyApiMiddleware } from '@/lib/middleware/apiMiddleware';
import { CSVPaymentSyncService } from '@/lib/services/csvPaymentSync';

/**
 * POST /api/payments/csv-sync
 * Automatically sync payments from CSV URL (Koel portal)
 */
export async function POST(request: NextRequest) {
  const middlewareResponse = await applyApiMiddleware(request);
  if (middlewareResponse) return middlewareResponse;

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only CEO and MANAGER can sync payments
    const userRole = (session.user as any)?.role;
    if (userRole !== 'CEO' && userRole !== 'MANAGER') {
      return NextResponse.json(
        { error: 'Forbidden. Only CEO and MANAGER can sync payments.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      csvUrl,
      requiresAuth = false,
      authCookie,
      authHeader,
      autoMarkPaid = true,
    } = body;

    if (!csvUrl) {
      return NextResponse.json(
        { error: 'CSV URL is required' },
        { status: 400 }
      );
    }

    // Validate URL format
    try {
      new URL(csvUrl);
    } catch {
      return NextResponse.json(
        { error: 'Invalid URL format' },
        { status: 400 }
      );
    }

    // Sync payments
    const syncService = new CSVPaymentSyncService();
    const result = await syncService.syncPayments(
      {
        csvUrl,
        requiresAuth,
        authCookie,
        authHeader,
        autoMarkPaid,
      },
      session.user.email
    );

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Failed to sync payments',
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Payments synced successfully',
      stats: {
        total: result.totalRecords,
        matched: result.matchedRecords,
        unmatched: result.unmatchedRecords,
        saved: result.savedRecords,
      },
      unmatched: result.unmatchedPayments?.map(p => ({
        invoiceNo: p.invoiceNo,
        lrNo: p.lrNo,
        amount: p.paymentAmount,
        date: p.paymentDate,
      })),
    });
  } catch (error: any) {
    console.error('[CSV Sync API] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to sync payments',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/payments/csv-sync/test
 * Test CSV URL connection
 */
export async function GET(request: NextRequest) {
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
        { error: 'Forbidden. Only CEO and MANAGER can test CSV URLs.' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const csvUrl = searchParams.get('csvUrl');
    const requiresAuth = searchParams.get('requiresAuth') === 'true';
    const authCookie = searchParams.get('authCookie') || undefined;
    const authHeader = searchParams.get('authHeader') || undefined;

    if (!csvUrl) {
      return NextResponse.json(
        { error: 'CSV URL is required' },
        { status: 400 }
      );
    }

    // Test CSV URL
    const syncService = new CSVPaymentSyncService();
    const testResult = await syncService.testCSVURL({
      csvUrl,
      requiresAuth,
      authCookie,
      authHeader,
    });

    return NextResponse.json({
      success: testResult.success,
      recordCount: testResult.recordCount,
      error: testResult.error,
    });
  } catch (error: any) {
    console.error('[CSV Sync Test] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to test CSV URL',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

