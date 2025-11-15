import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { Visit, VisitTest } from '../types';
import { ResultEntryForm } from './ResultEntryForm';
import { CancelTestModal } from './CancelTestModal';
import { StatusBadgeFromTest } from './StatusBadge';
import { DateFilter, DateFilterOption, filterByDate } from './DateFilter';
import { API_BASE_URL } from '../config/api';
import {
  FlaskConical,
  Search,
  FileText,
  XCircle,
  Edit3,
  Clock,
  User,
  Beaker,
  CheckCircle2,
  AlertCircle,
  X
} from 'lucide-react';

interface LabQueueProps {
  onInitiateReport: (visit: Visit) => void;
}

const EmptyState: React.FC<{ title: string; message: string; icon: React.ReactNode }> = ({ title, message, icon }) => (
    <div className="text-center py-16">
        <div className="mx-auto h-16 w-16 text-gray-300 mb-4 flex items-center justify-center">
            {icon}
        </div>
        <h3 className="text-base font-semibold text-gray-900 mb-1">{title}</h3>
        <p className="text-sm text-gray-500">{message}</p>
    </div>
);


export const LabQueue: React.FC<LabQueueProps> = ({ onInitiateReport }) => {
  const { visits, visitTests, updateVisitTestStatus, loadVisits, loadVisitTests, loadAntibiotics, loadUnits } = useAppContext();
  const { user } = useAuth();
  const [selectedTest, setSelectedTest] = useState<VisitTest | null>(null);
  const [cancellingTest, setCancellingTest] = useState<VisitTest | null>(null);
  const [rejectingSampleId, setRejectingSampleId] = useState<number | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilterOption>('today');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // LAZY LOADING: Load data only when this component mounts
  useEffect(() => {
    console.log('📦 LabQueue: Loading required data...');
    Promise.all([
      loadVisits(),
      loadVisitTests(),
      loadAntibiotics(),
      loadUnits(),
    ]).then(() => {
      console.log('✅ LabQueue: Data loaded');
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Filter function for search
  const filterTests = (tests: VisitTest[]) => {
    if (!searchQuery.trim()) return tests;
    const query = searchQuery.toLowerCase();
    return tests.filter(test =>
      test.visitCode.toLowerCase().includes(query) ||
      test.patientName.toLowerCase().includes(query) ||
      test.template.name.toLowerCase().includes(query)
    );
  };

  // Apply date filter first, then status filter
  const dateFilteredTests = filterByDate(visitTests, dateFilter, customStartDate, customEndDate);

  // Pending results - show ALL SAMPLE_COLLECTED tests regardless of date filter
  const allPendingResults = visitTests.filter(test => test.status === 'SAMPLE_COLLECTED');
  // Result rejections - show ALL tests with rejection_count > 0 and status IN_PROGRESS (high priority!)
  const allResultRejections = visitTests.filter(test => test.status === 'IN_PROGRESS' && test.rejection_count && test.rejection_count > 0).sort((a, b) => new Date(b.last_rejection_at!).getTime() - new Date(a.last_rejection_at!).getTime());
  const allCancelledTests = dateFilteredTests.filter(test => test.status === 'CANCELLED').sort((a, b) => new Date(b.updated_at!).getTime() - new Date(a.updated_at!).getTime());
  const allProcessedTests = dateFilteredTests.filter(test => ['IN_PROGRESS', 'AWAITING_APPROVAL', 'APPROVED'].includes(test.status) && test.status !== 'PRINTED' && !(test.status === 'IN_PROGRESS' && test.rejection_count && test.rejection_count > 0)).sort((a, b) => new Date(b.collectedAt!).getTime() - new Date(a.collectedAt!).getTime());

  const pendingResults = filterTests(allPendingResults);
  const resultRejections = filterTests(allResultRejections);
  const cancelledTests = filterTests(allCancelledTests);
  const processedTests = filterTests(allProcessedTests);

  const findVisitForTest = (test: VisitTest): Visit | undefined => {
    return visits.find(v => v.id === test.visitId);
  }

  const handleRejectSample = async (testId: number) => {
    if (!user) {
      alert("User session has expired. Please log in again.");
      return;
    }
    if (!rejectionReason.trim()) {
      alert("Please provide a reason for rejecting the sample.");
      return;
    }

    try {
      // Send sample to REJECTED status for phlebotomy to recollect
      // Backend will increment rejection_count and set last_rejection_at
      const response = await fetch(`${API_BASE_URL}/visit-tests/${testId}/reject-sample`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rejectionReason: rejectionReason.trim(),
          rejectedBy: user.username,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to reject sample');
      }

      alert('Sample rejected successfully. Phlebotomy will be notified to recollect the sample.');
      setRejectingSampleId(null);
      setRejectionReason('');

      // Reload data to show updated status
      await loadVisitTests();
    } catch (error) {
      console.error('Error rejecting sample:', error);
      alert('Failed to reject sample. Please try again.');
    }
  }

  const handleCancelTest = async (testId: number, cancelReason: string, cancelledBy: string) => {
    try {
      const token = localStorage.getItem('token');
      console.log('Cancelling test with token:', token ? 'Token exists' : 'No token found');
      console.log('User role:', user?.role);

      const response = await fetch(`${API_BASE_URL}/visit-tests/${testId}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          cancelReason,
          cancelledBy,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Cancel test failed:', response.status, errorData);
        throw new Error(errorData.error || 'Failed to cancel test');
      }

      // Reload data to reflect cancellation
      await loadVisitTests();
      await loadVisits();
    } catch (error) {
      console.error('Error cancelling test:', error);
      throw error;
    }
  };

  return (
    <>
      {selectedTest && (
        <ResultEntryForm
          test={selectedTest}
          onClose={() => setSelectedTest(null)}
        />
      )}
      {cancellingTest && (
        <CancelTestModal
          test={cancellingTest}
          onClose={() => setCancellingTest(null)}
          onConfirm={handleCancelTest}
          username={user?.username || 'Unknown'}
        />
      )}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="border-b border-gray-200 bg-gradient-to-r from-slate-50 to-gray-50 px-6 py-5">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-600 rounded-lg">
                <FlaskConical className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Laboratory Queue</h2>
                <p className="text-sm text-gray-500 mt-0.5">Enter test results and manage samples</p>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-right">
                <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Pending Results</div>
                <div className="text-2xl font-bold text-blue-600 mt-0.5">{pendingResults.length}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="px-6 py-4 bg-white border-b border-gray-100">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by visit code, patient name, or test name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Date Filter */}
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <DateFilter
              selectedFilter={dateFilter}
              onFilterChange={setDateFilter}
              customStartDate={customStartDate}
              customEndDate={customEndDate}
              onCustomDateChange={(start, end) => {
                setCustomStartDate(start);
                setCustomEndDate(end);
              }}
            />
          </div>

          {/* Pending Results Section */}
          <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Edit3 className="h-5 w-5 text-gray-600" />
              <h3 className="text-lg font-semibold text-gray-900">Pending Results Entry</h3>
            </div>
            <div className="flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-800 rounded-full">
              <span className="text-sm font-semibold">{pendingResults.length}</span>
              <span className="text-xs">Pending</span>
            </div>
          </div>
          {pendingResults.length > 0 ? (
            <div className="overflow-hidden border border-gray-200 rounded-lg">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Visit Code</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Patient Name</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Test Name</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Sample Type</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Collected At</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {pendingResults.map(test => (
                    <tr key={test.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-sm font-semibold text-blue-600">{test.visitCode}</span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-gray-400" />
                          <span className="text-sm font-medium text-gray-900">{test.patientName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-sm text-gray-700">{test.template.name}</span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200">
                          <Beaker className="h-3 w-3" />
                          {test.specimen_type || 'N/A'}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-sm text-gray-600">
                          <Clock className="h-4 w-4 text-gray-400" />
                          {new Date(test.collectedAt!).toLocaleString('en-IN', {
                            dateStyle: 'short',
                            timeStyle: 'short'
                          })}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm">
                        {rejectingSampleId === test.id ? (
                          <div className="flex flex-col space-y-2">
                            <textarea
                              value={rejectionReason}
                              onChange={(e) => setRejectionReason(e.target.value)}
                              placeholder="Reason for rejection (e.g., hemolyzed, insufficient quantity, clotted)"
                              rows={2}
                              className="w-64 px-2 py-1 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                            />
                            <div className="flex space-x-2">
                              <button
                                onClick={() => handleRejectSample(test.id)}
                                className="px-3 py-1 bg-red-600 text-white font-semibold rounded-lg shadow-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors text-xs"
                              >
                                Confirm Reject
                              </button>
                              <button
                                onClick={() => {
                                  setRejectingSampleId(null);
                                  setRejectionReason('');
                                }}
                                className="px-3 py-1 bg-gray-300 text-gray-700 font-semibold rounded-lg shadow-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors text-xs"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            <button
                              onClick={() => setSelectedTest(test)}
                              className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
                            >
                              <Edit3 className="h-4 w-4" />
                              Enter Results
                            </button>
                            <button
                              onClick={() => setRejectingSampleId(test.id)}
                              className="inline-flex items-center gap-2 px-3 py-1.5 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 transition-colors"
                            >
                              <XCircle className="h-4 w-4" />
                              Reject
                            </button>
                            {user && ['SUDO', 'ADMIN'].includes(user.role) && (
                              <button
                                onClick={() => setCancellingTest(test)}
                                className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-600 text-white text-sm font-medium rounded-md hover:bg-gray-700 transition-colors"
                                title="Cancel test (Admin only)"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              title="No samples pending results"
              message="When samples are collected by phlebotomy, they will appear here."
              icon={<AlertCircle className="h-16 w-16" />}
            />
          )}
          </div>

          {/* Result Rejections Section - Always show if there are any */}
          {resultRejections.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-4">
                <AlertCircle className="h-5 w-5 text-orange-600" />
                <h3 className="text-lg font-semibold text-orange-700">Results Rejected by Approver - Correction Required</h3>
              </div>
              <div className="overflow-hidden border-2 border-orange-200 rounded-lg bg-orange-50">
                <table className="min-w-full divide-y divide-orange-200">
                  <thead className="bg-orange-100">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Visit Code</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Patient Name</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Test Name</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Rejection Count</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Last Rejected</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-orange-200 bg-white">
                    {resultRejections.map(test => (
                      <tr key={test.id} className="hover:bg-orange-50 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-blue-600">{test.visitCode}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-gray-400" />
                            <span className="text-sm font-medium text-gray-900">{test.patientName}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="text-sm text-gray-700">{test.template.name}</span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-orange-100 text-orange-800 border border-orange-300">
                            ⚠️ {test.rejection_count} {test.rejection_count === 1 ? 'time' : 'times'}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-1.5 text-sm text-gray-600">
                            <Clock className="h-4 w-4 text-gray-400" />
                            {test.last_rejection_at ? new Date(test.last_rejection_at).toLocaleString('en-IN', {
                              dateStyle: 'short',
                              timeStyle: 'short'
                            }) : 'N/A'}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm">
                          <button
                            onClick={() => setSelectedTest(test)}
                            className="inline-flex items-center gap-2 px-3 py-1.5 bg-orange-600 text-white text-sm font-medium rounded-md hover:bg-orange-700 transition-colors"
                          >
                            <Edit3 className="h-4 w-4" />
                            Correct Results
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Cancelled Tests Section */}
          {cancelledTests.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-4">
                <XCircle className="h-5 w-5 text-gray-600" />
                <h3 className="text-lg font-semibold text-gray-700">Cancelled Tests</h3>
              </div>
              <div className="overflow-hidden border-2 border-gray-300 rounded-lg bg-gray-50">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Visit Code</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Patient Name</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Test Name</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Cancelled At</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {cancelledTests.map(test => (
                      <tr key={test.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-blue-600">{test.visitCode}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-gray-400" />
                            <span className="text-sm font-medium text-gray-900">{test.patientName}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{test.template.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <StatusBadgeFromTest test={test} />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {test.updated_at ? new Date(test.updated_at).toLocaleString() : 'N/A'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Processed Tests Section */}
          <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-gray-600" />
              <h3 className="text-lg font-semibold text-gray-900">Processed Tests</h3>
            </div>
            <span className="px-3 py-1.5 bg-green-50 text-green-700 rounded-md text-xs font-medium border border-green-200">
              {processedTests.length} {processedTests.length === 1 ? 'test' : 'tests'}
            </span>
          </div>
           {processedTests.length > 0 ? (
            <div className="overflow-hidden border border-gray-200 rounded-lg">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Visit Code</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Patient Name</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Test Name</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {processedTests.map(test => {
                    const visit = findVisitForTest(test);
                    return (
                    <tr key={test.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-sm font-semibold text-blue-600">{test.visitCode}</span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-gray-400" />
                          <span className="text-sm font-medium text-gray-900">{test.patientName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-sm text-gray-700">{test.template.name}</span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <StatusBadgeFromTest test={test} />
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {test.status === 'APPROVED' && visit && (
                          <button
                            onClick={() => onInitiateReport(visit)}
                            className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 transition-colors"
                          >
                            <FileText className="h-4 w-4" />
                            View Report
                          </button>
                        )}
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
              <EmptyState
                title="No processed tests"
                message="Once results are entered, they will appear here for approval."
                icon={<CheckCircle2 className="h-16 w-16" />}
              />
          )}
          </div>
        </div>
      </div>
    </>
  );
};