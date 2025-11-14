import React, { useState } from 'react';
import { VisitTest } from '../types';
import { useAppContext } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';

interface ApprovalModalProps {
  test: VisitTest;
  onClose: () => void;
}

export const ApprovalModal: React.FC<ApprovalModalProps> = ({ test, onClose }) => {
  const { approveTestResult, rejectTestResult, antibiotics } = useAppContext();
  const { user } = useAuth();
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedResults, setEditedResults] = useState<any>(test.results || {});
  const [editReason, setEditReason] = useState('');

  const handleEdit = () => {
    setIsEditing(true);
    setEditedResults(test.results || {});
  };

  const handleSaveEdit = async () => {
    if (!user) {
      alert("User session has expired. Please log in again.");
      return;
    }
    if (!editReason.trim()) {
      alert("Please provide a reason for editing the results.");
      return;
    }

    setIsSubmitting(true);
    try {
      const authToken = localStorage.getItem('authToken');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/visit-tests/${test.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          results: editedResults,
          editedBy: user.username,
          editReason: editReason
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update test results');
      }

      // Create audit log for the edit
      await fetch(`${import.meta.env.VITE_API_URL}/audit-logs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          username: user.username,
          action: 'EDIT_RESULT_BEFORE_APPROVAL',
          details: `Edited results for ${test.template.name} (${test.visitCode} - ${test.patientName}). Reason: ${editReason}`,
          user_id: user.id,
          resource: 'visit_test',
          resource_id: test.id,
          old_value: JSON.stringify(test.results),
          new_value: JSON.stringify(editedResults)
        })
      });

      alert('Results updated successfully');
      setIsEditing(false);
      setEditReason('');
      window.location.reload(); // Reload to show updated results
    } catch (error) {
      alert(`Failed to update results: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApprove = async () => {
    if (!user) {
        alert("User session has expired. Please log in again.");
        return;
    }
    if (test.status !== 'AWAITING_APPROVAL') {
        alert(`Cannot approve. Test status is ${test.status}. Only AWAITING_APPROVAL tests can be approved.`);
        return;
    }
    setIsSubmitting(true);
    try {
      await approveTestResult(test.id, user);
      onClose();
    } catch (error) {
      alert('Failed to approve test result');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    console.log('🔴 Rejection initiated:', { testId: test.id, status: test.status, user: user?.username });

    if (!user) {
        console.error('❌ No user found');
        alert("User session has expired. Please log in again.");
        return;
    }
    if (!rejectionReason.trim()) {
        console.error('❌ No rejection reason provided');
        alert("Please provide a reason for rejection.");
        return;
    }
    if (test.status !== 'AWAITING_APPROVAL') {
        console.error('❌ Invalid test status:', test.status);
        alert(`Cannot reject. Test status is ${test.status}. Only AWAITING_APPROVAL tests can be rejected.`);
        return;
    }

    console.log('✅ Validation passed, calling rejectTestResult...');
    setIsSubmitting(true);
    try {
      await rejectTestResult(test.id, rejectionReason, user);
      console.log('✅ Rejection successful');
      onClose();
    } catch (error) {
      console.error('❌ Rejection failed:', error);
      alert(`Failed to reject test result: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl transform transition-all">
        <div className="p-6">
            <h3 className="text-xl font-bold text-gray-900" id="modal-title">Review & Approve Results</h3>
            <p className="text-sm text-gray-500 mt-1">Test: {test.template.name}</p>
            <p className="text-sm text-gray-500">Patient: {test.patientName} ({test.visitCode})</p>

            {/* Show rejection history if any */}
            {test.rejection_count && test.rejection_count > 0 && (
                <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <p className="text-sm font-medium text-yellow-800">
                        ⚠️ This result has been rejected {test.rejection_count} time(s)
                    </p>
                    {test.last_rejection_at && (
                        <p className="text-xs text-yellow-700 mt-1">
                            Last rejected: {new Date(test.last_rejection_at).toLocaleString()}
                        </p>
                    )}
                </div>
            )}

            <div className="mt-6 border-t pt-4">
                <div className="flex justify-between items-center mb-2">
                    <h4 className="font-semibold text-gray-800">Entered Results:</h4>
                    {!isEditing && !showRejectForm && test.results && Object.keys(test.results).length > 0 && (
                        <button
                            onClick={handleEdit}
                            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                        >
                            Edit Results
                        </button>
                    )}
                </div>
                {test.results && Object.keys(test.results).length > 0 ? (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                        {Object.entries(isEditing ? editedResults : test.results).map(([key, value]) => {
                            const parameter = test.template.parameters.fields.find(p => p.name === key);
                            return (
                                <div key={key} className="grid grid-cols-2 gap-4 text-sm items-center">
                                    <span className="text-gray-600 font-medium">{key}:</span>
                                    {isEditing ? (
                                        <input
                                            type="text"
                                            value={String(editedResults[key] || '')}
                                            onChange={(e) => setEditedResults({...editedResults, [key]: e.target.value})}
                                            className="px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    ) : (
                                        <span className="text-gray-900">{String(value)} {parameter?.unit || ''}</span>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                ) : test.cultureResult ? (
                    <div className="space-y-3">
                        <div className="text-sm">
                            <span className="font-medium">Growth Status:</span> {test.cultureResult.growthStatus === 'growth' ? 'Growth Detected' : 'No Growth'}
                        </div>
                        {test.cultureResult.organismIsolated && (
                            <div className="text-sm">
                                <span className="font-medium">Organism:</span> {test.cultureResult.organismIsolated}
                            </div>
                        )}
                        {test.cultureResult.colonyCount && (
                            <div className="text-sm">
                                <span className="font-medium">Colony Count:</span> {test.cultureResult.colonyCount}
                            </div>
                        )}
                        {test.cultureResult.remarks && (
                            <div className="text-sm">
                                <span className="font-medium">Remarks:</span> {test.cultureResult.remarks}
                            </div>
                        )}

                        {/* Antibiotic Sensitivity Results */}
                        {test.cultureResult.sensitivity && test.cultureResult.sensitivity.length > 0 && (
                            <div className="mt-4 border-t pt-3">
                                <h5 className="font-semibold text-gray-800 mb-2 text-sm">Antibiotic Sensitivity:</h5>
                                <div className="max-h-48 overflow-y-auto">
                                    <table className="min-w-full text-sm">
                                        <thead className="bg-gray-50 sticky top-0">
                                            <tr>
                                                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">Antibiotic</th>
                                                <th className="px-3 py-2 text-center text-xs font-semibold text-gray-600">Result</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200">
                                            {test.cultureResult.sensitivity.map((sens, index) => {
                                                const antibiotic = antibiotics.find(ab => ab.id === sens.antibioticId);
                                                const sensitivityLabel = sens.sensitivity === 'S' ? 'Sensitive' : sens.sensitivity === 'R' ? 'Resistant' : 'Intermediate';
                                                const sensitivityColor = sens.sensitivity === 'S' ? 'text-green-700 bg-green-50' : sens.sensitivity === 'R' ? 'text-red-700 bg-red-50' : 'text-yellow-700 bg-yellow-50';

                                                return (
                                                    <tr key={index} className="hover:bg-gray-50">
                                                        <td className="px-3 py-2 text-gray-800">
                                                            {antibiotic ? `${antibiotic.name} (${antibiotic.abbreviation})` : `Unknown (ID: ${sens.antibioticId})`}
                                                        </td>
                                                        <td className="px-3 py-2 text-center">
                                                            <span className={`inline-block px-2 py-1 rounded-md text-xs font-semibold ${sensitivityColor}`}>
                                                                {sensitivityLabel} ({sens.sensitivity})
                                                            </span>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <p className="text-sm text-gray-500">No specific result parameters were entered for this test.</p>
                )}
            </div>

            {/* Edit Reason Form */}
            {isEditing && (
                <div className="mt-6 border-t pt-4">
                    <h4 className="font-semibold text-gray-800 mb-2">Reason for Editing</h4>
                    <textarea
                        value={editReason}
                        onChange={(e) => setEditReason(e.target.value)}
                        placeholder="Please provide a reason for editing these results. This will be logged in the audit trail."
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
            )}

            {/* Rejection Form */}
            {showRejectForm && (
                <div className="mt-6 border-t pt-4">
                    <h4 className="font-semibold text-gray-800 mb-2">Rejection Reason</h4>
                    <textarea
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        placeholder="Please provide a detailed reason for rejecting these results. The lab technician will see this comment."
                        rows={4}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                        The test will be sent back to the lab for correction.
                    </p>
                </div>
            )}
        </div>

        <div className="bg-gray-50 px-6 py-4 flex justify-between items-center rounded-b-xl">
            <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400 disabled:opacity-50"
            >
                Cancel
            </button>

            <div className="flex space-x-3">
                {isEditing ? (
                    <>
                        <button
                            type="button"
                            onClick={() => { setIsEditing(false); setEditReason(''); setEditedResults(test.results || {}); }}
                            disabled={isSubmitting}
                            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 disabled:opacity-50"
                        >
                            Cancel Edit
                        </button>
                        <button
                            type="button"
                            onClick={handleSaveEdit}
                            disabled={isSubmitting || !editReason.trim()}
                            className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                        >
                            {isSubmitting ? 'Saving...' : 'Save Changes'}
                        </button>
                    </>
                ) : !showRejectForm ? (
                    <>
                        <button
                            type="button"
                            onClick={() => setShowRejectForm(true)}
                            disabled={isSubmitting}
                            className="px-4 py-2 bg-orange-600 text-white font-semibold rounded-lg shadow-md hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50"
                        >
                            Reject
                        </button>
                        <button
                            type="button"
                            onClick={handleApprove}
                            disabled={isSubmitting}
                            className="px-4 py-2 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                        >
                            {isSubmitting ? 'Approving...' : 'Approve'}
                        </button>
                    </>
                ) : (
                    <>
                        <button
                            type="button"
                            onClick={() => { setShowRejectForm(false); setRejectionReason(''); }}
                            disabled={isSubmitting}
                            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 disabled:opacity-50"
                        >
                            Cancel Rejection
                        </button>
                        <button
                            type="button"
                            onClick={handleReject}
                            disabled={isSubmitting || !rejectionReason.trim()}
                            className="px-4 py-2 bg-red-600 text-white font-semibold rounded-lg shadow-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                        >
                            {isSubmitting ? 'Rejecting...' : 'Confirm Rejection'}
                        </button>
                    </>
                )}
            </div>
        </div>
      </div>
    </div>
  );
};