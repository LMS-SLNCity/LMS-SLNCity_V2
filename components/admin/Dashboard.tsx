import React, { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import { useAppContext } from '../../context/AppContext';
import { VisitTest } from '../../types';
import {
  Activity,
  DollarSign,
  TestTube,
  Users,
  Clock,
  CheckCircle,
  FlaskConical,
  ClipboardList,
  X,
  TrendingUp,
  TrendingDown,
  BarChart3
} from 'lucide-react';

interface DashboardMetrics {
  totalVisits: number;
  totalRevenue: number;
  totalTests: number;
  totalClients: number;
  pendingTests: number;
  approvedTests: number;
}

interface RevenueData {
  byPaymentMode: any[];
  byClient: any[];
  dailyRevenue: any[];
}

interface TestData {
  byTemplate: any[];
  byStatus: any[];
  byCategory: any[];
}

interface ClientData {
  clients: any[];
  ledgerSummary: any[];
}

interface TrendData {
  visitsTrend: any[];
  testsTrend: any[];
  averageRevenue: any;
}

interface QueuePopupProps {
  title: string;
  tests: VisitTest[];
  onClose: () => void;
}

// Queue Popup Component
const QueuePopup: React.FC<QueuePopupProps> = ({ title, tests, onClose }) => {
  const { visits } = useAppContext();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[80vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-700 to-slate-800 text-white px-6 py-4 flex justify-between items-center">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button onClick={onClose} className="text-white hover:text-gray-300 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(80vh-80px)]">
          {tests.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No tests in this queue</p>
          ) : (
            <table className="min-w-full bg-white border border-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Visit Code</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Patient Name</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Test Name</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Ref. Doctor</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {tests.map((test) => {
                  const visit = visits.find(v => v.id === test.visitId);
                  const refDoctor = visit?.referred_doctor_name || visit?.other_ref_doctor || 'N/A';
                  const timeAgo = test.collectedAt
                    ? new Date(test.collectedAt).toLocaleString('en-GB', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })
                    : 'N/A';

                  return (
                    <tr key={test.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-blue-600">{test.visitCode}</td>
                      <td className="px-4 py-3 text-sm text-gray-800">{test.patientName}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{test.template.name}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{refDoctor}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{timeAgo}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export const Dashboard: React.FC = () => {
  const { visitTests } = useAppContext();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [revenue, setRevenue] = useState<RevenueData | null>(null);
  const [tests, setTests] = useState<TestData | null>(null);
  const [clients, setClients] = useState<ClientData | null>(null);
  const [trends, setTrends] = useState<TrendData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [queuePopup, setQueuePopup] = useState<{ title: string; tests: VisitTest[] } | null>(null);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('🔄 Fetching dashboard data...');

      const [metricsData, revenueData, testsData, clientsData, trendsData] = await Promise.all([
        apiClient.getDashboardOverview(),
        apiClient.getDashboardRevenue(),
        apiClient.getDashboardTests(),
        apiClient.getDashboardClients(),
        apiClient.getDashboardTrends(),
      ]);

      console.log('✅ Dashboard data fetched:', {
        metrics: metricsData,
        revenue: revenueData,
        tests: testsData,
        clients: clientsData,
        trends: trendsData,
      });

      setMetrics(metricsData);
      setRevenue(revenueData);
      setTests(testsData);
      setClients(clientsData);
      setTrends(trendsData);
    } catch (err) {
      console.error('❌ Error fetching dashboard data:', err);
      setError('Failed to load dashboard data: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchDashboardData();
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-lg text-gray-600">Loading dashboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">{error}</p>
      </div>
    );
  }

  return (
    <>
      {/* Queue Popup */}
      {queuePopup && (
        <QueuePopup
          title={queuePopup.title}
          tests={queuePopup.tests}
          onClose={() => setQueuePopup(null)}
        />
      )}

      <div className="space-y-6">
        {/* Header with Refresh Button */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-lg">
              <BarChart3 className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
              <p className="text-sm text-gray-500">Overview of laboratory operations</p>
            </div>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-sm font-medium"
          >
            <svg
              className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

      {/* Overview Metrics */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <MetricCard
            title="Total Visits"
            value={metrics.totalVisits}
            color="blue"
            icon={<Activity className="h-5 w-5" />}
          />
          <MetricCard
            title="Total Revenue"
            value={`₹${metrics.totalRevenue.toFixed(2)}`}
            color="green"
            icon={<DollarSign className="h-5 w-5" />}
          />
          <MetricCard
            title="Total Tests"
            value={metrics.totalTests}
            color="blue"
            icon={<TestTube className="h-5 w-5" />}
          />
          <MetricCard
            title="B2B Clients"
            value={metrics.totalClients}
            color="blue"
            icon={<Users className="h-5 w-5" />}
          />
          <MetricCard
            title="Pending Tests"
            value={metrics.pendingTests}
            color="orange"
            icon={<Clock className="h-5 w-5" />}
          />
          <MetricCard
            title="Approved Tests"
            value={metrics.approvedTests}
            color="green"
            icon={<CheckCircle className="h-5 w-5" />}
          />
        </div>
      )}

      {/* Queue Status Containers - Click to view details */}
      {tests && tests.byStatus && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Phlebotomy Queue */}
          <QueueCard
            title="Phlebotomy Queue"
            description="Samples awaiting collection"
            count={tests.byStatus.find((s: any) => s.status === 'PENDING')?.count || 0}
            color="yellow"
            icon={<ClipboardList className="h-6 w-6" />}
            onClick={() => {
              const pendingTests = visitTests.filter(t => t.status === 'PENDING');
              setQueuePopup({
                title: 'Phlebotomy Queue - Samples Awaiting Collection',
                tests: pendingTests
              });
            }}
          />

          {/* Lab Queue */}
          <QueueCard
            title="Laboratory Queue"
            description="Samples collected, awaiting results"
            count={
              Number(tests.byStatus.find((s: any) => s.status === 'SAMPLE_COLLECTED')?.count || 0) +
              Number(tests.byStatus.find((s: any) => s.status === 'IN_PROGRESS')?.count || 0)
            }
            color="blue"
            icon={<FlaskConical className="h-6 w-6" />}
            onClick={() => {
              const labTests = visitTests.filter(t => t.status === 'SAMPLE_COLLECTED' || t.status === 'IN_PROGRESS');
              setQueuePopup({
                title: 'Laboratory Queue - Samples Collected, Awaiting Results',
                tests: labTests
              });
            }}
          />

          {/* Approver Queue */}
          <QueueCard
            title="Approver Queue"
            description="Results awaiting approval"
            count={tests.byStatus.find((s: any) => s.status === 'AWAITING_APPROVAL')?.count || 0}
            color="green"
            icon={<CheckCircle className="h-6 w-6" />}
            onClick={() => {
              const approvalTests = visitTests.filter(t => t.status === 'AWAITING_APPROVAL');
              setQueuePopup({
                title: 'Approver Queue - Results Awaiting Approval',
                tests: approvalTests
              });
            }}
          />
        </div>
      )}

      {/* Revenue Section */}
      {revenue && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Revenue Insights</h3>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Payment Mode Distribution */}
            <div>
              <h4 className="font-medium text-gray-700 mb-3">By Payment Mode</h4>
              <div className="space-y-2">
                {revenue.byPaymentMode.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                    <span className="text-sm text-gray-600">{item.payment_mode || 'Unknown'}</span>
                    <span className="font-medium">₹{parseFloat(item.revenue).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Clients */}
            <div>
              <h4 className="font-medium text-gray-700 mb-3">Top B2B Clients (by Balance)</h4>
              <div className="space-y-2">
                {revenue.byClient.slice(0, 5).map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                    <span className="text-sm text-gray-600">{item.name}</span>
                    <div className="flex flex-col items-end">
                      <span className={`font-medium ${parseFloat(item.balance || 0) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        ₹{parseFloat(item.balance || 0).toFixed(2)}
                      </span>
                      <span className="text-xs text-gray-500">Revenue: ₹{parseFloat(item.total_revenue || 0).toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tests Section */}
      {tests && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Test Analytics</h3>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* By Status */}
            <div>
              <h4 className="font-medium text-gray-700 mb-3">By Status</h4>
              <div className="space-y-2">
                {tests.byStatus.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                    <span className="text-sm text-gray-600">{item.status}</span>
                    <span className="font-medium">{item.count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* By Category */}
            <div>
              <h4 className="font-medium text-gray-700 mb-3">By Category</h4>
              <div className="space-y-2">
                {tests.byCategory.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                    <span className="text-sm text-gray-600">{item.category || 'Unknown'}</span>
                    <span className="font-medium">{item.count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Tests */}
            <div>
              <h4 className="font-medium text-gray-700 mb-3">Top Tests</h4>
              <div className="space-y-2">
                {tests.byTemplate.slice(0, 5).map((item, idx) => {
                  const params = typeof item.parameters === 'string' ? JSON.parse(item.parameters) : item.parameters;
                  const fieldCount = params?.fields?.length || 0;
                  return (
                    <div key={idx} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                      <div className="flex-1">
                        <span className="text-sm text-gray-600 font-medium">{item.name}</span>
                        {fieldCount > 0 && (
                          <p className="text-xs text-gray-500 mt-1">{fieldCount} parameters</p>
                        )}
                      </div>
                      <span className="font-medium text-blue-600">{item.count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* B2B Clients Section */}
      {clients && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">B2B Client Performance</h3>
          
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Client Name</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Visits</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Revenue</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Balance</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Pending Dues</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {clients.clients.map((client, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-sm text-gray-800">{client.name}</td>
                    <td className="px-4 py-2 text-sm text-gray-600">{client.visit_count || 0}</td>
                    <td className="px-4 py-2 text-sm text-gray-600">₹{parseFloat(client.total_revenue || 0).toFixed(2)}</td>
                    <td className="px-4 py-2 text-sm font-medium">
                      <span className={client.balance > 0 ? 'text-red-600' : 'text-green-600'}>
                        ₹{parseFloat(client.balance).toFixed(2)}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-600">₹{parseFloat(client.pending_dues || 0).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Trends Section */}
      {trends && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Business Trends (Last 30 Days)</h3>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Average Revenue */}
            <div className="p-4 bg-blue-50 rounded-lg">
              <h4 className="font-medium text-gray-700 mb-2">Average Revenue Per Visit</h4>
              <p className="text-2xl font-bold text-blue-600">₹{parseFloat(trends.averageRevenue.avg_revenue || 0).toFixed(2)}</p>
              <p className="text-sm text-gray-600 mt-1">Min: ₹{parseFloat(trends.averageRevenue.min_revenue || 0).toFixed(2)}</p>
              <p className="text-sm text-gray-600">Max: ₹{parseFloat(trends.averageRevenue.max_revenue || 0).toFixed(2)}</p>
            </div>

            {/* Recent Activity */}
            <div>
              <h4 className="font-medium text-gray-700 mb-3">Recent Activity</h4>
              <div className="space-y-2">
                {trends.visitsTrend.slice(-5).reverse().map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                    <span className="text-sm text-gray-600">{item.date}</span>
                    <span className="font-medium">{item.count} visits</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </>
  );
};

// Metric Card Component
const MetricCard: React.FC<{
  title: string;
  value: string | number;
  color?: string;
  icon: React.ReactNode;
  trend?: { value: number; isPositive: boolean };
}> = ({
  title,
  value,
  color = 'blue',
  icon,
  trend,
}) => {
  const colorClasses = {
    blue: {
      bg: 'bg-white',
      border: 'border-gray-200',
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      title: 'text-gray-600',
      value: 'text-gray-900',
    },
    orange: {
      bg: 'bg-white',
      border: 'border-gray-200',
      iconBg: 'bg-orange-100',
      iconColor: 'text-orange-600',
      title: 'text-gray-600',
      value: 'text-gray-900',
    },
    green: {
      bg: 'bg-white',
      border: 'border-gray-200',
      iconBg: 'bg-green-100',
      iconColor: 'text-green-600',
      title: 'text-gray-600',
      value: 'text-gray-900',
    },
  };

  const colors = colorClasses[color as keyof typeof colorClasses];

  return (
    <div className={`${colors.bg} border ${colors.border} rounded-lg p-5 shadow-sm hover:shadow-md transition-all`}>
      <div className="flex items-center justify-between mb-4">
        <div className={`p-2.5 rounded-lg ${colors.iconBg}`}>
          <div className={colors.iconColor}>
            {icon}
          </div>
        </div>
        {trend && (
          <div className={`flex items-center gap-1 text-sm font-medium ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
            {trend.isPositive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
            {Math.abs(trend.value)}%
          </div>
        )}
      </div>
      <p className={`text-sm font-medium ${colors.title} mb-1`}>{title}</p>
      <p className={`text-2xl font-bold ${colors.value}`}>{value}</p>
    </div>
  );
};

// Queue Card Component
const QueueCard: React.FC<{
  title: string;
  description: string;
  count: number;
  color: 'yellow' | 'blue' | 'green';
  icon: React.ReactNode;
  onClick: () => void;
}> = ({ title, description, count, color, icon, onClick }) => {
  const colorClasses = {
    yellow: {
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      hover: 'hover:border-amber-300 hover:shadow-md',
      iconBg: 'bg-amber-100',
      iconColor: 'text-amber-600',
      countColor: 'text-amber-600',
    },
    blue: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      hover: 'hover:border-blue-300 hover:shadow-md',
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      countColor: 'text-blue-600',
    },
    green: {
      bg: 'bg-emerald-50',
      border: 'border-emerald-200',
      hover: 'hover:border-emerald-300 hover:shadow-md',
      iconBg: 'bg-emerald-100',
      iconColor: 'text-emerald-600',
      countColor: 'text-emerald-600',
    },
  };

  const colors = colorClasses[color];

  return (
    <button
      onClick={onClick}
      className={`w-full p-5 rounded-lg border transition-all cursor-pointer text-left ${colors.bg} ${colors.border} ${colors.hover}`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className={`p-2.5 rounded-lg ${colors.iconBg}`}>
          <div className={colors.iconColor}>
            {icon}
          </div>
        </div>
        <span className={`text-3xl font-bold ${colors.countColor}`}>
          {count}
        </span>
      </div>
      <h4 className="text-base font-semibold text-gray-900 mb-1">{title}</h4>
      <p className="text-sm text-gray-600">{description}</p>
      <p className="text-xs text-gray-500 mt-3 flex items-center gap-1">
        Click to view details
        <span className="text-gray-400">→</span>
      </p>
    </button>
  );
};

