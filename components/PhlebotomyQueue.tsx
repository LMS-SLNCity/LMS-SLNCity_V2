import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { VisitTest, Visit } from '../types';
import { useAuth } from '../context/AuthContext';
import { SampleCollectionModal } from './SampleCollectionModal';

interface PhlebotomyQueueProps {
  onInitiateReport: (visit: Visit) => void;
}

const StatusBadge: React.FC<{ status: VisitTest['status'] }> = ({ status }) => {
  const baseClasses = "px-2.5 py-0.5 text-xs font-medium rounded-full";
  const statusMap = {
    PENDING: "bg-yellow-100 text-yellow-800",
    SAMPLE_COLLECTED: "bg-green-100 text-green-800",
    APPROVED: "bg-blue-100 text-blue-800",
    AWAITING_APPROVAL: "bg-purple-100 text-purple-800",
  };
  const colorClasses = statusMap[status as keyof typeof statusMap] || "bg-gray-100 text-gray-800";
  
  return (
    <span className={`${baseClasses} ${colorClasses}`}>
      {status.replace('_', ' ')}
    </span>
  );
};

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
  const { visits, visitTests, updateVisitTestStatus } = useAppContext();
  const { user } = useAuth();
  const [collectingTest, setCollectingTest] = useState<VisitTest | null>(null);

  const pendingSamples = visitTests.filter(test => test.status === 'PENDING');
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
    if (test.status !== 'PENDING') {
        alert(`Cannot collect sample. Test status is ${test.status}. Only PENDING tests can have samples collected.`);
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
                      <StatusBadge status={test.status} />
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Collected At</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {collectedSamples.map(test => {
                  const visit = findVisitForTest(test);
                  return (
                  <tr key={test.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{test.visitCode}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{test.template.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {test.collectedAt ? new Date(test.collectedAt).toLocaleString() : 'N/A'}
                    </td>
                     <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <StatusBadge status={test.status} />
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
            <EmptyState title="No samples collected yet" message="Collected samples will appear in this list." />
        )}
      </div>

      </div>
    </>
  );
};