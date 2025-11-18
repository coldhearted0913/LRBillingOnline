import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { LRData } from '@/lib/database';
import toast from 'react-hot-toast';

// React Query configuration
export const REACT_QUERY_CONFIG = {
  staleTime: 30 * 1000, // 30 seconds - data is fresh for 30s
  gcTime: 10 * 60 * 1000, // 10 minutes - cache for 10 minutes
  refetchOnMount: 'always' as const,
  refetchOnWindowFocus: true,
  refetchOnReconnect: true,
};

export function useLRs() {
  const queryClient = useQueryClient();

  const { data: lrs = [], isLoading, refetch } = useQuery<LRData[]>({
    queryKey: ['lrs'],
    queryFn: async () => {
      const response = await fetch('/api/lrs');
      const data = await response.json();
      if (!data.success) throw new Error(data.error || 'Failed to fetch LRs');
      // Normalize records for consistent downstream logic
      return (data.lrs || []).map((lr: any) => ({
        ...lr,
        // Ensure lowercase 'status' exists even if API returns 'Status'
        status: lr.status ?? lr.Status ?? lr['status'] ?? lr['Status'] ?? undefined,
      }));
    },
    ...REACT_QUERY_CONFIG,
  });

  const statusUpdateMutation = useMutation({
    mutationFn: async ({ lrNo, status }: { lrNo: string; status: string }) => {
      const response = await fetch(`/api/lrs/${encodeURIComponent(lrNo)}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.error || 'Failed to update status');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lrs'] });
      toast.success('Status updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update status: ${error.message}`);
    },
  });

  const bulkStatusUpdateMutation = useMutation({
    mutationFn: async ({ lrNumbers, status }: { lrNumbers: string[]; status: string }) => {
      const response = await fetch('/api/lrs/bulk-status', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lrNumbers, status }),
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.error || 'Failed to update status');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lrs'] });
      toast.success('Status updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update status: ${error.message}`);
    },
  });

  const deleteLRsMutation = useMutation({
    mutationFn: async (lrNumbers: string[]) => {
      const response = await fetch('/api/lrs', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lrNumbers }),
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.error || 'Failed to delete LRs');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lrs'] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete LRs: ${error.message}`);
    },
  });

  return {
    lrs,
    isLoading,
    refetch,
    statusUpdateMutation,
    bulkStatusUpdateMutation,
    deleteLRsMutation,
  };
}
