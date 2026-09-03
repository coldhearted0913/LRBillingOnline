import { NormalizedVehicleType } from '@/lib/types/dashboard';
import {
  VEHICLE_AMOUNTS,
  DRIVER_PAYMENTS,
  REWORK_DRIVER_PAYMENTS,
  REWORK_REVENUE_MULTIPLIER,
  ADDITIONAL_BILL_AMOUNTS,
} from '@/lib/constants';

export type VehicleAmountMap = Record<NormalizedVehicleType, number>;

/** Rates used only for Statistics / profit calculations. */
export type ProfitRates = {
  /** Revenue billed per regular trip (company / "amount to company"). */
  vehicleAmounts: VehicleAmountMap;
  /** Payment to transporter/driver per regular trip. */
  driverPayments: VehicleAmountMap;
  /** Payment to transporter/driver for rework trips. */
  reworkDriverPayments: VehicleAmountMap;
  /** Extra revenue per additional delivery location. */
  additionalBillAmounts: VehicleAmountMap;
  /** Rework revenue as fraction of regular vehicle amount. */
  reworkRevenueMultiplier: number;
};

export const PROFIT_RATE_CONFIRMATION_PHRASE = 'CHANGE PROFIT RATES';

export const DEFAULT_PROFIT_RATES: ProfitRates = {
  vehicleAmounts: {
    PICKUP: VEHICLE_AMOUNTS.PICKUP,
    TRUCK: VEHICLE_AMOUNTS.TRUCK,
    TOROUS: VEHICLE_AMOUNTS.TOROUS,
  },
  driverPayments: {
    PICKUP: DRIVER_PAYMENTS.PICKUP,
    TRUCK: DRIVER_PAYMENTS.TRUCK,
    TOROUS: DRIVER_PAYMENTS.TOROUS,
  },
  reworkDriverPayments: {
    PICKUP: REWORK_DRIVER_PAYMENTS.PICKUP,
    TRUCK: REWORK_DRIVER_PAYMENTS.TRUCK,
    TOROUS: REWORK_DRIVER_PAYMENTS.TOROUS,
  },
  additionalBillAmounts: {
    PICKUP: ADDITIONAL_BILL_AMOUNTS.PICKUP,
    TRUCK: ADDITIONAL_BILL_AMOUNTS.TRUCK,
    TOROUS: ADDITIONAL_BILL_AMOUNTS.TOROUS,
  },
  reworkRevenueMultiplier: REWORK_REVENUE_MULTIPLIER,
};

const VEHICLE_TYPES: NormalizedVehicleType[] = ['PICKUP', 'TRUCK', 'TOROUS'];

function parseAmountMap(
  value: unknown,
  fallback: VehicleAmountMap
): VehicleAmountMap {
  const source =
    value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  const result = { ...fallback };
  for (const type of VEHICLE_TYPES) {
    const parsed = Number(source[type]);
    if (Number.isFinite(parsed) && parsed >= 0) {
      result[type] = parsed;
    }
  }
  return result;
}

/** Merge unknown/partial JSON into a complete ProfitRates object. */
export function normalizeProfitRates(input: unknown): ProfitRates {
  const raw =
    input && typeof input === 'object' ? (input as Record<string, unknown>) : {};

  const multiplier = Number(raw.reworkRevenueMultiplier);
  return {
    vehicleAmounts: parseAmountMap(raw.vehicleAmounts, DEFAULT_PROFIT_RATES.vehicleAmounts),
    driverPayments: parseAmountMap(raw.driverPayments, DEFAULT_PROFIT_RATES.driverPayments),
    reworkDriverPayments: parseAmountMap(
      raw.reworkDriverPayments,
      DEFAULT_PROFIT_RATES.reworkDriverPayments
    ),
    additionalBillAmounts: parseAmountMap(
      raw.additionalBillAmounts,
      DEFAULT_PROFIT_RATES.additionalBillAmounts
    ),
    reworkRevenueMultiplier:
      Number.isFinite(multiplier) && multiplier > 0 && multiplier <= 1
        ? multiplier
        : DEFAULT_PROFIT_RATES.reworkRevenueMultiplier,
  };
}

export function profitRatesEqual(a: ProfitRates, b: ProfitRates): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}
