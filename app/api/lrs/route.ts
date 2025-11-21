import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// Ensure API is always dynamic and not statically cached
export const dynamic = 'force-dynamic';
import { getAllLRs, addLR, deleteMultipleLRs, getLRsByMonth } from '@/lib/database';
import { LRSchema } from '@/lib/validations/schemas';
import { applyApiMiddleware } from '@/lib/middleware/apiMiddleware';
import { sanitizeLRData } from '@/lib/utils/sanitize';

// GET /api/lrs - Get all LRs or filter by month
export async function GET(request: NextRequest) {
  // Apply rate limiting and CSRF protection
  const middlewareResponse = await applyApiMiddleware(request);
  if (middlewareResponse) return middlewareResponse;
  try {
    const searchParams = request.nextUrl.searchParams;
    const year = searchParams.get('year');
    const month = searchParams.get('month');
    
    let lrs;
    if (year && month) {
      lrs = await getLRsByMonth(parseInt(year), parseInt(month));
    } else {
      lrs = await getAllLRs();
    }
    
    return NextResponse.json(
      { success: true, lrs },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    // Track error with Sentry
    const { trackApiError } = await import('@/lib/utils/errorTracking');
    trackApiError(error instanceof Error ? error : new Error(String(error)), {
      endpoint: '/api/lrs',
      method: 'GET',
    });
    
    return NextResponse.json(
      { success: false, error: 'Failed to fetch LRs' },
      { status: 500 }
    );
  }
}

// POST /api/lrs - Create new LR
export async function POST(request: NextRequest) {
  // Apply rate limiting and CSRF protection
  const middlewareResponse = await applyApiMiddleware(request);
  if (middlewareResponse) return middlewareResponse;

  try {
    let lrData = await request.json();
    
    console.log('[POST /api/lrs] Received data:', JSON.stringify(lrData, null, 2));
    
    // Sanitize user input to prevent XSS and injection attacks
    lrData = sanitizeLRData(lrData);
    
    // Map API field names to schema field names
    const mappedData = {
      lrNo: lrData['LR No'],
      lrDate: lrData['LR Date'],
      vehicleNumber: lrData['Vehicle Number'],
      vehicleType: lrData['Vehicle Type'],
      driverName: lrData['Driver Name'] || '',
      driverNumber: lrData['Driver Number'] || '',
      fromLocation: lrData['FROM'],
      toLocation: lrData['TO'],
      consignor: lrData['Consignor'],
      consignee: lrData['Consignee'],
      loadedWeight: lrData['Loaded Weight'],
      emptyWeight: lrData['Empty Weight'],
      descriptionOfGoods: lrData['Description of Goods'],
      quantity: lrData['Quantity'],
      koelGateEntryNo: lrData['Koel Gate Entry No'] || lrData['KOEL Gate Entry No'] || '',
      koelGateEntryDate: lrData['Koel Gate Entry Date'] || lrData['KOEL Gate Entry Date'] || '',
      weightslipNo: lrData['Weightslip No'] || lrData['Weight Slip No'] || '',
      totalNoOfInvoices: lrData['Total No of Invoices'] || lrData['Total No of Invoices'] || '',
      invoiceNo: lrData['Invoice No'] || '',
      grrNo: lrData['GRR No'] || '',
      grrDate: lrData['GRR Date'] || '',
      remark: lrData['Remark'] || lrData['remark'] || '',
    };
    
    console.log('[POST /api/lrs] Mapped data:', JSON.stringify(mappedData, null, 2));
    
    // Validate with Zod schema
    const validation = LRSchema.safeParse(mappedData);
    
    if (!validation.success) {
      console.error('[POST /api/lrs] Validation errors:', validation.error.issues);
      const errors = validation.error.issues.map(err => ({
        field: err.path.join('.'),
        message: err.message
      }));
      
      return NextResponse.json(
        { 
          success: false, 
          error: 'Validation failed', 
          details: errors 
        },
        { status: 400 }
      );
    }
    
    console.log('[POST /api/lrs] Validation passed, saving to DB...');
    const success = await addLR(lrData);
    
    if (success) {
      console.log('[POST /api/lrs] LR created successfully');
      return NextResponse.json(
        { success: true, message: 'LR created successfully' },
        { headers: { 'Cache-Control': 'no-store' } }
      );
    } else {
      console.error('[POST /api/lrs] Failed to create LR in database');
      return NextResponse.json(
        { success: false, error: 'Failed to create LR' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('[POST /api/lrs] Error creating LR:', error);
    
    // Track error with Sentry
    try {
      const session = await getServerSession(authOptions);
      const { trackApiError } = await import('@/lib/utils/errorTracking');
      trackApiError(error instanceof Error ? error : new Error(String(error)), {
        endpoint: '/api/lrs',
        method: 'POST',
        userEmail: session?.user?.email || undefined,
        userRole: (session?.user as any)?.role,
        metadata: {
          // Metadata available from error context
        },
      });
    } catch (trackingError) {
      // If error tracking fails, continue with error response
      console.error("Failed to track error:", trackingError);
    }
    
    return NextResponse.json(
      { success: false, error: 'Failed to create LR' },
      { status: 500 }
    );
  }
}

// DELETE /api/lrs - Delete multiple LRs
export async function DELETE(request: NextRequest) {
  // Apply rate limiting and CSRF protection
  const middlewareResponse = await applyApiMiddleware(request);
  if (middlewareResponse) return middlewareResponse;

  try {
    const { lrNumbers } = await request.json();
    
    if (!Array.isArray(lrNumbers) || lrNumbers.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid LR numbers' },
        { status: 400 }
      );
    }

    // Prevent DoS attacks by limiting batch size
    if (lrNumbers.length > 100) {
      return NextResponse.json(
        { success: false, error: 'Too many LR numbers. Maximum 100 at a time.' },
        { status: 400 }
      );
    }
    
    const success = await deleteMultipleLRs(lrNumbers);
    
    if (success) {
      return NextResponse.json(
        { success: true, message: 'LRs deleted successfully' },
        { headers: { 'Cache-Control': 'no-store' } }
      );
    } else {
      return NextResponse.json(
        { success: false, error: 'Failed to delete LRs' },
        { status: 500 }
      );
    }
  } catch (error) {
    // Track error with Sentry
    const session = await getServerSession(authOptions).catch(() => null);
    const { trackApiError } = await import('@/lib/utils/errorTracking');
    
    trackApiError(error instanceof Error ? error : new Error(String(error)), {
      endpoint: '/api/lrs',
      method: 'DELETE',
      userEmail: session?.user?.email || undefined,
      userRole: (session?.user as any)?.role,
    });
    
    return NextResponse.json(
      { success: false, error: 'Failed to delete LRs' },
      { status: 500 }
    );
  }
}

