import { LRData } from '@/lib/database';

export type NormalizedVehicleType = 'PICKUP' | 'TRUCK' | 'TOROUS';

export type BillType = 'regular' | 'rework' | 'additional';

export type ViewType = 'dashboard' | 'form' | 'rework-bill' | 'additional-bill';

export type SortBy = 'lrNo' | 'date' | 'none';
export type SortOrder = 'asc' | 'desc';

export interface LrFinancials {
  vehicleType: NormalizedVehicleType;
  revenue: number;
  driverPayment: number;
  billType: BillType;
  regularBaseRevenue: number;
  additionalRevenuePortion: number;
  isRework: boolean;
  isAdditionalRecord: boolean;
}

export interface PreparedFinancialEntry {
  lr: LRData;
  dateParts: string[];
  financials: LrFinancials;
}

export interface DashboardStats {
  total: number;
  lrDone: number;
  lrCollected: number;
  billDone: number;
  billSubmitted: number;
  pendingBills: number;
  pendingSubmission: number;
  thisMonth: number;
  vehicleTypeBreakdown: Record<NormalizedVehicleType, number>;
  estimatedRevenue: number;
  totalExpenses: number;
  totalProfit: number;
  reworkRevenue: number;
  reworkExpenses: number;
  reworkProfit: number;
  additionalRevenue: number;
  additionalExpenses: number;
  additionalProfit: number;
  regularRevenue: number;
  regularExpenses: number;
  regularProfit: number;
  billCompletionRate: number;
}

export interface ChartsData {
  vehicleData: Array<{
    name: string;
    count: number;
    revenue: number;
    expenses: number;
    profit: number;
  }>;
  monthlyData: Array<{
    month: string;
    revenue: number;
    expenses: number;
    profit: number;
  }>;
  billTypeData: Array<{
    name: string;
    value: number;
    color: string;
  }>;
}

export interface CategorizedLRs {
  rework: string[];
  additional: string[];
  regular: string[];
}

export interface GenerationResult {
  type: string;
  count: number;
  data?: any;
  error?: string;
}

export interface ColumnDefinition {
  id: string;
  label: string;
  required?: boolean;
}

export interface ContextMenu {
  x: number;
  y: number;
  lrNo: string;
}

