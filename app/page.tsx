'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Plus, RefreshCw, Check, X, Trash2, FileText, Download, 
  Truck, Calendar, MapPin, Package, TrendingUp, BarChart3, Search, Folder, 
  DollarSign, PieChart, ChevronLeft, ChevronRight, Eye, EyeOff, FileSpreadsheet, Printer, HelpCircle, Settings
} from 'lucide-react';
import JSZip from 'jszip';
import toast from 'react-hot-toast';
import LRForm from '@/components/LRForm';
import ReworkBillForm from '@/components/ReworkBillForm';
import AdditionalBillForm from '@/components/AdditionalBillForm';
import { LRData } from '@/lib/database';
import { MONTHS, VEHICLE_AMOUNTS, DRIVER_PAYMENTS, REWORK_DRIVER_PAYMENTS, REWORK_REVENUE_MULTIPLIER, ADDITIONAL_BILL_AMOUNTS, LR_STATUS_OPTIONS, STATUS_COLORS } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import UserProfileDropdown from '@/components/UserProfileDropdown';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import { Skeleton } from '@/components/ui/skeleton';
import EmptyState from '@/components/EmptyState';
import DashboardCharts from '@/components/DashboardCharts';

export default function Dashboard() {
  // Removed filteredLrs state - using memoizedFilteredLrs directly
  const [selectedLrs, setSelectedLrs] = useState<Set<string>>(new Set());
  const [currentView, setCurrentView] = useState<'dashboard' | 'form' | 'rework-bill' | 'additional-bill'>('dashboard');
  const [editingLr, setEditingLr] = useState<LRData | null>(null);
  const [loading, setLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [submissionDate, setSubmissionDate] = useState('');
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [generatedFiles, setGeneratedFiles] = useState<any[]>([]);
  const [showBulkStatusModal, setShowBulkStatusModal] = useState(false);
  const [bulkStatus, setBulkStatus] = useState('LR Done');
  
  // Bill generation inputs
  const [reworkBillNo, setReworkBillNo] = useState('');
  const [additionalBillNo, setAdditionalBillNo] = useState('');
  const [categorizedLrs, setCategorizedLrs] = useState<any>(null);
  const [generationResults, setGenerationResults] = useState<any>(null);
  const [showResultsModal, setShowResultsModal] = useState(false);
  const [selectedBillTypes, setSelectedBillTypes] = useState<Set<string>>(new Set(['rework', 'additional', 'regular']));
  const [includeFinalSheet, setIncludeFinalSheet] = useState(true);
  const [zipDownloading, setZipDownloading] = useState(false);
  const [showProfitBreakdown, setShowProfitBreakdown] = useState(false);
  const [showBillTypeBreakdown, setShowBillTypeBreakdown] = useState(false);
  const [showMonthlyProfit, setShowMonthlyProfit] = useState(false);
  const [provisionLoading, setProvisionLoading] = useState(false);
  const [showStatsPasswordModal, setShowStatsPasswordModal] = useState(false);
  const [statsPassword, setStatsPassword] = useState('');
  const [statsAuthLoading, setStatsAuthLoading] = useState(false);
  const [showLrDetails, setShowLrDetails] = useState(false);
  const [detailLr, setDetailLr] = useState<LRData | null>(null);
  const [showDetailFiles, setShowDetailFiles] = useState(false);
  const [consistencyLoading, setConsistencyLoading] = useState(false);
  const [deletingAttachments, setDeletingAttachments] = useState<Set<string>>(new Set());
  const [exporting, setExporting] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; lrNo: string } | null>(null);
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(new Set(['checkbox', 'lrNo', 'vehicleNo', 'lrDate', 'from', 'to', 'vehicleType', 'submitDate', 'status', 'remark', 'actions']));
  const [showColumnCustomizer, setShowColumnCustomizer] = useState(false);
  const [visibleWidgets, setVisibleWidgets] = useState<Set<string>>(new Set(['stats', 'charts', 'filters']));
  const [enableVirtualScrolling, setEnableVirtualScrolling] = useState(false);

  const downloadAttachment = async (url: string, name?: string) => {
    try {
      // Prefer same-origin proxy to avoid PWA navigation issues
      const u = new URL(url);
      const key = u.pathname.replace(/^\//, ''); // preserve %2F
      const proxyUrl = `/api/attachments/download?key=${encodeURIComponent(key)}${name ? `&name=${encodeURIComponent(name)}` : ''}`;
      // Open in new tab to avoid replacing the PWA view
      window.open(proxyUrl, '_blank');
    } catch (e: any) {
      toast.error(e.message || 'Failed to download');
    }
  };
  const deleteAttachment = async (lrNo: string, url: string) => {
    try {
      setDeletingAttachments(prev => new Set(prev).add(url));
      const res = await fetch(`/api/lrs/${encodeURIComponent(lrNo)}/attachments`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.attachments) {
          setDetailLr(prev => (prev ? ({ ...prev, attachments: data.attachments } as any) : prev));
        } else {
          const r = await fetch(`/api/lrs/${encodeURIComponent(lrNo)}`);
          const d = await r.json();
          if (d?.success) setDetailLr(d.lr);
        }
      } else {
        toast.error('Failed to delete file');
      }
    } catch {
      toast.error('Delete failed');
    }
    finally {
      setDeletingAttachments(prev => { const n = new Set(prev); n.delete(url); return n; });
    }
  };
  
  // Filters & Search
  const [selectedMonth, setSelectedMonth] = useState('All Months');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [selectedStatuses, setSelectedStatuses] = useState<Set<string>>(new Set());
  const [tempStatuses, setTempStatuses] = useState<Set<string>>(new Set());
  const [activeStatusFilter, setActiveStatusFilter] = useState<string | null>(null);
  
  // Sorting
  const [sortBy, setSortBy] = useState<'lrNo' | 'date' | 'none'>('none');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  
  // Auth Session
  const { data: session, status } = useSession();
  const router = useRouter();
  const isCEO = ((session?.user as any)?.role === 'CEO');
  
  // React Query Client
  const queryClient = useQueryClient();

  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('lr-recent-searches');
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load recent searches:', e);
      }
    }
  }, []);

  // Load visible columns from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('lr-visible-columns');
    if (saved) {
      try {
        const cols = JSON.parse(saved);
        setVisibleColumns(new Set(cols));
      } catch (e) {
        console.error('Failed to load visible columns:', e);
      }
    }
  }, []);

  // Save visible columns to localStorage when changed
  useEffect(() => {
    if (visibleColumns.size > 0) {
      localStorage.setItem('lr-visible-columns', JSON.stringify(Array.from(visibleColumns)));
    }
  }, [visibleColumns]);

  // Column definitions
  const columnDefinitions = [
    { id: 'checkbox', label: 'Checkbox', required: true },
    { id: 'lrNo', label: 'LR No', required: true },
    { id: 'vehicleNo', label: 'Vehicle No', required: true },
    { id: 'lrDate', label: 'LR Date', required: true },
    { id: 'from', label: 'FROM' },
    { id: 'to', label: 'TO' },
    { id: 'vehicleType', label: 'Vehicle Type' },
    { id: 'submitDate', label: 'Submit Date' },
    { id: 'status', label: 'Status', required: true },
    { id: 'remark', label: 'Remark' },
    { id: 'actions', label: 'Actions', required: true },
  ];

  const toggleColumn = (columnId: string) => {
    if (columnDefinitions.find(c => c.id === columnId)?.required) {
      toast.error('This column cannot be hidden');
      return;
    }
    setVisibleColumns(prev => {
      const newSet = new Set(prev);
      if (newSet.has(columnId)) {
        newSet.delete(columnId);
      } else {
        newSet.add(columnId);
      }
      return newSet;
    });
  };

  // Save search to recent searches
  const saveSearch = (query: string) => {
    if (!query.trim()) return;
    const updated = [query, ...recentSearches.filter(s => s !== query)].slice(0, 10);
    setRecentSearches(updated);
    localStorage.setItem('lr-recent-searches', JSON.stringify(updated));
  };
  
  // Fetch LRs with React Query
  const { data: lrs = [], isLoading: isLoadingLRs, refetch: refetchLRs } = useQuery({
    queryKey: ['lrs'],
    queryFn: async () => {
      const response = await fetch('/api/lrs');
      const data = await response.json();
      if (!data.success) throw new Error(data.error || 'Failed to fetch LRs');
      // Normalize records for consistent downstream logic
      return (data.lrs || []).map((lr: any) => ({
        ...lr,
        // Ensure lowercase 'status' exists even if API returns 'Status'
        status: lr.status ?? lr.Status ?? lr['status'] ?? lr['Status'] ?? undefined,
      }));
    },
    // Always refetch on mount/focus/reconnect so counts stay fresh after adds/updates
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    gcTime: 10 * 60 * 1000,
  });
  
  // Load LRs function (for manual refresh)
  const loadLRs = () => {
    refetchLRs();
  };

  // Export filtered LRs to Excel
  const exportToExcel = async () => {
    setExporting(true);
    try {
      // If records are selected, export only those. Otherwise export filtered records
      const exportData: any = {};
      
      if (selectedLrs.size > 0) {
        // Export only selected records
        exportData.selectedLrNos = Array.from(selectedLrs);
        exportData.exportType = 'selected';
      } else {
        // Export filtered records based on current filters
        exportData.filters = {
          month: selectedMonth,
          year: selectedYear,
          statuses: Array.from(selectedStatuses),
          search: searchQuery,
          activeStatusFilter: activeStatusFilter,
        };
        exportData.exportType = 'filtered';
      }

      const response = await fetch('/api/lrs/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(exportData),
      });

      if (!response.ok) {
        throw new Error('Export failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      const fileName = selectedLrs.size > 0 
        ? `LR_Records_Selected_${selectedLrs.size}_${new Date().toISOString().split('T')[0]}.xlsx`
        : `LR_Records_Filtered_${memoizedFilteredLrs.length}_${new Date().toISOString().split('T')[0]}.xlsx`;
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success(`Exported ${selectedLrs.size > 0 ? selectedLrs.size : memoizedFilteredLrs.length} LR record(s) successfully`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export records');
    } finally {
      setExporting(false);
    }
  };
  
  // Bulk status update mutation
  const bulkStatusUpdateMutation = useMutation({
    mutationFn: async ({ lrNumbers, status }: { lrNumbers: string[], status: string }) => {
      const response = await fetch('/api/lrs/bulk-status', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lrNumbers, status }),
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.error || 'Failed to update status');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lrs'] });
      toast.success('Status updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update status: ${error.message}`);
    },
  });
  
  // Single status update mutation
  const statusUpdateMutation = useMutation({
    mutationFn: async ({ lrNo, status }: { lrNo: string, status: string }) => {
      const response = await fetch(`/api/lrs/${encodeURIComponent(lrNo)}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.error || 'Failed to update status');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lrs'] });
      toast.success('Status updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update status: ${error.message}`);
    },
  });
  
  // Delete LRs mutation
  const deleteLRsMutation = useMutation({
    mutationFn: async (lrNumbers: string[]) => {
      const response = await fetch('/api/lrs', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lrNumbers }),
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.error || 'Failed to delete LRs');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lrs'] });
      setSelectedLrs(new Set());
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete LRs: ${error.message}`);
    },
  });
  
  // Memoized filtered LRs - Calculate filtered LRs with useMemo to prevent infinite loop
  const memoizedFilteredLrs = useMemo(() => {
    let filtered = lrs;
    
    // Filter by year (dates are in DD-MM-YYYY format)
    if (selectedYear !== 'All Years') {
      filtered = filtered.filter((lr: LRData) => {
        const lrDate = lr['LR Date'];
        if (!lrDate) return false;
        const parts = lrDate.split('-');
        // parts[2] is the year in DD-MM-YYYY format
        return parts.length === 3 && parts[2] === selectedYear;
      });
    }
    
    // Filter by month (dates are in DD-MM-YYYY format)
    if (selectedMonth !== 'All Months') {
      const monthIndex = MONTHS.indexOf(selectedMonth) + 1;
      filtered = filtered.filter((lr: LRData) => {
        const lrDate = lr['LR Date'];
        if (!lrDate) return false;
        const parts = lrDate.split('-');
        // parts[1] is the month in DD-MM-YYYY format
        return parts.length === 3 && parseInt(parts[1]) === monthIndex;
      });
    }

    // Filter by statuses
    if (selectedStatuses.size > 0) {
      filtered = filtered.filter((lr: LRData) => lr.status && selectedStatuses.has(lr.status));
    }
    
    // Filter by active status filter (from card clicks)
    if (activeStatusFilter) {
      filtered = filtered.filter((lr: LRData) => lr.status === activeStatusFilter);
    }
    
    // Search filter
    if (searchQuery.trim()) {
      const searchLower = searchQuery.toLowerCase();
      filtered = filtered.filter((lr: LRData) => 
        lr['LR No']?.toLowerCase().includes(searchLower) ||
        lr['Vehicle Number']?.toLowerCase().includes(searchLower) ||
        lr['FROM']?.toLowerCase().includes(searchLower) ||
        lr['TO']?.toLowerCase().includes(searchLower) ||
        lr['Consignor']?.toLowerCase().includes(searchLower) ||
        lr['Consignee']?.toLowerCase().includes(searchLower) ||
        lr['Vehicle Type']?.toLowerCase().includes(searchLower)
      );
    }
    
    // Apply sorting
    if (sortBy === 'lrNo') {
      filtered.sort((a: LRData, b: LRData) => {
        const aNo = a['LR No'] || '';
        const bNo = b['LR No'] || '';
        return sortOrder === 'asc' ? aNo.localeCompare(bNo) : bNo.localeCompare(aNo);
      });
    } else if (sortBy === 'date') {
      filtered.sort((a: LRData, b: LRData) => {
        // Parse DD-MM-YYYY to YYYYMMDD for numeric comparison
        const parseDate = (dateStr: string) => {
          if (!dateStr) return 0;
          const [d, m, y] = dateStr.split('-');
          // Convert to YYYYMMDD format as number for proper sorting
          return parseInt(`${y}${m.padStart(2, '0')}${d.padStart(2, '0')}`);
        };
        const aDate = parseDate(a['LR Date'] || '');
        const bDate = parseDate(b['LR Date'] || '');
        return sortOrder === 'asc' ? aDate - bDate : bDate - aDate;
      });
    }
    
    return filtered;
  }, [lrs, selectedMonth, selectedYear, selectedStatuses, activeStatusFilter, searchQuery, sortBy, sortOrder]);

  // Using memoizedFilteredLrs directly instead of separate state
  
  // Memoized filtered data calculations
  const statsData = useMemo(() => {
    let statsLrs = lrs;
    
    // Filter by year (dates are in DD-MM-YYYY format)
    if (selectedYear !== 'All Years') {
      statsLrs = statsLrs.filter((lr: LRData) => {
      const lrDate = lr['LR Date'];
      if (!lrDate) return false;
      const parts = lrDate.split('-');
        // parts[2] is the year in DD-MM-YYYY format
        return parts.length === 3 && parts[2] === selectedYear;
      });
    }
    
    // Filter by month
    if (selectedMonth !== 'All Months') {
      const monthIndex = MONTHS.indexOf(selectedMonth) + 1;
      statsLrs = statsLrs.filter((lr: LRData) => {
        const lrDate = lr['LR Date'];
        if (!lrDate) return false;
        const parts = lrDate.split('-');
        return parts.length === 3 && parseInt(parts[1]) === monthIndex;
      });
    }
    
    return statsLrs;
  }, [lrs, selectedMonth, selectedYear]);

  // Memoized stats calculations
  const stats = useMemo(() => {
    // Calculate vehicle type breakdown
    const vehicleTypeBreakdown = {
      PICKUP: statsData.filter((lr: LRData) => lr['Vehicle Type'] === 'PICKUP').length,
      TRUCK: statsData.filter((lr: LRData) => lr['Vehicle Type'] === 'TRUCK').length,
      TOROUS: statsData.filter((lr: LRData) => lr['Vehicle Type'] === 'TOROUS').length,
    };
    
    // Calculate revenue and expenses based on ALL LRs in the selected month
    let totalRevenue = 0;
    let totalExpenses = 0;
    
    // Track separate revenue/expenses for rework, additional, and regular bills
    let reworkRevenue = 0;
    let reworkExpenses = 0;
    let additionalRevenue = 0;
    let additionalExpenses = 0;
    let regularRevenue = 0;
    let regularExpenses = 0;
    
    statsData.forEach((lr: LRData) => {
      const vehicleType = lr['Vehicle Type'] || 'PICKUP';
      
      // Check if it's an additional bill (LR No starts with "ADDITIONAL-")
      const lrNo = (lr['LR No'] || '').toString();
      const isAdditionalRecord = lrNo.startsWith('ADDITIONAL-');
      
      // Check if Consignee column has multiple locations separated by '/'
      const consigneeColumn = (lr['Consignee'] || '').toString().trim();
      const consigneeLocations = consigneeColumn.split('/').filter(loc => loc.trim().length > 0);
      const hasAdditionalDelivery = consigneeLocations.length > 1;
      
      // For backwards compatibility, also check TO column
      const toColumn = (lr['TO'] || '').toString().trim();
      const toLocations = toColumn.split('/').filter(loc => loc.trim().length > 0);
      const hasAdditionalDeliveryInTO = toLocations.length > 1;
      
      // Use either Consignee or TO for multiple locations
      const finalHasAdditionalDelivery = hasAdditionalDelivery || hasAdditionalDeliveryInTO;
      const finalLocationCount = hasAdditionalDelivery ? consigneeLocations.length : (hasAdditionalDeliveryInTO ? toLocations.length : 1);
      
      // Check if it's a rework (Kolhapur → Solapur) - only for non-additional records
      const from = (lr['FROM'] || '').toString().toLowerCase().trim();
      const to = toColumn.toLowerCase().trim();
      const isRework = !isAdditionalRecord && from === 'kolhapur' && to === 'solapur';
      
      // Calculate revenue
      const baseRevenue = VEHICLE_AMOUNTS[vehicleType as keyof typeof VEHICLE_AMOUNTS] || 0;
      let revenue = 0;
      let isAdditional = false;
      
      if (isAdditionalRecord) {
        // Additional bill records: Revenue is already in the Amount field
        revenue = lr['Amount'] || 0;
        additionalRevenue += revenue;
        isAdditional = true;
      } else if (finalHasAdditionalDelivery && !isRework) {
        // Regular LR with multiple delivery locations: Calculate additional amount
        // If 2 locations (1 '/'): charge 1x additional amount
        // If 3 locations (2 '/'): charge 2x additional amount
        // If 4 locations (3 '/'): charge 3x additional amount
        const additionalMultiplier = finalLocationCount - 1;
        const additionalAmount = ADDITIONAL_BILL_AMOUNTS[vehicleType as keyof typeof ADDITIONAL_BILL_AMOUNTS] || 0;
        const calculatedAdditionalAmount = additionalMultiplier * additionalAmount;
        
        // Base revenue goes to regular bills, additional amount goes to additional bills
        revenue = baseRevenue + calculatedAdditionalAmount;
        regularRevenue += baseRevenue; // Base revenue in regular bills
        additionalRevenue += calculatedAdditionalAmount; // Only additional amount in additional bills
        isAdditional = true;
      } else if (isRework) {
        // Rework bills: 80% of regular revenue
        revenue = baseRevenue * REWORK_REVENUE_MULTIPLIER;
        reworkRevenue += revenue;
      } else {
        // Regular bills: Full revenue
        revenue = baseRevenue;
        regularRevenue += revenue;
      }
      
      totalRevenue += revenue;
      
      // Calculate expenses (driver payments)
      let driverPayment = 0;
      
      if (isAdditionalRecord) {
        // Additional bill records: No driver payment (already included in main LR)
        driverPayment = 0;
        additionalExpenses += driverPayment;
      } else if (finalHasAdditionalDelivery && !isRework) {
        // Regular LR with additional deliveries: Still pay regular driver payment
        // (Additional revenue doesn't affect driver payment - driver is paid as regular)
        driverPayment = DRIVER_PAYMENTS[vehicleType as keyof typeof DRIVER_PAYMENTS] || 0;
        // Add to regular expenses since it's a regular LR with additional deliveries
        regularExpenses += driverPayment;
      } else if (isRework) {
        // Rework bills: Rework driver payment
        driverPayment = REWORK_DRIVER_PAYMENTS[vehicleType as keyof typeof REWORK_DRIVER_PAYMENTS] || 0;
        reworkExpenses += driverPayment;
      } else {
        // Regular bills: Regular driver payment
        driverPayment = DRIVER_PAYMENTS[vehicleType as keyof typeof DRIVER_PAYMENTS] || 0;
        regularExpenses += driverPayment;
      }
      
      totalExpenses += driverPayment;
    });
    
    const totalProfit = totalRevenue - totalExpenses;
    const reworkProfit = reworkRevenue - reworkExpenses;
    const additionalProfit = additionalRevenue - additionalExpenses;
    const regularProfit = regularRevenue - regularExpenses;
    
    return {
      total: statsData.length,
      lrDone: statsData.filter((lr: LRData) => lr.status === 'LR Done').length,
      lrCollected: statsData.filter((lr: LRData) => lr.status === 'LR Collected').length,
      billDone: statsData.filter((lr: LRData) => lr.status === 'Bill Done').length,
      billSubmitted: statsData.filter((lr: LRData) => lr.status === 'Bill Submitted').length,
      pendingBills: statsData.filter((lr: LRData) => lr.status === 'LR Collected').length, // LRs collected but bills not generated
      pendingSubmission: statsData.filter((lr: LRData) => lr.status === 'Bill Done').length, // Bills ready to submit
      thisMonth: statsData.length, // Already filtered by month/year, so just show the count
      vehicleTypeBreakdown, // Vehicle type breakdown
      estimatedRevenue: totalRevenue, // Total revenue
      totalExpenses, // Total expenses
      totalProfit, // Total profit
      // Bill type breakdown
      reworkRevenue,
      reworkExpenses,
      reworkProfit,
      additionalRevenue,
      additionalExpenses,
      additionalProfit,
      regularRevenue,
      regularExpenses,
      regularProfit,
      billCompletionRate: statsData.length > 0 ? Math.round((statsData.filter((lr: LRData) => lr.status === 'Bill Done' || lr.status === 'Bill Submitted').length / statsData.length) * 100) : 0, // Percentage of LRs with bills
    };
  }, [statsData]);

  // Calculate charts data from real LR data
  const chartsData = useMemo(() => {
    // Vehicle Type Breakdown with real calculations
    const vehicleBreakdown = {
      PICKUP: { revenue: 0, expenses: 0, profit: 0, count: 0 },
      TRUCK: { revenue: 0, expenses: 0, profit: 0, count: 0 },
      TOROUS: { revenue: 0, expenses: 0, profit: 0, count: 0 },
    };

    statsData.forEach((lr: LRData) => {
      const vehicleType = lr['Vehicle Type'] || 'PICKUP';
      const lrNo = (lr['LR No'] || '').toString();
      const isAdditionalRecord = lrNo.startsWith('ADDITIONAL-');
      
      const consigneeColumn = (lr['Consignee'] || '').toString().trim();
      const consigneeLocations = consigneeColumn.split('/').filter(loc => loc.trim().length > 0);
      const hasAdditionalDelivery = consigneeLocations.length > 1;
      
      const toColumn = (lr['TO'] || '').toString().trim();
      const toLocations = toColumn.split('/').filter(loc => loc.trim().length > 0);
      const hasAdditionalDeliveryInTO = toLocations.length > 1;
      
      const finalHasAdditionalDelivery = hasAdditionalDelivery || hasAdditionalDeliveryInTO;
      const finalLocationCount = hasAdditionalDelivery ? consigneeLocations.length : (hasAdditionalDeliveryInTO ? toLocations.length : 1);
      
      const from = (lr['FROM'] || '').toString().toLowerCase().trim();
      const to = toColumn.toLowerCase().trim();
      const isRework = !isAdditionalRecord && from === 'kolhapur' && to === 'solapur';
      
      const baseRevenue = VEHICLE_AMOUNTS[vehicleType as keyof typeof VEHICLE_AMOUNTS] || 0;
      let revenue = 0;
      
      if (isAdditionalRecord) {
        revenue = lr['Amount'] || 0;
      } else if (finalHasAdditionalDelivery && !isRework) {
        const additionalMultiplier = finalLocationCount - 1;
        const additionalAmount = ADDITIONAL_BILL_AMOUNTS[vehicleType as keyof typeof ADDITIONAL_BILL_AMOUNTS] || 0;
        const calculatedAdditionalAmount = additionalMultiplier * additionalAmount;
        revenue = baseRevenue + calculatedAdditionalAmount;
      } else if (isRework) {
        revenue = baseRevenue * REWORK_REVENUE_MULTIPLIER;
      } else {
        revenue = baseRevenue;
      }
      
      let driverPayment = 0;
      if (isAdditionalRecord) {
        driverPayment = 0;
      } else if (finalHasAdditionalDelivery && !isRework) {
        driverPayment = DRIVER_PAYMENTS[vehicleType as keyof typeof DRIVER_PAYMENTS] || 0;
      } else if (isRework) {
        driverPayment = REWORK_DRIVER_PAYMENTS[vehicleType as keyof typeof REWORK_DRIVER_PAYMENTS] || 0;
      } else {
        driverPayment = DRIVER_PAYMENTS[vehicleType as keyof typeof DRIVER_PAYMENTS] || 0;
      }
      
      vehicleBreakdown[vehicleType as keyof typeof vehicleBreakdown].revenue += revenue;
      vehicleBreakdown[vehicleType as keyof typeof vehicleBreakdown].expenses += driverPayment;
      vehicleBreakdown[vehicleType as keyof typeof vehicleBreakdown].profit += (revenue - driverPayment);
      vehicleBreakdown[vehicleType as keyof typeof vehicleBreakdown].count += 1;
    });

    const vehicleData = [
      { name: 'PICKUP', count: vehicleBreakdown.PICKUP.count, revenue: vehicleBreakdown.PICKUP.revenue, expenses: vehicleBreakdown.PICKUP.expenses, profit: vehicleBreakdown.PICKUP.profit },
      { name: 'TRUCK', count: vehicleBreakdown.TRUCK.count, revenue: vehicleBreakdown.TRUCK.revenue, expenses: vehicleBreakdown.TRUCK.expenses, profit: vehicleBreakdown.TRUCK.profit },
      { name: 'TOROUS', count: vehicleBreakdown.TOROUS.count, revenue: vehicleBreakdown.TOROUS.revenue, expenses: vehicleBreakdown.TOROUS.expenses, profit: vehicleBreakdown.TOROUS.profit },
    ];

    // Bill Type Distribution - Calculate from statsData instead of using stats
    let regularRevenue = 0;
    let reworkRevenue = 0;
    let additionalRevenue = 0;

    statsData.forEach((lr: LRData) => {
      const vehicleType = lr['Vehicle Type'] || 'PICKUP';
      const lrNo = (lr['LR No'] || '').toString();
      const isAdditionalRecord = lrNo.startsWith('ADDITIONAL-');
      
      const consigneeColumn = (lr['Consignee'] || '').toString().trim();
      const consigneeLocations = consigneeColumn.split('/').filter(loc => loc.trim().length > 0);
      const hasAdditionalDelivery = consigneeLocations.length > 1;
      
      const toColumn = (lr['TO'] || '').toString().trim();
      const toLocations = toColumn.split('/').filter(loc => loc.trim().length > 0);
      const hasAdditionalDeliveryInTO = toLocations.length > 1;
      
      const finalHasAdditionalDelivery = hasAdditionalDelivery || hasAdditionalDeliveryInTO;
      const finalLocationCount = hasAdditionalDelivery ? consigneeLocations.length : (hasAdditionalDeliveryInTO ? toLocations.length : 1);
      
      const from = (lr['FROM'] || '').toString().toLowerCase().trim();
      const to = toColumn.toLowerCase().trim();
      const isRework = !isAdditionalRecord && from === 'kolhapur' && to === 'solapur';
      
      const baseRevenue = VEHICLE_AMOUNTS[vehicleType as keyof typeof VEHICLE_AMOUNTS] || 0;
      let revenue = 0;
      
      if (isAdditionalRecord) {
        revenue = lr['Amount'] || 0;
        additionalRevenue += revenue;
      } else if (finalHasAdditionalDelivery && !isRework) {
        const additionalMultiplier = finalLocationCount - 1;
        const additionalAmount = ADDITIONAL_BILL_AMOUNTS[vehicleType as keyof typeof ADDITIONAL_BILL_AMOUNTS] || 0;
        const calculatedAdditionalAmount = additionalMultiplier * additionalAmount;
        regularRevenue += baseRevenue;
        additionalRevenue += calculatedAdditionalAmount;
        revenue = baseRevenue + calculatedAdditionalAmount;
      } else if (isRework) {
        revenue = baseRevenue * REWORK_REVENUE_MULTIPLIER;
        reworkRevenue += revenue;
      } else {
        revenue = baseRevenue;
        regularRevenue += revenue;
      }
    });

    const billTypeTotal = regularRevenue + reworkRevenue + additionalRevenue;
    const billTypeData = [
      { name: 'Regular', value: billTypeTotal > 0 ? Math.round((regularRevenue / billTypeTotal) * 100) : 0, color: '#0088FE' },
      { name: 'Rework', value: billTypeTotal > 0 ? Math.round((reworkRevenue / billTypeTotal) * 100) : 0, color: '#00C49F' },
      { name: 'Additional', value: billTypeTotal > 0 ? Math.round((additionalRevenue / billTypeTotal) * 100) : 0, color: '#FFBB28' },
    ];

    // Monthly Trends (last 6 months from current month)
    const monthlyData = [];
    const currentDate = new Date();
    for (let i = 5; i >= 0; i--) {
      const targetDate = new Date(currentDate);
      targetDate.setMonth(currentDate.getMonth() - i);
      const monthName = targetDate.toLocaleDateString('en-US', { month: 'short' });
      const targetMonth = targetDate.getMonth() + 1;
      const targetYear = targetDate.getFullYear().toString();

      let monthRevenue = 0;
      let monthExpenses = 0;

      statsData.forEach((lr: LRData) => {
        const lrDate = lr['LR Date'];
        if (!lrDate) return;
        const parts = lrDate.split('-');
        if (parts.length !== 3) return;
        if (parts[1] !== targetMonth.toString() || parts[2] !== targetYear) return;

        const vehicleType = lr['Vehicle Type'] || 'PICKUP';
        const lrNo = (lr['LR No'] || '').toString();
        const isAdditionalRecord = lrNo.startsWith('ADDITIONAL-');
        
        const consigneeColumn = (lr['Consignee'] || '').toString().trim();
        const consigneeLocations = consigneeColumn.split('/').filter(loc => loc.trim().length > 0);
        const hasAdditionalDelivery = consigneeLocations.length > 1;
        
        const toColumn = (lr['TO'] || '').toString().trim();
        const toLocations = toColumn.split('/').filter(loc => loc.trim().length > 0);
        const hasAdditionalDeliveryInTO = toLocations.length > 1;
        
        const finalHasAdditionalDelivery = hasAdditionalDelivery || hasAdditionalDeliveryInTO;
        const finalLocationCount = hasAdditionalDelivery ? consigneeLocations.length : (hasAdditionalDeliveryInTO ? toLocations.length : 1);
        
        const from = (lr['FROM'] || '').toString().toLowerCase().trim();
        const to = toColumn.toLowerCase().trim();
        const isRework = !isAdditionalRecord && from === 'kolhapur' && to === 'solapur';
        
        const baseRevenue = VEHICLE_AMOUNTS[vehicleType as keyof typeof VEHICLE_AMOUNTS] || 0;
        let revenue = 0;
        
        if (isAdditionalRecord) {
          revenue = lr['Amount'] || 0;
        } else if (finalHasAdditionalDelivery && !isRework) {
          const additionalMultiplier = finalLocationCount - 1;
          const additionalAmount = ADDITIONAL_BILL_AMOUNTS[vehicleType as keyof typeof ADDITIONAL_BILL_AMOUNTS] || 0;
          const calculatedAdditionalAmount = additionalMultiplier * additionalAmount;
          revenue = baseRevenue + calculatedAdditionalAmount;
        } else if (isRework) {
          revenue = baseRevenue * REWORK_REVENUE_MULTIPLIER;
        } else {
          revenue = baseRevenue;
        }
        
        let driverPayment = 0;
        if (isAdditionalRecord) {
          driverPayment = 0;
        } else if (finalHasAdditionalDelivery && !isRework) {
          driverPayment = DRIVER_PAYMENTS[vehicleType as keyof typeof DRIVER_PAYMENTS] || 0;
        } else if (isRework) {
          driverPayment = REWORK_DRIVER_PAYMENTS[vehicleType as keyof typeof REWORK_DRIVER_PAYMENTS] || 0;
        } else {
          driverPayment = DRIVER_PAYMENTS[vehicleType as keyof typeof DRIVER_PAYMENTS] || 0;
        }
        
        monthRevenue += revenue;
        monthExpenses += driverPayment;
      });

      monthlyData.push({
        month: monthName,
        revenue: monthRevenue,
        expenses: monthExpenses,
        profit: monthRevenue - monthExpenses,
      });
    }

    return { vehicleData, monthlyData, billTypeData };
  }, [statsData]);

  // Removed the old useEffect that called filterLRs - now using memoized filtered LRs
  
  // Memoized pagination calculations
  const totalPages = Math.ceil(memoizedFilteredLrs.length / itemsPerPage);
  const { paginatedLrs, startIndex, endIndex } = useMemo(() => {
    const startIdx = (currentPage - 1) * itemsPerPage;
    const endIdx = startIdx + itemsPerPage;
    return {
      paginatedLrs: memoizedFilteredLrs.slice(startIdx, endIdx),
      startIndex: startIdx,
      endIndex: endIdx,
    };
  }, [memoizedFilteredLrs, currentPage, itemsPerPage]);
  
  // ALL OTHER HOOKS MUST BE BEFORE RETURNS
  useEffect(() => {
    if (status !== 'loading' && status !== 'unauthenticated') {
      loadLRs();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);
  
  useEffect(() => {
    if (status === 'unauthenticated' && typeof window !== 'undefined') {
      router.push('/login');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs/textarea
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        // Allow / to focus search from anywhere
        if (e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey) {
          e.preventDefault();
          const searchInput = document.querySelector('input[placeholder*="Search"]') as HTMLInputElement;
          if (searchInput) {
            searchInput.focus();
            searchInput.select();
          }
        }
        return;
      }

      // / - Focus search
      if (e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        const searchInput = document.querySelector('input[placeholder*="Search"]') as HTMLInputElement;
        if (searchInput) {
          searchInput.focus();
          searchInput.select();
        }
        return;
      }

      // Ctrl/Cmd + N - New LR
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        if (currentView === 'dashboard') {
          // Create new LR - using state setters directly
          setEditingLr(null);
          setCurrentView('form');
        }
        return;
      }

      // Esc - Close modals
      if (e.key === 'Escape') {
        if (showLrDetails) {
          setShowLrDetails(false);
        }
        if (showResultsModal) {
          setShowResultsModal(false);
        }
        if (showDownloadModal) {
          setShowDownloadModal(false);
        }
        if (showStatsPasswordModal) {
          setShowStatsPasswordModal(false);
          setStatsPassword('');
        }
        if (contextMenu) {
          setContextMenu(null);
        }
        return;
      }

      // Ctrl/Cmd + F - Export (Note: exportToExcel defined later, use refetch to trigger)
      // Skipping export shortcut to avoid dependency issues
      // Users can click the export button directly
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentView, showLrDetails, showResultsModal, showDownloadModal, showStatsPasswordModal, contextMenu, memoizedFilteredLrs.length]);
  
  // NOW WE CAN DO EARLY RETURNS AFTER ALL HOOKS
  if (status === 'loading') {
    return <LoadingSkeleton />;
  }
  
  if (status === 'unauthenticated') {
    return null;
  }
  
  // Helper functions - must be defined before conditional returns
  // Go to page
  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };
  
  // Toggle LR selection
  const toggleLRSelection = (lrNo: string) => {
    const newSelected = new Set(selectedLrs);
    if (newSelected.has(lrNo)) {
      newSelected.delete(lrNo);
    } else {
      newSelected.add(lrNo);
    }
    setSelectedLrs(newSelected);
  };
  
  // Select/Deselect all
  const selectAll = () => {
    const newSelected = new Set<string>(memoizedFilteredLrs.map((lr: LRData) => lr['LR No']).filter((lrNo: string | undefined): lrNo is string => !!lrNo));
    setSelectedLrs(newSelected);
  };
  
  const deselectAll = () => {
    setSelectedLrs(new Set());
  };
  
  // Delete selected LRs (using React Query mutation)
  const deleteSelected = async () => {
    if (selectedLrs.size === 0) {
      toast.error('Please select at least one LR to delete');
      return;
    }
    
    if (!confirm(`Are you sure you want to delete ${selectedLrs.size} LR(s)?`)) {
      return;
    }
    
    deleteLRsMutation.mutate(Array.from(selectedLrs));
  };
  
  // Edit LR
  const editLR = (lr: LRData) => {
    setEditingLr(lr);
    setCurrentView('form');
  };
  
  // Create new LR
  const createNewLR = () => {
    setEditingLr(null);
    setCurrentView('form');
  };
  
  // Back to dashboard
  const backToDashboard = () => {
    setEditingLr(null);
    setCurrentView('dashboard');
    // Ensure fresh data immediately when returning from form
    queryClient.invalidateQueries({ queryKey: ['lrs'] });
    loadLRs();
  };

  // Status change guard: prevent accidental downgrades
  const STATUS_ORDER: Record<string, number> = {
    'LR Done': 1,
    'LR Collected': 2,
    'Bill Done': 3,
    'Bill Submitted': 4,
  };

  const isDowngrade = (currentStatus?: string, nextStatus?: string) => {
    if (!currentStatus || !nextStatus) return false;
    const currentRank = STATUS_ORDER[currentStatus] ?? 0;
    const nextRank = STATUS_ORDER[nextStatus] ?? 0;
    return nextRank < currentRank;
  };

  const showStatusDowngradeToast = (
    lrNo: string,
    currentStatus: string | undefined,
    nextStatus: string,
    onConfirm: () => void
  ) => {
    const id = toast.custom((t) => (
      <div className={`max-w-sm w-full bg-white border border-amber-300 shadow-lg rounded-md p-3 md:p-4 ${t.visible ? 'animate-enter' : 'animate-leave'}`}>
        <div className="flex items-start gap-3">
          <div className="text-amber-600">⚠️</div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-amber-800">Potential status downgrade</p>
            <p className="text-xs text-amber-700 mt-1 break-words">LR {lrNo}: {currentStatus || '-'} → {nextStatus}</p>
            <p className="text-xs text-amber-700 mt-1">Proceed only if intentional.</p>
            <div className="mt-3 flex items-center gap-2">
              <button
                className="px-3 py-1.5 text-xs rounded bg-amber-600 text-white hover:bg-amber-700"
                onClick={() => {
                  toast.dismiss(id);
                  onConfirm();
                  toast.success('Status updated');
                }}
              >
                Proceed
              </button>
              <button
                className="px-3 py-1.5 text-xs rounded border border-gray-300 hover:bg-gray-50"
                onClick={() => {
                  toast.dismiss(id);
                  toast('Status change cancelled');
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    ), { duration: 60000, position: 'top-center' });
  };

  const confirmAndUpdateStatus = (lrNo: string, currentStatus: string | undefined, nextStatus: string) => {
    if (isDowngrade(currentStatus, nextStatus)) {
      showStatusDowngradeToast(lrNo, currentStatus, nextStatus, () => updateLRStatus(lrNo, nextStatus));
      return;
    }
    updateLRStatus(lrNo, nextStatus);
  };
  
  // Helper function to extract first word from consignee
  const extractFirstWord = (text: string): string => {
    if (!text) return '';
    let word = '';
    let foundAlpha = false;
    
    for (let char of text) {
      // Check if character is alphabetic (a-z or A-Z)
      if (/[a-zA-Z]/.test(char)) {
        word += char;
        foundAlpha = true;
      } else if (foundAlpha) {
        // Stop when we hit non-alphabetic character after finding letters
        break;
      }
      // Skip non-alphabetic at the beginning
    }
    
    return word || '';
  };
  
  // Get display TO value from consignee
  const getToValue = (consignee: string): string => {
    if (!consignee || consignee.trim() === '') return '-';
    const consignees = consignee.split('/').map(c => c.trim());
    const firstWords = consignees.map(c => extractFirstWord(c)).filter(w => w.length > 0);
    return firstWords.length > 0 ? firstWords.join('/') : '-';
  };

  // Helper function to check if Rework Bill should be enabled
  const isReworkBillAllowed = (): boolean => {
    if (selectedLrs.size === 0) return false;
    
    // Check if all selected LRs have FROM='KOLHAPUR' and TO='Solapur' (case insensitive)
    return Array.from(selectedLrs).every((lrNo: string) => {
      const lr = lrs.find((l: LRData) => l['LR No'] === lrNo);
      if (!lr) return false;
      
      const from = lr['FROM']?.toLowerCase().trim() || '';
      const to = lr['TO']?.toLowerCase().trim() || '';
      
      return from === 'kolhapur' && to === 'solapur';
    });
  };

  // Helper function to check if selection has mixed routes
  // Returns true if ALL are same route type, false if mixed
  const hasConsistentRoutes = (): boolean => {
    if (selectedLrs.size === 0) return true; // Empty selection is consistent
    
    const selectedArray = Array.from(selectedLrs);
    const firstLr = lrs.find((l: LRData) => l['LR No'] === selectedArray[0]);
    if (!firstLr) return false;
    
    const firstFrom = firstLr['FROM']?.toLowerCase().trim() || '';
    const firstTo = firstLr['TO']?.toLowerCase().trim() || '';
    const isFirstRework = firstFrom === 'kolhapur' && firstTo === 'solapur';
    
    // Check if all selected LRs have the same route type as the first one
    return selectedArray.every((lrNo: string) => {
      const lr = lrs.find((l: LRData) => l['LR No'] === lrNo);
      if (!lr) return false;
      
      const from = lr['FROM']?.toLowerCase().trim() || '';
      const to = lr['TO']?.toLowerCase().trim() || '';
      const isRework = from === 'kolhapur' && to === 'solapur';
      
      return isRework === isFirstRework;
    });
  };

  // Helper function to check if Additional Bill should be visible
  // Show if ANY selected LRs have 2+ consignees (not ALL)
  const isAdditionalBillAllowed = (): boolean => {
    if (selectedLrs.size === 0) return false;
    
    return Array.from(selectedLrs).some((lrNo: string) => {
      const lr = lrs.find((l: LRData) => l['LR No'] === lrNo);
      if (!lr || !lr['Consignee']) return false;
      
      // Count consignees by splitting on '/' and filtering empty strings
      const consignees = lr['Consignee'].split('/').map((c: string) => c.trim()).filter((c: string) => c.length > 0);
      return consignees.length >= 2;
    });
  };

  // Helper function to get compatible LRs for Additional Bill (2+ consignees)
  const getCompatibleAdditionalBillLrs = (): string[] => {
    return Array.from(selectedLrs).filter((lrNo: string) => {
      const lr = lrs.find((l: LRData) => l['LR No'] === lrNo);
      if (!lr || !lr['Consignee']) return false;
      
      // Count consignees by splitting on '/' and filtering empty strings
      const consignees = lr['Consignee'].split('/').map((c: string) => c.trim()).filter((c: string) => c.length > 0);
      return consignees.length >= 2;
    });
  };

  // Handle bill selection modal
  // Categorize selected LRs by bill type
  const categorizeSelectedLrs = () => {
    const reworkLrs: string[] = [];
    const additionalLrs: string[] = [];
    const regularLrs: string[] = [];
    
    Array.from(selectedLrs).forEach((lrNo: string) => {
      const lr = lrs.find((l: LRData) => l['LR No'] === lrNo);
      if (!lr) return;
      
      // Case-insensitive comparison
      const from = (lr['FROM'] || '').toString().toLowerCase().trim();
      const to = (lr['TO'] || '').toString().toLowerCase().trim();
      
      // Rework: Kolhapur → Solapur (case-insensitive, regardless of consignee count)
      const isRework = from === 'kolhapur' && to === 'solapur';
      
      const consignees = lr['Consignee']?.split('/').map((c: string) => c.trim()).filter((c: string) => c.length > 0) || [];
      const hasMultipleConsignees = consignees.length >= 2;
      
      if (isRework) {
        // Rework: Kolhapur → Solapur (any number of consignees)
        // Do NOT add to Regular Bill
        // Do NOT add to Additional Bill
        reworkLrs.push(lrNo);
      } else {
        // Regular: All LRs EXCEPT Kolhapur → Solapur
        regularLrs.push(lrNo);
        
        // Additional: ONLY for non-Rework LRs with 2+ consignees
        if (hasMultipleConsignees) {
          additionalLrs.push(lrNo);
        }
      }
    });
    
    return { reworkLrs, additionalLrs, regularLrs };
  };

  // Function to validate LRs and find issues
  const validateSelectedLrs = () => {
    const issues: { lrNo: string, type: 'warning' | 'error', message: string }[] = [];
    const lrDetails = Array.from(selectedLrs).map((lrNo: string) => {
      const lr = lrs.find((l: LRData) => l['LR No'] === lrNo);
      if (!lr) return null;
      
      // Check for issues
      if (!lr['Vehicle Number'] || lr['Vehicle Number'].trim() === '') {
        issues.push({ lrNo, type: 'warning', message: 'Missing vehicle number' });
      }
      
      if (!lr['FROM'] || lr['FROM'].trim() === '') {
        issues.push({ lrNo, type: 'error', message: 'Missing FROM location' });
      }
      
      if (!lr['TO'] || lr['TO'].trim() === '') {
        issues.push({ lrNo, type: 'error', message: 'Missing TO location' });
      }
      
      // Validate date format (DD-MM-YYYY)
      const dateRegex = /^\d{2}-\d{2}-\d{4}$/;
      if (!lr['LR Date'] || !dateRegex.test(lr['LR Date'])) {
        issues.push({ lrNo, type: 'error', message: 'Invalid LR date format' });
      }
      
      return lr;
    }).filter((lr: LRData | null) => lr !== null);
    
    return { lrDetails, issues };
  };
  
  // Function to calculate estimated bill amounts
  const calculateEstimatedAmounts = () => {
    const { reworkLrs, additionalLrs, regularLrs } = categorizeSelectedLrs();
    
    let totalAmount = 0;
    const breakdown = {
      rework: 0,
      additional: 0,
      regular: 0,
    };
    
    // Calculate rework bill amounts (80% of vehicle amount)
    reworkLrs.forEach((lrNo: string) => {
      const lr = lrs.find((l: LRData) => l['LR No'] === lrNo);
      if (lr) {
        const vehicleType = lr['Vehicle Type'] || 'PICKUP';
        const baseAmount = VEHICLE_AMOUNTS[vehicleType as keyof typeof VEHICLE_AMOUNTS] || 0;
        const amount = Math.round(baseAmount * 0.8);
        breakdown.rework += amount;
        totalAmount += amount;
      }
    });
    
    // Calculate additional bill amounts
    additionalLrs.forEach((lrNo: string) => {
      const lr = lrs.find((l: LRData) => l['LR No'] === lrNo);
      if (lr) {
        const vehicleType = lr['Vehicle Type'] || 'PICKUP';
        const amount = ADDITIONAL_BILL_AMOUNTS[vehicleType as keyof typeof ADDITIONAL_BILL_AMOUNTS] || 0;
        breakdown.additional += amount;
        totalAmount += amount;
      }
    });
    
    // Calculate regular bill amounts
    regularLrs.forEach((lrNo: string) => {
      const lr = lrs.find((l: LRData) => l['LR No'] === lrNo);
      if (lr) {
        const vehicleType = lr['Vehicle Type'] || 'PICKUP';
        const amount = VEHICLE_AMOUNTS[vehicleType as keyof typeof VEHICLE_AMOUNTS] || 0;
        breakdown.regular += amount;
        totalAmount += amount;
      }
    });
    
    return { totalAmount, breakdown };
  };
  
  // Generate all bill types in one click
  const handleGenerateAllBills = () => {
    if (selectedLrs.size === 0) {
      toast.error('Please select at least one LR to generate bills');
      return;
    }
    
    // Categorize LRs first
    const categorized = categorizeSelectedLrs();
    setCategorizedLrs(categorized);
    
    // Show modal with bill number inputs (preview will be shown in the modal)
    setShowDatePicker(true);
  };
  
  const confirmGenerateAllBills = async () => {
    if (!submissionDate) {
      toast.error('Please select a submission date');
      return;
    }
    
    setShowDatePicker(false);
    setLoading(true);
    
    const { reworkLrs, additionalLrs, regularLrs } = categorizeSelectedLrs();
    const allResults: any[] = [];
    const allErrors: any[] = [];
    
    try {
      // 1. Generate Rework Bills
      if (reworkLrs.length > 0) {
        try {
          const fullReworkBillNo = reworkBillNo ? `MT/25-26/${reworkBillNo}` : `MT/25-26/REWORK-${Date.now()}`;
          const response = await fetch('/api/rework-bills/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submissionDate,
              billNo: fullReworkBillNo,
              entries: reworkLrs.map((lrNo: string) => {
                const lr = lrs.find((l: LRData) => l['LR No'] === lrNo);
                if (!lr) return null;
                const vehicleType = lr['Vehicle Type'] || 'PICKUP';
                const baseAmount = VEHICLE_AMOUNTS[vehicleType as keyof typeof VEHICLE_AMOUNTS] || 0;
                return {
                  'LR Date': lr['LR Date'] || '',
                  'LR No': lr['LR No'] || '',
                  'Vehicle No': lr['Vehicle Number'] || '',
                  'Vehicle Type': vehicleType,
                  'FROM': lr['FROM'] || '',
                  'TO': lr['TO'] || '',
                  'Amount': Math.round(baseAmount * 0.8),
                };
              }).filter((e: any) => e !== null),
        }),
      });
      
      const data = await response.json();
      if (data.success) {
        allResults.push({ type: 'rework', count: reworkLrs.length, data });
      } else {
        allErrors.push({ type: 'rework', count: reworkLrs.length, error: data.error });
      }
        } catch (error) {
          allErrors.push({ type: 'rework', count: reworkLrs.length, error: (error as Error).message });
        }
      }
      
      // 2. Generate Additional Bills
      if (additionalLrs.length > 0) {
        try {
          const fullAdditionalBillNo = additionalBillNo ? `MT/25-26/${additionalBillNo}` : `MT/25-26/ADD-${Date.now()}`;
          const response = await fetch('/api/additional-bills/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              submissionDate,
              billNo: fullAdditionalBillNo,
              entries: additionalLrs.map((lrNo: string) => {
                const lr = lrs.find((l: LRData) => l['LR No'] === lrNo);
                if (!lr) return null;
                const vehicleType = lr['Vehicle Type'] || 'PICKUP';
                // Use ADDITIONAL_BILL_AMOUNTS instead of VEHICLE_AMOUNTS
                const additionalAmount = ADDITIONAL_BILL_AMOUNTS[vehicleType as keyof typeof ADDITIONAL_BILL_AMOUNTS] || 0;
                const consignees = lr['Consignee']?.split('/').map((c: string) => c.trim()).filter((c: string) => c.length > 0) || [];
                return {
                  'LR Date': lr['LR Date'] || '',
                  'LR No': lr['LR No'] || '',
                  'Vehicle No': lr['Vehicle Number'] || '',
                  'Vehicle Type': vehicleType,
                  'FROM': lr['FROM'] || '',
                  'Delivery Locations': consignees.slice(0, 2),
                  'Amount': additionalAmount,
                  'Delivery Count': consignees.length,
                };
              }).filter((e: any) => e !== null),
            }),
          });
          
          const data = await response.json();
          if (data.success) {
            allResults.push({ type: 'additional', count: additionalLrs.length, data });
          } else {
            allErrors.push({ type: 'additional', count: additionalLrs.length, error: data.error });
          }
        } catch (error) {
          allErrors.push({ type: 'additional', count: additionalLrs.length, error: (error as Error).message });
        }
      }
      
      // 3. Generate Regular Bills
      if (regularLrs.length > 0) {
        try {
          const response = await fetch('/api/generate-bills', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              lrNumbers: regularLrs,
              submissionDate,
            }),
          });
          
          const data = await response.json();
          if (data.success) {
            allResults.push({ type: 'regular', count: regularLrs.length, results: data.results });
          } else {
            allErrors.push({ type: 'regular', count: regularLrs.length, error: data.error });
          }
        } catch (error) {
          allErrors.push({ type: 'regular', count: regularLrs.length, error: (error as Error).message });
        }
      }
      
      // Prepare results for display
      const summary = {
        rework: reworkLrs.length,
        additional: additionalLrs.length,
        regular: regularLrs.length,
        total: reworkLrs.length + additionalLrs.length + regularLrs.length
      };
      
      if (allResults.length > 0) {
        setGenerationResults({
          success: true,
          summary,
          results: allResults,
          errors: allErrors,
          submissionDate,
        });
        setShowResultsModal(true);
        setSelectedLrs(new Set());
      }
      
      if (allErrors.length > 0 && allResults.length === 0) {
        toast.error(`All bills failed: ${allErrors.map(e => `${e.type}`).join(', ')}`);
      }
    } catch (error) {
      toast.error('Failed to generate bills. Please check if template files exist.');
    } finally {
      setLoading(false);
    }
  };
  
  // Update LR status (using React Query mutation)
  const updateLRStatus = async (lrNo: string, newStatus: string) => {
    // Use React Query mutation for status update
    statusUpdateMutation.mutate({ lrNo, status: newStatus });
  };
  
  // Bulk status change
  const handleBulkStatusChange = () => {
    if (selectedLrs.size === 0) {
      toast.error('Please select at least one LR to change status');
      return;
    }
    setShowBulkStatusModal(true);
  };
  
  const confirmBulkStatusChange = async () => {
    if (!bulkStatus) return;
    
    setShowBulkStatusModal(false);
    
    // Use React Query mutation for bulk status update
    bulkStatusUpdateMutation.mutate(
      { lrNumbers: Array.from(selectedLrs), status: bulkStatus },
      {
        onSuccess: () => {
          setSelectedLrs(new Set());
          setBulkStatus('LR Done');
        },
      }
    );
  };
  
  // Get status color
  const getStatusColor = (status: string) => {
    return STATUS_COLORS[status as keyof typeof STATUS_COLORS] || STATUS_COLORS['LR Done'];
  };
  
  // Download file
  const downloadFile = (filePath: string) => {
    // If caller passed a path containing a folder, use it directly. Otherwise fall back to current submissionDate.
    const hasFolder = /[/\\]/.test(filePath);
    const fileName = filePath.split(/[/\\]/).pop() || 'file.xlsx';
    const relativePath = hasFolder ? filePath : `${submissionDate}/${fileName}`;

    const link = document.createElement('a');
    link.href = `/api/download-file?path=${encodeURIComponent(relativePath)}`;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  // Download all files
  const downloadAllFiles = async () => {
    if (!submissionDate || generatedFiles.length === 0) return;
    
    for (const result of generatedFiles) {
      downloadFile(result.files.lrFile);
      await new Promise(resolve => setTimeout(resolve, 500));
      
      downloadFile(result.files.invoiceFile);
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    if (generatedFiles.length > 0) {
      downloadFile(generatedFiles[0].files.finalSheet);
    }
  };

  // Generate Provision sheet and download
  const handleGenerateProvision = async () => {
    setProvisionLoading(true);
    try {
      const res = await fetch('/api/provision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data?.error || 'Failed to generate');
      }
      // data.filePath is relative to invoices; reuse existing downloader
      downloadFile(data.filePath);
      toast.success('Provision sheet generated');
    } catch (e: any) {
      toast.error(e.message || 'Failed to generate provision');
    } finally {
      setProvisionLoading(false);
    }
  };
  
  const closeDownloadModal = () => {
    setShowDownloadModal(false);
    setGeneratedFiles([]);
    // Don't clear submissionDate here - it's used by results modal
  };
  
  // Toggle bill type selection
  const toggleBillType = (type: string) => {
    const newSelected = new Set(selectedBillTypes);
    if (newSelected.has(type)) {
      newSelected.delete(type);
    } else {
      newSelected.add(type);
    }
    setSelectedBillTypes(newSelected);
  };
  
  // Create and download ZIP file
  const downloadSelectedFiles = async () => {
    if (selectedBillTypes.size === 0) {
      toast.error('Please select at least one bill type to download');
      return;
    }
    
    if (!generationResults) return;
    
    setZipDownloading(true);
    
    try {
      const zip = new JSZip();
      let fileCount = 0;
      
      // Add bill type files
      for (const result of generationResults.results) {
        if (selectedBillTypes.has(result.type)) {
          if (result.type === 'regular' && result.results) {
            // Add regular bill files
            for (const entry of result.results) {
              if (entry.files) {
                // Add LR file - use relative path directly
                const lrPath = entry.files.lrFile;
                const lrFileName = lrPath.split('/').pop() || lrPath.split('\\').pop() || 'lr.xlsx';
                const lrResponse = await fetch(`/api/download-file?path=${encodeURIComponent(lrPath)}`);
                if (lrResponse.ok) {
                  const lrBlob = await lrResponse.blob();
                  zip.file(lrFileName, lrBlob);
                  fileCount++;
                }
                
                // Add invoice file - use relative path directly
                const invoicePath = entry.files.invoiceFile;
                const invoiceFileName = invoicePath.split('/').pop() || invoicePath.split('\\').pop() || 'invoice.xlsx';
                const invoiceResponse = await fetch(`/api/download-file?path=${encodeURIComponent(invoicePath)}`);
                if (invoiceResponse.ok) {
                  const invoiceBlob = await invoiceResponse.blob();
                  zip.file(invoiceFileName, invoiceBlob);
                  fileCount++;
                }
              }
            }
          } else if (result.type === 'rework' && result.data) {
            // Add rework bill file
            if (result.data.billFilePath) {
              const billFileName = result.data.billFilePath.split('/').pop()?.split('\\').pop() || 'rework-bill.xlsx';
              const billResponse = await fetch(`/api/download-file?path=${encodeURIComponent(result.data.billFilePath)}`);
              if (billResponse.ok) {
                const billBlob = await billResponse.blob();
                zip.file(billFileName, billBlob);
                fileCount++;
              }
            }
            
            // Add rework invoice file
            if (result.data.invoiceFilePath) {
              const invoiceFileName = result.data.invoiceFilePath.split('/').pop()?.split('\\').pop() || 'rework-invoice.xlsx';
              const invoiceResponse = await fetch(`/api/download-file?path=${encodeURIComponent(result.data.invoiceFilePath)}`);
              if (invoiceResponse.ok) {
                const invoiceBlob = await invoiceResponse.blob();
                zip.file(invoiceFileName, invoiceBlob);
                fileCount++;
              }
            }
          } else if (result.type === 'additional' && result.data) {
            // Add additional bill file
            if (result.data.billFilePath) {
              const billFileName = result.data.billFilePath.split('/').pop()?.split('\\').pop() || 'additional-bill.xlsx';
              const billResponse = await fetch(`/api/download-file?path=${encodeURIComponent(result.data.billFilePath)}`);
              if (billResponse.ok) {
                const billBlob = await billResponse.blob();
                zip.file(billFileName, billBlob);
                fileCount++;
              }
            }
            
            // Add additional invoice file
            if (result.data.invoiceFilePath) {
              const invoiceFileName = result.data.invoiceFilePath.split('/').pop()?.split('\\').pop() || 'additional-invoice.xlsx';
              const invoiceResponse = await fetch(`/api/download-file?path=${encodeURIComponent(result.data.invoiceFilePath)}`);
              if (invoiceResponse.ok) {
                const invoiceBlob = await invoiceResponse.blob();
                zip.file(invoiceFileName, invoiceBlob);
                fileCount++;
              }
            }
          }
        }
      }
      
      // Add final submission sheet if selected
      if (includeFinalSheet) {
        const regularResult = generationResults.results.find((r: any) => r.type === 'regular' && r.results);
        const finalSheetPath = regularResult?.results?.[0]?.files?.finalSheet;
        if (finalSheetPath) {
          const fileName = finalSheetPath.split('/').pop()?.split('\\').pop() || 'Final Submission Sheet.xlsx';
          const rel = finalSheetPath.includes('/invoices/')
            ? finalSheetPath.split('/invoices/')[1]
            : (finalSheetPath.includes('\\invoices\\') ? finalSheetPath.split('\\invoices\\')[1] : finalSheetPath);
          const finalSheetResponse = await fetch(`/api/download-file?path=${encodeURIComponent(rel)}`);
          if (finalSheetResponse.ok) {
            const finalBlob = await finalSheetResponse.blob();
            zip.file(fileName, finalBlob);
            fileCount++;
          }
        }
      }
      
      // Generate and download ZIP
      const blob = await zip.generateAsync({ type: 'blob' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Bills_${submissionDate}_${new Date().getTime()}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      toast.success(`Downloaded ${fileCount} file(s) as ZIP`);
    } catch (error) {
      console.error('Error creating ZIP:', error);
      toast.error('Failed to create ZIP file. Please try individual downloads.');
    } finally {
      setZipDownloading(false);
    }
  };

  // Generate years for filter
  const currentYear = new Date().getFullYear();
  const years = ['All Years', String(currentYear - 2), String(currentYear - 1), String(currentYear), String(currentYear + 1), String(currentYear + 2)];

  // SECURITY: Redirect to login if not authenticated
  if (!session) {
    // Use Next.js router to redirect to login
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
    return null; // Don't render anything while redirecting
  }

  if (currentView === 'form') {
    return <LRForm editingLr={editingLr} onBack={backToDashboard} />;
  }

  if (currentView === 'rework-bill') {
    return <ReworkBillForm onBack={backToDashboard} selectedLrs={Array.from(selectedLrs)} />;
  }

  if (currentView === 'additional-bill') {
    return <AdditionalBillForm onBack={backToDashboard} selectedLrs={getCompatibleAdditionalBillLrs()} />;
  }

  // Main dashboard view
  return (
    <>
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-50">
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white py-4 md:py-6 shadow-lg">
        <div className="container mx-auto px-3 md:px-4">
          <div className="flex items-center justify-between gap-3 md:gap-6">
            {/* Left: Logo and Title */}
            <div className="flex items-center gap-2 sm:gap-3 md:gap-4 min-w-0 flex-1">
              <div className="bg-white/20 backdrop-blur-sm p-2 md:p-3 rounded-lg flex-shrink-0">
                <Truck className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8" />
              </div>
              <div className="min-w-0">
                <h1 className="text-lg sm:text-xl md:text-3xl lg:text-4xl font-bold truncate">LR Billing Dashboard</h1>
                <p className="text-blue-100 mt-0.5 sm:mt-1 text-[10px] sm:text-xs md:text-sm hidden sm:block">Mangesh Transport - Complete LR Management</p>
              </div>
            </div>
            
            {/* Right: Action Buttons + User Profile */}
            <div className="flex flex-shrink-0 gap-2 items-center">
              <Button 
                onClick={createNewLR} 
                size="lg"
                className="bg-white text-blue-600 hover:bg-blue-50 shadow-lg font-semibold text-xs sm:text-sm md:text-base px-2 sm:px-3 md:px-4 active:scale-95 transition-transform duration-150 hover:shadow-xl hover:scale-105"
              >
                <Plus className="mr-1 sm:mr-2 h-4 w-4 md:h-5 md:w-5" />
                <span className="hidden md:inline">Create New LR</span>
                <span className="hidden sm:inline md:hidden">New LR</span>
                <span className="sm:hidden">New</span>
              </Button>
              
              {/* User Profile Dropdown - Always visible, inline with buttons */}
              {session && (
                <div className="border-l border-white/30 pl-2">
                  <UserProfileDropdown 
                    email={session.user?.email ?? undefined}
                    name={session.user?.name ?? undefined}
                    role={(session.user as any)?.role}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      <div className="container mx-auto px-3 md:px-4 py-4 md:py-8">
        {/* Period Display */}
        <div className="mb-4 md:mb-6 p-3 md:p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-xs md:text-sm font-semibold text-blue-900">
            📅 Viewing: {selectedMonth === 'All Months' ? 'All Months' : selectedMonth} {selectedYear === 'All Years' ? '' : selectedYear}
          </p>
        </div>

        {/* Dashboard Widget Toggle */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            <span className="text-sm font-medium">Dashboard Layout</span>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEnableVirtualScrolling(!enableVirtualScrolling)}
              className={`text-xs ${enableVirtualScrolling ? 'bg-blue-100' : ''}`}
            >
              {enableVirtualScrolling ? '✓ Virtual Scroll' : 'Virtual Scroll'}
            </Button>
          </div>
        </div>

        {/* Stats Cards - Responsive Grid */}
        {visibleWidgets.has('stats') && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6 md:mb-8">
          <Card 
            className={`bg-gradient-to-br from-green-50 to-green-100 border-green-300 hover:shadow-lg hover:scale-105 transition-all duration-300 animate-slide-up opacity-0 cursor-pointer ${activeStatusFilter === null ? 'ring-2 ring-green-500' : ''}`} 
            style={{ animation: 'slide-up 0.5s ease-out forwards, fade-in 0.3s ease-out forwards' }}
            onClick={() => { setActiveStatusFilter(null); setSelectedStatuses(new Set()); }}
          >
            <CardHeader className="pb-3 md:pb-4">
              <div className="flex items-center gap-2 md:gap-3">
                <div className="bg-green-500 p-2 md:p-3 rounded-lg flex-shrink-0">
                  <Calendar className="h-5 w-5 md:h-6 md:w-6 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <CardDescription className="text-green-700 text-xs md:text-sm">LR This Month</CardDescription>
                  <CardTitle className="text-2xl md:text-3xl text-green-600">{statsData.length}</CardTitle>
                </div>
              </div>
            </CardHeader>
          </Card>
          
          <Card 
            className={`bg-gradient-to-br from-amber-50 to-amber-100 border-amber-300 hover:shadow-lg hover:scale-105 transition-all duration-300 animate-slide-up opacity-0 cursor-pointer ${activeStatusFilter === 'LR Done' ? 'ring-2 ring-amber-500' : ''}`} 
            style={{ animation: 'slide-up 0.5s ease-out 0.1s forwards, fade-in 0.3s ease-out 0.1s forwards' }}
            onClick={() => { setActiveStatusFilter('LR Done'); setSelectedStatuses(new Set()); }}
          >
            <CardHeader className="pb-3 md:pb-4">
              <div className="flex items-center gap-2 md:gap-3">
                <div className="bg-amber-500 p-2 md:p-3 rounded-lg flex-shrink-0">
                  <Truck className="h-5 w-5 md:h-6 md:w-6 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <CardDescription className="text-amber-700 text-xs md:text-sm">To Be Collected</CardDescription>
                  <CardTitle className="text-2xl md:text-3xl text-amber-600">{stats.lrDone}</CardTitle>
                  <p className="text-[10px] md:text-xs text-amber-600 mt-0.5">LRs with drivers, awaiting return</p>
                </div>
              </div>
            </CardHeader>
          </Card>
          
          <Card 
            className={`bg-gradient-to-br from-orange-50 to-orange-100 border-orange-300 hover:shadow-lg hover:scale-105 transition-all duration-300 animate-slide-up opacity-0 cursor-pointer ${activeStatusFilter === 'LR Collected' ? 'ring-2 ring-orange-500' : ''}`} 
            style={{ animation: 'slide-up 0.5s ease-out 0.2s forwards, fade-in 0.3s ease-out 0.2s forwards' }}
            onClick={() => { setActiveStatusFilter('LR Collected'); setSelectedStatuses(new Set()); }}
          >
            <CardHeader className="pb-3 md:pb-4">
              <div className="flex items-center gap-2 md:gap-3">
                <div className="bg-orange-500 p-2 md:p-3 rounded-lg flex-shrink-0">
                  <FileText className="h-5 w-5 md:h-6 md:w-6 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <CardDescription className="text-orange-700 text-xs md:text-sm">Pending Bills</CardDescription>
                  <CardTitle className="text-2xl md:text-3xl text-orange-600">{stats.pendingBills}</CardTitle>
                  <p className="text-[10px] md:text-xs text-orange-600 mt-0.5">LRs collected, bills not generated</p>
                </div>
              </div>
            </CardHeader>
          </Card>
          
          <Card 
            className={`bg-gradient-to-br from-purple-50 to-purple-100 border-purple-300 hover:shadow-lg hover:scale-105 transition-all duration-300 animate-slide-up opacity-0 cursor-pointer ${activeStatusFilter === 'Bill Done' ? 'ring-2 ring-purple-500' : ''}`} 
            style={{ animation: 'slide-up 0.5s ease-out 0.3s forwards, fade-in 0.3s ease-out 0.3s forwards' }}
            onClick={() => { setActiveStatusFilter('Bill Done'); setSelectedStatuses(new Set()); }}
          >
            <CardHeader className="pb-3 md:pb-4">
              <div className="flex items-center gap-2 md:gap-3">
                <div className="bg-purple-500 p-2 md:p-3 rounded-lg flex-shrink-0">
                  <Package className="h-5 w-5 md:h-6 md:w-6 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <CardDescription className="text-purple-700 text-xs md:text-sm">Ready to Submit</CardDescription>
                  <CardTitle className="text-2xl md:text-3xl text-purple-600">{stats.pendingSubmission}</CardTitle>
                  <p className="text-[10px] md:text-xs text-purple-600 mt-0.5">Bills generated, pending submission</p>
                </div>
              </div>
            </CardHeader>
          </Card>
        </div>
        )}
        
        {isCEO && (
        <>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-6 md:mb-8">
          {/* Statistics Card */}
          <Card className="bg-gradient-to-br from-teal-50 to-teal-100 border-teal-300 hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3 md:pb-4">
              <div className="flex items-center justify-between mb-2">
                <CardDescription className="text-teal-700 text-xs md:text-sm">Statistics</CardDescription>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    // Require authentication and CEO role to view statistics
                    if (status !== 'authenticated' || !session) {
                      router.push('/login');
                      return;
                    }
                    const role = (session.user as any)?.role;
                    if (role !== 'CEO') {
                      toast.error('Unauthorized: Only CEO can view statistics');
                      return;
                    }
                    // If currently visible, hide without asking password; otherwise prompt for password
                    if (showMonthlyProfit) {
                      setShowMonthlyProfit(false);
                      return;
                    }
                    setShowStatsPasswordModal(true);
                  }}
                  className="h-8 w-8 p-0 hover:bg-teal-200"
                >
                  {showMonthlyProfit ? (
                    <Eye className="h-4 w-4 text-teal-700" />
                  ) : (
                    <EyeOff className="h-4 w-4 text-teal-700" />
                  )}
                </Button>
              </div>
              {showMonthlyProfit ? (
                <div 
                  className="cursor-pointer" 
                  onClick={() => setShowProfitBreakdown(true)}
                >
                  <div className="flex items-center gap-2 md:gap-3">
                    <div className="bg-teal-500 p-2 md:p-3 rounded-lg flex-shrink-0">
                      <TrendingUp className="h-5 w-5 md:h-6 md:w-6 text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <CardTitle className={`text-xl md:text-2xl ${stats.totalProfit >= 0 ? 'text-teal-600' : 'text-red-600'}`}>
                        ₹{stats.totalProfit.toLocaleString()}
                      </CardTitle>
                      <div className="mt-2">
                        <div className="w-full bg-teal-200 rounded-full h-2 overflow-hidden">
                          <div 
                            className={`h-2 rounded-full transition-all duration-500 ease-out ${
                              stats.totalProfit >= 0 
                                ? 'bg-gradient-to-r from-teal-500 to-teal-600' 
                                : 'bg-gradient-to-r from-red-500 to-red-600'
                            }`}
                            style={{ width: stats.estimatedRevenue > 0 ? `${Math.abs((stats.totalProfit / stats.estimatedRevenue) * 100)}%` : '0%' }}
                          ></div>
                        </div>
                      </div>
                      <p className="text-[10px] md:text-xs text-teal-600 mt-1">
                        Revenue: ₹{stats.estimatedRevenue.toLocaleString()} | Expenses: ₹{stats.totalExpenses.toLocaleString()}
                      </p>
                      <p className="text-[9px] md:text-[10px] text-teal-500 mt-1 font-medium">Click for detailed breakdown →</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 md:gap-3">
                    <Skeleton className="h-12 w-12 rounded-lg flex-shrink-0 bg-teal-200/50" />
                    <div className="min-w-0 flex-1 space-y-2">
                      <Skeleton className="h-7 w-32 bg-teal-200/50" />
                      <Skeleton className="h-2 w-full rounded-full bg-teal-200/50" />
                      <Skeleton className="h-4 w-48 bg-teal-200/50" />
                      <Skeleton className="h-3 w-40 bg-teal-200/50" />
                    </div>
                  </div>
                </div>
              )}
            </CardHeader>
          </Card>

          {/* Vehicle Type Breakdown Card with Progress Bars */}
          <Card className="bg-gradient-to-br from-rose-50 to-rose-100 border-rose-300">
            <CardHeader className="pb-3 md:pb-4">
              <div className="flex items-start gap-2 md:gap-3">
                <div className="bg-rose-500 p-2 md:p-3 rounded-lg flex-shrink-0">
                  <PieChart className="h-5 w-5 md:h-6 md:w-6 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <CardDescription className="text-rose-700 text-xs md:text-sm mb-2">Vehicle Type Breakdown</CardDescription>
                  <div className="space-y-2">
                    {/* PICKUP */}
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-medium text-rose-700">PICKUP</span>
                        <Badge variant="secondary" className="bg-rose-200 text-rose-800 text-xs">{stats.vehicleTypeBreakdown.PICKUP}</Badge>
                      </div>
                      <div className="w-full bg-rose-200 rounded-full h-1.5 overflow-hidden">
                        <div 
                          className="bg-gradient-to-r from-rose-500 to-rose-600 h-1.5 rounded-full transition-all duration-500 ease-out"
                          style={{ width: stats.total > 0 ? `${(stats.vehicleTypeBreakdown.PICKUP / stats.total) * 100}%` : '0%' }}
                        ></div>
                      </div>
                    </div>
                    
                    {/* TRUCK */}
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-medium text-rose-700">TRUCK</span>
                        <Badge variant="secondary" className="bg-rose-200 text-rose-800 text-xs">{stats.vehicleTypeBreakdown.TRUCK}</Badge>
                      </div>
                      <div className="w-full bg-rose-200 rounded-full h-1.5 overflow-hidden">
                        <div 
                          className="bg-gradient-to-r from-rose-500 to-rose-600 h-1.5 rounded-full transition-all duration-500 ease-out"
                          style={{ width: stats.total > 0 ? `${(stats.vehicleTypeBreakdown.TRUCK / stats.total) * 100}%` : '0%' }}
                        ></div>
                      </div>
                    </div>
                    
                    {/* TOROUS */}
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-medium text-rose-700">TOROUS</span>
                        <Badge variant="secondary" className="bg-rose-200 text-rose-800 text-xs">{stats.vehicleTypeBreakdown.TOROUS}</Badge>
                      </div>
                      <div className="w-full bg-rose-200 rounded-full h-1.5 overflow-hidden">
                        <div 
                          className="bg-gradient-to-r from-rose-500 to-rose-600 h-1.5 rounded-full transition-all duration-500 ease-out"
                          style={{ width: stats.total > 0 ? `${(stats.vehicleTypeBreakdown.TOROUS / stats.total) * 100}%` : '0%' }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardHeader>
          </Card>
        </div>
        </>
        )}
        
        {/* Charts Card - Removed */}
        {false && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Charts & Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <DashboardCharts
                vehicleData={chartsData.vehicleData}
                monthlyData={chartsData.monthlyData}
                billTypeData={chartsData.billTypeData}
              />
            </CardContent>
          </Card>
        )}

        {/* Filters Card */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-600" />
              <CardTitle>Filters & Search</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search */}
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search by LR No, Vehicle No, Location..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        saveSearch(searchQuery);
                      }
                    }}
                    onFocus={() => setSearchFocused(true)}
                    onBlur={() => {
                      if (searchQuery.trim()) {
                        saveSearch(searchQuery);
                      }
                      // Hide recent searches when input loses focus
                      setTimeout(() => setSearchFocused(false), 50);
                    }}
                    className="flex h-10 w-full rounded-md border border-input bg-background pl-10 pr-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                  {recentSearches.length > 0 && searchQuery === '' && searchFocused && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-input rounded-md shadow-lg z-50 max-h-48 overflow-y-auto">
                      <div className="p-2 text-xs text-muted-foreground font-medium border-b">Recent Searches</div>
                      {recentSearches.map((search, idx) => (
                        <button
                          key={idx}
                          onMouseDown={(e) => {
                            // Prevent input blur before we set the value
                            e.preventDefault();
                            setSearchQuery(search);
                            saveSearch(search);
                          }}
                          onClick={() => {
                            setSearchQuery(search);
                            saveSearch(search);
                          }}
                          className="w-full text-left px-3 py-2 hover:bg-muted text-sm"
                        >
                          {search}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              
              {/* Month Filter */}
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Calendar className="h-4 w-4 text-muted-foreground hidden sm:inline" />
                <select 
                  value={selectedMonth}
                  onChange={(e) => {
                    setSelectedMonth(e.target.value);
                    setActiveStatusFilter(null);
                  }}
                  className="flex h-10 w-full sm:w-auto rounded-md border border-input bg-background px-2 sm:px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option>All Months</option>
                  {MONTHS.map(month => (
                    <option key={month} value={month}>{month}</option>
                  ))}
                </select>
              </div>
              
              {/* Year Filter */}
              <select 
                value={selectedYear}
                onChange={(e) => {
                  setSelectedYear(e.target.value);
                  setActiveStatusFilter(null);
                }}
                className="flex h-10 w-full sm:w-auto rounded-md border border-input bg-background px-2 sm:px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {years.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
              
              {/* Status Filter - Multi-select with OK/Cancel */}
              <div className="relative group w-full sm:w-auto">
                <button 
                  className="flex h-10 rounded-md border border-input bg-background px-2 sm:px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring hover:bg-slate-50 w-full transition-all duration-200 hover:border-blue-500 hover:shadow-sm"
                  onClick={(e) => {
                    // Using status dropdown clears any active card filter to avoid clashes
                    setActiveStatusFilter(null);
                    setTempStatuses(new Set(selectedStatuses));
                    e.currentTarget.parentElement?.classList.toggle('open');
                  }}
                >
                  <span className="flex-1 text-left flex items-center gap-2">
                    {selectedStatuses.size === 0 ? (
                      <>
                        <span>All Statuses</span>
                        <Badge variant="secondary" className="text-xs px-2 py-0">{LR_STATUS_OPTIONS.length}</Badge>
                      </>
                    ) : (
                      <>
                        <span>{selectedStatuses.size} Selected</span>
                        <Badge className="bg-blue-600 text-white text-xs px-2 py-0">{selectedStatuses.size}</Badge>
                      </>
                    )}
                  </span>
                  <span className="ml-2 transition-transform group-[.open]:rotate-180">▼</span>
                </button>
                
                {/* Dropdown menu */}
                <div className="hidden group-[.open]:block absolute top-full left-0 mt-1 bg-white border border-input rounded-lg shadow-xl z-50 min-w-[280px] overflow-hidden">
                  {/* Header */}
                  <div className="px-4 py-3 bg-gradient-to-r from-blue-50 to-blue-100 border-b border-blue-200">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-blue-900">Select Status</span>
                      <button
                        onClick={() => {
                          const newSelected = new Set(tempStatuses);
                          if (tempStatuses.size === LR_STATUS_OPTIONS.length) {
                            newSelected.clear();
                          } else {
                            LR_STATUS_OPTIONS.forEach(status => newSelected.add(status));
                          }
                          setTempStatuses(newSelected);
                        }}
                        className="text-xs font-medium text-blue-700 hover:text-blue-900 hover:underline transition-colors"
                      >
                        {tempStatuses.size === LR_STATUS_OPTIONS.length ? 'Clear All' : 'Select All'}
                      </button>
                    </div>
                  </div>
                  
                  {/* Status options with enhanced styling */}
                  <div className="max-h-[300px] overflow-y-auto">
                    {LR_STATUS_OPTIONS.map(status => (
                      <label key={status} className="flex items-center px-4 py-3 hover:bg-blue-50 cursor-pointer transition-all duration-150 border-b border-gray-100 last:border-b-0 group">
                        <input
                          type="checkbox"
                          checked={tempStatuses.has(status)}
                          onChange={(e) => {
                            const newSelected = new Set(tempStatuses);
                            if (e.target.checked) {
                              newSelected.add(status);
                            } else {
                              newSelected.delete(status);
                            }
                            setTempStatuses(newSelected);
                          }}
                          className="w-4 h-4 accent-blue-600 cursor-pointer transition-transform group-hover:scale-110"
                      />
                      <span className="text-sm ml-3 font-medium text-gray-700">
                        {status === 'LR Done' && '📄 '}
                        {status === 'LR Collected' && '📦 '}
                        {status === 'Bill Done' && '🧾 '}
                        {status === 'Bill Submitted' && '✅ '}
                        {status}
                      </span>
                    </label>
                  ))}
                  </div>
                  
                                     {/* OK and Cancel buttons - Enhanced for mobile */}
                   <div className="px-3 py-3 border-t border-gray-200 flex gap-2">
                     <button
                       onClick={() => {
                         setSelectedStatuses(new Set(tempStatuses));
                         document.querySelector('.group.open')?.classList.remove('open');
                       }}
                       className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-3 rounded text-sm transition-all active:scale-95 min-h-[44px]"
                     >
                       OK
                     </button>
                     <button
                       onClick={() => {
                         setTempStatuses(new Set(selectedStatuses));
                         document.querySelector('.group.open')?.classList.remove('open');
                       }}
                       className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2.5 px-3 rounded text-sm transition-all active:scale-95 min-h-[44px]"
                     >
                       Cancel
                     </button>
                   </div>
                </div>
              </div>
              
              {/* Items per page */}
              <select 
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="flex h-10 w-full sm:w-auto rounded-md border border-input bg-background px-2 sm:px-3 py-2 text-sm"
              >
                <option value={10}>10 / page</option>
                <option value={20}>20 / page</option>
                <option value={50}>50 / page</option>
                <option value={100}>100 / page</option>
              </select>
              
              {/* Refresh Button */}
              <Button onClick={loadLRs} variant="outline" className="w-full sm:w-auto">
                <RefreshCw className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Refresh</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* LR Table Card */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle className="text-xl md:text-2xl">LR Records</CardTitle>
                <CardDescription className="mt-2 text-xs md:text-sm">
                  Showing {startIndex + 1}-{Math.min(endIndex, memoizedFilteredLrs.length)} of {memoizedFilteredLrs.length} LRs
                  {memoizedFilteredLrs.length !== lrs.length && ` (filtered from ${lrs.length} total)`}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="text-xs sm:text-sm px-2 sm:px-3 py-1">
                  {selectedLrs.size} Selected
                </Badge>
                <Badge className="text-xs sm:text-sm px-2 sm:px-3 py-1 bg-blue-100 text-blue-800">
                  Page {currentPage} of {totalPages || 1}
                </Badge>
                <Button
                  onClick={() => setShowColumnCustomizer(!showColumnCustomizer)}
                  variant="outline"
                  size="sm"
                  className="text-xs sm:text-sm gap-1 sm:gap-2"
                  title="Customize columns"
                >
                  <Settings className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">Columns</span>
                </Button>
                <Button
                  onClick={exportToExcel}
                  disabled={exporting || (selectedLrs.size === 0 && memoizedFilteredLrs.length === 0)}
                  variant="outline"
                  size="sm"
                  className="text-xs sm:text-sm gap-1 sm:gap-2"
                  title={selectedLrs.size > 0 
                    ? `Export ${selectedLrs.size} selected record(s)`
                    : `Export ${memoizedFilteredLrs.length} filtered record(s)`}
                >
                  <FileSpreadsheet className="h-3 w-3 sm:h-4 sm:w-4" />
                  {exporting 
                    ? 'Exporting...' 
                    : selectedLrs.size > 0 
                      ? `Export Selected (${selectedLrs.size})`
                      : `Export Filtered (${memoizedFilteredLrs.length})`
                  }
                </Button>
                <Button
                  onClick={() => {
                    // TODO: Implement print functionality once format is provided
                    toast('Print functionality will be implemented with provided format');
                  }}
                  disabled={selectedLrs.size === 0}
                  variant="outline"
                  size="sm"
                  className="text-xs sm:text-sm gap-1 sm:gap-2"
                  title={selectedLrs.size > 0 
                    ? `Print ${selectedLrs.size} selected record(s)`
                    : 'Please select LR records to print'}
                >
                  <Printer className="h-3 w-3 sm:h-4 sm:w-4" />
                  Print LR {selectedLrs.size > 0 && `(${selectedLrs.size})`}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Column Customizer Dialog */}
            {showColumnCustomizer && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowColumnCustomizer(false)}>
                <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Customize Columns
                  </h3>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {columnDefinitions
                      .filter(col => col.id !== 'checkbox' && col.id !== 'actions')
                      .map(col => (
                      <label key={col.id} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer">
                        <input
                          type="checkbox"
                          checked={visibleColumns.has(col.id)}
                          onChange={() => toggleColumn(col.id)}
                          disabled={col.required}
                          className="w-4 h-4 text-primary rounded border-gray-300 focus:ring-primary"
                        />
                        <span className="text-sm">{col.label}</span>
                        {col.required && <span className="text-xs text-gray-500">(Required)</span>}
                      </label>
                    ))}
                  </div>
                  <div className="mt-4 flex gap-2">
                    <Button onClick={() => setShowColumnCustomizer(false)} variant="outline" className="flex-1">
                      Done
                    </Button>
                    <Button onClick={() => {
                      setVisibleColumns(new Set(columnDefinitions.map(c => c.id)));
                      toast.success('All columns restored');
                    }} variant="outline" className="flex-1">
                      Show All
                    </Button>
                  </div>
                </div>
              </div>
            )}
            <div className="rounded-md border overflow-hidden">
              <div className="overflow-x-auto -mx-1 sm:mx-0">
                <table className="w-full min-w-[800px] sm:min-w-0">
                  <thead className="bg-muted/50 sticky top-0 z-10 shadow-sm">
                    <tr className="border-b">
                      {visibleColumns.has('checkbox') && (
                        <th className="px-1 md:px-4 py-3 text-left w-10">
                          <input
                            type="checkbox"
                            checked={selectedLrs.size === memoizedFilteredLrs.length && memoizedFilteredLrs.length > 0}
                            onChange={() => selectedLrs.size === memoizedFilteredLrs.length ? deselectAll() : selectAll()}
                            className="w-4 h-4 text-primary rounded border-gray-300 focus:ring-primary"
                          />
                        </th>
                      )}
                      {visibleColumns.has('lrNo') && (
                        <th className="px-2 md:px-4 py-3 text-left text-xs md:text-sm font-medium text-muted-foreground uppercase tracking-wider">
                        <button
                          onClick={() => {
                            if (sortBy === 'lrNo') {
                              setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                            } else {
                              setSortBy('lrNo');
                              setSortOrder('asc');
                            }
                          }}
                          className="flex items-center gap-1 hover:text-foreground transition-colors cursor-pointer"
                          title="Click to sort by LR No"
                        >
                          LR No
                          <span className="text-xs">
                            {sortBy === 'lrNo' ? (sortOrder === 'asc' ? '↑' : '↓') : '↕'}
                          </span>
                        </button>
                      </th>
                      )}
                      {visibleColumns.has('vehicleNo') && (
                        <th className="px-1 md:px-4 py-3 text-left text-[9px] md:text-sm font-medium text-muted-foreground uppercase tracking-wider hover:bg-muted/70 transition-colors">
                          <span className="hidden sm:inline">Vehicle No</span>
                          <span className="sm:hidden">Vehicle</span>
                        </th>
                      )}
                      {visibleColumns.has('lrDate') && (
                        <th className="px-1 md:px-4 py-3 text-left text-[9px] md:text-sm font-medium text-muted-foreground uppercase tracking-wider">
                          <button
                            onClick={() => {
                              if (sortBy === 'date') {
                                setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                              } else {
                                setSortBy('date');
                                setSortOrder('asc');
                              }
                            }}
                            className="flex items-center gap-1 hover:text-foreground transition-colors cursor-pointer"
                            title="Click to sort by Date"
                          >
                            LR Date
                            <span className="text-xs">
                              {sortBy === 'date' ? (sortOrder === 'asc' ? '↑' : '↓') : '↕'}
                            </span>
                          </button>
                        </th>
                      )}
                      {visibleColumns.has('from') && (
                        <th className="px-1 md:px-4 py-3 text-left text-[10px] md:text-sm font-medium text-muted-foreground uppercase tracking-wider">
                          <div className="flex items-center gap-0.5 md:gap-1">
                            <MapPin className="h-2.5 w-2.5 md:h-3 md:w-3" />
                            <span className="whitespace-nowrap">FROM</span>
                          </div>
                        </th>
                      )}
                      {visibleColumns.has('to') && (
                        <th className="px-1 md:px-4 py-3 text-left text-xs md:text-sm font-medium text-muted-foreground uppercase tracking-wider min-w-[80px] md:min-w-[100px]">TO</th>
                      )}
                      {visibleColumns.has('vehicleType') && (
                        <th className="px-2 md:px-4 py-3 text-left text-xs md:text-sm font-medium text-muted-foreground uppercase tracking-wider hidden md:table-cell">Type</th>
                      )}
                      {visibleColumns.has('submitDate') && (
                        <th className="px-1 md:px-2 py-3 text-left text-[8px] md:text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                          <span className="hidden sm:inline">Submit Date</span>
                          <span className="sm:hidden">Submit</span>
                        </th>
                      )}
                      {visibleColumns.has('status') && (
                        <th className="px-1 md:px-4 py-3 text-left text-[9px] md:text-sm font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                      )}
                      {visibleColumns.has('remark') && (
                        <th className="px-1 md:px-4 py-3 text-left text-[10px] md:text-sm font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                          Remark
                        </th>
                      )}
                      {visibleColumns.has('actions') && (
                        <th className="px-1 md:px-4 py-3 text-left text-[10px] md:text-sm font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                          Actions
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {isLoadingLRs ? (
                      <>
                        {[...Array(5)].map((_, i) => (
                          <tr key={i} className="border-b">
                            <td className="px-4 py-3 w-10">
                              <Skeleton className="h-4 w-4" />
                            </td>
                            <td className="px-4 py-3">
                              <Skeleton className="h-4 w-24" />
                            </td>
                            <td className="px-4 py-3">
                              <Skeleton className="h-4 w-20" />
                            </td>
                            <td className="px-4 py-3">
                              <Skeleton className="h-4 w-20" />
                            </td>
                            <td className="px-4 py-3">
                              <Skeleton className="h-4 w-16" />
                            </td>
                            <td className="px-4 py-3">
                              <Skeleton className="h-4 w-24" />
                            </td>
                            <td className="px-4 py-3 hidden md:table-cell">
                              <Skeleton className="h-4 w-16" />
                            </td>
                            <td className="px-4 py-3">
                              <Skeleton className="h-4 w-20" />
                            </td>
                            <td className="px-4 py-3">
                              <Skeleton className="h-8 w-full" />
                            </td>
                            <td className="px-4 py-2">
                              <Skeleton className="h-6 w-full" />
                            </td>
                            <td className="px-4 py-3">
                              <Skeleton className="h-8 w-16" />
                            </td>
                          </tr>
                        ))}
                      </>
                    ) : memoizedFilteredLrs.length === 0 ? (
                      <tr>
                        <td colSpan={12} className="px-0">
                          <div className="px-4 py-8">
                            <EmptyState 
                              type={lrs.length === 0 ? 'no-data' : 'filtered'}
                              onAction={lrs.length === 0 ? createNewLR : () => {
                                setSearchQuery('');
                                setSelectedMonth('All Months');
                                setSelectedYear(new Date().getFullYear().toString());
                                setSelectedStatuses(new Set());
                              }}
                            />
                          </div>
                        </td>
                      </tr>
                    ) : (
                      paginatedLrs.map((lr: LRData, index: number) => (
                        <tr 
                          key={lr['LR No']} 
                          className={`group hover:bg-blue-50/50 hover:shadow-sm transition-all duration-200 cursor-pointer ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}
                          onContextMenu={(e) => {
                            e.preventDefault();
                            setContextMenu({ x: e.clientX, y: e.clientY, lrNo: lr['LR No'] });
                          }}
                        >
                          {visibleColumns.has('checkbox') && (
                            <td className="px-1 md:px-4 py-3 w-10">
                              <input
                                type="checkbox"
                                checked={selectedLrs.has(lr['LR No'])}
                                onChange={() => toggleLRSelection(lr['LR No'])}
                                className="w-4 h-4 text-primary rounded border-gray-300 focus:ring-primary"
                              />
                            </td>
                          )}
                          {visibleColumns.has('lrNo') && (
                            <td className="px-1 md:px-4 py-3">
                              <button
                                type="button"
                                onClick={() => { setDetailLr(lr); setShowLrDetails(true); }}
                                className="font-semibold text-[10px] md:text-sm text-gray-900 hover:underline active:opacity-80"
                                title="View LR details"
                              >
                                {lr['LR No']}
                              </button>
                            </td>
                          )}
                          {visibleColumns.has('vehicleNo') && (
                            <td className="px-1 md:px-4 py-3 text-[10px] md:text-sm text-muted-foreground">
                              {lr['Vehicle Number'] || <span className="text-yellow-600 italic">Not set</span>}
                            </td>
                          )}
                          {visibleColumns.has('lrDate') && (
                            <td className="px-1 md:px-4 py-3 text-[10px] md:text-sm text-muted-foreground">{lr['LR Date']}</td>
                          )}
                          {visibleColumns.has('from') && (
                            <td className="px-1 md:px-4 py-3 text-[9px] md:text-sm">
                              <Badge variant="outline" className="text-[9px] md:text-sm whitespace-nowrap">{lr['FROM'] || '-'}</Badge>
                            </td>
                          )}
                          {visibleColumns.has('to') && (
                            <td className="px-1 md:px-4 py-3 text-xs md:text-sm min-w-[80px] md:min-w-[100px]">
                              <div className="font-medium text-gray-700 bg-gray-100 px-1.5 md:px-3 py-1 rounded border border-gray-300 break-words text-[10px] md:text-xs leading-tight" title={getToValue(lr['Consignee'] || '')}>{getToValue(lr['Consignee'] || '')}</div>
                            </td>
                          )}
                          {visibleColumns.has('vehicleType') && (
                            <td className="px-2 md:px-4 py-3 hidden md:table-cell">
                              <Badge variant="secondary" className="text-xs md:text-sm">{lr['Vehicle Type']}</Badge>
                            </td>
                          )}
                          {visibleColumns.has('submitDate') && (
                            <td className="px-1 md:px-2 py-3 text-[8px] md:text-[10px] text-muted-foreground whitespace-nowrap">
                              {lr['Bill Submission Date'] || <span className="text-gray-400 italic text-[8px]">-</span>}
                            </td>
                          )}
                          {visibleColumns.has('status') && (
                            <td className="px-1 md:px-4 py-3">
                              <div className="relative group">
                              <select
                                value={lr.status || 'LR Done'}
                                onChange={(e) => confirmAndUpdateStatus(lr['LR No'], lr.status, e.target.value)}
                                  className={`
                                    w-full px-1 md:px-2 py-2 md:py-2 rounded-lg text-[10px] md:text-xs lg:text-sm font-bold border-2 
                                    cursor-pointer transition-all min-h-[36px] touch-manipulation
                                    ${getStatusColor(lr.status || 'LR Done').bg} 
                                    ${getStatusColor(lr.status || 'LR Done').text} 
                                    ${getStatusColor(lr.status || 'LR Done').border}
                                    hover:shadow-md hover:scale-105 active:scale-95
                                    focus:outline-none focus:ring-2 focus:ring-primary
                                  `}
                                >
                                  {LR_STATUS_OPTIONS.map(status => (
                                    <option key={status} value={status}>
                                      {status === 'LR Done' && '📄 '}
                                      {status === 'LR Collected' && '📦 '}
                                      {status === 'Bill Done' && '🧾 '}
                                      {status === 'Bill Submitted' && '✅ '}
                                      {status}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </td>
                          )}
                          {visibleColumns.has('remark') && (
                            <td className="px-1 md:px-4 py-3">
                              <input
                                type="text"
                                placeholder="Add remark..."
                                defaultValue={lr.remark || ''}
                                onChange={(e) => {
                                  const newRemark = e.target.value;
                                  setTimeout(async () => {
                                    try {
                                      const response = await fetch(`/api/lrs/${encodeURIComponent(lr['LR No'])}/remark`, {
                                        method: 'PATCH',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ remark: newRemark }),
                                      });
                                      if (!response.ok) {
                                        console.error('Failed to update remark');
                                      }
                                    } catch (error) {
                                      console.error('Error updating remark:', error);
                                    }
                                  }, 500);
                                }}
                                className="w-full px-2 md:px-2 py-2 md:py-2 text-[10px] md:text-xs lg:text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[36px] touch-manipulation"
                              />
                            </td>
                          )}
                          {visibleColumns.has('actions') && (
                            <td className="px-1 md:px-4 py-3">
                              <Button
                                onClick={() => editLR(lr)}
                                variant="ghost"
                                size="sm"
                                className="text-[10px] md:text-sm h-8 md:h-8 px-2 md:px-3 hover:bg-blue-100 active:scale-95 min-w-[44px] touch-manipulation"
                              >
                                Edit
                              </Button>
                            </td>
                          )}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-4 md:mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 border-t pt-4">
                <div className="text-xs md:text-sm text-muted-foreground text-center sm:text-left">
                  Showing {startIndex + 1} to {Math.min(endIndex, memoizedFilteredLrs.length)} of {memoizedFilteredLrs.length} results
                </div>
                
                <div className="flex items-center gap-1 md:gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="text-xs md:text-sm min-h-[40px] px-3 md:px-4 active:scale-95 touch-manipulation"
                  >
                    <ChevronLeft className="h-4 w-4 md:h-4 md:w-4" />
                    <span className="hidden md:inline">Previous</span>
                  </Button>
                  
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum: number;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      
                      return (
                        <Button
                          key={pageNum}
                          variant={currentPage === pageNum ? "default" : "outline"}
                          size="sm"
                          onClick={() => goToPage(pageNum)}
                          className="w-9 md:w-9 text-xs md:text-sm min-h-[40px] active:scale-95 touch-manipulation"
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="text-xs md:text-sm min-h-[40px] px-3 md:px-4 active:scale-95 touch-manipulation"
                  >
                    <span className="hidden md:inline">Next</span>
                    <ChevronRight className="h-4 w-4 md:h-4 md:w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Action Buttons Card */}
        <Card>
          <CardContent className="pt-4 md:pt-6">
            <div className="flex flex-col sm:flex-row flex-wrap gap-2 md:gap-3">
              <div className="flex flex-col sm:flex-row gap-2 md:gap-3 flex-1">
                <Button onClick={selectAll} variant="outline" className="text-xs md:text-sm min-h-[44px] touch-manipulation active:scale-95">
                  <Check className="mr-2 h-4 w-4 md:h-4 md:w-4" />
                Select All
              </Button>
                <Button onClick={deselectAll} variant="outline" className="text-xs md:text-sm min-h-[44px] touch-manipulation active:scale-95">
                  <X className="mr-2 h-4 w-4 md:h-4 md:w-4" />
                Deselect All
              </Button>
              <Button 
                onClick={handleBulkStatusChange} 
                variant="outline"
                disabled={selectedLrs.size === 0}
                  className="border-blue-500 text-blue-600 hover:bg-blue-50 text-xs md:text-sm min-h-[44px] touch-manipulation active:scale-95"
              >
                  <TrendingUp className="mr-2 h-4 w-4 md:h-4 md:w-4" />
                  <span className="hidden sm:inline">Change Status </span>
                  <span>({selectedLrs.size})</span>
              </Button>
                {(session?.user as any)?.role === 'CEO' || (session?.user as any)?.role === 'MANAGER' ? (
                  <Button onClick={deleteSelected} variant="destructive" disabled={selectedLrs.size === 0} className="text-xs md:text-sm min-h-[44px] touch-manipulation active:scale-95">
                    <Trash2 className="mr-2 h-4 w-4 md:h-4 md:w-4" />
                    <span className="hidden sm:inline">Delete Selected </span>
                    <span>({selectedLrs.size})</span>
              </Button>
                ) : null}
              </div>
              
              {/* Unified Bill Generation Button */}
              <Button 
                onClick={handleGenerateAllBills}
                disabled={selectedLrs.size === 0 || loading}
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 w-full sm:w-auto sm:ml-auto disabled:opacity-50 text-white font-semibold shadow-lg text-xs md:text-sm min-h-[48px] touch-manipulation active:scale-95"
                title="Automatically generates: Rework Bills (KOLHAPUR→Solapur), Additional Bills (2+ consignees), and Regular Bills (others)"
              >
                <FileText className="mr-2 h-4 w-4 md:h-4 md:w-4" />
                {loading ? 'Generating...' : `Generate All Bills (${selectedLrs.size})`}
              </Button>
              {(session?.user as any)?.role === 'CEO' && (
                <Button
                  onClick={async () => {
                    setConsistencyLoading(true);
                    try {
                      const res = await fetch('/api/consistency/check');
                      const data = await res.json();
                      if (!res.ok || !data.success) throw new Error(data?.error || 'Failed');
                      if (data.issuesCount === 0) toast.success('All records consistent');
                      else toast.error(`Found ${data.issuesCount} potential issue(s)`);
                    } catch (e: any) {
                      toast.error(e.message || 'Consistency check failed');
                    } finally {
                      setConsistencyLoading(false);
                    }
                  }}
                  disabled={consistencyLoading}
                  variant="outline"
                  className="w-full sm:w-auto text-xs md:text-sm min-h-[48px] touch-manipulation active:scale-95"
                  title="Verify data consistency across key fields"
                >
                  {consistencyLoading ? 'Checking…' : 'Verify Data Consistency'}
                </Button>
              )}
              <Button
                onClick={handleGenerateProvision}
                disabled={provisionLoading}
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 w-full sm:w-auto text-white font-semibold shadow-lg text-xs md:text-sm min-h-[48px] touch-manipulation active:scale-95 disabled:opacity-50"
                title="Generate Provision sheet from PROVISION FORMAT.xlsx for all non-submitted bills"
              >
                <FileText className="mr-2 h-4 w-4 md:h-4 md:w-4" />
                {provisionLoading ? 'Generating Provision...' : 'Generate Provision'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Bill Generation Modal */}
      <Dialog open={showDatePicker} onOpenChange={setShowDatePicker}>
        <DialogContent className="max-w-lg w-[95vw] sm:w-full mx-4">
          <DialogHeader>
            <DialogTitle>Generate All Bills - Preview</DialogTitle>
            <DialogDescription>
              Review the details below before generating bills
            </DialogDescription>
          </DialogHeader>
          
          {/* Preview Section */}
          <div className="space-y-4">
            {/* Validation Warnings */}
            {(() => {
              const { issues } = validateSelectedLrs();
              const errors = issues.filter(i => i.type === 'error');
              const warnings = issues.filter(i => i.type === 'warning');
              
              if (errors.length > 0 || warnings.length > 0) {
                return (
                  <div className="space-y-2">
                    {errors.length > 0 && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-sm font-semibold text-red-800 mb-2">⚠️ Critical Issues Found:</p>
                        <ul className="text-xs text-red-700 space-y-1">
                          {errors.slice(0, 3).map((issue, idx) => (
                            <li key={idx}>• {issue.lrNo}: {issue.message}</li>
                          ))}
                          {errors.length > 3 && <li>... and {errors.length - 3} more</li>}
                        </ul>
                      </div>
                    )}
                    {warnings.length > 0 && (
                      <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <p className="text-sm font-semibold text-yellow-800 mb-2">⚠️ Warnings:</p>
                        <ul className="text-xs text-yellow-700 space-y-1">
                          {warnings.slice(0, 3).map((issue, idx) => (
                            <li key={idx}>• {issue.lrNo}: {issue.message}</li>
                          ))}
                          {warnings.length > 3 && <li>... and {warnings.length - 3} more</li>}
                        </ul>
                      </div>
                    )}
                  </div>
                );
              }
              return (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm font-semibold text-green-800">✓ All LR data validated successfully</p>
                </div>
              );
            })()}
            
            {/* Estimated Amount Preview */}
            {(() => {
              const { totalAmount, breakdown } = calculateEstimatedAmounts();
              return (
                <div className="p-4 bg-gradient-to-br from-blue-50 to-purple-50 border border-blue-200 rounded-lg">
                  <p className="text-sm font-semibold text-blue-900 mb-3">💰 Estimated Bill Amounts:</p>
                  <div className="space-y-2">
                    {breakdown.rework > 0 && (
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-orange-700">🔄 Rework Bills:</span>
                        <span className="font-bold text-orange-600">₹{breakdown.rework.toLocaleString()}</span>
                      </div>
                    )}
                    {breakdown.additional > 0 && (
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-pink-700">📋 Additional Bills:</span>
                        <span className="font-bold text-pink-600">₹{breakdown.additional.toLocaleString()}</span>
                      </div>
                    )}
                    {breakdown.regular > 0 && (
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-blue-700">📄 Regular Bills:</span>
                        <span className="font-bold text-blue-600">₹{breakdown.regular.toLocaleString()}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center pt-2 border-t border-blue-300">
                      <span className="font-bold text-gray-900">Total Estimated Amount:</span>
                      <span className="font-bold text-lg text-purple-600">₹{totalAmount.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              );
            })()}
            
            {/* Bill Counts */}
            {categorizedLrs && (
              <div className="grid grid-cols-3 gap-3">
                {categorizedLrs.reworkLrs.length > 0 && (
                  <div className="text-center p-3 bg-orange-50 border border-orange-200 rounded-lg">
                    <p className="text-2xl font-bold text-orange-600">{categorizedLrs.reworkLrs.length}</p>
                    <p className="text-xs text-orange-700 mt-1">🔄 Rework</p>
                  </div>
                )}
                {categorizedLrs.additionalLrs.length > 0 && (
                  <div className="text-center p-3 bg-pink-50 border border-pink-200 rounded-lg">
                    <p className="text-2xl font-bold text-pink-600">{categorizedLrs.additionalLrs.length}</p>
                    <p className="text-xs text-pink-700 mt-1">📋 Additional</p>
                  </div>
                )}
                {categorizedLrs.regularLrs.length > 0 && (
                  <div className="text-center p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-2xl font-bold text-blue-600">{categorizedLrs.regularLrs.length}</p>
                    <p className="text-xs text-blue-700 mt-1">📄 Regular</p>
                  </div>
                )}
              </div>
            )}
          </div>
          
          <div className="py-4 space-y-4">
            {/* Rework Bill Number */}
            {categorizedLrs && categorizedLrs.reworkLrs.length > 0 && (
              <div>
                <label className="text-sm font-medium mb-2 block flex items-center gap-2">
                  <span className="text-orange-600">🔄 Rework Bill No:</span>
                  <Badge variant="outline" className="text-xs">({categorizedLrs.reworkLrs.length} LR(s))</Badge>
                </label>
                <input
                  type="text"
                  value={reworkBillNo}
                  onChange={(e) => setReworkBillNo(e.target.value)}
                  placeholder="e.g., REWORK001"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Will become: MT/25-26/{reworkBillNo || 'REWORK-XXX'}
                </p>
              </div>
            )}
            
            {/* Additional Bill Number */}
            {categorizedLrs && categorizedLrs.additionalLrs.length > 0 && (
              <div>
                <label className="text-sm font-medium mb-2 block flex items-center gap-2">
                  <span className="text-pink-600">📋 Additional Bill No:</span>
                  <Badge variant="outline" className="text-xs">({categorizedLrs.additionalLrs.length} LR(s))</Badge>
                </label>
                <input
                  type="text"
                  value={additionalBillNo}
                  onChange={(e) => setAdditionalBillNo(e.target.value)}
                  placeholder="e.g., ADD001"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Will become: MT/25-26/{additionalBillNo || 'ADD-XXX'}
                </p>
              </div>
            )}
            
            {/* Submission Date */}
            <div>
            <label className="text-sm font-medium mb-2 block">
                Submission Date: <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={submissionDate}
              onChange={(e) => setSubmissionDate(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              required
            />
              <p className="text-xs text-muted-foreground mt-1">
              Files will be created in: invoices/{submissionDate || '[date]'}/
            </p>
          </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowDatePicker(false);
              setReworkBillNo('');
              setAdditionalBillNo('');
              setCategorizedLrs(null);
            }}>
              Cancel
            </Button>
            <Button 
              onClick={() => {
                confirmGenerateAllBills();
                setReworkBillNo('');
                setAdditionalBillNo('');
                setCategorizedLrs(null);
              }} 
              disabled={!submissionDate}
            >
              Generate All Bills
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Download Modal */}
      <Dialog open={showDownloadModal} onOpenChange={closeDownloadModal}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto w-[95vw] sm:w-full mx-4">
          <DialogHeader>
            <div className="flex items-start justify-between">
              <div>
            <DialogTitle className="flex items-center gap-2 text-green-600">
              <Check className="h-6 w-6" />
              Bills Generated Successfully!
            </DialogTitle>
            <DialogDescription>
              {generatedFiles.length} LR bill(s) generated for {submissionDate}
            </DialogDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  // Open folder in Windows Explorer / macOS Finder
                  window.location.href = `/api/download-file?path=${encodeURIComponent('invoices/' + submissionDate)}&list=1`;
                }}
                className="gap-2"
              >
                <Folder className="h-4 w-4" />
                <span className="hidden sm:inline">View Folder</span>
              </Button>
            </div>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-gray-700">
                Files are saved on server in: <code className="bg-green-100 px-1 rounded">invoices/{submissionDate}/</code>
              </p>
            </div>
            
            <Button
              onClick={downloadAllFiles}
              className="w-full"
              size="lg"
            >
              <Download className="mr-2 h-5 w-5" />
              Download All Files ({generatedFiles.length * 2 + 1} files)
            </Button>
            
            <div className="space-y-3">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase">Individual Files:</h3>
              {generatedFiles.map((result, index) => {
                const lrFileName = result.files.lrFile.split(/[/\\]/).pop();
                const invoiceFileName = result.files.invoiceFile.split(/[/\\]/).pop();
                
                return (
                  <Card key={index} className="bg-slate-50">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">LR No: {result.lrNo}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <Button
                        onClick={() => downloadFile(result.files.lrFile)}
                        variant="outline"
                        className="w-full justify-start"
                        size="sm"
                      >
                        <Download className="mr-2 h-4 w-4" />
                        📄 {lrFileName}
                      </Button>
                      <Button
                        onClick={() => downloadFile(result.files.invoiceFile)}
                        variant="outline"
                        className="w-full justify-start bg-purple-50 hover:bg-purple-100"
                        size="sm"
                      >
                        <Download className="mr-2 h-4 w-4" />
                        🧾 {invoiceFileName}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
              
              {generatedFiles.length > 0 && (
                <Card className="bg-yellow-50 border-yellow-200">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">📊 Summary Sheet</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Button
                      onClick={() => downloadFile(generatedFiles[0].files.finalSheet)}
                      variant="outline"
                      className="w-full justify-start"
                      size="sm"
                    >
                      <Download className="mr-2 h-4 w-4" />
                      📋 Final Submission Sheet.xlsx
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowDownloadModal(false);
                // Return to results modal - keep results modal open
                setShowResultsModal(true);
              }}
            >
              <ChevronLeft className="mr-2 h-4 w-4" />
              Back to Results
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Bulk Status Change Modal */}
      <Dialog open={showBulkStatusModal} onOpenChange={setShowBulkStatusModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              Bulk Status Change
            </DialogTitle>
            <DialogDescription>
              Change status for {selectedLrs.size} selected LR(s)
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <Label className="mb-3 block">Select New Status:</Label>
            <div className="grid grid-cols-2 gap-3">
              {LR_STATUS_OPTIONS.map((status) => {
                const colors = STATUS_COLORS[status as keyof typeof STATUS_COLORS];
                const isSelected = bulkStatus === status;
                
                return (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setBulkStatus(status)}
                    className={`
                      relative p-4 rounded-lg border-2 transition-all
                      ${isSelected 
                        ? `${colors.bg} ${colors.text} ${colors.border} shadow-lg scale-105` 
                        : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow'
                      }
                    `}
                  >
                    {isSelected && (
                      <div className="absolute -top-2 -right-2 bg-primary text-white rounded-full p-1">
                        <Check className="h-3 w-3" />
                      </div>
                    )}
                    <div className="text-center">
                      <div className={`text-3xl mb-2 ${isSelected ? '' : 'opacity-50'}`}>
                        {status === 'LR Done' && '📄'}
                        {status === 'LR Collected' && '📦'}
                        {status === 'Bill Done' && '🧾'}
                        {status === 'Bill Submitted' && '✅'}
                      </div>
                      <div className={`text-xs font-bold ${isSelected ? '' : 'text-gray-600'}`}>
                        {status}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
            
            <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-xs text-blue-800">
                <strong>{selectedLrs.size}</strong> LR(s) will be changed to: <strong>{bulkStatus}</strong>
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkStatusModal(false)}>
              Cancel
            </Button>
            <Button onClick={confirmBulkStatusChange}>
              Update Status
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Generation Results Modal */}
      <Dialog open={showResultsModal} onOpenChange={setShowResultsModal}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-auto w-[95vw] sm:w-full mx-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600">
              <Check className="h-6 w-6" />
              Bills Generated Successfully!
            </DialogTitle>
            <DialogDescription>
              Generated {generationResults?.summary.total || 0} bill(s) for {generationResults?.submissionDate || ''}
            </DialogDescription>
          </DialogHeader>
          
          {generationResults && (
            <div className="space-y-4">
              {/* Summary Cards */}
              <div className="grid grid-cols-3 gap-4">
                {generationResults.summary.rework > 0 && (
                  <Card className="bg-orange-50 border-orange-300">
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <div className="text-3xl font-bold text-orange-600">{generationResults.summary.rework}</div>
                        <div className="text-sm text-orange-700 mt-1">🔄 Rework</div>
    </div>
                    </CardContent>
                  </Card>
                )}
                {generationResults.summary.additional > 0 && (
                  <Card className="bg-pink-50 border-pink-300">
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <div className="text-3xl font-bold text-pink-600">{generationResults.summary.additional}</div>
                        <div className="text-sm text-pink-700 mt-1">📋 Additional</div>
                      </div>
                    </CardContent>
                  </Card>
                )}
                {generationResults.summary.regular > 0 && (
                  <Card className="bg-blue-50 border-blue-300">
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <div className="text-3xl font-bold text-blue-600">{generationResults.summary.regular}</div>
                        <div className="text-sm text-blue-700 mt-1">📄 Regular</div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
              
              {/* Cloud Upload Status */}
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2 text-green-800">
                  <Check className="h-5 w-5" />
                  <div>
                    <p className="font-semibold">Files successfully uploaded to cloud</p>
                    <p className="text-sm text-green-700 mt-1">
                      Saved in: <code className="bg-green-100 px-1 rounded">invoices/{generationResults.submissionDate}/</code>
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Download Section */}
              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold">Download Files:</h3>
                  <Button 
                    onClick={downloadSelectedFiles}
                    disabled={zipDownloading}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    {zipDownloading ? 'Creating ZIP...' : 'Download Selected as ZIP'}
                  </Button>
                </div>
                
                <div className="space-y-3">
                  {generationResults.results.map((result: any, index: number) => {
                    const isSelected = selectedBillTypes.has(result.type);
                    return (
                      <Card key={index} className={isSelected ? 'bg-blue-50 border-blue-300' : 'bg-slate-50'}>
                        <CardContent className="pt-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleBillType(result.type)}
                                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                              />
                              <div>
                                <p className="font-medium capitalize">{result.type} Bill</p>
                                <p className="text-sm text-gray-600">{result.count} LR(s)</p>
                              </div>
                            </div>
                            <Button
                              onClick={() => {
                                // Navigate to specific bill type download
                                if (result.type === 'regular' && result.results) {
                                  setGeneratedFiles(result.results);
                                  setShowDownloadModal(true);
                                  // Keep results modal open - don't close it
                                } else {
                                  // For rework/additional, download directly
                                  if (result.data && result.data.filePath) {
                                    downloadFile(result.data.filePath);
                                  } else {
                                    toast.success(`${result.type.charAt(0).toUpperCase() + result.type.slice(1)} bill generated successfully!`);
                                  }
                                }
                              }}
                              variant="outline"
                              size="sm"
                            >
                              <Download className="mr-2 h-4 w-4" />
                              Download
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                  
                  {/* Final Submission Sheet */}
                  <Card className="bg-yellow-50 border-yellow-200">
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={includeFinalSheet}
                            onChange={(e) => setIncludeFinalSheet(e.target.checked)}
                            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                          />
                          <div>
                            <p className="font-medium">📋 Final Submission Sheet</p>
                            <p className="text-sm text-gray-600">Summary of all bills</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {generationResults.results.find((r: any) => r.type === 'regular' && r.results) && (
                            <Button
                              onClick={() => {
                                const regularResult = generationResults.results.find((r: any) => r.type === 'regular' && r.results);
                                const finalSheetPath = regularResult?.results?.[0]?.files?.finalSheet;
                                if (finalSheetPath) {
                                  const rel = finalSheetPath.includes('/invoices/')
                                    ? finalSheetPath.split('/invoices/')[1]
                                    : (finalSheetPath.includes('\\invoices\\') ? finalSheetPath.split('\\invoices\\')[1] : finalSheetPath);
                                  downloadFile(rel);
                                } else {
                                  toast.error('Final Submission Sheet not available');
                                }
                              }}
                              variant="outline"
                              size="sm"
                            >
                              <Download className="mr-2 h-4 w-4" />
                              Download
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
              
              {/* Errors */}
              {generationResults.errors && generationResults.errors.length > 0 && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="font-semibold text-red-800 mb-2">⚠️ Partial Failures:</p>
                  <ul className="text-sm text-red-700 space-y-1">
                    {generationResults.errors.map((err: any, i: number) => (
                      <li key={i}>• {err.type}: {err.error}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowResultsModal(false);
              loadLRs();
            }}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Statistics Breakdown Modal */}
      <Dialog open={showProfitBreakdown} onOpenChange={setShowProfitBreakdown}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-auto w-[95vw] sm:w-full mx-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TrendingUp className="h-6 w-6 text-teal-600" />
              Statistics Breakdown
            </DialogTitle>
            <DialogDescription>
              Detailed financial analysis for {selectedMonth === 'All Months' ? 'All Months' : selectedMonth} {selectedYear === 'All Years' ? '' : selectedYear}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Total LR Count for Selected Month - Moved to top */}
            <Card className="bg-gradient-to-br from-slate-50 to-slate-100 border-slate-300">
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-sm text-gray-600 mb-2">Total LRs for Selected Month</div>
                  <div className="text-4xl font-bold text-slate-700">{stats.total}</div>
                </div>
              </CardContent>
            </Card>

            {/* Summary Cards - Reordered: Expenses, Revenue, Profit */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-300">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <div className="text-2xl md:text-3xl font-bold text-red-600">₹{stats.totalExpenses.toLocaleString()}</div>
                    <div className="text-sm text-red-700 mt-1">Total Expenses</div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-300">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <div className="text-2xl md:text-3xl font-bold text-green-600">₹{stats.estimatedRevenue.toLocaleString()}</div>
                    <div className="text-sm text-green-700 mt-1">Total Revenue</div>
                  </div>
                </CardContent>
              </Card>
              <Card className={`bg-gradient-to-br ${stats.totalProfit >= 0 ? 'from-teal-50 to-teal-100 border-teal-300' : 'from-orange-50 to-orange-100 border-orange-300'}`}>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <div className={`text-2xl md:text-3xl font-bold ${stats.totalProfit >= 0 ? 'text-teal-600' : 'text-orange-600'}`}>
                      ₹{stats.totalProfit.toLocaleString()}
                    </div>
                    <div className={`text-sm mt-1 ${stats.totalProfit >= 0 ? 'text-teal-700' : 'text-orange-700'}`}>
                      Net Profit
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Profit Margin */}
            <Card className="bg-slate-50">
              <CardHeader>
                <CardTitle className="text-lg">Profit Margin</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <div className="w-full bg-slate-200 rounded-full h-4 overflow-hidden">
                      <div 
                        className={`h-4 rounded-full transition-all duration-500 ease-out ${
                          stats.totalProfit >= 0 
                            ? 'bg-gradient-to-r from-teal-500 to-teal-600' 
                            : 'bg-gradient-to-r from-red-500 to-red-600'
                        }`}
                        style={{ 
                          width: stats.estimatedRevenue > 0 
                            ? `${Math.abs((stats.totalProfit / stats.estimatedRevenue) * 100)}%` 
                            : '0%' 
                        }}
                      ></div>
                    </div>
                  </div>
                  <div className="text-sm font-semibold">
                    {stats.estimatedRevenue > 0 
                      ? `${((stats.totalProfit / stats.estimatedRevenue) * 100).toFixed(1)}%`
                      : '0%'
                    }
                  </div>
                </div>
                <p className="text-xs text-gray-600 mt-2">
                  {(stats.totalProfit / stats.estimatedRevenue * 100).toFixed(1)}% of revenue retained as profit
                </p>
              </CardContent>
            </Card>

            {/* Breakdown by Vehicle Type */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Truck className="h-5 w-5" />
                  Breakdown by Vehicle Type
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {['PICKUP', 'TRUCK', 'TOROUS'].map((type) => {
                    const vehicleLrs = statsData.filter((lr: LRData) => 
                      lr['Vehicle Type'] === type
                    );
                    
                    if (vehicleLrs.length === 0) return null;

                    let vehicleRevenue = 0;
                    let vehicleExpenses = 0;

                    vehicleLrs.forEach((lr: LRData) => {
                      const lrNo = (lr['LR No'] || '').toString();
                      const isAdditionalRecord = lrNo.startsWith('ADDITIONAL-');
                      
                      // Check if Consignee column has multiple locations separated by '/'
                      const consigneeColumn = (lr['Consignee'] || '').toString().trim();
                      const consigneeLocations = consigneeColumn.split('/').filter(loc => loc.trim().length > 0);
                      const hasAdditionalDelivery = consigneeLocations.length > 1;
                      
                      // For backwards compatibility, also check TO column
                      const toColumn = (lr['TO'] || '').toString().trim();
                      const toLocations = toColumn.split('/').filter(loc => loc.trim().length > 0);
                      const hasAdditionalDeliveryInTO = toLocations.length > 1;
                      
                      // Use either Consignee or TO for multiple locations
                      const finalHasAdditionalDelivery = hasAdditionalDelivery || hasAdditionalDeliveryInTO;
                      const finalLocationCount = hasAdditionalDelivery ? consigneeLocations.length : (hasAdditionalDeliveryInTO ? toLocations.length : 1);
                      
                      const from = (lr['FROM'] || '').toString().toLowerCase().trim();
                      const to = toColumn.toLowerCase().trim();
                      const isRework = !isAdditionalRecord && from === 'kolhapur' && to === 'solapur';

                      let revenue = 0;
                      let driverPayment = 0;
                      
                      const baseRevenue = VEHICLE_AMOUNTS[type as keyof typeof VEHICLE_AMOUNTS] || 0;
                      
                      if (isAdditionalRecord) {
                        // Additional bill records: Revenue is already in the Amount field
                        revenue = lr['Amount'] || 0;
                        driverPayment = 0; // No driver payment for additional records
                      } else if (finalHasAdditionalDelivery && !isRework) {
                        // Regular LR with multiple delivery locations
                        const additionalMultiplier = finalLocationCount - 1;
                        const additionalAmount = ADDITIONAL_BILL_AMOUNTS[type as keyof typeof ADDITIONAL_BILL_AMOUNTS] || 0;
                        const calculatedAdditionalAmount = additionalMultiplier * additionalAmount;
                        revenue = baseRevenue + calculatedAdditionalAmount;
                        driverPayment = DRIVER_PAYMENTS[type as keyof typeof DRIVER_PAYMENTS] || 0;
                      } else if (isRework) {
                        // Rework bills: 80% of regular revenue
                        revenue = baseRevenue * REWORK_REVENUE_MULTIPLIER;
                        driverPayment = REWORK_DRIVER_PAYMENTS[type as keyof typeof DRIVER_PAYMENTS] || 0;
                      } else {
                        // Regular bills
                        revenue = baseRevenue;
                        driverPayment = DRIVER_PAYMENTS[type as keyof typeof DRIVER_PAYMENTS] || 0;
                      }
                      
                      vehicleRevenue += revenue;
                      vehicleExpenses += driverPayment;
                    });

                    const vehicleProfit = vehicleRevenue - vehicleExpenses;

                    return (
                      <div key={type} className="p-4 border rounded-lg bg-slate-50">
                        <div className="flex justify-between items-center mb-2">
                          <h4 className="font-semibold">{type}</h4>
                          <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                            {vehicleLrs.length} LR{vehicleLrs.length > 1 ? 's' : ''}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <div className="text-gray-600">Expenses</div>
                            <div className="text-red-600 font-semibold">₹{vehicleExpenses.toLocaleString()}</div>
                          </div>
                          <div>
                            <div className="text-gray-600">Revenue</div>
                            <div className="text-green-600 font-semibold">₹{vehicleRevenue.toLocaleString()}</div>
                          </div>
                          <div>
                            <div className="text-gray-600">Profit</div>
                            <div className={`font-semibold ${vehicleProfit >= 0 ? 'text-teal-600' : 'text-orange-600'}`}>
                              ₹{vehicleProfit.toLocaleString()}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Breakdown by Bill Type - Collapsible */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Breakdown by Bill Type
                  </CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowBillTypeBreakdown(!showBillTypeBreakdown)}
                    className="text-xs"
                  >
                    {showBillTypeBreakdown ? 'Hide' : 'View'} Breakdown
                  </Button>
                </div>
              </CardHeader>
              {showBillTypeBreakdown && (
              <CardContent>
                <div className="space-y-4">
                  {/* Regular Bills */}
                  <div className="p-4 border rounded-lg bg-blue-50">
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="font-semibold text-blue-900">Regular Bills</h4>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <div className="text-gray-600">Expenses</div>
                        <div className="text-red-600 font-semibold">₹{stats.regularExpenses.toLocaleString()}</div>
                      </div>
                      <div>
                        <div className="text-gray-600">Revenue</div>
                        <div className="text-green-600 font-semibold">₹{stats.regularRevenue.toLocaleString()}</div>
                      </div>
                      <div>
                        <div className="text-gray-600">Profit</div>
                        <div className={`font-semibold ${stats.regularProfit >= 0 ? 'text-teal-600' : 'text-orange-600'}`}>
                          ₹{stats.regularProfit.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Rework Bills */}
                  <div className="p-4 border rounded-lg bg-purple-50">
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="font-semibold text-purple-900">Rework Bills (Kolhapur → Solapur)</h4>
                      <Badge variant="secondary" className="bg-purple-200 text-purple-800">
                        @ 80% rate
                      </Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <div className="text-gray-600">Expenses</div>
                        <div className="text-red-600 font-semibold">₹{stats.reworkExpenses.toLocaleString()}</div>
                      </div>
                      <div>
                        <div className="text-gray-600">Revenue</div>
                        <div className="text-green-600 font-semibold">₹{stats.reworkRevenue.toLocaleString()}</div>
                      </div>
                      <div>
                        <div className="text-gray-600">Profit</div>
                        <div className={`font-semibold ${stats.reworkProfit >= 0 ? 'text-teal-600' : 'text-orange-600'}`}>
                          ₹{stats.reworkProfit.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Additional Bills */}
                  <div className="p-4 border rounded-lg bg-amber-50">
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="font-semibold text-amber-900">Additional Bills</h4>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <div className="text-gray-600">Expenses</div>
                        <div className="text-red-600 font-semibold">₹{stats.additionalExpenses.toLocaleString()}</div>
                      </div>
                      <div>
                        <div className="text-gray-600">Revenue</div>
                        <div className="text-green-600 font-semibold">₹{stats.additionalRevenue.toLocaleString()}</div>
                      </div>
                      <div>
                        <div className="text-gray-600">Profit</div>
                        <div className={`font-semibold ${stats.additionalProfit >= 0 ? 'text-teal-600' : 'text-orange-600'}`}>
                          ₹{stats.additionalProfit.toLocaleString()}
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-gray-600 mt-2 italic">Additional revenue from multiple delivery locations only. Base revenue and driver expenses are in Regular Bills.</p>
                  </div>
                </div>
              </CardContent>
              )}
            </Card>

            {/* Visual Charts Section - Moved to bottom */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Visual Analytics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <DashboardCharts
                  vehicleData={chartsData.vehicleData}
                  monthlyData={chartsData.monthlyData}
                  billTypeData={chartsData.billTypeData}
                />
              </CardContent>
            </Card>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowProfitBreakdown(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Stats Password Modal */}
      <Dialog open={showStatsPasswordModal} onOpenChange={(o) => { setShowStatsPasswordModal(o); if (!o) setStatsPassword(''); }}>
        <DialogContent className="w-[95vw] sm:w-full max-w-md">
          <DialogHeader>
            <DialogTitle>Enter Password</DialogTitle>
            <DialogDescription>For security, please enter the statistics password.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              type="password"
              placeholder="Password"
              value={statsPassword}
              onChange={(e) => setStatsPassword(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') (document.getElementById('stats-auth-btn') as HTMLButtonElement)?.click(); }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowStatsPasswordModal(false); setStatsPassword(''); }}>Cancel</Button>
            <Button
              id="stats-auth-btn"
              disabled={statsAuthLoading || statsPassword.length === 0}
              onClick={async () => {
                setStatsAuthLoading(true);
                try {
                  const res = await fetch('/api/stats-auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: statsPassword }) });
                  const data = await res.json();
                  if (!res.ok || !data.success) {
                    throw new Error(data?.error || 'Invalid password');
                  }
                  setShowStatsPasswordModal(false);
                  setStatsPassword('');
                  setShowMonthlyProfit(true);
                } catch (err: any) {
                  toast.error(err.message || 'Authentication failed');
                } finally {
                  setStatsAuthLoading(false);
                }
              }}
              className="bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 text-white"
            >
              {statsAuthLoading ? 'Verifying...' : 'Verify'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* LR Details Modal */}
      <Dialog open={showLrDetails} onOpenChange={setShowLrDetails}>
        <DialogContent className="w-[95vw] sm:w-full max-w-md">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-base sm:text-lg">LR Details</DialogTitle>
                <DialogDescription className="text-xs sm:text-sm">Quick view of selected LR record</DialogDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  window.print();
                }}
                className="gap-1 sm:gap-2 no-print"
              >
                <Printer className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Print</span>
              </Button>
            </div>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-3 sm:gap-4 print-view">
            <div className="flex items-center justify-between text-xs sm:text-sm">
              <span className="text-gray-600">LR No</span>
              <span className="font-semibold text-gray-900">{detailLr?.['LR No'] || '-'}</span>
            </div>
            <div className="flex items-center justify-between text-xs sm:text-sm">
              <span className="text-gray-600">LR Date</span>
              <span className="font-semibold text-gray-900">{detailLr?.['LR Date'] || '-'}</span>
            </div>
            <div className="flex items-center justify-between text-xs sm:text-sm">
              <span className="text-gray-600">Vehicle No</span>
              <span className="font-semibold text-gray-900">{detailLr?.['Vehicle Number'] || (detailLr as any)?.['Vehicle No'] || '-'}</span>
            </div>
            <div className="flex items-center justify-between text-xs sm:text-sm">
              <span className="text-gray-600">Vehicle Type</span>
              <span className="font-semibold text-gray-900">{detailLr?.['Vehicle Type'] || '-'}</span>
            </div>
            <div className="flex items-start justify-between text-xs sm:text-sm gap-4">
              <span className="text-gray-600 mt-0.5">Description of Goods</span>
              <span className="font-semibold text-gray-900 text-right max-w-[65%] whitespace-pre-line break-words" title={detailLr?.['Description of Goods'] || ''}>
                {(() => {
                  const raw = (detailLr?.['Description of Goods'] || '').toString();
                  if (!raw) return '-';
                  const pre = raw
                    .replace(/[;,|]/g, '\n')
                    .replace(/\s*\n+\s*/g, '\n')
                    .trim();
                  const lines = pre.split(/\n+/).filter(Boolean);
                  const formatted = lines.map((line) => {
                    const s = line.trim().replace(/\s+/g, ' ');
                    // If already has a colon, keep as is
                    if (/:/.test(s)) return s;
                    // Match trailing numeric quantity after a name
                    const m = /^(.*?)(?:\s|-)?(\d+(?:\.\d+)?)$/.exec(s);
                    if (m) {
                      const label = m[1].trim();
                      const qty = m[2];
                      if (label) return `${label}: ${qty}`;
                    }
                    // Insert break between number and following letters (e.g., 56A -> 56\nA handled earlier by split, but keep fallback)
                    return s.replace(/([0-9])(\s*[A-Za-z])/g, '$1\n$2');
                  }).join('\n');
                  return formatted || '-';
                })()}
              </span>
            </div>
            <div className="flex items-start justify-between text-xs sm:text-sm">
              <span className="text-gray-600 mt-0.5">Remark</span>
              <span className="font-medium text-gray-900 text-right max-w-[65%] whitespace-pre-wrap break-words">
                {detailLr?.remark || '-'}
              </span>
            </div>
            <div className="pt-2 no-print">
              <button
                type="button"
                onClick={() => setShowDetailFiles(v => !v)}
                className="px-2 py-1 text-[10px] sm:text-xs border rounded hover:bg-gray-50"
              >
                {showDetailFiles ? 'Hide Files' : `View Files${((detailLr as any)?.attachments?.length ? ` (${(detailLr as any).attachments.length})` : '')}`}
              </button>
              {showDetailFiles && (
                <div className="space-y-2 mt-2 max-h-[40vh] overflow-auto">
                  {(((detailLr as any)?.attachments) || []).length === 0 ? (
                    <p className="text-xs text-gray-600">No files uploaded.</p>
                  ) : (
                    (((detailLr as any).attachments) as Array<{url:string; name:string; type:string; thumbUrl?: string; scanned?: boolean; infected?: boolean}>).map((f, idx) => (
                      <div key={idx} className="flex items-center justify-between gap-3 text-xs sm:text-sm border rounded p-2">
                        <div className="flex items-center gap-2 min-w-0">
                          {f.thumbUrl ? (
                            <img src={f.thumbUrl} alt={f.name} className="w-10 h-10 rounded object-cover border" />
                          ) : (
                            <div className="w-10 h-10 rounded bg-gray-100 border flex items-center justify-center text-gray-500">{f.type?.startsWith('image/') ? 'IMG' : 'PDF'}</div>
                          )}
                          <div className="min-w-0">
                            <div className="font-medium text-gray-900 truncate max-w-[200px]" title={f.name}>{f.name}</div>
                            <div className="text-gray-500 flex items-center gap-2">
                              <span>{f.type}</span>
                              <span className="text-green-600">Ready</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => downloadAttachment(f.url, f.name)}
                            className="px-2 py-1 border rounded hover:bg-gray-50"
                            title="Download"
                          >
                            Download
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteAttachment(detailLr?.['LR No'] as string, f.url)}
                            className={`px-2 py-1 border rounded text-red-600 hover:bg-red-50 flex items-center gap-1 ${deletingAttachments.has(f.url) ? 'opacity-70 cursor-not-allowed' : ''}`}
                            disabled={deletingAttachments.has(f.url)}
                            title="Delete"
                          >
                            {deletingAttachments.has(f.url) ? (
                              <>
                                <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path></svg>
                                <span>Deleting</span>
                              </>
                            ) : 'Delete'}
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
          <DialogFooter className="no-print">
            <Button variant="outline" onClick={() => setShowLrDetails(false)} className="w-full sm:w-auto">Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Context Menu */}
      {contextMenu && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setContextMenu(null)}
            onContextMenu={(e) => {
              e.preventDefault();
              setContextMenu(null);
            }}
          />
          <div
            className="fixed z-50 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[180px]"
            style={{ left: `${contextMenu.x}px`, top: `${contextMenu.y}px` }}
          >
            <button
              onClick={() => {
                const lr = memoizedFilteredLrs.find((l: any) => l['LR No'] === contextMenu.lrNo);
                if (lr) {
                  setDetailLr(lr);
                  setShowLrDetails(true);
                }
                setContextMenu(null);
              }}
              className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center gap-2"
            >
              <Eye className="h-4 w-4" />
              View Details
            </button>
            <button
              onClick={() => {
                const lr = memoizedFilteredLrs.find((l: any) => l['LR No'] === contextMenu.lrNo);
                if (lr) {
                  editLR(lr);
                }
                setContextMenu(null);
              }}
              className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center gap-2"
            >
              <FileText className="h-4 w-4" />
              Edit
            </button>
            <button
              onClick={() => {
                window.print();
                setContextMenu(null);
              }}
              className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center gap-2"
            >
              <Printer className="h-4 w-4" />
              Print
            </button>
            {(session?.user as any)?.role === 'CEO' || (session?.user as any)?.role === 'MANAGER' ? (
              <button
                onClick={() => {
                  if (confirm(`Delete LR ${contextMenu.lrNo}?`)) {
                    deleteLRsMutation.mutate([contextMenu.lrNo]);
                  }
                  setContextMenu(null);
                }}
                className="w-full text-left px-4 py-2 text-sm hover:bg-red-50 text-red-600 flex items-center gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </button>
            ) : null}
          </div>
        </>
      )}
      </div>
</>
  );
}
