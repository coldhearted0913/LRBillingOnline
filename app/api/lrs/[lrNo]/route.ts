import { NextRequest, NextResponse } from 'next/server';
import { getLRByNumber, updateLR, deleteLR } from '@/lib/database';
import { sanitizeLRData } from '@/lib/utils/sanitize';
import { applyApiMiddleware } from '@/lib/middleware/apiMiddleware';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// GET /api/lrs/[lrNo] - Get specific LR
export async function GET(
  request: NextRequest,
  { params }: { params: { lrNo: string } }
) {
  try {
    const lrNo = decodeURIComponent(params.lrNo);
    const lr = await getLRByNumber(lrNo);
    
    if (lr) {
      return NextResponse.json({ success: true, lr });
    } else {
      return NextResponse.json(
        { success: false, error: 'LR not found' },
        { status: 404 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch LR' },
      { status: 500 }
    );
  }
}

// PUT /api/lrs/[lrNo] - Update LR
export async function PUT(
  request: NextRequest,
  { params }: { params: { lrNo: string } }
) {
  // Apply rate limiting and CSRF protection
  const middlewareResponse = await applyApiMiddleware(request);
  if (middlewareResponse) return middlewareResponse;

  try {
    const lrNo = decodeURIComponent(params.lrNo);
    let lrData = await request.json();
    
    // Sanitize user input to prevent XSS and injection attacks
    lrData = sanitizeLRData(lrData);
    
    const success = await updateLR(lrNo, lrData);
    
    if (success) {
      return NextResponse.json({ success: true, message: 'LR updated successfully' });
    } else {
      return NextResponse.json(
        { success: false, error: 'Failed to update LR' },
        { status: 500 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to update LR' },
      { status: 500 }
    );
  }
}

// DELETE /api/lrs/[lrNo] - Delete LR
export async function DELETE(
  request: NextRequest,
  { params }: { params: { lrNo: string } }
) {
  // Apply rate limiting and CSRF protection
  const middlewareResponse = await applyApiMiddleware(request);
  if (middlewareResponse) return middlewareResponse;

  try {
    // Check authorization - only CEO and MANAGER can delete LRs
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userRole = (session.user as any)?.role;
    if (userRole !== 'CEO' && userRole !== 'MANAGER') {
      return NextResponse.json(
        { success: false, error: 'Forbidden. Only CEO and MANAGER can delete LRs.' },
        { status: 403 }
      );
    }

    const lrNo = decodeURIComponent(params.lrNo);
    const deletedBy = (session.user as any)?.email || (session.user as any)?.id;
    const success = await deleteLR(lrNo, deletedBy);
    
    if (success) {
      return NextResponse.json({ success: true, message: 'LR deleted successfully' });
    } else {
      return NextResponse.json(
        { success: false, error: 'Failed to delete LR' },
        { status: 500 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to delete LR' },
      { status: 500 }
    );
  }
}

