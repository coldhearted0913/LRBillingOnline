import { prisma } from '@/lib/prisma';
import { PaymentCSVRow } from './oracleEBSIntegration';

export interface MatchedPayment {
  payment: PaymentCSVRow;
  lrId?: string;
  lrNo?: string;
  matchType: 'exact' | 'partial' | 'unmatched';
  matchConfidence: number;
  matchReason?: string;
}

export interface PaymentMatchingResult {
  matched: MatchedPayment[];
  unmatched: PaymentCSVRow[];
  stats: {
    total: number;
    matched: number;
    unmatched: number;
    exactMatches: number;
    partialMatches: number;
  };
}

/**
 * Payment Matching Service
 * Matches payments from Oracle EBS CSV with LRs in the database
 */
export class PaymentMatchingService {
  /**
   * Normalize LR number for matching
   */
  private normalizeLRNo(lrNo: string | undefined | null): string {
    if (!lrNo) return '';
    return lrNo.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  }

  /**
   * Normalize bill number for matching
   */
  private normalizeBillNo(billNo: string | undefined | null): string {
    if (!billNo) return '';
    return billNo.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  }

  /**
   * Normalize invoice number for matching
   */
  private normalizeInvoiceNo(invoiceNo: string | undefined | null): string {
    if (!invoiceNo) return '';
    return invoiceNo.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  }

  /**
   * Parse payment amount
   */
  private parseAmount(amount: string | undefined | null): number {
    if (!amount) return 0;
    const cleaned = String(amount).replace(/[^\d.-]/g, '');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  }

  /**
   * Parse payment date
   */
  private parseDate(dateStr: string | undefined | null): Date | null {
    if (!dateStr) return null;
    
    try {
      // Try various date formats
      const formats = [
        /(\d{2})\/(\d{2})\/(\d{4})/, // DD/MM/YYYY
        /(\d{4})-(\d{2})-(\d{2})/,   // YYYY-MM-DD
        /(\d{2})-(\d{2})-(\d{4})/,   // DD-MM-YYYY
      ];

      for (const format of formats) {
        const match = String(dateStr).match(format);
        if (match) {
          if (format === formats[0]) {
            // DD/MM/YYYY
            return new Date(`${match[3]}-${match[2]}-${match[1]}`);
          } else if (format === formats[1]) {
            // YYYY-MM-DD
            return new Date(dateStr);
          } else if (format === formats[2]) {
            // DD-MM-YYYY
            return new Date(`${match[3]}-${match[2]}-${match[1]}`);
          }
        }
      }

      // Fallback to Date constructor
      const date = new Date(dateStr);
      return isNaN(date.getTime()) ? null : date;
    } catch {
      return null;
    }
  }

  /**
   * Match payment with LR using multiple strategies
   * Prioritizes invoice number matching since Oracle EBS provides invoice numbers that match LR numbers
   */
  async matchPayment(payment: PaymentCSVRow): Promise<MatchedPayment> {
    const normalizedLRNo = this.normalizeLRNo(payment.lrNo);
    const normalizedBillNo = this.normalizeBillNo(payment.billNumber);
    const normalizedInvoiceNo = this.normalizeInvoiceNo(payment.invoiceNo);
    const paymentAmount = this.parseAmount(payment.paymentAmount);

    // Strategy 1: Match by Invoice Number (exact) - Oracle EBS invoice numbers contain LR numbers
    // Invoice numbers like "MT/25-26/1109" or "MT/25-26/1109-TDS-CM-6432443" should match LR "MT/25-26/1109"
    if (normalizedInvoiceNo) {
      // Try exact match first
      let lr = await prisma.lR.findFirst({
        where: {
          OR: [
            { lrNo: { equals: normalizedInvoiceNo, mode: 'insensitive' } },
            { lrNo: { startsWith: normalizedInvoiceNo, mode: 'insensitive' } },
          ],
        },
      });

      // If no exact match, try to extract LR number from invoice number (e.g., "MT/25-26/1109" from "MT/25-26/1109-TDS-CM-6432443")
      if (!lr && payment.invoiceNo) {
        const lrMatch = payment.invoiceNo.match(/MT\/25-26\/\d+/i);
        if (lrMatch) {
          const extractedLRNo = lrMatch[0].toUpperCase();
          lr = await prisma.lR.findFirst({
            where: { lrNo: { equals: extractedLRNo, mode: 'insensitive' } },
          });
        }
      }

      if (lr) {
        return {
          payment,
          lrId: lr.id,
          lrNo: lr.lrNo,
          matchType: 'exact',
          matchConfidence: 1.0,
          matchReason: 'Matched by Invoice Number (from Oracle EBS)',
        };
      }
    }

    // Strategy 2: Match by LR Number (exact)
    if (normalizedLRNo) {
      const lr = await prisma.lR.findUnique({
        where: { lrNo: normalizedLRNo },
      });

      if (lr) {
        return {
          payment,
          lrId: lr.id,
          lrNo: lr.lrNo,
          matchType: 'exact',
          matchConfidence: 1.0,
          matchReason: 'Matched by LR Number',
        };
      }
    }

    // Strategy 3: Match by Bill Number (exact)
    if (normalizedBillNo) {
      const lr = await prisma.lR.findFirst({
        where: { billNumber: { contains: normalizedBillNo, mode: 'insensitive' } },
      });

      if (lr) {
        return {
          payment,
          lrId: lr.id,
          lrNo: lr.lrNo,
          matchType: 'exact',
          matchConfidence: 0.95,
          matchReason: 'Matched by Bill Number',
        };
      }
    }

    // Strategy 4: Match by amount and date range (partial)
    if (paymentAmount > 0 && payment.paymentDate) {
      const paymentDate = this.parseDate(payment.paymentDate);
      if (paymentDate) {
        const dateRangeStart = new Date(paymentDate);
        dateRangeStart.setDate(dateRangeStart.getDate() - 30); // 30 days before
        const dateRangeEnd = new Date(paymentDate);
        dateRangeEnd.setDate(dateRangeEnd.getDate() + 30); // 30 days after

        const lrs = await prisma.lR.findMany({
          where: {
            amount: {
              gte: paymentAmount * 0.95, // Allow 5% variance
              lte: paymentAmount * 1.05,
            },
            lrDate: {
              // Match date format if stored as string
            },
          },
          take: 5,
        });

        // Try to match by date if lrDate is in a parseable format
        for (const lr of lrs) {
          const lrDate = this.parseDate(lr.lrDate);
          if (lrDate && lrDate >= dateRangeStart && lrDate <= dateRangeEnd) {
            return {
              payment,
              lrId: lr.id,
              lrNo: lr.lrNo,
              matchType: 'partial',
              matchConfidence: 0.7,
              matchReason: 'Matched by amount and date range',
            };
          }
        }
      }
    }

    // No match found
    return {
      payment,
      matchType: 'unmatched',
      matchConfidence: 0,
      matchReason: 'No matching LR found',
    };
  }

  /**
   * Match multiple payments
   */
  async matchPayments(payments: PaymentCSVRow[]): Promise<PaymentMatchingResult> {
    const matched: MatchedPayment[] = [];
    const unmatched: PaymentCSVRow[] = [];

    let exactMatches = 0;
    let partialMatches = 0;

    for (const payment of payments) {
      const match = await this.matchPayment(payment);
      
      if (match.matchType === 'unmatched') {
        unmatched.push(payment);
      } else {
        matched.push(match);
        if (match.matchType === 'exact') {
          exactMatches++;
        } else {
          partialMatches++;
        }
      }
    }

    return {
      matched,
      unmatched,
      stats: {
        total: payments.length,
        matched: matched.length,
        unmatched: unmatched.length,
        exactMatches,
        partialMatches,
      },
    };
  }

  /**
   * Save matched payments to database and update LR payment status
   */
  async savePayments(matchedPayments: MatchedPayment[], syncedBy?: string, autoMarkPaid: boolean = true): Promise<number> {
    let savedCount = 0;

    for (const matched of matchedPayments) {
      if (matched.matchType === 'unmatched' || !matched.lrId) {
        continue;
      }

      try {
        const paymentAmount = this.parseAmount(matched.payment.paymentAmount);
        const paymentDate = this.parseDate(matched.payment.paymentDate) || new Date();

        // Check if payment already exists (avoid duplicates)
        // For negative amounts (credit memos), also check by absolute amount
        const whereConditions: any[] = [
          {
            paymentAmount: paymentAmount,
            paymentDate: paymentDate,
            referenceNumber: matched.payment.referenceNumber || undefined,
          },
        ];
        
        // Also check for credit memo (negative amount) with same absolute value
        if (paymentAmount < 0) {
          whereConditions.push({
            paymentAmount: -paymentAmount,
            paymentDate: paymentDate,
            referenceNumber: matched.payment.referenceNumber || undefined,
          });
        }
        
        const existing = await prisma.payment.findFirst({
          where: {
            lrId: matched.lrId,
            OR: whereConditions,
          },
        });

        if (existing) {
          console.log(`[Payment Matching] Payment already exists for LR ${matched.lrNo}`);
          continue;
        }

        // Determine payment type based on amount
        const isCreditMemo = paymentAmount < 0;
        const paymentType = isCreditMemo ? 'Credit Memo (TDS/Deduction)' : 'Payment';

        // Create payment record (including negative amounts for credit memos)
        await prisma.payment.create({
          data: {
            lrId: matched.lrId,
            lrNo: matched.lrNo,
            billNumber: matched.payment.billNumber,
            invoiceNo: matched.payment.invoiceNo,
            paymentAmount: paymentAmount, // Can be negative for credit memos
            paymentDate: paymentDate,
            paymentMethod: matched.payment.paymentMethod || (isCreditMemo ? 'Credit Memo' : 'Bank Transfer'),
            referenceNumber: matched.payment.referenceNumber,
            bankName: matched.payment.bankName,
            transactionId: matched.payment.transactionId,
            status: 'verified',
            source: 'oracle_ebs',
            notes: `${matched.matchReason}${isCreditMemo ? ` | ${paymentType}` : ''}`,
            syncedBy: syncedBy,
          },
        });

        // Update LR payment status if autoMarkPaid is enabled
        if (autoMarkPaid && matched.lrId) {
          await this.updateLRPaymentStatus(matched.lrId, paymentAmount);
        }

        savedCount++;
      } catch (error: any) {
        console.error(`[Payment Matching] Error saving payment for LR ${matched.lrNo}:`, error.message);
      }
    }

    return savedCount;
  }

  /**
   * Update LR payment status based on total payments received
   * Accounts for 2% tax deduction that is returned after year-end tax filing
   */
  private async updateLRPaymentStatus(lrId: string, newPaymentAmount: number) {
    try {
      const lr = await prisma.lR.findUnique({
        where: { id: lrId },
        include: {
          payments: {
            where: { status: 'verified' },
          },
        },
      });

      if (!lr) return;

      // Calculate net payments received (including negative amounts for credit memos)
      // Example: LR amount 12484, payment 12484, credit memo -124.84 (1% TDS)
      // Net payment = 12484 - 124.84 = 12359.16
      const netPayments = lr.payments.reduce((sum, p) => sum + p.paymentAmount, 0);
      const lrAmount = lr.amount || 0;

      // Deduction:
      // 1% immediate deduction (credit memo) - already included in netPayments as negative amount
      // So we consider LR as "Fully Paid" if net payments >= 99% of LR amount (accounting for 1% deduction)
      const IMMEDIATE_DEDUCTION_PERCENTAGE = 0.01; // 1% (credit memo, already deducted)
      const immediateDeduction = lrAmount * IMMEDIATE_DEDUCTION_PERCENTAGE; // 1% credit memo
      const expectedNetPayment = lrAmount - immediateDeduction; // 99% of LR amount (after 1% deduction)

      // Update remark to include payment status
      // Account for 1% immediate deduction (credit memo)
      let paymentStatus = '';
      
      if (netPayments >= expectedNetPayment) {
        // Fully paid (accounting for 1% credit memo deduction)
        // Net payment already accounts for 1% credit memo deduction
        paymentStatus = 'Fully Paid (1% TDS deducted)';
      } else if (netPayments >= lrAmount) {
        // Fully paid (net payment equals or exceeds LR amount - rare case)
        paymentStatus = 'Fully Paid';
      } else if (netPayments > 0) {
        // Partially paid
        const outstanding = lrAmount - netPayments;
        const outstandingAfterDeduction = Math.max(0, expectedNetPayment - netPayments);
        
        if (outstandingAfterDeduction > 0) {
          paymentStatus = `Partially Paid (Outstanding: ₹${outstandingAfterDeduction.toLocaleString('en-IN')} + ₹${immediateDeduction.toLocaleString('en-IN')} TDS deduction)`;
        } else {
          paymentStatus = `Partially Paid (Outstanding: ₹${outstanding.toLocaleString('en-IN')})`;
        }
      } else if (netPayments < 0) {
        // Negative net payment (more credit memos than payments - should not happen normally)
        paymentStatus = `Payment Issue (Net: ₹${netPayments.toLocaleString('en-IN')})`;
      }

      // Update LR remark with payment status
      const currentRemark = lr.remark || '';
      // Remove old payment status if exists
      const remarkWithoutPaymentStatus = currentRemark
        .replace(/\|?\s*Fully Paid.*/gi, '')
        .replace(/\|?\s*Partially Paid.*/gi, '')
        .trim();
      
      const updatedRemark = paymentStatus 
        ? `${remarkWithoutPaymentStatus ? remarkWithoutPaymentStatus + ' | ' : ''}${paymentStatus}`.trim()
        : remarkWithoutPaymentStatus;

      await prisma.lR.update({
        where: { id: lrId },
        data: {
          remark: updatedRemark,
        },
      });

      console.log(`[Payment Matching] Updated payment status for LR ${lr.lrNo}: ${paymentStatus}`);
    } catch (error: any) {
      console.error(`[Payment Matching] Error updating LR payment status:`, error.message);
    }
  }
}

