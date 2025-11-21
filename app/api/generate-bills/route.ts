import { NextRequest, NextResponse } from 'next/server';
import { getLRByNumber, updateLR } from '@/lib/database';
import { generateAllFilesForLRNoFinal, resetFinalSubmissionSheet, appendFinalSubmissionSheetBatch } from '@/lib/excelGenerator';
import { uploadMultipleFiles } from '@/lib/s3Upload';
import path from 'path';

async function withConcurrency<T, R>(items: T[], limit: number, worker: (item: T, idx: number) => Promise<R>): Promise<R[]> {
  const results: R[] = [] as any;
  let index = 0;
  const runners: Promise<void>[] = [];
  const run = async () => {
    while (index < items.length) {
      const i = index++;
      try {
        results[i] = await worker(items[i], i);
      } catch (e) {
        (results as any)[i] = undefined;
      }
    }
  };
  for (let i = 0; i < Math.min(limit, items.length); i++) runners.push(run());
  await Promise.allSettled(runners);
  return results;
}

export async function POST(request: NextRequest) {
  try {
    const { lrNumbers, submissionDate, signatureImagePath } = await request.json(); // NEW: Accept signature
    
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
    
    const results: any[] = [];
    const errors: any[] = [];

    // Reset final submission sheet so only selected LRs are included
    try {
      await resetFinalSubmissionSheet(submissionDate);
    } catch (e) {
      console.log('[Generate Bills] Unable to reset final submission sheet:', (e as any)?.message);
    }
    const selectedLrsData: any[] = [];
    // Helper to convert full path to relative path from invoices folder
    const getRelativePath = (fullPath: string): string => {
      const invoicesDir = path.join(process.cwd(), 'invoices');
      if (fullPath.startsWith(invoicesDir)) {
        // Extract relative path (e.g., "DD-MM-YYYY/filename.xlsx")
        const relative = path.relative(invoicesDir, fullPath);
        // Normalize path separators to forward slashes for consistency
        return relative.replace(/\\/g, '/');
      }
      // If path doesn't start with invoices dir, try to extract from path string
      const pathSep = fullPath.includes('\\invoices\\') ? '\\invoices\\' : '/invoices/';
      const parts = fullPath.split(pathSep);
      if (parts.length > 1) {
        return parts[1].replace(/\\/g, '/');
      }
      // Fallback: assume it's already relative or extract filename
      const fileName = path.basename(fullPath);
      return `${submissionDate}/${fileName}`;
    };

    const worker = async (lrNo: string) => {
      try {
        const lrData = await getLRByNumber(lrNo);
        if (!lrData) { errors.push({ lrNo, error: 'LR not found' }); return; }
        if (!lrData['Vehicle Type']) { errors.push({ lrNo, error: 'Missing Vehicle Type' }); return; }
        const files = await generateAllFilesForLRNoFinal(lrData, submissionDate, signatureImagePath, true);
        
        // Convert full paths to relative paths for download
        const lrFileRel = getRelativePath(files.lrFile);
        const invoiceFileRel = getRelativePath(files.invoiceFile);
        const lrPdfFileRel = files.lrPdfFile ? getRelativePath(files.lrPdfFile) : undefined;
        const invoicePdfFileRel = files.invoicePdfFile ? getRelativePath(files.invoicePdfFile) : undefined;
        
        let s3Results = null;
        try {
          const toUpload = [files.lrFile, files.invoiceFile, files.lrPdfFile, files.invoicePdfFile].filter(Boolean) as string[];
          s3Results = await uploadMultipleFiles(toUpload, submissionDate);
        } catch (s3Error) { console.log('S3 upload skipped or failed:', s3Error); }
        try {
          await updateLR(lrNo, { status: 'Bill Done', 'Bill Submission Date': submissionDate } as any);
        } catch (statusError) { console.log('Failed to update status, but files generated:', statusError); }
        selectedLrsData.push(lrData);
        results.push({ 
          lrNo, 
          success: true, 
          files: { 
            lrFile: lrFileRel, 
            invoiceFile: invoiceFileRel,
            lrPdfFile: lrPdfFileRel,
            invoicePdfFile: invoicePdfFileRel,
            finalSheet: 'Final Submission Sheet.xlsx' 
          }, 
          s3Upload: s3Results 
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to generate files';
        errors.push({ lrNo, error: errorMessage });
      }
    };
    await withConcurrency<string, void>(lrNumbers, 8, worker);

    // Append all selected LRs to Final Submission Sheet in one pass
    try {
      const fsPath = await appendFinalSubmissionSheetBatch(selectedLrsData, submissionDate);
      // Compute relative path from invoices folder for the frontend downloader
      const finalSheetRel = getRelativePath(fsPath);
      // Back-fill the finalSheet path into each result so ZIP/download can include it
      for (const r of results) {
        if (r && r.files) {
          r.files.finalSheet = finalSheetRel;
        }
      }
      
      // Upload Final Submission Sheet to S3
      try {
        const finalSheetS3Result = await uploadMultipleFiles([fsPath], submissionDate);
        console.log('[Generate Bills] Final Submission Sheet S3 upload:', finalSheetS3Result);
      } catch (s3Error) {
        console.log('[Generate Bills] Final Submission Sheet S3 upload skipped or failed:', s3Error);
      }
    } catch (e) {
      console.log('[Generate Bills] Failed to append final submission sheet batch:', (e as any)?.message);
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
  } catch (error) {
    console.error('Batch bill generation error:', error);
    
    // Track error with Sentry
    const { getServerSession } = await import('next-auth');
    const { authOptions } = await import('@/lib/auth');
    const session = await getServerSession(authOptions).catch(() => null);
    const { trackApiError } = await import('@/lib/utils/errorTracking');
    
    trackApiError(error instanceof Error ? error : new Error(String(error)), {
      endpoint: '/api/generate-bills',
      method: 'POST',
      userEmail: session?.user?.email || undefined,
      userRole: (session?.user as any)?.role,
      metadata: {
        // Metadata available from error context
      },
    });
    
    const errorMessage = error instanceof Error ? error.message : 'Failed to generate bills';
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to generate bills',
      },
      { status: 500 }
    );
  }
}

