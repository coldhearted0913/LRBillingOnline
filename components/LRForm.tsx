'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, Save, Trash2, Truck, MapPin, Package, FileText, TrendingUp, Check } from 'lucide-react';
import { LRData } from '@/lib/database';
import { 
  LR_PREFIX, 
  FROM_LOCATIONS, 
  TO_LOCATIONS, 
  MATERIAL_SUPPLY_LOCATIONS,
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
    'Material Supply To': '',
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
  
  const [selectedMaterials, setSelectedMaterials] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Load editing data
  useEffect(() => {
    if (editingLr) {
      setFormData(editingLr);
      if (editingLr['Material Supply To']) {
        setSelectedMaterials(editingLr['Material Supply To'].split('/'));
      }
    }
  }, [editingLr]);
  
  // Handle material selection
  const toggleMaterial = (material: string) => {
    const newMaterials = selectedMaterials.includes(material)
      ? selectedMaterials.filter(m => m !== material)
      : [...selectedMaterials, material];
    
    setSelectedMaterials(newMaterials);
    setFormData(prev => ({
      ...prev,
      'Material Supply To': newMaterials.join('/'),
      'Koel Gate Entry No': newMaterials.includes('KOEL') ? '' : '99',
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
    
    // Validate
    if (!formData['LR No'] || formData['LR No'] === LR_PREFIX) {
      alert('Please enter a valid LR Number');
      return;
    }
    
    if (!formData['LR Date']) {
      alert('Please select LR Date');
      return;
    }
    
    if (!formData['Vehicle Type']) {
      alert('Please select Vehicle Type');
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
        'Material Supply To': '',
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
      setSelectedMaterials([]);
    }
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 backdrop-blur-sm p-2 rounded-lg">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold">
                  {editingLr ? 'Edit LR' : 'Create New LR'}
                </h1>
                <p className="text-blue-100 text-sm">{editingLr ? 'Update existing LR details' : 'Enter LR information'}</p>
              </div>
            </div>
            <Button onClick={onBack} variant="secondary">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </div>
        </div>
      </div>
      
      {/* Form */}
      <div className="container mx-auto px-4 py-8">
        <form onSubmit={handleSubmit}>
          {/* Route Information */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-blue-600" />
                Route Information
              </CardTitle>
              <CardDescription>Origin and destination details</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="from">FROM</Label>
                  <select
                    id="from"
                    value={formData['FROM'] || ''}
                    onChange={(e) => handleChange('FROM', e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
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
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">Select destination...</option>
                    {TO_LOCATIONS.map(loc => (
                      <option key={loc} value={loc}>{loc}</option>
                    ))}
                  </select>
                </div>
                
                <div className="md:col-span-2">
                  <Label>Material Supply To</Label>
                  <div className="flex flex-wrap gap-2 mb-3 mt-2">
                    {selectedMaterials.map(material => (
                      <Badge key={material} variant="default" className="px-3 py-1.5">
                        {material}
                        <button
                          type="button"
                          onClick={() => toggleMaterial(material)}
                          className="ml-2 text-white/80 hover:text-white"
                        >
                          ×
                        </button>
                      </Badge>
                    ))}
                    {selectedMaterials.length === 0 && (
                      <p className="text-sm text-muted-foreground">No locations selected</p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {MATERIAL_SUPPLY_LOCATIONS.map(material => (
                      <Button
                        key={material}
                        type="button"
                        onClick={() => toggleMaterial(material)}
                        variant={selectedMaterials.includes(material) ? "default" : "outline"}
                        size="sm"
                      >
                        {material}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Vehicle & LR Details */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5 text-blue-600" />
                Vehicle & LR Details
              </CardTitle>
              <CardDescription>LR number and vehicle information</CardDescription>
            </CardHeader>
            <CardContent>
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
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
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
                  />
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Cargo Details */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5 text-blue-600" />
                Cargo Details
              </CardTitle>
              <CardDescription>Weight and goods description</CardDescription>
            </CardHeader>
            <CardContent>
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
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-600" />
                Gate Entry & Documentation
              </CardTitle>
              <CardDescription>Entry passes and invoice details</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="koelGateEntry">Koel Gate Entry No</Label>
                  <Input
                    id="koelGateEntry"
                    value={formData['Koel Gate Entry No'] || '99'}
                    onChange={(e) => handleChange('Koel Gate Entry No', e.target.value)}
                    readOnly={!selectedMaterials.includes('KOEL')}
                    className={!selectedMaterials.includes('KOEL') ? 'bg-muted' : ''}
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
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-wrap gap-3">
                <Button
                  type="submit"
                  disabled={loading}
                  size="lg"
                  className="min-w-[150px]"
                >
                  <Save className="mr-2 h-5 w-5" />
                  {loading ? 'Saving...' : editingLr ? 'Update LR' : 'Save LR'}
                </Button>
                
                <Button
                  type="button"
                  onClick={clearForm}
                  variant="outline"
                  size="lg"
                >
                  <Trash2 className="mr-2 h-5 w-5" />
                  Clear Form
                </Button>
                
                <Button
                  type="button"
                  onClick={onBack}
                  variant="secondary"
                  size="lg"
                  className="ml-auto"
                >
                  <ArrowLeft className="mr-2 h-5 w-5" />
                  Back to Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      </div>
    </div>
  );
}
