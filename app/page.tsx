'use client';

import { useState, useEffect } from 'react';
import { 
  Plus, RefreshCw, Check, X, Trash2, FileText, Download, 
  Truck, Calendar, MapPin, Package, TrendingUp, BarChart3, Search, Database
} from 'lucide-react';
import LRForm from '@/components/LRForm';
import ReworkBillForm from '@/components/ReworkBillForm';
import AdditionalBillForm from '@/components/AdditionalBillForm';
import { LRData } from '@/lib/database';
import { MONTHS, VEHICLE_AMOUNTS, LR_STATUS_OPTIONS, STATUS_COLORS } from '@/lib/constants';
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
  
  // Filters & Search
  const [selectedMonth, setSelectedMonth] = useState('All Months');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [searchQuery, setSearchQuery] = useState('');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  
  // Load LRs
  const loadLRs = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/lrs');
      const data = await response.json();
      if (data.success) {
        setLrs(data.lrs);
        filterLRs(data.lrs, selectedMonth, selectedYear);
      }
    } catch (error) {
      console.error('Failed to load LRs:', error);
    }
    setLoading(false);
  };
  
  useEffect(() => {
    loadLRs();
  }, []);
  
  // Filter LRs by month/year and search
  const filterLRs = (allLrs: LRData[], month: string, year: string, search: string = '') => {
    let filtered = allLrs;
    
    // Filter by year
    if (year !== 'All Years') {
      filtered = filtered.filter(lr => {
        const lrDate = lr['LR Date'];
        if (!lrDate) return false;
        const parts = lrDate.split('-');
        return parts.length === 3 && parts[2] === year;
      });
    }
    
    // Filter by month
    if (month !== 'All Months') {
      const monthIndex = MONTHS.indexOf(month) + 1;
      filtered = filtered.filter(lr => {
        const lrDate = lr['LR Date'];
        if (!lrDate) return false;
        const parts = lrDate.split('-');
        return parts.length === 3 && parseInt(parts[1]) === monthIndex;
      });
    }
    
    // Search filter
    if (search.trim()) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(lr => 
        lr['LR No']?.toLowerCase().includes(searchLower) ||
        lr['Vehicle Number']?.toLowerCase().includes(searchLower) ||
        lr['FROM']?.toLowerCase().includes(searchLower) ||
        lr['TO']?.toLowerCase().includes(searchLower) ||
        lr['Material Supply To']?.toLowerCase().includes(searchLower) ||
        lr['Vehicle Type']?.toLowerCase().includes(searchLower)
      );
    }
    
    setFilteredLrs(filtered);
    setCurrentPage(1); // Reset to first page when filtering
  };
  
  useEffect(() => {
    filterLRs(lrs, selectedMonth, selectedYear, searchQuery);
  }, [selectedMonth, selectedYear, searchQuery, lrs]);
  
  // Pagination calculations
  const totalPages = Math.ceil(filteredLrs.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedLrs = filteredLrs.slice(startIndex, endIndex);
  
  // Go to page
  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };
  
  // Calculate statistics
  const stats = {
    total: filteredLrs.length,
    lrDone: filteredLrs.filter(lr => lr.status === 'LR Done').length,
    lrCollected: filteredLrs.filter(lr => lr.status === 'LR Collected').length,
    billDone: filteredLrs.filter(lr => lr.status === 'Bill Done').length,
    billSubmitted: filteredLrs.filter(lr => lr.status === 'Bill Submitted').length,
    pendingBills: filteredLrs.filter(lr => lr.status === 'LR Collected').length, // LRs collected but bills not generated
    pendingSubmission: filteredLrs.filter(lr => lr.status === 'Bill Done').length, // Bills ready to submit
    thisMonth: filteredLrs.filter(lr => {
      const date = new Date();
      const currentMonth = date.getMonth() + 1;
      const currentYear = date.getFullYear();
      const lrDate = lr['LR Date'];
      if (!lrDate) return false;
      const parts = lrDate.split('-');
      return parts.length === 3 && parseInt(parts[1]) === currentMonth && parseInt(parts[2]) === currentYear;
    }).length,
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
      alert('Please select at least one LR to delete');
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
        loadLRs();
      } else {
        alert('Failed to delete LRs');
      }
    } catch (error) {
      alert('Failed to delete LRs');
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

  // Handle bill selection modal
  // Generate bills
  const handleGenerateBills = () => {
    if (selectedLrs.size === 0) {
      alert('Please select at least one LR to generate bills');
      return;
    }
    setShowDatePicker(true);
  };
  
  const confirmGenerateBills = async () => {
    if (!submissionDate) {
      alert('Please select a submission date');
      return;
    }
    
    setShowDatePicker(false);
    setLoading(true);
    
    try {
      const response = await fetch('/api/generate-bills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lrNumbers: Array.from(selectedLrs),
          submissionDate,
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Show download modal with generated files
        setGeneratedFiles(data.results);
        setShowDownloadModal(true);
        setSelectedLrs(new Set());
        
        // Show error message if any LRs failed
        if (data.errors && data.errors.length > 0) {
          setTimeout(() => {
            alert(`⚠️ ${data.errors.length} LR(s) failed:\n${data.errors.map((e: any) => `- ${e.lrNo}: ${e.error}`).join('\n')}`);
          }, 500);
        }
      } else {
        alert(`Failed to generate bills:\n${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      alert('Failed to generate bills. Please check if template files exist.');
    } finally {
      setLoading(false);
    }
  };
  
  // Update LR status
  const updateLRStatus = async (lrNo: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/lrs/${encodeURIComponent(lrNo)}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      
      const data = await response.json();
      if (data.success) {
        // Refresh LRs to show updated status
        loadLRs();
      } else {
        alert('Failed to update status');
      }
    } catch (error) {
      alert('Failed to update status');
    }
  };
  
  // Bulk status change
  const handleBulkStatusChange = () => {
    if (selectedLrs.size === 0) {
      alert('Please select at least one LR to change status');
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
        alert(`✅ Updated ${data.count} LR(s) to status: ${bulkStatus}`);
        setSelectedLrs(new Set());
        setBulkStatus('LR Done');
        loadLRs();
      } else {
        alert('Failed to update status');
      }
    } catch (error) {
      alert('Failed to update status');
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
    setSubmissionDate('');
  };
  
  // Generate years for filter
  const currentYear = new Date().getFullYear();
  const years = ['All Years', ...Array.from({ length: 5 }, (_, i) => (currentYear - 2 + i).toString())];
  
  if (currentView === 'form') {
    return <LRForm editingLr={editingLr} onBack={backToDashboard} />;
  }
  
  if (currentView === 'rework-bill') {
    return <ReworkBillForm onBack={backToDashboard} />;
  }
  
  if (currentView === 'additional-bill') {
    return <AdditionalBillForm onBack={backToDashboard} />;
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-50">
      {/* Hero Header with Gradient */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="bg-white/20 backdrop-blur-sm p-3 rounded-lg">
                <Truck className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold">LR Billing Dashboard</h1>
                <p className="text-blue-100 mt-1">Mangesh Transport - Complete LR Management</p>
              </div>
            </div>
            <div className="flex gap-3 flex-wrap">
              <Button 
                onClick={createNewLR} 
                size="lg"
                className="bg-white text-blue-600 hover:bg-blue-50 shadow-lg"
              >
                <Plus className="mr-2 h-5 w-5" />
                Create New LR
              </Button>
              <Button 
                onClick={() => {
                  setCurrentView('rework-bill');
                }}
                size="lg"
                className="bg-white text-orange-600 hover:bg-orange-50 shadow-lg"
              >
                <FileText className="mr-2 h-5 w-5" />
                Rework Bill
              </Button>
              <Button 
                onClick={() => {
                  setCurrentView('additional-bill');
                }}
                size="lg"
                className="bg-white text-purple-600 hover:bg-purple-50 shadow-lg"
              >
                <FileText className="mr-2 h-5 w-5" />
                Additional Bill
              </Button>
              <Button 
                onClick={() => window.location.href = '/admin'}
                size="lg"
                variant="outline"
                className="bg-white/20 text-white border-white/30 hover:bg-white/30"
              >
                <Database className="mr-2 h-5 w-5" />
                Database
              </Button>
            </div>
          </div>
        </div>
      </div>
      
      <div className="container mx-auto px-4 py-8">
        {/* Key Metrics - Action Items */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-300">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="bg-amber-500 p-3 rounded-lg">
                  <Truck className="h-6 w-6 text-white" />
                </div>
                <div>
                  <CardDescription className="text-amber-700">To Be Collected</CardDescription>
                  <CardTitle className="text-3xl text-amber-600">{stats.lrDone}</CardTitle>
                  <p className="text-xs text-amber-600 mt-1">LRs with drivers, awaiting return</p>
                </div>
              </div>
            </CardHeader>
          </Card>
          
          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-300">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="bg-orange-500 p-3 rounded-lg">
                  <FileText className="h-6 w-6 text-white" />
                </div>
                <div>
                  <CardDescription className="text-orange-700">Pending Bills</CardDescription>
                  <CardTitle className="text-3xl text-orange-600">{stats.pendingBills}</CardTitle>
                  <p className="text-xs text-orange-600 mt-1">LRs collected, bills not generated</p>
                </div>
              </div>
            </CardHeader>
          </Card>
          
          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-300">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="bg-purple-500 p-3 rounded-lg">
                  <Package className="h-6 w-6 text-white" />
                </div>
                <div>
                  <CardDescription className="text-purple-700">Ready to Submit</CardDescription>
                  <CardTitle className="text-3xl text-purple-600">{stats.pendingSubmission}</CardTitle>
                  <p className="text-xs text-purple-600 mt-1">Bills generated, pending submission</p>
                </div>
              </div>
            </CardHeader>
          </Card>
          
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-300">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="bg-blue-500 p-3 rounded-lg">
                  <Calendar className="h-6 w-6 text-white" />
                </div>
                <div>
                  <CardDescription className="text-blue-700">This Month</CardDescription>
                  <CardTitle className="text-3xl text-blue-600">{stats.thisMonth}</CardTitle>
                  <p className="text-xs text-blue-600 mt-1">LRs created this month</p>
                </div>
              </div>
            </CardHeader>
          </Card>
        </div>
        
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
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <select 
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
                className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {years.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
              
              {/* Items per page */}
              <select 
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value={10}>10 / page</option>
                <option value={20}>20 / page</option>
                <option value={50}>50 / page</option>
                <option value={100}>100 / page</option>
              </select>
              
              <Button onClick={loadLRs} variant="outline">
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
            </div>
          </CardContent>
        </Card>
        
        {/* LR Table Card */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl">LR Records</CardTitle>
                <CardDescription className="mt-2">
                  Showing {startIndex + 1}-{Math.min(endIndex, filteredLrs.length)} of {filteredLrs.length} LRs
                  {filteredLrs.length !== lrs.length && ` (filtered from ${lrs.length} total)`}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-sm px-3 py-1">
                  {selectedLrs.size} Selected
                </Badge>
                <Badge className="text-sm px-3 py-1 bg-blue-100 text-blue-800">
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
                      <th className="px-4 py-3 text-left">
                        <input
                          type="checkbox"
                          checked={selectedLrs.size === filteredLrs.length && filteredLrs.length > 0}
                          onChange={() => selectedLrs.size === filteredLrs.length ? deselectAll() : selectAll()}
                          className="w-4 h-4 text-primary rounded border-gray-300 focus:ring-primary"
                        />
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">LR No</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Vehicle No</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Date</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          FROM
                        </div>
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          TO
                        </div>
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Material</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Type</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Workflow Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {loading ? (
                      <tr>
                        <td colSpan={10} className="px-4 py-12 text-center">
                          <div className="flex items-center justify-center gap-2 text-muted-foreground">
                            <RefreshCw className="h-5 w-5 animate-spin" />
                            <span>Loading LRs...</span>
                          </div>
                        </td>
                      </tr>
                    ) : filteredLrs.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="px-4 py-12 text-center">
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
                          <td className="px-4 py-4">
                            <input
                              type="checkbox"
                              checked={selectedLrs.has(lr['LR No'])}
                              onChange={() => toggleLRSelection(lr['LR No'])}
                              className="w-4 h-4 text-primary rounded border-gray-300 focus:ring-primary"
                            />
                          </td>
                          <td className="px-4 py-4">
                            <div className="font-medium text-sm text-foreground">{lr['LR No']}</div>
                          </td>
                          <td className="px-4 py-4 text-sm text-muted-foreground">
                            {lr['Vehicle Number'] || <span className="text-yellow-600 italic">Not set</span>}
                          </td>
                          <td className="px-4 py-4 text-sm text-muted-foreground">{lr['LR Date']}</td>
                          <td className="px-4 py-4 text-sm">
                            <Badge variant="outline">{lr['FROM'] || '-'}</Badge>
                          </td>
                          <td className="px-4 py-4 text-sm">
                            <Badge variant="outline">{lr['TO'] || '-'}</Badge>
                          </td>
                          <td className="px-4 py-4 text-sm text-muted-foreground truncate max-w-[200px]">
                            {lr['Material Supply To'] || '-'}
                          </td>
                          <td className="px-4 py-4">
                            <Badge variant="secondary">{lr['Vehicle Type']}</Badge>
                          </td>
                          <td className="px-4 py-4">
                            <div className="relative group">
                              <select
                                value={lr.status || 'LR Done'}
                                onChange={(e) => updateLRStatus(lr['LR No'], e.target.value)}
                                className={`
                                  w-full px-3 py-2 rounded-lg text-xs font-bold border-2 
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
                              <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <Button
                              onClick={() => editLR(lr)}
                              variant="ghost"
                              size="sm"
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
              <div className="mt-6 flex items-center justify-between border-t pt-4">
                <div className="text-sm text-muted-foreground">
                  Showing {startIndex + 1} to {Math.min(endIndex, filteredLrs.length)} of {filteredLrs.length} results
                </div>
                
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
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
                          className="w-9"
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
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Action Buttons Card */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-3">
              <Button onClick={selectAll} variant="outline">
                <Check className="mr-2 h-4 w-4" />
                Select All
              </Button>
              <Button onClick={deselectAll} variant="outline">
                <X className="mr-2 h-4 w-4" />
                Deselect All
              </Button>
              <Button 
                onClick={handleBulkStatusChange} 
                variant="outline"
                disabled={selectedLrs.size === 0}
                className="border-blue-500 text-blue-600 hover:bg-blue-50"
              >
                <TrendingUp className="mr-2 h-4 w-4" />
                Change Status ({selectedLrs.size})
              </Button>
              <Button onClick={deleteSelected} variant="destructive" disabled={selectedLrs.size === 0}>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Selected ({selectedLrs.size})
              </Button>
              <Button 
                onClick={handleGenerateBills}
                disabled={selectedLrs.size === 0 || loading}
                className="bg-purple-600 hover:bg-purple-700 ml-auto"
              >
                <FileText className="mr-2 h-4 w-4" />
                {loading ? 'Generating...' : `Generate Bills (${selectedLrs.size})`}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Submission Date Modal */}
      <Dialog open={showDatePicker} onOpenChange={setShowDatePicker}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Select Submission Date</DialogTitle>
            <DialogDescription>
              Generating bills for {selectedLrs.size} LR(s)
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <label className="text-sm font-medium mb-2 block">
              Submission Date:
            </label>
            <input
              type="date"
              value={submissionDate}
              onChange={(e) => setSubmissionDate(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              required
            />
            <p className="text-xs text-muted-foreground mt-2">
              Files will be created in: invoices/{submissionDate || '[date]'}/
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDatePicker(false)}>
              Cancel
            </Button>
            <Button onClick={confirmGenerateBills} disabled={!submissionDate}>
              Generate Bills
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Download Modal */}
      <Dialog open={showDownloadModal} onOpenChange={closeDownloadModal}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600">
              <Check className="h-6 w-6" />
              Bills Generated Successfully!
            </DialogTitle>
            <DialogDescription>
              {generatedFiles.length} LR bill(s) generated for {submissionDate}
            </DialogDescription>
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
            <Button variant="outline" onClick={closeDownloadModal}>
              Close
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
    </div>
  );
}
