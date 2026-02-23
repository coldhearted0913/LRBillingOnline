import { NextRequest, NextResponse } from 'next/server';
import { CSVPaymentSyncService } from '@/lib/services/csvPaymentSync';

/**
 * POST /api/payments/cron-sync
 * Automated payment sync endpoint for cron jobs
 * This endpoint can be called by external cron services (e.g., cron-job.org, EasyCron)
 * 
 * Environment variables required:
 * - PAYMENT_SYNC_CSV_URL: The CSV URL from Koel portal
 * - PAYMENT_SYNC_REQUIRES_AUTH: Whether authentication is required (true/false)
 * - PAYMENT_SYNC_AUTH_COOKIE: Cookie for authentication (optional)
 * - PAYMENT_SYNC_AUTH_HEADER: Authorization header (optional)
 */
export async function POST(request: NextRequest) {
  try {
    // Optional: Add API key authentication for cron jobs
    const authHeader = request.headers.get('authorization');
    const apiKey = process.env.PAYMENT_SYNC_API_KEY;
    
    if (apiKey && authHeader !== `Bearer ${apiKey}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get configuration from environment variables
    const csvUrl = process.env.PAYMENT_SYNC_CSV_URL;
    if (!csvUrl) {
      return NextResponse.json(
        { error: 'PAYMENT_SYNC_CSV_URL environment variable is not set' },
        { status: 500 }
      );
    }

    const requiresAuth = process.env.PAYMENT_SYNC_REQUIRES_AUTH === 'true';
    const authCookie = process.env.PAYMENT_SYNC_AUTH_COOKIE;
    const authHeaderEnv = process.env.PAYMENT_SYNC_AUTH_HEADER;
    const autoMarkPaid = process.env.PAYMENT_SYNC_AUTO_MARK_PAID !== 'false';

    // Sync payments
    const syncService = new CSVPaymentSyncService();
    const result = await syncService.syncPayments(
      {
        csvUrl,
        requiresAuth,
        authCookie,
        authHeader: authHeaderEnv,
        autoMarkPaid,
      },
      'cron-job'
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
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[Cron Sync] Error:', error);
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
 * GET /api/payments/cron-sync
 * Health check endpoint for cron jobs
 */
export async function GET() {
  const csvUrl = process.env.PAYMENT_SYNC_CSV_URL;
  
  return NextResponse.json({
    status: 'ok',
    csvUrlConfigured: !!csvUrl,
    timestamp: new Date().toISOString(),
  });
}

