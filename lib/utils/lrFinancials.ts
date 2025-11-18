import { LRData } from '@/lib/database';
import { NormalizedVehicleType, LrFinancials, BillType } from '@/lib/types/dashboard';
import {
  VEHICLE_AMOUNTS,
  DRIVER_PAYMENTS,
  REWORK_DRIVER_PAYMENTS,
  REWORK_REVENUE_MULTIPLIER,
  ADDITIONAL_BILL_AMOUNTS,
} from '@/lib/constants';

export const KNOWN_VEHICLE_TYPES: NormalizedVehicleType[] = ['PICKUP', 'TRUCK', 'TOROUS'];

export const normalizeVehicleType = (value: unknown): NormalizedVehicleType => {
  const fallback: NormalizedVehicleType = 'PICKUP';
  if (typeof value !== 'string') return fallback;
  const upper = value.trim().toUpperCase();
  return KNOWN_VEHICLE_TYPES.includes(upper as NormalizedVehicleType) ? (upper as NormalizedVehicleType) : fallback;
};

export const parseLocations = (value: unknown): string[] => {
  if (typeof value !== 'string') return [];
  return value
    .split('/')
    .map((loc) => loc.trim())
    .filter((loc) => loc.length > 0);
};

export const parseNumericField = (value: unknown): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const computeLrFinancials = (lr: LRData): LrFinancials => {
  const vehicleType = normalizeVehicleType(lr['Vehicle Type']);
  const lrNo = (lr['LR No'] ?? '').toString();
  const isAdditionalRecord = lrNo.startsWith('ADDITIONAL-');

  const consigneeLocations = parseLocations(lr['Consignee']);
  const toColumnRaw = (lr['TO'] ?? '').toString().trim();
  const toLocations = parseLocations(toColumnRaw);

  const hasAdditionalDelivery = consigneeLocations.length > 1;
  const hasAdditionalDeliveryInTO = toLocations.length > 1;
  const finalHasAdditionalDelivery = hasAdditionalDelivery || hasAdditionalDeliveryInTO;
  const finalLocationCount = hasAdditionalDelivery
    ? consigneeLocations.length
    : hasAdditionalDeliveryInTO
    ? toLocations.length
    : 1;

  const from = (lr['FROM'] ?? '').toString().toLowerCase().trim();
  const to = toColumnRaw.toLowerCase();
  const isRework = !isAdditionalRecord && from === 'kolhapur' && to === 'solapur';

  const baseRevenue = VEHICLE_AMOUNTS[vehicleType] || 0;
  const regularDriverPayment = DRIVER_PAYMENTS[vehicleType] || 0;
  const reworkDriverPayment = REWORK_DRIVER_PAYMENTS[vehicleType] || 0;
  const additionalAmount = ADDITIONAL_BILL_AMOUNTS[vehicleType] || 0;

  let revenue = 0;
  let driverPayment = 0;
  let billType: BillType = 'regular';
  let regularBaseRevenue = 0;
  let additionalRevenuePortion = 0;

  if (isAdditionalRecord) {
    revenue = parseNumericField(lr['Amount']);
    driverPayment = 0;
    billType = 'additional';
    additionalRevenuePortion = revenue;
  } else if (finalHasAdditionalDelivery && !isRework) {
    const additionalMultiplier = Math.max(0, finalLocationCount - 1);
    const calculatedAdditionalAmount = additionalMultiplier * additionalAmount;
    revenue = baseRevenue + calculatedAdditionalAmount;
    driverPayment = regularDriverPayment;
    billType = 'regular';
    regularBaseRevenue = baseRevenue;
    additionalRevenuePortion = calculatedAdditionalAmount;
  } else if (isRework) {
    revenue = baseRevenue * REWORK_REVENUE_MULTIPLIER;
    driverPayment = reworkDriverPayment;
    billType = 'rework';
    regularBaseRevenue = 0;
  } else {
    revenue = baseRevenue;
    driverPayment = regularDriverPayment;
    billType = 'regular';
    regularBaseRevenue = revenue;
  }

  return {
    vehicleType,
    revenue,
    driverPayment,
    billType,
    regularBaseRevenue,
    additionalRevenuePortion,
    isRework,
    isAdditionalRecord,
  };
};

