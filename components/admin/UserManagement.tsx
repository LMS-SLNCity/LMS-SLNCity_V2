import React, { useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { Role, User } from '../../types';
import { Input } from '../form/Input';
import { Select } from '../form/Select';
import { UserPermissionsModal } from './UserPermissionsModal';
import { SignatureUploadModal } from './SignatureUploadModal';
import { useAuth } from '../../context/AuthContext';
import { API_BASE_URL } from '../../config/api';

export const UserManagement: React.FC = () => {
    const { users, addUser, reloadData } = useAppContext();
    const { user: actor } = useAuth();

    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState<Role>('RECEPTION');
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [uploadingSignatureFor, setUploadingSignatureFor] = useState<User | null>(null);

    const handleDeleteUser = async (userToDelete: User) => {
        if (!actor) {
            alert("User session has expired. Please log in again.");
            return;
        }

        if (userToDelete.role === 'SUDO') {
            alert("Cannot delete SUDO user.");
            return;
        }

        const confirmDelete = window.confirm(
            `Are you sure you want to delete user "${userToDelete.username}"?\n\n` +
            `This action cannot be undone. All audit logs will be preserved.`
        );

        if (!confirmDelete) return;

        try {
            const authToken = localStorage.getItem('authToken');
            const response = await fetch(`${API_BASE_URL}/users/${userToDelete.id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                },
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
                throw new Error(errorData.error || 'Failed to delete user');
            }

            alert(`User "${userToDelete.username}" deleted successfully.`);
            await reloadData();
        } catch (error) {
            console.error('Error deleting user:', error);
            alert(`Failed to delete user: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if(!username || !password || !role) {
            alert('Please fill all fields');
            return;
        }
        if (!actor) {
            alert("User session has expired. Please log in again.");
            return;
        }
        try {
            await addUser({ username, password_hash: password, role }, actor);
            setUsername('');
            setPassword('');
            setRole('RECEPTION');
            alert('User created successfully');
        } catch (error) {
            console.error('Failed to create user:', error);
            alert('Failed to create user. Please try again.');
        }
    };

    const roleOptions: Role[] = ['SUDO', 'ADMIN', 'RECEPTION', 'PHLEBOTOMY', 'LAB', 'APPROVER'];

    return (
        <>
        {editingUser && (
            <UserPermissionsModal
                user={editingUser}
                onClose={() => setEditingUser(null)}
            />
        )}
        {uploadingSignatureFor && (
            <SignatureUploadModal
                approver={uploadingSignatureFor}
                onClose={() => setUploadingSignatureFor(null)}
            />
        )}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
                <h3 className="text-lg font-semibold text-gray-700 mb-4">Existing Users</h3>
                <div className="overflow-x-auto border border-gray-200 rounded-lg">
                    <table className="min-w-full bg-white">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">ID</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Username</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Role</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Permissions</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Signature</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {users.map((user, index) => (
                                <tr key={user.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50 hover:bg-gray-100'}>
                                    <td className="px-4 py-3 text-sm text-gray-600">{user.id}</td>
                                    <td className="px-4 py-3 text-sm font-medium text-gray-800">{user.username}</td>
                                    <td className="px-4 py-3 text-sm text-gray-600">{user.role}</td>
                                    <td className="px-4 py-3 text-sm">
                                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                            {user.isActive ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-sm">
                                        <div className="flex flex-wrap gap-1 max-w-xs">
                                            {user.role === 'SUDO' ? (
                                                <span className="px-2 py-0.5 text-xs font-medium rounded bg-purple-100 text-purple-800">
                                                    ALL
                                                </span>
                                            ) : user.permissions && user.permissions.length > 0 ? (
                                                <>
                                                    {user.permissions.slice(0, 3).map(perm => (
                                                        <span key={perm} className="px-2 py-0.5 text-xs font-medium rounded bg-blue-100 text-blue-800">
                                                            {perm.replace(/_/g, ' ').split(' ').map(w => w[0]).join('')}
                                                        </span>
                                                    ))}
                                                    {user.permissions.length > 3 && (
                                                        <span className="px-2 py-0.5 text-xs font-medium rounded bg-gray-100 text-gray-800">
                                                            +{user.permissions.length - 3}
                                                        </span>
                                                    )}
                                                </>
                                            ) : (
                                                <span className="text-xs text-gray-400">None</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-sm">
                                        {(user.role === 'APPROVER' || user.role === 'SUDO' || user.permissions?.includes('APPROVE_RESULTS')) ? (
                                            <button
                                                onClick={() => {
                                                    console.log('Signature button clicked for user:', user);
                                                    setUploadingSignatureFor(user);
                                                }}
                                                className={`px-2 py-1 text-xs font-medium rounded ${user.signatureImageUrl ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}
                                            >
                                                {user.signatureImageUrl ? '✓ Uploaded' : '+ Add Signature'}
                                            </button>
                                        ) : (
                                            <span className="text-xs text-gray-400">N/A</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-sm">
                                        <div className="flex items-center gap-3">
                                            <button
                                                onClick={() => setEditingUser(user)}
                                                className="font-medium text-brand-primary hover:text-brand-primary_hover"
                                            >
                                                Edit Permissions
                                            </button>
                                            {user.role !== 'SUDO' && (
                                                <button
                                                    onClick={() => handleDeleteUser(user)}
                                                    className="font-medium text-red-600 hover:text-red-800"
                                                >
                                                    Delete
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            <div>
                <h3 className="text-lg font-semibold text-gray-700 mb-4">Create New User</h3>
                <form onSubmit={handleSubmit} className="p-6 border border-gray-200 rounded-lg bg-gray-50 space-y-4">
                    <Input label="Username" name="username" value={username} onChange={e => setUsername(e.target.value)} required />
                    <Input label="Password" name="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
                    <Select label="Role (template)" name="role" value={role} onChange={e => setRole(e.target.value as Role)} options={roleOptions} required />
                    <button type="submit" className="w-full flex justify-center items-center gap-2 px-4 py-2 bg-brand-primary text-white font-semibold rounded-lg shadow-md hover:bg-brand-primary_hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                           <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
                        </svg>
                        Create User
                    </button>
                </form>
            </div>
        </div>
        </>
    );
};