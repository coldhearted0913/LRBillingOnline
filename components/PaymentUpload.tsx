'use client';

import { useState, useRef } from 'react';
import { Upload, FileSpreadsheet, FileText, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import toast from 'react-hot-toast';

interface UploadResult {
  success: boolean;
  message?: string;
  stats?: {
    total: number;
    matched: number;
    unmatched: number;
    saved: number;
  };
  matched?: Array<{
    lrNo: string;
    amount: string;
    date: string;
    matchType: string;
    matchConfidence: number;
  }>;
  unmatched?: Array<{
    invoiceNo?: string;
    lrNo?: string;
    amount?: string;
    date?: string;
  }>;
  error?: string;
}

export function PaymentUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [showDateInput, setShowDateInput] = useState(false);
  const [paymentDate, setPaymentDate] = useState('');
  const [matchedCount, setMatchedCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      const fileName = selectedFile.name.toLowerCase();
      const isValid = fileName.endsWith('.csv') || fileName.endsWith('.xlsx') || fileName.endsWith('.xls');
      
      if (!isValid) {
        toast.error('Please select a CSV or Excel file (.csv, .xlsx, .xls)');
        return;
      }
      
      setFile(selectedFile);
      setResult(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error('Please select a file first');
      return;
    }

    // First, match records without saving
    setUploading(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('autoSave', 'false'); // Don't save yet, just match

      // Add timeout to prevent hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 minutes timeout

      const response = await fetch('/api/payments/upload-csv', {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success && data.stats?.matched > 0) {
        setResult(data);
        setMatchedCount(data.stats.matched);
        setShowDateInput(true);
        // Set default date to today
        const today = new Date().toISOString().split('T')[0];
        setPaymentDate(today);
        toast.success(`Found ${data.stats.matched} matching records. Please enter payment date.`);
      } else if (data.success && data.stats?.matched === 0) {
        setResult(data);
        toast('No payments matched. Please check your file.', { icon: '⚠️' });
      } else {
        setResult({ success: false, error: data.error || 'Upload failed' });
        toast.error(data.error || 'Failed to process file');
      }
    } catch (error: any) {
      const errorMessage = error.name === 'AbortError' 
        ? 'Request timed out. Please try again with a smaller file or check server logs.'
        : error.message || 'Unknown error occurred';
      setResult({ success: false, error: errorMessage });
      toast.error('Error uploading file: ' + errorMessage);
    } finally {
      setUploading(false);
    }
  };


  const handleSyncWithDate = async () => {
    if (!paymentDate) {
      toast.error('Please select a payment date');
      return;
    }

    if (!file) {
      toast.error('Please select a file first');
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('autoSave', 'true'); // Save this time
      formData.append('paymentDate', paymentDate); // Use user-provided date

      // Add timeout to prevent hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 minutes timeout

      const response = await fetch('/api/payments/upload-csv', {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        setResult(data);
        setShowDateInput(false);
        toast.success(`Successfully synced ${data.stats?.saved || 0} payments and updated status column`);
        
        // Refresh page after 2 seconds to show updated payment dates
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        setResult({ success: false, error: data.error || 'Sync failed' });
        toast.error(data.error || 'Failed to sync payments');
      }
    } catch (error: any) {
      const errorMessage = error.name === 'AbortError' 
        ? 'Request timed out. Please try again with a smaller file or check server logs.'
        : error.message || 'Unknown error occurred';
      setResult({ success: false, error: errorMessage });
      toast.error('Error syncing payments: ' + errorMessage);
    } finally {
      setUploading(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setResult(null);
    setShowDateInput(false);
    setPaymentDate('');
    setMatchedCount(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getFileIcon = () => {
    if (!file) return <Upload className="w-8 h-8" />;
    const fileName = file.name.toLowerCase();
    if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
      return <FileSpreadsheet className="w-8 h-8" />;
    }
    return <FileText className="w-8 h-8" />;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload Payment File</CardTitle>
        <CardDescription>
          Upload CSV or Excel file containing payment information. The system will automatically match Invoice No with LR No.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* File Input */}
        <div className="space-y-2">
          <label className="block text-sm font-medium">Select File</label>
          <div className="flex items-center gap-4">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileSelect}
              className="hidden"
              id="payment-file-input"
            />
            <label
              htmlFor="payment-file-input"
              className="flex items-center gap-2 px-4 py-2 border border-dashed rounded-lg cursor-pointer hover:bg-muted transition-colors"
            >
              {getFileIcon()}
              <span className="text-sm">
                {file ? file.name : 'Choose CSV or Excel file'}
              </span>
            </label>
            {file && (
              <Button variant="ghost" size="sm" onClick={handleReset}>
                Clear
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Supported formats: CSV (.csv), Excel (.xlsx, .xls)
          </p>
        </div>


        {/* Upload Button - Always match first, then ask for date */}
        {!showDateInput ? (
          <Button
            onClick={handleUpload}
            disabled={!file || uploading}
            className="w-full"
          >
            {uploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Matching Records...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Upload CSV and Match Records
              </>
            )}
          </Button>
        ) : (
          <div className="space-y-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div>
              <label className="block text-sm font-medium mb-2">
                Payment Date for {matchedCount} Matched Record(s)
              </label>
              <input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
                required
              />
              <p className="text-xs text-muted-foreground mt-1">
                This date will be set as the status column (non-editable) for all matched LRs
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleSyncWithDate}
                disabled={!paymentDate || uploading}
                className="flex-1"
              >
                {uploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Syncing...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Sync Records
                  </>
                )}
              </Button>
              <Button
                onClick={() => {
                  setShowDateInput(false);
                  setPaymentDate('');
                  setResult(null);
                }}
                variant="outline"
                disabled={uploading}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Results - Only show if date input is not visible */}
        {result && !showDateInput && (
          <div className="mt-4 space-y-4">
            {result.success ? (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <h3 className="font-semibold text-green-900">Processing Complete</h3>
                </div>
                {result.stats && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3">
                    <div>
                      <div className="text-xs text-muted-foreground">Total Records</div>
                      <div className="text-lg font-semibold">{result.stats.total}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Matched</div>
                      <div className="text-lg font-semibold text-green-600">{result.stats.matched}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Unmatched</div>
                      <div className="text-lg font-semibold text-orange-600">{result.stats.unmatched}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Saved</div>
                      <div className="text-lg font-semibold text-blue-600">{result.stats.saved}</div>
                    </div>
                  </div>
                )}

                {/* Matched Payments */}
                {result.matched && result.matched.length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-sm font-semibold mb-2">Matched Payments ({result.matched.length})</h4>
                    <div className="max-h-40 overflow-y-auto space-y-1">
                      {result.matched.slice(0, 10).map((match, idx) => (
                        <div key={idx} className="text-xs bg-white p-2 rounded border">
                          <span className="font-medium">{match.lrNo}</span> - ₹{match.amount} - {match.date}
                          <span className="ml-2 text-muted-foreground">({(match.matchConfidence * 100).toFixed(0)}% confidence)</span>
                        </div>
                      ))}
                      {result.matched.length > 10 && (
                        <div className="text-xs text-muted-foreground">... and {result.matched.length - 10} more</div>
                      )}
                    </div>
                  </div>
                )}

                {/* Unmatched Payments */}
                {result.unmatched && result.unmatched.length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-sm font-semibold mb-2 text-orange-600">
                      Unmatched Payments ({result.unmatched.length})
                    </h4>
                    <div className="max-h-40 overflow-y-auto space-y-1">
                      {result.unmatched.slice(0, 10).map((unmatch, idx) => (
                        <div key={idx} className="text-xs bg-white p-2 rounded border border-orange-200">
                          Invoice: {unmatch.invoiceNo || unmatch.lrNo || 'N/A'} - ₹{unmatch.amount || 'N/A'} - {unmatch.date || 'N/A'}
                        </div>
                      ))}
                      {result.unmatched.length > 10 && (
                        <div className="text-xs text-muted-foreground">... and {result.unmatched.length - 10} more</div>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      These payments could not be matched with any LR. Please check Invoice No format.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <XCircle className="w-5 h-5 text-red-600" />
                  <h3 className="font-semibold text-red-900">Error</h3>
                </div>
                <p className="text-sm text-red-700 mt-2">{result.error}</p>
              </div>
            )}
          </div>
        )}

        {/* Instructions */}
        <div className="mt-4 p-3 bg-muted rounded-lg">
          <h4 className="text-sm font-semibold mb-2">File Format Requirements:</h4>
          <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
            <li>File must contain <strong>Invoice No</strong> or <strong>LR No</strong> column</li>
            <li>Optional columns: Payment Date, Payment Amount, Bill Number</li>
            <li>First row should contain column headers</li>
            <li>Invoice No should match LR No format (e.g., MT/25-26/1109)</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

