import { LRData } from '@/lib/database';
import { MONTHS, VEHICLE_AMOUNTS, REWORK_REVENUE_MULTIPLIER } from '@/lib/constants';

export type ProvisionVehicleType = 'PICKUP' | 'TRUCK' | 'TOROUS';

export type ProvisionBucketKey =
  | 'regular|PICKUP'
  | 'regular|TRUCK'
  | 'regular|TOROUS'
  | 'rework|PICKUP'
  | 'rework|TRUCK'
  | 'rework|TOROUS';

export type ProvisionBucket = {
  kind: 'regular' | 'rework';
  vehicleType: ProvisionVehicleType;
  count: number;
  rate: number;
  subtotal: number;
};

export type ProvisionCalculation = {
  totalLrs: number;
  cancelledExcluded: number;
  ldkPickupsExcluded: number;
  eligibleCount: number;
  totalAmount: number;
  buckets: ProvisionBucket[];
  regularCount: number;
  reworkCount: number;
};

export type ProvisionCalcOptions = {
  month?: string; // MONTHS entry or 'All Months'
  year?: string; // 'YYYY' or 'All Years'
  includeLdkPickups?: boolean;
  vehicleAmounts?: Partial<Record<ProvisionVehicleType, number>>;
  reworkMultiplier?: number;
};

const KNOWN_TYPES: ProvisionVehicleType[] = ['PICKUP', 'TRUCK', 'TOROUS'];

export function normalizeProvisionVehicleType(value: unknown): ProvisionVehicleType {
  const upper = String(value || '').trim().toUpperCase();
  return (KNOWN_TYPES.includes(upper as ProvisionVehicleType)
    ? upper
    : 'PICKUP') as ProvisionVehicleType;
}

/** LDK consignor → KOEL Kagal consignee pickups (additional / non-provision by default). */
export function isLdkKoelPickup(lr: LRData): boolean {
  const vt = normalizeProvisionVehicleType(lr['Vehicle Type']);
  if (vt !== 'PICKUP') return false;
  const consignor = String(lr['Consignor'] || '').toUpperCase();
  const consignee = String(lr['Consignee'] || '').toUpperCase();
  return consignor.includes('LDK') && consignee.includes('KOEL');
}

export function isProvisionReworkRoute(lr: LRData): boolean {
  const from = String(lr['FROM'] || '').trim().toLowerCase();
  const to = String(lr['TO'] || '').trim().toLowerCase();
  return from === 'kolhapur' && to === 'solapur';
}

export function matchesMonthYear(
  lr: LRData,
  month?: string,
  year?: string
): boolean {
  const lrDate = String(lr['LR Date'] || '').trim();
  if (!lrDate) return false;
  const parts = lrDate.replace(/\//g, '-').split('-');
  if (parts.length !== 3) return false;

  let yyyy: string;
  let mm: string;
  if (parts[0].length === 4) {
    yyyy = parts[0];
    mm = parts[1];
  } else {
    mm = parts[1];
    yyyy = parts[2];
  }

  if (year && year !== 'All Years' && yyyy !== year) return false;

  if (month && month !== 'All Months') {
    const monthIndex = MONTHS.indexOf(month) + 1;
    if (monthIndex < 1 || parseInt(mm, 10) !== monthIndex) return false;
  }

  return true;
}

export function getProvisionUnitAmount(
  lr: LRData,
  options: Pick<ProvisionCalcOptions, 'vehicleAmounts' | 'reworkMultiplier'> = {}
): number {
  const vt = normalizeProvisionVehicleType(lr['Vehicle Type']);
  const amounts = {
    PICKUP: options.vehicleAmounts?.PICKUP ?? VEHICLE_AMOUNTS.PICKUP,
    TRUCK: options.vehicleAmounts?.TRUCK ?? VEHICLE_AMOUNTS.TRUCK,
    TOROUS: options.vehicleAmounts?.TOROUS ?? VEHICLE_AMOUNTS.TOROUS,
  };
  const base = amounts[vt] || 0;
  const multiplier = options.reworkMultiplier ?? REWORK_REVENUE_MULTIPLIER;
  if (isProvisionReworkRoute(lr)) {
    return Math.round(base * multiplier);
  }
  return base;
}

/**
 * Company provision (revenue) for a month:
 * - excludes Cancelled
 * - excludes LDK→KOEL pickups unless includeLdkPickups
 * - rework (Kolhapur→Solapur) = 80% of vehicle rate (rounded)
 */
export function computeProvisionCalculation(
  lrs: LRData[],
  options: ProvisionCalcOptions = {}
): ProvisionCalculation {
  const includeLdkPickups = options.includeLdkPickups === true;
  const monthFiltered = (lrs || []).filter((lr) =>
    matchesMonthYear(lr, options.month, options.year)
  );

  const cancelledExcluded = monthFiltered.filter(
    (lr) => lr.status === 'Cancelled'
  ).length;

  const nonCancelled = monthFiltered.filter((lr) => lr.status !== 'Cancelled');

  const ldkPickups = nonCancelled.filter(isLdkKoelPickup);
  const eligible = includeLdkPickups
    ? nonCancelled
    : nonCancelled.filter((lr) => !isLdkKoelPickup(lr));

  const bucketMap = new Map<ProvisionBucketKey, ProvisionBucket>();

  const ensureBucket = (
    kind: 'regular' | 'rework',
    vehicleType: ProvisionVehicleType,
    rate: number
  ): ProvisionBucket => {
    const key = `${kind}|${vehicleType}` as ProvisionBucketKey;
    let bucket = bucketMap.get(key);
    if (!bucket) {
      bucket = { kind, vehicleType, count: 0, rate, subtotal: 0 };
      bucketMap.set(key, bucket);
    }
    return bucket;
  };

  let totalAmount = 0;
  let regularCount = 0;
  let reworkCount = 0;

  for (const lr of eligible) {
    const vt = normalizeProvisionVehicleType(lr['Vehicle Type']);
    const rework = isProvisionReworkRoute(lr);
    const kind = rework ? 'rework' : 'regular';
    const amount = getProvisionUnitAmount(lr, options);
    const bucket = ensureBucket(kind, vt, amount);
    bucket.count += 1;
    bucket.subtotal += amount;
    totalAmount += amount;
    if (rework) reworkCount += 1;
    else regularCount += 1;
  }

  const bucketOrder: ProvisionBucketKey[] = [
    'regular|TRUCK',
    'regular|TOROUS',
    'regular|PICKUP',
    'rework|TRUCK',
    'rework|TOROUS',
    'rework|PICKUP',
  ];

  const buckets = bucketOrder
    .map((key) => bucketMap.get(key))
    .filter((b): b is ProvisionBucket => !!b && b.count > 0);

  return {
    totalLrs: monthFiltered.length,
    cancelledExcluded,
    ldkPickupsExcluded: includeLdkPickups ? 0 : ldkPickups.length,
    eligibleCount: eligible.length,
    totalAmount,
    buckets,
    regularCount,
    reworkCount,
  };
}

/** LRs that should appear on the provision sheet for the given options. */
export function getProvisionEligibleLrs(
  lrs: LRData[],
  options: ProvisionCalcOptions = {}
): LRData[] {
  const includeLdkPickups = options.includeLdkPickups === true;
  return (lrs || []).filter((lr) => {
    if (!matchesMonthYear(lr, options.month, options.year)) return false;
    if (lr.status === 'Cancelled') return false;
    if (!includeLdkPickups && isLdkKoelPickup(lr)) return false;
    return true;
  });
}
