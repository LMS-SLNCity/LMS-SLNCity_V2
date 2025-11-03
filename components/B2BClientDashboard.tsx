import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

interface LedgerEntry {
  id: number;
  client_id: number;
  visit_id: number | null;
  type: 'DEBIT' | 'CREDIT';
  amount: number;
  description: string;
  created_at: string;
}

export const B2BClientDashboard: React.FC = () => {
  const { user } = useAuth();
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const clientId = (user as any)?.clientId;
  const clientName = (user as any)?.clientName;
  const balance = (user as any)?.balance || 0;

  console.log('🏢 B2B Client Dashboard - User:', user);
  console.log('🏢 Client ID:', clientId);
  console.log('🏢 Client Name:', clientName);
  console.log('🏢 Balance:', balance);

  useEffect(() => {
    const fetchData = async () => {
      if (!clientId) {
        console.error('❌ No client ID found in user object');
        setError('Client ID not found. Please login again.');
        setLoading(false);
        return;
      }

      try {
        const token = sessionStorage.getItem('authToken') || localStorage.getItem('authToken');

        console.log('📡 Fetching ledger for client:', clientId);

        // Fetch ledger entries
        const ledgerResponse = await fetch(`http://localhost:5001/api/clients/${clientId}/ledger`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (ledgerResponse.ok) {
          const ledgerData = await ledgerResponse.json();
          console.log('✅ Ledger data received:', ledgerData.length, 'entries');
          setLedgerEntries(ledgerData);
        } else {
          console.error('❌ Failed to fetch ledger:', ledgerResponse.status);
          setError('Failed to load transaction history');
        }
      } catch (error) {
        console.error('❌ Error fetching data:', error);
        setError('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [clientId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">
          <h3 className="font-semibold mb-2">Error Loading Dashboard</h3>
          <p>{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }

  if (!clientId || !clientName) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 p-4 rounded-lg">
          <h3 className="font-semibold mb-2">Session Error</h3>
          <p>Client information not found. Please login again.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 rounded-lg shadow-lg">
        <h1 className="text-2xl font-bold mb-2">Welcome, {clientName}!</h1>
        <p className="text-blue-100">B2B Client Portal</p>
      </div>

      {/* Balance Card */}
      <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-blue-600">
        <h2 className="text-lg font-semibold text-gray-700 mb-2">Current Balance</h2>
        <div className="flex items-baseline gap-2">
          <span className={`text-4xl font-bold ${balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
            ₹{balance.toFixed(2)}
          </span>
          {balance > 0 && (
            <span className="text-sm text-gray-500">(Outstanding)</span>
          )}
        </div>
        {balance > 0 && (
          <p className="mt-2 text-sm text-gray-600">
            Please contact admin to settle your outstanding balance.
          </p>
        )}
      </div>

      {/* Ledger Section */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Transaction History</h2>
        
        {ledgerEntries.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No transactions found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Description</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Debit (₹)</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Credit (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {ledgerEntries.map((entry, index) => (
                  <tr key={entry.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                      {new Date(entry.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-800">
                      {entry.description}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-mono text-red-600">
                      {entry.type === 'DEBIT' ? parseFloat(entry.amount as any).toFixed(2) : '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-mono text-green-600">
                      {entry.type === 'CREDIT' ? parseFloat(entry.amount as any).toFixed(2) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <h3 className="font-semibold text-blue-900 mb-2">📋 Request Visit</h3>
          <p className="text-sm text-blue-700">Coming soon: Request new visits directly from your dashboard.</p>
        </div>
        
        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <h3 className="font-semibold text-green-900 mb-2">📄 View Reports</h3>
          <p className="text-sm text-green-700">Coming soon: View and print approved test reports.</p>
        </div>
        
        <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
          <h3 className="font-semibold text-purple-900 mb-2">💳 Payment History</h3>
          <p className="text-sm text-purple-700">View all your transactions in the ledger above.</p>
        </div>
      </div>

      {/* Help Section */}
      <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
        <h3 className="font-semibold text-gray-800 mb-3">Need Help?</h3>
        <p className="text-sm text-gray-600 mb-2">
          For any queries or assistance, please contact the admin team.
        </p>
        <div className="flex gap-4 text-sm">
          <div>
            <span className="font-medium text-gray-700">Phone:</span>
            <span className="text-gray-600 ml-2">Contact Admin</span>
          </div>
          <div>
            <span className="font-medium text-gray-700">Email:</span>
            <span className="text-gray-600 ml-2">Contact Admin</span>
          </div>
        </div>
      </div>
    </div>
  );
};

