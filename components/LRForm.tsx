'use client';

import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Save, Trash2, Truck, MapPin, Package, FileText, TrendingUp, Check, Plus, X } from 'lucide-react';
import toast from 'react-hot-toast';
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
  const [hasKOEL, setHasKOEL] = useState(false);
  const koelGateEntryManuallyEdited = useRef(false);
  const [availableVehicles, setAvailableVehicles] = useState<string[]>([]);
  const [showAddVehicle, setShowAddVehicle] = useState(false);
  const [newVehicleNumber, setNewVehicleNumber] = useState('');
  const [availableDescriptions, setAvailableDescriptions] = useState<string[]>([]);
  const [selectedDescriptions, setSelectedDescriptions] = useState<Array<{ description: string; quantity: string }>>([]);
  const [showAddDescription, setShowAddDescription] = useState(false);
  const [newDescription, setNewDescription] = useState('');
  const [recentUploads, setRecentUploads] = useState<Array<{ url: string; name: string; type: string }>>([]);
  
  // Helper function to convert dd-mm-yyyy to yyyy-mm-dd
  const convertDateToInputFormat = (dateStr: string): string => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const [day, month, year] = parts;
      return `${year}-${month}-${day}`;
    }
    return dateStr;
  };
  
  // Load editing data
  useEffect(() => {
    if (editingLr) {
      console.log('[LRForm] Loading editing data:', editingLr);
      const editedData = { ...editingLr };
      // Convert LR Date from dd-mm-yyyy to yyyy-mm-dd for date input
      if (editedData['LR Date']) {
        editedData['LR Date'] = convertDateToInputFormat(editedData['LR Date']);
      }
      setFormData(editedData);
      if (editedData['Consignor']) {
        setSelectedConsignors(editedData['Consignor'].split('/').map(c => c.trim()).filter(c => c));
      }
      if (editedData['Consignee']) {
        setSelectedConsignees(editedData['Consignee'].split('/').map(c => c.trim()).filter(c => c));
      }
      
      // Parse descriptions and quantities
      console.log('[LRForm] Description of Goods:', editedData['Description of Goods']);
      console.log('[LRForm] Quantity:', editedData['Quantity']);
      
      if (editedData['Description of Goods'] && editedData['Quantity']) {
        const descriptionsText = editedData['Description of Goods'];
        const quantitiesText = editedData['Quantity'];
        
        console.log('[LRForm] Parsing descriptions:', descriptionsText);
        console.log('[LRForm] Parsing quantities:', quantitiesText);
        
        // Split by comma to get individual items
        const descriptionParts = descriptionsText.split(',').map(s => s.trim());
        const quantityParts = quantitiesText.split(',').map(s => s.trim());
        
        console.log('[LRForm] Description parts:', descriptionParts);
        console.log('[LRForm] Quantity parts:', quantityParts);
        
        const parsedDescriptions = descriptionParts.map((desc, index) => {
          // Try to extract description and quantity from format "Description: Quantity"
          const colonIndex = desc.indexOf(':');
          if (colonIndex !== -1) {
            const descriptionPart = desc.substring(0, colonIndex).trim();
            const quantityPart = desc.substring(colonIndex + 1).trim();
            console.log('[LRForm] Parsed item:', { description: descriptionPart, quantity: quantityPart });
            return { description: descriptionPart, quantity: quantityPart };
          } else {
            // If no colon, use quantity from the Quantity field
            console.log('[LRForm] No colon, using separate quantity:', { description: desc, quantity: quantityParts[index] || '' });
            return { description: desc, quantity: quantityParts[index] || '' };
          }
        });
        
        console.log('[LRForm] Setting selected descriptions:', parsedDescriptions);
        setSelectedDescriptions(parsedDescriptions);
      } else {
        console.log('[LRForm] No descriptions or quantities to parse');
        setSelectedDescriptions([]);
      }
      
      // Reset the manual edit flag when loading new editing data
      koelGateEntryManuallyEdited.current = false;
    }
  }, [editingLr]);
  
  // Auto-update Koel Gate Entry No based on consignor/consignee
  useEffect(() => {
    const hasKOELFlag = 
      formData['Consignor']?.toUpperCase().includes('KOEL') || 
      formData['Consignee']?.toUpperCase().includes('KOEL') || false;
    
    setHasKOEL(!!hasKOELFlag);
    
    // Only auto-update if the user hasn't manually edited the field
    if (!koelGateEntryManuallyEdited.current) {
      if (hasKOELFlag) {
        // If has KOEL (consignor or consignee), clear the field for user input
        if (formData['Koel Gate Entry No'] === '99') {
          setFormData(prev => ({ ...prev, 'Koel Gate Entry No': '' }));
        }
      } else {
        // If no KOEL, set to 99 and make it non-editable
        if (formData['Koel Gate Entry No'] !== '99') {
          setFormData(prev => ({ ...prev, 'Koel Gate Entry No': '99' }));
        }
      }
    }
  }, [formData['Consignor'], formData['Consignee']]);
  
  // Fetch vehicles when vehicle type changes
  useEffect(() => {
    const fetchVehicles = async () => {
      if (formData['Vehicle Type']) {
        try {
          const response = await fetch(`/api/vehicles?vehicleType=${formData['Vehicle Type']}`);
          if (response.ok) {
            const data = await response.json();
            setAvailableVehicles(data.vehicles || []);
          }
        } catch (error) {
          console.error('Error fetching vehicles:', error);
        }
      } else {
        setAvailableVehicles([]);
      }
    };
    
    fetchVehicles();
  }, [formData['Vehicle Type']]);
  
  // Add new vehicle
  const handleAddVehicle = async () => {
    if (!newVehicleNumber.trim()) {
      toast.error('Please enter a vehicle number');
      return;
    }
    
    if (!formData['Vehicle Type']) {
      toast.error('Please select a vehicle type first');
      return;
    }
    
    try {
      const response = await fetch('/api/vehicles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehicleNumber: newVehicleNumber.trim(),
          vehicleType: formData['Vehicle Type'],
        }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        toast.success('Vehicle added successfully');
        setAvailableVehicles([...availableVehicles, newVehicleNumber.trim().toUpperCase()]);
        setFormData(prev => ({ ...prev, 'Vehicle Number': newVehicleNumber.trim().toUpperCase() }));
        setNewVehicleNumber('');
        setShowAddVehicle(false);
      } else {
        toast.error(data.error || 'Failed to add vehicle');
      }
    } catch (error) {
      console.error('Error adding vehicle:', error);
      toast.error('Failed to add vehicle');
    }
  };
  
  // Delete vehicle
  const handleDeleteVehicle = async (vehicleNumber: string) => {
    if (!confirm(`Are you sure you want to delete vehicle ${vehicleNumber}?`)) {
      return;
    }
    
    try {
      const response = await fetch(
        `/api/vehicles?vehicleNumber=${vehicleNumber}&vehicleType=${formData['Vehicle Type']}`,
        { method: 'DELETE' }
      );
      
      const data = await response.json();
      
      if (response.ok) {
        toast.success('Vehicle deleted successfully');
        setAvailableVehicles(availableVehicles.filter(v => v !== vehicleNumber));
        if (formData['Vehicle Number'] === vehicleNumber) {
          setFormData(prev => ({ ...prev, 'Vehicle Number': '' }));
        }
      } else {
        toast.error(data.error || 'Failed to delete vehicle');
      }
    } catch (error) {
      console.error('Error deleting vehicle:', error);
      toast.error('Failed to delete vehicle');
    }
  };
  
  // Fetch descriptions on component mount
  useEffect(() => {
    const fetchDescriptions = async () => {
      try {
        const response = await fetch('/api/descriptions');
        if (response.ok) {
          const data = await response.json();
          setAvailableDescriptions(data.descriptions || []);
        }
      } catch (error) {
        console.error('Error fetching descriptions:', error);
      }
    };
    
    fetchDescriptions();
  }, []);
  
  // Add new description
  const handleAddDescription = async () => {
    if (!newDescription.trim()) {
      toast.error('Please enter a description');
      return;
    }
    
    try {
      const response = await fetch('/api/descriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: newDescription.trim() }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        toast.success('Description added successfully');
        setAvailableDescriptions([...availableDescriptions, newDescription.trim()]);
        setNewDescription('');
        setShowAddDescription(false);
      } else {
        toast.error(data.error || 'Failed to add description');
      }
    } catch (error) {
      console.error('Error adding description:', error);
      toast.error('Failed to add description');
    }
  };
  
  // Delete description
  const handleDeleteDescription = async (description: string) => {
    if (!confirm(`Are you sure you want to delete "${description}"?`)) {
      return;
    }
    
    try {
      const response = await fetch(`/api/descriptions?description=${encodeURIComponent(description)}`, {
        method: 'DELETE'
      });
      
      const data = await response.json();
      
      if (response.ok) {
        toast.success('Description deleted successfully');
        setAvailableDescriptions(availableDescriptions.filter(d => d !== description));
        setSelectedDescriptions(selectedDescriptions.filter(d => d.description !== description));
      } else {
        toast.error(data.error || 'Failed to delete description');
      }
    } catch (error) {
      console.error('Error deleting description:', error);
      toast.error('Failed to delete description');
    }
  };
  
  // Add description to selected list
  const handleSelectDescription = (description: string) => {
    if (!selectedDescriptions.find(d => d.description === description)) {
      setSelectedDescriptions([...selectedDescriptions, { description, quantity: '' }]);
    }
  };
  
  // Remove description from selected list
  const handleRemoveDescription = (description: string) => {
    setSelectedDescriptions(selectedDescriptions.filter(d => d.description !== description));
  };
  
  // Update quantity for a description
  const handleUpdateQuantity = (description: string, quantity: string) => {
    setSelectedDescriptions(selectedDescriptions.map(d => 
      d.description === description ? { ...d, quantity } : d
    ));
  };
  
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
    
    // Track manual edits to Koel Gate Entry No
    if (field === 'Koel Gate Entry No') {
      koelGateEntryManuallyEdited.current = true;
    }
    
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
      toast.error('Please enter a valid LR Number');
      document.getElementById('lrNo')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      document.getElementById('lrNo')?.focus();
      return;
    }
    
    if (!formData['LR Date']) {
      toast.error('Please select LR Date');
      document.getElementById('lrDate')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      document.getElementById('lrDate')?.focus();
      return;
    }
    
    if (!formData['FROM']) {
      toast.error('Please select FROM location');
      document.getElementById('from')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      document.getElementById('from')?.focus();
      return;
    }
    
    if (!formData['TO']) {
      toast.error('Please select TO location');
      document.getElementById('to')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      document.getElementById('to')?.focus();
      return;
    }
    
    if (selectedConsignors.length === 0) {
      toast.error('Please select at least one Consignor');
      // Scroll to consignor section
      document.getElementById('consignor')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    
    if (selectedConsignees.length === 0) {
      toast.error('Please select at least one Consignee');
      // Scroll to consignee section
      document.getElementById('consignee')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    
    if (!formData['Vehicle Type']) {
      toast.error('Please select Vehicle Type');
      document.getElementById('vehicleType')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      document.getElementById('vehicleType')?.focus();
      return;
    }

    // Check if Consignor and Consignee are the same
    if (formData['Consignor'] && formData['Consignee'] && formData['Consignor'] === formData['Consignee']) {
      toast.error('Consignor and Consignee cannot be the same');
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
      
      // Combine descriptions and quantities
      if (selectedDescriptions.length > 0) {
        const descriptions = selectedDescriptions
          .filter(d => d.quantity)
          .map(d => `${d.description}: ${d.quantity}`)
          .join(', ');
        submissionData['Description of Goods'] = descriptions;
        submissionData['Quantity'] = selectedDescriptions
          .filter(d => d.quantity)
          .map(d => d.quantity)
          .join(', ');
      }
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submissionData),
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast.success(editingLr ? 'LR updated successfully!' : 'LR created successfully!');
        onBack();
      } else {
        // Enhanced error message with details
        const errorMessage = data.details 
          ? `Validation failed: ${data.details.map((d: any) => d.message).join(', ')}`
          : data.error || 'Failed to save LR';
        toast.error(errorMessage);
        console.error('[LRForm] Save failed:', { data, submissionData });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to save LR';
      toast.error(`Network error: ${errorMessage}`);
      console.error('[LRForm] Save error:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Clear form
  const clearForm = () => {
    if (confirm('Are you sure you want to clear all form data?')) {
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
        <div className="container mx-auto px-3 md:px-4 py-4 md:py-6">
          <div className="flex items-center justify-between gap-2 md:gap-4">
            <div className="flex items-center gap-2 md:gap-4 min-w-0 flex-1">
              <div className="bg-white/20 backdrop-blur-sm p-2 md:p-3 rounded-xl shadow-lg flex-shrink-0">
                <FileText className="w-5 h-5 md:w-6 md:h-6" />
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-lg md:text-2xl lg:text-3xl font-bold tracking-tight truncate">
                  {editingLr ? 'Edit LR' : 'Create New LR'}
                </h1>
                <p className="text-blue-100 text-[10px] md:text-xs lg:text-sm mt-0.5 md:mt-1 hidden sm:block">{editingLr ? 'Update LR details' : 'Enter LR information to get started'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                onClick={onBack} 
                variant="secondary"
                className="bg-white/20 hover:bg-white/30 text-white border-0 text-xs md:text-sm px-2 md:px-4 py-2 whitespace-nowrap"
              >
                <ArrowLeft className="mr-1 md:mr-2 h-3 w-3 md:h-4 md:w-4" />
                <span className="hidden sm:inline">Back to Dashboard</span>
                <span className="sm:hidden">Back</span>
              </Button>
              <label className="inline-flex items-center px-2 py-2 text-[10px] md:text-xs bg-white/15 hover:bg-white/25 rounded cursor-pointer">
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  multiple
                  className="hidden"
                  onChange={async (e) => {
                    const files = e.target.files;
                    if (!files || files.length === 0) return;
                    if (!formData['LR No'] || formData['LR No'] === LR_PREFIX) {
                      toast.error('Save LR with a valid LR No before uploading files');
                      const inputEl = e.target as HTMLInputElement;
                      if (inputEl) inputEl.value = '';
                      return;
                    }
                    const form = new FormData();
                    Array.from(files).forEach(f => form.append('files', f));
                    const res = await fetch(`/api/lrs/${encodeURIComponent(formData['LR No'])}/attachments`, { method: 'POST', body: form });
                    if (res.ok) {
                      const data = await res.json();
                      setRecentUploads(data.attachments || []);
                      toast.success(`Uploaded ${data.uploadedCount || 0} file(s)`);
                    } else {
                      const err = await res.json().catch(() => ({}));
                      toast.error(err.error || 'Upload failed');
                    }
                    const inputEl = e.target as HTMLInputElement;
                    if (inputEl) inputEl.value = '';
                  }}
                />
                <span className="text-white">Upload Files</span>
              </label>
            </div>
          </div>
        </div>
      </div>
      
      {/* Progress Indicator */}
      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-3 md:px-4 py-3 md:py-4 overflow-x-auto">
          <div className="flex items-center gap-2 md:gap-4 text-[10px] sm:text-xs md:text-sm min-w-max">
            <div className="flex items-center gap-1 md:gap-2 flex-shrink-0">
              <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs md:text-sm">1</div>
              <span className="font-medium whitespace-nowrap">Route</span>
            </div>
            <div className="h-1 flex-1 bg-gradient-to-r from-blue-600 to-blue-300 min-w-[20px]"></div>
            <div className="flex items-center gap-1 md:gap-2 flex-shrink-0">
              <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs md:text-sm">2</div>
              <span className="font-medium whitespace-nowrap">Vehicle</span>
            </div>
            <div className="h-1 flex-1 bg-gradient-to-r from-blue-600 to-blue-300 min-w-[20px]"></div>
            <div className="flex items-center gap-1 md:gap-2 flex-shrink-0">
              <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs md:text-sm">3</div>
              <span className="font-medium whitespace-nowrap">Cargo</span>
            </div>
            <div className="h-1 flex-1 bg-gradient-to-r from-blue-600 to-blue-300 min-w-[20px]"></div>
            <div className="flex items-center gap-1 md:gap-2 flex-shrink-0">
              <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs md:text-sm">4</div>
              <span className="font-medium whitespace-nowrap">Details</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Form */}
      <div className="container mx-auto px-3 md:px-4 py-4 md:py-8">
        <form onSubmit={handleSubmit}>
          {/* Route Information */}
          <Card className="mb-6 border-0 shadow-md hover:shadow-lg transition-shadow duration-300 bg-white/80 backdrop-blur-sm">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-transparent pb-3 md:pb-4 px-4 md:px-6 pt-4 md:pt-6">
              <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                <div className="bg-blue-600 text-white p-1.5 md:p-2 rounded-lg flex-shrink-0">
                  <MapPin className="h-3 w-3 md:h-4 md:w-4" />
                </div>
                Route Information
              </CardTitle>
              <CardDescription className="text-gray-600 text-xs md:text-sm mt-1">Select origin, destination, and parties</CardDescription>
            </CardHeader>
            <CardContent className="px-4 md:px-6 pt-4 md:pt-6 pb-4 md:pb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
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
                  <div className="flex gap-2">
                    <select
                      id="vehicleNumber"
                      value={formData['Vehicle Number'] || ''}
                      onChange={(e) => handleChange('Vehicle Number', e.target.value)}
                      className="flex h-10 flex-1 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors"
                      disabled={!formData['Vehicle Type']}
                    >
                      <option value="">
                        {formData['Vehicle Type'] ? 'Select vehicle...' : 'Select vehicle type first'}
                      </option>
                      {availableVehicles.map(vehicle => (
                        <option key={vehicle} value={vehicle}>{vehicle}</option>
                      ))}
                    </select>
                    <Button
                      type="button"
                      onClick={() => setShowAddVehicle(!showAddVehicle)}
                      variant="outline"
                      size="sm"
                      disabled={!formData['Vehicle Type']}
                      className="px-3"
                      title="Add new vehicle"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  {showAddVehicle && formData['Vehicle Type'] && (
                    <div className="mt-2 p-3 bg-gray-50 border border-gray-300 rounded-md">
                      <div className="flex gap-2">
                        <Input
                          value={newVehicleNumber}
                          onChange={(e) => setNewVehicleNumber(e.target.value.toUpperCase())}
                          placeholder="Enter vehicle number"
                          className="flex-1"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddVehicle();
                            } else if (e.key === 'Escape') {
                              setShowAddVehicle(false);
                              setNewVehicleNumber('');
                            }
                          }}
                        />
                        <Button
                          type="button"
                          onClick={handleAddVehicle}
                          variant="default"
                          size="sm"
                          className="px-3"
                        >
                          Add
                        </Button>
                        <Button
                          type="button"
                          onClick={() => {
                            setShowAddVehicle(false);
                            setNewVehicleNumber('');
                          }}
                          variant="outline"
                          size="sm"
                          className="px-3"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                  
                  {availableVehicles.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {availableVehicles.map(vehicle => (
                        <Badge
                          key={vehicle}
                          variant={formData['Vehicle Number'] === vehicle ? 'default' : 'outline'}
                          className="cursor-pointer hover:bg-gray-100 flex items-center gap-1"
                          onClick={() => handleChange('Vehicle Number', vehicle)}
                        >
                          {vehicle}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteVehicle(vehicle);
                            }}
                            className="ml-1 hover:text-red-600"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
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
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <select
                        id="descriptionOfGoods"
                        value=""
                        onChange={(e) => {
                          if (e.target.value) {
                            handleSelectDescription(e.target.value);
                            e.target.value = '';
                          }
                        }}
                        className="flex h-10 flex-1 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors"
                      >
                        <option value="">Select description...</option>
                        {availableDescriptions
                          .filter(d => !selectedDescriptions.find(sd => sd.description === d))
                          .map(description => (
                            <option key={description} value={description}>{description}</option>
                          ))}
                      </select>
                      <Button
                        type="button"
                        onClick={() => setShowAddDescription(!showAddDescription)}
                        variant="outline"
                        size="sm"
                        className="px-3"
                        title="Add new description"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    {showAddDescription && (
                      <div className="p-3 bg-gray-50 border border-gray-300 rounded-md">
                        <div className="flex gap-2">
                          <Input
                            value={newDescription}
                            onChange={(e) => setNewDescription(e.target.value)}
                            placeholder="Enter description"
                            className="flex-1"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddDescription();
                              } else if (e.key === 'Escape') {
                                setShowAddDescription(false);
                                setNewDescription('');
                              }
                            }}
                          />
                          <Button
                            type="button"
                            onClick={handleAddDescription}
                            variant="default"
                            size="sm"
                            className="px-3"
                          >
                            Add
                          </Button>
                          <Button
                            type="button"
                            onClick={() => {
                              setShowAddDescription(false);
                              setNewDescription('');
                            }}
                            variant="outline"
                            size="sm"
                            className="px-3"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                    
                    {selectedDescriptions.length > 0 && (
                      <div className="space-y-2 mt-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
                        <p className="text-xs font-medium text-blue-700 mb-2">Selected Descriptions:</p>
                        {selectedDescriptions.map((item, index) => (
                          <div key={index} className="flex gap-2 items-center bg-white p-2 rounded border border-gray-200">
                            <Badge variant="default" className="px-3 py-1.5">
                              {item.description}
                            </Badge>
                            <Input
                              value={item.quantity}
                              onChange={(e) => handleUpdateQuantity(item.description, e.target.value)}
                              placeholder="Enter quantity"
                              className="flex-1"
                            />
                            <button
                              type="button"
                              onClick={() => handleRemoveDescription(item.description)}
                              className="text-red-600 hover:text-red-800 p-1"
                              title="Remove"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {availableDescriptions.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {availableDescriptions.map(description => (
                          <Badge
                            key={description}
                            variant={selectedDescriptions.find(d => d.description === description) ? 'default' : 'outline'}
                            className="cursor-pointer hover:bg-gray-100 flex items-center gap-1"
                            onClick={() => !selectedDescriptions.find(d => d.description === description) && handleSelectDescription(description)}
                          >
                            {description}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteDescription(description);
                              }}
                              className="ml-1 hover:text-red-600"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
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
                    disabled={!hasKOEL}
                    className={!hasKOEL ? 'bg-gray-100 cursor-not-allowed' : ''}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {hasKOEL ? 'Editable (KOEL consignor/consignee detected)' : 'Locked to 99 (non-KOEL)'}
                  </p>
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
            <CardContent className="px-4 md:px-6 pt-4 md:pt-6 pb-4 md:pb-6">
              <div className="flex flex-col sm:flex-row gap-2 md:gap-3">
                <Button
                  type="submit"
                  disabled={loading}
                  size="lg"
                  className="w-full sm:w-auto sm:min-w-[150px] bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg hover:shadow-xl transition-all text-sm md:text-base"
                >
                  <Save className="mr-2 h-4 w-4 md:h-5 md:w-5" />
                  {loading ? '⏳ Saving...' : editingLr ? '✏️ Update LR' : '💾 Save LR'}
                </Button>
                
                <Button
                  type="button"
                  onClick={clearForm}
                  variant="outline"
                  size="lg"
                  className="w-full sm:w-auto border-gray-300 hover:bg-red-50 hover:border-red-300 hover:text-red-600 transition-colors text-sm md:text-base"
                >
                  <Trash2 className="mr-2 h-4 w-4 md:h-5 md:w-5" />
                  <span>Clear Form</span>
                </Button>
                
                <Button
                  type="button"
                  onClick={onBack}
                  variant="secondary"
                  size="lg"
                  className="w-full sm:w-auto sm:ml-auto bg-gray-200 hover:bg-gray-300 text-gray-800 transition-colors text-sm md:text-base"
                >
                  <ArrowLeft className="mr-2 h-4 w-4 md:h-5 md:w-5" />
                  <span className="hidden sm:inline">Back to Dashboard</span>
                  <span className="sm:hidden">Back</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      </div>
    </div>
  );
}
