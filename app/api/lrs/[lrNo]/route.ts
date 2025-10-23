import { NextRequest, NextResponse } from 'next/server';
import { getLRByNumber, updateLR, deleteLR } from '@/lib/database';

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
  try {
    const lrNo = decodeURIComponent(params.lrNo);
    const lrData = await request.json();
    
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
  try {
    const lrNo = decodeURIComponent(params.lrNo);
    const success = await deleteLR(lrNo);
    
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

