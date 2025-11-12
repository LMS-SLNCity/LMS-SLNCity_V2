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

  // Only show SAMPLE_COLLECTED tests for result entry (not IN_PROGRESS)
  const pendingResults = visitTests.filter(test => test.status === 'SAMPLE_COLLECTED');
  const processedTests = visitTests.filter(test => ['IN_PROGRESS', 'AWAITING_APPROVAL', 'APPROVED'].includes(test.status)).sort((a, b) => new Date(b.collectedAt!).getTime() - new Date(a.collectedAt!).getTime());

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
      <div className="bg-white p-8 rounded-xl shadow-lg space-y-8 max-w-6xl mx-auto">
        <h2 className="text-2xl font-bold text-gray-800 border-b pb-4">Lab Queue</h2>
        
        {/* Pending Results Section */}
        <div>
          <h3 className="text-lg font-semibold text-gray-700 mb-4">Pending Results Entry</h3>
          {pendingResults.length > 0 ? (
            <div className="overflow-x-auto border rounded-lg">
              <table className="min-w-full bg-white">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Visit Code</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Patient Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Test Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sample Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Collected At</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {pendingResults.map(test => (
                    <tr key={test.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{test.visitCode}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{test.patientName}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{test.template.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{test.specimen_type || 'N/A'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{new Date(test.collectedAt!).toLocaleString()}</td>
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
                          <>
                            <button
                              onClick={() => setSelectedTest(test)}
                              className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors text-xs"
                            >
                              Enter Results
                            </button>
                            <button
                              onClick={() => setRejectingSampleId(test.id)}
                              className="px-4 py-2 bg-red-600 text-white font-semibold rounded-lg shadow-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors text-xs"
                            >
                              Reject Sample
                            </button>
                          </>
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
          <h3 className="text-lg font-semibold text-gray-700 mb-4">Processed Tests (Awaiting Approval / Approved)</h3>
           {processedTests.length > 0 ? (
            <div className="overflow-x-auto border rounded-lg">
              <table className="min-w-full bg-white">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Visit Code</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Test Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {processedTests.map(test => {
                    const visit = findVisitForTest(test);
                    return (
                    <tr key={test.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{test.visitCode}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{test.template.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <StatusBadgeFromTest test={test} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {test.status === 'APPROVED' && visit && (
                          <button
                            onClick={() => onInitiateReport(visit)}
                            className="px-3 py-1 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors text-xs"
                          >
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
              <EmptyState title="No results awaiting approval" message="Once results are entered, they will appear here for approval." />
          )}
        </div>

      </div>
    </>
  );
};