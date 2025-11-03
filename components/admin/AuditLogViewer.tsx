import React, { useState, useEffect } from 'react';
import { AuditLog } from '../../types';

export const AuditLogViewer: React.FC = () => {
    const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Filter states
    const [username, setUsername] = useState('all');
    const [action, setAction] = useState('all');
    const [resource, setResource] = useState('all');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    // Available filter options
    const [usernames, setUsernames] = useState<string[]>([]);
    const [actions, setActions] = useState<string[]>([]);
    const [resources, setResources] = useState<string[]>([]);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [totalLogs, setTotalLogs] = useState(0);
    const logsPerPage = 50;

    // Expanded row for viewing details
    const [expandedLogId, setExpandedLogId] = useState<number | null>(null);

    // Fetch filter options on mount
    useEffect(() => {
        fetchFilterOptions();
    }, []);

    // Fetch logs when filters change
    useEffect(() => {
        fetchAuditLogs();
    }, [username, action, resource, startDate, endDate, searchQuery, currentPage]);

    const fetchFilterOptions = async () => {
        try {
            const authToken = localStorage.getItem('authToken');

            const [usernamesRes, actionsRes, resourcesRes] = await Promise.all([
                fetch('http://localhost:5001/api/audit-logs/users', {
                    headers: { 'Authorization': `Bearer ${authToken}` }
                }),
                fetch('http://localhost:5001/api/audit-logs/actions', {
                    headers: { 'Authorization': `Bearer ${authToken}` }
                }),
                fetch('http://localhost:5001/api/audit-logs/resources', {
                    headers: { 'Authorization': `Bearer ${authToken}` }
                })
            ]);

            if (usernamesRes.ok) setUsernames(await usernamesRes.json());
            if (actionsRes.ok) setActions(await actionsRes.json());
            if (resourcesRes.ok) setResources(await resourcesRes.json());
        } catch (error) {
            console.error('Error fetching filter options:', error);
        }
    };

    const fetchAuditLogs = async () => {
        setLoading(true);
        setError(null);

        try {
            const authToken = localStorage.getItem('authToken');
            const params = new URLSearchParams({
                limit: logsPerPage.toString(),
                offset: ((currentPage - 1) * logsPerPage).toString()
            });

            if (username !== 'all') params.append('username', username);
            if (action !== 'all') params.append('action', action);
            if (resource !== 'all') params.append('resource', resource);
            if (startDate) params.append('start_date', startDate);
            if (endDate) params.append('end_date', endDate);
            if (searchQuery) params.append('search', searchQuery);

            const response = await fetch(`http://localhost:5001/api/audit-logs?${params}`, {
                headers: { 'Authorization': `Bearer ${authToken}` }
            });

            if (!response.ok) throw new Error('Failed to fetch audit logs');

            const data = await response.json();
            setAuditLogs(data.logs);
            setTotalLogs(data.total);
        } catch (error) {
            console.error('Error fetching audit logs:', error);
            setError('Failed to load audit logs');
        } finally {
            setLoading(false);
        }
    };

    const handleClearFilters = () => {
        setUsername('all');
        setAction('all');
        setResource('all');
        setStartDate('');
        setEndDate('');
        setSearchQuery('');
        setCurrentPage(1);
    };

    const getActionBadgeColor = (action: string) => {
        if (action.includes('CREATE')) return 'bg-green-100 text-green-800';
        if (action.includes('UPDATE') || action.includes('EDIT')) return 'bg-blue-100 text-blue-800';
        if (action.includes('DELETE')) return 'bg-red-100 text-red-800';
        if (action.includes('APPROVE')) return 'bg-purple-100 text-purple-800';
        if (action.includes('REJECT')) return 'bg-orange-100 text-orange-800';
        if (action.includes('LOGIN')) return 'bg-indigo-100 text-indigo-800';
        return 'bg-gray-100 text-gray-800';
    };

    const totalPages = Math.ceil(totalLogs / logsPerPage);

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-700">Application Audit Log</h3>
                <div className="text-sm text-gray-500">
                    Total Logs: {totalLogs}
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Username Filter */}
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">User</label>
                        <select
                            value={username}
                            onChange={(e) => { setUsername(e.target.value); setCurrentPage(1); }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="all">All Users</option>
                            {usernames.map(u => (
                                <option key={u} value={u}>{u}</option>
                            ))}
                        </select>
                    </div>

                    {/* Action Filter */}
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Action</label>
                        <select
                            value={action}
                            onChange={(e) => { setAction(e.target.value); setCurrentPage(1); }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="all">All Actions</option>
                            {actions.map(a => (
                                <option key={a} value={a}>{a}</option>
                            ))}
                        </select>
                    </div>

                    {/* Resource Filter */}
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Resource</label>
                        <select
                            value={resource}
                            onChange={(e) => { setResource(e.target.value); setCurrentPage(1); }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="all">All Resources</option>
                            {resources.map(r => (
                                <option key={r} value={r}>{r}</option>
                            ))}
                        </select>
                    </div>

                    {/* Search */}
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Search</label>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                            placeholder="Search details..."
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Start Date */}
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Start Date</label>
                        <input
                            type="datetime-local"
                            value={startDate}
                            onChange={(e) => { setStartDate(e.target.value); setCurrentPage(1); }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    {/* End Date */}
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">End Date</label>
                        <input
                            type="datetime-local"
                            value={endDate}
                            onChange={(e) => { setEndDate(e.target.value); setCurrentPage(1); }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    {/* Clear Filters Button */}
                    <div className="flex items-end">
                        <button
                            onClick={handleClearFilters}
                            className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-400"
                        >
                            Clear Filters
                        </button>
                    </div>
                </div>
            </div>

            {/* Loading/Error States */}
            {loading && (
                <div className="text-center py-8 text-gray-500">Loading audit logs...</div>
            )}

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                    {error}
                </div>
            )}

            {/* Audit Logs Table */}
            {!loading && !error && (
                <div className="overflow-x-auto border border-gray-200 rounded-lg">
                    <table className="min-w-full bg-white">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Timestamp</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">User</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Action</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Resource</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Details</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {auditLogs.map((log, index) => (
                                <React.Fragment key={log.id}>
                                    <tr className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50 hover:bg-gray-100'}>
                                        <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">
                                            {new Date(log.timestamp).toLocaleString()}
                                        </td>
                                        <td className="px-4 py-3 text-xs font-medium text-gray-800">
                                            {log.username}
                                            {log.user_role && (
                                                <span className="ml-2 text-xs text-gray-500">({log.user_role})</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-xs text-gray-600">
                                            <span className={`px-2 py-0.5 font-mono text-xs font-medium rounded-full ${getActionBadgeColor(log.action)}`}>
                                                {log.action}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-xs text-gray-600">
                                            {log.resource && (
                                                <span className="font-mono text-xs">
                                                    {log.resource}
                                                    {log.resource_id && ` #${log.resource_id}`}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-xs text-gray-600 max-w-md truncate">
                                            {log.details}
                                        </td>
                                        <td className="px-4 py-3 text-xs">
                                            <button
                                                onClick={() => setExpandedLogId(expandedLogId === log.id ? null : log.id)}
                                                className="text-blue-600 hover:text-blue-800 font-medium"
                                            >
                                                {expandedLogId === log.id ? 'Hide' : 'View'}
                                            </button>
                                        </td>
                                    </tr>
                                    {expandedLogId === log.id && (
                                        <tr className="bg-blue-50">
                                            <td colSpan={6} className="px-4 py-4">
                                                <div className="space-y-2 text-xs">
                                                    <div><strong>Full Details:</strong> {log.details}</div>
                                                    {log.ip_address && <div><strong>IP Address:</strong> {log.ip_address}</div>}
                                                    {log.old_values && (
                                                        <div>
                                                            <strong>Old Values:</strong>
                                                            <pre className="mt-1 p-2 bg-white rounded border text-xs overflow-x-auto">
                                                                {JSON.stringify(log.old_values, null, 2)}
                                                            </pre>
                                                        </div>
                                                    )}
                                                    {log.new_values && (
                                                        <div>
                                                            <strong>New Values:</strong>
                                                            <pre className="mt-1 p-2 bg-white rounded border text-xs overflow-x-auto">
                                                                {JSON.stringify(log.new_values, null, 2)}
                                                            </pre>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            ))}
                            {auditLogs.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="text-center py-8 text-sm text-gray-500">
                                        No audit logs found matching the filters.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Pagination */}
            {!loading && !error && totalPages > 1 && (
                <div className="flex justify-between items-center">
                    <div className="text-sm text-gray-600">
                        Showing {((currentPage - 1) * logsPerPage) + 1} to {Math.min(currentPage * logsPerPage, totalLogs)} of {totalLogs} logs
                    </div>
                    <div className="flex space-x-2">
                        <button
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Previous
                        </button>
                        <span className="px-3 py-1 text-sm text-gray-700">
                            Page {currentPage} of {totalPages}
                        </span>
                        <button
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
