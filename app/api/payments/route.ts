import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { applyApiMiddleware } from '@/lib/middleware/apiMiddleware';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/payments
 * Get payments with optional filters
 */
export async function GET(request: NextRequest) {
  const middlewareResponse = await applyApiMiddleware(request);
  if (middlewareResponse) return middlewareResponse;

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const lrNo = searchParams.get('lrNo');
    const lrId = searchParams.get('lrId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const status = searchParams.get('status');

    const where: any = {};

    if (lrNo) {
      where.lrNo = lrNo;
    }

    if (lrId) {
      where.lrId = lrId;
    }

    if (startDate || endDate) {
      where.paymentDate = {};
      if (startDate) {
        where.paymentDate.gte = new Date(startDate);
      }
      if (endDate) {
        where.paymentDate.lte = new Date(endDate);
      }
    }

    if (status) {
      where.status = status;
    }

    const payments = await prisma.payment.findMany({
      where,
      include: {
        lr: {
          select: {
            lrNo: true,
            amount: true,
            billNumber: true,
            invoiceNo: true,
          },
        },
      },
      orderBy: {
        paymentDate: 'desc',
      },
    });

    return NextResponse.json({
      success: true,
      payments,
      count: payments.length,
    });
  } catch (error: any) {
    console.error('[Get Payments] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch payments' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/payments
 * Manually create a payment record
 */
export async function POST(request: NextRequest) {
  const middlewareResponse = await applyApiMiddleware(request);
  if (middlewareResponse) return middlewareResponse;

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      lrId,
      lrNo,
      billNumber,
      invoiceNo,
      paymentAmount,
      paymentDate,
      paymentMethod,
      referenceNumber,
      bankName,
      transactionId,
      notes,
    } = body;

    if (!paymentAmount || !paymentDate) {
      return NextResponse.json(
        { error: 'Payment amount and date are required' },
        { status: 400 }
      );
    }

    // If lrNo is provided, find the LR
    let finalLrId = lrId;
    if (lrNo && !lrId) {
      const lr = await prisma.lR.findUnique({
        where: { lrNo },
      });
      if (lr) {
        finalLrId = lr.id;
      }
    }

    const payment = await prisma.payment.create({
      data: {
        lrId: finalLrId,
        lrNo: lrNo || undefined,
        billNumber,
        invoiceNo,
        paymentAmount: parseFloat(paymentAmount),
        paymentDate: new Date(paymentDate),
        paymentMethod: paymentMethod || 'Manual',
        referenceNumber,
        bankName,
        transactionId,
        status: 'verified',
        source: 'manual',
        notes,
        syncedBy: session.user.email,
      },
      include: {
        lr: {
          select: {
            lrNo: true,
            amount: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      payment,
    });
  } catch (error: any) {
    console.error('[Create Payment] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create payment' },
      { status: 500 }
    );
  }
}

