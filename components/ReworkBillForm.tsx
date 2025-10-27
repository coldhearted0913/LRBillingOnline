'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import toast from 'react-hot-toast';
import { ArrowLeft, FileText, Truck, Calendar, MapPin, Hash, Save, Check, Download } from 'lucide-react';
import { VEHICLE_AMOUNTS, FROM_LOCATIONS, TO_LOCATIONS, LR_PREFIX } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface ReworkBillFormProps {
  onBack: () => void;
  selectedLrs?: string[];
}

interface ReworkBillData {
  'LR Date': string;
  'LR No': string;
  'Vehicle No': string;
  'Vehicle Type': string;
  'FROM': string;
  'TO': string;
  'Amount': number;
}

export default function ReworkBillForm({ onBack, selectedLrs = [] }: ReworkBillFormProps) {
  const session = useSession(); // Call hook at top level
  const [billNo, setBillNo] = useState('');
  const [submissionDate, setSubmissionDate] = useState('');
  const [showBillNoModal, setShowBillNoModal] = useState(true);
  const [tempBillNo, setTempBillNo] = useState('');
  const [formData, setFormData] = useState<ReworkBillData>({
    'LR Date': '',
    'LR No': LR_PREFIX,
    'Vehicle No': '',
    'Vehicle Type': '',
    'FROM': '',
    'TO': '',
    'Amount': 0,
  });
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [savedEntries, setSavedEntries] = useState<any[]>([]);
  const [generating, setGenerating] = useState(false);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [generatedFile, setGeneratedFile] = useState<any>(null);
  const [autoGenerateMode, setAutoGenerateMode] = useState(false);

  // Load saved entries when billNo changes
  useEffect(() => {
    if (billNo) {
      loadSavedEntries();
    }
  }, [billNo]);

  const handleBillNoConfirm = async () => {
    if (!tempBillNo.trim()) {
      toast.error('Please enter a bill number');
      return;
    }
    if (!submissionDate) {
      toast.error('Please enter a submission date');
      return;
    }
    
    const fullBillNo = 'MT/25-26/' + tempBillNo;
    
    // If we have selected LRs, set auto-generate mode BEFORE hiding modal
    if (selectedLrs.length > 0) {
      setAutoGenerateMode(true);
      setBillNo(fullBillNo);
      setShowBillNoModal(false);
      // Small delay to ensure state update is processed
      await new Promise(resolve => setTimeout(resolve, 50));
      await autoGenerateFromSelectedLrs(fullBillNo);
    } else {
      // No selected LRs, show manual form
      setBillNo(fullBillNo);
      setShowBillNoModal(false);
    }
  };

  const loadSavedEntries = async () => {
    try {
      console.log('Loading entries for billNo:', billNo);
      const response = await fetch(`/api/rework-bills/entries?billNo=${encodeURIComponent(billNo)}`);
      if (response.ok) {
        const data = await response.json();
        console.log('Loaded entries:', data.entries);
        setSavedEntries(data.entries || []);
      } else {
        console.error('Failed to load entries:', await response.text());
      }
    } catch (error) {
      console.error('Error loading saved entries:', error);
    }
  };

  // Auto-generate Rework Bill from selected LRs
  const autoGenerateFromSelectedLrs = async (fullBillNo: string) => {
    if (selectedLrs.length === 0) return;
    
    setGenerating(true);
    try {
      console.log('[REWORK-AUTO-GENERATE] Starting with selectedLrs:', selectedLrs);
      console.log('[REWORK-AUTO-GENERATE] Using billNo:', fullBillNo);
      console.log('[REWORK-AUTO-GENERATE] Using submissionDate:', submissionDate);
      
      // Fetch LR data for selected LRs
      const lrDataPromises = selectedLrs.map(async (lrNo) => {
        console.log('[REWORK-AUTO-GENERATE] Fetching LR:', lrNo);
        const response = await fetch(`/api/lrs/${encodeURIComponent(lrNo)}`);
        if (response.ok) {
          const data = await response.json();
          console.log('[REWORK-AUTO-GENERATE] Fetched LR data:', data.lr);
          return data.lr;
        } else {
          console.error('[REWORK-AUTO-GENERATE] Failed to fetch LR:', lrNo, response.status);
          return null;
        }
      });
      
      const lrDataArray = await Promise.all(lrDataPromises);
      const validLrData = lrDataArray.filter(lr => lr !== null);
      
      console.log('[REWORK-AUTO-GENERATE] Valid LR data:', validLrData);
      
      if (validLrData.length === 0) {
        toast.error('No valid LR data found');
        return;
      }
      
      // Convert LR data to Rework Bill format
      const reworkBillEntries = validLrData.map(lr => {
        // Calculate 80% of vehicle type amount for rework
        const vehicleType = lr['Vehicle Type'] || 'PICKUP';
        const baseAmount = VEHICLE_AMOUNTS[vehicleType as keyof typeof VEHICLE_AMOUNTS] || 0;
        const amount = Math.round(baseAmount * 0.8);
        
        const entry = {
          'LR Date': lr['LR Date'] || '',
          'LR No': lr['LR No'] || '',
          'Vehicle No': lr['Vehicle Number'] || '',
          'Vehicle Type': vehicleType,
          'FROM': lr['FROM'] || '',
          'TO': lr['TO'] || '',
          'Amount': amount,
          'Bill No': fullBillNo,
          'Submission Date': submissionDate,
        };
        
        console.log('[REWORK-AUTO-GENERATE] Created entry:', entry);
        return entry;
      });
      
      console.log('[REWORK-AUTO-GENERATE] All entries:', reworkBillEntries);
      
      // Generate the bill directly
      const response = await fetch('/api/rework-bills/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          submissionDate,
          billNo: fullBillNo,
          entries: reworkBillEntries,
        }),
      });

      console.log('[REWORK-AUTO-GENERATE] API response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('[REWORK-AUTO-GENERATE] Success response:', data);
        setGeneratedFile(data);
        setShowDownloadModal(true);
      } else {
        const errorText = await response.text();
        console.error('[REWORK-AUTO-GENERATE] API error:', errorText);
        toast.error(`Failed to generate rework bill: ${errorText}`);
      }
    } catch (error) {
      console.error('[REWORK-AUTO-GENERATE] Error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Error generating rework bill: ${errorMessage}`);
    } finally {
      setGenerating(false);
    }
  };

  // Calculate 80% of vehicle type amount
  const calculateAmount = (vehicleType: string) => {
    const baseAmount = VEHICLE_AMOUNTS[vehicleType as keyof typeof VEHICLE_AMOUNTS] || 0;
    return Math.round(baseAmount * 0.8);
  };

  const handleInputChange = (field: keyof ReworkBillData, value: string) => {
    const newData = { ...formData, [field]: value };
    
    // Auto-calculate amount when vehicle type changes
    if (field === 'Vehicle Type') {
      newData.Amount = calculateAmount(value);
    }
    
    setFormData(newData);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    const dataToSave = {
      ...formData,
      'Bill No': billNo,
      'Submission Date': submissionDate,
    };
    
    console.log('[SAVE] Saving data:', dataToSave);
    console.log('[SAVE] Current billNo:', billNo);
    console.log('[SAVE] Current submissionDate:', submissionDate);
    
    try {
      const response = await fetch('/api/rework-bills/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataToSave),
      });

      if (response.ok) {
        const saveResult = await response.json();
        console.log('[SAVE] Entry saved successfully:', saveResult);
        
        // Reset form after successful save
        setFormData({
          'LR Date': '',
          'LR No': LR_PREFIX,
          'Vehicle No': '',
          'Vehicle Type': '',
          'FROM': '',
          'TO': '',
          'Amount': 0,
        });
        
        // Reload saved entries immediately
        console.log('[RELOAD] Reloading entries for billNo:', billNo);
        
        // Force a fresh fetch
        try {
          const entriesResponse = await fetch(`/api/rework-bills/entries?billNo=${encodeURIComponent(billNo)}`);
          if (entriesResponse.ok) {
            const entriesData = await entriesResponse.json();
            console.log('[RELOAD] Fetched entries:', entriesData.entries);
            console.log('[RELOAD] Number of entries:', entriesData.entries?.length);
            setSavedEntries(entriesData.entries || []);
            toast.success(`Entry saved! Total entries: ${entriesData.entries?.length || 0}`);
          } else {
            console.error('[RELOAD] Failed to fetch entries');
            toast.error('Entry saved but failed to refresh list. Please refresh the page.');
          }
        } catch (reloadError) {
          console.error('[RELOAD] Error fetching entries:', reloadError);
          toast.error('Entry saved but failed to refresh list. Please refresh the page.');
        }
        
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      } else {
        const errorText = await response.text();
        console.error('Save failed:', errorText);
        toast.error('Failed to save rework bill entry');
      }
    } catch (error) {
      console.error('Error saving rework bill entry:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Error saving rework bill entry: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const generateBill = async () => {
    if (savedEntries.length === 0) {
      toast.error('No entries to generate bill');
      return;
    }
    
    if (!submissionDate) {
      toast.error('Please enter a submission date');
      return;
    }

    setGenerating(true);
    try {
      const response = await fetch('/api/rework-bills/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          submissionDate,
          billNo,
          entries: savedEntries,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setGeneratedFile(data);
        setShowDownloadModal(true);
      } else {
        toast.error('Failed to generate rework bill');
      }
    } catch (error) {
      console.error('Error generating rework bill:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Error generating rework bill: ${errorMessage}`);
    } finally {
      setGenerating(false);
    }
  };

  const downloadFile = async (filePath: string, fileName: string) => {
    try {
      const response = await fetch(`/api/download-file?path=${encodeURIComponent(filePath)}`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        toast.error('Failed to download file');
      }
    } catch (error) {
      console.error('Error downloading file:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Error downloading file: ${errorMessage}`);
    }
  };

  const closeDownloadModal = () => {
    setShowDownloadModal(false);
    setGeneratedFile(null);
    onBack();
  };

  const handleEditEntry = (entry: any) => {
    // Populate the form with the selected entry data
    setFormData({
      'LR Date': entry['LR Date'],
      'LR No': entry['LR No'],
      'Vehicle No': entry['Vehicle No'],
      'Vehicle Type': entry['Vehicle Type'],
      'FROM': entry['FROM'],
      'TO': entry['TO'],
      'Amount': entry['Amount'] || 0,
    });
    
    // Scroll to the form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteEntry = async (entry: any) => {
    if (!confirm(`Are you sure you want to delete LR No: ${entry['LR No']}?`)) {
      return;
    }

    try {
      const response = await fetch('/api/rework-bills/delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          lrNo: `REWORK-${entry['LR No']}`,
          billNo,
        }),
      });

      if (response.ok) {
        toast.success('Entry deleted successfully!');
        // Reload saved entries
        loadSavedEntries();
      } else {
        toast.error('Failed to delete entry');
      }
    } catch (error) {
      console.error('Error deleting entry:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Error deleting entry: ${errorMessage}`);
    }
  };

  // If auto-generating, show only loading modal or download modal
  if (autoGenerateMode) {
    // Show download modal if generation is complete
    if (showDownloadModal && generatedFile) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50 to-slate-50 flex items-center justify-center p-4">
          <Card className="max-w-2xl w-full">
            <CardHeader className="bg-green-50 border-b border-green-200">
              <div className="flex items-center gap-3">
                <div className="bg-green-500 p-3 rounded-full">
                  <Check className="w-8 h-8 text-white" />
                </div>
                <div>
                  <CardTitle className="text-2xl text-green-700">Rework Bill Generated Successfully!</CardTitle>
                  <CardDescription className="text-green-600 mt-1">Your rework bill is ready for download</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-gray-700">
                    File saved in: <code className="bg-green-100 px-2 py-1 rounded">{generatedFile.filePath}</code>
                  </p>
                </div>
                <Button
                  onClick={async () => {
                    await downloadFile(generatedFile.filePath, generatedFile.filePath.split(/[/\\]/).pop() || 'rework-bill.xlsx');
                    toast.success('Rework bill generated successfully!');
                  }}
                  className="w-full bg-green-600 hover:bg-green-700 text-white"
                  size="lg"
                >
                  <Download className="mr-2 h-5 w-5" />
                  Download Rework Bill
                </Button>
                <Button
                  onClick={onBack}
                  variant="outline"
                  className="w-full"
                >
                  Back to Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }
    
    // Show loading modal while generating
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50 to-slate-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
              Generating Rework Bill...
            </CardTitle>
            <CardDescription>
              Please wait while we generate your rework bill from selected LRs
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // Show bill number modal (auto-generates when Continue is clicked)
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50 to-slate-50 flex items-center justify-center p-4">
      {/* Bill Number Modal */}
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-orange-100 p-3 rounded-lg">
                <FileText className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-800">Rework Bill - Setup</h3>
                <p className="text-sm text-gray-600">Enter bill number to continue</p>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <Label htmlFor="billNoInput" className="flex items-center gap-2 mb-2">
                  <Hash className="h-4 w-4 text-orange-600" />
                  Bill Number
                </Label>
                <div className="flex">
                  <div className="px-3 py-2 bg-gray-100 border border-gray-300 rounded-l-md text-gray-600 font-mono">
                    MT/25-26/
                  </div>
                  <Input
                    id="billNoInput"
                    type="text"
                    value={tempBillNo}
                    onChange={(e) => setTempBillNo(e.target.value)}
                    placeholder="Enter Bill Number"
                    className="border-orange-200 rounded-l-none focus:border-orange-400"
                    onKeyPress={(e) => e.key === 'Enter' && handleBillNoConfirm()}
                    autoFocus
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="submissionDateInput" className="flex items-center gap-2 mb-2">
                  <Calendar className="h-4 w-4 text-orange-600" />
                  Submission Date
                </Label>
                <Input
                  id="submissionDateInput"
                  type="date"
                  value={submissionDate}
                  onChange={(e) => setSubmissionDate(e.target.value)}
                  className="border-orange-200 focus:border-orange-400"
                  required
                />
              </div>
              <div className="flex gap-3">
                <Button
                  onClick={handleBillNoConfirm}
                  className="bg-orange-600 hover:bg-orange-700 text-white flex-1"
                  disabled={!tempBillNo || !submissionDate}
                >
                  Continue
                </Button>
                <Button
                  onClick={onBack}
                  variant="outline"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
    </div>
  );
}
