import { NextRequest, NextResponse } from 'next/server';
import { generateReworkBill } from '@/lib/excelGenerator';
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
    const absoluteFilePath = await generateReworkBill({
      'Submission Date': submissionDate,
      'Bill No': billNo,
      allEntries: entries,
    }, submissionDate);
    
    // Get relative path from invoices folder
    const path = require('path');
    const relativePath = absoluteFilePath.split(path.sep + 'invoices' + path.sep)[1] || absoluteFilePath;
    
    // Upload to S3 - save under submission date folder
    const s3Result = await uploadFileToS3(absoluteFilePath, submissionDate);
    
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
      message: 'Rework bill generated successfully',
      filePath: relativePath,
      s3Url: s3Result.url,
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
