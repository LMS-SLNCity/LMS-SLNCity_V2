import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useAppContext } from '../context/AppContext';
import { ReportModal } from './ReportModal';
import { Visit as FullVisit, Signatory } from '../types';

interface Visit {
  id: number;
  visitCode: string;
  registrationDatetime: string;
  patientName: string;
  patientAge: string;
  patientSex: string;
  totalCost: number;
  reportStatus: string;
}

export const B2BPrintReport: React.FC = () => {
  const { user } = useAuth();
  const { visits: allVisits, signatories } = useAppContext();
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedVisit, setSelectedVisit] = useState<FullVisit | null>(null);
  const [selectedSignatory, setSelectedSignatory] = useState<Signatory | null>(null);

  const clientId = (user as any)?.clientId;

  useEffect(() => {
    fetchVisits();
  }, [clientId]);

  const fetchVisits = async () => {
    try {
      const token = sessionStorage.getItem('authToken') || localStorage.getItem('authToken');

      // Fetch all visits for this client
      const response = await fetch('http://localhost:5001/api/visits', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const allVisits = await response.json();
        
        // Filter visits for this client
        const clientVisits = allVisits
          .filter((v: any) => v.refCustomerId === clientId)
          .map((v: any) => ({
            id: v.id,
            visitCode: v.visitCode,
            registrationDatetime: v.registrationDatetime,
            patientName: v.patientName,
            patientAge: `${v.patientAgeYears}Y ${v.patientAgeMonths}M`,
            patientSex: v.patientSex,
            totalCost: v.totalCost,
            reportStatus: v.reportStatus || 'PENDING',
          }));

        setVisits(clientVisits);
      } else {
        setError('Failed to load visits');
      }
    } catch (error) {
      console.error('Error fetching visits:', error);
      setError('Failed to load visits');
    } finally {
      setLoading(false);
    }
  };

  const handlePrintReport = async (visitId: number) => {
    try {
      // Find the full visit object from context
      const fullVisit = allVisits.find(v => v.id === visitId);

      if (!fullVisit) {
        alert('Visit not found');
        return;
      }

      // Use the first signatory (or default)
      const signatory = signatories.length > 0 ? signatories[0] : {
        id: 0,
        name: 'Lab Director',
        title: 'Director',
        show_on_print: true
      };

      setSelectedVisit(fullVisit);
      setSelectedSignatory(signatory);
    } catch (error) {
      console.error('Error opening report:', error);
      alert('Failed to open report');
    }
  };

  const filteredVisits = visits.filter(visit => {
    const matchesSearch = 
      visit.visitCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      visit.patientName.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || visit.reportStatus === filterStatus;

    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading visits...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Print Reports</h2>

        {/* Filters */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search by Visit Code or Patient Name
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filter by Status
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="PRINTED">Printed</option>
            </select>
          </div>
        </div>

        {/* Visits Table */}
        {filteredVisits.length === 0 ? (
          <div className="text-center py-12">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No visits found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm || filterStatus !== 'all'
                ? 'Try adjusting your search or filter'
                : 'No visits have been created yet'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Visit Code
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Patient
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Age/Sex
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cost
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredVisits.map((visit) => (
                  <tr key={visit.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{visit.visitCode}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{visit.patientName}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {visit.patientAge} / {visit.patientSex}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {new Date(visit.registrationDatetime).toLocaleDateString('en-IN')}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        ₹{visit.totalCost.toFixed(2)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          visit.reportStatus === 'APPROVED'
                            ? 'bg-green-100 text-green-800'
                            : visit.reportStatus === 'PRINTED'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {visit.reportStatus}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {visit.reportStatus === 'APPROVED' || visit.reportStatus === 'PRINTED' ? (
                        <button
                          onClick={() => handlePrintReport(visit.id)}
                          className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                          <svg
                            className="mr-1.5 h-4 w-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                            />
                          </svg>
                          View Report
                        </button>
                      ) : (
                        <span className="text-gray-400 text-xs">Not Ready</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Summary */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600">Total Visits</div>
              <div className="text-2xl font-bold text-gray-900">{filteredVisits.length}</div>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600">Pending</div>
              <div className="text-2xl font-bold text-yellow-600">
                {filteredVisits.filter(v => v.reportStatus === 'PENDING').length}
              </div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600">Ready to Print</div>
              <div className="text-2xl font-bold text-green-600">
                {filteredVisits.filter(v => v.reportStatus === 'APPROVED' || v.reportStatus === 'PRINTED').length}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Report Modal */}
      {selectedVisit && selectedSignatory && (
        <ReportModal
          visit={selectedVisit}
          signatory={selectedSignatory}
          onClose={() => {
            setSelectedVisit(null);
            setSelectedSignatory(null);
          }}
          onEdit={() => {
            // B2B clients cannot edit reports
            alert('You do not have permission to edit reports');
          }}
        />
      )}
    </div>
  );
};

