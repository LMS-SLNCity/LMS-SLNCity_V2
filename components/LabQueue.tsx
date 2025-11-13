import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { Visit, VisitTest } from '../types';
import { ResultEntryForm } from './ResultEntryForm';
import { StatusBadgeFromTest } from './StatusBadge';
import { API_BASE_URL } from '../config/api';

interface LabQueueProps {
  onInitiateReport: (visit: Visit) => void;
}

const EmptyState: React.FC<{ title: string; message: string }> = ({ title, message }) => (
    <div className="text-center py-12">
        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-gray-900">{title}</h3>
        <p className="mt-1 text-sm text-gray-500">{message}</p>
    </div>
);


export const LabQueue: React.FC<LabQueueProps> = ({ onInitiateReport }) => {
  const { visits, visitTests, updateVisitTestStatus, loadVisits, loadVisitTests, loadAntibiotics, loadUnits } = useAppContext();
  const { user } = useAuth();
  const [selectedTest, setSelectedTest] = useState<VisitTest | null>(null);
  const [rejectingSampleId, setRejectingSampleId] = useState<number | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

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

  // Only show SAMPLE_COLLECTED tests for result entry (not IN_PROGRESS or PRINTED)
  const allPendingResults = visitTests.filter(test => test.status === 'SAMPLE_COLLECTED');
  const allProcessedTests = visitTests.filter(test => ['IN_PROGRESS', 'AWAITING_APPROVAL', 'APPROVED'].includes(test.status) && test.status !== 'PRINTED').sort((a, b) => new Date(b.collectedAt!).getTime() - new Date(a.collectedAt!).getTime());

  const pendingResults = filterTests(allPendingResults);
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

  return (
    <>
      {selectedTest && (
        <ResultEntryForm
          test={selectedTest}
          onClose={() => setSelectedTest(null)}
        />
      )}
      <div className="bg-white rounded-xl shadow-lg max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-8 py-6 rounded-t-xl">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-3xl font-bold">🧪 Lab Queue</h2>
              <p className="text-blue-100 mt-1">Enter test results and manage samples</p>
            </div>
            <div className="bg-white/20 backdrop-blur-sm px-6 py-3 rounded-lg">
              <div className="text-sm text-blue-100">Pending Results</div>
              <div className="text-3xl font-bold">{pendingResults.length}</div>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="px-8 py-4 bg-gray-50 border-b">
          <input
            type="text"
            placeholder="🔍 Search by visit code, patient name, or test name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div className="p-8 space-y-8">
          {/* Pending Results Section */}
          <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-gray-800">📝 Pending Results Entry</h3>
            <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold">
              {pendingResults.length} {pendingResults.length === 1 ? 'test' : 'tests'}
            </span>
          </div>
          {pendingResults.length > 0 ? (
            <div className="overflow-x-auto border rounded-lg shadow-sm">
              <table className="min-w-full bg-white">
                <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Visit Code</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Patient Name</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Test Name</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Sample Type</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Collected At</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {pendingResults.map(test => (
                    <tr key={test.id} className="hover:bg-blue-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-bold text-blue-600">{test.visitCode}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-semibold text-gray-900">{test.patientName}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-700">{test.template.name}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                          {test.specimen_type || 'N/A'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {new Date(test.collectedAt!).toLocaleString('en-IN', {
                          dateStyle: 'short',
                          timeStyle: 'short'
                        })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
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
                              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-lg shadow-md hover:shadow-lg hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all text-sm"
                            >
                              ✏️ Enter Results
                            </button>
                            <button
                              onClick={() => setRejectingSampleId(test.id)}
                              className="px-4 py-2 bg-gradient-to-r from-red-600 to-red-700 text-white font-semibold rounded-lg shadow-md hover:shadow-lg hover:from-red-700 hover:to-red-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-all text-sm"
                            >
                              ❌ Reject
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState title="No samples pending results" message="When samples are collected by phlebotomy, they will appear here." />
          )}
          </div>

          {/* Processed Tests Section */}
          <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-gray-800">✅ Processed Tests</h3>
            <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-semibold">
              {processedTests.length} {processedTests.length === 1 ? 'test' : 'tests'}
            </span>
          </div>
           {processedTests.length > 0 ? (
            <div className="overflow-x-auto border rounded-lg shadow-sm">
              <table className="min-w-full bg-white">
                <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Visit Code</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Patient Name</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Test Name</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {processedTests.map(test => {
                    const visit = findVisitForTest(test);
                    return (
                    <tr key={test.id} className="hover:bg-green-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-bold text-blue-600">{test.visitCode}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-semibold text-gray-900">{test.patientName}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-700">{test.template.name}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <StatusBadgeFromTest test={test} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {test.status === 'APPROVED' && visit && (
                          <button
                            onClick={() => onInitiateReport(visit)}
                            className="px-4 py-2 bg-gradient-to-r from-green-600 to-green-700 text-white font-semibold rounded-lg shadow-md hover:shadow-lg hover:from-green-700 hover:to-green-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-all text-sm"
                          >
                            📄 View Report
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
              <EmptyState title="No results awaiting approval" message="Once results are entered, they will appear here for approval." />
          )}
          </div>
        </div>
      </div>
    </>
  );
};