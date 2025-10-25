// FIX: Import React to provide the React namespace for types like React.ChangeEvent.
import React, { useState, useMemo, useCallback } from 'react';

type SortDirection = 'ascending' | 'descending';

interface SortConfig<T> {
  key: keyof T | null;
  direction: SortDirection;
}

const parseSize = (size: string): number => {
    const units: { [key: string]: number } = { 'KB': 1024, 'MB': 1024**2, 'GB': 1024**3, 'TB': 1024**4 };
    const match = size.match(/^(\d+(\.\d+)?)\s*([KMGT]B)$/i);
    if (!match) return 0;
    const value = parseFloat(match[1]);
    const unit = match[3].toUpperCase();
    return value * (units[unit] || 1);
};

export const useTable = <T extends object>(
  initialData: T[],
  searchKeys: (keyof T)[],
  initialSortKey: keyof T | null = null,
) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<SortConfig<T>>({
    key: initialSortKey,
    direction: 'ascending',
  });

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  }, []);

  const requestSort = useCallback((key: keyof T) => {
    let direction: SortDirection = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  }, [sortConfig]);

  const filteredItems = useMemo(() => {
    if (!searchTerm) {
      return initialData;
    }
    return initialData.filter(item => {
      return searchKeys.some(key => {
        const value = item[key];
        if (typeof value === 'string' || typeof value === 'number') {
          return String(value).toLowerCase().includes(searchTerm.toLowerCase());
        }
        if (Array.isArray(value)) {
            return value.join(' ').toLowerCase().includes(searchTerm.toLowerCase());
        }
        return false;
      });
    });
  }, [initialData, searchTerm, searchKeys]);

  const sortedItems = useMemo(() => {
    let sortableItems = [...filteredItems];
    if (sortConfig.key !== null) {
      sortableItems.sort((a, b) => {
        const aValue = a[sortConfig.key!];
        const bValue = b[sortConfig.key!];

        if (aValue === null || aValue === undefined) return 1;
        if (bValue === null || bValue === undefined) return -1;
        
        // Custom sort for image size
        if (sortConfig.key === 'size' && typeof aValue === 'string' && typeof bValue === 'string') {
             const aSize = parseSize(aValue);
             const bSize = parseSize(bValue);
             if (aSize < bSize) return sortConfig.direction === 'ascending' ? -1 : 1;
             if (aSize > bSize) return sortConfig.direction === 'ascending' ? 1 : -1;
             return 0;
        }

        // Generic comparison
        if (aValue < bValue) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [filteredItems, sortConfig]);

  return {
    items: sortedItems,
    requestSort,
    sortConfig,
    searchTerm,
    handleSearchChange,
  };
};
