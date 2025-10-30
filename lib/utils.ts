import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Rework helpers
import { VEHICLE_AMOUNTS } from './constants';

export function isReworkRoute(from: string | undefined | null, to: string | undefined | null): boolean {
  const f = (from || '').toString().trim().toLowerCase();
  const t = (to || '').toString().trim().toLowerCase();
  return f === 'kolhapur' && t === 'solapur';
}

export function computeReworkAmount(vehicleType: string | undefined | null): { base: number; effective: number } {
  const vt = (vehicleType || '').toString();
  const base = (VEHICLE_AMOUNTS as any)[vt] || 0;
  const effective = Math.round(base * 0.8);
  return { base, effective };
}

