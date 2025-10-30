import { describe, it, expect } from 'vitest';
import { computeReworkAmount, isReworkRoute } from '@/lib/utils';

describe('isReworkRoute', () => {
  it('returns true for Kolhapur -> Solapur (any case)', () => {
    expect(isReworkRoute('Kolhapur', 'Solapur')).toBe(true);
    expect(isReworkRoute('kolhapur', 'solapur')).toBe(true);
    expect(isReworkRoute('KOLHAPUR', 'SOLAPUR')).toBe(true);
  });

  it('returns false for other routes', () => {
    expect(isReworkRoute('Pune', 'Solapur')).toBe(false);
    expect(isReworkRoute('Kolhapur', 'Pune')).toBe(false);
    expect(isReworkRoute('', '')).toBe(false);
  });
});

describe('computeReworkAmount', () => {
  it('computes 80% rounded for TRUCK', () => {
    const { base, effective } = computeReworkAmount('TRUCK');
    expect(base).toBe(12484);
    expect(effective).toBe(9987);
  });

  it('computes 80% rounded for TOROUS', () => {
    const { base, effective } = computeReworkAmount('TOROUS');
    expect(base).toBe(26933);
    expect(effective).toBe(21546);
  });

  it('computes 80% rounded for PICKUP', () => {
    const { base, effective } = computeReworkAmount('PICKUP');
    expect(base).toBe(5500);
    expect(effective).toBe(4400);
  });
});


