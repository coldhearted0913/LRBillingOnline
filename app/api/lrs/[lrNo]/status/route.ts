import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// PATCH /api/lrs/[lrNo]/status - Update LR status
export async function PATCH(
  request: NextRequest,
  { params }: { params: { lrNo: string } }
) {
  try {
    const lrNo = decodeURIComponent(params.lrNo);
    const { status } = await request.json();
    
    if (!status) {
      return NextResponse.json(
        { success: false, error: 'Status is required' },
        { status: 400 }
      );
    }
    
    // Valid statuses
    const validStatuses = ['LR Done', 'LR Collected', 'Bill Done', 'Bill Submitted'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { success: false, error: 'Invalid status' },
        { status: 400 }
      );
    }
    
    await prisma.lR.update({
      where: { lrNo },
      data: { status },
    });
    
    return NextResponse.json({ 
      success: true, 
      message: 'Status updated successfully',
      status 
    });
  } catch (error: any) {
    console.error('Status update error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update status' },
      { status: 500 }
    );
  }
}

