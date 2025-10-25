'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { 
  Plus, RefreshCw, Check, X, Trash2, FileText, Download, 
  Truck, Calendar, MapPin, Package, TrendingUp, BarChart3, Search, Folder, 
  DollarSign, PieChart, TrendingDown
} from 'lucide-react';
import JSZip from 'jszip';
import toast from 'react-hot-toast';
import LRForm from '@/components/LRForm';
import ReworkBillForm from '@/components/ReworkBillForm';
import AdditionalBillForm from '@/components/AdditionalBillForm';
import { LRData } from '@/lib/database';
import { MONTHS, VEHICLE_AMOUNTS, ADDITIONAL_BILL_AMOUNTS, LR_STATUS_OPTIONS, STATUS_COLORS } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import UserProfileDropdown from '@/components/UserProfileDropdown';

export default function Dashboard() {
  const [lrs, setLrs] = useState<LRData[]>([]);
  const [filteredLrs, setFilteredLrs] = useState<LRData[]>([]);
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
  
  // Filters & Search
  const [selectedMonth, setSelectedMonth] = useState('All Months');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatuses, setSelectedStatuses] = useState<Set<string>>(new Set());
  const [tempStatuses, setTempStatuses] = useState<Set<string>>(new Set());
  
  // Sorting
  const [sortBy, setSortBy] = useState<'lrNo' | 'date' | 'none'>('none');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  
  // Auth Session
  const { data: session, status } = useSession();
  const router = useRouter();
  
  // Load LRs function
  const loadLRs = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/lrs');
      const data = await response.json();
      if (data.success) {
        setLrs(data.lrs);
      }
    } catch (error) {
      console.error('Failed to load LRs:', error);
    }
    setLoading(false);
  };
  
  // Filter LRs by month/year and search
  const filterLRs = (allLrs: LRData[], month: string, year: string, search: string = '', statuses: Set<string> = new Set()) => {
    let filtered = allLrs;
    
    // Filter by year (dates are in DD-MM-YYYY format)
    if (year !== 'All Years') {
      filtered = filtered.filter(lr => {
        const lrDate = lr['LR Date'];
        if (!lrDate) return false;
        const parts = lrDate.split('-');
        // parts[2] is the year in DD-MM-YYYY format
        return parts.length === 3 && parts[2] === year;
      });
    }
    
    // Filter by month (dates are in DD-MM-YYYY format)
    if (month !== 'All Months') {
      const monthIndex = MONTHS.indexOf(month) + 1;
      filtered = filtered.filter(lr => {
        const lrDate = lr['LR Date'];
        if (!lrDate) return false;
        const parts = lrDate.split('-');
        // parts[1] is the month in DD-MM-YYYY format
        return parts.length === 3 && parseInt(parts[1]) === monthIndex;
      });
    }

    // Filter by statuses
    if (statuses.size > 0) {
      filtered = filtered.filter(lr => lr.status && statuses.has(lr.status));
    }
    
    // Search filter
    if (search.trim()) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(lr => 
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
      filtered.sort((a, b) => {
        const aNo = a['LR No'] || '';
        const bNo = b['LR No'] || '';
        return sortOrder === 'asc' ? aNo.localeCompare(bNo) : bNo.localeCompare(aNo);
      });
    } else if (sortBy === 'date') {
      filtered.sort((a, b) => {
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
    
    setFilteredLrs(filtered);
    setCurrentPage(1); // Reset to first page when filtering
  };
  
  // Memoized filtered data calculations
  const statsData = useMemo(() => {
    let statsLrs = lrs;
    
    // Filter by year (dates are in DD-MM-YYYY format)
    if (selectedYear !== 'All Years') {
      statsLrs = statsLrs.filter(lr => {
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
      statsLrs = statsLrs.filter(lr => {
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
      PICKUP: statsData.filter(lr => lr['Vehicle Type'] === 'PICKUP').length,
      TRUCK: statsData.filter(lr => lr['Vehicle Type'] === 'TRUCK').length,
      TOUROUS: statsData.filter(lr => lr['Vehicle Type'] === 'TOUROUS').length,
    };
    
    // Calculate revenue based on status (only Bill Done or Bill Submitted count as revenue)
    let revenue = 0;
    statsData.forEach(lr => {
      if (lr.status === 'Bill Done' || lr.status === 'Bill Submitted') {
        const vehicleType = lr['Vehicle Type'] || 'PICKUP';
        revenue += VEHICLE_AMOUNTS[vehicleType as keyof typeof VEHICLE_AMOUNTS] || 0;
      }
    });
    
    return {
      total: statsData.length,
      lrDone: statsData.filter(lr => lr.status === 'LR Done').length,
      lrCollected: statsData.filter(lr => lr.status === 'LR Collected').length,
      billDone: statsData.filter(lr => lr.status === 'Bill Done').length,
      billSubmitted: statsData.filter(lr => lr.status === 'Bill Submitted').length,
      pendingBills: statsData.filter(lr => lr.status === 'LR Collected').length, // LRs collected but bills not generated
      pendingSubmission: statsData.filter(lr => lr.status === 'Bill Done').length, // Bills ready to submit
      thisMonth: statsData.length, // Already filtered by month/year, so just show the count
      vehicleTypeBreakdown, // Vehicle type breakdown
      estimatedRevenue: revenue, // Estimated revenue
      billCompletionRate: statsData.length > 0 ? Math.round((statsData.filter(lr => lr.status === 'Bill Done' || lr.status === 'Bill Submitted').length / statsData.length) * 100) : 0, // Percentage of LRs with bills
    };
  }, [statsData]);

  // Apply filters
  useEffect(() => {
    filterLRs(lrs, selectedMonth, selectedYear, searchQuery, selectedStatuses);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonth, selectedYear, searchQuery, lrs, selectedStatuses, sortBy, sortOrder]);
  
  // Memoized pagination calculations
  const totalPages = Math.ceil(filteredLrs.length / itemsPerPage);
  const { paginatedLrs, startIndex, endIndex } = useMemo(() => {
    const startIdx = (currentPage - 1) * itemsPerPage;
    const endIdx = startIdx + itemsPerPage;
    return {
      paginatedLrs: filteredLrs.slice(startIdx, endIdx),
      startIndex: startIdx,
      endIndex: endIdx,
    };
  }, [filteredLrs, currentPage, itemsPerPage]);
  
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
  
  // NOW WE CAN DO EARLY RETURNS AFTER ALL HOOKS
  if (status === 'loading') {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }
  
  if (status === 'unauthenticated') {
    return null;
  }
  
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
    const newSelected = new Set(filteredLrs.map(lr => lr['LR No']));
    setSelectedLrs(newSelected);
  };
  
  const deselectAll = () => {
    setSelectedLrs(new Set());
  };
  
  // Delete selected LRs
  const deleteSelected = async () => {
    if (selectedLrs.size === 0) {
      toast.error('Please select at least one LR to delete');
      return;
    }
    
    if (!confirm(`Are you sure you want to delete ${selectedLrs.size} LR(s)?`)) {
      return;
    }
    
    try {
      const response = await fetch('/api/lrs', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lrNumbers: Array.from(selectedLrs) }),
      });
      
      const data = await response.json();
      if (data.success) {
        setSelectedLrs(new Set());
        toast.success(`Successfully deleted ${selectedLrs.size} LR(s)`);
        loadLRs();
      } else {
        toast.error('Failed to delete LRs');
      }
    } catch (error) {
      toast.error('Failed to delete LRs');
    }
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
    loadLRs();
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
    return Array.from(selectedLrs).every(lrNo => {
      const lr = lrs.find(l => l['LR No'] === lrNo);
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
    const firstLr = lrs.find(l => l['LR No'] === selectedArray[0]);
    if (!firstLr) return false;
    
    const firstFrom = firstLr['FROM']?.toLowerCase().trim() || '';
    const firstTo = firstLr['TO']?.toLowerCase().trim() || '';
    const isFirstRework = firstFrom === 'kolhapur' && firstTo === 'solapur';
    
    // Check if all selected LRs have the same route type as the first one
    return selectedArray.every(lrNo => {
      const lr = lrs.find(l => l['LR No'] === lrNo);
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
    
    return Array.from(selectedLrs).some(lrNo => {
      const lr = lrs.find(l => l['LR No'] === lrNo);
      if (!lr || !lr['Consignee']) return false;
      
      // Count consignees by splitting on '/' and filtering empty strings
      const consignees = lr['Consignee'].split('/').map(c => c.trim()).filter(c => c.length > 0);
      return consignees.length >= 2;
    });
  };

  // Helper function to get compatible LRs for Additional Bill (2+ consignees)
  const getCompatibleAdditionalBillLrs = (): string[] => {
    return Array.from(selectedLrs).filter(lrNo => {
      const lr = lrs.find(l => l['LR No'] === lrNo);
      if (!lr || !lr['Consignee']) return false;
      
      // Count consignees by splitting on '/' and filtering empty strings
      const consignees = lr['Consignee'].split('/').map(c => c.trim()).filter(c => c.length > 0);
      return consignees.length >= 2;
    });
  };

  // Handle bill selection modal
  // Categorize selected LRs by bill type
  const categorizeSelectedLrs = () => {
    const reworkLrs: string[] = [];
    const additionalLrs: string[] = [];
    const regularLrs: string[] = [];
    
    Array.from(selectedLrs).forEach(lrNo => {
      const lr = lrs.find(l => l['LR No'] === lrNo);
      if (!lr) return;
      
      // Case-insensitive comparison
      const from = (lr['FROM'] || '').toString().toLowerCase().trim();
      const to = (lr['TO'] || '').toString().toLowerCase().trim();
      
      // Rework: Kolhapur → Solapur (case-insensitive, regardless of consignee count)
      const isRework = from === 'kolhapur' && to === 'solapur';
      
      const consignees = lr['Consignee']?.split('/').map(c => c.trim()).filter(c => c.length > 0) || [];
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

  // Generate all bill types in one click
  const handleGenerateAllBills = () => {
    if (selectedLrs.size === 0) {
      toast.error('Please select at least one LR to generate bills');
      return;
    }
    
    // Categorize LRs first
    const categorized = categorizeSelectedLrs();
    
    // Debug logging
    console.log('🔍 Categorized LRs:', categorized);
    console.log('  Rework LRs:', categorized.reworkLrs);
    console.log('  Additional LRs:', categorized.additionalLrs);
    console.log('  Regular LRs:', categorized.regularLrs);
    
    // Log details for debugging
    Array.from(selectedLrs).forEach(lrNo => {
      const lr = lrs.find(l => l['LR No'] === lrNo);
      if (lr) {
        const consigneeCount = lr['Consignee']?.split('/').length || 0;
        const from = (lr['FROM'] || '').toString().toLowerCase().trim();
        const to = (lr['TO'] || '').toString().toLowerCase().trim();
        const isRework = from === 'kolhapur' && to === 'solapur';
        const qualifiesForAdditional = !isRework && consigneeCount >= 2;
        
        console.log(`📋 LR: ${lrNo}`, {
          FROM: lr['FROM'],
          TO: lr['TO'],
          Consignee: lr['Consignee'],
          consigneeCount,
          isRework,
          qualifiesForAdditional,
        });
      }
    });
    
    setCategorizedLrs(categorized);
    
    // Show modal with bill number inputs
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
              entries: reworkLrs.map(lrNo => {
                const lr = lrs.find(l => l['LR No'] === lrNo);
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
              }).filter(e => e !== null),
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
              entries: additionalLrs.map(lrNo => {
                const lr = lrs.find(l => l['LR No'] === lrNo);
                if (!lr) return null;
                const vehicleType = lr['Vehicle Type'] || 'PICKUP';
                // Use ADDITIONAL_BILL_AMOUNTS instead of VEHICLE_AMOUNTS
                const additionalAmount = ADDITIONAL_BILL_AMOUNTS[vehicleType as keyof typeof ADDITIONAL_BILL_AMOUNTS] || 0;
                const consignees = lr['Consignee']?.split('/').map(c => c.trim()).filter(c => c.length > 0) || [];
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
              }).filter(e => e !== null),
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
  
  // Update LR status
  const updateLRStatus = async (lrNo: string, newStatus: string) => {
    try {
      // Optimistically update the UI first
      setLrs(prevLrs => 
        prevLrs.map(lr => 
          lr['LR No'] === lrNo ? { ...lr, status: newStatus } : lr
        )
      );
      
      // Then update the API
      const response = await fetch(`/api/lrs/${encodeURIComponent(lrNo)}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      
      const data = await response.json();
      if (!data.success) {
        // Revert on error by reloading
        loadLRs();
        toast.error('Failed to update status');
      } else {
        toast.success('Status updated successfully');
      }
    } catch (error) {
      // Revert on error by reloading
      loadLRs();
      toast.error('Failed to update status');
    }
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
    setLoading(true);
    
    try {
      const response = await fetch('/api/lrs/bulk-status', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lrNumbers: Array.from(selectedLrs),
          status: bulkStatus,
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast.success(`Updated ${data.count} LR(s) to status: ${bulkStatus}`);
        setSelectedLrs(new Set());
        setBulkStatus('LR Done');
        loadLRs();
      } else {
        toast.error('Failed to update status');
      }
    } catch (error) {
      toast.error('Failed to update status');
    } finally {
      setLoading(false);
    }
  };
  
  // Get status color
  const getStatusColor = (status: string) => {
    return STATUS_COLORS[status as keyof typeof STATUS_COLORS] || STATUS_COLORS['LR Done'];
  };
  
  // Download file
  const downloadFile = (filePath: string) => {
    const fileName = filePath.split(/[/\\]/).pop() || 'file.xlsx';
    const relativePath = `${submissionDate}/${fileName}`;
    
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
                // Add LR file
                const lrResponse = await fetch(`/api/download-file?path=${encodeURIComponent(submissionDate + '/' + entry.files.lrFile.split('/').pop()?.split('\\').pop())}`);
                if (lrResponse.ok) {
                  const lrBlob = await lrResponse.blob();
                  zip.file(entry.files.lrFile.split('/').pop()?.split('\\').pop() || 'lr.xlsx', lrBlob);
                  fileCount++;
                }
                
                // Add invoice file
                const invoiceResponse = await fetch(`/api/download-file?path=${encodeURIComponent(submissionDate + '/' + entry.files.invoiceFile.split('/').pop()?.split('\\').pop())}`);
                if (invoiceResponse.ok) {
                  const invoiceBlob = await invoiceResponse.blob();
                  zip.file(entry.files.invoiceFile.split('/').pop()?.split('\\').pop() || 'invoice.xlsx', invoiceBlob);
                  fileCount++;
                }
              }
            }
          } else if (result.type === 'rework' && result.data) {
            // Add rework bill file
            const fileName = result.data.filePath || 'rework.xlsx';
            const fileResponse = await fetch(`/api/download-file?path=${encodeURIComponent(fileName)}`);
            if (fileResponse.ok) {
              const fileBlob = await fileResponse.blob();
              zip.file(fileName.split('/').pop()?.split('\\').pop() || 'rework.xlsx', fileBlob);
              fileCount++;
            }
          } else if (result.type === 'additional' && result.data) {
            // Add additional bill file
            const fileName = result.data.filePath || 'additional.xlsx';
            const fileResponse = await fetch(`/api/download-file?path=${encodeURIComponent(fileName)}`);
            if (fileResponse.ok) {
              const fileBlob = await fileResponse.blob();
              zip.file(fileName.split('/').pop()?.split('\\').pop() || 'additional.xlsx', fileBlob);
              fileCount++;
            }
          }
        }
      }
      
      // Add final submission sheet if selected
      if (includeFinalSheet) {
        const regularResult = generationResults.results.find((r: any) => r.type === 'regular' && r.results);
        if (regularResult?.results?.[0]?.files?.finalSheet) {
          const finalSheetResponse = await fetch(`/api/download-file?path=${encodeURIComponent(submissionDate + '/Final_Submission_Sheet.xlsx')}`);
          if (finalSheetResponse.ok) {
            const finalBlob = await finalSheetResponse.blob();
            zip.file('Final_Submission_Sheet.xlsx', finalBlob);
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
  const years = ['All Years', ...Array.from({ length: 5 }, (_, i) => (currentYear - 2 + i).toString())];
  
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
  
  return (
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
                className="bg-white text-blue-600 hover:bg-blue-50 shadow-lg font-semibold text-xs sm:text-sm md:text-base px-2 sm:px-3 md:px-4"
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

        {/* Stats Cards - Responsive Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6 md:mb-8">
          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-300">
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
          
          <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-300">
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
          
          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-300">
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
          
          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-300">
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
        
        {/* Analytics Section - Additional Insights (CEO Only) */}
        {(session?.user as any)?.role === 'CEO' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-6 md:mb-8">
          {/* Estimated Revenue Card */}
          <Card className="bg-gradient-to-br from-indigo-50 to-indigo-100 border-indigo-300">
            <CardHeader className="pb-3 md:pb-4">
              <div className="flex items-center gap-2 md:gap-3">
                <div className="bg-indigo-500 p-2 md:p-3 rounded-lg flex-shrink-0">
                  <DollarSign className="h-5 w-5 md:h-6 md:w-6 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <CardDescription className="text-indigo-700 text-xs md:text-sm">Estimated Revenue</CardDescription>
                  <CardTitle className="text-xl md:text-2xl text-indigo-600">₹{stats.estimatedRevenue.toLocaleString()}</CardTitle>
                  <p className="text-[10px] md:text-xs text-indigo-600 mt-0.5">From {stats.billDone + stats.billSubmitted} completed bills</p>
                </div>
              </div>
            </CardHeader>
          </Card>
          
          {/* Bill Completion Rate Card */}
          <Card className="bg-gradient-to-br from-teal-50 to-teal-100 border-teal-300">
            <CardHeader className="pb-3 md:pb-4">
              <div className="flex items-center gap-2 md:gap-3">
                <div className="bg-teal-500 p-2 md:p-3 rounded-lg flex-shrink-0">
                  <TrendingUp className="h-5 w-5 md:h-6 md:w-6 text-white" />
        </div>
                <div className="min-w-0 flex-1">
                  <CardDescription className="text-teal-700 text-xs md:text-sm">Bill Completion Rate</CardDescription>
                  <CardTitle className="text-xl md:text-2xl text-teal-600">{stats.billCompletionRate}%</CardTitle>
                  <p className="text-[10px] md:text-xs text-teal-600 mt-0.5">{stats.total - (stats.billDone + stats.billSubmitted)} LRs pending bills</p>
                </div>
              </div>
            </CardHeader>
          </Card>
          
          {/* Vehicle Type Breakdown Card */}
          <Card className="bg-gradient-to-br from-rose-50 to-rose-100 border-rose-300">
            <CardHeader className="pb-3 md:pb-4">
              <div className="flex items-start gap-2 md:gap-3">
                <div className="bg-rose-500 p-2 md:p-3 rounded-lg flex-shrink-0">
                  <PieChart className="h-5 w-5 md:h-6 md:w-6 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <CardDescription className="text-rose-700 text-xs md:text-sm mb-2">Vehicle Type Breakdown</CardDescription>
                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-rose-700">PICKUP:</span>
                      <Badge variant="secondary" className="bg-rose-200 text-rose-800 text-xs">{stats.vehicleTypeBreakdown.PICKUP}</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-rose-700">TRUCK:</span>
                      <Badge variant="secondary" className="bg-rose-200 text-rose-800 text-xs">{stats.vehicleTypeBreakdown.TRUCK}</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-rose-700">TOUROUS:</span>
                      <Badge variant="secondary" className="bg-rose-200 text-rose-800 text-xs">{stats.vehicleTypeBreakdown.TOUROUS}</Badge>
                    </div>
                  </div>
                </div>
              </div>
            </CardHeader>
          </Card>
        </div>
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
                    className="flex h-10 w-full rounded-md border border-input bg-background pl-10 pr-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>
              </div>
              
              {/* Month Filter */}
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Calendar className="h-4 w-4 text-muted-foreground hidden sm:inline" />
                <select 
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
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
                onChange={(e) => setSelectedYear(e.target.value)}
                className="flex h-10 w-full sm:w-auto rounded-md border border-input bg-background px-2 sm:px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {years.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
              
              {/* Status Filter - Multi-select */}
              <div className="relative group w-full sm:w-auto">
                <button 
                  className="flex h-10 rounded-md border border-input bg-background px-2 sm:px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring hover:bg-slate-50 w-full"
                  onClick={(e) => {
                    setTempStatuses(new Set(selectedStatuses));
                    e.currentTarget.parentElement?.classList.toggle('open');
                  }}
                >
                  <span className="flex-1 text-left">
                    {selectedStatuses.size === 0 ? 'All Statuses' : `${selectedStatuses.size} Selected`}
                  </span>
                  <span className="ml-2">▼</span>
                </button>
                
                {/* Dropdown menu */}
                <div className="hidden group-[.open]:block absolute top-full left-0 mt-1 bg-white border border-input rounded-md shadow-lg z-50 min-w-max">
                  {/* Select All / Clear All */}
                  <div className="px-3 py-2 border-b border-gray-200">
                    <button
                      onClick={() => {
                        if (tempStatuses.size === LR_STATUS_OPTIONS.length) {
                          setTempStatuses(new Set());
                        } else {
                          setTempStatuses(new Set(LR_STATUS_OPTIONS));
                        }
                      }}
                      className="text-xs font-medium text-blue-600 hover:text-blue-800 underline"
                    >
                      {tempStatuses.size === LR_STATUS_OPTIONS.length ? 'Clear All' : 'Select All'}
                    </button>
                  </div>
                  
                  {/* Status options */}
                  {LR_STATUS_OPTIONS.map(status => (
                    <label key={status} className="flex items-center px-4 py-3 hover:bg-blue-50 cursor-pointer transition-colors border-b border-gray-100 last:border-b-0">
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
                        className="w-4 h-4 accent-blue-600 cursor-pointer"
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
                  
                  {/* OK and Cancel buttons */}
                  <div className="px-3 py-3 border-t border-gray-200 flex gap-2">
                    <button
                      onClick={() => {
                        setSelectedStatuses(new Set(tempStatuses));
                        document.querySelector('.group.open')?.classList.remove('open');
                      }}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-3 rounded text-sm transition-colors"
                    >
                      OK
                    </button>
                    <button
                      onClick={() => {
                        setTempStatuses(new Set(selectedStatuses));
                        document.querySelector('.group.open')?.classList.remove('open');
                      }}
                      className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-3 rounded text-sm transition-colors"
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
                  Showing {startIndex + 1}-{Math.min(endIndex, filteredLrs.length)} of {filteredLrs.length} LRs
                  {filteredLrs.length !== lrs.length && ` (filtered from ${lrs.length} total)`}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="text-xs sm:text-sm px-2 sm:px-3 py-1">
                  {selectedLrs.size} Selected
                </Badge>
                <Badge className="text-xs sm:text-sm px-2 sm:px-3 py-1 bg-blue-100 text-blue-800">
                  Page {currentPage} of {totalPages || 1}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr className="border-b">
                      <th className="px-1 md:px-4 py-3 text-left w-10">
                        <input
                          type="checkbox"
                          checked={selectedLrs.size === filteredLrs.length && filteredLrs.length > 0}
                          onChange={() => selectedLrs.size === filteredLrs.length ? deselectAll() : selectAll()}
                          className="w-4 h-4 text-primary rounded border-gray-300 focus:ring-primary"
                        />
                      </th>
                      <th className="px-2 md:px-4 py-2 text-left text-xs md:text-sm font-medium text-muted-foreground uppercase tracking-wider">
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
                      <th className="px-2 md:px-4 py-2 text-left text-xs md:text-sm font-medium text-muted-foreground uppercase tracking-wider">Vehicle No</th>
                      <th className="px-2 md:px-4 py-2 text-left text-xs md:text-sm font-medium text-muted-foreground uppercase tracking-wider">
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
                      <th className="px-2 md:px-4 py-2 text-left text-xs md:text-sm font-medium text-muted-foreground uppercase tracking-wider hidden md:table-cell">
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          FROM
                        </div>
                      </th>
                      <th className="px-1 md:px-4 py-2 text-left text-xs md:text-sm font-medium text-muted-foreground uppercase tracking-wider max-w-[100px]">TO</th>
                      <th className="px-2 md:px-4 py-2 text-left text-xs md:text-sm font-medium text-muted-foreground uppercase tracking-wider hidden md:table-cell">Type</th>
                      <th className="px-1 md:px-2 py-2 text-left text-[9px] md:text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                        Submit Date
                      </th>
                      <th className="px-1 md:px-4 py-2 text-left text-xs md:text-sm font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                      <th className="px-1 md:px-4 py-2 text-left text-xs md:text-sm font-medium text-muted-foreground uppercase tracking-wider">Remark</th>
                      <th className="px-1 md:px-4 py-2 text-left text-xs md:text-sm font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {loading ? (
                      <tr>
                        <td colSpan={12} className="px-4 py-12 text-center">
                          <div className="flex items-center justify-center gap-2 text-muted-foreground">
                            <RefreshCw className="h-5 w-5 animate-spin" />
                            <span>Loading LRs...</span>
                          </div>
                        </td>
                      </tr>
                    ) : filteredLrs.length === 0 ? (
                      <tr>
                        <td colSpan={12} className="px-4 py-12 text-center">
                          <div className="flex flex-col items-center gap-2">
                            <Truck className="h-12 w-12 text-muted-foreground opacity-50" />
                            <p className="text-muted-foreground font-medium">No LRs found</p>
                            <p className="text-sm text-muted-foreground">Create your first LR to get started!</p>
                            <Button onClick={createNewLR} className="mt-4">
                              <Plus className="mr-2 h-4 w-4" />
                              Create New LR
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      paginatedLrs.map((lr, index) => (
                        <tr 
                          key={lr['LR No']} 
                          className={`hover:bg-muted/50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}
                        >
                          <td className="px-1 md:px-4 py-3 w-10">
                            <input
                              type="checkbox"
                              checked={selectedLrs.has(lr['LR No'])}
                              onChange={() => toggleLRSelection(lr['LR No'])}
                              className="w-4 h-4 text-primary rounded border-gray-300 focus:ring-primary"
                            />
                          </td>
                          <td className="px-1 md:px-4 py-3">
                            <div className="font-medium text-[10px] md:text-sm text-foreground">{lr['LR No']}</div>
                          </td>
                          <td className="px-1 md:px-4 py-3 text-[10px] md:text-sm text-muted-foreground">
                            {lr['Vehicle Number'] || <span className="text-yellow-600 italic">Not set</span>}
                          </td>
                          <td className="px-1 md:px-4 py-3 text-[10px] md:text-sm text-muted-foreground">{lr['LR Date']}</td>
                          <td className="px-2 md:px-4 py-3 text-xs md:text-sm hidden md:table-cell">
                            <Badge variant="outline" className="text-xs md:text-sm">{lr['FROM'] || '-'}</Badge>
                          </td>
                          <td className="px-1 md:px-4 py-3 text-xs md:text-sm max-w-[100px]">
                            <div className="font-medium text-gray-700 bg-gray-100 px-1.5 md:px-3 py-1 rounded border border-gray-300 whitespace-normal break-words text-[10px] md:text-xs truncate" title={getToValue(lr['Consignee'] || '')}>{getToValue(lr['Consignee'] || '')}</div>
                          </td>
                          <td className="px-2 md:px-4 py-3 hidden md:table-cell">
                            <Badge variant="secondary" className="text-xs md:text-sm">{lr['Vehicle Type']}</Badge>
                          </td>
                          <td className="px-1 md:px-2 py-3 text-[8px] md:text-[10px] text-muted-foreground whitespace-nowrap">
                            {lr['Bill Submission Date'] || <span className="text-gray-400 italic text-[8px]">-</span>}
                          </td>
                          <td className="px-1 md:px-4 py-3">
                            <div className="relative group">
                              <select
                                value={lr.status || 'LR Done'}
                                onChange={(e) => updateLRStatus(lr['LR No'], e.target.value)}
                                className={`
                                  w-full px-0.5 md:px-2 py-1 md:py-2 rounded-lg text-[9px] md:text-xs lg:text-sm font-bold border-2 
                                  cursor-pointer transition-all
                                  ${getStatusColor(lr.status || 'LR Done').bg} 
                                  ${getStatusColor(lr.status || 'LR Done').text} 
                                  ${getStatusColor(lr.status || 'LR Done').border}
                                  hover:shadow-md hover:scale-105
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
                          <td className="px-1 md:px-4 py-2">
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
                              className="w-full px-1.5 md:px-2 py-1 md:py-2 text-[9px] md:text-xs lg:text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </td>
                          <td className="px-1 md:px-4 py-3">
                            <Button
                              onClick={() => editLR(lr)}
                              variant="ghost"
                              size="sm"
                              className="text-[10px] md:text-sm h-7 md:h-8 px-1.5 md:px-3"
                            >
                              Edit
                            </Button>
                          </td>
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
                  Showing {startIndex + 1} to {Math.min(endIndex, filteredLrs.length)} of {filteredLrs.length} results
                </div>
                
                <div className="flex items-center gap-1 md:gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="text-xs md:text-sm"
                  >
                    <ChevronLeft className="h-3 w-3 md:h-4 md:w-4" />
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
                          className="w-7 md:w-9 text-xs md:text-sm"
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
                    className="text-xs md:text-sm"
                  >
                    <span className="hidden md:inline">Next</span>
                    <ChevronRight className="h-3 w-3 md:h-4 md:w-4" />
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
                <Button onClick={selectAll} variant="outline" className="text-xs md:text-sm">
                  <Check className="mr-2 h-3 w-3 md:h-4 md:w-4" />
                Select All
              </Button>
                <Button onClick={deselectAll} variant="outline" className="text-xs md:text-sm">
                  <X className="mr-2 h-3 w-3 md:h-4 md:w-4" />
                Deselect All
              </Button>
              <Button 
                onClick={handleBulkStatusChange} 
                variant="outline"
                disabled={selectedLrs.size === 0}
                  className="border-blue-500 text-blue-600 hover:bg-blue-50 text-xs md:text-sm"
              >
                  <TrendingUp className="mr-2 h-3 w-3 md:h-4 md:w-4" />
                  <span className="hidden sm:inline">Change Status </span>
                  <span>({selectedLrs.size})</span>
              </Button>
                {(session?.user as any)?.role === 'CEO' || (session?.user as any)?.role === 'MANAGER' ? (
                  <Button onClick={deleteSelected} variant="destructive" disabled={selectedLrs.size === 0} className="text-xs md:text-sm">
                    <Trash2 className="mr-2 h-3 w-3 md:h-4 md:w-4" />
                    <span className="hidden sm:inline">Delete Selected </span>
                    <span>({selectedLrs.size})</span>
              </Button>
                ) : null}
              </div>
              
              {/* Unified Bill Generation Button */}
              <Button 
                onClick={handleGenerateAllBills}
                disabled={selectedLrs.size === 0 || loading}
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 w-full sm:w-auto sm:ml-auto disabled:opacity-50 text-white font-semibold shadow-lg text-xs md:text-sm"
                title="Automatically generates: Rework Bills (KOLHAPUR→Solapur), Additional Bills (2+ consignees), and Regular Bills (others)"
              >
                <FileText className="mr-2 h-3 w-3 md:h-4 md:w-4" />
                {loading ? 'Generating...' : `Generate All Bills (${selectedLrs.size})`}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Bill Generation Modal */}
      <Dialog open={showDatePicker} onOpenChange={setShowDatePicker}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Generate All Bills</DialogTitle>
            <DialogDescription>
              {categorizedLrs && (
                <div className="mt-2 space-y-1">
                  {categorizedLrs.reworkLrs.length > 0 && (
                    <p className="text-sm text-orange-600">🔄 {categorizedLrs.reworkLrs.length} Rework Bill(s)</p>
                  )}
                  {categorizedLrs.additionalLrs.length > 0 && (
                    <p className="text-sm text-pink-600">📋 {categorizedLrs.additionalLrs.length} Additional Bill(s)</p>
                  )}
                  {categorizedLrs.regularLrs.length > 0 && (
                    <p className="text-sm text-blue-600">📄 {categorizedLrs.regularLrs.length} Regular Bill(s)</p>
                  )}
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          
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
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto">
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
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-auto">
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
                              {result.type === 'regular' ? 'View Files' : 'Download'}
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
                        {generationResults.results.find((r: any) => r.type === 'regular' && r.results) && (
                          <Button
                            onClick={() => {
                              const regularResult = generationResults.results.find((r: any) => r.type === 'regular' && r.results);
                              if (regularResult?.results) {
                                // Download final sheet
                                const finalSheetFile = regularResult.results[0]?.files?.finalSheet;
                                if (finalSheetFile) {
                                  downloadFile(finalSheetFile);
                                }
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
    </div>
  );
}
