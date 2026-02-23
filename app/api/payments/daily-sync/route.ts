import { NextRequest, NextResponse } from 'next/server';
import { DailyPaymentSyncService } from '@/lib/services/dailyPaymentSync';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/payments/daily-sync
 * Automated daily payment sync endpoint
 * Can be called manually or by scheduled job
 */
export async function POST(request: NextRequest) {
  try {
    // Get credentials from environment variables
    const username = process.env.ORACLE_EBS_USERNAME;
    const password = process.env.ORACLE_EBS_PASSWORD;
    const paymentListingUrl = process.env.ORACLE_EBS_PAYMENT_LISTING_URL;

    if (!username || !password) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Oracle EBS credentials not configured',
          message: 'Please set ORACLE_EBS_USERNAME and ORACLE_EBS_PASSWORD environment variables'
        },
        { status: 400 }
      );
    }

    console.log('[Daily Sync] Starting automated payment sync...');
    const syncService = new DailyPaymentSyncService();
    
      const result = await syncService.syncTodaysPayments(
        username,
        password,
        paymentListingUrl
      );

      // For cron jobs, use current date for payment status
      const currentDate = new Date();

    // Log sync result
    await prisma.paymentSyncLog.create({
      data: {
        status: result.success ? (result.unmatched === 0 ? 'success' : 'partial') : 'failed',
        totalRecords: result.matched + result.unmatched,
        matchedRecords: result.matched,
        unmatchedRecords: result.unmatched,
        errorMessage: result.error,
        syncedBy: 'system',
      },
    });

    return NextResponse.json({
      success: result.success,
      message: result.success
        ? `Synced ${result.matched} payments, ${result.unmatched} unmatched`
        : `Sync failed: ${result.error}`,
      stats: {
        matched: result.matched,
        unmatched: result.unmatched,
      },
    });
  } catch (error: any) {
    console.error('[Daily Sync] Error:', error);
    
    // Log error
    await prisma.paymentSyncLog.create({
      data: {
        status: 'failed',
        totalRecords: 0,
        matchedRecords: 0,
        unmatchedRecords: 0,
        errorMessage: error.message,
        syncedBy: 'system',
      },
    }).catch(() => {}); // Ignore logging errors

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to sync payments',
        message: error.message,
      },
      { status: 500 }
    );
  }
}

