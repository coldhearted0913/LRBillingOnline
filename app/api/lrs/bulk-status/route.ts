import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// PATCH /api/lrs/bulk-status - Update status for multiple LRs
export async function PATCH(request: NextRequest) {
  try {
    const { lrNumbers, status } = await request.json();
    
    if (!Array.isArray(lrNumbers) || lrNumbers.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No LR numbers provided' },
        { status: 400 }
      );
    }
    
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
    
    // Update all selected LRs
    await prisma.lR.updateMany({
      where: {
        lrNo: {
          in: lrNumbers,
        },
      },
      data: {
        status,
      },
    });
    
    return NextResponse.json({ 
      success: true, 
      message: `Updated ${lrNumbers.length} LR(s) to status: ${status}`,
      count: lrNumbers.length,
      status,
    });
  } catch (error: any) {
    console.error('Bulk status update error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update status' },
      { status: 500 }
    );
  }
}

