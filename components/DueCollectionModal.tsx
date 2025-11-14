import React, { useState } from 'react';
import { Visit } from '../types';
import { DollarSign, AlertCircle, CreditCard, Banknote, Smartphone } from 'lucide-react';

interface DueCollectionModalProps {
  visit: Visit;
  onClose: () => void;
  onPaymentCollected: () => void;
}

export const DueCollectionModal: React.FC<DueCollectionModalProps> = ({ visit, onClose, onPaymentCollected }) => {
  const [paymentMode, setPaymentMode] = useState<'Cash' | 'Card' | 'UPI'>('Cash');
  const [amountToCollect, setAmountToCollect] = useState(visit.due_amount.toString());
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const amount = parseFloat(amountToCollect);
    if (isNaN(amount) || amount <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    if (amount > visit.due_amount) {
      alert(`Amount cannot exceed due amount of ₹${visit.due_amount.toFixed(2)}`);
      return;
    }

    setIsSubmitting(true);

    try {
      const authToken = localStorage.getItem('authToken');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/visits/${visit.id}/collect-due`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          amount,
          payment_mode: paymentMode
        })
      });

      if (!response.ok) {
        throw new Error('Failed to collect payment');
      }

      alert(`Payment of ₹${amount.toFixed(2)} collected successfully via ${paymentMode}`);
      onPaymentCollected();
    } catch (error) {
      alert(`Failed to collect payment: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md transform transition-all">
        <form onSubmit={handleSubmit}>
          <div className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-red-100 rounded-lg">
                <AlertCircle className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900" id="modal-title">Outstanding Payment Due</h3>
                <p className="text-sm text-gray-500 mt-0.5">Collect payment before generating report</p>
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-yellow-800">
                <strong>Patient:</strong> {visit.patient.name}
              </p>
              <p className="text-sm text-yellow-800">
                <strong>Visit Code:</strong> {visit.visit_code}
              </p>
              <p className="text-sm text-yellow-800 mt-2">
                <strong>Total Cost:</strong> ₹{visit.total_cost.toFixed(2)}
              </p>
              <p className="text-sm text-yellow-800">
                <strong>Amount Paid:</strong> ₹{visit.amount_paid.toFixed(2)}
              </p>
              <p className="text-lg font-bold text-red-700 mt-2">
                <strong>Due Amount:</strong> ₹{visit.due_amount.toFixed(2)}
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Amount to Collect (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max={visit.due_amount}
                  value={amountToCollect}
                  onChange={(e) => setAmountToCollect(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Mode
                </label>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setPaymentMode('Cash')}
                    className={`flex flex-col items-center justify-center p-3 border-2 rounded-lg transition-all ${
                      paymentMode === 'Cash'
                        ? 'border-blue-600 bg-blue-50 text-blue-700'
                        : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                    }`}
                  >
                    <Banknote className="h-6 w-6 mb-1" />
                    <span className="text-xs font-medium">Cash</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMode('Card')}
                    className={`flex flex-col items-center justify-center p-3 border-2 rounded-lg transition-all ${
                      paymentMode === 'Card'
                        ? 'border-blue-600 bg-blue-50 text-blue-700'
                        : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                    }`}
                  >
                    <CreditCard className="h-6 w-6 mb-1" />
                    <span className="text-xs font-medium">Card</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMode('UPI')}
                    className={`flex flex-col items-center justify-center p-3 border-2 rounded-lg transition-all ${
                      paymentMode === 'UPI'
                        ? 'border-blue-600 bg-blue-50 text-blue-700'
                        : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                    }`}
                  >
                    <Smartphone className="h-6 w-6 mb-1" />
                    <span className="text-xs font-medium">UPI</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-xs text-blue-800">
                <strong>Note:</strong> Payment must be collected before the report can be generated and printed for walk-in patients.
              </p>
            </div>
          </div>

          <div className="bg-gray-50 px-6 py-4 flex justify-between items-center rounded-b-xl">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
            >
              {isSubmitting ? 'Processing...' : 'Collect Payment & Continue'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

