import { NextRequest, NextResponse } from 'next/server';
import { addLR, LRData } from '@/lib/database';
import { AdditionalBillSaveSchema } from '@/lib/validations/schemas';
import { sanitizeLRData } from '@/lib/utils/sanitize';
import { applyApiMiddleware } from '@/lib/middleware/apiMiddleware';

export async function POST(request: NextRequest) {
  // Apply rate limiting and CSRF protection
  const middlewareResponse = await applyApiMiddleware(request);
  if (middlewareResponse) return middlewareResponse;

  try {
    const data = await request.json();
    
    console.log('[SAVE API] Received data:', JSON.stringify(data, null, 2));
    
    // SECURITY: Validate with Zod schema
    const validation = AdditionalBillSaveSchema.safeParse(data);
    
    if (!validation.success) {
      const errors = validation.error.issues.map(err => ({
        field: err.path.join('.'),
        message: err.message
      }));
      
      console.log('[SAVE API] Validation failed:', errors);
      
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
    
    console.log('[SAVE API] Validation passed, data sanitized');

    // Store in database as a special LR record
    const lrData = {
      ...sanitizedData,
      'LR No': `ADDITIONAL-${sanitizedData['LR No']}`,
      'FROM': sanitizedData['FROM'] || '',
      'TO': sanitizedData['TO'] || '',
      'Consignor': sanitizedData['Consignor'] || '',
      'Consignee': sanitizedData['Consignee'] || '',
      'Vehicle Number': sanitizedData['Vehicle No'], // Map Vehicle No to Vehicle Number
      'Description of Goods': 'Additional Bill Entry',
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
      'Delivery Locations': sanitizedData['Delivery Locations'] || [],
      'Amount': typeof sanitizedData['Amount'] === 'number' ? sanitizedData['Amount'] : Number(sanitizedData['Amount']),
    } as LRData;
    
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
