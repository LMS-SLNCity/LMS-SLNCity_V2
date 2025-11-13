import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { Visit, VisitTest } from '../types';
import { ApprovalModal } from './ApprovalModal';
import { StatusBadgeFromTest } from './StatusBadge';
import {
  CheckCircle,
  Search,
  User,
  Clock,
  FileCheck,
  AlertCircle,
  FileText
} from 'lucide-react';

interface ApproverQueueProps {
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


export const ApproverQueue: React.FC<ApproverQueueProps> = ({ onInitiateReport }) => {
  const { visits, visitTests, loadVisits, loadVisitTests, loadUsers } = useAppContext();
  const [selectedTest, setSelectedTest] = useState<VisitTest | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // LAZY LOADING: Load data only when this component mounts
  useEffect(() => {
    console.log('📦 ApproverQueue: Loading required data...');
    Promise.all([
      loadVisits(),
      loadVisitTests(),
      loadUsers(),
    ]).then(() => {
      console.log('✅ ApproverQueue: Data loaded');
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

  const allAwaitingApproval = visitTests.filter(test => test.status === 'AWAITING_APPROVAL');
  const allRecentlyApproved = visitTests.filter(test => test.status === 'APPROVED' || test.status === 'PRINTED').sort((a, b) => new Date(b.approvedAt!).getTime() - new Date(a.approvedAt!).getTime());

  const awaitingApproval = filterTests(allAwaitingApproval);
  const recentlyApproved = filterTests(allRecentlyApproved);

  const findVisitForTest = (test: VisitTest): Visit | undefined => {
    return visits.find(v => v.id === test.visitId);
  }

  return (
    <>
      {selectedTest && (
        <ApprovalModal
          test={selectedTest}
          onClose={() => setSelectedTest(null)}
        />
      )}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 max-w-7xl mx-auto">
        {/* Header */}
        <div className="border-b border-gray-200 bg-gradient-to-r from-slate-50 to-gray-50 px-6 py-5">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-green-600 rounded-lg">
                <FileCheck className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Approver Queue</h2>
                <p className="text-sm text-gray-500 mt-0.5">Review and approve test results</p>
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
        {/* Awaiting Approval Section */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Clock className="h-5 w-5 text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-900">Awaiting Final Approval</h3>
          </div>
          {awaitingApproval.length > 0 ? (
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
                  {awaitingApproval.map(test => (
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
                        <button
                          onClick={() => setSelectedTest(test)}
                          className="inline-flex items-center gap-2 px-3 py-1.5 bg-purple-600 text-white text-sm font-medium rounded-md hover:bg-purple-700 transition-colors"
                        >
                          <FileCheck className="h-4 w-4" />
                          Review & Approve
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              title="No results awaiting approval"
              message="Results submitted by the lab will appear here."
              icon={<AlertCircle className="h-16 w-16" />}
            />
          )}
        </div>

        {/* Recently Approved Section */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle className="h-5 w-5 text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-900">Recently Approved</h3>
          </div>
           {recentlyApproved.length > 0 ? (
            <div className="overflow-hidden border border-gray-200 rounded-lg">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Visit Code</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Test Name</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Approved At</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Approved By</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {recentlyApproved.map(test => {
                    const visit = findVisitForTest(test);
                    return (
                    <tr key={test.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-blue-600">{test.visitCode}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">{test.template.name}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-sm text-gray-600">
                          <Clock className="h-4 w-4 text-gray-400" />
                          {new Date(test.approvedAt!).toLocaleString()}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-sm text-gray-600">
                          <User className="h-4 w-4 text-gray-400" />
                          {test.approvedBy}
                        </div>
                      </td>
                       <td className="px-4 py-3 whitespace-nowrap text-sm">
                        {visit &&
                        <button
                          onClick={() => onInitiateReport(visit)}
                          className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
                        >
                          <FileText className="h-4 w-4" />
                          View Report
                        </button>
                        }
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
              <EmptyState
                title="No tests have been approved yet"
                message="Approved tests will be listed here."
                icon={<CheckCircle className="h-16 w-16" />}
              />
          )}
        </div>
        </div>
      </div>
    </>
  );
};