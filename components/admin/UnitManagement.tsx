import React, { useState, useEffect } from 'react';
import { Unit } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { API_BASE_URL } from '../../config/api';

export const UnitManagement: React.FC = () => {
  const { user } = useAuth();
  const [units, setUnits] = useState<Unit[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    symbol: '',
    category: '',
    description: ''
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Fetch units
  const fetchUnits = async () => {
    try {
      const authToken = sessionStorage.getItem('authToken') || localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/api/units`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      if (response.ok) {
        const data = await response.json();
        setUnits(data.map((u: any) => ({
          id: u.id,
          name: u.name,
          symbol: u.symbol,
          category: u.category,
          description: u.description,
          isActive: u.is_active
        })));
      }
    } catch (error) {
      console.error('Error fetching units:', error);
    }
  };

  useEffect(() => {
    fetchUnits();
  }, []);

  const handleOpenModal = (unit?: Unit) => {
    if (unit) {
      setEditingUnit(unit);
      setFormData({
        name: unit.name,
        symbol: unit.symbol,
        category: unit.category || '',
        description: unit.description || ''
      });
    } else {
      setEditingUnit(null);
      setFormData({ name: '', symbol: '', category: '', description: '' });
    }
    setError(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingUnit(null);
    setFormData({ name: '', symbol: '', category: '', description: '' });
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const authToken = sessionStorage.getItem('authToken') || localStorage.getItem('authToken');
      const url = editingUnit
        ? `${API_BASE_URL}/api/units/${editingUnit.id}`
        : `${API_BASE_URL}/api/units`;

      const response = await fetch(url, {
        method: editingUnit ? 'PATCH' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        await fetchUnits();
        handleCloseModal();
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to save unit');
      }
    } catch (error) {
      setError('An error occurred while saving the unit');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (unit: Unit) => {
    try {
      const authToken = sessionStorage.getItem('authToken') || localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/api/units/${unit.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ is_active: !unit.isActive })
      });

      if (response.ok) {
        await fetchUnits();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to update unit status');
      }
    } catch (error) {
      console.error('Error toggling unit status:', error);
      alert('An error occurred while updating unit status');
    }
  };

  const handleDelete = async (unit: Unit) => {
    if (!confirm(`Are you sure you want to permanently delete the unit "${unit.name} (${unit.symbol})"? This action cannot be undone.`)) {
      return;
    }

    try {
      const authToken = sessionStorage.getItem('authToken') || localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/api/units/${unit.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      if (response.ok) {
        await fetchUnits();
        alert('Unit deleted successfully');
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to delete unit');
      }
    } catch (error) {
      console.error('Error deleting unit:', error);
      alert('An error occurred while deleting the unit');
    }
  };

  // Group units by category
  const groupedUnits = units.reduce((acc, unit) => {
    const category = unit.category || 'Other';
    if (!acc[category]) acc[category] = [];
    acc[category].push(unit);
    return acc;
  }, {} as Record<string, Unit[]>);

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Unit Management</h2>
        <button
          onClick={() => handleOpenModal()}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          + Add New Unit
        </button>
      </div>

      {/* Units grouped by category */}
      <div className="space-y-6">
        {Object.entries(groupedUnits).sort(([a], [b]) => a.localeCompare(b)).map(([category, categoryUnits]) => (
          <div key={category} className="bg-white rounded-lg shadow">
            <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">{category}</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Symbol</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {categoryUnits.map((unit) => (
                    <tr key={unit.id} className={!unit.isActive ? 'bg-gray-50 opacity-60' : ''}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{unit.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">{unit.symbol}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">{unit.description || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          unit.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {unit.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        <button
                          onClick={() => handleOpenModal(unit)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleToggleActive(unit)}
                          className={unit.isActive ? 'text-orange-600 hover:text-orange-900' : 'text-green-600 hover:text-green-900'}
                        >
                          {unit.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                        <button
                          onClick={() => handleDelete(unit)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              {editingUnit ? 'Edit Unit' : 'Add New Unit'}
            </h3>

            {error && (
              <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Symbol <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.symbol}
                  onChange={(e) => setFormData({ ...formData, symbol: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Concentration, Count, Volume"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  placeholder="Brief description of when to use this unit"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  disabled={loading}
                >
                  {loading ? 'Saving...' : editingUnit ? 'Update Unit' : 'Add Unit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

