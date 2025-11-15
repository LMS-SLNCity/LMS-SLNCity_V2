import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { VisitTest, Visit } from '../types';
import { useAuth } from '../context/AuthContext';
import { SampleCollectionModal } from './SampleCollectionModal';
import { BarcodeModal } from './BarcodeModal';
import { CancelTestModal } from './CancelTestModal';
import { StatusBadgeFromTest } from './StatusBadge';
import { DateFilter, DateFilterOption, filterByDate } from './DateFilter';
import { API_BASE_URL } from '../config/api';
import {
  Syringe,
  Search,
  User,
  Clock,
  CheckCircle2,
  XCircle,
  FileText,
  AlertCircle,
  Droplet,
  Barcode,
  X
} from 'lucide-react';

interface PhlebotomyQueueProps {
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


export const PhlebotomyQueue: React.FC<PhlebotomyQueueProps> = ({ onInitiateReport }) => {
  const { visits, visitTests, updateVisitTestStatus, loadVisits, loadVisitTests } = useAppContext();
  const { user } = useAuth();
  const [collectingTest, setCollectingTest] = useState<VisitTest | null>(null);
  const [barcodeTest, setBarcodeTest] = useState<VisitTest | null>(null);
  const [cancellingTest, setCancellingTest] = useState<VisitTest | null>(null);
  const [rejectingSampleId, setRejectingSampleId] = useState<number | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittingTestId, setSubmittingTestId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilterOption>('today');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // LAZY LOADING: Load data only when this component mounts
  useEffect(() => {
    console.log('📦 PhlebotomyQueue: Loading required data...');
    Promise.all([
      loadVisits(),
      loadVisitTests(),
    ]).then(() => {
      console.log('✅ PhlebotomyQueue: Data loaded');
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

  // Pending samples - show ALL pending regardless of date filter
  const allPendingSamples = visitTests.filter(test => test.status === 'PENDING');
  // Rejected samples - show ALL rejected regardless of date filter (high priority!)
  const allRejectedSamples = visitTests.filter(test => test.status === 'REJECTED').sort((a, b) => new Date(b.last_rejection_at!).getTime() - new Date(a.last_rejection_at!).getTime());
  const allCancelledSamples = dateFilteredTests.filter(test => test.status === 'CANCELLED').sort((a, b) => new Date(b.updated_at!).getTime() - new Date(a.updated_at!).getTime());
  const allCollectedSamples = dateFilteredTests.filter(test => ['SAMPLE_COLLECTED', 'AWAITING_APPROVAL', 'APPROVED', 'IN_PROGRESS'].includes(test.status) && test.status !== 'PRINTED').sort((a, b) => new Date(b.collectedAt!).getTime() - new Date(a.collectedAt!).getTime());

  const pendingSamples = filterTests(allPendingSamples);
  const rejectedSamples = filterTests(allRejectedSamples);
  const cancelledSamples = filterTests(allCancelledSamples);
  const collectedSamples = filterTests(allCollectedSamples);

  const handleInitiateCollection = (testId: number) => {
    if (!user) {
        alert("User session has expired. Please log in again.");
        return;
    }
    const test = visitTests.find(t => t.id === testId);
    if (!test) {
        alert("Test not found");
        return;
    }
    // Allow collection for PENDING (new samples) and REJECTED (recollection)
    if (test.status !== 'PENDING' && test.status !== 'REJECTED') {
        alert(`Cannot collect sample. Test status is ${test.status}. Only PENDING or REJECTED tests can have samples collected.`);
        return;
    }
    setCollectingTest(test);
  };

  const handleConfirmCollection = async (sampleType: string) => {
    if (!user || !collectingTest || isSubmitting) return;

    setIsSubmitting(true);
    setSubmittingTestId(collectingTest.id);

    // Close modal immediately for better UX
    const testToCollect = collectingTest;
    setCollectingTest(null);

    try {
      await updateVisitTestStatus(testToCollect.id, 'SAMPLE_COLLECTED', user, {
        collectedBy: user.username,
        specimen_type: sampleType
      });
    } catch (error) {
      console.error('Error collecting sample:', error);
      alert('Failed to collect sample. Please try again.');
    } finally {
      setIsSubmitting(false);
      setSubmittingTestId(null);
    }
  };

  const handleRejectSample = async (testId: number) => {
    if (!user) {
      alert("User session has expired. Please log in again.");
      return;
    }
    if (!rejectionReason.trim()) {
      alert("Please provide a reason for rejecting the sample.");
      return;
    }
    if (isSubmitting) return;

    const test = visitTests.find(t => t.id === testId);
    const visit = test ? visits.find(v => v.id === test.visitId) : null;

    setIsSubmitting(true);
    setSubmittingTestId(testId);

    try {
      // Use the same rejection endpoint as lab for consistency
      // This will set status to REJECTED, increment rejection_count, and update last_rejection_at
      const response = await fetch(`${API_BASE_URL}/visit-tests/${testId}/reject-sample`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rejectionReason: `B2B Sample Rejected at Phlebotomy: ${rejectionReason.trim()}`,
          rejectedBy: user.username,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to reject sample');
      }

      if (visit && visit.ref_customer_id) {
        alert(`B2B sample rejected. Client will be notified to re-draw the sample.\nVisit: ${visit.visit_code}\nReason: ${rejectionReason}`);
      } else {
        alert('Sample rejected successfully.');
      }

      setRejectingSampleId(null);
      setRejectionReason('');

      // No need to reload - optimistic update already handled it
    } catch (error) {
      console.error('Error rejecting sample:', error);
      alert('Failed to reject sample. Please try again.');
    } finally {
      setIsSubmitting(false);
      setSubmittingTestId(null);
    }
  };

  const handleCancelTest = async (testId: number, cancelReason: string, cancelledBy: string) => {
    try {
      const token = sessionStorage.getItem('authToken') || localStorage.getItem('authToken');
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

  const findVisitForTest = (test: VisitTest): Visit | undefined => {
    return visits.find(v => v.id === test.visitId);
  }

  return (
    <>
      {collectingTest && (
        <SampleCollectionModal
          test={collectingTest}
          onClose={() => setCollectingTest(null)}
          onConfirm={handleConfirmCollection}
          isSubmitting={isSubmitting}
        />
      )}
      {barcodeTest && (
        <BarcodeModal
          test={barcodeTest}
          onClose={() => setBarcodeTest(null)}
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
      {/* Header */}
      <div className="border-b border-gray-200 bg-gradient-to-r from-slate-50 to-gray-50 px-6 py-5">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-red-600 rounded-lg">
              <Syringe className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Phlebotomy Queue</h2>
              <p className="text-sm text-gray-500 mt-0.5">Sample collection and management</p>
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by visit code, patient, or test..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all w-96"
            />
          </div>
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

      {/* Pending Samples Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-900">Pending for Collection</h3>
          </div>
          <div className="flex items-center gap-2 px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full">
            <span className="text-sm font-semibold">{pendingSamples.length}</span>
            <span className="text-xs">Pending</span>
          </div>
        </div>
        {pendingSamples.length > 0 ? (
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
                {pendingSamples.map(test => (
                  <tr key={test.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-blue-600">{test.visitCode}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-400" />
                        <span className="text-sm font-medium text-gray-900">{test.patientName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">{test.template.name}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      <StatusBadgeFromTest test={test} />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleInitiateCollection(test.id)}
                          className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 transition-colors"
                        >
                          <Droplet className="h-4 w-4" />
                          Collect Sample
                        </button>
                        <button
                          onClick={() => setBarcodeTest(test)}
                          className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-600 text-white text-sm font-medium rounded-md hover:bg-gray-700 transition-colors"
                          title="Generate barcode for sample"
                        >
                          <Barcode className="h-4 w-4" />
                        </button>
                        {user && ['SUDO', 'ADMIN'].includes(user.role) && (
                          <button
                            onClick={() => setCancellingTest(test)}
                            className="inline-flex items-center gap-2 px-3 py-1.5 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 transition-colors"
                            title="Cancel test (Admin only)"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="No pending samples"
            message="When a new visit is created, tests awaiting sample collection will appear here."
            icon={<Clock className="h-16 w-16" />}
          />
        )}
      </div>

      {/* Rejected Samples Section */}
      {rejectedSamples.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <h3 className="text-lg font-semibold text-red-700">Rejected Samples - Recollection Required</h3>
          </div>
          <div className="overflow-hidden border-2 border-red-200 rounded-lg bg-red-50">
            <table className="min-w-full divide-y divide-red-200">
              <thead className="bg-red-100">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Visit Code</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Patient Name</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Test Name</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Rejected At</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Rejection Count</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-red-200 bg-white">
                {rejectedSamples.map(test => (
                  <tr key={test.id} className="hover:bg-red-50 transition-colors">
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
                      {test.last_rejection_at ? new Date(test.last_rejection_at).toLocaleString() : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 font-bold">
                      {test.rejection_count || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => handleInitiateCollection(test.id)}
                        className="px-4 py-2 bg-orange-600 text-white font-semibold rounded-lg shadow-md hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-colors text-xs"
                      >
                        Recollect Sample
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
      {cancelledSamples.length > 0 && (
        <div>
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
                {cancelledSamples.map(test => (
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

      {/* Recently Collected Section */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <CheckCircle2 className="h-5 w-5 text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900">Recently Collected / In Progress</h3>
        </div>
         {collectedSamples.length > 0 ? (
          <div className="overflow-hidden border border-gray-200 rounded-lg">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Visit Code</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Test Name</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Sample Type</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Collected At</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {collectedSamples.map(test => {
                  const visit = findVisitForTest(test);
                  const isB2BSample = visit?.ref_customer_id;
                  return (
                  <tr key={test.id} className={`hover:bg-gray-50 transition-colors ${isB2BSample ? 'bg-blue-50' : ''}`}>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-blue-600">
                      {test.visitCode}
                      {isB2BSample && <span className="ml-2 text-xs text-blue-700 font-semibold">(B2B)</span>}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">{test.template.name}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{test.specimen_type || 'N/A'}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-sm text-gray-600">
                          <Clock className="h-4 w-4 text-gray-400" />
                          {test.collectedAt ? new Date(test.collectedAt).toLocaleString() : 'N/A'}
                        </div>
                    </td>
                     <td className="px-4 py-3 whitespace-nowrap text-sm">
                      <StatusBadgeFromTest test={test} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex gap-2">
                        {test.status === 'SAMPLE_COLLECTED' && isB2BSample ? (
                          rejectingSampleId === test.id ? (
                            <div className="flex flex-col space-y-2">
                              <textarea
                                value={rejectionReason}
                                onChange={(e) => setRejectionReason(e.target.value)}
                                placeholder="Reason for rejection (e.g., hemolyzed, insufficient, damaged in transit)"
                                rows={2}
                                className="w-64 px-2 py-1 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                              />
                              <div className="flex space-x-2">
                                <button
                                  onClick={() => handleRejectSample(test.id)}
                                  disabled={isSubmitting && submittingTestId === test.id}
                                  className="px-3 py-1 bg-red-600 text-white font-semibold rounded-lg shadow-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  {isSubmitting && submittingTestId === test.id ? '⏳ Rejecting...' : 'Confirm Reject'}
                                </button>
                                <button
                                  onClick={() => {
                                    setRejectingSampleId(null);
                                    setRejectionReason('');
                                  }}
                                  disabled={isSubmitting}
                                  className="px-3 py-1 bg-gray-300 text-gray-700 font-semibold rounded-lg shadow-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button
                              onClick={() => setRejectingSampleId(test.id)}
                              className="px-4 py-2 bg-red-600 text-white font-semibold rounded-lg shadow-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors text-xs"
                            >
                              Reject B2B Sample
                            </button>
                          )
                        ) : test.status === 'APPROVED' && visit ? (
                          <button
                            onClick={() => onInitiateReport(visit)}
                            className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
                          >
                            <FileText className="h-4 w-4" />
                            View Report
                          </button>
                        ) : null}
                        <button
                          onClick={() => setBarcodeTest(test)}
                          className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-600 text-white text-sm font-medium rounded-md hover:bg-gray-700 transition-colors"
                          title="Generate barcode for sample"
                        >
                          <Barcode className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
            <EmptyState
              title="No samples collected yet"
              message="Collected samples will appear in this list."
              icon={<CheckCircle2 className="h-16 w-16" />}
            />
        )}
      </div>

      </div>
      </div>
    </>
  );
};