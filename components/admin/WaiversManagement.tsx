import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../../config/api';

interface Waiver {
  id: number;
  client_id: number;
  client_name: string;
  waiver_amount: number;
  original_balance: number;
  amount_received: number;
  payment_mode: string;
  reason: string;
  description: string;
  created_at: string;
  created_by_username: string;
}

interface WaiverSummary {
  client_id: number;
  client_name: string;
  total_waivers: number;
  total_waiver_amount: number;
  total_original_balance: number;
  total_amount_received: number;
  last_waiver_date: string;
}

export const WaiversManagement: React.FC = () => {
  const [waivers, setWaivers] = useState<Waiver[]>([]);
  const [summary, setSummary] = useState<WaiverSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'list' | 'summary'>('list');

  useEffect(() => {
    fetchData();
  }, [view]);

  const fetchData = async () => {
    try {
      setLoading(true);

      if (view === 'list') {
        const response = await fetch(`${API_BASE_URL}/waivers`);
        const data = await response.json();
        setWaivers(data.waivers);
      } else {
        const response = await fetch(`${API_BASE_URL}/waivers/summary`);
        const data = await response.json();
        setSummary(data.summary);
      }
    } catch (error) {
      console.error('Error fetching waivers:', error);
      alert('Failed to load waivers data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-lg text-gray-600">Loading waivers...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">B2B Waivers & Discounts</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setView('list')}
            className={`px-4 py-2 rounded-lg font-medium ${
              view === 'list'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            All Waivers
          </button>
          <button
            onClick={() => setView('summary')}
            className={`px-4 py-2 rounded-lg font-medium ${
              view === 'summary'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Summary by Client
          </button>
        </div>
      </div>

      {/* List View */}
      {view === 'list' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Client</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Original Balance</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Received</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Waiver</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Payment Mode</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Reason</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {waivers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                      No waivers recorded yet
                    </td>
                  </tr>
                ) : (
                  waivers.map((waiver) => (
                    <tr key={waiver.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {new Date(waiver.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-800">
                        {waiver.client_name}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-gray-600">
                        ₹{parseFloat(waiver.original_balance.toString()).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-green-600 font-medium">
                        ₹{parseFloat(waiver.amount_received.toString()).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-red-600 font-bold">
                        ₹{parseFloat(waiver.waiver_amount.toString()).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {waiver.payment_mode}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate" title={waiver.reason}>
                        {waiver.reason}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {waiver.created_by_username || 'System'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Summary View */}
      {view === 'summary' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Client</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Total Waivers</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Total Waiver Amount</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Total Original</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Total Received</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Waiver %</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Last Waiver</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {summary.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                      No waiver data available
                    </td>
                  </tr>
                ) : (
                  summary.map((item) => {
                    const waiverPercentage = item.total_original_balance > 0
                      ? (item.total_waiver_amount / item.total_original_balance) * 100
                      : 0;

                    return (
                      <tr key={item.client_id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-800">
                          {item.client_name}
                        </td>
                        <td className="px-4 py-3 text-sm text-right text-gray-600">
                          {item.total_waivers || 0}
                        </td>
                        <td className="px-4 py-3 text-sm text-right text-red-600 font-bold">
                          ₹{parseFloat(item.total_waiver_amount?.toString() || '0').toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-sm text-right text-gray-600">
                          ₹{parseFloat(item.total_original_balance?.toString() || '0').toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-sm text-right text-green-600 font-medium">
                          ₹{parseFloat(item.total_amount_received?.toString() || '0').toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-sm text-right font-semibold">
                          <span className={waiverPercentage > 20 ? 'text-red-600' : waiverPercentage > 10 ? 'text-orange-600' : 'text-gray-600'}>
                            {waiverPercentage.toFixed(1)}%
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {item.last_waiver_date ? new Date(item.last_waiver_date).toLocaleDateString() : '-'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-blue-800 mb-2">ℹ️ About Waivers & Discounts</h3>
        <p className="text-sm text-blue-700">
          This section tracks all waivers and discounts given to B2B clients during settlement. 
          When a client pays less than the full outstanding amount, the difference is recorded here 
          as a waiver/discount for audit and reporting purposes.
        </p>
      </div>
    </div>
  );
};

