import { NextRequest, NextResponse } from 'next/server';
import { generateAdditionalBill } from '@/lib/excelGenerator';
import { uploadFileToS3 } from '@/lib/s3Upload';
import { updateLR } from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    console.log('[ADDITIONAL-BILL-GENERATE] Received data:', data);
    
    const { submissionDate, billNo, entries } = data;

    if (!submissionDate || !billNo || !entries || entries.length === 0) {
      console.error('[ADDITIONAL-BILL-GENERATE] Missing required data:', { submissionDate, billNo, entries });
      return NextResponse.json(
        { success: false, error: 'Missing required data' },
        { status: 400 }
      );
    }

    console.log('[ADDITIONAL-BILL-GENERATE] Generating bill with entries:', entries);

    // Generate Excel file with all entries
    const absoluteFilePath = await generateAdditionalBill({
      'Submission Date': submissionDate,
      'Bill No': billNo,
      allEntries: entries,
    }, submissionDate);
    
    console.log('[ADDITIONAL-BILL-GENERATE] Generated file at:', absoluteFilePath);
    
    // Get relative path from invoices folder
    const path = require('path');
    const relativePath = absoluteFilePath.split(path.sep + 'invoices' + path.sep)[1] || absoluteFilePath;
    
    // Upload to S3 - save under submission date folder
    const s3Result = await uploadFileToS3(absoluteFilePath, submissionDate);
    
    console.log('[ADDITIONAL-BILL-GENERATE] S3 upload result:', s3Result);
    
    // Update all entries to "Bill Done" status and set submission date
    for (const entry of entries) {
      const lrNo = entry['LR No']; // Use original LR No, not ADDITIONAL- prefix
      try {
        await updateLR(lrNo, {
          status: 'Bill Done',
          'Bill Submission Date': submissionDate,
        } as any);
        console.log(`[ADDITIONAL-BILL-GENERATE] Updated LR ${lrNo} to Bill Done with submission date`);
      } catch (error) {
        console.error(`[ADDITIONAL-BILL-GENERATE] Failed to update LR ${lrNo}:`, error);
        // Continue processing other LRs even if one fails
      }
    }

    const response = {
      success: true,
      message: 'Additional bill generated successfully',
      filePath: relativePath,
      s3Url: s3Result.url,
      entriesProcessed: entries.length
    };
    
    console.log('[ADDITIONAL-BILL-GENERATE] Success response:', response);
    return NextResponse.json(response);

  } catch (error) {
    console.error('[ADDITIONAL-BILL-GENERATE] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json(
      { success: false, error: `Failed to generate additional bill: ${errorMessage}` },
      { status: 500 }
    );
  }
}
