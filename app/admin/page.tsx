'use client';

import { useState, useEffect } from 'react';
import { Database, Download, RefreshCw, Trash2, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function AdminDashboard() {
  const [lrs, setLrs] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [selectedLr, setSelectedLr] = useState<any>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    loadData();
    
    // Auto-refresh every 5 seconds if enabled
    let interval: NodeJS.Timeout;
    if (autoRefresh) {
      interval = setInterval(() => {
        loadData();
      }, 5000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh]);

  const loadData = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/lrs');
      const data = await response.json();
      if (data.success) {
        setLrs(data.lrs);
        calculateStats(data.lrs);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    }
    setLoading(false);
  };

  const calculateStats = (allLrs: any[]) => {
    setStats({
      total: allLrs.length,
      statuses: {
        'LR Done': allLrs.filter(lr => lr.status === 'LR Done').length,
        'LR Collected': allLrs.filter(lr => lr.status === 'LR Collected').length,
        'Bill Done': allLrs.filter(lr => lr.status === 'Bill Done').length,
        'Bill Submitted': allLrs.filter(lr => lr.status === 'Bill Submitted').length,
      },
      vehicleTypes: {
        'PICKUP': allLrs.filter(lr => lr['Vehicle Type'] === 'PICKUP').length,
        'TRUCK': allLrs.filter(lr => lr['Vehicle Type'] === 'TRUCK').length,
        'TOROUS': allLrs.filter(lr => lr['Vehicle Type'] === 'TOROUS').length,
      },
    });
  };

  const exportToJSON = () => {
    const dataStr = JSON.stringify(lrs, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `lr_database_backup_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
  };

  const viewLRDetails = (lr: any) => {
    setSelectedLr(lr);
  };

  const deleteLR = async (lrNo: string) => {
    if (!confirm(`Are you sure you want to delete LR: ${lrNo}?\n\nThis action cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/lrs/${encodeURIComponent(lrNo)}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        alert('LR deleted successfully!');
        loadData(); // Refresh the list
      } else {
        alert('Failed to delete LR');
      }
    } catch (error) {
      console.error('Error deleting LR:', error);
      alert('Error deleting LR');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-700 to-slate-900 text-white">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center gap-4">
            <div className="bg-white/20 backdrop-blur-sm p-3 rounded-lg">
              <Database className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Database Admin Panel</h1>
              <p className="text-slate-300 mt-1">View and manage your LR database</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Total Records</CardDescription>
              <CardTitle className="text-3xl">{stats.total || 0}</CardTitle>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>By Status</CardDescription>
              <div className="space-y-1 mt-2">
                {stats.statuses && Object.entries(stats.statuses).map(([status, count]: any) => (
                  <div key={status} className="flex justify-between text-sm">
                    <span>{status}:</span>
                    <Badge variant="outline">{count}</Badge>
                  </div>
                ))}
              </div>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>By Vehicle Type</CardDescription>
              <div className="space-y-1 mt-2">
                {stats.vehicleTypes && Object.entries(stats.vehicleTypes).map(([type, count]: any) => (
                  <div key={type} className="flex justify-between text-sm">
                    <span>{type}:</span>
                    <Badge variant="secondary">{count}</Badge>
                  </div>
                ))}
              </div>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Actions</CardDescription>
              <div className="space-y-2 mt-2">
                <Button onClick={loadData} size="sm" variant="outline" className="w-full">
                  <RefreshCw className="mr-2 h-3 w-3" />
                  Refresh
                </Button>
                <Button onClick={exportToJSON} size="sm" className="w-full">
                  <Download className="mr-2 h-3 w-3" />
                  Export JSON
                </Button>
                <Button 
                  onClick={() => setAutoRefresh(!autoRefresh)} 
                  size="sm" 
                  variant={autoRefresh ? "default" : "outline"}
                  className="w-full"
                >
                  <RefreshCw className={`mr-2 h-3 w-3 ${autoRefresh ? 'animate-spin' : ''}`} />
                  Auto-Refresh: {autoRefresh ? 'ON' : 'OFF'}
                </Button>
              </div>
            </CardHeader>
          </Card>
        </div>

        {/* Database Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>All LR Records ({lrs.length})</CardTitle>
                <CardDescription>
                  Complete database view with all fields
                  {autoRefresh && <span className="ml-2 text-green-600">● Auto-refreshing every 5s</span>}
                </CardDescription>
              </div>
              {loading && (
                <RefreshCw className="h-4 w-4 animate-spin text-blue-600" />
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-3 py-2 text-left">#</th>
                    <th className="px-3 py-2 text-left">LR No</th>
                    <th className="px-3 py-2 text-left">Date</th>
                    <th className="px-3 py-2 text-left">FROM</th>
                    <th className="px-3 py-2 text-left">TO</th>
                    <th className="px-3 py-2 text-left">Vehicle</th>
                    <th className="px-3 py-2 text-left">Status</th>
                    <th className="px-3 py-2 text-left">Created</th>
                    <th className="px-3 py-2 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {lrs.map((lr, index) => (
                    <tr key={lr['LR No']} className="hover:bg-muted/50">
                      <td className="px-3 py-2">{index + 1}</td>
                      <td className="px-3 py-2 font-mono text-xs">{lr['LR No']}</td>
                      <td className="px-3 py-2">{lr['LR Date']}</td>
                      <td className="px-3 py-2">{lr['FROM'] || '-'}</td>
                      <td className="px-3 py-2">{lr['TO'] || '-'}</td>
                      <td className="px-3 py-2">{lr['Vehicle Type']}</td>
                      <td className="px-3 py-2">
                        <Badge variant="outline" className="text-xs">
                          {lr.status || 'LR Done'}
                        </Badge>
                      </td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">
                        {lr.created_at ? new Date(lr.created_at).toLocaleDateString() : '-'}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => viewLRDetails(lr)}
                            title="View Details"
                          >
                            <Eye className="h-3 w-3" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => deleteLR(lr['LR No'])}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            title="Delete"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* LR Details Modal */}
        {selectedLr && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="max-w-2xl w-full max-h-[80vh] overflow-auto">
              <CardHeader>
                <CardTitle>LR Details: {selectedLr['LR No']}</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedLr(null)}
                  className="absolute top-4 right-4"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {Object.entries(selectedLr).map(([key, value]: any) => (
                    <div key={key} className="border-b pb-2">
                      <div className="font-medium text-muted-foreground">{key}</div>
                      <div className="mt-1">{value?.toString() || '-'}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Back to Main App */}
        <div className="mt-8 text-center">
          <a href="/" className="text-blue-600 hover:underline">
            ← Back to Main Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}

