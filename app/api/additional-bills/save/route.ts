import { NextRequest, NextResponse } from 'next/server';
import { addLR } from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    console.log('[SAVE API] Received data:', JSON.stringify(data, null, 2));
    
    // Validate required fields
    const requiredFields = ['LR Date', 'LR No', 'Vehicle No', 'Vehicle Type', 'FROM', 'Submission Date', 'Bill No', 'Amount', 'Delivery Count'];
    for (const field of requiredFields) {
      if (!data[field]) {
        console.log(`[SAVE API] Missing field: ${field}`);
        return NextResponse.json(
          { success: false, error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }
    
    console.log('[SAVE API] All required fields present');

    // Store in database as a special LR record
    const lrData = {
      ...data,
      'LR No': `ADDITIONAL-${data['LR No']}`,
      'Vehicle Number': data['Vehicle No'], // Map Vehicle No to Vehicle Number
      'Description of Goods': 'Additional Bill Entry',
      'Quantity': '1',
      'Material Supply To': data['FROM'], // Use FROM as Material Supply To
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
      'Delivery Locations': data['Delivery Locations'] || [],
      'Amount': data['Amount'],
    };
    
    console.log('[SAVE API] Saving to DB with LR No:', lrData['LR No']);
    console.log('[SAVE API] Bill Number:', lrData['Bill Number']);
    
    await addLR(lrData);
    
    console.log('[SAVE API] Successfully saved to database');

    return NextResponse.json({
      success: true,
      message: 'Additional bill entry saved successfully',
      lrNo: lrData['LR No'],
      billNo: lrData['Bill Number']
    });

  } catch (error) {
    console.error('Error saving additional bill entry:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save additional bill entry' },
      { status: 500 }
    );
  }
}
