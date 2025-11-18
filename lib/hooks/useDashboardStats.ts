import { useMemo } from 'react';
import { LRData } from '@/lib/database';
import { DashboardStats, ChartsData, PreparedFinancialEntry } from '@/lib/types/dashboard';
import { computeLrFinancials, normalizeVehicleType, KNOWN_VEHICLE_TYPES } from '@/lib/utils/lrFinancials';

export function useDashboardStats(statsData: LRData[]) {
  const stats = useMemo((): DashboardStats => {
    const vehicleTypeBreakdown: Record<string, number> = {
      PICKUP: 0,
      TRUCK: 0,
      TOROUS: 0,
    };

    let totalRevenue = 0;
    let totalExpenses = 0;
    let reworkRevenue = 0;
    let reworkExpenses = 0;
    let additionalRevenue = 0;
    let additionalExpenses = 0;
    let regularRevenue = 0;
    let regularExpenses = 0;

    statsData.forEach((lr: LRData) => {
      const vehicleType = normalizeVehicleType(lr['Vehicle Type']);
      vehicleTypeBreakdown[vehicleType] = (vehicleTypeBreakdown[vehicleType] ?? 0) + 1;

      const financials = computeLrFinancials(lr);
      totalRevenue += financials.revenue;
      totalExpenses += financials.driverPayment;

      switch (financials.billType) {
        case 'rework':
          reworkRevenue += financials.revenue;
          reworkExpenses += financials.driverPayment;
          break;
        case 'additional':
          additionalRevenue += financials.revenue;
          additionalExpenses += financials.driverPayment;
          break;
        case 'regular':
        default:
          regularRevenue += financials.regularBaseRevenue;
          regularExpenses += financials.driverPayment;
          if (financials.additionalRevenuePortion > 0) {
            additionalRevenue += financials.additionalRevenuePortion;
          }
          break;
      }
    });

    const totalProfit = totalRevenue - totalExpenses;
    const reworkProfit = reworkRevenue - reworkExpenses;
    const additionalProfit = additionalRevenue - additionalExpenses;
    const regularProfit = regularRevenue - regularExpenses;

    const lrDoneCount = statsData.filter((lr: LRData) => lr.status === 'LR Done').length;
    const lrCollectedCount = statsData.filter((lr: LRData) => lr.status === 'LR Collected').length;
    const billDoneCount = statsData.filter((lr: LRData) => lr.status === 'Bill Done').length;
    const billSubmittedCount = statsData.filter((lr: LRData) => lr.status === 'Bill Submitted').length;

    return {
      total: statsData.length,
      lrDone: lrDoneCount,
      lrCollected: lrCollectedCount,
      billDone: billDoneCount,
      billSubmitted: billSubmittedCount,
      pendingBills: lrCollectedCount,
      pendingSubmission: billDoneCount,
      thisMonth: statsData.length,
      vehicleTypeBreakdown: vehicleTypeBreakdown as Record<'PICKUP' | 'TRUCK' | 'TOROUS', number>,
      estimatedRevenue: totalRevenue,
      totalExpenses,
      totalProfit,
      reworkRevenue,
      reworkExpenses,
      reworkProfit,
      additionalRevenue,
      additionalExpenses,
      additionalProfit,
      regularRevenue,
      regularExpenses,
      regularProfit,
      billCompletionRate:
        statsData.length > 0
          ? Math.round(((billDoneCount + billSubmittedCount) / statsData.length) * 100)
          : 0,
    };
  }, [statsData]);

  const chartsData = useMemo((): ChartsData => {
    const prepared: PreparedFinancialEntry[] = statsData.map((lr: LRData) => {
      const lrDate = (lr['LR Date'] ?? '').toString();
      const dateParts = lrDate ? lrDate.split('-') : [];
      const financials = computeLrFinancials(lr);
      return { lr, dateParts, financials };
    });

    const vehicleBreakdown: Record<string, { revenue: number; expenses: number; profit: number; count: number }> = {
      PICKUP: { revenue: 0, expenses: 0, profit: 0, count: 0 },
      TRUCK: { revenue: 0, expenses: 0, profit: 0, count: 0 },
      TOROUS: { revenue: 0, expenses: 0, profit: 0, count: 0 },
    };

    let regularRevenue = 0;
    let reworkRevenue = 0;
    let additionalRevenue = 0;

    prepared.forEach(({ financials }) => {
      const { vehicleType, revenue, driverPayment, billType, regularBaseRevenue, additionalRevenuePortion } = financials;
      const bucket = vehicleBreakdown[vehicleType];
      bucket.revenue += revenue;
      bucket.expenses += driverPayment;
      bucket.profit += revenue - driverPayment;
      bucket.count += 1;

      switch (billType) {
        case 'rework':
          reworkRevenue += revenue;
          break;
        case 'additional':
          additionalRevenue += revenue;
          break;
        case 'regular':
        default:
          regularRevenue += regularBaseRevenue;
          if (additionalRevenuePortion > 0) {
            additionalRevenue += additionalRevenuePortion;
          }
          break;
      }
    });

    const vehicleData = KNOWN_VEHICLE_TYPES.map((type) => ({
      name: type,
      count: vehicleBreakdown[type].count,
      revenue: vehicleBreakdown[type].revenue,
      expenses: vehicleBreakdown[type].expenses,
      profit: vehicleBreakdown[type].profit,
    }));

    const billTypeTotal = regularRevenue + reworkRevenue + additionalRevenue;
    const billTypeData = [
      { name: 'Regular', value: billTypeTotal > 0 ? Math.round((regularRevenue / billTypeTotal) * 100) : 0, color: '#0088FE' },
      { name: 'Rework', value: billTypeTotal > 0 ? Math.round((reworkRevenue / billTypeTotal) * 100) : 0, color: '#00C49F' },
      { name: 'Additional', value: billTypeTotal > 0 ? Math.round((additionalRevenue / billTypeTotal) * 100) : 0, color: '#FFBB28' },
    ];

    const monthlyData = [];
    const currentDate = new Date();
    for (let i = 5; i >= 0; i--) {
      const targetDate = new Date(currentDate);
      targetDate.setMonth(currentDate.getMonth() - i);
      const monthName = targetDate.toLocaleDateString('en-US', { month: 'short' });
      const targetMonth = String(targetDate.getMonth() + 1).padStart(2, '0');
      const targetYear = targetDate.getFullYear().toString();

      let monthRevenue = 0;
      let monthExpenses = 0;

      prepared.forEach(({ dateParts, financials }) => {
        if (dateParts.length !== 3) return;
        if (dateParts[1] !== targetMonth || dateParts[2] !== targetYear) return;
        monthRevenue += financials.revenue;
        monthExpenses += financials.driverPayment;
      });

      monthlyData.push({
        month: monthName,
        revenue: monthRevenue,
        expenses: monthExpenses,
        profit: monthRevenue - monthExpenses,
      });
    }

    return {
      vehicleData,
      monthlyData,
      billTypeData,
    };
  }, [statsData]);

  return {
    stats,
    chartsData,
  };
}

