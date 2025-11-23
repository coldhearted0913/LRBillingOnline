import puppeteer from 'puppeteer';
import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';

export interface OracleEBSCredentials {
  username: string;
  password: string;
  baseUrl?: string;
}

export interface PaymentCSVRow {
  [key: string]: string | undefined;
  // Common fields (adjust based on actual CSV structure)
  billNumber?: string;
  invoiceNo?: string;
  lrNo?: string;
  paymentAmount?: string;
  paymentDate?: string;
  referenceNumber?: string;
  bankName?: string;
  transactionId?: string;
  paymentVoucherNo?: string;
  checkNo?: string;
  paymentStatus?: string;
}

export interface OraclePaymentRecord {
  paymentDate: string;
  paymentVoucherNo: string;
  checkNo: string;
  amount: number;
  paymentStatus: string;
  bankAccount: string;
  supplierSite: string;
  invoices: {
    invoiceNo: string;
    invoiceType: string;
    invoiceDate: string;
    invoiceAmount: number;
    paymentAmount: number;
    grNumber?: string;
  }[];
}

export interface OracleEBSConfig {
  credentials: OracleEBSCredentials;
  csvExportUrl?: string; // URL to the CSV export page
  paymentListingUrl?: string; // URL to the payment listing page
  loginUrl?: string;
  downloadTimeout?: number;
}

/**
 * Oracle EBS Integration Service
 * Handles authentication, CSV download, and parsing from Oracle EBS system
 */
export class OracleEBSIntegration {
  private config: OracleEBSConfig;
  private browser: any = null;

  constructor(config: OracleEBSConfig) {
    this.config = {
      ...config,
      loginUrl: config.loginUrl || 'https://knode1.koel.co.in:8443/OA_HTML/AppsLocalLogin.jsp',
      paymentListingUrl: config.paymentListingUrl || 'https://knode1.koel.co.in:8443/OA_HTML/OA.jsp?page=/xx_supp/oracle/apps/custom/paymentlisting/webui/PaymentListingSearchPG&retainAM=Y&addBreadCrumb=N',
      downloadTimeout: config.downloadTimeout || 60000, // 60 seconds
    };
  }

  /**
   * Initialize browser instance
   */
  private async initBrowser() {
    if (this.browser) {
      return this.browser;
    }

    this.browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
      ],
    });

    return this.browser;
  }

  /**
   * Login to Oracle EBS
   */
  private async login(page: any): Promise<boolean> {
    try {
      console.log('[Oracle EBS] Navigating to login page...');
      await page.goto(this.config.loginUrl!, {
        waitUntil: 'networkidle2',
        timeout: 30000,
      });

      // Wait for login form
      await page.waitForSelector('input[name="usernameField"], input[type="text"]', { timeout: 10000 });

      // Fill login form
      const usernameSelector = 'input[name="usernameField"]';
      const passwordSelector = 'input[name="passwordField"]';
      
      // Try alternative selectors if primary ones don't work
      const usernameInput = await page.$(usernameSelector) || await page.$('input[type="text"]');
      const passwordInput = await page.$(passwordSelector) || await page.$('input[type="password"]');

      if (!usernameInput || !passwordInput) {
        throw new Error('Could not find login form fields');
      }

      await usernameInput.type(this.config.credentials.username, { delay: 50 });
      await passwordInput.type(this.config.credentials.password, { delay: 50 });

      // Submit form
      const submitButton = await page.$('input[type="submit"], button[type="submit"], input[value*="Login"]');
      if (submitButton) {
        await submitButton.click();
      } else {
        // Try pressing Enter
        await page.keyboard.press('Enter');
      }

      // Wait for navigation after login
      await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 });

      // Check if login was successful (adjust based on actual behavior)
      const currentUrl = page.url();
      if (currentUrl.includes('AppsLocalLogin') || currentUrl.includes('login')) {
        throw new Error('Login failed - still on login page');
      }

      console.log('[Oracle EBS] Login successful');
      return true;
    } catch (error: any) {
      console.error('[Oracle EBS] Login error:', error.message);
      throw new Error(`Login failed: ${error.message}`);
    }
  }

  /**
   * Navigate to CSV export page and download CSV
   * This method tries multiple strategies to find and download the CSV
   */
  private async downloadCSV(page: any, csvExportUrl?: string): Promise<string> {
    try {
      const downloadPath = path.join(process.cwd(), 'temp', 'oracle_payments.csv');
      const downloadDir = path.dirname(downloadPath);
      
      if (!fs.existsSync(downloadDir)) {
        fs.mkdirSync(downloadDir, { recursive: true });
      }

      // Configure download behavior
      const client = await page.target().createCDPSession();
      await client.send('Page.setDownloadBehavior', {
        behavior: 'allow',
        downloadPath: downloadDir,
      });

      // Strategy 1: If CSV export URL is provided, navigate directly
      if (csvExportUrl) {
        console.log('[Oracle EBS] Navigating to provided CSV export URL...');
        try {
          await page.goto(csvExportUrl, {
            waitUntil: 'networkidle2',
            timeout: this.config.downloadTimeout,
          });
          
          // Wait a bit for any redirects or page loads
          await new Promise(resolve => setTimeout(resolve, 3000));
          
          // Check if we got a CSV file directly
          const files = fs.readdirSync(downloadDir);
          const csvFile = files.find(f => f.endsWith('.csv'));
          if (csvFile) {
            console.log('[Oracle EBS] CSV downloaded directly from URL');
            return path.join(downloadDir, csvFile);
          }
        } catch (error: any) {
          console.log('[Oracle EBS] Direct URL navigation failed, trying alternative methods...');
        }
      }

      // Strategy 2: Look for CSV export/download button on current page
      console.log('[Oracle EBS] Searching for CSV export button...');
      const csvButtonSelectors = [
        'a[href*=".csv"]',
        'button[onclick*="csv"]',
        'a[onclick*="CSV"]',
        'a[onclick*="csv"]',
        'input[value*="CSV"]',
        'input[value*="Export"]',
        'a:has-text("CSV")',
        'a:has-text("Export")',
      ];

      let csvButton = null;
      for (const selector of csvButtonSelectors) {
        try {
          csvButton = await page.$(selector);
          if (csvButton) {
            console.log(`[Oracle EBS] Found CSV button with selector: ${selector}`);
            break;
          }
        } catch (e) {
          // Continue to next selector
        }
      }

      if (csvButton) {
        await csvButton.click();
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        const files = fs.readdirSync(downloadDir);
        const csvFile = files.find(f => f.endsWith('.csv'));
        if (csvFile) {
          console.log('[Oracle EBS] CSV downloaded via button click');
          return path.join(downloadDir, csvFile);
        }
      }

      // Strategy 3: Search for export links in page content
      console.log('[Oracle EBS] Searching page content for export links...');
      const exportLink = await page.evaluate(() => {
        // Search all links
        const links = Array.from(document.querySelectorAll('a, button, input[type="button"]'));
        
        for (const link of links) {
          const text = (link.textContent || link.getAttribute('value') || '').toLowerCase();
          const href = (link.getAttribute('href') || '').toLowerCase();
          const onclick = (link.getAttribute('onclick') || '').toLowerCase();
          
          if (
            text.includes('csv') ||
            text.includes('export') ||
            text.includes('download') ||
            href.includes('.csv') ||
            href.includes('export') ||
            onclick.includes('csv') ||
            onclick.includes('export')
          ) {
            return {
              href: link.getAttribute('href'),
              onclick: link.getAttribute('onclick'),
              text: link.textContent,
            };
          }
        }
        return null;
      });

      if (exportLink) {
        console.log(`[Oracle EBS] Found export link: ${exportLink.text}`);
        
        if (exportLink.href) {
          await page.goto(exportLink.href, { waitUntil: 'networkidle2' });
        } else if (exportLink.onclick) {
          await page.evaluate((onclick: string) => {
            eval(onclick);
          }, exportLink.onclick);
        }
        
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        const files = fs.readdirSync(downloadDir);
        const csvFile = files.find(f => f.endsWith('.csv'));
        if (csvFile) {
          console.log('[Oracle EBS] CSV downloaded via export link');
          return path.join(downloadDir, csvFile);
        }
      }

      // Strategy 4: Try to get CSV content directly from page if it's displayed
      console.log('[Oracle EBS] Attempting to extract CSV from page content...');
      const csvContent = await page.evaluate(() => {
        // Look for pre tags or text areas with CSV-like content
        const preTags = Array.from(document.querySelectorAll('pre'));
        for (const pre of preTags) {
          const text = pre.textContent || '';
          if (text.includes(',') && text.split('\n').length > 2) {
            return text;
          }
        }
        return null;
      });

      if (csvContent) {
        fs.writeFileSync(downloadPath, csvContent, 'utf-8');
        console.log('[Oracle EBS] CSV extracted from page content');
        return downloadPath;
      }

      // If all strategies fail, check if file was downloaded with a different name
      const files = fs.readdirSync(downloadDir);
      const csvFile = files.find(f => f.endsWith('.csv'));
      
      if (csvFile) {
        console.log(`[Oracle EBS] Found CSV file: ${csvFile}`);
        return path.join(downloadDir, csvFile);
      }

      throw new Error('Could not find or download CSV file. Please check the Oracle EBS interface or provide the direct CSV export URL.');
    } catch (error: any) {
      console.error('[Oracle EBS] CSV download error:', error.message);
      throw new Error(`CSV download failed: ${error.message}`);
    }
  }

  /**
   * Parse CSV file and return payment records
   */
  private parseCSV(filePath: string): PaymentCSVRow[] {
    try {
      const csvContent = fs.readFileSync(filePath, 'utf-8');
      
      const records = parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        relax_column_count: true,
      }) as PaymentCSVRow[];

      console.log(`[Oracle EBS] Parsed ${records.length} payment records from CSV`);
      return records;
    } catch (error: any) {
      console.error('[Oracle EBS] CSV parsing error:', error.message);
      throw new Error(`CSV parsing failed: ${error.message}`);
    }
  }

  /**
   * Extract payment data directly from the payment listing page table
   */
  async fetchPaymentsFromTable(paymentListingUrl?: string): Promise<OraclePaymentRecord[]> {
    const browser = await this.initBrowser();
    const page = await browser.newPage();

    try {
      // Login
      await this.login(page);

      // Navigate to payment listing page
      const listingUrl = paymentListingUrl || this.config.paymentListingUrl;
      console.log('[Oracle EBS] Navigating to payment listing page:', listingUrl);
      await page.goto(listingUrl!, {
        waitUntil: 'networkidle2',
        timeout: 30000,
      });

      // Check if we're on an error page or login page
      const currentUrl = page.url();
      const pageTitle = await page.title();
      const pageText = await page.evaluate(() => document.body.innerText.toLowerCase());
      
      if (currentUrl.includes('AppsLocalLogin') || currentUrl.includes('login')) {
        throw new Error('Login failed - redirected back to login page. Please check your credentials.');
      }
      
      // Check for critical errors (but allow warnings)
      // Only throw if it's a clear access denied AND no tables are found
      const hasCriticalError = (
        pageText.includes('insufficient privileges') && 
        pageText.includes('system administrator')
      ) || (
        pageText.includes('error') && 
        pageText.includes('you have insufficient') &&
        !pageText.includes('table') &&
        !pageText.includes('payment')
      );
      
      // Check if tables exist before throwing error
      const tableCount = await page.evaluate(() => document.querySelectorAll('table').length);
      
      if (hasCriticalError && tableCount === 0) {
        throw new Error('Access denied or error page detected. You may not have permission to view payment records.');
      }
      
      // If we have tables, continue even if there's a warning message
      if (hasCriticalError && tableCount > 0) {
        console.warn('[Oracle EBS] Warning message detected but tables found, continuing...');
      }

      console.log('[Oracle EBS] Page loaded. Title:', pageTitle);
      console.log('[Oracle EBS] Current URL:', currentUrl);
      console.log(`[Oracle EBS] Found ${tableCount} tables on page`);

      // Wait for table to load - try multiple selectors
      try {
        await page.waitForSelector('table', { timeout: 15000 });
      } catch (e) {
        console.warn('[Oracle EBS] Table selector not found, trying alternative selectors...');
        await page.waitForSelector('tbody, .x1t, [role="table"]', { timeout: 10000 }).catch(() => {
          console.warn('[Oracle EBS] Alternative selectors also not found');
        });
      }
      
      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait for data to load (increased from 3s)

      // Extract payment records from the main table
      const paymentRecords = await page.evaluate(() => {
        const records: OraclePaymentRecord[] = [];
        
        // Find the main payment table
        // Oracle EBS typically uses tables with specific classes
        const tables = Array.from(document.querySelectorAll('table'));
        console.log(`[Oracle EBS] Found ${tables.length} tables on page`);
        
        let mainTable: HTMLTableElement | null = null;

        // Look for table with payment-related headers
        // Also filter out tables that contain navigation/menu items
        for (const table of tables) {
          const headers = Array.from(table.querySelectorAll('th, thead td, tr:first-child td'));
          const headerText = headers.map(h => h.textContent?.toLowerCase() || '').join(' ');
          
          // Skip tables with navigation/menu content
          if (
            headerText.includes('preferences') ||
            headerText.includes('manage proxies') ||
            headerText.includes('access requests') ||
            headerText.includes('logged in') ||
            headerText.includes('initializepopup')
          ) {
            continue;
          }
          
          console.log(`[Oracle EBS] Table header text: ${headerText.substring(0, 100)}...`);
          
          if (headerText.includes('payment') && (headerText.includes('voucher') || headerText.includes('date'))) {
            mainTable = table;
            console.log('[Oracle EBS] Found payment table by header match');
            break;
          }
        }

        if (!mainTable) {
          // Fallback: use the largest table with data rows
          console.log('[Oracle EBS] Trying fallback: largest table');
          const tablesWithData = tables.filter(table => {
            const rows = table.querySelectorAll('tbody tr, tr:not(:first-child)');
            return rows.length > 0;
          });
          
          if (tablesWithData.length > 0) {
            mainTable = tablesWithData.reduce((largest, current) => {
              const largestRows = largest.querySelectorAll('tbody tr, tr:not(:first-child)').length;
              const currentRows = current.querySelectorAll('tbody tr, tr:not(:first-child)').length;
              return currentRows > largestRows ? current : largest;
            }, tablesWithData[0]) as HTMLTableElement;
            console.log(`[Oracle EBS] Using largest table with ${mainTable.querySelectorAll('tbody tr, tr:not(:first-child)').length} rows`);
          }
        }

        if (!mainTable) {
          console.error('[Oracle EBS] Could not find payment table');
          // Return debug info
          return { error: 'No table found', tableCount: tables.length, pageText: document.body.innerText.substring(0, 500) } as any;
        }

        // Extract column indices
        const headerRow = mainTable.querySelector('thead tr, tr:first-child');
        if (!headerRow) {
          console.error('[Oracle EBS] No header row found');
          return { error: 'No header row', tableHTML: mainTable.innerHTML.substring(0, 1000) } as any;
        }

        const headers = Array.from(headerRow.querySelectorAll('th, td'));
        console.log(`[Oracle EBS] Found ${headers.length} header columns`);
        
        const columnMap: { [key: string]: number } = {};
        
        headers.forEach((header, index) => {
          const text = (header.textContent || '').toLowerCase().trim();
          console.log(`[Oracle EBS] Header ${index}: "${text}"`);
          
          if (text.includes('payment date') || text.includes('date')) columnMap.date = index;
          if (text.includes('payment voucher') || text.includes('voucher') || text.includes('voucher no')) columnMap.voucher = index;
          if (text.includes('check no') || text.includes('check') || text.includes('cheque')) columnMap.check = index;
          if (text.includes('amount') && !text.includes('invoice amount')) columnMap.amount = index;
          if (text.includes('payment status') || text.includes('status')) columnMap.status = index;
          if (text.includes('bank account') || text.includes('bank')) columnMap.bank = index;
          if (text.includes('supplier site') || text.includes('supplier')) columnMap.supplier = index;
        });
        
        console.log('[Oracle EBS] Column map:', columnMap);

        // Extract data rows
        const rows = Array.from(mainTable.querySelectorAll('tbody tr, tr:not(:first-child)'));
        console.log(`[Oracle EBS] Found ${rows.length} data rows`);
        
        let skippedRows = 0;
        for (const row of rows) {
          const cells = Array.from(row.querySelectorAll('td'));
          if (cells.length < 2) {
            skippedRows++;
            continue; // Skip empty rows
          }

          // Get all cell text to check if it's valid payment data
          const allCellText = cells.map(c => c.textContent?.trim() || '').join(' ').toLowerCase();
          
          // Skip rows that contain JavaScript, menu items, or navigation
          if (
            allCellText.includes('initializepopup') ||
            allCellText.includes('function_id') ||
            allCellText.includes('security_group') ||
            allCellText.includes('logged in as') ||
            allCellText.includes('preferences') ||
            allCellText.includes('manage proxies') ||
            allCellText.includes('access requests') ||
            allCellText.includes('settingsmenu') ||
            allCellText.includes('rf.jsp') ||
            allCellText.includes('loading...') ||
            cells.length === 0 ||
            allCellText.trim().length === 0
          ) {
            skippedRows++;
            continue;
          }

          const getCellText = (index: number) => {
            if (index < 0 || index >= cells.length) return '';
            return cells[index]?.textContent?.trim() || '';
          };

          // Try to extract data even if column mapping is incomplete
          const paymentDate = columnMap.date !== undefined ? getCellText(columnMap.date) : (cells[0]?.textContent?.trim() || '');
          const paymentVoucherNo = columnMap.voucher !== undefined ? getCellText(columnMap.voucher) : (cells[1]?.textContent?.trim() || '');
          const checkNo = columnMap.check !== undefined ? getCellText(columnMap.check) : '';
          const amountText = columnMap.amount !== undefined ? getCellText(columnMap.amount) : (cells.find(c => {
            const text = c.textContent?.trim() || '';
            return /[\d,]+\.?\d*/.test(text) && parseFloat(text.replace(/,/g, '')) !== 0;
          })?.textContent?.trim() || '');
          const paymentStatus = columnMap.status !== undefined ? getCellText(columnMap.status) : '';
          const bankAccount = columnMap.bank !== undefined ? getCellText(columnMap.bank) : '';
          const supplierSite = columnMap.supplier !== undefined ? getCellText(columnMap.supplier) : '';

          // Parse amount (remove commas and convert to number, handle negative amounts)
          const amount = parseFloat(amountText.replace(/,/g, '')) || 0;

          // Validate that this looks like a payment record:
          // 1. Should have a voucher number (numeric or alphanumeric)
          // 2. Should have a date or amount
          // 3. Voucher number should not be JavaScript code
          const isValidVoucher = paymentVoucherNo && 
            /^[\d\w\/-]+$/.test(paymentVoucherNo) && 
            !paymentVoucherNo.includes('function') &&
            !paymentVoucherNo.includes('jsp') &&
            paymentVoucherNo.length > 2 &&
            paymentVoucherNo.length < 50;
          
          const hasValidData = isValidVoucher && (
            paymentDate || 
            amount !== 0 || 
            checkNo ||
            paymentStatus.toLowerCase().includes('paid')
          );

          if (hasValidData) {
            records.push({
              paymentDate,
              paymentVoucherNo,
              checkNo,
              amount: amount || 0, // Allow 0 for now, will be updated from invoice details
              paymentStatus,
              bankAccount,
              supplierSite,
              invoices: [], // Will be populated by clicking voucher
            });
          } else {
            skippedRows++;
            console.log(`[Oracle EBS] Skipped invalid row: voucher="${paymentVoucherNo}", date="${paymentDate}", amount="${amountText}"`);
          }
        }
        
        console.log(`[Oracle EBS] Extracted ${records.length} records, skipped ${skippedRows} rows`);

        return records;
      });

      // Check if extraction returned an error
      if ((paymentRecords as any).error) {
        const errorInfo = paymentRecords as any;
        console.error(`[Oracle EBS] Table extraction error:`, errorInfo.error);
        throw new Error(`Failed to extract payment data: ${errorInfo.error}. ${errorInfo.tableCount ? `Found ${errorInfo.tableCount} tables.` : ''}`);
      }

      console.log(`[Oracle EBS] Extracted ${paymentRecords.length} payment records from table`);
      
      if (paymentRecords.length === 0) {
        // Take a screenshot for debugging
        const screenshotPath = path.join(process.cwd(), 'temp', 'oracle_ebs_debug.png');
        const screenshotDir = path.dirname(screenshotPath);
        if (!fs.existsSync(screenshotDir)) {
          fs.mkdirSync(screenshotDir, { recursive: true });
        }
        await page.screenshot({ path: screenshotPath, fullPage: true });
        console.log(`[Oracle EBS] Screenshot saved to ${screenshotPath} for debugging`);
        
        // Get page HTML for debugging
        const pageHTML = await page.content();
        const htmlPath = path.join(process.cwd(), 'temp', 'oracle_ebs_debug.html');
        fs.writeFileSync(htmlPath, pageHTML);
        console.log(`[Oracle EBS] Page HTML saved to ${htmlPath} for debugging`);
        
        // Get page text for debugging
        const pageText = await page.evaluate(() => document.body.innerText);
        const textPath = path.join(process.cwd(), 'temp', 'oracle_ebs_debug.txt');
        fs.writeFileSync(textPath, pageText);
        console.log(`[Oracle EBS] Page text saved to ${textPath} for debugging`);
        
        throw new Error(
          'No payment records found in table. ' +
          'Possible reasons: 1) Page structure is different than expected, 2) No payment records available, ' +
          '3) Table is loaded dynamically and needs more time. ' +
          'Debug files saved to temp/ directory. Try using manual CSV upload instead.'
        );
      }
      
      // If we have records but no invoices, that's okay - we'll use voucher data
      const recordsWithInvoices = paymentRecords.filter(r => r.invoices.length > 0).length;
      console.log(`[Oracle EBS] ${recordsWithInvoices} out of ${paymentRecords.length} records have invoice details`);

      // For each payment voucher, click to get invoice details
      for (let i = 0; i < Math.min(paymentRecords.length, 50); i++) { // Limit to 50 to avoid timeout
        const record = paymentRecords[i];
        try {
          // Find and click the payment voucher link
          const invoiceDetails = await page.evaluate((voucherNo) => {
            // Find link containing the voucher number
            const links = Array.from(document.querySelectorAll('a'));
            const voucherLink = links.find(link => 
              link.textContent?.includes(voucherNo) || 
              link.getAttribute('href')?.includes(voucherNo)
            );

            if (!voucherLink) return null;

            // Click the link (this will be handled by navigation)
            return {
              href: voucherLink.getAttribute('href'),
              text: voucherLink.textContent,
            };
          }, record.paymentVoucherNo);

          if (invoiceDetails?.href) {
            // Navigate to invoice details page
            await page.goto(invoiceDetails.href, { waitUntil: 'networkidle2', timeout: 15000 });
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Extract invoice details from the detail page
            const invoices = await page.evaluate(() => {
              const invoiceList: any[] = [];
              
              // Find invoice table
              const tables = Array.from(document.querySelectorAll('table'));
              let invoiceTable: HTMLTableElement | null = null;

              for (const table of tables) {
                const headers = Array.from(table.querySelectorAll('th, thead td'));
                const headerText = headers.map(h => h.textContent?.toLowerCase() || '').join(' ');
                if (headerText.includes('invoice') && (headerText.includes('number') || headerText.includes('no'))) {
                  invoiceTable = table;
                  break;
                }
              }

              if (!invoiceTable) return invoiceList;

              // Extract column indices
              const headerRow = invoiceTable.querySelector('thead tr, tr:first-child');
              if (!headerRow) return invoiceList;

              const headers = Array.from(headerRow.querySelectorAll('th, td'));
              const columnMap: { [key: string]: number } = {};
              
              headers.forEach((header, index) => {
                const text = (header.textContent || '').toLowerCase().trim();
                if (text.includes('invoice no') || text.includes('invoice number')) columnMap.invoiceNo = index;
                if (text.includes('invoice type') || text.includes('type')) columnMap.type = index;
                if (text.includes('invoice date') || text.includes('date')) columnMap.date = index;
                if (text.includes('invoice amount') || text.includes('amount')) columnMap.amount = index;
                if (text.includes('payment amount')) columnMap.paymentAmount = index;
                if (text.includes('goods receipt') || text.includes('gr')) columnMap.gr = index;
              });

              // Extract invoice rows
              const rows = Array.from(invoiceTable.querySelectorAll('tbody tr, tr:not(:first-child)'));
              
              for (const row of rows) {
                const cells = Array.from(row.querySelectorAll('td'));
                if (cells.length < 2) continue;

                const getCellText = (index: number) => {
                  return cells[index]?.textContent?.trim() || '';
                };

                const invoiceNo = columnMap.invoiceNo !== undefined ? getCellText(columnMap.invoiceNo) : '';
                const invoiceType = columnMap.type !== undefined ? getCellText(columnMap.type) : '';
                const invoiceDate = columnMap.date !== undefined ? getCellText(columnMap.date) : '';
                const amountText = columnMap.amount !== undefined ? getCellText(columnMap.amount) : '';
                const paymentAmountText = columnMap.paymentAmount !== undefined ? getCellText(columnMap.paymentAmount) : '';
                const grNumber = columnMap.gr !== undefined ? getCellText(columnMap.gr) : '';

                // Parse amounts (can be negative for credit memos)
                // Remove commas but preserve negative sign
                const invoiceAmount = parseFloat(amountText.replace(/,/g, '')) || 0;
                const paymentAmount = paymentAmountText 
                  ? parseFloat(paymentAmountText.replace(/,/g, '')) 
                  : invoiceAmount;

                // Extract LR number from invoice number (e.g., "MT/25-26/1109" from "MT/25-26/1109-TDS-CM-6432443")
                const lrMatch = invoiceNo.match(/MT\/25-26\/\d+/);
                const lrNo = lrMatch ? lrMatch[0] : invoiceNo;

                if (invoiceNo) {
                  invoiceList.push({
                    invoiceNo: lrNo, // Use extracted LR number
                    invoiceType,
                    invoiceDate,
                    invoiceAmount,
                    paymentAmount,
                    grNumber,
                  });
                }
              }

              return invoiceList;
            });

            record.invoices = invoices;
            console.log(`[Oracle EBS] Extracted ${invoices.length} invoices for payment voucher ${record.paymentVoucherNo}`);

            // Go back to payment listing
            await page.goBack({ waitUntil: 'networkidle2' });
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        } catch (error: any) {
          console.warn(`[Oracle EBS] Error extracting invoices for voucher ${record.paymentVoucherNo}:`, error.message);
          // Continue with next record
        }
      }

      return paymentRecords;
    } catch (error: any) {
      console.error('[Oracle EBS] Fetch payments from table error:', error.message);
      throw error;
    } finally {
      await page.close();
    }
  }

  /**
   * Main method to fetch payments from Oracle EBS
   * Now supports both CSV download and direct table extraction
   */
  async fetchPayments(csvExportUrl?: string, useTableExtraction: boolean = true): Promise<PaymentCSVRow[]> {
    // Try table extraction first (more reliable)
    if (useTableExtraction) {
      try {
        console.log('[Oracle EBS] Attempting table extraction...');
        const paymentRecords = await this.fetchPaymentsFromTable();
        
        if (paymentRecords.length === 0) {
          throw new Error('Table extraction returned 0 records. The payment listing page may be empty or the table structure is different than expected.');
        }
        
        // Convert OraclePaymentRecord to PaymentCSVRow format
        const csvRows: PaymentCSVRow[] = [];
        for (const record of paymentRecords) {
          // If no invoices were extracted (voucher clicking failed), create a record from the main table data
          if (record.invoices.length === 0) {
            // Use the payment voucher data directly
            csvRows.push({
              invoiceNo: record.paymentVoucherNo, // Use voucher as fallback
              lrNo: record.paymentVoucherNo,
              paymentAmount: record.amount.toString(),
              paymentDate: record.paymentDate,
              referenceNumber: record.checkNo,
              transactionId: record.paymentVoucherNo,
              bankName: record.bankAccount,
              paymentStatus: record.paymentStatus,
            });
          } else {
            // Include both positive payments and negative credit memos
            for (const invoice of record.invoices) {
              csvRows.push({
                invoiceNo: invoice.invoiceNo,
                lrNo: invoice.invoiceNo, // Invoice No contains LR number
                paymentAmount: invoice.paymentAmount.toString(), // Can be negative for credit memos
                paymentDate: record.paymentDate,
                referenceNumber: record.checkNo,
                transactionId: `${record.paymentVoucherNo}${invoice.paymentAmount < 0 ? '-CM' : ''}`, // Mark credit memos
                bankName: record.bankAccount,
                paymentStatus: record.paymentStatus,
              });
            }
          }
        }
        
        console.log(`[Oracle EBS] Successfully extracted ${csvRows.length} payment records from table`);
        return csvRows;
      } catch (error: any) {
        console.error('[Oracle EBS] Table extraction failed:', error.message);
        console.error('[Oracle EBS] Error stack:', error.stack);
        
        // If table extraction fails, don't fall back to CSV automatically
        // Instead, throw a clear error with suggestions
        throw new Error(
          `Table extraction failed: ${error.message}. ` +
          `This usually means: 1) The payment listing page structure is different, 2) No payment records are available, ` +
          `3) Login/permission issues. Try using the manual CSV upload option instead, or check server logs for debug files.`
        );
      }
    }

    // Fallback to CSV download method (only if explicitly requested)
    console.log('[Oracle EBS] Attempting CSV download...');
    const browser = await this.initBrowser();
    const page = await browser.newPage();

    try {
      // Login
      await this.login(page);

      // Download CSV
      const csvPath = await this.downloadCSV(page, csvExportUrl || this.config.csvExportUrl);

      // Parse CSV
      const payments = this.parseCSV(csvPath);

      // Clean up
      if (fs.existsSync(csvPath)) {
        fs.unlinkSync(csvPath);
      }

      return payments;
    } catch (error: any) {
      console.error('[Oracle EBS] CSV download error:', error.message);
      throw new Error(
        `CSV download failed: ${error.message}. ` +
        `Please use the manual CSV upload option, or provide the direct CSV export URL in the payment listing page.`
      );
    } finally {
      await page.close();
    }
  }

  /**
   * Close browser instance
   */
  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}

