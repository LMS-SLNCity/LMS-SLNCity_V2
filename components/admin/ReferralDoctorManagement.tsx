import React, { useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';

interface ReferralDoctor {
  id: number;
  name: string;
  designation?: string;
}

export const ReferralDoctorManagement: React.FC = () => {
    const { referralDoctors, addReferralDoctor, updateReferralDoctor, deleteReferralDoctor } = useAppContext();
    const { user: actor } = useAuth();
    const [doctorName, setDoctorName] = useState('');
    const [doctorDesignation, setDoctorDesignation] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editingName, setEditingName] = useState('');
    const [editingDesignation, setEditingDesignation] = useState('');
    const [deletingId, setDeletingId] = useState<number | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!doctorName.trim()) {
            alert('Please enter doctor name');
            return;
        }

        if (!actor) {
            alert("User session has expired. Please log in again.");
            return;
        }

        setIsLoading(true);
        try {
            await addReferralDoctor({ name: doctorName, designation: doctorDesignation }, actor);
            setDoctorName('');
            setDoctorDesignation('');
        } catch (error) {
            console.error('Failed to add referral doctor:', error);
            alert('Failed to add referral doctor');
        } finally {
            setIsLoading(false);
        }
    };

    const handleEditStart = (doctor: ReferralDoctor) => {
        setEditingId(doctor.id);
        setEditingName(doctor.name);
        setEditingDesignation(doctor.designation || '');
    };

    const handleEditSave = async (doctorId: number) => {
        if (!editingName.trim()) {
            alert('Please enter doctor name');
            return;
        }

        if (!actor) {
            alert("User session has expired. Please log in again.");
            return;
        }

        try {
            await updateReferralDoctor(doctorId, { name: editingName, designation: editingDesignation }, actor);
            setEditingId(null);
            setEditingName('');
            setEditingDesignation('');
            alert('Doctor updated successfully');
        } catch (error) {
            console.error('Failed to update doctor:', error);
            alert('Failed to update doctor');
        }
    };

    const handleDelete = async (doctorId: number) => {
        if (!actor) {
            alert("User session has expired. Please log in again.");
            return;
        }

        if (!window.confirm('Are you sure you want to delete this referral doctor?')) {
            return;
        }

        setDeletingId(doctorId);
        try {
            await deleteReferralDoctor(doctorId, actor);
            alert('Doctor deleted successfully');
        } catch (error) {
            console.error('Failed to delete doctor:', error);
            alert('Failed to delete doctor');
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Add New Doctor Form */}
            <div className="lg:col-span-1">
                <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-700 mb-4">Add New Referral Doctor</h3>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Doctor Name *
                            </label>
                            <input
                                type="text"
                                value={doctorName}
                                onChange={(e) => setDoctorName(e.target.value)}
                                placeholder="e.g., Dr. John Doe"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary"
                                disabled={isLoading}
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Designation
                            </label>
                            <input
                                type="text"
                                value={doctorDesignation}
                                onChange={(e) => setDoctorDesignation(e.target.value)}
                                placeholder="e.g., MD, General Physician"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary"
                                disabled={isLoading}
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-brand-primary text-white py-2 rounded-lg hover:bg-brand-primary_hover disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                        >
                            {isLoading ? 'Adding...' : 'Add Doctor'}
                        </button>
                    </form>
                </div>
            </div>

            {/* Referral Doctors List */}
            <div className="lg:col-span-2">
                <h3 className="text-lg font-semibold text-gray-700 mb-4">Referral Doctors</h3>
                <div className="overflow-x-auto border border-gray-200 rounded-lg">
                    <table className="min-w-full bg-white">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">ID</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Doctor Name</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Designation</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {referralDoctors && referralDoctors.length > 0 ? (
                                referralDoctors.map((doctor, index) => (
                                    <tr key={doctor.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50 hover:bg-gray-100'}>
                                        <td className="px-4 py-3 text-sm text-gray-600">{doctor.id}</td>
                                        <td className="px-4 py-3 text-sm font-medium text-gray-800">
                                            {editingId === doctor.id ? (
                                                <input
                                                    type="text"
                                                    value={editingName}
                                                    onChange={(e) => setEditingName(e.target.value)}
                                                    className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-brand-primary"
                                                    placeholder="Doctor Name"
                                                />
                                            ) : (
                                                doctor.name
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-600">
                                            {editingId === doctor.id ? (
                                                <input
                                                    type="text"
                                                    value={editingDesignation}
                                                    onChange={(e) => setEditingDesignation(e.target.value)}
                                                    className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-brand-primary"
                                                    placeholder="Designation"
                                                />
                                            ) : (
                                                doctor.designation || '-'
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-sm space-x-2">
                                            {editingId === doctor.id ? (
                                                <>
                                                    <button
                                                        onClick={() => handleEditSave(doctor.id)}
                                                        className="text-green-600 hover:text-green-800 font-medium text-xs px-2 py-1 bg-green-50 rounded"
                                                    >
                                                        Save
                                                    </button>
                                                    <button
                                                        onClick={() => setEditingId(null)}
                                                        className="text-gray-600 hover:text-gray-800 font-medium text-xs px-2 py-1 bg-gray-50 rounded"
                                                    >
                                                        Cancel
                                                    </button>
                                                </>
                                            ) : (
                                                <>
                                                    <button
                                                        onClick={() => handleEditStart(doctor)}
                                                        className="text-blue-600 hover:text-blue-800 font-medium text-xs px-2 py-1 bg-blue-50 rounded"
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(doctor.id)}
                                                        disabled={deletingId === doctor.id}
                                                        className="text-red-600 hover:text-red-800 font-medium text-xs px-2 py-1 bg-red-50 rounded disabled:opacity-50"
                                                    >
                                                        {deletingId === doctor.id ? 'Deleting...' : 'Delete'}
                                                    </button>
                                                </>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={3} className="px-4 py-3 text-center text-sm text-gray-500">
                                        No referral doctors found
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

