"use client";

import { SessionProvider } from "next-auth/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React, { useState } from "react";

export function Providers({ children }: { children: React.ReactNode }) {
  // Create a stable QueryClient instance with optimized caching
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        // Data is fresh for 30 seconds (optimized from 5 minutes for better UX)
        staleTime: 30 * 1000,
        // Keep unused data in cache for 10 minutes
        gcTime: 10 * 60 * 1000,
        // Retry failed requests once
        retry: 1,
        // Refetch on window focus (helpful for keeping data fresh)
        refetchOnWindowFocus: true,
        // Refetch on reconnect
        refetchOnReconnect: true,
        // Don't refetch on mount if data is fresh
        refetchOnMount: false,
      },
      mutations: {
        // Retry mutations once on failure
        retry: 1,
      },
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>{children}</SessionProvider>
    </QueryClientProvider>
  );
}
