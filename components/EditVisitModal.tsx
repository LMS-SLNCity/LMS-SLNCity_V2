import React, { useState, useEffect } from 'react';
import { Visit, ReferralDoctor, Client } from '../types';
import { X } from 'lucide-react';
import { SearchableSelect } from './form/SearchableSelect';

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
  });

  const [editReason, setEditReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    const numericFields = ['ageYears', 'ageMonths', 'ageDays'];
    const parsedValue = numericFields.includes(name) && value !== '' ? Number(value) : value;
    setFormData(prev => ({ ...prev, [name]: parsedValue }));
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
      await onConfirm(visit.id, formData, editReason.trim(), username);
      onClose();
    } catch (err) {
      console.error('Error editing visit:', err);
      setError('Failed to edit visit. Please try again.');
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

