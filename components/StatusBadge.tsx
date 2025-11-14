import React from 'react';
import type { VisitTest, VisitTestStatus } from '../types';

interface StatusBadgeProps {
  status: VisitTestStatus;
  rejectionCount?: number;
  lastRejectionAt?: string;
  showRejectionIndicator?: boolean;
}

/**
 * StatusBadge Component
 * 
 * Displays a color-coded badge for test status with optional rejection indicator.
 * 
 * Features:
 * - Color-coded status badges
 * - Red border and icon for rejected samples
 * - Tooltip showing rejection details
 * - Responsive design
 * 
 * Status Colors:
 * - PENDING: Gray
 * - SAMPLE_COLLECTED: Blue
 * - REJECTED: Red
 * - IN_PROGRESS: Yellow
 * - AWAITING_APPROVAL: Orange
 * - APPROVED: Green
 * - COMPLETED: Purple
 * 
 * Rejection Indicator:
 * - Shows red border and ⚠️ icon when rejection_count > 0
 * - Tooltip shows rejection count and last rejection time
 */
export const StatusBadge: React.FC<StatusBadgeProps> = ({ 
  status, 
  rejectionCount = 0, 
  lastRejectionAt,
  showRejectionIndicator = true 
}) => {
  const baseClasses = "px-2 py-0.5 text-xs font-medium rounded-full inline-flex items-center gap-1";
  
  // Status color mapping
  const statusMap: Record<VisitTestStatus, string> = {
    'PENDING': 'bg-gray-200 text-gray-700',
    'SAMPLE_COLLECTED': 'bg-blue-200 text-blue-700',
    'REJECTED': 'bg-red-200 text-red-700',
    'CANCELLED': 'bg-gray-300 text-gray-800 line-through',
    'IN_PROGRESS': 'bg-yellow-200 text-yellow-700',
    'AWAITING_APPROVAL': 'bg-orange-200 text-orange-700',
    'APPROVED': 'bg-green-200 text-green-700',
    'COMPLETED': 'bg-purple-200 text-purple-700',
    'PRINTED': 'bg-purple-200 text-purple-700',
  };

  const colorClasses = statusMap[status] || 'bg-gray-200 text-gray-700';
  
  // Check if sample has been rejected
  const hasRejection = showRejectionIndicator && !!rejectionCount && rejectionCount > 0;
  
  // Add red border for rejected samples
  const rejectionClasses = hasRejection ? 'ring-2 ring-red-500 ring-offset-1' : '';
  
  // Format rejection tooltip
  const rejectionTooltip = hasRejection 
    ? `⚠️ Rejected ${rejectionCount} time(s)${lastRejectionAt ? `\nLast: ${new Date(lastRejectionAt).toLocaleString()}` : ''}`
    : undefined;

  return (
    <span 
      className={`${baseClasses} ${colorClasses} ${rejectionClasses}`}
      title={rejectionTooltip}
    >
      {hasRejection && <span className="text-red-600 font-bold">⚠️</span>}
      {status.replace(/_/g, ' ')}
    </span>
  );
};

/**
 * Helper function to create StatusBadge from VisitTest
 */
export const StatusBadgeFromTest: React.FC<{ test: VisitTest }> = ({ test }) => {
  return (
    <StatusBadge 
      status={test.status}
      rejectionCount={test.rejection_count}
      lastRejectionAt={test.last_rejection_at}
    />
  );
};

