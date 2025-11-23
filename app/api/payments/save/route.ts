import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { applyApiMiddleware } from '@/lib/middleware/apiMiddleware';
import { PaymentMatchingService } from '@/lib/services/paymentMatching';
import { PaymentCSVRow } from '@/lib/services/oracleEBSIntegration';

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
        { error: 'Forbidden. Only CEO and MANAGER can save payments.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { matchedPayments } = body;

    if (!matchedPayments || !Array.isArray(matchedPayments)) {
      return NextResponse.json(
        { error: 'matchedPayments array is required' },
        { status: 400 }
      );
    }

    const matchingService = new PaymentMatchingService();
    
    // Convert to PaymentCSVRow format and match again to ensure consistency
    const payments: PaymentCSVRow[] = matchedPayments.map((mp: any) => mp.payment || mp);
    const matchingResult = await matchingService.matchPayments(payments);

    // Save only the matched payments and auto-mark as paid
    const savedCount = await matchingService.savePayments(
      matchingResult.matched,
      session.user.email,
      true // autoMarkPaid - automatically mark LRs as paid
    );

    return NextResponse.json({
      success: true,
      message: `Successfully saved ${savedCount} payments`,
      savedCount,
      stats: matchingResult.stats,
    });
  } catch (error: any) {
    console.error('[Save Payments] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save payments', details: error.message },
      { status: 500 }
    );
  }
}

