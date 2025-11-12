import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { VisitTest, Visit } from '../types';
import { useAuth } from '../context/AuthContext';
import { SampleCollectionModal } from './SampleCollectionModal';
import { StatusBadgeFromTest } from './StatusBadge';
import { API_BASE_URL } from '../config/api';

interface PhlebotomyQueueProps {
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


export const PhlebotomyQueue: React.FC<PhlebotomyQueueProps> = ({ onInitiateReport }) => {
  const { visits, visitTests, updateVisitTestStatus, loadVisits, loadVisitTests } = useAppContext();
  const { user } = useAuth();
  const [collectingTest, setCollectingTest] = useState<VisitTest | null>(null);
  const [rejectingSampleId, setRejectingSampleId] = useState<number | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

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

  const pendingSamples = visitTests.filter(test => test.status === 'PENDING');
  const rejectedSamples = visitTests.filter(test => test.status === 'REJECTED').sort((a, b) => new Date(b.last_rejection_at!).getTime() - new Date(a.last_rejection_at!).getTime());
  const collectedSamples = visitTests.filter(test => ['SAMPLE_COLLECTED', 'AWAITING_APPROVAL', 'APPROVED', 'IN_PROGRESS'].includes(test.status)).sort((a, b) => new Date(b.collectedAt!).getTime() - new Date(a.collectedAt!).getTime());

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
    if (!user || !collectingTest) return;

    await updateVisitTestStatus(collectingTest.id, 'SAMPLE_COLLECTED', user, {
      collectedBy: user.username,
      specimen_type: sampleType
    });
    setCollectingTest(null);
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

    const test = visitTests.find(t => t.id === testId);
    const visit = test ? visits.find(v => v.id === test.visitId) : null;

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

      // Reload data to show updated status
      await loadVisitTests();
    } catch (error) {
      console.error('Error rejecting sample:', error);
      alert('Failed to reject sample. Please try again.');
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
        />
      )}
      <div className="bg-white p-8 rounded-xl shadow-lg space-y-8 max-w-6xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-800 border-b pb-4">Phlebotomy Queue</h2>
      
      {/* Pending Samples Section */}
      <div>
        <h3 className="text-lg font-semibold text-gray-700 mb-4">Pending for Collection</h3>
        {pendingSamples.length > 0 ? (
          <div className="overflow-x-auto border rounded-lg">
            <table className="min-w-full bg-white">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Visit Code</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Patient Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Test Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {pendingSamples.map(test => (
                  <tr key={test.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{test.visitCode}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{test.patientName}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{test.template.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <StatusBadgeFromTest test={test} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => handleInitiateCollection(test.id)}
                        className="px-4 py-2 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors text-xs"
                      >
                        Collect Sample
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="No pending samples" message="When a new visit is created, tests awaiting sample collection will appear here." />
        )}
      </div>

      {/* Rejected Samples Section */}
      {rejectedSamples.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-red-700 mb-4">⚠️ Rejected Samples - Recollection Required</h3>
          <div className="overflow-x-auto border-2 border-red-300 rounded-lg bg-red-50">
            <table className="min-w-full bg-white">
              <thead className="bg-red-100">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Visit Code</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Patient Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Test Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rejected At</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rejection Count</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {rejectedSamples.map(test => (
                  <tr key={test.id} className="hover:bg-red-100">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{test.visitCode}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{test.patientName}</td>
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

      {/* Recently Collected Section */}
      <div>
        <h3 className="text-lg font-semibold text-gray-700 mb-4">Recently Collected / In Progress</h3>
         {collectedSamples.length > 0 ? (
          <div className="overflow-x-auto border rounded-lg">
            <table className="min-w-full bg-white">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Visit Code</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Test Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sample Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Collected At</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {collectedSamples.map(test => {
                  const visit = findVisitForTest(test);
                  const isB2BSample = visit?.ref_customer_id;
                  return (
                  <tr key={test.id} className={`hover:bg-gray-50 ${isB2BSample ? 'bg-blue-50' : ''}`}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {test.visitCode}
                      {isB2BSample && <span className="ml-2 text-xs text-blue-600 font-semibold">(B2B)</span>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{test.template.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{test.specimen_type || 'N/A'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {test.collectedAt ? new Date(test.collectedAt).toLocaleString() : 'N/A'}
                    </td>
                     <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <StatusBadgeFromTest test={test} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
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
                          className="px-3 py-1 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors text-xs"
                        >
                          View Report
                        </button>
                      ) : null}
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
            <EmptyState title="No samples collected yet" message="Collected samples will appear in this list." />
        )}
      </div>

      </div>
    </>
  );
};