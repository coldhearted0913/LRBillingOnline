import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { applyApiMiddleware } from '@/lib/middleware/apiMiddleware';
import { logAudit } from '@/lib/audit';
import {
  DEFAULT_PROFIT_RATES,
  normalizeProfitRates,
  PROFIT_RATE_CONFIRMATION_PHRASE,
  profitRatesEqual,
  ProfitRates,
} from '@/lib/types/profitRates';

export const dynamic = 'force-dynamic';

const CONFIG_ID = 'default';

async function requireCeo() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
  const role = (session.user as { role?: string }).role;
  if (role !== 'CEO') {
    return {
      error: NextResponse.json(
        { error: 'Forbidden. Only CEO can manage profit rates.' },
        { status: 403 }
      ),
    };
  }
  return { session };
}

async function loadRates(): Promise<{
  rates: ProfitRates;
  updatedAt: string | null;
  updatedBy: string | null;
  isCustom: boolean;
}> {
  const row = await prisma.profitRateConfig.findUnique({ where: { id: CONFIG_ID } });
  if (!row) {
    return {
      rates: DEFAULT_PROFIT_RATES,
      updatedAt: null,
      updatedBy: null,
      isCustom: false,
    };
  }

  let parsed: unknown = null;
  try {
    parsed = JSON.parse(row.ratesJson);
  } catch {
    parsed = null;
  }
  const rates = normalizeProfitRates(parsed);
  return {
    rates,
    updatedAt: row.updatedAt.toISOString(),
    updatedBy: row.updatedBy,
    isCustom: !profitRatesEqual(rates, DEFAULT_PROFIT_RATES),
  };
}

function verifyStatsPassword(password: unknown): boolean {
  const expected = process.env.STATS_PASSWORD || '';
  if (!expected) return false;
  return typeof password === 'string' && password.length > 0 && password === expected;
}

export async function GET() {
  try {
    const auth = await requireCeo();
    if ('error' in auth && auth.error) return auth.error;

    const data = await loadRates();
    return NextResponse.json({
      success: true,
      ...data,
      defaults: DEFAULT_PROFIT_RATES,
      confirmationPhrase: PROFIT_RATE_CONFIRMATION_PHRASE,
    });
  } catch (error) {
    console.error('[profit-rates] GET failed', error);
    return NextResponse.json({ error: 'Failed to load profit rates' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const middlewareResponse = await applyApiMiddleware(request);
  if (middlewareResponse) return middlewareResponse;

  try {
    const auth = await requireCeo();
    if ('error' in auth && auth.error) return auth.error;
    const session = auth.session!;

    const body = await request.json().catch(() => ({}));
    const {
      password,
      confirmationPhrase,
      acknowledgeWarning,
      rates: ratesInput,
      resetToDefaults,
    } = body as {
      password?: string;
      confirmationPhrase?: string;
      acknowledgeWarning?: boolean;
      rates?: unknown;
      resetToDefaults?: boolean;
    };

    if (!process.env.STATS_PASSWORD) {
      return NextResponse.json(
        { error: 'Stats password not configured on server' },
        { status: 500 }
      );
    }

    if (!verifyStatsPassword(password)) {
      return NextResponse.json(
        { error: 'Invalid statistics password. Rate changes were not saved.' },
        { status: 401 }
      );
    }

    if (acknowledgeWarning !== true) {
      return NextResponse.json(
        {
          error:
            'You must acknowledge the warning that changing these rates affects all profit figures.',
        },
        { status: 400 }
      );
    }

    if (
      typeof confirmationPhrase !== 'string' ||
      confirmationPhrase.trim() !== PROFIT_RATE_CONFIRMATION_PHRASE
    ) {
      return NextResponse.json(
        {
          error: `Type the confirmation phrase exactly: ${PROFIT_RATE_CONFIRMATION_PHRASE}`,
        },
        { status: 400 }
      );
    }

    const previous = await loadRates();
    const nextRates = resetToDefaults
      ? DEFAULT_PROFIT_RATES
      : normalizeProfitRates(ratesInput);

    // Reject clearly nonsense values (e.g. transporter pay higher than company by huge margin is allowed, but negative already stripped)
    for (const type of ['PICKUP', 'TRUCK', 'TOROUS'] as const) {
      if (nextRates.vehicleAmounts[type] > 1_000_000 || nextRates.driverPayments[type] > 1_000_000) {
        return NextResponse.json(
          { error: `Amount for ${type} looks unrealistically high. Cap is ₹10,00,000.` },
          { status: 400 }
        );
      }
    }

    const userId =
      (session.user as { id?: string }).id ||
      (await prisma.user.findUnique({
        where: { email: session.user!.email! },
        select: { id: true },
      }))?.id;

    const updatedBy = session.user!.email || 'CEO';

    const saved = await prisma.profitRateConfig.upsert({
      where: { id: CONFIG_ID },
      create: {
        id: CONFIG_ID,
        ratesJson: JSON.stringify(nextRates),
        updatedBy,
      },
      update: {
        ratesJson: JSON.stringify(nextRates),
        updatedBy,
      },
    });

    if (userId) {
      await logAudit({
        userId,
        action: resetToDefaults ? 'RESET_PROFIT_RATES' : 'UPDATE_PROFIT_RATES',
        resource: 'ProfitRateConfig',
        resourceId: CONFIG_ID,
        oldValue: previous.rates,
        newValue: nextRates,
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
      });
    }

    return NextResponse.json({
      success: true,
      rates: nextRates,
      defaults: DEFAULT_PROFIT_RATES,
      updatedAt: saved.updatedAt.toISOString(),
      updatedBy: saved.updatedBy,
      isCustom: !profitRatesEqual(nextRates, DEFAULT_PROFIT_RATES),
      confirmationPhrase: PROFIT_RATE_CONFIRMATION_PHRASE,
      warning:
        'Profit statistics now use these rates. Generated bills and invoices are unchanged.',
    });
  } catch (error) {
    console.error('[profit-rates] PUT failed', error);
    return NextResponse.json({ error: 'Failed to save profit rates' }, { status: 500 });
  }
}
