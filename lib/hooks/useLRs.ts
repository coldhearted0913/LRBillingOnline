import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { LRData } from '@/lib/database';
import toast from 'react-hot-toast';

// Query key factory for consistent key management
export const lrKeys = {
  all: ['lrs'] as const,
};

// Fetch all LRs
const fetchLRs = async (): Promise<LRData[]> => {
  const response = await fetch('/api/lrs');
  const data = await response.json();
  if (data.success) {
    return data.lrs;
  }
  throw new Error('Failed to fetch LRs');
};

// Hook for fetching all LRs with caching
export const useLRs = () => {
  return useQuery({
    queryKey: lrKeys.all,
    queryFn: fetchLRs,
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep unused data in cache for 10 minutes
    refetchOnWindowFocus: false, // Don't refetch on window focus
    retry: 1, // Retry once on failure
  });
};

// Hook for deleting LRs with optimistic updates
export const useDeleteLRs = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (lrNumbers: string[]) => {
      const response = await fetch('/api/lrs', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lrNumbers }),
      });
      
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to delete LRs');
      }
      return data;
    },
    // Optimistically update the cache
    onMutate: async (lrNumbers) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: lrKeys.all });

      // Snapshot the previous value
      const previousLRs = queryClient.getQueryData<LRData[]>(lrKeys.all);

      // Optimistically update to the new value
      queryClient.setQueryData<LRData[]>(lrKeys.all, (old) => 
        old?.filter(lr => !lrNumbers.includes(lr['LR No'])) ?? []
      );

      return { previousLRs };
    },
    // On error, roll back to the previous value
    onError: (err, lrNumbers, context) => {
      if (context?.previousLRs) {
        queryClient.setQueryData(lrKeys.all, context.previousLRs);
      }
      toast.error(err instanceof Error ? err.message : 'Failed to delete LRs');
    },
    // Always refetch after error or success to ensure consistency
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: lrKeys.all });
    },
    onSuccess: () => {
      toast.success('LRs deleted successfully');
    },
  });
};

// Hook for updating LR status
export const useUpdateLRStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ lrNo, status }: { lrNo: string; status: string }) => {
      const response = await fetch(`/api/lrs/${lrNo}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to update status');
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: lrKeys.all });
      toast.success('Status updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update status');
    },
  });
};

// Hook for bulk status update
export const useBulkUpdateStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ lrNumbers, status }: { lrNumbers: string[]; status: string }) => {
      const response = await fetch('/api/lrs/bulk-status', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lrNumbers, status }),
      });

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to update statuses');
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: lrKeys.all });
      toast.success('Statuses updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update statuses');
    },
  });
};
