import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * PUT /api/lrs/status
 * Update LR status
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only CEO and MANAGER can update status (role is added in auth callbacks)
    const userRole = (session.user as { role?: string })?.role;
    if (userRole !== 'CEO' && userRole !== 'MANAGER') {
      return NextResponse.json(
        { error: 'Forbidden. Only CEO and MANAGER can update status.' },
        { status: 403 }
      );
    }

    const { lrNo, status } = await request.json();

    if (!lrNo || !status) {
      return NextResponse.json(
        { error: 'LR No and status are required' },
        { status: 400 }
      );
    }

    // Check if LR exists
    const lr = await prisma.lR.findUnique({
      where: { lrNo },
    });

    if (!lr) {
      return NextResponse.json(
        { error: 'LR not found' },
        { status: 404 }
      );
    }

    // Allow status change even if payment exists (status is now editable)

    // Update status
    await prisma.lR.update({
      where: { lrNo },
      data: { status },
    });

    return NextResponse.json({
      success: true,
      message: 'Status updated successfully',
    });
  } catch (error: any) {
    console.error('[Update Status] Error:', error);
    return NextResponse.json(
      { error: 'Failed to update status', details: error.message },
      { status: 500 }
    );
  }
}

