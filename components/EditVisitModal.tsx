import React, { useState, useEffect } from 'react';
import { Visit, ReferralDoctor, Client, TestTemplate, VisitTest } from '../types';
import { X, Plus, Trash2 } from 'lucide-react';
import { SearchableSelect } from './form/SearchableSelect';
import { useAppContext } from '../context/AppContext';

interface EditVisitModalProps {
  visit: Visit;
  referralDoctors: ReferralDoctor[];
  clients: Client[];
  onClose: () => void;
  onConfirm: (visitId: number, updates: EditVisitData, editReason: string, editedBy: string) => Promise<void>;
  username: string;
}

export interface EditVisitData {
  patientName?: string;
  ageYears?: number;
  ageMonths?: number;
  ageDays?: number;
  sex?: 'Male' | 'Female' | 'Other';
  phone?: string;
  address?: string;
  referredDoctorId?: number | null;
  otherRefDoctor?: string;
  refCustomerId?: number | null;
  otherRefCustomer?: string;
  testsToAdd?: number[];      // Array of test_template_ids
  testsToRemove?: number[];   // Array of visit_test_ids
}

/**
 * EditVisitModal Component
 * 
 * Modal for editing visit and patient details (admin only).
 * Allows editing patient name, age, sex, phone, address, referring doctor, and B2B client.
 * Requires a reason for editing and logs the action in audit trail.
 * 
 * Features:
 * - Displays current visit and patient information
 * - Allows editing all key fields
 * - Requires mandatory edit reason
 * - Shows loading state during update
 * - Admin-only functionality
 */
export const EditVisitModal: React.FC<EditVisitModalProps> = ({
  visit,
  referralDoctors,
  clients,
  onClose,
  onConfirm,
  username,
}) => {
  const { visitTests, testTemplates } = useAppContext();

  // Get current tests for this visit
  const currentVisitTests = visitTests.filter(vt => vt.visitId === visit.id);

  const [formData, setFormData] = useState<EditVisitData>({
    patientName: visit.patient.name,
    ageYears: visit.patient.age_years,
    ageMonths: visit.patient.age_months,
    ageDays: visit.patient.age_days,
    sex: visit.patient.sex,
    phone: visit.patient.phone,
    address: visit.patient.address,
    referredDoctorId: visit.referred_doctor_id || null,
    otherRefDoctor: visit.other_ref_doctor || '',
    refCustomerId: visit.ref_customer_id || null,
    otherRefCustomer: visit.other_ref_customer || '',
    testsToAdd: [],
    testsToRemove: [],
  });

  const [editReason, setEditReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTestToAdd, setSelectedTestToAdd] = useState<number | ''>('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    const numericFields = ['ageYears', 'ageMonths', 'ageDays'];
    const parsedValue = numericFields.includes(name) && value !== '' ? Number(value) : value;
    setFormData(prev => ({ ...prev, [name]: parsedValue }));
  };

  // Helper to check if visit is B2B
  const isB2BVisit = visit.ref_customer_id !== null;

  // Helper to get test price
  const getTestPrice = (template: TestTemplate): number => {
    return isB2BVisit ? parseFloat(template.b2b_price) : parseFloat(template.price);
  };

  // Calculate cost changes
  const calculateCostChange = (): number => {
    let change = 0;

    // Add cost of tests to add
    if (formData.testsToAdd && formData.testsToAdd.length > 0) {
      formData.testsToAdd.forEach(templateId => {
        const template = testTemplates.find(t => t.id === templateId);
        if (template) {
          change += getTestPrice(template);
        }
      });
    }

    // Subtract cost of tests to remove
    if (formData.testsToRemove && formData.testsToRemove.length > 0) {
      formData.testsToRemove.forEach(visitTestId => {
        const visitTest = currentVisitTests.find(vt => vt.id === visitTestId);
        if (visitTest) {
          change -= getTestPrice(visitTest.template);
        }
      });
    }

    return change;
  };

  const newTotalCost = parseFloat(visit.total_cost) + calculateCostChange();

  // Handle adding a test
  const handleAddTest = () => {
    if (selectedTestToAdd === '') return;

    const templateId = Number(selectedTestToAdd);

    // Check if already in the list to add
    if (formData.testsToAdd?.includes(templateId)) {
      setError('This test is already selected to be added');
      return;
    }

    // Check if test already exists in current visit tests (and not marked for removal)
    const existingTest = currentVisitTests.find(vt => vt.template.id === templateId);
    if (existingTest && !formData.testsToRemove?.includes(existingTest.id)) {
      setError('This test is already in the visit');
      return;
    }

    setFormData(prev => ({
      ...prev,
      testsToAdd: [...(prev.testsToAdd || []), templateId]
    }));
    setSelectedTestToAdd('');
    setError(null);
  };

  // Handle removing a test from "to add" list
  const handleRemoveFromAddList = (templateId: number) => {
    setFormData(prev => ({
      ...prev,
      testsToAdd: prev.testsToAdd?.filter(id => id !== templateId) || []
    }));
  };

  // Handle marking a test for removal
  const handleMarkTestForRemoval = (visitTestId: number) => {
    const visitTest = currentVisitTests.find(vt => vt.id === visitTestId);

    if (!visitTest) return;

    // Only PENDING tests can be removed
    if (visitTest.status !== 'PENDING') {
      setError(`Cannot remove test "${visitTest.template.name}". Only PENDING tests can be removed. Current status: ${visitTest.status}`);
      return;
    }

    setFormData(prev => ({
      ...prev,
      testsToRemove: [...(prev.testsToRemove || []), visitTestId]
    }));
    setError(null);
  };

  // Handle unmarking a test for removal
  const handleUnmarkTestForRemoval = (visitTestId: number) => {
    setFormData(prev => ({
      ...prev,
      testsToRemove: prev.testsToRemove?.filter(id => id !== visitTestId) || []
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editReason.trim()) {
      setError('Edit reason is required');
      return;
    }

    if (editReason.trim().length < 10) {
      setError('Please provide a detailed reason (at least 10 characters)');
      return;
    }

    // Validate patient name
    if (!formData.patientName?.trim()) {
      setError('Patient name is required');
      return;
    }

    // Validate age
    if (formData.ageYears === undefined || formData.ageYears < 0) {
      setError('Valid age is required');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      // First, update patient/visit details if any changed
      const hasDetailsChanges =
        formData.patientName !== visit.patient.name ||
        formData.ageYears !== visit.patient.age_years ||
        formData.ageMonths !== visit.patient.age_months ||
        formData.ageDays !== visit.patient.age_days ||
        formData.sex !== visit.patient.sex ||
        formData.phone !== visit.patient.phone ||
        formData.address !== visit.patient.address ||
        formData.referredDoctorId !== visit.referred_doctor_id ||
        formData.otherRefDoctor !== visit.other_ref_doctor ||
        formData.refCustomerId !== visit.ref_customer_id ||
        formData.otherRefCustomer !== visit.other_ref_customer;

      if (hasDetailsChanges) {
        await onConfirm(visit.id, formData, editReason.trim(), username);
      }

      // Then, update tests if any changes
      const hasTestChanges =
        (formData.testsToAdd && formData.testsToAdd.length > 0) ||
        (formData.testsToRemove && formData.testsToRemove.length > 0);

      if (hasTestChanges) {
        const API_BASE_URL = import.meta.env.VITE_API_URL
          ? `${import.meta.env.VITE_API_URL}/api`
          : 'http://localhost:5001/api';

        const authToken = sessionStorage.getItem('authToken') || localStorage.getItem('authToken');

        const response = await fetch(`${API_BASE_URL}/visits/${visit.id}/edit-tests`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`,
          },
          body: JSON.stringify({
            testsToAdd: formData.testsToAdd,
            testsToRemove: formData.testsToRemove,
            editReason: editReason.trim(),
            editedBy: username,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to update tests');
        }

        const result = await response.json();
        console.log('Tests updated:', result);
      }

      onClose();
    } catch (err) {
      console.error('Error editing visit:', err);
      setError(err instanceof Error ? err.message : 'Failed to edit visit. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
          <div>
            <h2 className="text-xl font-semibold text-gray-800">Edit Visit Details</h2>
            <p className="text-sm text-gray-500 mt-1">Visit Code: {visit.visit_code}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={isSubmitting}
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6">
          {/* Warning */}
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h3 className="text-sm font-semibold text-yellow-800 mb-2">⚠️ Admin Action</h3>
            <p className="text-sm text-yellow-700">
              You are editing visit details. All changes will be logged in the audit trail.
            </p>
          </div>

          {/* Patient Information */}
          <div className="mb-6">
            <h3 className="text-md font-semibold text-gray-800 mb-3 pb-2 border-b">Patient Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Patient Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="patientName"
                  value={formData.patientName}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isSubmitting}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sex <span className="text-red-500">*</span>
                </label>
                <select
                  name="sex"
                  value={formData.sex}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isSubmitting}
                  required
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Years</label>
                  <input
                    type="number"
                    name="ageYears"
                    value={formData.ageYears}
                    onChange={handleChange}
                    min="0"
                    max="150"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={isSubmitting}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Months</label>
                  <input
                    type="number"
                    name="ageMonths"
                    value={formData.ageMonths}
                    onChange={handleChange}
                    min="0"
                    max="11"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={isSubmitting}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Days</label>
                  <input
                    type="number"
                    name="ageDays"
                    value={formData.ageDays}
                    onChange={handleChange}
                    min="0"
                    max="30"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input
                  type="text"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isSubmitting}
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <textarea
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isSubmitting}
                />
              </div>
            </div>
          </div>

          {/* Referral Information */}
          <div className="mb-6">
            <h3 className="text-md font-semibold text-gray-800 mb-3 pb-2 border-b">Referral Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Referring Doctor</label>
                <SearchableSelect
                  options={[
                    { value: '', label: '--None--' },
                    ...referralDoctors.map(d => ({
                      value: d.id,
                      label: d.designation ? `${d.name}, ${d.designation}` : d.name
                    }))
                  ]}
                  value={formData.referredDoctorId || ''}
                  onChange={(value) => setFormData(prev => ({ ...prev, referredDoctorId: value === '' ? null : Number(value) }))}
                  placeholder="--Select Doctor--"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Other Ref. Doctor</label>
                <input
                  type="text"
                  name="otherRefDoctor"
                  value={formData.otherRefDoctor}
                  onChange={handleChange}
                  placeholder="Free text if not in list"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isSubmitting}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">B2B Client / Ref Lab</label>
                <SearchableSelect
                  options={[
                    { value: '', label: '--None--' },
                    ...clients.map(c => ({ value: c.id, label: c.name }))
                  ]}
                  value={formData.refCustomerId || ''}
                  onChange={(value) => setFormData(prev => ({ ...prev, refCustomerId: value === '' ? null : Number(value) }))}
                  placeholder="--Select Client--"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Other Ref. Customer</label>
                <input
                  type="text"
                  name="otherRefCustomer"
                  value={formData.otherRefCustomer}
                  onChange={handleChange}
                  placeholder="Free text if not in list"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isSubmitting}
                />
              </div>
            </div>
          </div>

          {/* Test Management */}
          <div className="mb-6">
            <h3 className="text-md font-semibold text-gray-800 mb-3 pb-2 border-b">Test Management</h3>

            {/* Current Tests */}
            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Current Tests</h4>
              {currentVisitTests.length === 0 ? (
                <p className="text-sm text-gray-500 italic">No tests in this visit</p>
              ) : (
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Test</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Price</th>
                        <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">Action</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {currentVisitTests.map(vt => {
                        const isMarkedForRemoval = formData.testsToRemove?.includes(vt.id);
                        const canRemove = vt.status === 'PENDING';

                        return (
                          <tr key={vt.id} className={isMarkedForRemoval ? 'bg-red-50' : ''}>
                            <td className="px-3 py-2 text-sm text-gray-900">{vt.template.name}</td>
                            <td className="px-3 py-2 text-sm text-gray-600">{vt.template.code}</td>
                            <td className="px-3 py-2 text-sm">
                              <span className={`px-2 py-1 text-xs rounded ${
                                vt.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                                vt.status === 'SAMPLE_COLLECTED' ? 'bg-blue-100 text-blue-800' :
                                vt.status === 'IN_PROGRESS' ? 'bg-purple-100 text-purple-800' :
                                vt.status === 'AWAITING_APPROVAL' ? 'bg-orange-100 text-orange-800' :
                                vt.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {vt.status}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-sm text-right text-gray-900">
                              ₹{getTestPrice(vt.template).toFixed(2)}
                            </td>
                            <td className="px-3 py-2 text-center">
                              {isMarkedForRemoval ? (
                                <button
                                  type="button"
                                  onClick={() => handleUnmarkTestForRemoval(vt.id)}
                                  className="text-green-600 hover:text-green-800 text-xs"
                                  disabled={isSubmitting}
                                >
                                  Undo
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleMarkTestForRemoval(vt.id)}
                                  className={`${canRemove ? 'text-red-600 hover:text-red-800' : 'text-gray-400 cursor-not-allowed'}`}
                                  disabled={!canRemove || isSubmitting}
                                  title={!canRemove ? `Cannot remove ${vt.status} test` : 'Remove test'}
                                >
                                  <Trash2 size={16} />
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Add Tests */}
            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Add Tests</h4>
              <div className="flex gap-2">
                <div className="flex-1">
                  <SearchableSelect
                    options={[
                      { value: '', label: '--Select Test--' },
                      ...testTemplates
                        .filter(t => t.isActive)
                        .map(t => ({
                          value: t.id,
                          label: `${t.name} (${t.code}) - ₹${getTestPrice(t).toFixed(2)}`
                        }))
                    ]}
                    value={selectedTestToAdd}
                    onChange={(value) => setSelectedTestToAdd(value)}
                    placeholder="--Select Test to Add--"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleAddTest}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  disabled={selectedTestToAdd === '' || isSubmitting}
                >
                  <Plus size={16} />
                  Add
                </button>
              </div>
            </div>

            {/* Tests to Add List */}
            {formData.testsToAdd && formData.testsToAdd.length > 0 && (
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Tests to Add</h4>
                <div className="border border-green-200 bg-green-50 rounded-lg p-3">
                  {formData.testsToAdd.map(templateId => {
                    const template = testTemplates.find(t => t.id === templateId);
                    if (!template) return null;

                    return (
                      <div key={templateId} className="flex items-center justify-between py-1">
                        <span className="text-sm text-gray-900">
                          {template.name} ({template.code}) - ₹{getTestPrice(template).toFixed(2)}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveFromAddList(templateId)}
                          className="text-red-600 hover:text-red-800"
                          disabled={isSubmitting}
                        >
                          <X size={16} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Cost Summary */}
            {(formData.testsToAdd && formData.testsToAdd.length > 0) || (formData.testsToRemove && formData.testsToRemove.length > 0) ? (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="text-sm font-semibold text-blue-900 mb-2">Cost Impact</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-700">Current Total:</span>
                    <span className="font-medium">₹{parseFloat(visit.total_cost).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-700">Change:</span>
                    <span className={`font-medium ${calculateCostChange() >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {calculateCostChange() >= 0 ? '+' : ''}₹{calculateCostChange().toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-blue-300">
                    <span className="font-semibold text-gray-900">New Total:</span>
                    <span className="font-semibold text-blue-900">₹{newTotalCost.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          {/* Edit Reason */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Edit Reason <span className="text-red-500">*</span>
            </label>
            <textarea
              value={editReason}
              onChange={(e) => {
                setEditReason(e.target.value);
                setError(null);
              }}
              placeholder="Please provide a detailed reason for editing this visit (e.g., patient provided updated information, correction of data entry error, etc.)"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isSubmitting}
              required
            />
            <p className="mt-1 text-xs text-gray-500">
              Minimum 10 characters required. This will be logged in the audit trail.
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isSubmitting || !editReason.trim()}
            >
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

