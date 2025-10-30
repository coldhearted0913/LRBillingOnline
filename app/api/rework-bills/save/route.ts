import { NextRequest, NextResponse } from 'next/server';
import { addLR } from '@/lib/database';
import { VEHICLE_AMOUNTS } from '@/lib/constants';

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    // Validate required fields
    const requiredFields = ['LR Date', 'LR No', 'Vehicle No', 'Vehicle Type', 'FROM', 'TO', 'Submission Date', 'Bill No', 'Amount'];
    for (const field of requiredFields) {
      if (!data[field]) {
        return NextResponse.json(
          { success: false, error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    // Compute rework amount: 80% of regular amount per vehicle type
    const vehicleType = (data['Vehicle Type'] || '').toString();
    const baseAmount = (VEHICLE_AMOUNTS as any)[vehicleType] || 0;
    const reworkAmount = Math.round(baseAmount * 0.8);

    // Store in database as a special LR record
    const lrData = {
      ...data,
      'LR No': `REWORK-${data['LR No']}`,
      'Vehicle Number': data['Vehicle No'], // Map Vehicle No to Vehicle Number
      'Description of Goods': 'Rework Bill Entry',
      'Quantity': '1',
      'Koel Gate Entry No': '',
      'Koel Gate Entry Date': '',
      'Weightslip No': '',
      'Loaded Weight': '',
      'Empty Weight': '',
      'Total No of Invoices': '1',
      'Invoice No': '',
      'GRR No': '',
      'GRR Date': '',
      'status': 'LR Done',
      'Bill Submission Date': data['Submission Date'],
      'Bill Number': data['Bill No'],
      'Amount': reworkAmount,
    };
    
    await addLR(lrData);

    return NextResponse.json({
      success: true,
      message: 'Rework bill entry saved successfully',
      lrNo: lrData['LR No']
    });

  } catch (error) {
    console.error('Error saving rework bill entry:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save rework bill entry' },
      { status: 500 }
    );
  }
}
