'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

export default function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-50">
      {/* Header Skeleton */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white py-4 md:py-6 shadow-lg">
        <div className="container mx-auto px-3 md:px-4">
          <div className="flex items-center justify-between gap-3 md:gap-6">
            <div className="flex items-center gap-2 sm:gap-3 md:gap-4 min-w-0 flex-1">
              <Skeleton className="h-8 w-8 md:h-10 md:w-10 rounded-lg bg-white/20" />
              <div className="space-y-1">
                <Skeleton className="h-6 w-48 md:h-8 md:w-64 bg-white/20" />
                <Skeleton className="h-3 w-32 bg-white/10 hidden sm:block" />
              </div>
            </div>
            <div className="flex gap-2 items-center">
              <Skeleton className="h-10 w-32 md:w-40 bg-white/20" />
              <Skeleton className="h-10 w-10 rounded-full bg-white/20" />
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-3 md:px-4 py-4 md:py-8">
        {/* Period Display Skeleton */}
        <div className="mb-4 md:mb-6 p-3 md:p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <Skeleton className="h-4 w-48 bg-blue-100" />
        </div>

        {/* Stats Cards Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6 md:mb-8">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="border-gray-200">
              <CardHeader className="pb-3 md:pb-4">
                <div className="flex items-center gap-2 md:gap-3">
                  <Skeleton className="h-12 w-12 md:h-14 md:w-14 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-3 w-24 bg-gray-200" />
                    <Skeleton className="h-6 w-16 bg-gray-300" />
                    <Skeleton className="h-2 w-32 bg-gray-100" />
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>

        {/* Filters Card Skeleton */}
        <Card className="mb-6 border-gray-200">
          <CardHeader>
            <Skeleton className="h-6 w-32 bg-gray-200" />
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4">
              <Skeleton className="h-10 flex-1 bg-gray-100" />
              <Skeleton className="h-10 w-full sm:w-40 bg-gray-100" />
              <Skeleton className="h-10 w-full sm:w-32 bg-gray-100" />
              <Skeleton className="h-10 w-full sm:w-40 bg-gray-100" />
              <Skeleton className="h-10 w-full sm:w-32 bg-gray-100" />
              <Skeleton className="h-10 w-full sm:w-auto bg-gray-100" />
            </div>
          </CardContent>
        </Card>

        {/* Table Skeleton */}
        <Card className="mb-6 border-gray-200">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="space-y-2">
                <Skeleton className="h-6 w-32 bg-gray-200" />
                <Skeleton className="h-4 w-48 bg-gray-100" />
              </div>
              <div className="flex gap-2">
                <Skeleton className="h-6 w-20 bg-gray-200" />
                <Skeleton className="h-6 w-20 bg-gray-200" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      {[...Array(11)].map((_, i) => (
                        <th key={i} className="px-4 py-3">
                          <Skeleton className="h-4 w-full bg-gray-200" />
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[...Array(5)].map((_, rowIndex) => (
                      <tr key={rowIndex} className="border-b">
                        {[...Array(11)].map((_, colIndex) => (
                          <td key={colIndex} className="px-4 py-3">
                            <Skeleton className="h-4 w-full bg-gray-100" />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons Skeleton */}
        <Card className="border-gray-200">
          <CardContent className="pt-4 md:pt-6">
            <div className="flex flex-col sm:flex-row flex-wrap gap-2 md:gap-3">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-10 w-full sm:w-32 bg-gray-100" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
