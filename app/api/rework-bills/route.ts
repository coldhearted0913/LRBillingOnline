import { NextRequest, NextResponse } from 'next/server';
import { generateReworkBill } from '@/lib/excelGenerator';
import { uploadFileToS3 } from '@/lib/s3Upload';
import { addLR } from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    // Validate required fields
    const requiredFields = ['LR Date', 'LR No', 'Vehicle No', 'Vehicle Type', 'FROM', 'TO', 'Submission Date', 'Amount'];
    for (const field of requiredFields) {
      if (!data[field]) {
        return NextResponse.json(
          { success: false, error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    // Generate Excel file
    const filePath = await generateReworkBill(data, data['Submission Date']);
    
    // Upload to S3
    const sanitizedBillNo = data['Bill No'].replace(/\//g, '_');
    const s3Result = await uploadFileToS3(filePath, `rework-bills/${sanitizedBillNo}_${data['Submission Date']}.xlsx`);
    
    // Store in database as a special LR record
    const lrData = {
      ...data,
      'LR No': `REWORK-${data['LR No']}`,
      'Description of Goods': 'Rework Bill',
      'Quantity': '1',
      'Material Supply To': data['TO'],
      'Koel Gate Entry No': '',
      'Koel Gate Entry Date': '',
      'Weightslip No': '',
      'Loaded Weight': '',
      'Empty Weight': '',
      'Total No of Invoices': '1',
      'Invoice No': '',
      'GRR No': '',
      'GRR Date': '',
      'status': 'Bill Done'
    };
    
    await addLR(lrData);

    return NextResponse.json({
      success: true,
      message: 'Rework bill generated successfully',
      filePath,
      s3Url: s3Result.url,
      lrNo: lrData['LR No']
    });

  } catch (error) {
    console.error('Error generating rework bill:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate rework bill' },
      { status: 500 }
    );
  }
}
