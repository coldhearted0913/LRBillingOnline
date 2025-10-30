import { NextRequest, NextResponse } from 'next/server';
import { generateReworkBill, generateMangeshInvoiceForRework } from '@/lib/excelGenerator';
import { uploadFileToS3 } from '@/lib/s3Upload';
import { updateLR } from '@/lib/database';
import { VEHICLE_AMOUNTS } from '@/lib/constants';

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { submissionDate, billNo, entries } = data;

    if (!submissionDate || !billNo || !entries || entries.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Missing required data' },
        { status: 400 }
      );
    }

    // Ensure each entry has Amount = 80% of vehicle-type base
    const normalizedEntries = (entries as any[]).map((e: any) => {
      const vehicleType = (e['Vehicle Type'] || '').toString();
      const baseAmount = (VEHICLE_AMOUNTS as any)[vehicleType] || 0;
      const reworkAmount = Math.round(baseAmount * 0.8);
      return { ...e, Amount: reworkAmount };
    });

    // Generate Rework Bill Excel file with all entries
    const billFilePath = await generateReworkBill({
      'Submission Date': submissionDate,
      'Bill No': billNo,
      allEntries: normalizedEntries,
    }, submissionDate);
    
    // Generate Mangesh Transport Invoice
    const invoiceFilePath = await generateMangeshInvoiceForRework({
      'Submission Date': submissionDate,
      'Bill No': billNo,
      allEntries: normalizedEntries,
    }, submissionDate);
    
    // Get relative paths from invoices folder
    const path = require('path');
    const billRelativePath = billFilePath.split(path.sep + 'invoices' + path.sep)[1] || billFilePath;
    const invoiceRelativePath = invoiceFilePath.split(path.sep + 'invoices' + path.sep)[1] || invoiceFilePath;
    
    // Upload both files to S3 - save under submission date folder
    const billS3Result = await uploadFileToS3(billFilePath, submissionDate);
    const invoiceS3Result = await uploadFileToS3(invoiceFilePath, submissionDate);
    
    // Update all entries to "Bill Done" status and set submission date
    for (const entry of entries) {
      const lrNo = entry['LR No']; // Use the actual LR number, not a prefixed version
      try {
        await updateLR(lrNo, {
          status: 'Bill Done',
          'Bill Submission Date': submissionDate,
        } as any);
        console.log(`[REWORK-BILL-GENERATE] Updated LR ${lrNo} to Bill Done with submission date`);
      } catch (error) {
        console.error(`[REWORK-BILL-GENERATE] Error updating LR ${lrNo}:`, error);
        // Continue with other entries even if one fails
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Rework bill and invoice generated successfully',
      billFilePath: billRelativePath,
      invoiceFilePath: invoiceRelativePath,
      billS3Url: billS3Result.url,
      invoiceS3Url: invoiceS3Result.url,
      entriesProcessed: entries.length
    });

  } catch (error) {
    console.error('Error generating rework bill:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate rework bill' },
      { status: 500 }
    );
  }
}
