import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { applyApiMiddleware } from '@/lib/middleware/apiMiddleware';
import { OracleEBSIntegration } from '@/lib/services/oracleEBSIntegration';
import { PaymentMatchingService } from '@/lib/services/paymentMatching';
import { prisma } from '@/lib/prisma';

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
      username, 
      password, 
      csvExportUrl,
      paymentDate, // Optional payment date from user
      autoSave = true, // Default to true - automatically save and mark as paid
      autoMarkPaid = true // Default to true - automatically mark LRs as paid
    } = body;

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Oracle EBS username and password are required' },
        { status: 400 }
      );
    }

    // SAFETY: Rate limiting - prevent rapid syncs that could trigger Oracle EBS security
    // Check last successful sync time for this user
    const MIN_SYNC_INTERVAL = 15 * 60 * 1000; // 15 minutes minimum between syncs
    const lastSync = await prisma.paymentSyncLog.findFirst({
      where: {
        syncedBy: session.user.email,
        status: { in: ['success', 'partial'] },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (lastSync) {
      const timeSinceLastSync = Date.now() - lastSync.createdAt.getTime();
      if (timeSinceLastSync < MIN_SYNC_INTERVAL) {
        const minutesRemaining = Math.ceil((MIN_SYNC_INTERVAL - timeSinceLastSync) / 60000);
        return NextResponse.json(
          { 
            error: 'Rate limit exceeded',
            message: `Please wait ${minutesRemaining} minute(s) before syncing again. This prevents triggering Oracle EBS security measures.`,
            retryAfter: Math.ceil((MIN_SYNC_INTERVAL - timeSinceLastSync) / 1000),
          },
          { 
            status: 429,
            headers: {
              'Retry-After': Math.ceil((MIN_SYNC_INTERVAL - timeSinceLastSync) / 1000).toString(),
            },
          }
        );
      }
    }

    // Initialize Oracle EBS integration
    const oracleEBS = new OracleEBSIntegration({
      credentials: {
        username,
        password,
      },
      csvExportUrl,
    });

    let payments: any[] = [];
    let syncLogId: string | null = null;

    try {
      // Fetch payments from Oracle EBS
      payments = await oracleEBS.fetchPayments(csvExportUrl);

      if (payments.length === 0) {
        return NextResponse.json({
          success: false,
          error: 'No payments found in Oracle EBS',
          message: 'The system could not extract payment records from the Oracle EBS page. This could be due to: 1) Page structure changed, 2) No payment records available, 3) Login/permission issues. Check server logs for details.',
          stats: {
            total: 0,
            matched: 0,
            unmatched: 0,
          },
        });
      }

      // Match payments with LRs
      const matchingService = new PaymentMatchingService();
      const matchingResult = await matchingService.matchPayments(payments);

      // Create sync log
      const syncLog = await prisma.paymentSyncLog.create({
        data: {
          status: matchingResult.stats.unmatched === 0 ? 'success' : 'partial',
          totalRecords: matchingResult.stats.total,
          matchedRecords: matchingResult.stats.matched,
          unmatchedRecords: matchingResult.stats.unmatched,
          syncedBy: session.user.email,
        },
      });
      syncLogId = syncLog.id;

      // Auto-save matched payments if requested (default: true)
      let savedCount = 0;
      if (autoSave) {
        // Parse payment date if provided by user, otherwise use null (will use dates from CSV)
        let paymentDateOverride: Date | undefined = undefined;
        if (paymentDate) {
          try {
            paymentDateOverride = new Date(paymentDate);
            if (isNaN(paymentDateOverride.getTime())) {
              paymentDateOverride = undefined; // Invalid date, ignore
            }
          } catch {
            paymentDateOverride = undefined;
          }
        }

        savedCount = await matchingService.savePayments(
          matchingResult.matched,
          session.user.email,
          autoMarkPaid, // Automatically mark LRs as paid when payments are matched
          paymentDateOverride // Use user-provided date if available
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Payments synced successfully',
        syncLogId,
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
      // Create error sync log
      const errorMessage = error.message || 'Unknown error';
      
      if (syncLogId) {
        await prisma.paymentSyncLog.update({
          where: { id: syncLogId },
          data: {
            status: 'failed',
            errorMessage: errorMessage,
          },
        });
      } else {
        await prisma.paymentSyncLog.create({
          data: {
            status: 'failed',
            totalRecords: payments.length,
            matchedRecords: 0,
            unmatchedRecords: payments.length,
            errorMessage: errorMessage,
            syncedBy: session.user.email,
          },
        });
      }

      console.error('[Payment Sync] Error:', error);
      console.error('[Payment Sync] Error stack:', error.stack);
      
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to sync payments',
          message: errorMessage,
          details: error.stack || error.message,
          suggestion: errorMessage.includes('No payment records') 
            ? 'Try using the manual CSV upload option instead, or check if you have the correct permissions to view payment records in Oracle EBS.'
            : 'Check server logs for more details. You can also try the manual CSV upload option.'
        },
        { status: 500 }
      );
    } finally {
      await oracleEBS.close();
    }
  } catch (error: any) {
    console.error('[Payment Sync] Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: 'Unexpected error occurred' },
      { status: 500 }
    );
  }
}

