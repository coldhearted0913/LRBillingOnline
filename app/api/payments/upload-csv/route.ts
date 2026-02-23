import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { applyApiMiddleware } from '@/lib/middleware/apiMiddleware';
import { PaymentMatchingService } from '@/lib/services/paymentMatching';
import { PaymentCSVRow } from '@/lib/services/oracleEBSIntegration';
import { parse } from 'csv-parse/sync';
import ExcelJS from 'exceljs';

/**
 * POST /api/payments/upload-csv
 * Manually upload CSV or Excel file for payment processing
 * Supports both CSV and Excel (.xlsx, .xls) formats
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
    const paymentDateStr = formData.get('paymentDate') as string | null; // Optional payment date from user

    if (!file) {
      return NextResponse.json(
        { error: 'File is required' },
        { status: 400 }
      );
    }

    // Check file type
    const fileName = file.name.toLowerCase();
    const isExcel = fileName.endsWith('.xlsx') || fileName.endsWith('.xls');
    const isCSV = fileName.endsWith('.csv');

    if (!isExcel && !isCSV) {
      return NextResponse.json(
        { error: 'Invalid file type. Please upload CSV or Excel (.xlsx, .xls) file' },
        { status: 400 }
      );
    }

    let payments: PaymentCSVRow[] = [];

    if (isExcel) {
      // Parse Excel file
      const arrayBuffer = await file.arrayBuffer();
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(arrayBuffer);
      
      const worksheet = workbook.worksheets[0];
      if (!worksheet) {
        return NextResponse.json(
          { error: 'Excel file is empty or invalid' },
          { status: 400 }
        );
      }

      // Find column indices
      const headerRow = worksheet.getRow(1);
      const columnMap: { [key: string]: number } = {};
      
      headerRow.eachCell((cell, colNumber) => {
        const text = (cell.value?.toString() || '').toLowerCase().trim();
        if (text.includes('invoice') && (text.includes('no') || text.includes('number'))) {
          columnMap.invoiceNo = colNumber;
        }
        if (text.includes('lr') && (text.includes('no') || text.includes('number'))) {
          columnMap.lrNo = colNumber;
        }
        if (text.includes('payment date') || text.includes('date')) {
          columnMap.paymentDate = colNumber;
        }
        if (text.includes('payment amount') || (text.includes('amount') && !text.includes('invoice'))) {
          columnMap.paymentAmount = colNumber;
        }
        if (text.includes('bill') && (text.includes('no') || text.includes('number'))) {
          columnMap.billNumber = colNumber;
        }
        if (text.includes('reference') || text.includes('voucher')) {
          columnMap.referenceNumber = colNumber;
        }
        if (text.includes('bank')) {
          columnMap.bankName = colNumber;
        }
        if (text.includes('transaction')) {
          columnMap.transactionId = colNumber;
        }
      });

      if (!columnMap.invoiceNo && !columnMap.lrNo) {
        return NextResponse.json(
          { error: 'Could not find Invoice No or LR No column in Excel file' },
          { status: 400 }
        );
      }

      // Extract data rows
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return; // Skip header

        const invoiceNo = columnMap.invoiceNo ? row.getCell(columnMap.invoiceNo).value?.toString()?.trim() : '';
        const lrNo = columnMap.lrNo ? row.getCell(columnMap.lrNo).value?.toString()?.trim() : invoiceNo;
        const paymentDate = columnMap.paymentDate ? row.getCell(columnMap.paymentDate).value?.toString()?.trim() : '';
        const paymentAmount = columnMap.paymentAmount 
          ? row.getCell(columnMap.paymentAmount).value?.toString()?.trim() 
          : '';
        const billNumber = columnMap.billNumber ? row.getCell(columnMap.billNumber).value?.toString()?.trim() : '';
        const referenceNumber = columnMap.referenceNumber ? row.getCell(columnMap.referenceNumber).value?.toString()?.trim() : '';
        const bankName = columnMap.bankName ? row.getCell(columnMap.bankName).value?.toString()?.trim() : '';
        const transactionId = columnMap.transactionId ? row.getCell(columnMap.transactionId).value?.toString()?.trim() : '';

        if (invoiceNo || lrNo) {
          payments.push({
            invoiceNo: invoiceNo || lrNo,
            lrNo: lrNo || invoiceNo,
            paymentDate,
            paymentAmount,
            billNumber,
            referenceNumber,
            bankName,
            transactionId,
          });
        }
      });
    } else {
      // Parse CSV file
      const fileContent = await file.text();
      const rawPayments = parse(fileContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        relax_column_count: true,
      }) as any[];

      // Normalize column names (handle "Invoice No", "Invoice No.", etc.)
      // First, log available column names for debugging
      if (rawPayments.length > 0) {
        console.log('[CSV Upload] Available columns:', Object.keys(rawPayments[0]));
      }

      payments = rawPayments.map((row: any) => {
        // Try different column name variations (handle spaces, quotes, periods)
        const invoiceNo = (row['Invoice No'] || row['Invoice No.'] || row['InvoiceNo'] || row['invoiceNo'] || row['INVOICE_NO'] || row['Invoice Number'] || '').toString().trim();
        const lrNo = (row['LR No'] || row['LR No.'] || row['LRNo'] || row['lrNo'] || row['LR_NO'] || row['LR Number'] || invoiceNo).toString().trim();
        const paymentDate = (row['Payment Date'] || row['PaymentDate'] || row['paymentDate'] || row['Date'] || row['date'] || row['Invoice Date'] || row['InvoiceDate'] || '').toString().trim();
        const paymentAmount = (row['Payment Amount'] || row['PaymentAmount'] || row['paymentAmount'] || row['Amount'] || row['amount'] || '').toString().trim();
        const billNumber = (row['Bill No'] || row['Bill No.'] || row['BillNo'] || row['billNumber'] || row['Bill Number'] || '').toString().trim();
        const referenceNumber = (row['Reference'] || row['Reference Number'] || row['referenceNumber'] || row['Voucher No'] || row['VoucherNo'] || '').toString().trim();
        const bankName = (row['Bank'] || row['Bank Name'] || row['bankName'] || '').toString().trim();
        const transactionId = (row['Transaction ID'] || row['TransactionId'] || row['transactionId'] || '').toString().trim();

        return {
          invoiceNo,
          lrNo: lrNo || invoiceNo,
          paymentDate,
          paymentAmount,
          billNumber,
          referenceNumber,
          bankName,
          transactionId,
        } as PaymentCSVRow;
      }).filter((p: PaymentCSVRow) => p.invoiceNo || p.lrNo); // Only include rows with invoice/LR number

      console.log(`[CSV Upload] Parsed ${payments.length} payment records`);
      if (payments.length > 0) {
        console.log('[CSV Upload] Sample record:', JSON.stringify(payments[0], null, 2));
      }
    }

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
      // Parse payment date if provided by user, otherwise use null (will use dates from CSV)
      let paymentDateOverride: Date | undefined = undefined;
      if (paymentDateStr) {
        try {
          paymentDateOverride = new Date(paymentDateStr);
          if (isNaN(paymentDateOverride.getTime())) {
            paymentDateOverride = undefined; // Invalid date, ignore
          }
        } catch {
          paymentDateOverride = undefined;
        }
      }

      try {
        savedCount = await matchingService.savePayments(
          matchingResult.matched,
          session.user.email,
          true, // autoMarkPaid - automatically mark LRs as paid
          paymentDateOverride // Use user-provided date if available
        );
      } catch (saveError: any) {
        console.error('[CSV Upload] Error saving payments:', saveError);
        // Continue even if save fails, return partial success
      }
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

