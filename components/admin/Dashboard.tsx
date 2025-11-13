import React, { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import { useAppContext } from '../../context/AppContext';
import { VisitTest } from '../../types';
import {
  Activity,
  TestTube,
  Users,
  Clock,
  CheckCircle,
  FlaskConical,
  ClipboardList,
  X,
  TrendingUp,
  TrendingDown,
  BarChart3,
  IndianRupee,
  XCircle,
  Calendar,
  RefreshCw
} from 'lucide-react';

interface DashboardMetrics {
  totalVisits: number;
  totalRevenue: number;
  totalTests: number;
  totalClients: number;
  pendingTests: number;
  approvedTests: number;
  rejectedTests: number;
  avgTatHours: number;
  collectionRate: number;
}

type TimeFilter = 'today' | 'week' | 'month' | 'ytd' | 'custom';

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

  // Time filter state
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('today');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Calculate date range based on filter
  const getDateRange = (): { startDate: string; endDate: string } => {
    const now = new Date();
    const endDate = now.toISOString();
    let startDate: Date;

    switch (timeFilter) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'ytd':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      case 'custom':
        if (customStartDate && customEndDate) {
          return { startDate: new Date(customStartDate).toISOString(), endDate: new Date(customEndDate).toISOString() };
        }
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    }

    return { startDate: startDate.toISOString(), endDate };
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('🔄 Fetching dashboard data...');

      const { startDate, endDate } = getDateRange();

      const [metricsData, revenueData, testsData, clientsData, trendsData] = await Promise.all([
        apiClient.getDashboardOverview(startDate, endDate),
        apiClient.getDashboardRevenue(startDate, endDate),
        apiClient.getDashboardTests(startDate, endDate),
        apiClient.getDashboardClients(),
        apiClient.getDashboardTrends(startDate, endDate),
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
  }, [timeFilter, customStartDate, customEndDate]);

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

  const getFilterLabel = () => {
    switch (timeFilter) {
      case 'today': return 'Today';
      case 'week': return 'Last 7 Days';
      case 'month': return 'This Month';
      case 'ytd': return 'Year to Date';
      case 'custom': return 'Custom Range';
      default: return 'Today';
    }
  };

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
        {/* Header with Time Filters and Refresh Button */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Laboratory Dashboard</h2>
              <p className="text-sm text-gray-500 mt-1">Comprehensive analytics and operations overview</p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              {/* Time Filter Buttons */}
              <div className="flex gap-2 flex-wrap">
                {(['today', 'week', 'month', 'ytd', 'custom'] as TimeFilter[]).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setTimeFilter(filter)}
                    className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                      timeFilter === filter
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {filter === 'today' && 'Today'}
                    {filter === 'week' && 'Week'}
                    {filter === 'month' && 'Month'}
                    {filter === 'ytd' && 'YTD'}
                    {filter === 'custom' && 'Custom'}
                  </button>
                ))}
              </div>

              {/* Refresh Button */}
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="flex items-center justify-center gap-2 px-4 py-1.5 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-sm font-medium"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                {refreshing ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>
          </div>

          {/* Custom Date Range Picker */}
          {timeFilter === 'custom' && (
            <div className="mt-4 flex gap-3 items-center">
              <Calendar className="h-5 w-5 text-gray-400" />
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="px-3 py-1.5 border border-gray-300 rounded-md text-sm"
              />
              <span className="text-gray-500">to</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="px-3 py-1.5 border border-gray-300 rounded-md text-sm"
              />
            </div>
          )}
        </div>

      {/* Overview Metrics */}
      {metrics && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Total Visits"
              value={metrics.totalVisits.toLocaleString('en-IN')}
              color="blue"
            />
            <MetricCard
              title="Total Revenue"
              value={`₹${metrics.totalRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              color="green"
            />
            <MetricCard
              title="Total Tests"
              value={metrics.totalTests.toLocaleString('en-IN')}
              color="blue"
            />
            <MetricCard
              title="B2B Clients"
              value={metrics.totalClients.toLocaleString('en-IN')}
              color="purple"
            />
          </div>

          {/* Performance Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <MetricCard
              title="Pending Tests"
              value={metrics.pendingTests.toLocaleString('en-IN')}
              color="orange"
            />
            <MetricCard
              title="Approved Tests"
              value={metrics.approvedTests.toLocaleString('en-IN')}
              color="green"
            />
            <MetricCard
              title="Rejected Tests"
              value={metrics.rejectedTests.toLocaleString('en-IN')}
              color="red"
            />
            <MetricCard
              title="Avg TAT"
              value={`${metrics.avgTatHours.toFixed(1)}h`}
              color="blue"
              subtitle="Turnaround Time"
            />
            <MetricCard
              title="Collection Rate"
              value={`${metrics.collectionRate.toFixed(1)}%`}
              color="green"
              subtitle="Tests Processed"
            />
          </div>
        </>
      )}

      {/* Queue Status Containers - Click to view details */}
      {tests && tests.byStatus && (
        <div>
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Workflow Queues</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Phlebotomy Queue */}
            <QueueCard
              title="Phlebotomy Queue"
              description="Samples awaiting collection"
              count={tests.byStatus.find((s: any) => s.status === 'PENDING')?.count || 0}
              color="yellow"
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
              onClick={() => {
                const approvalTests = visitTests.filter(t => t.status === 'AWAITING_APPROVAL');
                setQueuePopup({
                  title: 'Approver Queue - Results Awaiting Approval',
                  tests: approvalTests
                });
              }}
            />
          </div>
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
  subtitle?: string;
  trend?: { value: number; isPositive: boolean };
}> = ({
  title,
  value,
  color = 'blue',
  subtitle,
  trend,
}) => {
  const colorClasses = {
    blue: {
      bg: 'bg-white',
      border: 'border-blue-200',
      title: 'text-gray-600',
      value: 'text-blue-600',
    },
    orange: {
      bg: 'bg-white',
      border: 'border-orange-200',
      title: 'text-gray-600',
      value: 'text-orange-600',
    },
    green: {
      bg: 'bg-white',
      border: 'border-green-200',
      title: 'text-gray-600',
      value: 'text-green-600',
    },
    red: {
      bg: 'bg-white',
      border: 'border-red-200',
      title: 'text-gray-600',
      value: 'text-red-600',
    },
    purple: {
      bg: 'bg-white',
      border: 'border-purple-200',
      title: 'text-gray-600',
      value: 'text-purple-600',
    },
  };

  const colors = colorClasses[color as keyof typeof colorClasses];

  return (
    <div className={`${colors.bg} border-2 ${colors.border} rounded-lg p-5 shadow-sm hover:shadow-md transition-all`}>
      <div className="flex items-center justify-between mb-2">
        <p className={`text-sm font-medium ${colors.title}`}>{title}</p>
        {trend && (
          <div className={`flex items-center gap-1 text-xs font-medium ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
            {trend.isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {Math.abs(trend.value)}%
          </div>
        )}
      </div>
      <p className={`text-3xl font-bold ${colors.value} mb-1`}>{value}</p>
      {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
    </div>
  );
};

// Queue Card Component
const QueueCard: React.FC<{
  title: string;
  description: string;
  count: number;
  color: 'yellow' | 'blue' | 'green';
  onClick: () => void;
}> = ({ title, description, count, color, onClick }) => {
  const colorClasses = {
    yellow: {
      bg: 'bg-amber-50',
      border: 'border-amber-300',
      hover: 'hover:border-amber-400 hover:shadow-lg',
      countColor: 'text-amber-700',
    },
    blue: {
      bg: 'bg-blue-50',
      border: 'border-blue-300',
      hover: 'hover:border-blue-400 hover:shadow-lg',
      countColor: 'text-blue-700',
    },
    green: {
      bg: 'bg-emerald-50',
      border: 'border-emerald-300',
      hover: 'hover:border-emerald-400 hover:shadow-lg',
      countColor: 'text-emerald-700',
    },
  };

  const colors = colorClasses[color];

  return (
    <button
      onClick={onClick}
      className={`w-full p-6 rounded-lg border-2 transition-all cursor-pointer text-left ${colors.bg} ${colors.border} ${colors.hover}`}
    >
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-lg font-semibold text-gray-900">{title}</h4>
        <span className={`text-4xl font-bold ${colors.countColor}`}>
          {count}
        </span>
      </div>
      <p className="text-sm text-gray-600 mb-3">{description}</p>
      <p className="text-xs text-gray-500 flex items-center gap-1">
        Click to view details →
      </p>
    </button>
  );
};

