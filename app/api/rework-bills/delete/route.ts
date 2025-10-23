import { NextRequest, NextResponse } from 'next/server';
import { deleteLR } from '@/lib/database';

export async function DELETE(request: NextRequest) {
  try {
    const data = await request.json();
    const { lrNo, billNo } = data;

    if (!lrNo || !billNo) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Delete the LR entry
    await deleteLR(lrNo);

    return NextResponse.json({
      success: true,
      message: 'Rework bill entry deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting rework bill entry:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete rework bill entry' },
      { status: 500 }
    );
  }
}
