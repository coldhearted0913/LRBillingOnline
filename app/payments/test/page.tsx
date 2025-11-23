'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, CheckCircle, XCircle, Download, Upload } from 'lucide-react';
import toast from 'react-hot-toast';

export default function PaymentSyncTestPage() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [credentials, setCredentials] = useState({
    username: '',
    password: '',
    csvExportUrl: '',
  });

  const handleSync = async () => {
    if (!credentials.username || !credentials.password) {
      toast.error('Please enter Oracle EBS username and password');
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/payments/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: credentials.username,
          password: credentials.password,
          csvExportUrl: credentials.csvExportUrl || undefined,
          autoSave: true,
          autoMarkPaid: true,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setResult(data);
        toast.success(`Successfully synced ${data.stats?.matched || 0} payments`);
      } else {
        setResult({ error: data.error || 'Sync failed', details: data.details });
        toast.error(data.error || 'Sync failed');
      }
    } catch (error: any) {
      setResult({ error: 'Network error', details: error.message });
      toast.error('Network error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      toast.error('Please upload a CSV file');
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('autoSave', 'true');

      const response = await fetch('/api/payments/upload-csv', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setResult(data);
        toast.success(`Successfully processed ${data.stats?.matched || 0} payments`);
      } else {
        setResult({ error: data.error || 'Upload failed', details: data.details });
        toast.error(data.error || 'Upload failed');
      }
    } catch (error: any) {
      setResult({ error: 'Network error', details: error.message });
      toast.error('Network error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Check if user has permission
  const userRole = (session?.user as any)?.role;
  const hasPermission = userRole === 'CEO' || userRole === 'MANAGER';

  if (!session) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="pt-6">
            <p>Please log in to access payment sync.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!hasPermission) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-red-600">Access denied. Only CEO and MANAGER can sync payments.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Payment Sync Test</CardTitle>
          <CardDescription>
            Test the Oracle EBS payment integration. This will automatically log in, download CSV, and match payments with LRs.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">Oracle EBS Username</Label>
            <Input
              id="username"
              type="text"
              value={credentials.username}
              onChange={(e) => setCredentials({ ...credentials, username: e.target.value })}
              placeholder="Enter your Oracle EBS username"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Oracle EBS Password</Label>
            <Input
              id="password"
              type="password"
              value={credentials.password}
              onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
              placeholder="Enter your Oracle EBS password"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="csvExportUrl">CSV Export URL (Optional)</Label>
            <Input
              id="csvExportUrl"
              type="text"
              value={credentials.csvExportUrl}
              onChange={(e) => setCredentials({ ...credentials, csvExportUrl: e.target.value })}
              placeholder="https://knode1.koel.co.in:8443/... (leave empty to auto-detect)"
            />
            <p className="text-sm text-gray-500">
              If you know the direct URL to the CSV export page, enter it here. Otherwise, leave empty and the system will try to find it automatically.
            </p>
          </div>

          <Button
            onClick={handleSync}
            disabled={loading || !credentials.username || !credentials.password}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Syncing payments...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Sync Payments from Oracle EBS
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Manual CSV Upload (Alternative)</CardTitle>
          <CardDescription>
            If automatic sync doesn't work, you can manually download the CSV from Oracle EBS and upload it here.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                disabled={loading}
                className="flex-1"
              />
            </div>
            <p className="text-sm text-gray-500">
              1. Log in to Oracle EBS manually<br />
              2. Download the payment CSV file<br />
              3. Upload it here
            </p>
          </div>
        </CardContent>
      </Card>

      {result && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {result.error ? (
                <>
                  <XCircle className="h-5 w-5 text-red-500" />
                  Sync Result (Error)
                </>
              ) : (
                <>
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  Sync Result (Success)
                </>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-gray-100 p-4 rounded-md overflow-auto text-sm">
              {JSON.stringify(result, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

