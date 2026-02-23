import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { applyApiMiddleware } from '@/lib/middleware/apiMiddleware';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/payments/history/[lrNo]
 * Get payment history for a specific LR
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { lrNo: string } }
) {
  const middlewareResponse = await applyApiMiddleware(request);
  if (middlewareResponse) return middlewareResponse;

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const lrNo = decodeURIComponent(params.lrNo);

    // Find LR
    const lr = await prisma.lR.findUnique({
      where: { lrNo },
      include: {
        payments: {
          orderBy: {
            paymentDate: 'desc',
          },
        },
      },
    });

    if (!lr) {
      return NextResponse.json(
        { error: 'LR not found' },
        { status: 404 }
      );
    }

    const lrAmount = lr.amount || 0;
    const totalPaid = lr.payments.reduce((sum, p) => sum + p.paymentAmount, 0);
    const outstanding = Math.max(0, lrAmount - totalPaid);

    // Calculate payment breakdown
    const positivePayments = lr.payments.filter((p) => p.paymentAmount > 0);
    const creditMemos = lr.payments.filter((p) => p.paymentAmount < 0);

    return NextResponse.json({
      success: true,
      lr: {
        lrNo: lr.lrNo,
        lrDate: lr.lrDate,
        vehicleType: lr.vehicleType,
        billNumber: lr.billNumber,
        invoiceNo: lr.invoiceNo,
        amount: lrAmount,
        status: lr.status,
      },
      summary: {
        totalAmount: lrAmount,
        totalPaid,
        outstanding,
        paymentCount: lr.payments.length,
        positivePaymentCount: positivePayments.length,
        creditMemoCount: creditMemos.length,
        paymentPercentage: lrAmount > 0 ? (totalPaid / lrAmount) * 100 : 0,
      },
      payments: lr.payments.map((p) => ({
        id: p.id,
        paymentAmount: p.paymentAmount,
        paymentDate: p.paymentDate,
        paymentMethod: p.paymentMethod,
        referenceNumber: p.referenceNumber,
        bankName: p.bankName,
        transactionId: p.transactionId,
        status: p.status,
        source: p.source,
        notes: p.notes,
        syncedAt: p.syncedAt,
        syncedBy: p.syncedBy,
      })),
    });
  } catch (error: any) {
    console.error('[Payment History] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch payment history' },
      { status: 500 }
    );
  }
}

