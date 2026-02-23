import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { applyApiMiddleware } from '@/lib/middleware/apiMiddleware';
import { parse } from 'csv-parse/sync';

// Force longer timeout for this route (Next.js 14+)
export const maxDuration = 120;

/**
 * POST /api/payments/check-balance
 * Upload Oracle EBS CSV and check payment status based on Balance Amount column.
 *
 * Two modes:
 *   - action=check  (default): Parse CSV & compare with DB — fast, read-only
 *   - action=mark:  Mark the specified LR numbers as paid in DB
 */
export async function POST(request: NextRequest) {
  const middlewareResponse = await applyApiMiddleware(request);
  if (middlewareResponse) return middlewareResponse;

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = (session.user as any)?.role;
    if (userRole !== 'CEO' && userRole !== 'MANAGER') {
      return NextResponse.json(
        { error: 'Forbidden. Only CEO and MANAGER can check payments.' },
        { status: 403 }
      );
    }

    const contentType = request.headers.get('content-type') || '';

    // ── ACTION: MARK (JSON body) ──────────────────────────────────
    if (contentType.includes('application/json')) {
      return handleMark(request, session.user.email);
    }

    // ── ACTION: CHECK (FormData / file upload) ────────────────────
    return handleCheck(request, session.user.email);
  } catch (error: any) {
    console.error('[Check Balance] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process request', details: error.message },
      { status: 500 }
    );
  }
}

// ─── CHECK: parse CSV & return results (no DB writes) ─────────────
async function handleCheck(request: NextRequest, userEmail: string) {
  const formData = await request.formData();
  const file = formData.get('file') as File;

  if (!file) {
    return NextResponse.json({ error: 'CSV file is required' }, { status: 400 });
  }
  if (!file.name.toLowerCase().endsWith('.csv')) {
    return NextResponse.json(
      { error: 'Only CSV files are supported. Please export from Oracle EBS as CSV.' },
      { status: 400 }
    );
  }

  // Parse CSV
  const fileContent = await file.text();
  let rawRows: any[];
  try {
    rawRows = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true,
      relax_quotes: true,
    });
  } catch (parseError: any) {
    console.error('[Check Balance] CSV parse error:', parseError);
    return NextResponse.json(
      { error: 'Failed to parse CSV file. Please check the file format.' },
      { status: 400 }
    );
  }

  if (rawRows.length === 0) {
    return NextResponse.json(
      { error: 'CSV file is empty or has no data rows.' },
      { status: 400 }
    );
  }

  // ── Build column map ONCE from the header row ──────────────────
  const sampleKeys = Object.keys(rawRows[0]);
  console.log('[Check Balance] CSV columns:', sampleKeys);

  const colMap = buildColumnMap(sampleKeys);

  if (!colMap.invoiceNo) {
    return NextResponse.json(
      { error: 'Could not find "Invoice No." column in the CSV. Available columns: ' + sampleKeys.join(', ') },
      { status: 400 }
    );
  }

  // ── Parse all rows in one pass ─────────────────────────────────
  const lrPattern = /MT\/\d{2}-\d{2}\/\d+/i;

  interface ParsedRow {
    invoiceNo: string;
    invoiceType: string;
    totalAmount: number;
    balanceAmount: number;
    paymentStatus: string;
    invoiceDate: string;
    scheduledPaymentDate: string;
    paymentMethod: string;
    supplierSite: string;
    extractedLRNo: string;
  }

  const lrMap = new Map<string, { standard?: ParsedRow; creditMemo?: ParsedRow }>();

  for (const row of rawRows) {
    const invoiceNo = (row[colMap.invoiceNo] || '').toString().trim();
    if (!invoiceNo) continue;

    const invoiceType = colMap.invoiceType ? (row[colMap.invoiceType] || '').toString().trim() : '';
    const balanceStr = colMap.balanceAmount ? (row[colMap.balanceAmount] || '').toString().trim() : '';
    const totalStr = colMap.totalAmount ? (row[colMap.totalAmount] || '0').toString().trim() : '0';
    const paymentStatus = colMap.paymentStatus ? (row[colMap.paymentStatus] || '').toString().trim() : '';
    const invoiceDate = colMap.invoiceDate ? (row[colMap.invoiceDate] || '').toString().trim() : '';
    const scheduledPaymentDate = colMap.scheduledPaymentDate ? (row[colMap.scheduledPaymentDate] || '').toString().trim() : '';
    const paymentMethod = colMap.paymentMethod ? (row[colMap.paymentMethod] || '').toString().trim() : '';
    const supplierSite = colMap.supplierSite ? (row[colMap.supplierSite] || '').toString().trim() : '';

    const lrMatch = invoiceNo.match(lrPattern);
    const extractedLRNo = lrMatch ? lrMatch[0] : invoiceNo;

    const parsed: ParsedRow = {
      invoiceNo,
      invoiceType,
      totalAmount: parseFloat(totalStr.replace(/,/g, '').replace(/\s/g, '')) || 0,
      balanceAmount: balanceStr === '' ? -1 : parseFloat(balanceStr.replace(/,/g, '').replace(/\s/g, '')) ?? -1,
      paymentStatus,
      invoiceDate,
      scheduledPaymentDate,
      paymentMethod,
      supplierSite,
      extractedLRNo,
    };

    if (!lrMap.has(extractedLRNo)) {
      lrMap.set(extractedLRNo, {});
    }
    const entry = lrMap.get(extractedLRNo)!;

    const typeLower = invoiceType.toLowerCase();
    if (typeLower === 'credit memo' || typeLower === 'credit' || invoiceNo.includes('-TDS-CM-')) {
      entry.creditMemo = parsed;
    } else {
      entry.standard = parsed;
    }
  }

  // ── Classify paid vs unpaid ────────────────────────────────────
  interface LRStatus {
    lrNo: string;
    invoiceNo: string;
    invoiceDate: string;
    scheduledPaymentDate: string;
    totalAmount: number;
    balanceAmount: number;
    tdsAmount: number;
    isPaid: boolean;
    paymentMethod: string;
    supplierSite: string;
  }

  const paidLRs: LRStatus[] = [];
  const unpaidLRs: LRStatus[] = [];

  for (const [lrNo, records] of lrMap) {
    const std = records.standard;
    if (!std) continue;

    const tds = records.creditMemo ? Math.abs(records.creditMemo.totalAmount) : 0;

    const isPaidByBalance = std.balanceAmount >= 0 && std.balanceAmount === 0;
    const isPaidByStatus = /fully\s*paid|^paid$/i.test(std.paymentStatus);
    const isPaid = std.balanceAmount >= 0 ? isPaidByBalance : isPaidByStatus;

    const status: LRStatus = {
      lrNo,
      invoiceNo: std.invoiceNo,
      invoiceDate: std.invoiceDate,
      scheduledPaymentDate: std.scheduledPaymentDate,
      totalAmount: std.totalAmount,
      balanceAmount: std.balanceAmount >= 0 ? std.balanceAmount : 0,
      tdsAmount: tds,
      isPaid,
      paymentMethod: std.paymentMethod,
      supplierSite: std.supplierSite,
    };

    if (status.isPaid) {
      paidLRs.push(status);
    } else {
      unpaidLRs.push(status);
    }
  }

  // ── Single DB query to check existing status ───────────────────
  const { prisma } = await import('@/lib/prisma');

  const allLRNos = [...paidLRs, ...unpaidLRs].map((lr) => lr.lrNo);

  // Batch into chunks of 500 to avoid huge IN clauses
  const dbLRMap = new Map<string, { id: string; status: string; lrNo: string }>();
  for (let i = 0; i < allLRNos.length; i += 500) {
    const chunk = allLRNos.slice(i, i + 500);
    const results = await prisma.lR.findMany({
      where: { lrNo: { in: chunk } },
      select: { id: true, lrNo: true, status: true },
    });
    for (const r of results) {
      dbLRMap.set(r.lrNo, r);
    }
  }

  // ── Categorise ─────────────────────────────────────────────────
  const datePattern = /^\d{2}-\d{2}-\d{4}$/;

  const newlyPaid: Array<LRStatus & { dbId: string; dbStatus: string }> = [];
  const alreadyPaid: Array<LRStatus & { dbStatus: string }> = [];
  const notInDB: LRStatus[] = [];

  for (const lr of paidLRs) {
    const db = dbLRMap.get(lr.lrNo);
    if (!db) { notInDB.push(lr); continue; }

    if (datePattern.test(db.status || '')) {
      alreadyPaid.push({ ...lr, dbStatus: db.status });
    } else {
      newlyPaid.push({ ...lr, dbId: db.id, dbStatus: db.status });
    }
  }

  // Save CSV snapshot so Payment Records can use Payment Status and amount (paid → outstanding 0, not paid → LR amount; include not-in-DB with amount)
  const allCSVLrs = [...paidLRs, ...unpaidLRs];
  if (allCSVLrs.length > 0) {
    try {
      const uploadedAt = new Date();
      await prisma.paymentCSVSnapshot.deleteMany({});
      await prisma.paymentCSVSnapshot.createMany({
        data: allCSVLrs.map((lr) => ({
          lrNo: lr.lrNo,
          paymentStatus: lr.isPaid ? 'Fully Paid' : 'Not Paid',
          amount: lr.totalAmount,
          scheduledPaymentDate: lr.scheduledPaymentDate || null,
          uploadedAt,
        })),
      });
    } catch (e: any) {
      // Table may not exist if migration not run; check still succeeds, snapshot just not saved
      if (e?.code !== 'P2021' && !e?.message?.includes('does not exist')) console.error('[Check balance] Snapshot save error:', e);
    }
  }

  return NextResponse.json({
    success: true,
    summary: {
      totalCSVRecords: rawRows.length,
      totalLRs: lrMap.size,
      paidCount: paidLRs.length,
      unpaidCount: unpaidLRs.length,
      newlyPaidCount: newlyPaid.length,
      alreadyPaidCount: alreadyPaid.length,
      notInDBCount: notInDB.length,
      markedCount: 0,
    },
    newlyPaid: newlyPaid.map((lr) => ({
      lrNo: lr.lrNo,
      dbId: lr.dbId,
      invoiceNo: lr.invoiceNo,
      invoiceDate: lr.invoiceDate,
      scheduledPaymentDate: lr.scheduledPaymentDate,
      totalAmount: lr.totalAmount,
      tdsAmount: lr.tdsAmount,
      netAmount: lr.totalAmount - lr.tdsAmount,
      paymentMethod: lr.paymentMethod,
      previousStatus: lr.dbStatus,
    })),
    alreadyPaid: alreadyPaid.map((lr) => ({
      lrNo: lr.lrNo,
      invoiceNo: lr.invoiceNo,
      totalAmount: lr.totalAmount,
      markedDate: lr.dbStatus,
    })),
    unpaid: unpaidLRs.map((lr) => ({
      lrNo: lr.lrNo,
      invoiceNo: lr.invoiceNo,
      invoiceDate: lr.invoiceDate,
      totalAmount: lr.totalAmount,
      balanceAmount: lr.balanceAmount,
      supplierSite: lr.supplierSite,
    })),
    notInDB: notInDB.map((lr) => ({
      lrNo: lr.lrNo,
      invoiceNo: lr.invoiceNo,
      totalAmount: lr.totalAmount,
      isPaid: lr.isPaid,
    })),
  });
}

// ─── MARK: batch-update paid LRs (JSON body) ─────────────────────
async function handleMark(request: NextRequest, userEmail: string) {
  const body = await request.json();
  const lrsToMark: Array<{
    lrNo: string;
    dbId: string;
    invoiceNo: string;
    invoiceDate: string;
    scheduledPaymentDate?: string;
    totalAmount: number;
    tdsAmount: number;
    paymentMethod: string;
  }> = body.lrs;

  if (!lrsToMark || lrsToMark.length === 0) {
    return NextResponse.json({ error: 'No LRs to mark' }, { status: 400 });
  }

  const { prisma } = await import('@/lib/prisma');

  const today = new Date();

  let markedCount = 0;
  const errors: string[] = [];

  // Process in batches of 20 using transactions
  for (let i = 0; i < lrsToMark.length; i += 20) {
    const batch = lrsToMark.slice(i, i + 20);

    try {
      await prisma.$transaction(
        batch.flatMap((lr) => {
          // Use Scheduled Payment Date from CSV (payment cycle date: Tue/Fri when amount was paid)
          const paymentDate = (lr.scheduledPaymentDate && lr.scheduledPaymentDate.trim())
            ? parseOracleDate(lr.scheduledPaymentDate.trim())
            : (lr.invoiceDate ? parseOracleDate(lr.invoiceDate) : today);
          const dateStr = formatDDMMYYYY(paymentDate);
          const ops = [
            // Update LR status with the paid date from CSV (scheduled payment date)
            prisma.lR.update({
              where: { id: lr.dbId },
              data: {
                status: dateStr,
                remark: `Payment confirmed ${dateStr}`,
              },
            }),
            // Create payment record
            prisma.payment.create({
              data: {
                lrId: lr.dbId,
                lrNo: lr.lrNo,
                invoiceNo: lr.invoiceNo,
                paymentAmount: lr.totalAmount - (lr.tdsAmount || 0),
                paymentDate,
                paymentMethod: lr.paymentMethod || 'CHECK',
                status: 'verified',
                source: 'oracle_ebs',
                notes: `Balance check - Invoice: ${lr.invoiceNo}, TDS: ₹${lr.tdsAmount || 0}`,
                syncedBy: userEmail,
              },
            }),
          ];

          // TDS deduction record
          if (lr.tdsAmount > 0) {
            ops.push(
              prisma.payment.create({
                data: {
                  lrId: lr.dbId,
                  lrNo: lr.lrNo,
                  invoiceNo: lr.invoiceNo + '-TDS',
                  paymentAmount: -lr.tdsAmount,
                  paymentDate,
                  paymentMethod: 'TDS Deduction',
                  status: 'verified',
                  source: 'oracle_ebs',
                  notes: `1% TDS deduction for ${lr.invoiceNo}`,
                  syncedBy: userEmail,
                },
              })
            );
          }

          return ops;
        })
      );

      markedCount += batch.length;
    } catch (err: any) {
      console.error(`[Check Balance] Batch error:`, err);
      errors.push(`Batch starting ${batch[0]?.lrNo}: ${err.message}`);
    }
  }

  // Sync log
  await prisma.paymentSyncLog.create({
    data: {
      status: errors.length === 0 ? 'success' : 'partial',
      totalRecords: lrsToMark.length,
      matchedRecords: markedCount,
      unmatchedRecords: errors.length,
      syncedBy: userEmail,
      errorMessage: errors.length > 0 ? errors.join('; ') : null,
    },
  });

  return NextResponse.json({
    success: true,
    markedCount,
    errors: errors.length > 0 ? errors : undefined,
  });
}

// ─── Helpers ──────────────────────────────────────────────────────

/**
 * Build a column-name map ONCE from the CSV header keys.
 * Returns the actual key string to use for direct property access (O(1) per row).
 */
function buildColumnMap(keys: string[]) {
  const map: Record<string, string | undefined> = {};
  const lower = keys.map((k) => k.toLowerCase().trim());

  function find(...candidates: string[]): string | undefined {
    for (const c of candidates) {
      const idx = lower.indexOf(c);
      if (idx !== -1) return keys[idx];
    }
    // Partial match fallback
    for (const c of candidates) {
      const idx = lower.findIndex((k) => k.includes(c));
      if (idx !== -1) return keys[idx];
    }
    return undefined;
  }

  map.invoiceNo = find('invoice no.', 'invoice no', 'invoiceno', 'invoice number', 'invoice_no');
  map.invoiceType = find('invoice type', 'invoicetype', 'invoice_type');
  map.balanceAmount = find('balance amount', 'balanceamount', 'balance_amount', 'balance');
  map.totalAmount = find('total invoice amount', 'total invoice amount', 'totalinvoiceamount', 'total_invoice_amount', 'total amount', 'invoice amount', 'amount');
  map.invoiceDate = find('invoice date', 'invoicedate', 'invoice_date');
  // "Date" column in export (3).csv = payment/schedule date (use for paid date)
  map.scheduledPaymentDate = find('scheduled payment date', 'scheduledpaymentdate', 'schedule payment date', 'payment date', 'payment schedule', 'schedule date', 'date', 'schedule');
  map.paymentStatus = find('payment status', 'paymentstatus', 'payment_status');
  map.paymentMethod = find('payment method', 'paymentmethod', 'payment_method');
  map.supplierSite = find('supplier site', 'suppliersite', 'supplier_site');

  return map;
}

/**
 * Format a Date as DD-MM-YYYY (for LR status / display).
 */
function formatDDMMYYYY(d: Date): string {
  const day = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}

/**
 * Parse Oracle EBS / CSV date formats:
 * - "08-Nov-25", "08-Nov-2025"
 * - "12-01-2026" (DD-MM-YYYY)
 * - "2026-01-12" (ISO)
 * - "12/01/2026" (DD/MM/YYYY)
 */
function parseOracleDate(dateStr: string): Date {
  if (!dateStr || !dateStr.trim()) return new Date();
  const s = dateStr.trim();

  const monthMap: Record<string, number> = {
    jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
    jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
  };

  const oracleMatch = s.match(/^(\d{1,2})-(\w{3})-(\d{2,4})$/);
  if (oracleMatch) {
    const day = parseInt(oracleMatch[1]);
    const month = monthMap[oracleMatch[2].toLowerCase()];
    let year = parseInt(oracleMatch[3]);
    if (year < 100) year += 2000;
    if (month !== undefined) return new Date(year, month, day);
  }

  const ddmmyyyy = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (ddmmyyyy) {
    const day = parseInt(ddmmyyyy[1]);
    const month = parseInt(ddmmyyyy[2]) - 1;
    const year = parseInt(ddmmyyyy[3]);
    if (month >= 0 && month <= 11) return new Date(year, month, day);
  }

  const isoDate = new Date(s);
  if (!isNaN(isoDate.getTime())) return isoDate;

  return new Date();
}
