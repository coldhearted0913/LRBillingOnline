'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, Save, Trash2, Truck, MapPin, Package, FileText, TrendingUp, Check } from 'lucide-react';
import { LRData } from '@/lib/database';
import { 
  LR_PREFIX, 
  FROM_LOCATIONS, 
  TO_LOCATIONS, 
  CONSIGNOR_LOCATIONS,
  CONSIGNEE_LOCATIONS,
  VEHICLE_AMOUNTS,
  LR_STATUS_OPTIONS,
  STATUS_COLORS
} from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

interface LRFormProps {
  editingLr: LRData | null;
  onBack: () => void;
}

export default function LRForm({ editingLr, onBack }: LRFormProps) {
  const [formData, setFormData] = useState<Partial<LRData>>({
    'FROM': '',
    'TO': '',
    'Consignor': '',
    'Consignee': '',
    'LR Date': new Date().toISOString().split('T')[0],
    'Vehicle Type': '',
    'Vehicle Number': '',
    'LR No': LR_PREFIX,
    'Koel Gate Entry No': '99',
    'Koel Gate Entry Date': '',
    'Weightslip No': '',
    'Loaded Weight': '',
    'Empty Weight': '',
    'Total No of Invoices': '',
    'Invoice No': '',
    'GRR No': '',
    'GRR Date': '',
    'Description of Goods': '',
    'Quantity': '',
    'status': 'LR Done',
  });
  
  const [selectedConsignors, setSelectedConsignors] = useState<string[]>([]);
  const [selectedConsignees, setSelectedConsignees] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Load editing data
  useEffect(() => {
    if (editingLr) {
      setFormData(editingLr);
      if (editingLr['Consignor']) {
        setSelectedConsignors(editingLr['Consignor'].split('/').map(c => c.trim()).filter(c => c));
      }
      if (editingLr['Consignee']) {
        setSelectedConsignees(editingLr['Consignee'].split('/').map(c => c.trim()).filter(c => c));
      }
    }
  }, [editingLr]);
  
  // Handle consignor selection
  const toggleConsignor = (consignor: string) => {
    const newConsignors = selectedConsignors.includes(consignor)
      ? selectedConsignors.filter(c => c !== consignor)
      : [...selectedConsignors, consignor];
    
    setSelectedConsignors(newConsignors);
    setFormData(prev => ({
      ...prev,
      'Consignor': newConsignors.join('/'),
    }));
  };

  // Handle consignee selection
  const toggleConsignee = (consignee: string) => {
    const newConsignees = selectedConsignees.includes(consignee)
      ? selectedConsignees.filter(c => c !== consignee)
      : [...selectedConsignees, consignee];
    
    setSelectedConsignees(newConsignees);
    setFormData(prev => ({
      ...prev,
      'Consignee': newConsignees.join('/'),
    }));
  };
  
  // Handle input change
  const handleChange = (field: keyof LRData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Sync Koel Gate Entry Date to GRR Date
    if (field === 'Koel Gate Entry Date' && !formData['GRR Date']) {
      setFormData(prev => ({ ...prev, 'GRR Date': value }));
    }
  };
  
  // Enforce LR prefix
  const handleLRNoChange = (value: string) => {
    if (!value.startsWith(LR_PREFIX)) {
      setFormData(prev => ({ ...prev, 'LR No': LR_PREFIX }));
    } else {
      setFormData(prev => ({ ...prev, 'LR No': value }));
    }
  };
  
  // Submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields and scroll to first invalid
    if (!formData['LR No'] || formData['LR No'] === LR_PREFIX) {
      alert('Please enter a valid LR Number');
      document.getElementById('lrNo')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      document.getElementById('lrNo')?.focus();
      return;
    }
    
    if (!formData['LR Date']) {
      alert('Please select LR Date');
      document.getElementById('lrDate')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      document.getElementById('lrDate')?.focus();
      return;
    }
    
    if (!formData['FROM']) {
      alert('Please select FROM location');
      document.getElementById('from')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      document.getElementById('from')?.focus();
      return;
    }
    
    if (!formData['TO']) {
      alert('Please select TO location');
      document.getElementById('to')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      document.getElementById('to')?.focus();
      return;
    }
    
    if (selectedConsignors.length === 0) {
      alert('Please select at least one Consignor');
      // Scroll to consignor section
      document.getElementById('consignor')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    
    if (selectedConsignees.length === 0) {
      alert('Please select at least one Consignee');
      // Scroll to consignee section
      document.getElementById('consignee')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    
    if (!formData['Vehicle Type']) {
      alert('Please select Vehicle Type');
      document.getElementById('vehicleType')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      document.getElementById('vehicleType')?.focus();
      return;
    }

    // Check if Consignor and Consignee are the same
    if (formData['Consignor'] && formData['Consignee'] && formData['Consignor'] === formData['Consignee']) {
      alert('Consignor and Consignee cannot be the same');
      document.getElementById('consignor')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    
    setLoading(true);
    
    try {
      const url = editingLr 
        ? `/api/lrs/${encodeURIComponent(editingLr['LR No'])}`
        : '/api/lrs';
      
      const method = editingLr ? 'PUT' : 'POST';
      
      // Format date for storage (dd-mm-yyyy)
      const submissionData = { ...formData };
      if (submissionData['LR Date']) {
        const date = new Date(submissionData['LR Date']);
        submissionData['LR Date'] = `${date.getDate().toString().padStart(2, '0')}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getFullYear()}`;
      }
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submissionData),
      });
      
      const data = await response.json();
      
      if (data.success) {
        alert(editingLr ? 'LR updated successfully!' : 'LR created successfully!');
        onBack();
      } else {
        alert(data.error || 'Failed to save LR');
      }
    } catch (error) {
      alert('Failed to save LR');
    } finally {
      setLoading(false);
    }
  };
  
  // Clear form
  const clearForm = () => {
    if (confirm('Are you sure you want to clear the form?')) {
      setFormData({
        'FROM': '',
        'TO': '',
        'Consignor': '',
        'Consignee': '',
        'LR Date': new Date().toISOString().split('T')[0],
        'Vehicle Type': '',
        'Vehicle Number': '',
        'LR No': LR_PREFIX,
        'Koel Gate Entry No': '99',
        'Koel Gate Entry Date': '',
        'Weightslip No': '',
        'Loaded Weight': '',
        'Empty Weight': '',
        'Total No of Invoices': '',
        'Invoice No': '',
        'GRR No': '',
        'GRR Date': '',
        'Description of Goods': '',
        'Quantity': '',
        'status': 'LR Done',
      });
      setSelectedConsignors([]);
      setSelectedConsignees([]);
    }
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800 text-white shadow-lg">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="bg-white/20 backdrop-blur-sm p-3 rounded-xl shadow-lg">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight">
                  {editingLr ? 'Edit LR' : 'Create New LR'}
                </h1>
                <p className="text-blue-100 text-sm mt-1">{editingLr ? 'Update LR details' : 'Enter LR information to get started'}</p>
              </div>
            </div>
            <Button 
              onClick={onBack} 
              variant="secondary"
              className="bg-white/20 hover:bg-white/30 text-white border-0"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
          </div>
        </div>
      </div>
      
      {/* Progress Indicator */}
      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">1</div>
              <span className="font-medium">Route</span>
            </div>
            <div className="h-1 flex-1 bg-gradient-to-r from-blue-600 to-blue-300"></div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">2</div>
              <span className="font-medium">Vehicle</span>
            </div>
            <div className="h-1 flex-1 bg-gradient-to-r from-blue-600 to-blue-300"></div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">3</div>
              <span className="font-medium">Cargo</span>
            </div>
            <div className="h-1 flex-1 bg-gradient-to-r from-blue-600 to-blue-300"></div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">4</div>
              <span className="font-medium">Details</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Form */}
      <div className="container mx-auto px-4 py-8">
        <form onSubmit={handleSubmit}>
          {/* Route Information */}
          <Card className="mb-6 border-0 shadow-md hover:shadow-lg transition-shadow duration-300 bg-white/80 backdrop-blur-sm">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-transparent pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <div className="bg-blue-600 text-white p-2 rounded-lg">
                  <MapPin className="h-4 w-4" />
                </div>
                Route Information
              </CardTitle>
              <CardDescription className="text-gray-600 mt-1">Select origin, destination, and parties</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="from">FROM</Label>
                  <select
                    id="from"
                    value={formData['FROM'] || ''}
                    onChange={(e) => handleChange('FROM', e.target.value)}
                    className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  >
                    <option value="">Select origin...</option>
                    {FROM_LOCATIONS.map(loc => (
                      <option key={loc} value={loc}>{loc}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <Label htmlFor="to">TO</Label>
                  <select
                    id="to"
                    value={formData['TO'] || ''}
                    onChange={(e) => handleChange('TO', e.target.value)}
                    className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  >
                    <option value="">Select destination...</option>
                    {TO_LOCATIONS.map(loc => (
                      <option key={loc} value={loc}>{loc}</option>
                    ))}
                  </select>
                </div>
                
                <div id="consignor">
                  <Label htmlFor="consignor">Consignor</Label>
                  <div className="flex flex-wrap gap-2 mb-3 mt-2">
                    {selectedConsignors.map(consignor => (
                      <Badge key={consignor} variant="default" className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all">
                        {consignor}
                        <button
                          type="button"
                          onClick={() => toggleConsignor(consignor)}
                          className="ml-2 text-white/80 hover:text-white font-bold"
                        >
                          ×
                        </button>
                      </Badge>
                    ))}
                    {selectedConsignors.length === 0 && (
                      <p className="text-sm text-gray-400 italic">No locations selected yet</p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {CONSIGNOR_LOCATIONS.map(consignor => (
                      <Button
                        key={consignor}
                        type="button"
                        onClick={() => toggleConsignor(consignor)}
                        variant={selectedConsignors.includes(consignor) ? "default" : "outline"}
                        size="sm"
                        className={`text-xs transition-all ${
                          selectedConsignors.includes(consignor)
                            ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-md'
                            : 'hover:border-blue-500 hover:text-blue-600'
                        }`}
                      >
                        {consignor}
                      </Button>
                    ))}
                  </div>
                </div>
                
                <div id="consignee">
                  <Label htmlFor="consignee">Consignee</Label>
                  <div className="flex flex-wrap gap-2 mb-3 mt-2">
                    {selectedConsignees.map(consignee => (
                      <Badge key={consignee} variant="default" className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white shadow-sm transition-all">
                        {consignee}
                        <button
                          type="button"
                          onClick={() => toggleConsignee(consignee)}
                          className="ml-2 text-white/80 hover:text-white font-bold"
                        >
                          ×
                        </button>
                      </Badge>
                    ))}
                    {selectedConsignees.length === 0 && (
                      <p className="text-sm text-gray-400 italic">No locations selected yet</p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {CONSIGNEE_LOCATIONS.map(consignee => (
                      <Button
                        key={consignee}
                        type="button"
                        onClick={() => toggleConsignee(consignee)}
                        variant={selectedConsignees.includes(consignee) ? "default" : "outline"}
                        size="sm"
                        className={`text-xs transition-all ${
                          selectedConsignees.includes(consignee)
                            ? 'bg-green-600 hover:bg-green-700 text-white shadow-md'
                            : 'hover:border-green-500 hover:text-green-600'
                        }`}
                      >
                        {consignee}
                      </Button>
                    ))}
                  </div>
                </div>
                
              </div>
            </CardContent>
          </Card>
          
          {/* Vehicle & LR Details */}
          <Card className="mb-6 border-0 shadow-md hover:shadow-lg transition-shadow duration-300 bg-white/80 backdrop-blur-sm">
            <CardHeader className="bg-gradient-to-r from-purple-50 to-transparent pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <div className="bg-purple-600 text-white p-2 rounded-lg">
                  <Truck className="h-4 w-4" />
                </div>
                Vehicle & LR Details
              </CardTitle>
              <CardDescription className="text-gray-600 mt-1">LR number and vehicle information</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="lrNo">LR No *</Label>
                  <Input
                    id="lrNo"
                    value={formData['LR No'] || LR_PREFIX}
                    onChange={(e) => handleLRNoChange(e.target.value)}
                    required
                    className="font-mono"
                  />
                </div>
                
                <div>
                  <Label htmlFor="lrDate">LR Date *</Label>
                  <Input
                    id="lrDate"
                    type="date"
                    value={formData['LR Date'] || ''}
                    onChange={(e) => handleChange('LR Date', e.target.value)}
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="vehicleType">Vehicle Type *</Label>
                  <select
                    id="vehicleType"
                    value={formData['Vehicle Type'] || ''}
                    onChange={(e) => handleChange('Vehicle Type', e.target.value)}
                    className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors"
                    required
                  >
                    <option value="">Select vehicle type...</option>
                    {Object.keys(VEHICLE_AMOUNTS).map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <Label htmlFor="vehicleNumber">Vehicle Number</Label>
                  <Input
                    id="vehicleNumber"
                    value={formData['Vehicle Number'] || ''}
                    onChange={(e) => handleChange('Vehicle Number', e.target.value.toUpperCase())}
                    placeholder="e.g., MH12AB1234"
                    className="border-gray-300 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Cargo Details */}
          <Card className="mb-6 border-0 shadow-md hover:shadow-lg transition-shadow duration-300 bg-white/80 backdrop-blur-sm">
            <CardHeader className="bg-gradient-to-r from-orange-50 to-transparent pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <div className="bg-orange-600 text-white p-2 rounded-lg">
                  <Package className="h-4 w-4" />
                </div>
                Cargo Details
              </CardTitle>
              <CardDescription className="text-gray-600 mt-1">Weight and goods information</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="loadedWeight">Loaded Weight (KG)</Label>
                  <Input
                    id="loadedWeight"
                    value={formData['Loaded Weight'] || ''}
                    onChange={(e) => handleChange('Loaded Weight', e.target.value)}
                    placeholder="e.g., 5000"
                  />
                </div>
                
                <div>
                  <Label htmlFor="emptyWeight">Empty Weight (KG)</Label>
                  <Input
                    id="emptyWeight"
                    value={formData['Empty Weight'] || ''}
                    onChange={(e) => handleChange('Empty Weight', e.target.value)}
                    placeholder="e.g., 2000"
                  />
                </div>
                
                <div>
                  <Label htmlFor="descriptionOfGoods">Description of Goods</Label>
                  <Input
                    id="descriptionOfGoods"
                    value={formData['Description of Goods'] || ''}
                    onChange={(e) => handleChange('Description of Goods', e.target.value)}
                    placeholder="e.g., Steel Rods, Cement Bags"
                  />
                </div>
                
                <div>
                  <Label htmlFor="quantity">Quantity</Label>
                  <Input
                    id="quantity"
                    value={formData['Quantity'] || ''}
                    onChange={(e) => handleChange('Quantity', e.target.value)}
                    placeholder="e.g., 1000, 50 bags"
                  />
                </div>
                
                <div>
                  <Label htmlFor="weightslipNo">Weightslip No</Label>
                  <Input
                    id="weightslipNo"
                    value={formData['Weightslip No'] || ''}
                    onChange={(e) => handleChange('Weightslip No', e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Status & Workflow */}
          <Card className="mb-6 border-t-4 border-t-blue-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-blue-600" />
                Workflow Status
              </CardTitle>
              <CardDescription>Track LR progress through workflow stages</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <Label htmlFor="status" className="mb-3 block">Current Status</Label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {LR_STATUS_OPTIONS.map((status) => {
                      const colors = STATUS_COLORS[status as keyof typeof STATUS_COLORS];
                      const isSelected = formData['status'] === status;
                      
                      return (
                        <button
                          key={status}
                          type="button"
                          onClick={() => handleChange('status' as keyof LRData, status)}
                          className={`
                            relative p-4 rounded-lg border-2 transition-all
                            ${isSelected 
                              ? `${colors.bg} ${colors.text} ${colors.border} shadow-md scale-105` 
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
                            <div className={`text-2xl mb-1 ${isSelected ? '' : 'opacity-50'}`}>
                              {status === 'LR Done' && '📄'}
                              {status === 'LR Collected' && '📦'}
                              {status === 'Bill Done' && '🧾'}
                              {status === 'Bill Submitted' && '✅'}
                            </div>
                            <div className={`text-xs font-semibold ${isSelected ? '' : 'text-gray-600'}`}>
                              {status}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-xs text-blue-800 flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      <span className="font-medium">Workflow:</span>
                      <span className="flex items-center gap-1">
                        📄 LR Done → 📦 LR Collected → 🧾 Bill Done → ✅ Bill Submitted
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Gate Entry & Documentation */}
          <Card className="mb-6 border-0 shadow-md hover:shadow-lg transition-shadow duration-300 bg-white/80 backdrop-blur-sm">
            <CardHeader className="bg-gradient-to-r from-red-50 to-transparent pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <div className="bg-red-600 text-white p-2 rounded-lg">
                  <FileText className="h-4 w-4" />
                </div>
                Gate Entry & Documentation
              </CardTitle>
              <CardDescription className="text-gray-600 mt-1">Entry passes and invoice details</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="koelGateEntry">Koel Gate Entry No</Label>
                  <Input
                    id="koelGateEntry"
                    value={formData['Koel Gate Entry No'] || '99'}
                    onChange={(e) => handleChange('Koel Gate Entry No', e.target.value)}
                  />
                </div>
                
                <div>
                  <Label htmlFor="koelGateDate">Koel Gate Entry Date</Label>
                  <Input
                    id="koelGateDate"
                    type="date"
                    value={formData['Koel Gate Entry Date'] || ''}
                    onChange={(e) => handleChange('Koel Gate Entry Date', e.target.value)}
                  />
                </div>
                
                <div>
                  <Label htmlFor="totalInvoices">Total No of Invoices</Label>
                  <Input
                    id="totalInvoices"
                    value={formData['Total No of Invoices'] || ''}
                    onChange={(e) => handleChange('Total No of Invoices', e.target.value)}
                  />
                </div>
                
                <div>
                  <Label htmlFor="invoiceNo">Invoice No</Label>
                  <Input
                    id="invoiceNo"
                    value={formData['Invoice No'] || ''}
                    onChange={(e) => handleChange('Invoice No', e.target.value)}
                  />
                </div>
                
                <div>
                  <Label htmlFor="grrNo">GRR No</Label>
                  <Input
                    id="grrNo"
                    value={formData['GRR No'] || ''}
                    onChange={(e) => handleChange('GRR No', e.target.value)}
                  />
                </div>
                
                <div>
                  <Label htmlFor="grrDate">GRR Date</Label>
                  <Input
                    id="grrDate"
                    type="date"
                    value={formData['GRR Date'] || ''}
                    onChange={(e) => handleChange('GRR Date', e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Action Buttons */}
          <Card className="border-0 shadow-md bg-gradient-to-r from-blue-50 to-purple-50">
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  type="submit"
                  disabled={loading}
                  size="lg"
                  className="w-full sm:w-auto sm:min-w-[150px] bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg hover:shadow-xl transition-all"
                >
                  <Save className="mr-2 h-5 w-5" />
                  {loading ? '⏳ Saving...' : editingLr ? '✏️ Update LR' : '💾 Save LR'}
                </Button>
                
                <Button
                  type="button"
                  onClick={clearForm}
                  variant="outline"
                  size="lg"
                  className="w-full sm:w-auto border-gray-300 hover:bg-red-50 hover:border-red-300 hover:text-red-600 transition-colors"
                >
                  <Trash2 className="mr-2 h-5 w-5" />
                  <span>Clear Form</span>
                </Button>
                
                <Button
                  type="button"
                  onClick={onBack}
                  variant="secondary"
                  size="lg"
                  className="w-full sm:w-auto sm:ml-auto bg-gray-200 hover:bg-gray-300 text-gray-800 transition-colors"
                >
                  <ArrowLeft className="mr-2 h-5 w-5" />
                  <span>Back to Dashboard</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      </div>
    </div>
  );
}
