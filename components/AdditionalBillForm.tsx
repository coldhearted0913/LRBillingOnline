'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { ArrowLeft, FileText, Truck, Calendar, MapPin, Hash, Save, Check, Download } from 'lucide-react';
import { VEHICLE_AMOUNTS, FROM_LOCATIONS, TO_LOCATIONS, ADDITIONAL_BILL_AMOUNTS, MATERIAL_SUPPLY_LOCATIONS, ADDITIONAL_BILL_FROM_LOCATIONS, ADDITIONAL_BILL_TO_LOCATIONS, LR_PREFIX } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface AdditionalBillFormProps {
  onBack: () => void;
  selectedLrs?: string[];
}

interface AdditionalBillData {
  'LR Date': string;
  'LR No': string;
  'Vehicle No': string;
  'Vehicle Type': string;
  'FROM': string;
  'Delivery Locations': string[];
  'Amount': number;
}

export default function AdditionalBillForm({ onBack, selectedLrs = [] }: AdditionalBillFormProps) {
  const session = useSession(); // Call hook at top level
  const [billNo, setBillNo] = useState('');
  const [submissionDate, setSubmissionDate] = useState('');
  const [showBillNoModal, setShowBillNoModal] = useState(true);
  const [tempBillNo, setTempBillNo] = useState('');
  const [formData, setFormData] = useState<AdditionalBillData>({
    'LR Date': '',
    'LR No': LR_PREFIX,
    'Vehicle No': '',
    'Vehicle Type': '',
    'FROM': '',
    'Delivery Locations': [],
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
      alert('Please enter a bill number');
      return;
    }
    if (!submissionDate) {
      alert('Please enter a submission date');
      return;
    }
    
    const fullBillNo = 'MT/25-26/' + tempBillNo;
    setBillNo(fullBillNo);
    setShowBillNoModal(false);
    
    // If we have selected LRs, auto-generate the bill
    if (selectedLrs.length > 0) {
      setAutoGenerateMode(true);
      await autoGenerateFromSelectedLrs(fullBillNo);
    }
  };

  const loadSavedEntries = async () => {
    try {
      console.log('Loading entries for billNo:', billNo);
      const response = await fetch(`/api/additional-bills/entries?billNo=${encodeURIComponent(billNo)}`);
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

  // Auto-generate Additional Bill from selected LRs
  const autoGenerateFromSelectedLrs = async (fullBillNo: string) => {
    if (selectedLrs.length === 0) return;
    
    setGenerating(true);
    try {
      console.log('[AUTO-GENERATE] Starting with selectedLrs:', selectedLrs);
      console.log('[AUTO-GENERATE] Using billNo:', fullBillNo);
      console.log('[AUTO-GENERATE] Using submissionDate:', submissionDate);
      
      // Fetch LR data for selected LRs
      const lrDataPromises = selectedLrs.map(async (lrNo) => {
        console.log('[AUTO-GENERATE] Fetching LR:', lrNo);
        const response = await fetch(`/api/lrs/${encodeURIComponent(lrNo)}`);
        if (response.ok) {
          const data = await response.json();
          console.log('[AUTO-GENERATE] Fetched LR data:', data.lr);
          return data.lr;
        } else {
          console.error('[AUTO-GENERATE] Failed to fetch LR:', lrNo, response.status);
          return null;
        }
      });
      
      const lrDataArray = await Promise.all(lrDataPromises);
      const validLrData = lrDataArray.filter(lr => lr !== null);
      
      console.log('[AUTO-GENERATE] Valid LR data:', validLrData);
      
      if (validLrData.length === 0) {
        alert('No valid LR data found');
        return;
      }
      
      // Convert LR data to Additional Bill format
      const additionalBillEntries = validLrData.map(lr => {
        // Extract consignees and convert to delivery locations
        const consignees = lr['Consignee'] ? lr['Consignee'].split('/').map((c: string) => c.trim()).filter((c: string) => c.length > 0) : [];
        
        // Calculate amount based on vehicle type and consignee count
        const vehicleType = lr['Vehicle Type'] || 'PICKUP';
        const baseAmount = ADDITIONAL_BILL_AMOUNTS[vehicleType as keyof typeof ADDITIONAL_BILL_AMOUNTS] || 1200;
        const amount = consignees.length >= 2 ? baseAmount * (consignees.length - 1) : 0;
        
        const entry = {
          'LR Date': lr['LR Date'] || '',
          'LR No': lr['LR No'] || '',
          'Vehicle No': lr['Vehicle Number'] || '',
          'Vehicle Type': vehicleType,
          'FROM': lr['FROM'] || '',
          'Delivery Locations': consignees,
          'Amount': amount,
          'Bill No': fullBillNo,
          'Submission Date': submissionDate,
          'Delivery Count': consignees.length,
        };
        
        console.log('[AUTO-GENERATE] Created entry:', entry);
        return entry;
      });
      
      console.log('[AUTO-GENERATE] All entries:', additionalBillEntries);
      
      // Generate the bill directly
      const response = await fetch('/api/additional-bills/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          submissionDate,
          billNo: fullBillNo,
          entries: additionalBillEntries,
        }),
      });

      console.log('[AUTO-GENERATE] API response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('[AUTO-GENERATE] Success response:', data);
        setGeneratedFile(data);
        setShowDownloadModal(true);
      } else {
        const errorText = await response.text();
        console.error('[AUTO-GENERATE] API error:', errorText);
        alert(`Failed to generate additional bill: ${errorText}`);
      }
    } catch (error) {
      console.error('[AUTO-GENERATE] Error:', error);
      alert(`Error generating additional bill: ${error.message}`);
    } finally {
      setGenerating(false);
    }
  };

  // Calculate additional bill amount based on vehicle type and delivery locations
  const calculateAmount = (vehicleType: string, deliveryLocations: string[]) => {
    if (deliveryLocations.length <= 1) {
      return 0; // No additional amount for 1 or 0 destinations
    }
    
    const baseAmount = ADDITIONAL_BILL_AMOUNTS[vehicleType as keyof typeof ADDITIONAL_BILL_AMOUNTS] || 0;
    // Formula: baseAmount × (number of destinations - 1)
    // 2 destinations = baseAmount × 1
    // 3 destinations = baseAmount × 2
    // 4 destinations = baseAmount × 3
    return baseAmount * (deliveryLocations.length - 1);
  };

  const handleInputChange = (field: keyof AdditionalBillData, value: string | number | string[]) => {
    const newData = { ...formData, [field]: value };
    
    // Auto-calculate amount when vehicle type or delivery locations change
    if (field === 'Vehicle Type' || field === 'Delivery Locations') {
      const vehicleType = field === 'Vehicle Type' ? value as string : formData['Vehicle Type'];
      const deliveryLocations = field === 'Delivery Locations' ? value as string[] : formData['Delivery Locations'];
      newData.Amount = calculateAmount(vehicleType, deliveryLocations);
    }
    
    setFormData(newData);
  };

  const handleDeliveryLocationChange = (location: string, checked: boolean) => {
    const currentLocations = formData['Delivery Locations'];
    let newLocations: string[];
    
    if (checked) {
      newLocations = [...currentLocations, location];
    } else {
      newLocations = currentLocations.filter(loc => loc !== location);
    }
    
    handleInputChange('Delivery Locations', newLocations);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate that at least 2 delivery locations are selected
    if (formData['Delivery Locations'].length <= 1) {
      alert('Error: At least 2 delivery destinations must be selected for additional billing. 1 destination is not allowed.');
      return;
    }
    
    setLoading(true);
    
    const dataToSave = {
      ...formData,
      'Bill No': billNo,
      'Submission Date': submissionDate,
      'Delivery Count': formData['Delivery Locations'].length,
    };
    
    console.log('[SAVE] Saving data:', dataToSave);
    console.log('[SAVE] Current billNo:', billNo);
    console.log('[SAVE] Current submissionDate:', submissionDate);
    
    try {
      const response = await fetch('/api/additional-bills/save', {
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
          'Delivery Locations': [],
          'Amount': 0,
        });
        
        // Reload saved entries immediately
        console.log('[RELOAD] Reloading entries for billNo:', billNo);
        
        // Force a fresh fetch
        try {
          const entriesResponse = await fetch(`/api/additional-bills/entries?billNo=${encodeURIComponent(billNo)}`);
          if (entriesResponse.ok) {
            const entriesData = await entriesResponse.json();
            console.log('[RELOAD] Fetched entries:', entriesData.entries);
            console.log('[RELOAD] Number of entries:', entriesData.entries?.length);
            setSavedEntries(entriesData.entries || []);
            alert(`Entry saved! Total entries: ${entriesData.entries?.length || 0}`);
          } else {
            console.error('[RELOAD] Failed to fetch entries');
            alert('Entry saved but failed to refresh list. Please refresh the page.');
          }
        } catch (reloadError) {
          console.error('[RELOAD] Error fetching entries:', reloadError);
          alert('Entry saved but failed to refresh list. Please refresh the page.');
        }
        
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      } else {
        const errorText = await response.text();
        console.error('Save failed:', errorText);
        alert('Failed to save additional bill entry');
      }
    } catch (error) {
      console.error('Error saving additional bill entry:', error);
      alert('Error saving additional bill entry');
    } finally {
      setLoading(false);
    }
  };

  const generateBill = async () => {
    if (savedEntries.length === 0) {
      alert('No entries to generate bill');
      return;
    }
    
    if (!submissionDate) {
      alert('Please enter a submission date');
      return;
    }

    setGenerating(true);
    try {
      const response = await fetch('/api/additional-bills/generate', {
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
        alert('Failed to generate additional bill');
      }
    } catch (error) {
      console.error('Error generating additional bill:', error);
      alert('Error generating additional bill');
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
        alert('Failed to download file');
      }
    } catch (error) {
      console.error('Error downloading file:', error);
      alert('Error downloading file');
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
      'Delivery Locations': entry['Delivery Locations'] || [],
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
      const response = await fetch('/api/additional-bills/delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          lrNo: `ADDITIONAL-${entry['LR No']}`,
          billNo,
        }),
      });

      if (response.ok) {
        alert('Entry deleted successfully!');
        // Reload saved entries
        loadSavedEntries();
      } else {
        alert('Failed to delete entry');
      }
    } catch (error) {
      console.error('Error deleting entry:', error);
      alert('Error deleting entry');
    }
  };

  // If auto-generating, show only loading modal or download modal
  if (autoGenerateMode) {
    // Show download modal if generation is complete
    if (showDownloadModal && generatedFile) {
      return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-green-100 p-3 rounded-lg">
                <Check className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-800">Additional Bill Generated!</h3>
                <p className="text-sm text-gray-600">Successfully processed {selectedLrs.length} LR(s)</p>
              </div>
            </div>
            <div className="space-y-4">
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-gray-700">
                  File saved: <code className="bg-green-100 px-1 rounded">{generatedFile.filePath}</code>
                </p>
              </div>
              <div className="flex gap-3">
                <Button
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = `/api/download-file?path=${encodeURIComponent(generatedFile.filePath)}`;
                    link.download = generatedFile.filePath.split(/[/\\]/).pop() || 'additional-bill.xlsx';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }}
                  className="bg-green-600 hover:bg-green-700 text-white flex-1"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download Bill
                </Button>
                <Button
                  onClick={() => {
                    setAutoGenerateMode(false);
                    setShowDownloadModal(false);
                    setGeneratedFile(null);
                    onBack();
                  }}
                  variant="outline"
                >
                  Done
                </Button>
              </div>
            </div>
          </div>
        </div>
      );
    }
    
    // Show loading modal while generating
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-purple-100 p-3 rounded-lg">
              <FileText className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-800">Generating Additional Bill</h3>
              <p className="text-sm text-gray-600">Processing {selectedLrs.length} selected LR(s)...</p>
            </div>
          </div>
          <div className="flex items-center justify-center py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-slate-50">
      {/* Bill Number Modal */}
      {showBillNoModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-purple-100 p-3 rounded-lg">
                <FileText className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-800">Additional Bill - Setup</h3>
                <p className="text-sm text-gray-600">
                  {selectedLrs.length > 0 
                    ? `Auto-generate from ${selectedLrs.length} selected LR(s)` 
                    : 'Enter bill number to continue'
                  }
                </p>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <Label htmlFor="billNoInput" className="flex items-center gap-2 mb-2">
                  <Hash className="h-4 w-4 text-purple-600" />
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
                    className="border-purple-200 rounded-l-none focus:border-purple-400"
                    onKeyPress={(e) => e.key === 'Enter' && handleBillNoConfirm()}
                    autoFocus
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="submissionDateInput" className="flex items-center gap-2 mb-2">
                  <Calendar className="h-4 w-4 text-purple-600" />
                  Submission Date
                </Label>
                <Input
                  id="submissionDateInput"
                  type="date"
                  value={submissionDate}
                  onChange={(e) => setSubmissionDate(e.target.value)}
                  className="border-purple-200 focus:border-purple-400"
                  required
                />
              </div>
              <div className="flex gap-3">
                <Button
                  onClick={handleBillNoConfirm}
                  disabled={!tempBillNo.trim() || !submissionDate}
                  className="bg-purple-600 hover:bg-purple-700 text-white flex-1 disabled:opacity-50"
                >
                  {selectedLrs.length > 0 ? 'Auto-Generate Bill' : 'Continue'}
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
      )}

      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-purple-800 text-white py-6 shadow-lg">
        <div className="container mx-auto px-4 flex items-center gap-4">
          <Button 
            onClick={onBack}
            variant="outline"
            className="bg-white/20 text-white border-white/30 hover:bg-white/30"
          >
            <ArrowLeft className="mr-2 h-5 w-5" />
            Back to Dashboard
          </Button>
          <div className="flex items-center gap-3">
            <div className="bg-white/20 backdrop-blur-sm p-3 rounded-lg">
              <FileText className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold">Additional Bill - {billNo}</h1>
              <p className="text-purple-100 mt-1">Generate Additional Bill (80% of Vehicle Amount)</p>
              {selectedLrs.length > 0 && (
                <p className="text-purple-200 text-sm mt-1">
                  Processing {selectedLrs.length} compatible LR(s) with 2+ consignees
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-4xl mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-6 w-6 text-purple-600" />
              Additional Bill Details
            </CardTitle>
            <CardDescription>
              Enter the required information to generate an additional bill. Amount will be automatically calculated as 80% of the vehicle type amount.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Submission Date - Separate Section at Top */}
            <div className="mb-6 p-4 bg-purple-50 rounded-lg border border-purple-200">
              <div className="space-y-2">
                <Label htmlFor="submissionDate" className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-purple-600" />
                  Submission Date (For All Entries)
                </Label>
                <Input
                  id="submissionDate"
                  type="date"
                  value={submissionDate}
                  onChange={(e) => setSubmissionDate(e.target.value)}
                  required
                  className="border-purple-200 focus:border-purple-400 max-w-xs"
                />
                <p className="text-sm text-gray-600">
                  This date applies to all LR entries under Bill No: <span className="font-semibold text-purple-600">{billNo}</span>
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* LR Date */}
                <div className="space-y-2">
                  <Label htmlFor="lrDate" className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-purple-600" />
                    LR Date
                  </Label>
                  <Input
                    id="lrDate"
                    type="date"
                    value={formData['LR Date']}
                    onChange={(e) => handleInputChange('LR Date', e.target.value)}
                    required
                    className="border-purple-200 focus:border-purple-400"
                  />
                </div>

                {/* LR No */}
                <div className="space-y-2">
                  <Label htmlFor="lrNo" className="flex items-center gap-2">
                    <Hash className="h-4 w-4 text-purple-600" />
                    LR No
                  </Label>
                  <div className="flex">
                    <div className="px-3 py-2 bg-gray-100 border border-gray-300 rounded-l-md text-gray-600 font-mono">
                      {LR_PREFIX}
                    </div>
                    <Input
                      id="lrNo"
                      type="text"
                      value={formData['LR No'].replace(LR_PREFIX, '')}
                      onChange={(e) => handleInputChange('LR No', LR_PREFIX + e.target.value)}
                      placeholder="Enter LR Number"
                      required
                      className="border-purple-200 rounded-l-none focus:border-purple-400"
                    />
                  </div>
                  <p className="text-xs text-purple-600">
                    Bill No: MT/25-26/{billNo} | Submission Date: {submissionDate}
                  </p>
                </div>

                {/* Vehicle No */}
                <div className="space-y-2">
                  <Label htmlFor="vehicleNo" className="flex items-center gap-2">
                    <Truck className="h-4 w-4 text-purple-600" />
                    Vehicle No
                  </Label>
                  <Input
                    id="vehicleNo"
                    type="text"
                    value={formData['Vehicle No']}
                    onChange={(e) => handleInputChange('Vehicle No', e.target.value)}
                    placeholder="Enter Vehicle Number"
                    required
                    className="border-purple-200 focus:border-purple-400"
                  />
                </div>

                {/* Vehicle Type */}
                <div className="space-y-2">
                  <Label htmlFor="vehicleType" className="flex items-center gap-2">
                    <Truck className="h-4 w-4 text-purple-600" />
                    Vehicle Type
                  </Label>
                  <select
                    id="vehicleType"
                    value={formData['Vehicle Type']}
                    onChange={(e) => handleInputChange('Vehicle Type', e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-purple-200 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-purple-400"
                  >
                    <option value="">Select Vehicle Type</option>
                    {Object.keys(VEHICLE_AMOUNTS).map(type => (
                      <option key={type} value={type}>
                        {type} (Base: ₹{VEHICLE_AMOUNTS[type as keyof typeof VEHICLE_AMOUNTS].toLocaleString()})
                      </option>
                    ))}
                  </select>
                </div>

                {/* FROM */}
                <div className="space-y-2">
                  <Label htmlFor="from" className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-purple-600" />
                    FROM
                  </Label>
                  <select
                    id="from"
                    value={formData['FROM']}
                    onChange={(e) => handleInputChange('FROM', e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-purple-200 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-purple-400"
                  >
                    <option value="">Select FROM Location</option>
                    {ADDITIONAL_BILL_FROM_LOCATIONS.map(location => (
                      <option key={location} value={location}>{location}</option>
                    ))}
                  </select>
                </div>


                {/* Delivery Locations */}
                <div className="space-y-2 col-span-2">
                  <Label className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-purple-600" />
                    Delivery Locations
                  </Label>
                  <div className="grid grid-cols-2 gap-3">
                    {MATERIAL_SUPPLY_LOCATIONS.map(location => (
                      <label key={location} className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData['Delivery Locations'].includes(location)}
                          onChange={(e) => handleDeliveryLocationChange(location, e.target.checked)}
                          className="rounded border-purple-300 text-purple-600 focus:ring-purple-500"
                        />
                        <span className="text-sm text-gray-700">{location}</span>
                      </label>
                    ))}
                  </div>
                    <p className="text-xs text-purple-600">
                      Selected: {formData['Delivery Locations'].length} location(s) - {formData['Delivery Locations'].join(', ') || 'None'}
                      {formData['Delivery Locations'].length === 1 && ' (Minimum 2 required)'}
                    </p>
                </div>
              </div>

              {/* Amount Display */}
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-purple-800">Calculated Additional Bill Amount</h3>
                    <p className="text-sm text-purple-600">
                      {formData['Vehicle Type'] && formData['Delivery Locations'].length > 1 ? 
                        `${ADDITIONAL_BILL_AMOUNTS[formData['Vehicle Type'] as keyof typeof ADDITIONAL_BILL_AMOUNTS]} × (${formData['Delivery Locations'].length} - 1) = ${formData.Amount.toLocaleString()}` :
                        formData['Delivery Locations'].length === 1 ? 
                          'Error: 1 destination not allowed - select at least 2 destinations' :
                          'Select vehicle type and at least 2 delivery locations to see calculation'
                      }
                    </p>
                    <p className="text-xs text-purple-500 mt-1">
                      Formula: Base Amount × (Destinations - 1) | Base amounts: PICKUP ₹1,200 | TRUCK ₹1,800 | TOROUS ₹2,400
                    </p>
                  </div>
                  <div className="text-2xl font-bold text-purple-600">
                    ₹{formData.Amount.toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex justify-end gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onBack}
                  className="border-purple-300 text-purple-600 hover:bg-purple-50"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={loading || !billNo || !submissionDate || !formData['LR Date'] || !formData['Vehicle No'] || !formData['Vehicle Type'] || !formData['FROM'] || formData['Delivery Locations'].length < 2}
                  className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Saving...
                    </>
                  ) : saved ? (
                    <>
                      <Check className="mr-2 h-5 w-5" />
                      Saved Successfully!
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-5 w-5" />
                      Save Entry
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Saved Entries Table */}
        <Card className="max-w-6xl mx-auto mt-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-6 w-6 text-purple-600" />
                Saved Entries ({savedEntries.length})
              </CardTitle>
              <CardDescription>
                All saved entries for Bill No: MT/25-26/{billNo} | Submission Date: {submissionDate}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-purple-50">
                      <th className="px-4 py-3 text-left text-xs font-medium text-purple-600 uppercase tracking-wider">LR No</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-purple-600 uppercase tracking-wider">LR Date</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-purple-600 uppercase tracking-wider">Vehicle No</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-purple-600 uppercase tracking-wider">Vehicle Type</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-purple-600 uppercase tracking-wider">FROM</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-purple-600 uppercase tracking-wider">Delivery Locations</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-purple-600 uppercase tracking-wider">Amount</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-purple-600 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {savedEntries.length > 0 ? (
                      savedEntries.map((entry, index) => (
                        <tr key={index} className="hover:bg-purple-50">
                          <td className="px-4 py-4 font-medium text-gray-900">{entry['LR No']}</td>
                          <td className="px-4 py-4 text-sm text-gray-600">{entry['LR Date']}</td>
                          <td className="px-4 py-4 text-sm text-gray-600">{entry['Vehicle No']}</td>
                          <td className="px-4 py-4 text-sm text-gray-600">{entry['Vehicle Type']}</td>
                          <td className="px-4 py-4 text-sm text-gray-600">{entry['FROM']}</td>
                          <td className="px-4 py-4 text-sm text-gray-600">{entry['Delivery Locations']?.join(', ') || 'N/A'}</td>
                          <td className="px-4 py-4 text-sm font-semibold text-purple-600">₹{entry['Amount']?.toLocaleString()}</td>
                          <td className="px-4 py-4 text-sm text-gray-600">
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEditEntry(entry)}
                                className="text-blue-600 border-blue-300 hover:bg-blue-50"
                              >
                                Edit
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDeleteEntry(entry)}
                                className="text-red-600 border-red-300 hover:bg-red-50"
                              >
                                Delete
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                          No entries saved yet. Fill the form above and click "Save Entry" to add LR entries.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              
              {/* Generate Bill Button */}
              <div className="mt-6">
                {(!submissionDate) && (
                  <p className="text-center text-red-600 mb-2 text-sm">
                    ⚠️ Please enter Submission Date at the top to enable bill generation
                  </p>
                )}
                {(savedEntries.length === 0) && submissionDate && (
                  <p className="text-center text-orange-600 mb-2 text-sm">
                    ⚠️ No entries saved yet. Save at least one LR entry above.
                  </p>
                )}
                <div className="flex justify-center">
                  <Button
                    onClick={() => {
                      console.log('[GENERATE] Button clicked');
                      console.log('[GENERATE] generating:', generating);
                      console.log('[GENERATE] savedEntries.length:', savedEntries.length);
                      console.log('[GENERATE] billNo:', billNo);
                      console.log('[GENERATE] submissionDate:', submissionDate);
                      generateBill();
                    }}
                    disabled={generating || savedEntries.length === 0 || !billNo || !submissionDate}
                    className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white shadow-lg hover:shadow-xl transition-all duration-200 px-8 py-3"
                  >
                  {generating ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Generating Bill...
                    </>
                  ) : (
                    <>
                      <FileText className="mr-2 h-5 w-5" />
                      Generate Additional Bill ({savedEntries.length} entries)
                    </>
                  )}
                </Button>
              </div>
              </div>
            </CardContent>
          </Card>
      </div>

      {/* Download Modal */}
      {showDownloadModal && generatedFile && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Additional Bill Generated Successfully!</h3>
            <div className="space-y-3">
              <p className="text-sm text-gray-600">
                File: <span className="font-mono text-purple-600">ADDITIONAL_BILL_MT_25-26_{billNo.replace('MT/25-26/', '').replace(/\//g, '_')}.xlsx</span>
              </p>
              <p className="text-sm text-gray-600">
                Entries Processed: {generatedFile.entriesProcessed}
              </p>
              {generatedFile.s3Url && (
                <p className="text-sm text-gray-600">
                  Uploaded to S3: <span className="text-green-600">✓ Success</span>
                </p>
              )}
            </div>
            <div className="flex gap-3 mt-6">
              <Button
                onClick={() => downloadFile(generatedFile.filePath, `ADDITIONAL_BILL_MT_25-26_${billNo.replace('MT/25-26/', '').replace(/\//g, '_')}.xlsx`)}
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                Download File
              </Button>
              <Button
                onClick={closeDownloadModal}
                variant="outline"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
