import { NextRequest, NextResponse } from 'next/server';
import { addLR, LRData } from '@/lib/database';
import { VEHICLE_AMOUNTS } from '@/lib/constants';
import { ReworkBillSaveSchema } from '@/lib/validations/schemas';
import { sanitizeLRData } from '@/lib/utils/sanitize';
import { applyApiMiddleware } from '@/lib/middleware/apiMiddleware';

export async function POST(request: NextRequest) {
  // Apply rate limiting and CSRF protection
  const middlewareResponse = await applyApiMiddleware(request);
  if (middlewareResponse) return middlewareResponse;

  try {
    const data = await request.json();
    
    // SECURITY: Validate with Zod schema
    const validation = ReworkBillSaveSchema.safeParse(data);
    
    if (!validation.success) {
      const errors = validation.error.issues.map(err => ({
        field: err.path.join('.'),
        message: err.message
      }));
      
      console.log('[REWORK SAVE API] Validation failed:', errors);
      
      return NextResponse.json(
        { 
          success: false, 
          error: 'Validation failed',
          details: errors
        },
        { status: 400 }
      );
    }
    
    // SECURITY: Sanitize user input to prevent XSS and injection attacks
    const sanitizedData = sanitizeLRData(validation.data as any);

    // Compute rework amount: 80% of regular amount per vehicle type
    const vehicleType = (sanitizedData['Vehicle Type'] || '').toString();
    const baseAmount = (VEHICLE_AMOUNTS as any)[vehicleType] || 0;
    const reworkAmount = Math.round(baseAmount * 0.8);

    // Store in database as a special LR record
    const lrData = {
      ...sanitizedData,
      'LR No': `REWORK-${sanitizedData['LR No']}`,
      'FROM': sanitizedData['FROM'] || '',
      'TO': sanitizedData['TO'] || '',
      'Consignor': sanitizedData['Consignor'] || '',
      'Consignee': sanitizedData['Consignee'] || '',
      'Vehicle Number': sanitizedData['Vehicle No'], // Map Vehicle No to Vehicle Number
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
      'Bill Submission Date': sanitizedData['Submission Date'],
      'Bill Number': sanitizedData['Bill No'],
      'Amount': reworkAmount,
    } as LRData;
    
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
