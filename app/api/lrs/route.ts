import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// Ensure API is always dynamic and not statically cached
export const dynamic = 'force-dynamic';
import { getAllLRs, addLR, deleteMultipleLRs, getLRsByMonth, getLRByNumber } from '@/lib/database';
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
    
    // Validate with Zod schema
    const validation = LRSchema.safeParse(mappedData);
    
    if (!validation.success) {
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
    
    // POST creates a NEW LR only. Reject if the LR No already exists so a
    // create request can never silently overwrite an existing record
    // (edits must go through PUT /api/lrs/[lrNo]).
    const lrNo = lrData['LR No'];
    if (lrNo) {
      const existing = await getLRByNumber(lrNo);
      if (existing) {
        return NextResponse.json(
          { success: false, error: 'An LR with this number already exists' },
          { status: 409 }
        );
      }
    }

    // Never allow client-supplied privileged fields on creation. Status always
    // starts at the default, and billing/amount fields are set later by the
    // billing flow — not by the create request.
    delete (lrData as any).status;
    delete (lrData as any)['Amount'];
    delete (lrData as any)['Bill Number'];
    delete (lrData as any)['Bill Submission Date'];

    const success = await addLR(lrData);
    
    if (success) {
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
    // Only CEO and MANAGER can delete LRs (defense-in-depth alongside middleware auth)
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as any)?.role;
    if (!session?.user || (userRole !== 'CEO' && userRole !== 'MANAGER')) {
      return NextResponse.json(
        { success: false, error: 'Forbidden. Only CEO and MANAGER can delete LRs.' },
        { status: 403 }
      );
    }

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

