import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getAllLRs, updateLR } from '@/lib/database';
import { generateLRFromMasterCopy, generatePDFFromExcel } from '@/lib/excelGenerator';
import { uploadFileToS3 } from '@/lib/s3Upload';
import path from 'path';
import fs from 'fs';
import JSZip from 'jszip';

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { lrNos } = body;

    if (!lrNos || !Array.isArray(lrNos) || lrNos.length === 0) {
      return NextResponse.json(
        { error: 'Please provide at least one LR number' },
        { status: 400 }
      );
    }

    // Get all LRs
    const allLRs = await getAllLRs();
    
    // Filter selected LRs
    const selectedLRs = allLRs.filter(lr => lrNos.includes(lr['LR No']));

    if (selectedLRs.length === 0) {
      return NextResponse.json(
        { error: 'No matching LR records found' },
        { status: 404 }
      );
    }

    // Generate current date for submission folder (format: DD-MM-YYYY)
    const today = new Date();
    const day = today.getDate().toString().padStart(2, '0');
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    const year = today.getFullYear();
    const submissionDate = `${day}-${month}-${year}`;

    // Generate LR files for each selected record and save as attachments
    const generatedFiles: Array<{ lrNo: string; filePath: string; fileName: string; url?: string }> = [];

    for (const lrData of selectedLRs) {
      try {
        // Generate Excel file first
        const excelFilePath = await generateLRFromMasterCopy(lrData, submissionDate);
        
        // Generate PDF from Excel
        let pdfFilePath: string | null = null;
        try {
          pdfFilePath = await generatePDFFromExcel(excelFilePath);
          if (pdfFilePath) {
            console.log(`[Print LR] Successfully generated PDF for ${lrData['LR No']}: ${pdfFilePath}`);
          } else {
            console.warn(`[Print LR] PDF generation returned null for ${lrData['LR No']}`);
          }
        } catch (pdfError) {
          console.error(`[Print LR] Failed to generate PDF for ${lrData['LR No']}:`, pdfError);
          // Continue with Excel file if PDF generation fails
        }
        
        // Use PDF if available, otherwise use Excel
        const filePath = pdfFilePath || excelFilePath;
        const fileName = path.basename(filePath);
        
        // Upload to S3 in a separate LR folder and save as attachment
        // Use "lr-files" as the folder name to keep LR files separate from invoices
        const uploadResult = await uploadFileToS3(filePath, `lr-files/${submissionDate}`);
        
        if (uploadResult.success && uploadResult.url) {
          // Get existing attachments
          const existingAttachments = lrData.attachments || [];
          
          // Check if this file already exists as an attachment (by name)
          const existingIndex = existingAttachments.findIndex(
            (att: any) => att.name === fileName
          );
          
          const attachment = {
            url: uploadResult.url,
            name: fileName,
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          };
          
          // Update or add attachment
          const updatedAttachments = existingIndex >= 0
            ? existingAttachments.map((att: any, idx: number) => 
                idx === existingIndex ? attachment : att
              )
            : [...existingAttachments, attachment];
          
          // Save attachment to LR record
          await updateLR(lrData['LR No'], { attachments: updatedAttachments } as any);
          
          generatedFiles.push({
            lrNo: lrData['LR No'],
            filePath,
            fileName,
            url: uploadResult.url
          });
        } else {
          console.error(`Failed to upload LR file for ${lrData['LR No']}:`, uploadResult.error);
          // Still add to generatedFiles for download, but without URL
          generatedFiles.push({
            lrNo: lrData['LR No'],
            filePath,
            fileName
          });
        }
      } catch (error) {
        console.error(`Error generating LR for ${lrData['LR No']}:`, error);
        console.error('Error details:', error instanceof Error ? error.message : String(error));
        console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
        // Continue with other LRs even if one fails
      }
    }

    if (generatedFiles.length === 0) {
      return NextResponse.json(
        { error: 'Failed to generate any LR files' },
        { status: 500 }
      );
    }

    // If single file, return it directly
    if (generatedFiles.length === 1) {
      const file = generatedFiles[0];
      const fileBuffer = fs.readFileSync(file.filePath);
      
      // Determine content type based on file extension
      const isPdf = file.fileName.endsWith('.pdf');
      const contentType = isPdf 
        ? 'application/pdf' 
        : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      
      return new NextResponse(fileBuffer, {
        headers: {
          'Content-Type': contentType,
          'Content-Disposition': `attachment; filename="${file.fileName}"`,
        },
      });
    }

    // If multiple files, create a ZIP
    const zip = new JSZip();
    
    for (const file of generatedFiles) {
      const fileBuffer = fs.readFileSync(file.filePath);
      zip.file(file.fileName, fileBuffer);
    }

    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });
    const zipFileName = `LR_Print_${selectedLRs.length}_${new Date().toISOString().split('T')[0]}.zip`;

    return new NextResponse(zipBuffer, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${zipFileName}"`,
      },
    });

  } catch (error) {
    console.error('Error in print LR API:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : 'No stack trace';
    console.error('Error details:', errorMessage);
    console.error('Stack trace:', errorStack);
    return NextResponse.json(
      { 
        error: 'Failed to generate LR files',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      },
      { status: 500 }
    );
  }
}

