'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, FileText, Truck, Calendar, MapPin, Hash, Save, Check } from 'lucide-react';
import { VEHICLE_AMOUNTS, FROM_LOCATIONS, TO_LOCATIONS, LR_PREFIX } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface ReworkBillFormProps {
  onBack: () => void;
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

export default function ReworkBillForm({ onBack }: ReworkBillFormProps) {
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

  // Load saved entries when billNo changes
  useEffect(() => {
    if (billNo) {
      loadSavedEntries();
    }
  }, [billNo]);

  const handleBillNoConfirm = () => {
    if (!tempBillNo.trim()) {
      alert('Please enter a bill number');
      return;
    }
    setBillNo('MT/25-26/' + tempBillNo);
    setShowBillNoModal(false);
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
        alert('Failed to save rework bill entry');
      }
    } catch (error) {
      console.error('Error saving rework bill entry:', error);
      alert('Error saving rework bill entry');
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
        alert('Failed to generate rework bill');
      }
    } catch (error) {
      console.error('Error generating rework bill:', error);
      alert('Error generating rework bill');
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50 to-slate-50">
      {/* Bill Number Modal */}
      {showBillNoModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
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
              <div className="flex gap-3">
                <Button
                  onClick={handleBillNoConfirm}
                  className="bg-orange-600 hover:bg-orange-700 text-white flex-1"
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
      )}

      {/* Header */}
      <div className="bg-gradient-to-r from-orange-600 to-orange-800 text-white py-6 shadow-lg">
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
              <h1 className="text-3xl md:text-4xl font-bold">Rework Bill - {billNo}</h1>
              <p className="text-orange-100 mt-1">Generate Rework Bill (80% of Vehicle Amount)</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-4xl mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-6 w-6 text-orange-600" />
              Rework Bill Details
            </CardTitle>
            <CardDescription>
              Enter the required information to generate a rework bill. Amount will be automatically calculated as 80% of the vehicle type amount.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Submission Date - Separate Section at Top */}
            <div className="mb-6 p-4 bg-orange-50 rounded-lg border border-orange-200">
              <div className="space-y-2">
                <Label htmlFor="submissionDate" className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-orange-600" />
                  Submission Date (For All Entries)
                </Label>
                <Input
                  id="submissionDate"
                  type="date"
                  value={submissionDate}
                  onChange={(e) => setSubmissionDate(e.target.value)}
                  required
                  className="border-orange-200 focus:border-orange-400 max-w-xs"
                />
                <p className="text-sm text-gray-600">
                  This date applies to all LR entries under Bill No: <span className="font-semibold text-orange-600">{billNo}</span>
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* LR Date */}
                <div className="space-y-2">
                  <Label htmlFor="lrDate" className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-orange-600" />
                    LR Date
                  </Label>
                  <Input
                    id="lrDate"
                    type="date"
                    value={formData['LR Date']}
                    onChange={(e) => handleInputChange('LR Date', e.target.value)}
                    required
                    className="border-orange-200 focus:border-orange-400"
                  />
                </div>

                {/* LR No */}
                <div className="space-y-2">
                  <Label htmlFor="lrNo" className="flex items-center gap-2">
                    <Hash className="h-4 w-4 text-orange-600" />
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
                      className="border-orange-200 rounded-l-none focus:border-orange-400"
                    />
                  </div>
                  <p className="text-xs text-orange-600">
                    Bill No: MT/25-26/{billNo} | Submission Date: {submissionDate}
                  </p>
                </div>

                {/* Vehicle No */}
                <div className="space-y-2">
                  <Label htmlFor="vehicleNo" className="flex items-center gap-2">
                    <Truck className="h-4 w-4 text-orange-600" />
                    Vehicle No
                  </Label>
                  <Input
                    id="vehicleNo"
                    type="text"
                    value={formData['Vehicle No']}
                    onChange={(e) => handleInputChange('Vehicle No', e.target.value)}
                    placeholder="Enter Vehicle Number"
                    required
                    className="border-orange-200 focus:border-orange-400"
                  />
                </div>

                {/* Vehicle Type */}
                <div className="space-y-2">
                  <Label htmlFor="vehicleType" className="flex items-center gap-2">
                    <Truck className="h-4 w-4 text-orange-600" />
                    Vehicle Type
                  </Label>
                  <select
                    id="vehicleType"
                    value={formData['Vehicle Type']}
                    onChange={(e) => handleInputChange('Vehicle Type', e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-orange-200 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400"
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
                    <MapPin className="h-4 w-4 text-orange-600" />
                    FROM
                  </Label>
                  <select
                    id="from"
                    value={formData['FROM']}
                    onChange={(e) => handleInputChange('FROM', e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-orange-200 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400"
                  >
                    <option value="">Select FROM Location</option>
                    {FROM_LOCATIONS.map(location => (
                      <option key={location} value={location}>{location}</option>
                    ))}
                  </select>
                </div>

                {/* TO */}
                <div className="space-y-2">
                  <Label htmlFor="to" className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-orange-600" />
                    TO
                  </Label>
                  <select
                    id="to"
                    value={formData['TO']}
                    onChange={(e) => handleInputChange('TO', e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-orange-200 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400"
                  >
                    <option value="">Select TO Location</option>
                    {TO_LOCATIONS.map(location => (
                      <option key={location} value={location}>{location}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Amount Display */}
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-orange-800">Calculated Amount (80% of Vehicle Type)</h3>
                    <p className="text-sm text-orange-600">
                      {formData['Vehicle Type'] ? 
                        `${VEHICLE_AMOUNTS[formData['Vehicle Type'] as keyof typeof VEHICLE_AMOUNTS]} × 0.8 = ${formData.Amount.toLocaleString()}` :
                        'Select a vehicle type to see calculation'
                      }
                    </p>
                  </div>
                  <div className="text-2xl font-bold text-orange-600">
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
                  className="border-orange-300 text-orange-600 hover:bg-orange-50"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={loading || !billNo || !submissionDate || !formData['LR Date'] || !formData['LR No'] || !formData['Vehicle No'] || !formData['Vehicle Type'] || !formData['FROM'] || !formData['TO']}
                  className="bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white shadow-lg hover:shadow-xl transition-all duration-200"
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
                <FileText className="h-6 w-6 text-orange-600" />
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
                    <tr className="bg-orange-50">
                      <th className="px-4 py-3 text-left text-xs font-medium text-orange-600 uppercase tracking-wider">LR No</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-orange-600 uppercase tracking-wider">LR Date</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-orange-600 uppercase tracking-wider">Vehicle No</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-orange-600 uppercase tracking-wider">Vehicle Type</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-orange-600 uppercase tracking-wider">FROM</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-orange-600 uppercase tracking-wider">TO</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-orange-600 uppercase tracking-wider">Amount</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-orange-600 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {savedEntries.length > 0 ? (
                      savedEntries.map((entry, index) => (
                        <tr key={index} className="hover:bg-orange-50">
                          <td className="px-4 py-4 font-medium text-gray-900">{entry['LR No']}</td>
                          <td className="px-4 py-4 text-sm text-gray-600">{entry['LR Date']}</td>
                          <td className="px-4 py-4 text-sm text-gray-600">{entry['Vehicle No']}</td>
                          <td className="px-4 py-4 text-sm text-gray-600">{entry['Vehicle Type']}</td>
                          <td className="px-4 py-4 text-sm text-gray-600">{entry['FROM']}</td>
                          <td className="px-4 py-4 text-sm text-gray-600">{entry['TO']}</td>
                          <td className="px-4 py-4 text-sm font-semibold text-orange-600">₹{entry['Amount']?.toLocaleString()}</td>
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
                    onClick={generateBill}
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
                      Generate Rework Bill ({savedEntries.length} entries)
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
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Rework Bill Generated Successfully!</h3>
            <div className="space-y-3">
              <p className="text-sm text-gray-600">
                File: <span className="font-mono text-orange-600">REWORK_BILL_MT_25-26_{billNo.replace('MT/25-26/', '').replace(/\//g, '_')}.xlsx</span>
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
                onClick={() => downloadFile(generatedFile.filePath, `REWORK_BILL_MT_25-26_${billNo.replace('MT/25-26/', '').replace(/\//g, '_')}.xlsx`)}
                className="bg-orange-600 hover:bg-orange-700 text-white"
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
