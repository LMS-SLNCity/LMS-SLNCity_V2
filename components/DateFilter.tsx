import React from 'react';
import { Calendar } from 'lucide-react';

export type DateFilterOption = 'today' | 'yesterday' | 'last7days' | 'custom' | 'all';

interface DateFilterProps {
  selectedFilter: DateFilterOption;
  onFilterChange: (filter: DateFilterOption) => void;
  customStartDate?: string;
  customEndDate?: string;
  onCustomDateChange?: (startDate: string, endDate: string) => void;
}

export const DateFilter: React.FC<DateFilterProps> = ({
  selectedFilter,
  onFilterChange,
  customStartDate = '',
  customEndDate = '',
  onCustomDateChange,
}) => {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Calendar className="h-5 w-5 text-gray-500" />
        <span className="text-sm font-medium text-gray-700">Filter by Date:</span>
      </div>
      
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => onFilterChange('today')}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            selectedFilter === 'today'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Today
        </button>
        <button
          onClick={() => onFilterChange('yesterday')}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            selectedFilter === 'yesterday'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Yesterday
        </button>
        <button
          onClick={() => onFilterChange('last7days')}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            selectedFilter === 'last7days'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Last 7 Days
        </button>
        <button
          onClick={() => onFilterChange('all')}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            selectedFilter === 'all'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          All Time
        </button>
        <button
          onClick={() => onFilterChange('custom')}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            selectedFilter === 'custom'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Custom Range
        </button>
      </div>

      {selectedFilter === 'custom' && onCustomDateChange && (
        <div className="flex gap-3 items-center bg-gray-50 p-3 rounded-lg border border-gray-200">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-600">Start Date</label>
            <input
              type="date"
              value={customStartDate}
              onChange={(e) => onCustomDateChange(e.target.value, customEndDate)}
              className="px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-600">End Date</label>
            <input
              type="date"
              value={customEndDate}
              onChange={(e) => onCustomDateChange(customStartDate, e.target.value)}
              className="px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      )}
    </div>
  );
};

// Helper function to filter items by date
export const filterByDate = <T extends { created_at?: string; registration_datetime?: string }>(
  items: T[],
  filter: DateFilterOption,
  customStartDate?: string,
  customEndDate?: string
): T[] => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  return items.filter(item => {
    const itemDate = new Date(item.created_at || item.registration_datetime || '');
    
    switch (filter) {
      case 'today':
        return itemDate >= today;
      
      case 'yesterday':
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        return itemDate >= yesterday && itemDate < today;
      
      case 'last7days':
        const last7Days = new Date(today);
        last7Days.setDate(last7Days.getDate() - 7);
        return itemDate >= last7Days;
      
      case 'custom':
        if (!customStartDate || !customEndDate) return true;
        const startDate = new Date(customStartDate);
        const endDate = new Date(customEndDate);
        endDate.setHours(23, 59, 59, 999); // Include the entire end date
        return itemDate >= startDate && itemDate <= endDate;
      
      case 'all':
      default:
        return true;
    }
  });
};

