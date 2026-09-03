import { describe, expect, it } from 'vitest';
import { computeProvisionCalculation, isLdkKoelPickup } from '@/lib/utils/provisionCalculator';
import type { LRData } from '@/lib/database';

const baseLr = (overrides: Partial<LRData>): LRData =>
  ({
    'LR No': 'MT/25-26/1',
    'LR Date': '10-08-2026',
    'Vehicle Type': 'TRUCK',
    'Vehicle Number': 'MH12AB1234',
    'FROM': 'Solapur',
    'TO': 'KOLHAPUR',
    'Consignor': 'KFIL SHIVSHAHI, HOTGI ROAD, SOLAPUR',
    'Consignee': 'KFIL SCM Godown, Kagal MIDC, Kolhapur',
    status: 'LR Done',
    ...overrides,
  }) as LRData;

describe('provisionCalculator', () => {
  it('detects LDK → KOEL pickups', () => {
    expect(
      isLdkKoelPickup(
        baseLr({
          'Vehicle Type': 'PICKUP',
          Consignor: 'LDK, CHINCHOLI MIDC, SOLAPUR',
          Consignee: 'KOEL, 5 STAR MIDC, KAGAL, KOLHAPUR',
        })
      )
    ).toBe(true);
  });

  it('excludes LDK pickups by default and applies 80% rework rates', () => {
    const lrs = [
      baseLr({ 'LR No': '1', 'Vehicle Type': 'TRUCK' }),
      baseLr({ 'LR No': '2', 'Vehicle Type': 'TOROUS' }),
      baseLr({
        'LR No': '3',
        'Vehicle Type': 'TRUCK',
        FROM: 'Kolhapur',
        TO: 'SOLAPUR',
      }),
      baseLr({
        'LR No': '4',
        'Vehicle Type': 'PICKUP',
        Consignor: 'LDK, CHINCHOLI MIDC, SOLAPUR',
        Consignee: 'KOEL, 5 STAR MIDC, KAGAL, KOLHAPUR',
      }),
      baseLr({ 'LR No': '5', status: 'Cancelled' }),
    ];

    const result = computeProvisionCalculation(lrs, {
      month: 'August',
      year: '2026',
      includeLdkPickups: false,
    });

    expect(result.eligibleCount).toBe(3);
    expect(result.ldkPickupsExcluded).toBe(1);
    expect(result.cancelledExcluded).toBe(1);
    // 12484 + 26933 + round(12484*0.8=9987.2)=9987
    expect(result.totalAmount).toBe(12484 + 26933 + 9987);
  });

  it('includes LDK pickups when checkbox is on', () => {
    const lrs = [
      baseLr({
        'LR No': '4',
        'Vehicle Type': 'PICKUP',
        Consignor: 'LDK, CHINCHOLI MIDC, SOLAPUR',
        Consignee: 'KOEL, 5 STAR MIDC, KAGAL, KOLHAPUR',
      }),
    ];
    const result = computeProvisionCalculation(lrs, {
      month: 'August',
      year: '2026',
      includeLdkPickups: true,
    });
    expect(result.eligibleCount).toBe(1);
    expect(result.totalAmount).toBe(5500);
  });
});
