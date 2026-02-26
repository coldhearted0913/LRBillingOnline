import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { applyApiMiddleware } from '@/lib/middleware/apiMiddleware';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/payments/outstanding
 * Get payment records (all LRs in filter) with summary aligned to filters.
 * Query: startDate, endDate, vehicleType, search (LR No / vehicle number / vehicle type / bill no)
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
    const startDate = searchParams.get('startDate')?.trim() || undefined;
    const endDate = searchParams.get('endDate')?.trim() || undefined;
    const vehicleType = searchParams.get('vehicleType')?.trim() || undefined;
    const search = searchParams.get('search')?.trim() || undefined;

    const where: any = {};

    if (startDate || endDate) {
      where.lrDate = {};
      if (startDate) where.lrDate.gte = startDate;
      if (endDate) where.lrDate.lte = endDate;
    }

    if (vehicleType) {
      where.vehicleType = { equals: vehicleType, mode: 'insensitive' };
    }

    // Search: LR No, vehicle number, vehicle type, bill number (case-insensitive contains)
    if (search) {
      where.OR = [
        { lrNo: { contains: search, mode: 'insensitive' } },
        { vehicleNumber: { contains: search, mode: 'insensitive' } },
        { vehicleType: { contains: search, mode: 'insensitive' } },
        { billNumber: { contains: search, mode: 'insensitive' } },
        { invoiceNo: { contains: search, mode: 'insensitive' } },
      ];
    }

    const lrs = await prisma.lR.findMany({
      where,
      include: {
        payments: {
          where: { status: 'verified' },
        },
      },
      orderBy: [{ lrDate: 'desc' }, { lrNo: 'desc' }],
    });

    const dateOnlyStatus = /^\d{2}-\d{2}-\d{4}$/;

    // Latest CSV snapshot: Payment Status (Paid → outstanding 0, Not Paid → LR amount); use for amount when present
    // If table doesn't exist (migration not run), proceed without snapshot so /payments still loads
    let snapshotRows: Array<{ lrNo: string; paymentStatus: string; amount: number; scheduledPaymentDate: string | null; uploadedAt: Date }> = [];
    try {
      snapshotRows = await prisma.paymentCSVSnapshot.findMany({ orderBy: { uploadedAt: 'desc' } });
    } catch (e: any) {
      // Table may not exist if migration not run (P2021 or "relation does not exist"); skip snapshot
      const isMissingTable = e?.code === 'P2021' || e?.message?.includes('does not exist') || e?.message?.includes('payment_csv_snapshots');
      if (!isMissingTable) console.error('[Payment Records] Snapshot load error:', e);
    }
    const csvMap = new Map<string, { paymentStatus: string; amount: number; scheduledPaymentDate: string | null }>();
    const csvLrNos = new Set<string>();
    if (snapshotRows.length > 0) {
      const batchTime = snapshotRows[0].uploadedAt.getTime();
      const latestRows = snapshotRows.filter((r) => r.uploadedAt.getTime() === batchTime);
      for (const row of latestRows) {
        csvMap.set(row.lrNo, {
          paymentStatus: row.paymentStatus,
          amount: row.amount,
          scheduledPaymentDate: row.scheduledPaymentDate,
        });
        csvLrNos.add(row.lrNo);
      }
    }

    const dbLrNos = new Set(lrs.map((r) => r.lrNo));

    const paymentRecords = lrs.map((lr) => {
      const csv = csvMap.get(lr.lrNo);
      const amountStored = lr.amount;
      const totalPaid = lr.payments.reduce((sum, p) => sum + p.paymentAmount, 0);
      const lastPayment = lr.payments.length > 0
        ? lr.payments.sort((a, b) => b.paymentDate.getTime() - a.paymentDate.getTime())[0]
        : null;
      const paidDateIso = lastPayment ? lastPayment.paymentDate.toISOString() : null;

      if (csv) {
        const isPaid = /fully\s*paid|^paid$/i.test(csv.paymentStatus);
        const amount = csv.amount;
        const outstanding = isPaid ? 0 : csv.amount;
        const paidDateDisplay = isPaid && csv.scheduledPaymentDate ? csv.scheduledPaymentDate : (paidDateIso ?? (dateOnlyStatus.test(lr.status || '') ? lr.status : null));
        return {
          lrNo: lr.lrNo,
          lrDate: lr.lrDate,
          vehicleType: lr.vehicleType,
          vehicleNumber: lr.vehicleNumber,
          billNumber: lr.billNumber,
          invoiceNo: lr.invoiceNo,
          amount,
          totalPaid: isPaid ? amount : totalPaid,
          outstanding,
          paymentCount: lr.payments.length,
          paidDate: paidDateIso,
          paidDateDisplay,
          status: lr.status,
        };
      }

      const amountForCalc = amountStored ?? 0;
      const outstanding =
        amountStored != null
          ? Math.max(0, amountForCalc - totalPaid)
          : null;
      const paidDateDisplay = paidDateIso ?? (dateOnlyStatus.test(lr.status || '') ? lr.status : null);

      return {
        lrNo: lr.lrNo,
        lrDate: lr.lrDate,
        vehicleType: lr.vehicleType,
        vehicleNumber: lr.vehicleNumber,
        billNumber: lr.billNumber,
        invoiceNo: lr.invoiceNo,
        amount: amountStored,
        totalPaid,
        outstanding,
        paymentCount: lr.payments.length,
        paidDate: paidDateIso,
        paidDateDisplay,
        status: lr.status,
      };
    });

    // Records in CSV but not in DB: show with correct amount; Paid → outstanding 0, Not Paid → outstanding = amount
    for (const lrNo of Array.from(csvLrNos)) {
      if (dbLrNos.has(lrNo)) continue;
      const csv = csvMap.get(lrNo)!;
      const isPaid = /fully\s*paid|^paid$/i.test(csv.paymentStatus);
      paymentRecords.push({
        lrNo,
        lrDate: '',
        vehicleType: '',
        vehicleNumber: null,
        billNumber: null,
        invoiceNo: null,
        amount: csv.amount,
        totalPaid: isPaid ? csv.amount : 0,
        outstanding: isPaid ? 0 : csv.amount,
        paymentCount: 0,
        paidDate: null,
        paidDateDisplay: isPaid && csv.scheduledPaymentDate ? csv.scheduledPaymentDate : null,
        status: '',
      });
    }

    const totalLRAmount = paymentRecords.reduce((s, r) => s + (r.amount ?? 0), 0);
    const totalPaid = paymentRecords.reduce((s, r) => s + r.totalPaid, 0);
    const totalOutstanding = paymentRecords.reduce((s, r) => s + (r.outstanding ?? 0), 0);
    const outstandingLRCount = paymentRecords.filter((r) => (r.amount != null || r.outstanding != null) && (r.outstanding ?? 0) > 0).length;

    return NextResponse.json({
      success: true,
      summary: {
        totalRecords: paymentRecords.length,
        totalLRAmount,
        totalPaid,
        totalOutstanding,
        paymentPercentage: totalLRAmount > 0 ? (totalPaid / totalLRAmount) * 100 : 0,
        outstandingLRCount,
      },
      paymentRecords,
    });
  } catch (error: any) {
    console.error('[Payment Records] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch payment records' },
      { status: 500 }
    );
  }
}
