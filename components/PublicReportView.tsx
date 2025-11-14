import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Visit, Signatory, VisitTest } from '../types';
import { API_BASE_URL } from '../config/api';
import { FileText, Clock, User, Calendar, CheckCircle, AlertCircle } from 'lucide-react';
import { AppProvider } from '../context/AppContext';

// Standalone TestReport component for public view (doesn't use AppContext)
const PublicTestReport: React.FC<{ visit: Visit; signatory: Signatory; visitTests: VisitTest[] }> = ({ visit, signatory, visitTests }) => {
  // This is a simplified version that doesn't need AppContext
  // We'll import the actual TestReport and wrap it with a provider
  return null; // Placeholder - will be replaced with actual report rendering
};

export const PublicReportView: React.FC = () => {
  const { visitCode } = useParams<{ visitCode: string }>();
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showTimestamps, setShowTimestamps] = useState(false);

  useEffect(() => {
    fetchPublicReport();
  }, [visitCode]);

  const fetchPublicReport = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${API_BASE_URL}/public/reports/${visitCode}`);

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Report not found. Please check the visit code.');
        }
        throw new Error('Failed to load report');
      }

      const data = await response.json();
      setReportData(data);
    } catch (err: any) {
      console.error('Error fetching public report:', err);
      setError(err.message || 'Failed to load report');
    } finally {
      setLoading(false);
    }
  };

  const formatTimestamp = (timestamp: string | null) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp).toLocaleString('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Loading report...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-pink-100 p-4">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
          <div className="flex items-center justify-center mb-4">
            <AlertCircle className="h-16 w-16 text-red-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 text-center mb-4">Report Not Found</h2>
          <p className="text-gray-600 text-center mb-6">{error}</p>
          <div className="text-center">
            <p className="text-sm text-gray-500">
              Please check the QR code or visit code and try again.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!reportData) {
    return null;
  }

  const { visit: visitData, signatory, antibiotics } = reportData;

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white py-6 px-4 shadow-lg">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <FileText className="h-8 w-8" />
              <div>
                <h1 className="text-2xl font-bold">Lab Report Verification</h1>
                <p className="text-blue-100 text-sm">Visit Code: {visitData.visit_code}</p>
              </div>
            </div>
            <button
              onClick={() => setShowTimestamps(!showTimestamps)}
              className="px-4 py-2 bg-white text-blue-600 rounded-lg font-semibold hover:bg-blue-50 transition-colors flex items-center gap-2"
            >
              <Clock className="h-5 w-5" />
              {showTimestamps ? 'Hide' : 'Show'} Timestamps
            </button>
          </div>
        </div>
      </div>

      {/* Timestamp Details */}
      {showTimestamps && (
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Clock className="h-6 w-6 text-blue-600" />
              Test Processing Timeline
            </h2>
            <div className="space-y-4">
              {visitData.tests.map((test: any) => (
                <div key={test.id} className="border-l-4 border-blue-500 pl-4 py-2">
                  <h3 className="font-semibold text-gray-800 mb-2">{test.template.name}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
                    <div className="flex items-start gap-2">
                      <Calendar className="h-4 w-4 text-gray-500 mt-0.5" />
                      <div>
                        <p className="text-gray-600 font-medium">Registered</p>
                        <p className="text-gray-800">{formatTimestamp(test.created_at)}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <User className="h-4 w-4 text-gray-500 mt-0.5" />
                      <div>
                        <p className="text-gray-600 font-medium">Sample Collected</p>
                        <p className="text-gray-800">{formatTimestamp(test.collected_at)}</p>
                        <p className="text-gray-500 text-xs">By: {test.collected_by || 'N/A'}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <FileText className="h-4 w-4 text-gray-500 mt-0.5" />
                      <div>
                        <p className="text-gray-600 font-medium">Results Entered</p>
                        <p className="text-gray-800">{formatTimestamp(test.entered_at)}</p>
                        <p className="text-gray-500 text-xs">By: {test.entered_by || 'N/A'}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                      <div>
                        <p className="text-gray-600 font-medium">Approved</p>
                        <p className="text-gray-800">{formatTimestamp(test.approved_at)}</p>
                        <p className="text-gray-500 text-xs">By: {test.approved_by || 'N/A'}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <Clock className="h-4 w-4 text-gray-500 mt-0.5" />
                      <div>
                        <p className="text-gray-600 font-medium">Last Updated</p>
                        <p className="text-gray-800">{formatTimestamp(test.updated_at)}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <FileText className="h-4 w-4 text-gray-500 mt-0.5" />
                      <div>
                        <p className="text-gray-600 font-medium">Status</p>
                        <p className="text-gray-800 font-semibold">{test.status}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Report Content - Render the actual report using a simple HTML view */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden p-8">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">Laboratory Report</h2>
            <p className="text-gray-600">Visit Code: {visitData.visit_code}</p>
          </div>

          <div className="mb-6 grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-600">Patient Name:</p>
              <p className="font-semibold">{visitData.patient.salutation} {visitData.patient.name}</p>
            </div>
            <div>
              <p className="text-gray-600">Age/Sex:</p>
              <p className="font-semibold">
                {visitData.patient.age_years}Y {visitData.patient.age_months || 0}M {visitData.patient.age_days || 0}D / {visitData.patient.sex}
              </p>
            </div>
            <div>
              <p className="text-gray-600">Registration Date:</p>
              <p className="font-semibold">{formatTimestamp(visitData.registration_datetime)}</p>
            </div>
            <div>
              <p className="text-gray-600">Referred By:</p>
              <p className="font-semibold">{visitData.referred_doctor?.name || visitData.other_ref_doctor || 'N/A'}</p>
            </div>
          </div>

          {/* Test Results */}
          <div className="mt-8">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Test Results</h3>
            {visitData.tests.map((test: any) => (
              <div key={test.id} className="mb-6 border-t pt-4">
                <h4 className="font-bold text-lg text-gray-800 mb-3">{test.template.name}</h4>
                {test.template.reportType === 'STANDARD' && test.results && (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="text-left p-2 border">Parameter</th>
                        <th className="text-left p-2 border">Result</th>
                        <th className="text-left p-2 border">Unit</th>
                        <th className="text-left p-2 border">Reference Range</th>
                      </tr>
                    </thead>
                    <tbody>
                      {test.template.parameters.map((param: any, idx: number) => {
                        if (param.type === 'heading') {
                          return (
                            <tr key={idx}>
                              <td colSpan={4} className="p-2 bg-gray-50 font-semibold text-gray-700 border">
                                {param.name}
                              </td>
                            </tr>
                          );
                        }
                        return (
                          <tr key={idx}>
                            <td className="p-2 border">{param.name}</td>
                            <td className="p-2 border font-semibold">{test.results[param.name] || '-'}</td>
                            <td className="p-2 border">{param.unit || '-'}</td>
                            <td className="p-2 border">{param.referenceRange || '-'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
                {test.template.reportType === 'CULTURE' && test.culture_result && (
                  <div className="text-sm">
                    <p className="mb-2"><strong>Culture Result:</strong> {test.culture_result.organism || 'N/A'}</p>
                    <p className="mb-2"><strong>Colony Count:</strong> {test.culture_result.colonyCount || 'N/A'}</p>
                    {test.culture_result.antibioticSensitivity && (
                      <div className="mt-4">
                        <p className="font-semibold mb-2">Antibiotic Sensitivity:</p>
                        <table className="w-full">
                          <thead>
                            <tr className="bg-gray-100">
                              <th className="text-left p-2 border">Antibiotic</th>
                              <th className="text-left p-2 border">Sensitivity</th>
                            </tr>
                          </thead>
                          <tbody>
                            {Object.entries(test.culture_result.antibioticSensitivity).map(([antibiotic, sensitivity]) => (
                              <tr key={antibiotic}>
                                <td className="p-2 border">{antibiotic}</td>
                                <td className="p-2 border">{sensitivity as string}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Signatory */}
          <div className="mt-8 pt-6 border-t text-right">
            <p className="font-semibold">{signatory.name}</p>
            <p className="text-sm text-gray-600">{signatory.title}</p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-gray-800 text-white py-6 px-4 mt-8">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-sm text-gray-300">
            This is an official lab report. For any queries, please contact the laboratory.
          </p>
          <p className="text-xs text-gray-400 mt-2">
            © 2024 Sri Lakshmi Narasimha City Diagnostic Center (SLNCity). All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
};

