import { NextRequest, NextResponse } from 'next/server';
import { generateAdditionalBill } from '@/lib/excelGenerator';
import { uploadFileToS3 } from '@/lib/s3Upload';
import { updateLR } from '@/lib/database';

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

    // Generate Excel file with all entries
    const absoluteFilePath = await generateAdditionalBill({
      'Submission Date': submissionDate,
      'Bill No': billNo,
      allEntries: entries,
    }, submissionDate);
    
    // Get relative path from invoices folder
    const path = require('path');
    const relativePath = absoluteFilePath.split(path.sep + 'invoices' + path.sep)[1] || absoluteFilePath;
    
    // Upload to S3
    const sanitizedBillNo = billNo.replace(/\//g, '_');
    const s3Result = await uploadFileToS3(absoluteFilePath, `additional-bills/${sanitizedBillNo}_${submissionDate}.xlsx`);
    
    // Update all entries to "Bill Done" status
    for (const entry of entries) {
      const lrNo = `ADDITIONAL-${entry['LR No']}`;
      await updateLR(lrNo, {
        status: 'Bill Done',
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Additional bill generated successfully',
      filePath: relativePath,
      s3Url: s3Result.url,
      entriesProcessed: entries.length
    });

  } catch (error) {
    console.error('Error generating additional bill:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate additional bill' },
      { status: 500 }
    );
  }
}
