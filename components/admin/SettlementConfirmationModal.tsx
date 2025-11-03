import React, { useState } from 'react';
import { Client } from '../../types';

interface SettlementConfirmationModalProps {
  client: Client;
  onConfirm: (paymentMode: string, description: string, receivedAmount?: number) => void;
  onCancel: () => void;
}

export const SettlementConfirmationModal: React.FC<SettlementConfirmationModalProps> = ({
  client,
  onConfirm,
  onCancel,
}) => {
  const [paymentMode, setPaymentMode] = useState<string>('BANK_TRANSFER');
  const [description, setDescription] = useState<string>('');
  const [receivedAmount, setReceivedAmount] = useState<string>(client.balance.toFixed(2));
  const [waiverReason, setWaiverReason] = useState<string>('');

  const receivedAmountNum = parseFloat(receivedAmount) || 0;
  const waiverAmount = client.balance - receivedAmountNum;
  const hasWaiver = waiverAmount > 0.01; // More than 1 paisa difference

  const handleConfirm = () => {
    const enteredAmount = parseFloat(receivedAmount);

    // Validate received amount
    if (isNaN(enteredAmount) || enteredAmount <= 0) {
      alert('Please enter a valid received amount');
      return;
    }

    if (enteredAmount > client.balance) {
      alert(`Received amount cannot exceed outstanding balance of ₹${client.balance.toFixed(2)}`);
      return;
    }

    if (!description.trim()) {
      alert('Please provide a payment reference/description');
      return;
    }

    // If there's a waiver, require reason
    if (hasWaiver && !waiverReason.trim()) {
      alert('Please provide a reason for the waiver/discount');
      return;
    }

    const fullDescription = `${paymentMode} - ${description.trim()}${hasWaiver ? ` | Waiver: ${waiverReason.trim()}` : ''}`;
    onConfirm(paymentMode, fullDescription, receivedAmountNum);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-6 py-4 rounded-t-lg">
          <h2 className="text-xl font-bold text-white">Settle Balance Confirmation</h2>
        </div>

        <div className="p-6 space-y-4">
          {/* Client Info */}
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <p className="text-sm text-gray-600 mb-1">Client Name</p>
            <p className="text-lg font-semibold text-gray-800">{client.name}</p>
            
            <p className="text-sm text-gray-600 mt-3 mb-1">Outstanding Balance</p>
            <p className="text-2xl font-bold text-red-600">₹{client.balance.toFixed(2)}</p>
          </div>

          {/* Payment Mode */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Payment Mode <span className="text-red-500">*</span>
            </label>
            <select
              value={paymentMode}
              onChange={(e) => setPaymentMode(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="BANK_TRANSFER">Bank Transfer</option>
              <option value="CHEQUE">Cheque</option>
              <option value="CASH">Cash</option>
              <option value="UPI">UPI</option>
              <option value="CARD">Card</option>
              <option value="NEFT">NEFT</option>
              <option value="RTGS">RTGS</option>
              <option value="IMPS">IMPS</option>
              <option value="OTHER">Other</option>
            </select>
          </div>

          {/* Received Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Amount Received (₹) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              value={receivedAmount}
              onChange={(e) => setReceivedAmount(e.target.value)}
              placeholder="Enter amount received"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Outstanding balance: ₹{client.balance.toFixed(2)}
            </p>
          </div>

          {/* Waiver/Discount Display */}
          {hasWaiver && (
            <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-3">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-yellow-800">Waiver/Discount Amount:</span>
                <span className="text-lg font-bold text-yellow-900">₹{waiverAmount.toFixed(2)}</span>
              </div>
              <p className="text-xs text-yellow-700">
                This amount will be written off and tracked separately
              </p>
            </div>
          )}

          {/* Waiver Reason (only if there's a waiver) */}
          {hasWaiver && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Waiver/Discount Reason <span className="text-red-500">*</span>
              </label>
              <textarea
                value={waiverReason}
                onChange={(e) => setWaiverReason(e.target.value)}
                placeholder="e.g., Negotiated discount, Goodwill gesture, Long-term client discount, etc."
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Required when settling with less than full amount
              </p>
            </div>
          )}

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description / Reference <span className="text-red-500">*</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g., Ref# 123456, Check# 789, Transaction ID, etc."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Provide payment reference, check number, or transaction details
            </p>
          </div>

          {/* Warning */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-red-800">
              <strong>⚠️ Warning:</strong> This will settle the balance to ₹0 and mark all unpaid visits as paid.
              {hasWaiver && <span className="block mt-1">A waiver of ₹{waiverAmount.toFixed(2)} will be recorded and tracked separately.</span>}
              <span className="block mt-1 font-semibold">This action cannot be undone.</span>
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="bg-gray-50 px-6 py-4 rounded-b-lg flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-medium"
          >
            Confirm Settlement
          </button>
        </div>
      </div>
    </div>
  );
};

