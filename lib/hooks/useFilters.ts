import { useMemo, useState } from 'react';
import { LRData } from '@/lib/database';
import { MONTHS, LR_STATUS_OPTIONS } from '@/lib/constants';
import { SortBy, SortOrder } from '@/lib/types/dashboard';

interface UseFiltersProps {
  lrs: LRData[];
}

export function useFilters({ lrs }: UseFiltersProps) {
  const [selectedMonth, setSelectedMonth] = useState(() => MONTHS[new Date().getMonth()]);
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear().toString());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatuses, setSelectedStatuses] = useState<Set<string>>(new Set());
  const [activeStatusFilter, setActiveStatusFilter] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortBy>('none');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  // Generate years list
  const years = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const yearsList = ['All Years'];
    for (let i = currentYear; i >= currentYear - 10; i--) {
      yearsList.push(i.toString());
    }
    return yearsList;
  }, []);

  // Memoized filtered LRs
  const filteredLrs = useMemo(() => {
    let filtered = [...lrs];

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
      filtered = [...filtered].sort((a: LRData, b: LRData) => {
        const aNo = a['LR No'] || '';
        const bNo = b['LR No'] || '';
        return sortOrder === 'asc' ? aNo.localeCompare(bNo) : bNo.localeCompare(aNo);
      });
    } else if (sortBy === 'date') {
      filtered = [...filtered].sort((a: LRData, b: LRData) => {
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

  // Stats data (filtered by month/year only)
  const statsData = useMemo(() => {
    let statsLrs = lrs;

    // Filter by year (dates are in DD-MM-YYYY format)
    if (selectedYear !== 'All Years') {
      statsLrs = statsLrs.filter((lr: LRData) => {
        const lrDate = lr['LR Date'];
        if (!lrDate) return false;
        const parts = lrDate.split('-');
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

  return {
    // State
    selectedMonth,
    setSelectedMonth,
    selectedYear,
    setSelectedYear,
    searchQuery,
    setSearchQuery,
    selectedStatuses,
    setSelectedStatuses,
    activeStatusFilter,
    setActiveStatusFilter,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
    // Computed
    filteredLrs,
    statsData,
    years,
  };
}

