import { NextRequest, NextResponse } from 'next/server';
import { getLRByNumber, updateLR } from '@/lib/database';
import { generateAllFilesForLR } from '@/lib/excelGenerator';
import { uploadMultipleFiles } from '@/lib/s3Upload';

export async function POST(request: NextRequest) {
  try {
    const { lrNumbers, submissionDate } = await request.json();
    
    // Validate input
    if (!Array.isArray(lrNumbers) || lrNumbers.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No LR numbers provided' },
        { status: 400 }
      );
    }
    
    if (!submissionDate) {
      return NextResponse.json(
        { success: false, error: 'Submission date is required' },
        { status: 400 }
      );
    }
    
    const results = [];
    const errors = [];
    
    // Process each LR
    for (const lrNo of lrNumbers) {
      try {
        const lrData = await getLRByNumber(lrNo);
        
        if (!lrData) {
          errors.push({ lrNo, error: 'LR not found' });
          continue;
        }
        
        // Validate required fields
        if (!lrData['Vehicle Type']) {
          errors.push({ lrNo, error: 'Missing Vehicle Type' });
          continue;
        }
        
        // Generate files
        const files = await generateAllFilesForLR(lrData, submissionDate);
        
        // Upload to S3 (optional - won't fail if not configured)
        let s3Results = null;
        try {
          s3Results = await uploadMultipleFiles(
            [files.lrFile, files.invoiceFile, files.finalSheet],
            submissionDate
          );
        } catch (s3Error) {
          console.log('S3 upload skipped or failed:', s3Error);
        }
        
        // Update LR status to "Bill Done" and submission date after successful generation
        try {
          await updateLR(lrNo, { 
            status: 'Bill Done',
            'Bill Submission Date': submissionDate 
          } as any);
        } catch (statusError) {
          console.log('Failed to update status, but files generated:', statusError);
        }
        
        results.push({
          lrNo,
          success: true,
          files: {
            lrFile: files.lrFile,
            invoiceFile: files.invoiceFile,
            finalSheet: files.finalSheet,
          },
          s3Upload: s3Results,
        });
      } catch (error: any) {
        errors.push({
          lrNo,
          error: error.message || 'Failed to generate files',
        });
      }
    }
    
    // Return results
    if (results.length === 0 && errors.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to generate bills for all LRs',
          errors,
        },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: `Generated bills for ${results.length} of ${lrNumbers.length} LRs`,
      results,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: any) {
    console.error('Batch bill generation error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to generate bills',
      },
      { status: 500 }
    );
  }
}

