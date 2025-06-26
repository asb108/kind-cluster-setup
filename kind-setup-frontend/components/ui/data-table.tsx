'use client';

import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Search,
  X,
  ArrowLeft,
  ArrowRight,
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '../../lib/utils';

type SortDirection = 'asc' | 'desc' | null;

interface Column<T> {
  key: string;
  header: string;
  cell?: (item: T) => React.ReactNode;
  sortable?: boolean;
  searchable?: boolean;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  searchable?: boolean;
  pagination?: boolean;
  itemsPerPage?: number;
  emptyState?: React.ReactNode;
  className?: string;
}

export function DataTable<T>({
  data,
  columns,
  searchable = true,
  pagination = true,
  itemsPerPage = 10,
  emptyState,
  className = '',
}: DataTableProps<T>) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [currentPage, setCurrentPage] = useState(1);

  // Handle sorting
  const handleSort = (key: string) => {
    if (sortKey === key) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortKey(null);
        setSortDirection(null);
      } else {
        setSortDirection('asc');
      }
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  // Filter data based on search query
  const filteredData = searchQuery
    ? data.filter(item => {
        return columns.some(column => {
          if (!column.searchable) return false;
          const value = (item as any)[column.key];
          if (typeof value === 'string') {
            return value.toLowerCase().includes(searchQuery.toLowerCase());
          }
          return false;
        });
      })
    : data;

  // Sort data
  const sortedData = sortKey
    ? [...filteredData].sort((a, b) => {
        const aValue = (a as any)[sortKey];
        const bValue = (b as any)[sortKey];

        if (aValue === bValue) return 0;

        if (sortDirection === 'asc') {
          return aValue > bValue ? 1 : -1;
        } else {
          return aValue < bValue ? 1 : -1;
        }
      })
    : filteredData;

  // Paginate data
  const totalPages = Math.ceil(sortedData.length / itemsPerPage);
  const paginatedData = pagination
    ? sortedData.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
      )
    : sortedData;

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Clear search
  const clearSearch = () => {
    setSearchQuery('');
  };

  return (
    <div className={cn('w-full', className)}>
      {searchable && (
        <div className='flex items-center mb-4'>
          <div className='relative flex-1 max-w-md'>
            <div className='absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none'>
              <Search className='w-4 h-4 text-muted-foreground' />
            </div>
            <Input
              type='text'
              className='pl-10 pr-10'
              placeholder='Search...'
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <Button
                variant='ghost'
                size='icon'
                className='absolute inset-y-0 right-0 h-full px-3'
                onClick={clearSearch}
              >
                <X className='w-4 h-4' />
              </Button>
            )}
          </div>
        </div>
      )}

      <div className='rounded-md border'>
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map(column => (
                <TableHead
                  key={column.key}
                  className={cn(
                    column.sortable && 'cursor-pointer select-none'
                  )}
                  onClick={() => column.sortable && handleSort(column.key)}
                >
                  <div className='flex items-center space-x-1'>
                    <span>{column.header}</span>
                    {column.sortable && sortKey === column.key && (
                      <span>
                        {sortDirection === 'asc' ? (
                          <ChevronUp className='w-4 h-4' />
                        ) : (
                          <ChevronDown className='w-4 h-4' />
                        )}
                      </span>
                    )}
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.length > 0 ? (
              paginatedData.map((item, index) => (
                <TableRow key={index}>
                  {columns.map(column => (
                    <TableCell key={column.key}>
                      {column.cell
                        ? column.cell(item)
                        : (item as any)[column.key]}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className='h-24 text-center'
                >
                  {emptyState || 'No data available'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {pagination && totalPages > 1 && (
        <div className='flex items-center justify-between mt-4'>
          <div className='text-sm text-muted-foreground'>
            Showing {(currentPage - 1) * itemsPerPage + 1} to{' '}
            {Math.min(currentPage * itemsPerPage, sortedData.length)} of{' '}
            {sortedData.length} entries
          </div>
          <div className='flex space-x-1'>
            <Button
              variant='outline'
              size='sm'
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <ArrowLeft className='w-4 h-4 mr-1' />
              Previous
            </Button>

            <div className='flex items-center space-x-1'>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                // Show pages around current page
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else {
                  const middlePoint = Math.min(
                    Math.max(currentPage, 3),
                    totalPages - 2
                  );
                  pageNum = middlePoint - 2 + i;
                }

                return (
                  <Button
                    key={pageNum}
                    variant={currentPage === pageNum ? 'default' : 'outline'}
                    size='sm'
                    className='w-9'
                    onClick={() => handlePageChange(pageNum)}
                  >
                    {pageNum}
                  </Button>
                );
              })}
            </div>

            <Button
              variant='outline'
              size='sm'
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              Next
              <ArrowRight className='w-4 h-4 ml-1' />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
