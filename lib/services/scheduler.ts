import cron, { ScheduledTask } from 'node-cron';
import { DailyPaymentSyncService } from './dailyPaymentSync';
import { prisma } from '@/lib/prisma';

let dailySyncJob: ScheduledTask | null = null;

/**
 * Initialize scheduled jobs
 * Runs daily payment sync at 6 PM (18:00)
 */
export function initializeScheduler() {
  // Only run in server environment
  if (typeof window !== 'undefined') {
    return;
  }

  // Check if scheduler is already initialized
  if (dailySyncJob) {
    console.log('[Scheduler] Already initialized');
    return;
  }

  const username = process.env.ORACLE_EBS_USERNAME;
  const password = process.env.ORACLE_EBS_PASSWORD;

  if (!username || !password) {
    console.warn('[Scheduler] Oracle EBS credentials not configured. Daily sync will not run.');
    return;
  }

  // Schedule daily sync at 6 PM (18:00) - cron format: minute hour day month dayOfWeek
  // '0 18 * * *' = Every day at 18:00 (6 PM)
  dailySyncJob = cron.schedule('0 18 * * *', async () => {
    console.log('[Scheduler] Starting scheduled daily payment sync at 6 PM...');
    
    try {
      const syncService = new DailyPaymentSyncService();
      const paymentListingUrl = process.env.ORACLE_EBS_PAYMENT_LISTING_URL;
      
      const result = await syncService.syncTodaysPayments(
        username,
        password,
        paymentListingUrl
      );

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

      console.log(`[Scheduler] Daily sync completed: ${result.matched} matched, ${result.unmatched} unmatched`);
    } catch (error: any) {
      console.error('[Scheduler] Daily sync error:', error);
      
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
      }).catch(() => {});
    }
  });

  console.log('[Scheduler] Daily payment sync scheduled for 6 PM every day');
}

/**
 * Stop scheduled jobs
 */
export function stopScheduler() {
  if (dailySyncJob) {
    dailySyncJob.stop();
    dailySyncJob = null;
    console.log('[Scheduler] Stopped');
  }
}

/**
 * Get scheduler status
 */
export function getSchedulerStatus() {
  return {
    isRunning: dailySyncJob !== null,
    nextRun: dailySyncJob ? '6:00 PM daily' : 'Not scheduled',
  };
}

