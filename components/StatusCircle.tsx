import React from 'react';
import type { VisitTest, VisitTestStatus } from '../types';

interface StatusCircleProps {
  status: VisitTestStatus;
  rejectionCount?: number;
  lastRejectionAt?: string;
  showRejectionIndicator?: boolean;
  showTAT?: boolean;
  createdAt?: string;
  collectedAt?: string;
  approvedAt?: string;
}

/**
 * StatusCircle Component
 * 
 * Displays a color-coded circle for test status with optional TAT (Turnaround Time).
 * 
 * Features:
 * - Color-coded status circles
 * - Red border for rejected samples
 * - TAT calculation and display
 * - Tooltip showing status details
 * 
 * Status Colors:
 * - PENDING: Gray
 * - SAMPLE_COLLECTED: Blue
 * - REJECTED: Red
 * - IN_PROGRESS: Yellow
 * - AWAITING_APPROVAL: Orange
 * - APPROVED: Green
 * - COMPLETED: Purple
 */
export const StatusCircle: React.FC<StatusCircleProps> = ({ 
  status, 
  rejectionCount = 0, 
  lastRejectionAt,
  showRejectionIndicator = true,
  showTAT = false,
  createdAt,
  collectedAt,
  approvedAt
}) => {
  // Status color mapping
  const statusColorMap: Record<VisitTestStatus, string> = {
    'PENDING': 'bg-gray-400',
    'SAMPLE_COLLECTED': 'bg-blue-500',
    'REJECTED': 'bg-red-500',
    'IN_PROGRESS': 'bg-yellow-500',
    'AWAITING_APPROVAL': 'bg-orange-500',
    'APPROVED': 'bg-green-500',
    'PRINTED': 'bg-teal-500',
    'COMPLETED': 'bg-purple-500',
  };

  const statusLabelMap: Record<VisitTestStatus, string> = {
    'PENDING': 'Pending',
    'SAMPLE_COLLECTED': 'Collected',
    'REJECTED': 'Rejected',
    'IN_PROGRESS': 'In Progress',
    'AWAITING_APPROVAL': 'Awaiting Approval',
    'APPROVED': 'Approved',
    'COMPLETED': 'Completed',
  };

  const colorClass = statusColorMap[status] || 'bg-gray-400';
  const label = statusLabelMap[status] || status;
  
  // Check if sample has been rejected
  const hasRejection = showRejectionIndicator && !!rejectionCount && rejectionCount > 0;
  
  // Calculate TAT (Turnaround Time)
  const calculateTAT = (): string | null => {
    if (!showTAT) return null;
    
    let startTime: Date | null = null;
    let endTime: Date | null = null;

    // Determine start and end times based on status
    if (status === 'PENDING' && createdAt) {
      startTime = new Date(createdAt);
      endTime = new Date();
    } else if (status === 'SAMPLE_COLLECTED' && collectedAt) {
      startTime = new Date(collectedAt);
      endTime = new Date();
    } else if ((status === 'IN_PROGRESS' || status === 'AWAITING_APPROVAL') && collectedAt) {
      startTime = new Date(collectedAt);
      endTime = new Date();
    } else if (status === 'APPROVED' && collectedAt && approvedAt) {
      startTime = new Date(collectedAt);
      endTime = new Date(approvedAt);
    }

    if (!startTime || !endTime) return null;

    const diffMs = endTime.getTime() - startTime.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (diffHours > 24) {
      const days = Math.floor(diffHours / 24);
      const hours = diffHours % 24;
      return `${days}d ${hours}h`;
    } else if (diffHours > 0) {
      return `${diffHours}h ${diffMinutes}m`;
    } else {
      return `${diffMinutes}m`;
    }
  };

  const tat = calculateTAT();
  
  // Format tooltip
  const tooltip = `${label}${hasRejection ? ` (⚠️ Rejected ${rejectionCount}x)` : ''}${tat ? `\nTAT: ${tat}` : ''}`;

  return (
    <div className="inline-flex items-center gap-2" title={tooltip}>
      <div className="relative">
        <div 
          className={`w-3 h-3 rounded-full ${colorClass} ${hasRejection ? 'ring-2 ring-red-600 ring-offset-1' : ''}`}
        />
        {hasRejection && (
          <span className="absolute -top-1 -right-1 text-red-600 text-xs font-bold">⚠</span>
        )}
      </div>
      {showTAT && tat && (
        <span className="text-xs text-gray-600 font-medium">{tat}</span>
      )}
    </div>
  );
};

/**
 * StatusCircleFromTest Component
 * 
 * Wrapper component that extracts status info from a VisitTest object
 */
interface StatusCircleFromTestProps {
  test: VisitTest;
  showTAT?: boolean;
}

export const StatusCircleFromTest: React.FC<StatusCircleFromTestProps> = ({ test, showTAT = false }) => {
  return (
    <StatusCircle
      status={test.status}
      rejectionCount={test.rejection_count}
      lastRejectionAt={test.last_rejection_at}
      showTAT={showTAT}
      collectedAt={test.collectedAt}
      approvedAt={test.approvedAt}
    />
  );
};

