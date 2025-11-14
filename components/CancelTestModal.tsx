import React, { useState } from 'react';
import { VisitTest } from '../types';
import { X } from 'lucide-react';

interface CancelTestModalProps {
  test: VisitTest;
  onClose: () => void;
  onConfirm: (testId: number, cancelReason: string, cancelledBy: string) => Promise<void>;
  username: string;
}

/**
 * CancelTestModal Component
 * 
 * Modal for cancelling tests that won't be performed.
 * Requires a reason for cancellation and logs the action in audit trail.
 * 
 * Features:
 * - Displays test and patient information
 * - Requires mandatory cancellation reason
 * - Confirms action before cancelling
 * - Shows loading state during cancellation
 */
export const CancelTestModal: React.FC<CancelTestModalProps> = ({
  test,
  onClose,
  onConfirm,
  username,
}) => {
  const [cancelReason, setCancelReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!cancelReason.trim()) {
      setError('Cancellation reason is required');
      return;
    }

    if (cancelReason.trim().length < 10) {
      setError('Please provide a detailed reason (at least 10 characters)');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onConfirm(test.id, cancelReason.trim(), username);
      onClose();
    } catch (err) {
      console.error('Error cancelling test:', err);
      setError('Failed to cancel test. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800">Cancel Test</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={isSubmitting}
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6">
          {/* Test Information */}
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h3 className="text-sm font-semibold text-yellow-800 mb-2">⚠️ Warning</h3>
            <p className="text-sm text-yellow-700 mb-3">
              You are about to cancel this test. This action will mark the test as CANCELLED and it will not be performed.
            </p>
            <div className="space-y-1 text-sm">
              <p><span className="font-medium">Patient:</span> {test.patientName}</p>
              <p><span className="font-medium">Visit Code:</span> {test.visitCode}</p>
              <p><span className="font-medium">Test:</span> {test.template.name} ({test.template.code})</p>
              <p><span className="font-medium">Current Status:</span> <span className="px-2 py-0.5 bg-gray-200 text-gray-700 rounded text-xs">{test.status}</span></p>
            </div>
          </div>

          {/* Cancellation Reason */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Cancellation Reason <span className="text-red-500">*</span>
            </label>
            <textarea
              value={cancelReason}
              onChange={(e) => {
                setCancelReason(e.target.value);
                setError(null);
              }}
              placeholder="Please provide a detailed reason for cancelling this test (e.g., patient request, test not available, duplicate order, etc.)"
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
              disabled={isSubmitting}
              required
            />
            <p className="mt-1 text-xs text-gray-500">
              Minimum 10 characters required. This will be logged in the audit trail.
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isSubmitting || !cancelReason.trim()}
            >
              {isSubmitting ? 'Cancelling...' : 'Confirm Cancellation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

