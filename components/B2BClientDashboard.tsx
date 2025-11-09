import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { B2BRequestVisit } from './B2BRequestVisit';
import { B2BPrintReport } from './B2BPrintReport';
import { API_BASE_URL } from '../config/api';

interface LedgerEntry {
  id: number;
  client_id: number;
  visit_id: number | null;
  type: 'DEBIT' | 'CREDIT';
  amount: number;
  description: string;
  created_at: string;
}

type TabType = 'dashboard' | 'request-visit' | 'print-report';

export const B2BClientDashboard: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
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
        const ledgerResponse = await fetch(`${API_BASE_URL}/clients/${clientId}/ledger`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (ledgerResponse.ok) {
          const ledgerData = await ledgerResponse.json();
          console.log('✅ Ledger data received:', ledgerData.length, 'entries');
          console.log('📋 First entry:', ledgerData[0]);

          // SECURITY CHECK: Verify all entries belong to this client
          const invalidEntries = ledgerData.filter((entry: any) => entry.client_id !== parseInt(clientId));
          if (invalidEntries.length > 0) {
            console.error('🚨 SECURITY BREACH: Found entries for other clients!', invalidEntries);
            setError('Security error: Unauthorized data detected. Please contact support.');
            return;
          }

          console.log('✅ All entries verified for client:', clientId);
          setLedgerEntries(ledgerData);
        } else {
          console.error('❌ Failed to fetch ledger:', ledgerResponse.status);
          const errorText = await ledgerResponse.text();
          console.error('Error details:', errorText);
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

  // Render tab content
  const renderTabContent = () => {
    switch (activeTab) {
      case 'request-visit':
        return <B2BRequestVisit />;
      case 'print-report':
        return <B2BPrintReport />;
      case 'dashboard':
      default:
        return renderDashboard();
    }
  };

  const renderDashboard = () => (
    <div className="space-y-6">
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
      </div>

      {/* Transaction History */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-800">Transaction History</h2>
          <span className="text-sm text-gray-600 bg-blue-50 px-3 py-1 rounded-full">
            Client ID: {clientId}
          </span>
        </div>

        {ledgerEntries.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <svg
              className="mx-auto h-12 w-12 text-gray-400 mb-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <p>No transactions yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Client ID
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Debit
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Credit
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {ledgerEntries.map((entry) => {
                  const isOwnEntry = entry.client_id === parseInt(clientId);
                  return (
                    <tr
                      key={entry.id}
                      className={`hover:bg-gray-50 ${!isOwnEntry ? 'bg-red-50' : ''}`}
                    >
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {new Date(entry.created_at).toLocaleDateString('en-IN', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {entry.description}
                      </td>
                      <td className="px-4 py-3 text-center text-sm">
                        <span className={`px-2 py-1 rounded text-xs font-mono ${
                          isOwnEntry ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {entry.client_id}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-mono text-red-600">
                        {entry.type === 'DEBIT' ? parseFloat(entry.amount as any).toFixed(2) : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-mono text-green-600">
                        {entry.type === 'CREDIT' ? parseFloat(entry.amount as any).toFixed(2) : '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 rounded-lg shadow-lg">
        <h1 className="text-2xl font-bold mb-2">Welcome, {clientName}!</h1>
        <p className="text-blue-100">B2B Client Portal</p>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white rounded-lg shadow-md">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`${
                activeTab === 'dashboard'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setActiveTab('request-visit')}
              className={`${
                activeTab === 'request-visit'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
            >
              Request Visit
            </button>
            <button
              onClick={() => setActiveTab('print-report')}
              className={`${
                activeTab === 'print-report'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
            >
              Print Reports
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {renderTabContent()}
        </div>
      </div>

      {/* Old Balance Card - Now in renderDashboard */}
      <div style={{display: 'none'}} className="bg-white p-6 rounded-lg shadow-md border-l-4 border-blue-600">
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

      {/* Old Ledger Section - Now in renderDashboard */}
      <div style={{display: 'none'}} className="bg-white p-6 rounded-lg shadow-md">
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

      {/* Old Info Cards - Now replaced by tabs */}
      <div style={{display: 'none'}} className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

      {/* Old Help Section */}
      <div style={{display: 'none'}} className="bg-gray-50 p-6 rounded-lg border border-gray-200">
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

