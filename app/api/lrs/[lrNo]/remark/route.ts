import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// PATCH /api/lrs/[lrNo]/remark - Update LR remark
export async function PATCH(
  request: NextRequest,
  { params }: { params: { lrNo: string } }
) {
  try {
    const lrNo = decodeURIComponent(params.lrNo);
    const { remark } = await request.json();
    
    await prisma.lR.update({
      where: { lrNo },
      data: { remark },
    });
    
    return NextResponse.json({ 
      success: true, 
      message: 'Remark updated successfully'
    });
  } catch (error: any) {
    console.error('Remark update error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update remark' },
      { status: 500 }
    );
  }
}
