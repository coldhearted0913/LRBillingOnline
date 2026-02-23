'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  AlertCircle, 
  CheckCircle2, 
  RefreshCw,
  FileText,
  Download,
  Eye,
  Filter,
  Upload,
  Loader2,
  History,
  Search,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import toast from 'react-hot-toast';
import { fetchWithCSRF } from '@/lib/utils/fetchWithCSRF';

interface PaymentStats {
  totalRecords: number;
  totalLRAmount: number;
  totalPaid: number;
  totalOutstanding: number;
  paymentPercentage: number;
  outstandingLRCount: number;
}

interface PaymentRecord {
  lrNo: string;
  lrDate: string;
  vehicleType: string;
  vehicleNumber: string | null;
  billNumber: string | null;
  invoiceNo: string | null;
  amount: number | null;
  totalPaid: number;
  outstanding: number | null;
  paymentCount: number;
  paidDate: string | null;
  paidDateDisplay?: string | null;
  status: string;
}

interface PaymentHistory {
  id: string;
  paymentAmount: number;
  paymentDate: string;
  paymentMethod: string | null;
  referenceNumber: string | null;
  bankName: string | null;
  transactionId: string | null;
  status: string;
  source: string;
  notes: string | null;
}

// Balance check result types
interface BalanceCheckResult {
  success: boolean;
  error?: string;
  summary?: {
    totalCSVRecords: number;
    totalLRs: number;
    paidCount: number;
    unpaidCount: number;
    newlyPaidCount: number;
    alreadyPaidCount: number;
    notInDBCount: number;
    markedCount: number;
  };
  newlyPaid?: Array<{
    lrNo: string;
    dbId: string;
    invoiceNo: string;
    invoiceDate: string;
    scheduledPaymentDate?: string;
    totalAmount: number;
    tdsAmount: number;
    netAmount: number;
    paymentMethod: string;
    previousStatus: string;
  }>;
  alreadyPaid?: Array<{
    lrNo: string;
    invoiceNo: string;
    totalAmount: number;
    markedDate: string;
  }>;
  unpaid?: Array<{
    lrNo: string;
    invoiceNo: string;
    invoiceDate: string;
    totalAmount: number;
    balanceAmount: number;
    supplierSite: string;
  }>;
  notInDB?: Array<{
    lrNo: string;
    invoiceNo: string;
    totalAmount: number;
    isPaid: boolean;
  }>;
}

interface LastSyncInfo {
  timestamp: string;
  paidCount: number;
  unpaidCount: number;
  newlyPaidCount: number;
  paidLRNos: string[];
}

export function PaymentTrackingDashboard() {
  const [stats, setStats] = useState<PaymentStats | null>(null);
  const [paymentRecords, setPaymentRecords] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [selectedLR, setSelectedLR] = useState<string | null>(null);
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistory[]>([]);
  const [historySummary, setHistorySummary] = useState<any>(null);
  
  // CSV Upload State
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [balanceResult, setBalanceResult] = useState<BalanceCheckResult | null>(null);
  const [lastSync, setLastSync] = useState<LastSyncInfo | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [vehicleType, setVehicleType] = useState('');
  const [search, setSearch] = useState('');
  const [searchApplied, setSearchApplied] = useState(''); // applied on Enter or button

  useEffect(() => {
    loadPaymentRecords();
    loadLastSync();
  }, [startDate, endDate, vehicleType, searchApplied]);

  const loadLastSync = () => {
    try {
      const saved = localStorage.getItem('payment-balance-last-sync');
      if (saved) {
        setLastSync(JSON.parse(saved));
      }
    } catch (e) {
      console.error('Error loading last sync info:', e);
    }
  };

  const saveLastSync = (result: BalanceCheckResult) => {
    if (!result.summary) return;
    const info: LastSyncInfo = {
      timestamp: new Date().toISOString(),
      paidCount: result.summary.paidCount,
      unpaidCount: result.summary.unpaidCount,
      newlyPaidCount: result.summary.newlyPaidCount,
      paidLRNos: (result.newlyPaid || []).map((lr) => lr.lrNo),
    };
    localStorage.setItem('payment-balance-last-sync', JSON.stringify(info));
    setLastSync(info);
  };

  const loadPaymentRecords = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (vehicleType) params.append('vehicleType', vehicleType);
      if (searchApplied) params.append('search', searchApplied);

      const response = await fetch(`/api/payments/outstanding?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        setStats(data.summary);
        setPaymentRecords(data.paymentRecords);
      } else {
        toast.error('Failed to load payment records');
      }
    } catch (error: any) {
      console.error('Error loading payment records:', error);
      toast.error('Error loading payment records');
    } finally {
      setLoading(false);
    }
  };

  const applySearch = () => {
    setSearchApplied(search);
  };

  const clearFilters = () => {
    setStartDate('');
    setEndDate('');
    setVehicleType('');
    setSearch('');
    setSearchApplied('');
  };

  const setDatePreset = (preset: 'this_month' | 'last_month' | 'last_7_days') => {
    const today = new Date();
    let start: Date;
    let end: Date = new Date(today);

    if (preset === 'this_month') {
      start = new Date(today.getFullYear(), today.getMonth(), 1);
    } else if (preset === 'last_month') {
      start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      end = new Date(today.getFullYear(), today.getMonth(), 0);
    } else {
      start = new Date(today);
      start.setDate(start.getDate() - 6);
    }

    setStartDate(start.toISOString().slice(0, 10));
    setEndDate(end.toISOString().slice(0, 10));
  };

  const loadPaymentHistory = async (lrNo: string) => {
    try {
      const response = await fetch(`/api/payments/history/${encodeURIComponent(lrNo)}`);
      const data = await response.json();

      if (data.success) {
        setPaymentHistory(data.payments);
        setHistorySummary(data.summary);
        setShowHistory(true);
      } else {
        toast.error('Failed to load payment history');
      }
    } catch (error: any) {
      console.error('Error loading payment history:', error);
      toast.error('Error loading payment history');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.name.toLowerCase().endsWith('.csv')) {
        toast.error('Please select a CSV file exported from Oracle EBS');
        return;
      }
      setCsvFile(selectedFile);
      setBalanceResult(null);
    }
  };

  const handleCheckBalance = async () => {
    if (!csvFile) {
      toast.error('Please select a CSV file first');
      return;
    }

    setSyncing(true);
    setBalanceResult(null);

    try {
      const formData = new FormData();
      formData.append('file', csvFile);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s is plenty for read-only check

      const response = await fetchWithCSRF('/api/payments/check-balance', {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const data = await response.json();
      setBalanceResult(data);

      if (data.success) {
        saveLastSync(data);
        if (data.summary.newlyPaidCount > 0) {
          toast.success(`Found ${data.summary.newlyPaidCount} newly paid LR(s)! Review below and confirm.`);
        } else if (data.summary.paidCount > 0) {
          toast.success(`All ${data.summary.paidCount} paid LRs were already marked. No new payments.`);
        } else {
          toast('No paid LRs found in this CSV. All bills are still outstanding.', { icon: 'ℹ️' });
        }
      } else {
        toast.error(data.error || 'Failed to process CSV');
      }
    } catch (error: any) {
      const errorMessage = error.name === 'AbortError'
        ? 'Request timed out. Please try again with a smaller file.'
        : error.message || 'Unknown error';
      setBalanceResult({ success: false, error: errorMessage });
      toast.error('Error: ' + errorMessage);
    } finally {
      setSyncing(false);
    }
  };

  // Step 2: Mark the newly paid LRs in the database
  const handleMarkPaid = async () => {
    if (!balanceResult?.newlyPaid || balanceResult.newlyPaid.length === 0) return;

    setSyncing(true);

    try {
      const response = await fetchWithCSRF('/api/payments/check-balance', {
        method: 'POST',
        body: JSON.stringify({
          lrs: balanceResult.newlyPaid.map((lr) => ({
            lrNo: lr.lrNo,
            dbId: lr.dbId,
            invoiceNo: lr.invoiceNo,
            invoiceDate: lr.invoiceDate,
            scheduledPaymentDate: lr.scheduledPaymentDate,
            totalAmount: lr.totalAmount,
            tdsAmount: lr.tdsAmount,
            paymentMethod: lr.paymentMethod,
          })),
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(`Marked ${data.markedCount} LR(s) as paid!`);
        // Update the result to reflect marking
        setBalanceResult((prev) => {
          if (!prev || !prev.summary) return prev;
          return {
            ...prev,
            summary: {
              ...prev.summary,
              markedCount: data.markedCount,
            },
          };
        });
        loadPaymentRecords();
      } else {
        toast.error(data.error || 'Failed to mark LRs as paid');
      }
    } catch (error: any) {
      toast.error('Error marking payments: ' + (error.message || 'Unknown error'));
    } finally {
      setSyncing(false);
    }
  };

  const handleResetUpload = () => {
    setCsvFile(null);
    setBalanceResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const exportPaymentRecords = () => {
    const csv = [
      ['LR No', 'LR Date', 'Vehicle Type', 'Vehicle Number', 'Amount to be paid', 'Paid Date', 'Total Paid', 'Outstanding', 'Status'],
      ...paymentRecords.map((p) => [
        p.lrNo,
        p.lrDate,
        p.vehicleType,
        p.vehicleNumber ?? '',
        p.amount != null ? p.amount.toString() : '',
        (p.paidDateDisplay ?? p.paidDate) ? (p.paidDateDisplay ?? p.paidDate)!.slice(0, 10) : '',
        p.totalPaid.toString(),
        p.outstanding != null ? p.outstanding.toString() : '',
        p.status,
      ]),
    ].map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `payment_records_${startDate || 'all'}_to_${endDate || 'all'}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exported');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Payment Tracking</h2>
          <p className="text-muted-foreground">Monitor payments and outstanding amounts</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowConfig(true)} variant="outline">
            <Upload className="mr-2 h-4 w-4" />
            Check Payments (CSV)
          </Button>
          <Button onClick={loadPaymentRecords} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards - synced with current filters */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Total Outstanding</CardDescription>
              <CardTitle className="text-3xl text-red-600">
                ₹{stats.totalOutstanding.toLocaleString('en-IN')}
              </CardTitle>
              <p className="text-xs text-muted-foreground">In selected period</p>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Total Paid</CardDescription>
              <CardTitle className="text-3xl text-green-600">
                ₹{stats.totalPaid.toLocaleString('en-IN')}
              </CardTitle>
              <p className="text-xs text-muted-foreground">In selected period</p>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Payment Percentage</CardDescription>
              <CardTitle className="text-3xl">
                {stats.paymentPercentage.toFixed(1)}%
              </CardTitle>
              <p className="text-xs text-muted-foreground">Of total amount</p>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Outstanding LRs</CardDescription>
              <CardTitle className="text-3xl">{stats.outstandingLRCount}</CardTitle>
              <p className="text-xs text-muted-foreground">of {stats.totalRecords} records</p>
            </CardHeader>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground">
              Clear all
            </Button>
          </div>
          <CardDescription>
            Leave all filters empty to see all records from the database. Stats and table reflect the current filters.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label>Start Date</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <Label>End Date</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div>
              <Label>Vehicle Type</Label>
              <Input
                type="text"
                placeholder="PICKUP, TRUCK, TOROUS"
                value={vehicleType}
                onChange={(e) => setVehicleType(e.target.value)}
              />
            </div>
            <div>
              <Label>Search</Label>
              <div className="flex gap-2">
                <Input
                  type="text"
                  placeholder="LR No, vehicle no, bill no..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && applySearch()}
                />
                <Button variant="secondary" size="sm" onClick={applySearch}>
                  <Search className="mr-1 h-4 w-4" />
                  Search
                </Button>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="text-xs text-muted-foreground self-center">Quick range:</span>
            <Button variant="outline" size="sm" onClick={() => setDatePreset('this_month')}>
              This month
            </Button>
            <Button variant="outline" size="sm" onClick={() => setDatePreset('last_month')}>
              Last month
            </Button>
            <Button variant="outline" size="sm" onClick={() => setDatePreset('last_7_days')}>
              Last 7 days
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Payment Records Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Payment Records</CardTitle>
              <CardDescription>
                {paymentRecords.length} record{paymentRecords.length !== 1 ? 's' : ''} from database
                {(startDate || endDate || vehicleType || searchApplied) ? ' (filtered)' : ' — all records'}
                <span className="block text-muted-foreground mt-0.5 text-xs">
                  Amount/Outstanding from DB; — = not set. ₹0 outstanding = paid.
                </span>
              </CardDescription>
            </div>
            <Button onClick={exportPaymentRecords} variant="outline" size="sm">
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : paymentRecords.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {(startDate || endDate || vehicleType || searchApplied)
                ? 'No records match the current filters. Clear filters to see all records from the database.'
                : 'No payment records in the database yet.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">LR No</th>
                    <th className="text-left p-2">LR Date</th>
                    <th className="text-left p-2">Vehicle Type</th>
                    <th className="text-left p-2">Vehicle Number</th>
                    <th className="text-right p-2">Amount to be paid</th>
                    <th className="text-left p-2">Paid Date</th>
                    <th className="text-right p-2">Outstanding</th>
                    <th className="text-center p-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paymentRecords.map((record) => (
                    <tr key={record.lrNo} className="border-b hover:bg-muted/50">
                      <td className="p-2 font-mono text-xs">{record.lrNo}</td>
                      <td className="p-2">{record.lrDate}</td>
                      <td className="p-2">
                        <Badge variant="outline">{record.vehicleType}</Badge>
                      </td>
                      <td className="p-2 font-mono text-xs">{record.vehicleNumber ?? '—'}</td>
                      <td className="p-2 text-right">
                        {record.amount != null ? `₹${record.amount.toLocaleString('en-IN')}` : '—'}
                      </td>
                      <td className="p-2 text-xs">
                        {(record.paidDateDisplay ?? record.paidDate)
                          ? (record.paidDateDisplay ?? record.paidDate)!.slice(0, 10)
                          : '—'}
                      </td>
                      <td className="p-2 text-right">
                        {record.outstanding == null ? (
                          <span className="text-muted-foreground" title="Amount not set in DB">—</span>
                        ) : record.outstanding > 0 ? (
                          <span className="text-red-600 font-semibold">₹{record.outstanding.toLocaleString('en-IN')}</span>
                        ) : (
                          <span className="text-green-600">₹0</span>
                        )}
                      </td>
                      <td className="p-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setSelectedLR(record.lrNo);
                            loadPaymentHistory(record.lrNo);
                          }}
                          title="View payment history"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* CSV Balance Check Dialog */}
      <Dialog open={showConfig} onOpenChange={(open) => {
        setShowConfig(open);
        if (!open) {
          // Reset state when closing
          handleResetUpload();
        }
      }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Check Payment Status from CSV
            </DialogTitle>
            <DialogDescription>
              Upload Oracle EBS CSV export to check which LR payments have been completed.
              The system checks the Balance Amount column — if 0, the bill is paid.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Last Sync Info */}
            {lastSync && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-2 text-sm">
                  <History className="h-4 w-4 text-blue-600" />
                  <span className="font-medium text-blue-900">Last checked:</span>
                  <span className="text-blue-700">
                    {new Date(lastSync.timestamp).toLocaleString()}
                  </span>
                </div>
                <div className="mt-1 text-xs text-blue-600">
                  Found {lastSync.paidCount} paid, {lastSync.unpaidCount} unpaid
                  {lastSync.newlyPaidCount > 0 && (
                    <span className="text-green-600 font-medium">
                      {' '}— {lastSync.newlyPaidCount} newly paid
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* File Upload */}
            <div>
              <Label className="text-sm font-medium">Upload Oracle EBS CSV</Label>
              <div className="mt-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="balance-csv-input"
                />
                <label
                  htmlFor="balance-csv-input"
                  className="flex items-center gap-3 px-4 py-6 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors text-center justify-center"
                >
                  {csvFile ? (
                    <>
                      <FileText className="h-6 w-6 text-green-600" />
                      <div>
                        <span className="text-sm font-medium">{csvFile.name}</span>
                        <span className="text-xs text-muted-foreground block">
                          {(csvFile.size / 1024).toFixed(1)} KB — Click to change file
                        </span>
                      </div>
                    </>
                  ) : (
                    <>
                      <Upload className="h-6 w-6 text-muted-foreground" />
                      <div>
                        <span className="text-sm font-medium">Choose CSV file</span>
                        <span className="text-xs text-muted-foreground block">
                          Export from Oracle EBS and upload here
                        </span>
                      </div>
                    </>
                  )}
                </label>
              </div>
            </div>

            {/* Results */}
            {balanceResult && balanceResult.success && balanceResult.summary && (
              <div className="space-y-3">
                {/* Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="p-3 bg-gray-50 rounded-lg text-center">
                    <div className="text-2xl font-bold">{balanceResult.summary.totalLRs}</div>
                    <div className="text-xs text-muted-foreground">Total LRs in CSV</div>
                  </div>
                  <div className="p-3 bg-green-50 rounded-lg text-center">
                    <div className="text-2xl font-bold text-green-600">{balanceResult.summary.paidCount}</div>
                    <div className="text-xs text-green-700">Paid (Balance = 0)</div>
                  </div>
                  <div className="p-3 bg-red-50 rounded-lg text-center">
                    <div className="text-2xl font-bold text-red-600">{balanceResult.summary.unpaidCount}</div>
                    <div className="text-xs text-red-700">Unpaid (Balance &gt; 0)</div>
                  </div>
                  <div className="p-3 bg-blue-50 rounded-lg text-center">
                    <div className="text-2xl font-bold text-blue-600">{balanceResult.summary.newlyPaidCount}</div>
                    <div className="text-xs text-blue-700">Newly Paid</div>
                  </div>
                </div>

                {/* Newly Paid LRs */}
                {balanceResult.newlyPaid && balanceResult.newlyPaid.length > 0 && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-semibold text-green-900 flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4" />
                        Newly Paid LRs ({balanceResult.newlyPaid.length})
                      </h4>
                      {balanceResult.summary.markedCount > 0 ? (
                        <Badge className="bg-green-600 text-xs">
                          {balanceResult.summary.markedCount} marked as paid
                        </Badge>
                      ) : (
                        <Button
                          size="sm"
                          onClick={handleMarkPaid}
                          disabled={syncing}
                          className="bg-green-600 hover:bg-green-700 text-xs h-7"
                        >
                          {syncing ? (
                            <>
                              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                              Marking...
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="mr-1 h-3 w-3" />
                              Confirm &amp; Mark All Paid
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                    <div className="max-h-40 overflow-y-auto space-y-1">
                      {balanceResult.newlyPaid.map((lr, idx) => (
                        <div key={idx} className="text-xs bg-white p-2 rounded border border-green-100 flex justify-between items-center">
                          <div>
                            <span className="font-mono font-medium">{lr.lrNo}</span>
                            <span className="text-muted-foreground ml-2">{lr.invoiceDate}</span>
                          </div>
                          <div className="text-right">
                            <span className="font-medium">₹{lr.totalAmount.toLocaleString('en-IN')}</span>
                            {lr.tdsAmount > 0 && (
                              <span className="text-muted-foreground ml-1">(TDS: ₹{lr.tdsAmount})</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Already Paid */}
                {balanceResult.alreadyPaid && balanceResult.alreadyPaid.length > 0 && (
                  <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">
                      Already Marked as Paid ({balanceResult.alreadyPaid.length})
                    </h4>
                    <div className="max-h-32 overflow-y-auto space-y-1">
                      {balanceResult.alreadyPaid.map((lr, idx) => (
                        <div key={idx} className="text-xs bg-white p-2 rounded border flex justify-between">
                          <span className="font-mono">{lr.lrNo}</span>
                          <span className="text-muted-foreground">Marked: {lr.markedDate}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Unpaid LRs */}
                {balanceResult.unpaid && balanceResult.unpaid.length > 0 && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <h4 className="text-sm font-semibold text-red-900 mb-2 flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" />
                      Still Unpaid ({balanceResult.unpaid.length})
                    </h4>
                    <div className="max-h-40 overflow-y-auto space-y-1">
                      {balanceResult.unpaid.map((lr, idx) => (
                        <div key={idx} className="text-xs bg-white p-2 rounded border border-red-100 flex justify-between items-center">
                          <div>
                            <span className="font-mono font-medium">{lr.lrNo}</span>
                            <span className="text-muted-foreground ml-2">{lr.invoiceDate}</span>
                          </div>
                          <div className="text-right">
                            <span className="font-medium text-red-600">
                              Balance: ₹{lr.balanceAmount.toLocaleString('en-IN')}
                            </span>
                            <span className="text-muted-foreground ml-1">
                              / ₹{lr.totalAmount.toLocaleString('en-IN')}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Not in DB */}
                {balanceResult.notInDB && balanceResult.notInDB.length > 0 && (
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <h4 className="text-sm font-semibold text-yellow-900 mb-1">
                      Not Found in System ({balanceResult.notInDB.length})
                    </h4>
                    <p className="text-xs text-yellow-700 mb-2">
                      These LR numbers from the CSV don&apos;t match any records in the system.
                    </p>
                    <div className="max-h-24 overflow-y-auto">
                      <div className="flex flex-wrap gap-1">
                        {balanceResult.notInDB.map((lr, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {lr.lrNo} {lr.isPaid ? '(Paid)' : '(Unpaid)'}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Error */}
            {balanceResult && !balanceResult.success && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                  <p className="text-sm font-medium text-red-900">
                    {balanceResult.error || 'Failed to process CSV'}
                  </p>
                </div>
              </div>
            )}

            {/* How-to */}
            <div className="p-3 bg-muted rounded-lg">
              <h4 className="text-sm font-semibold mb-2">How it works:</h4>
              <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                <li>Export the invoice report from Oracle EBS as CSV</li>
                <li>Upload the CSV file here</li>
                <li>System checks the <strong>Balance Amount</strong> column for Standard invoices</li>
                <li>If Balance Amount = 0, the LR is marked as paid</li>
                <li><strong>Paid Date</strong> is taken from the <strong>Scheduled Payment Date</strong> column (your payment cycle date — e.g. Tue/Fri when the amount was paid)</li>
                <li>Credit Memo (TDS) rows are automatically detected and recorded</li>
                <li>Re-upload anytime to check for new payments — only changes are applied</li>
              </ol>
            </div>
          </div>

          <DialogFooter className="flex gap-2">
            {csvFile && balanceResult && (
              <Button onClick={handleResetUpload} variant="outline">
                Upload New File
              </Button>
            )}
            <Button
              onClick={handleCheckBalance}
              disabled={!csvFile || syncing}
            >
              {syncing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Checking...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Check Payments
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment History Dialog */}
      <Dialog open={showHistory} onOpenChange={setShowHistory}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Payment History - {selectedLR}</DialogTitle>
            <DialogDescription>
              View all payments for this LR
            </DialogDescription>
          </DialogHeader>
          {historySummary && (
            <div className="grid grid-cols-3 gap-4 p-4 bg-muted rounded-lg">
              <div>
                <div className="text-xs text-muted-foreground">Total Amount</div>
                <div className="text-lg font-semibold">
                  ₹{historySummary.totalAmount.toLocaleString('en-IN')}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Total Paid</div>
                <div className="text-lg font-semibold text-green-600">
                  ₹{historySummary.totalPaid.toLocaleString('en-IN')}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Outstanding</div>
                <div className="text-lg font-semibold text-red-600">
                  ₹{historySummary.outstanding.toLocaleString('en-IN')}
                </div>
              </div>
            </div>
          )}
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {paymentHistory.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No payment history found
              </div>
            ) : (
              paymentHistory.map((payment) => (
                <Card key={payment.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold">
                          ₹{Math.abs(payment.paymentAmount).toLocaleString('en-IN')}
                          {payment.paymentAmount < 0 && (
                            <Badge variant="outline" className="ml-2">Credit Memo</Badge>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {new Date(payment.paymentDate).toLocaleDateString()}
                        </div>
                        {payment.paymentMethod && (
                          <div className="text-xs text-muted-foreground">
                            Method: {payment.paymentMethod}
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <Badge variant={payment.status === 'verified' ? 'default' : 'secondary'}>
                          {payment.status}
                        </Badge>
                        <div className="text-xs text-muted-foreground mt-1">
                          {payment.source}
                        </div>
                      </div>
                    </div>
                    {payment.referenceNumber && (
                      <div className="mt-2 text-xs text-muted-foreground">
                        Reference: {payment.referenceNumber}
                      </div>
                    )}
                    {payment.notes && (
                      <div className="mt-1 text-xs text-muted-foreground">
                        {payment.notes}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

