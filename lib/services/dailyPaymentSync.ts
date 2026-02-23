import { OracleEBSIntegration } from './oracleEBSIntegration';
import { PaymentMatchingService } from './paymentMatching';
import { prisma } from '@/lib/prisma';
import ExcelJS from 'exceljs';
import * as fs from 'fs';
import * as path from 'path';
import { format, parse } from 'date-fns';

export interface ExcelPaymentRecord {
  invoiceNo: string;
  paymentDate: string;
  paymentAmount?: number;
  voucherNo?: string;
}

/**
 * Daily Payment Sync Service
 * Automatically syncs payments from Oracle EBS for today's date
 */
export class DailyPaymentSyncService {
  /**
   * Format date to Oracle EBS format (12-Dec-2025)
   */
  private formatOracleDate(date: Date): string {
    return format(date, 'dd-MMM-yyyy');
  }

  /**
   * Parse Oracle EBS date format (12-Dec-2025) to Date
   */
  private parseOracleDate(dateStr: string): Date | null {
    try {
      // Try parsing formats: "12-Dec-2025", "12-Dec-25", etc.
      const formats = ['dd-MMM-yyyy', 'dd-MMM-yy', 'd-MMM-yyyy', 'd-MMM-yy'];
      for (const fmt of formats) {
        try {
          return parse(dateStr.trim(), fmt, new Date());
        } catch {
          continue;
        }
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Extract payments from Oracle EBS for today's date
   * Navigates to payment listing, filters by today, clicks vouchers, exports Excel
   */
  async syncTodaysPayments(
    username: string,
    password: string,
    paymentListingUrl?: string
  ): Promise<{ success: boolean; matched: number; unmatched: number; error?: string }> {
    const oracleEBS = new OracleEBSIntegration({
      credentials: { username, password },
      paymentListingUrl,
      minDelayBetweenActions: 3000,
      minDelayBetweenVouchers: 8000,
      maxVouchersPerSync: 50, // Allow more for daily sync
      enableHumanLikeBehavior: true,
    });

    const browser = await oracleEBS.initBrowser();
    const page = await browser.newPage();

    try {
      // Hide automation indicators
      await page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => false });
        Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
        Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
      });

      await page.setViewport({ width: 1920, height: 1080 });

      // Login
      await oracleEBS.login(page);

      // Navigate to payment listing page
      const listingUrl = paymentListingUrl || 'https://knode1.koel.co.in:8443/OA_HTML/OA.jsp?page=/xx_supp/oracle/apps/custom/paymentlisting/webui/PaymentListingSearchPG&retainAM=Y&addBreadCrumb=N';
      console.log('[Daily Sync] Navigating to payment listing page...');
      await page.goto(listingUrl, {
        waitUntil: 'networkidle2',
        timeout: 30000,
      });

      await this.humanDelay(3000);

      // Wait for table to load
      await page.waitForSelector('table', { timeout: 15000 });
      await this.humanDelay(5000);

      // Get today's date in Oracle format
      const today = new Date();
      const todayFormatted = this.formatOracleDate(today);
      console.log(`[Daily Sync] Looking for payments dated: ${todayFormatted}`);

      // Extract payment records with today's date
      const todaysPayments = await page.evaluate((targetDate: string) => {
        const records: Array<{ voucherNo: string; paymentDate: string; rowIndex: number }> = [];
        const tables = Array.from(document.querySelectorAll('table'));

        // Find main payment table
        let mainTable: HTMLTableElement | null = null;
        for (const table of tables) {
          const headers = Array.from(table.querySelectorAll('th, thead td, tr:first-child td'));
          const headerText = headers.map(h => h.textContent?.toLowerCase() || '').join(' ');
          if (headerText.includes('payment') && (headerText.includes('voucher') || headerText.includes('date'))) {
            mainTable = table;
            break;
          }
        }

        if (!mainTable) {
          // Fallback to largest table
          const tablesWithData = tables.filter(t => t.querySelectorAll('tbody tr, tr:not(:first-child)').length > 0);
          if (tablesWithData.length > 0) {
            mainTable = tablesWithData.reduce((largest, current) => {
              const largestRows = largest.querySelectorAll('tbody tr, tr:not(:first-child)').length;
              const currentRows = current.querySelectorAll('tbody tr, tr:not(:first-child)').length;
              return currentRows > largestRows ? current : largest;
            }, tablesWithData[0]) as HTMLTableElement;
          }
        }

        if (!mainTable) return records;

        // Find column indices
        const headerRow = mainTable.querySelector('thead tr, tr:first-child');
        if (!headerRow) return records;

        const headers = Array.from(headerRow.querySelectorAll('th, td'));
        let dateColumnIndex = -1;
        let voucherColumnIndex = -1;

        headers.forEach((header, index) => {
          const text = (header.textContent || '').toLowerCase().trim();
          if (text.includes('payment date') || text.includes('date')) {
            dateColumnIndex = index;
          }
          if (text.includes('payment voucher') || text.includes('voucher no')) {
            voucherColumnIndex = index;
          }
        });

        if (dateColumnIndex === -1 || voucherColumnIndex === -1) return records;

        // Extract rows with today's date
        const rows = Array.from(mainTable.querySelectorAll('tbody tr, tr:not(:first-child)'));
        rows.forEach((row, rowIndex) => {
          const cells = Array.from(row.querySelectorAll('td'));
          if (cells.length < Math.max(dateColumnIndex, voucherColumnIndex) + 1) return;

          const dateText = cells[dateColumnIndex]?.textContent?.trim() || '';
          const voucherText = cells[voucherColumnIndex]?.textContent?.trim() || '';

          // Check if date matches today
          if (dateText.includes(targetDate) || dateText === targetDate) {
            records.push({
              voucherNo: voucherText,
              paymentDate: dateText,
              rowIndex: rowIndex + 1, // 1-based index
            });
          }
        });

        return records;
      }, todayFormatted);

      console.log(`[Daily Sync] Found ${todaysPayments.length} payments for today`);

      if (todaysPayments.length === 0) {
        return { success: true, matched: 0, unmatched: 0 };
      }

      // Process each voucher: click link, export Excel, parse
      const allExcelRecords: ExcelPaymentRecord[] = [];

      for (const payment of todaysPayments) {
        try {
          // Find and click voucher link
          const voucherLink = await page.evaluate((voucherNo: string) => {
            const links = Array.from(document.querySelectorAll('a'));
            const link = links.find(l =>
              l.textContent?.includes(voucherNo) || l.getAttribute('href')?.includes(voucherNo)
            );
            return link ? link.getAttribute('href') : null;
          }, payment.voucherNo);

          if (!voucherLink) {
            console.warn(`[Daily Sync] Could not find link for voucher ${payment.voucherNo}`);
            continue;
          }

          // Navigate to voucher detail page
          console.log(`[Daily Sync] Clicking voucher ${payment.voucherNo}...`);
          await page.goto(voucherLink, { waitUntil: 'networkidle2', timeout: 15000 });
          await this.humanDelay(5000);

          // Find and click Export button
          const exportClicked = await page.evaluate(() => {
            // Look for export button/link
            const buttons = Array.from(document.querySelectorAll('button, a, input[type="button"]'));
            const exportButton = buttons.find(btn => {
              const text = (btn.textContent || btn.getAttribute('value') || '').toLowerCase();
              return text.includes('export') || text.includes('excel') || text.includes('download');
            });

            if (exportButton) {
              if (exportButton instanceof HTMLAnchorElement && exportButton.href) {
                return { type: 'link', href: exportButton.href };
              } else {
                exportButton.click();
                return { type: 'clicked' };
              }
            }
            return null;
          });

          if (!exportClicked) {
            console.warn(`[Daily Sync] Could not find export button for voucher ${payment.voucherNo}`);
            await page.goBack({ waitUntil: 'networkidle2' });
            await this.humanDelay(3000);
            continue;
          }

          // Wait for download
          await this.humanDelay(5000);

          // Check download directory for Excel file
          const downloadDir = path.join(process.cwd(), 'temp');
          if (!fs.existsSync(downloadDir)) {
            fs.mkdirSync(downloadDir, { recursive: true });
          }

          const files = fs.readdirSync(downloadDir);
          const excelFile = files.find(f => f.endsWith('.xlsx') || f.endsWith('.xls'));

          if (excelFile) {
            const excelPath = path.join(downloadDir, excelFile);
            const records = await this.parseExcelFile(excelPath, payment.paymentDate);
            allExcelRecords.push(...records);

            // Clean up file
            fs.unlinkSync(excelPath);
          }

          // Go back to listing
          await page.goBack({ waitUntil: 'networkidle2' });
          await this.humanDelay(5000);
        } catch (error: any) {
          console.error(`[Daily Sync] Error processing voucher ${payment.voucherNo}:`, error.message);
          // Try to go back
          try {
            await page.goBack({ waitUntil: 'networkidle2' });
            await this.humanDelay(3000);
          } catch {
            // If goBack fails, navigate to listing page
            await page.goto(listingUrl, { waitUntil: 'networkidle2' });
            await this.humanDelay(3000);
          }
        }
      }

      console.log(`[Daily Sync] Extracted ${allExcelRecords.length} records from Excel files`);

      // Match with LRs and save
      const matchingService = new PaymentMatchingService();
      const csvRows = allExcelRecords.map(record => ({
        invoiceNo: record.invoiceNo,
        lrNo: record.invoiceNo, // Invoice No contains LR number
        paymentAmount: record.paymentAmount?.toString() || '',
        paymentDate: record.paymentDate,
        paymentVoucherNo: record.voucherNo,
      }));

      const matchingResult = await matchingService.matchPayments(csvRows as any);
      // For cron jobs, use current date for payment status
      const currentDate = new Date();
      const savedCount = await matchingService.savePayments(
        matchingResult.matched,
        'system', // System user for automated sync
        true, // Auto-mark as paid
        currentDate // Use current date for cron job
      );

      return {
        success: true,
        matched: matchingResult.stats.matched,
        unmatched: matchingResult.stats.unmatched,
      };
    } catch (error: any) {
      console.error('[Daily Sync] Error:', error);
      return {
        success: false,
        matched: 0,
        unmatched: 0,
        error: error.message,
      };
    } finally {
      await page.close();
      await oracleEBS.close();
    }
  }

  /**
   * Parse Excel file and extract Invoice No and Payment Date
   */
  private async parseExcelFile(filePath: string, paymentDate: string): Promise<ExcelPaymentRecord[]> {
    const records: ExcelPaymentRecord[] = [];
    const workbook = new ExcelJS.Workbook();

    try {
      await workbook.xlsx.readFile(filePath);
      const worksheet = workbook.worksheets[0];

      if (!worksheet) return records;

      // Find column indices
      const headerRow = worksheet.getRow(1);
      let invoiceNoColumn = -1;
      let amountColumn = -1;

      headerRow.eachCell((cell, colNumber) => {
        const text = (cell.value?.toString() || '').toLowerCase().trim();
        if (text.includes('invoice') && (text.includes('no') || text.includes('number'))) {
          invoiceNoColumn = colNumber;
        }
        if (text.includes('amount') && !text.includes('payment amount')) {
          amountColumn = colNumber;
        }
      });

      if (invoiceNoColumn === -1) {
        console.warn('[Daily Sync] Could not find Invoice No column in Excel');
        return records;
      }

      // Extract data rows
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return; // Skip header

        const invoiceNo = row.getCell(invoiceNoColumn).value?.toString()?.trim();
        const amount = amountColumn > 0
          ? parseFloat(row.getCell(amountColumn).value?.toString()?.replace(/,/g, '') || '0')
          : undefined;

        if (invoiceNo) {
          records.push({
            invoiceNo,
            paymentDate,
            paymentAmount: amount,
          });
        }
      });
    } catch (error: any) {
      console.error('[Daily Sync] Error parsing Excel:', error.message);
    }

    return records;
  }

  /**
   * Human-like delay
   */
  private async humanDelay(ms: number): Promise<void> {
    const variance = 0.3;
    const randomFactor = 1 + (Math.random() * 2 - 1) * variance;
    const delay = Math.max(500, ms * randomFactor);
    await new Promise(resolve => setTimeout(resolve, delay));
  }
}

