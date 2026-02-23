import { PaymentMatchingService } from './paymentMatching';
import { PaymentCSVRow } from './oracleEBSIntegration';
import { prisma } from '@/lib/prisma';
import { parse } from 'csv-parse/sync';

export interface CSVPaymentSyncConfig {
  csvUrl: string; // URL to the CSV file on Koel portal
  requiresAuth?: boolean; // Whether the URL requires authentication
  authCookie?: string; // Cookie for authentication if needed
  authHeader?: string; // Authorization header if needed
  autoMarkPaid?: boolean; // Automatically mark LRs as paid
  syncInterval?: number; // Sync interval in minutes (default: 60)
}

export interface CSVSyncResult {
  success: boolean;
  totalRecords: number;
  matchedRecords: number;
  unmatchedRecords: number;
  savedRecords: number;
  error?: string;
  unmatchedPayments?: PaymentCSVRow[];
}

/**
 * CSV Payment Sync Service
 * Fetches CSV from Koel portal URL and processes payments automatically
 */
export class CSVPaymentSyncService {
  /**
   * Fetch CSV content from URL
   */
  private async fetchCSVFromURL(config: CSVPaymentSyncConfig): Promise<string> {
    try {
      const headers: HeadersInit = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      };

      // Add authentication if required
      if (config.requiresAuth) {
        if (config.authCookie) {
          headers['Cookie'] = config.authCookie;
        }
        if (config.authHeader) {
          headers['Authorization'] = config.authHeader;
        }
      }

      console.log(`[CSV Sync] Fetching CSV from: ${config.csvUrl}`);
      
      const response = await fetch(config.csvUrl, {
        method: 'GET',
        headers,
        // Add timeout
        signal: AbortSignal.timeout(30000), // 30 seconds timeout
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}`);
      }

      const csvContent = await response.text();
      
      if (!csvContent || csvContent.trim().length === 0) {
        throw new Error('CSV file is empty');
      }

      console.log(`[CSV Sync] Fetched ${csvContent.length} bytes of CSV data`);
      return csvContent;
    } catch (error: any) {
      console.error('[CSV Sync] Error fetching CSV:', error.message);
      throw new Error(`Failed to fetch CSV from URL: ${error.message}`);
    }
  }

  /**
   * Parse CSV content into payment records
   */
  private parseCSVContent(csvContent: string): PaymentCSVRow[] {
    try {
      const records = parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        relax_column_count: true,
      }) as any[];

      if (records.length === 0) {
        console.warn('[CSV Sync] No records found in CSV');
        return [];
      }

      // Normalize column names (handle various formats)
      const payments: PaymentCSVRow[] = records.map((row: any) => {
        // Try different column name variations
        const invoiceNo = (
          row['Invoice No'] || 
          row['Invoice No.'] || 
          row['InvoiceNo'] || 
          row['invoiceNo'] || 
          row['INVOICE_NO'] || 
          row['Invoice Number'] ||
          row['Invoice'] ||
          ''
        ).toString().trim();

        const lrNo = (
          row['LR No'] || 
          row['LR No.'] || 
          row['LRNo'] || 
          row['lrNo'] || 
          row['LR_NO'] || 
          row['LR Number'] ||
          invoiceNo
        ).toString().trim();

        const paymentDate = (
          row['Payment Date'] || 
          row['PaymentDate'] || 
          row['paymentDate'] || 
          row['Date'] || 
          row['date'] || 
          row['Invoice Date'] || 
          row['InvoiceDate'] ||
          ''
        ).toString().trim();

        const paymentAmount = (
          row['Payment Amount'] || 
          row['PaymentAmount'] || 
          row['paymentAmount'] || 
          row['Amount'] || 
          row['amount'] ||
          ''
        ).toString().trim();

        const billNumber = (
          row['Bill No'] || 
          row['Bill No.'] || 
          row['BillNo'] || 
          row['billNumber'] || 
          row['Bill Number'] ||
          ''
        ).toString().trim();

        const referenceNumber = (
          row['Reference'] || 
          row['Reference Number'] || 
          row['referenceNumber'] || 
          row['Voucher No'] || 
          row['VoucherNo'] ||
          ''
        ).toString().trim();

        const bankName = (
          row['Bank'] || 
          row['Bank Name'] || 
          row['bankName'] ||
          ''
        ).toString().trim();

        const transactionId = (
          row['Transaction ID'] || 
          row['TransactionId'] || 
          row['transactionId'] ||
          ''
        ).toString().trim();

        return {
          invoiceNo: invoiceNo || lrNo,
          lrNo: lrNo || invoiceNo,
          paymentDate,
          paymentAmount,
          billNumber,
          referenceNumber,
          bankName,
          transactionId,
        } as PaymentCSVRow;
      }).filter((p: PaymentCSVRow) => p.invoiceNo || p.lrNo); // Only include rows with invoice/LR number

      console.log(`[CSV Sync] Parsed ${payments.length} payment records from CSV`);
      return payments;
    } catch (error: any) {
      console.error('[CSV Sync] Error parsing CSV:', error.message);
      throw new Error(`Failed to parse CSV: ${error.message}`);
    }
  }

  /**
   * Sync payments from CSV URL
   */
  async syncPayments(config: CSVPaymentSyncConfig, syncedBy: string = 'system'): Promise<CSVSyncResult> {
    let syncLogId: string | null = null;

    try {
      // Fetch CSV from URL
      const csvContent = await this.fetchCSVFromURL(config);
      
      // Parse CSV
      const payments = this.parseCSVContent(csvContent);

      if (payments.length === 0) {
        return {
          success: true,
          totalRecords: 0,
          matchedRecords: 0,
          unmatchedRecords: 0,
          savedRecords: 0,
        };
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
          syncedBy,
          csvFilePath: config.csvUrl, // Store URL instead of file path
        },
      });
      syncLogId = syncLog.id;

      // Save matched payments
      let savedCount = 0;
      if (config.autoMarkPaid !== false) { // Default to true
        savedCount = await matchingService.savePayments(
          matchingResult.matched,
          syncedBy,
          true, // autoMarkPaid
          undefined // Use payment dates from CSV
        );
      }

      return {
        success: true,
        totalRecords: matchingResult.stats.total,
        matchedRecords: matchingResult.stats.matched,
        unmatchedRecords: matchingResult.stats.unmatched,
        savedRecords: savedCount,
        unmatchedPayments: matchingResult.unmatched,
      };
    } catch (error: any) {
      console.error('[CSV Sync] Error syncing payments:', error);

      // Create error sync log
      if (syncLogId) {
        await prisma.paymentSyncLog.update({
          where: { id: syncLogId },
          data: {
            status: 'failed',
            errorMessage: error.message,
          },
        });
      } else {
        await prisma.paymentSyncLog.create({
          data: {
            status: 'failed',
            totalRecords: 0,
            matchedRecords: 0,
            unmatchedRecords: 0,
            errorMessage: error.message,
            syncedBy,
            csvFilePath: config.csvUrl,
          },
        });
      }

      return {
        success: false,
        totalRecords: 0,
        matchedRecords: 0,
        unmatchedRecords: 0,
        savedRecords: 0,
        error: error.message,
      };
    }
  }

  /**
   * Test CSV URL connection
   */
  async testCSVURL(config: CSVPaymentSyncConfig): Promise<{ success: boolean; recordCount?: number; error?: string }> {
    try {
      const csvContent = await this.fetchCSVFromURL(config);
      const payments = this.parseCSVContent(csvContent);
      
      return {
        success: true,
        recordCount: payments.length,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

