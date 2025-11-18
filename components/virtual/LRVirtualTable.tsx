'use client';

import { useMemo, useRef, useEffect, useState } from 'react';
import { LRData } from '@/lib/database';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, Edit, Trash2, MoreVertical } from 'lucide-react';
import { STATUS_COLORS } from '@/lib/constants';

interface LRVirtualTableProps {
  lrs: LRData[];
  selectedLrs: Set<string>;
  onSelectLR: (lrNo: string, selected: boolean) => void;
  onSelectAll: (selected: boolean) => void;
  onEdit: (lr: LRData) => void;
  onDelete: (lrNo: string) => void;
  onViewDetails: (lr: LRData) => void;
  visibleColumns: Set<string>;
  sortBy: 'lrNo' | 'date' | 'none';
  sortOrder: 'asc' | 'desc';
  onSort: (by: 'lrNo' | 'date') => void;
  userRole?: string;
  itemsPerPage: number;
  currentPage: number;
}

const ROW_HEIGHT = 60; // Estimated row height in pixels
const BUFFER_SIZE = 5; // Number of rows to render outside visible area

export default function LRVirtualTable({
  lrs,
  selectedLrs,
  onSelectLR,
  onSelectAll,
  onEdit,
  onDelete,
  onViewDetails,
  visibleColumns,
  sortBy,
  sortOrder,
  onSort,
  userRole,
  itemsPerPage,
  currentPage,
}: LRVirtualTableProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(600);

  // Calculate pagination
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedLrs = useMemo(() => lrs.slice(startIndex, endIndex), [lrs, startIndex, endIndex]);

  // Calculate virtual scrolling
  const totalHeight = paginatedLrs.length * ROW_HEIGHT;
  const startRow = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - BUFFER_SIZE);
  const endRow = Math.min(
    paginatedLrs.length,
    Math.ceil((scrollTop + containerHeight) / ROW_HEIGHT) + BUFFER_SIZE
  );
  const visibleRows = paginatedLrs.slice(startRow, endRow);
  const offsetY = startRow * ROW_HEIGHT;

  // Update container height on resize
  useEffect(() => {
    const updateHeight = () => {
      if (containerRef.current) {
        setContainerHeight(containerRef.current.clientHeight);
      }
    };

    updateHeight();
    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, []);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  };

  const allSelected = paginatedLrs.length > 0 && paginatedLrs.every((lr) => selectedLrs.has(lr['LR No']));
  const someSelected = paginatedLrs.some((lr) => selectedLrs.has(lr['LR No']));

  return (
    <div
      ref={containerRef}
      className="w-full overflow-auto"
      style={{ height: `${Math.min(containerHeight, totalHeight)}px` }}
      onScroll={handleScroll}
    >
      <div style={{ height: `${totalHeight}px`, position: 'relative' }}>
        <div style={{ transform: `translateY(${offsetY}px)` }}>
          <table className="w-full border-collapse">
            <thead className="sticky top-0 bg-white z-10 border-b">
              <tr>
                {visibleColumns.has('checkbox') && (
                  <th className="px-2 py-2 text-left border-b">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      ref={(input) => {
                        if (input) input.indeterminate = someSelected && !allSelected;
                      }}
                      onChange={(e) => onSelectAll(e.target.checked)}
                      className="w-4 h-4"
                    />
                  </th>
                )}
                {visibleColumns.has('lrNo') && (
                  <th className="px-2 py-2 text-left border-b">
                    <button
                      onClick={() => onSort('lrNo')}
                      className="flex items-center gap-1 hover:text-blue-600"
                    >
                      LR No
                      {sortBy === 'lrNo' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </button>
                  </th>
                )}
                {visibleColumns.has('vehicleNo') && (
                  <th className="px-2 py-2 text-left border-b">Vehicle No</th>
                )}
                {visibleColumns.has('lrDate') && (
                  <th className="px-2 py-2 text-left border-b">
                    <button
                      onClick={() => onSort('date')}
                      className="flex items-center gap-1 hover:text-blue-600"
                    >
                      LR Date
                      {sortBy === 'date' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </button>
                  </th>
                )}
                {visibleColumns.has('from') && (
                  <th className="px-2 py-2 text-left border-b">FROM</th>
                )}
                {visibleColumns.has('to') && (
                  <th className="px-2 py-2 text-left border-b">TO</th>
                )}
                {visibleColumns.has('vehicleType') && (
                  <th className="px-2 py-2 text-left border-b">Vehicle Type</th>
                )}
                {visibleColumns.has('submitDate') && (
                  <th className="px-2 py-2 text-left border-b">Submit Date</th>
                )}
                {visibleColumns.has('status') && (
                  <th className="px-2 py-2 text-left border-b">Status</th>
                )}
                {visibleColumns.has('remark') && (
                  <th className="px-2 py-2 text-left border-b">Remark</th>
                )}
                {visibleColumns.has('actions') && (
                  <th className="px-2 py-2 text-left border-b">Actions</th>
                )}
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((lr) => {
                const isSelected = selectedLrs.has(lr['LR No']);
                const statusColor = STATUS_COLORS[lr.status as keyof typeof STATUS_COLORS] || 'gray';

                return (
                  <tr
                    key={lr['LR No']}
                    className={`border-b hover:bg-gray-50 ${isSelected ? 'bg-blue-50' : ''}`}
                    style={{ height: `${ROW_HEIGHT}px` }}
                  >
                    {visibleColumns.has('checkbox') && (
                      <td className="px-2 py-2">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => onSelectLR(lr['LR No'], e.target.checked)}
                          className="w-4 h-4"
                        />
                      </td>
                    )}
                    {visibleColumns.has('lrNo') && (
                      <td className="px-2 py-2 text-sm font-medium">{lr['LR No']}</td>
                    )}
                    {visibleColumns.has('vehicleNo') && (
                      <td className="px-2 py-2 text-sm">{lr['Vehicle Number'] || '-'}</td>
                    )}
                    {visibleColumns.has('lrDate') && (
                      <td className="px-2 py-2 text-sm">{lr['LR Date'] || '-'}</td>
                    )}
                    {visibleColumns.has('from') && (
                      <td className="px-2 py-2 text-sm">{lr['FROM'] || '-'}</td>
                    )}
                    {visibleColumns.has('to') && (
                      <td className="px-2 py-2 text-sm">{lr['TO'] || '-'}</td>
                    )}
                    {visibleColumns.has('vehicleType') && (
                      <td className="px-2 py-2 text-sm">{lr['Vehicle Type'] || '-'}</td>
                    )}
                    {visibleColumns.has('submitDate') && (
                      <td className="px-2 py-2 text-sm">{lr['Bill Submission Date'] || '-'}</td>
                    )}
                    {visibleColumns.has('status') && (
                      <td className="px-2 py-2">
                        <Badge
                          variant="outline"
                          className={`text-xs border-${statusColor}-300 bg-${statusColor}-50 text-${statusColor}-700`}
                        >
                          {lr.status || 'LR Done'}
                        </Badge>
                      </td>
                    )}
                    {visibleColumns.has('remark') && (
                      <td className="px-2 py-2 text-sm max-w-xs truncate" title={lr.remark || ''}>
                        {lr.remark || '-'}
                      </td>
                    )}
                    {visibleColumns.has('actions') && (
                      <td className="px-2 py-2">
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onViewDetails(lr)}
                            className="h-7 w-7 p-0"
                            title="View Details"
                          >
                            <Eye className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onEdit(lr)}
                            className="h-7 w-7 p-0"
                            title="Edit"
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          {(userRole === 'CEO' || userRole === 'MANAGER') && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onDelete(lr['LR No'])}
                              className="h-7 w-7 p-0 text-red-600 hover:text-red-700"
                              title="Delete"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

