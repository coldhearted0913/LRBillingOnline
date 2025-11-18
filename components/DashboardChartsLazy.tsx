'use client';

import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';

// Lazy load DashboardCharts with loading skeleton
const DashboardCharts = dynamic(() => import('@/components/DashboardCharts'), {
  loading: () => (
    <div className="space-y-4">
      <Skeleton className="h-64 w-full" />
      <Skeleton className="h-64 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  ),
  ssr: false, // Disable SSR for charts (they use browser APIs)
});

export default DashboardCharts;

