import React, { useState, useMemo } from 'react';
import { useAppContext } from '../../context/AppContext';
import { VisitTest } from '../../types';
import { StatusBadgeFromTest } from '../StatusBadge';

export const GlobalSearch: React.FC = () => {
  const { visits, visitTests } = useAppContext();
  const [searchQuery, setSearchQuery] = useState('');

  // Get location/stage for a test based on its status
  const getTestLocation = (status: VisitTest['status']): string => {
    switch (status) {
      case 'PENDING':
        return '📋 Phlebotomy Queue (Awaiting Sample Collection)';
      case 'SAMPLE_COLLECTED':
        return '🧪 Lab Queue (Sample Collected, Awaiting Results)';
      case 'REJECTED':
        return '❌ Rejected (Needs Recollection)';
      case 'IN_PROGRESS':
        return '⚗️ Lab (Results Being Entered)';
      case 'AWAITING_APPROVAL':
        return '✅ Approver Queue (Awaiting Approval)';
      case 'APPROVED':
        return '✔️ Approved (Ready for Report)';
      case 'COMPLETED':
        return '📄 Completed';
      default:
        return 'Unknown';
    }
  };

  // Search across visits and tests
  const searchResults = useMemo(() => {
    if (!searchQuery || searchQuery.length < 2) return [];

    const query = searchQuery.toLowerCase();
    const results: Array<{
      visit: typeof visits[0];
      test: VisitTest;
      matchType: 'visit_code' | 'patient_name' | 'test_name';
    }> = [];

    visits.forEach(visit => {
      const visitTestsForVisit = visit.tests
        .map(testId => visitTests.find(vt => vt.id === testId))
        .filter(Boolean) as VisitTest[];

      visitTestsForVisit.forEach(test => {
        let matchType: 'visit_code' | 'patient_name' | 'test_name' | null = null;

        if (visit.visit_code.toLowerCase().includes(query)) {
          matchType = 'visit_code';
        } else if (visit.patient.name.toLowerCase().includes(query)) {
          matchType = 'patient_name';
        } else if (test.template.name.toLowerCase().includes(query)) {
          matchType = 'test_name';
        }

        if (matchType) {
          results.push({ visit, test, matchType });
        }
      });
    });

    return results;
  }, [searchQuery, visits, visitTests]);

  return (
    <div className="space-y-4">
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">🔍 Global Sample Tracking</h2>
        <p className="text-sm text-gray-600 mb-4">
          Search for any sample by visit code, patient name, or test name to see its current location and status.
        </p>

        {/* Search Input */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search by visit code, patient name, or test name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-3 pl-12 text-base border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <svg
            className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>

        {/* Search Results */}
        {searchQuery.length > 0 && searchQuery.length < 2 && (
          <p className="text-sm text-gray-500 mt-4">Type at least 2 characters to search...</p>
        )}

        {searchQuery.length >= 2 && searchResults.length === 0 && (
          <div className="mt-6 text-center py-8">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="mt-2 text-sm text-gray-600">No results found for "{searchQuery}"</p>
          </div>
        )}

        {searchResults.length > 0 && (
          <div className="mt-6">
            <p className="text-sm text-gray-600 mb-4">
              Found {searchResults.length} result{searchResults.length !== 1 ? 's' : ''}
            </p>
            <div className="space-y-3">
              {searchResults.map(({ visit, test, matchType }, index) => (
                <div
                  key={`${visit.id}-${test.id}-${index}`}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow bg-white"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    {/* Left Side: Visit & Test Info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-lg font-bold text-blue-600">{visit.visit_code}</span>
                        {matchType === 'visit_code' && (
                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                            Matched Visit Code
                          </span>
                        )}
                      </div>
                      
                      <div className="space-y-1 text-sm">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-700">Patient:</span>
                          <span className="text-gray-900">{visit.patient.name}</span>
                          {matchType === 'patient_name' && (
                            <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">
                              Matched Patient
                            </span>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-700">Test:</span>
                          <span className="text-gray-900">{test.template.name}</span>
                          {matchType === 'test_name' && (
                            <span className="text-xs bg-purple-100 text-purple-800 px-2 py-0.5 rounded">
                              Matched Test
                            </span>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-700">Phone:</span>
                          <span className="text-gray-900">{visit.patient.phone}</span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-700">Registered:</span>
                          <span className="text-gray-900">
                            {new Date(visit.created_at).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right Side: Status & Location */}
                    <div className="flex flex-col items-start sm:items-end gap-2 min-w-[280px]">
                      <StatusBadgeFromTest test={test} />
                      
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 w-full">
                        <p className="text-xs font-medium text-blue-800 mb-1">📍 Current Location:</p>
                        <p className="text-sm font-semibold text-blue-900">
                          {getTestLocation(test.status)}
                        </p>
                      </div>

                      {/* Additional Info */}
                      {test.collectedAt && (
                        <p className="text-xs text-gray-600">
                          Collected: {new Date(test.collectedAt).toLocaleString()}
                        </p>
                      )}
                      {test.approvedAt && (
                        <p className="text-xs text-gray-600">
                          Approved: {new Date(test.approvedAt).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

