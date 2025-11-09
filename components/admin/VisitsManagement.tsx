import React, { useState, useEffect } from 'react';
import { Visit } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useAppContext } from '../../context/AppContext';

// API Base URL from environment variable
const API_BASE_URL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : 'http://localhost:5001/api';

export const VisitsManagement: React.FC = () => {
    const { user: actor } = useAuth();
    const { clients } = useAppContext();
    const [visits, setVisits] = useState<Visit[]>([]);
    const [filteredVisits, setFilteredVisits] = useState<Visit[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Filter states
    const [filters, setFilters] = useState({
        searchTerm: '',
        paymentMode: '',
        dateFrom: '',
        dateTo: '',
        minAmount: '',
        maxAmount: '',
        b2bClient: '',
        clientType: '',
    });

    // Load visits on mount
    useEffect(() => {
        loadVisits();
    }, []);

    // Apply filters whenever they change
    useEffect(() => {
        applyFilters();
    }, [visits, filters]);

    const loadVisits = async () => {
        try {
            setLoading(true);
            const authToken = sessionStorage.getItem('authToken') || localStorage.getItem('authToken');

            if (!authToken) {
                setError('No authentication token found. Please login again.');
                setLoading(false);
                return;
            }

            console.log('Loading visits from:', `${API_BASE_URL}/visits`);
            const response = await fetch(`${API_BASE_URL}/visits`, {
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                },
            });

            if (response.ok) {
                const data = await response.json();
                console.log('Loaded visits:', data.length);
                setVisits(data);
                setError(null);
            } else {
                const errorText = await response.text();
                console.error('Failed to load visits:', response.status, errorText);
                setError(`Failed to load visits: ${response.status} ${response.statusText}`);
            }
        } catch (err) {
            console.error('Error loading visits:', err);
            setError(`Error loading visits: ${err instanceof Error ? err.message : 'Unknown error'}`);
        } finally {
            setLoading(false);
        }
    };

    const applyFilters = () => {
        let filtered = [...visits];

        // Search filter (patient name, phone, visit code, B2B client name)
        if (filters.searchTerm) {
            const term = filters.searchTerm.toLowerCase();
            filtered = filtered.filter(v =>
                v.patient.name.toLowerCase().includes(term) ||
                v.patient.phone.includes(term) ||
                v.visit_code.toLowerCase().includes(term) ||
                (v.b2bClient?.name.toLowerCase().includes(term) ?? false)
            );
        }

        // Payment mode filter
        if (filters.paymentMode) {
            filtered = filtered.filter(v => v.payment_mode === filters.paymentMode);
        }

        // Date range filter
        if (filters.dateFrom) {
            filtered = filtered.filter(v => new Date(v.created_at) >= new Date(filters.dateFrom));
        }
        if (filters.dateTo) {
            const endDate = new Date(filters.dateTo);
            endDate.setHours(23, 59, 59, 999);
            filtered = filtered.filter(v => new Date(v.created_at) <= endDate);
        }

        // Amount range filter
        if (filters.minAmount) {
            filtered = filtered.filter(v => v.total_cost >= parseFloat(filters.minAmount));
        }
        if (filters.maxAmount) {
            filtered = filtered.filter(v => v.total_cost <= parseFloat(filters.maxAmount));
        }

        // B2B Client filter
        if (filters.b2bClient) {
            filtered = filtered.filter(v => v.b2bClient?.id === parseInt(filters.b2bClient));
        }

        // Client Type filter
        if (filters.clientType) {
            filtered = filtered.filter(v => v.b2bClient?.type === filters.clientType);
        }

        setFilteredVisits(filtered);
    };

    const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const resetFilters = () => {
        setFilters({
            searchTerm: '',
            paymentMode: '',
            dateFrom: '',
            dateTo: '',
            minAmount: '',
            maxAmount: '',
            b2bClient: '',
            clientType: '',
        });
    };

    const exportToCSV = () => {
        const headers = ['Visit Code', 'Patient Name', 'Phone', 'Age', 'Sex', 'B2B Client', 'Client Type', 'Client Balance', 'Total Cost', 'Amount Paid', 'Due Amount', 'Payment Mode', 'Date', 'Tests Count'];
        const rows = filteredVisits.map(v => [
            v.visit_code,
            v.patient.name,
            v.patient.phone,
            `${v.patient.age_years}y ${v.patient.age_months}m ${v.patient.age_days}d`,
            v.patient.sex,
            v.b2bClient?.name || 'N/A',
            v.b2bClient?.type || 'N/A',
            v.b2bClient?.balance.toFixed(2) || 'N/A',
            v.total_cost.toFixed(2),
            v.amount_paid.toFixed(2),
            v.due_amount.toFixed(2),
            v.payment_mode || 'N/A',
            new Date(v.created_at).toLocaleDateString(),
            v.tests.length,
        ]);

        const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `visits_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
    };

    const exportToJSON = () => {
        const json = JSON.stringify(filteredVisits, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `visits_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        window.URL.revokeObjectURL(url);
    };

    if (loading) {
        return <div className="text-center py-8">Loading visits...</div>;
    }

    return (
        <div>
            <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-700 mb-2">Visits Management</h3>
                <p className="text-sm text-gray-600">View, filter, and export all visits</p>
            </div>

            {error && (
                <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-lg">
                    {error}
                </div>
            )}

            {/* Filters */}
            <div className="mb-6 p-6 border border-gray-200 rounded-lg bg-gray-50">
                <h4 className="text-md font-semibold text-gray-800 mb-4">Filters</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <input
                        type="text"
                        name="searchTerm"
                        placeholder="Search by name, phone, or visit code"
                        value={filters.searchTerm}
                        onChange={handleFilterChange}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <select
                        name="paymentMode"
                        value={filters.paymentMode}
                        onChange={handleFilterChange}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="">All Payment Modes</option>
                        <option value="Cash">Cash</option>
                        <option value="Card">Card</option>
                        <option value="UPI">UPI</option>
                    </select>
                    <input
                        type="date"
                        name="dateFrom"
                        value={filters.dateFrom}
                        onChange={handleFilterChange}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <input
                        type="date"
                        name="dateTo"
                        value={filters.dateTo}
                        onChange={handleFilterChange}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                        type="number"
                        name="minAmount"
                        placeholder="Min Amount"
                        value={filters.minAmount}
                        onChange={handleFilterChange}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                        type="number"
                        name="maxAmount"
                        placeholder="Max Amount"
                        value={filters.maxAmount}
                        onChange={handleFilterChange}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <select
                        name="b2bClient"
                        value={filters.b2bClient}
                        onChange={handleFilterChange}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="">All B2B Clients</option>
                        {clients.map(client => (
                            <option key={client.id} value={client.id}>
                                {client.name} ({client.type})
                            </option>
                        ))}
                    </select>
                    <select
                        name="clientType"
                        value={filters.clientType}
                        onChange={handleFilterChange}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="">All Client Types</option>
                        <option value="PATIENT">Patient</option>
                        <option value="REFERRAL_LAB">Referral Lab</option>
                        <option value="INTERNAL">Internal</option>
                    </select>
                </div>
                <div className="flex space-x-3">
                    <button
                        onClick={resetFilters}
                        className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                    >
                        Reset Filters
                    </button>
                    <button
                        onClick={exportToCSV}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
                        Export CSV
                    </button>
                    <button
                        onClick={exportToJSON}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                        Export JSON
                    </button>
                </div>
            </div>

            {/* Results Summary */}
            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-gray-700">
                    Showing <span className="font-semibold">{filteredVisits.length}</span> of <span className="font-semibold">{visits.length}</span> visits
                </p>
            </div>

            {/* Visits Table */}
            <div className="overflow-x-auto border border-gray-200 rounded-lg">
                <table className="min-w-full bg-white">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Visit Code</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Patient</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Phone</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Age</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">B2B Client</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Client Type</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Total Cost</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Paid</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Due</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Mode</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Tests</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Date</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {filteredVisits.map((visit, index) => (
                            <tr key={visit.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                <td className="px-4 py-3 text-sm font-medium text-gray-800">{visit.visit_code}</td>
                                <td className="px-4 py-3 text-sm text-gray-600">{visit.patient.name}</td>
                                <td className="px-4 py-3 text-sm text-gray-600">{visit.patient.phone}</td>
                                <td className="px-4 py-3 text-sm text-gray-600">{visit.patient.age_years}y {visit.patient.age_months}m</td>
                                <td className="px-4 py-3 text-sm text-gray-600">
                                    {visit.b2bClient ? (
                                        <span className="font-medium text-blue-600">{visit.b2bClient.name}</span>
                                    ) : (
                                        <span className="text-gray-400">Direct</span>
                                    )}
                                </td>
                                <td className="px-4 py-3 text-sm">
                                    {visit.b2bClient ? (
                                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                            visit.b2bClient.type === 'PATIENT' ? 'bg-blue-100 text-blue-800' :
                                            visit.b2bClient.type === 'REFERRAL_LAB' ? 'bg-purple-100 text-purple-800' :
                                            'bg-green-100 text-green-800'
                                        }`}>
                                            {visit.b2bClient.type.replace('_', ' ')}
                                        </span>
                                    ) : (
                                        <span className="text-gray-400">-</span>
                                    )}
                                </td>
                                <td className="px-4 py-3 text-sm font-medium text-gray-800">₹{visit.total_cost.toFixed(2)}</td>
                                <td className="px-4 py-3 text-sm text-green-600">₹{visit.amount_paid.toFixed(2)}</td>
                                <td className="px-4 py-3 text-sm text-red-600">₹{visit.due_amount.toFixed(2)}</td>
                                <td className="px-4 py-3 text-sm">
                                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                        visit.payment_mode === 'Cash' ? 'bg-blue-100 text-blue-800' :
                                        visit.payment_mode === 'Card' ? 'bg-purple-100 text-purple-800' :
                                        visit.payment_mode === 'UPI' ? 'bg-green-100 text-green-800' :
                                        'bg-gray-100 text-gray-800'
                                    }`}>
                                        {visit.payment_mode || 'N/A'}
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-600">{visit.tests.length}</td>
                                <td className="px-4 py-3 text-sm text-gray-600">{new Date(visit.created_at).toLocaleDateString()}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {filteredVisits.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                    <p>No visits found matching your filters.</p>
                </div>
            )}
        </div>
    );
};

