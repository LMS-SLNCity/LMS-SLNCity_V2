import React, { useState } from 'react';
import { User, Permission } from '../../types';
import { useAppContext } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';

interface UserPermissionsModalProps {
  user: User;
  onClose: () => void;
}

const allPermissions: Permission[] = [
    'VIEW_RECEPTION', 'CREATE_VISIT', 'COLLECT_DUE_PAYMENT',
    'VIEW_PHLEBOTOMY', 'COLLECT_SAMPLE',
    'VIEW_LAB', 'ENTER_RESULTS',
    'VIEW_APPROVER', 'APPROVE_RESULTS',
    'VIEW_ADMIN_PANEL', 'MANAGE_USERS', 'MANAGE_ROLES',
    'MANAGE_TESTS', 'MANAGE_PRICES', 'MANAGE_B2B', 'MANAGE_ANTIBIOTICS',
    'EDIT_APPROVED_REPORT', 'VIEW_AUDIT_LOG'
];


export const UserPermissionsModal: React.FC<UserPermissionsModalProps> = ({ user, onClose }) => {
    const { updateUserPermissions } = useAppContext();
    const { user: actor } = useAuth();
    const [permissions, setPermissions] = useState<Permission[]>(user.permissions || []);

    // Debug: Log user permissions
    React.useEffect(() => {
        console.log('UserPermissionsModal - User:', user);
        console.log('UserPermissionsModal - User permissions:', user.permissions);
        console.log('UserPermissionsModal - State permissions:', permissions);
    }, []);

    const handlePermissionChange = (permission: Permission, checked: boolean) => {
        setPermissions(prev => {
            const newPermissions = checked
                ? [...prev, permission]
                : prev.filter(p => p !== permission);
            return Array.from(new Set(newPermissions));
        });
    };

    const handleSave = () => {
        if (!actor) {
            alert("User session has expired. Please log in again.");
            return;
        }
        updateUserPermissions(user.id, permissions, actor);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60" aria-labelledby="modal-title" role="dialog" aria-modal="true">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl transform transition-all max-h-[90vh] flex flex-col">
                <div className="p-6 border-b border-gray-200">
                    <h3 className="text-xl font-bold text-gray-900" id="modal-title">
                        Edit Permissions for {user.username}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                        Role: {user.role} (Role permissions are used as a template, but you can override them here.)
                    </p>
                </div>

                <div className="p-6 overflow-y-auto flex-grow">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {allPermissions.map(permission => (
                            <label key={permission} className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 border border-gray-200">
                                <input
                                    type="checkbox"
                                    checked={permissions.includes(permission)}
                                    onChange={(e) => handlePermissionChange(permission, e.target.checked)}
                                    disabled={user.role === 'SUDO'} // SUDO permissions cannot be changed
                                    className="h-4 w-4 rounded border-gray-300 text-brand-primary focus:ring-brand-primary disabled:opacity-50"
                                />
                                <span className="text-sm font-medium text-gray-700">{permission.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
                            </label>
                        ))}
                    </div>
                     {user.role === 'SUDO' && (
                        <p className="mt-4 text-sm text-yellow-700 bg-yellow-50 p-3 rounded-lg">
                            SUDO user permissions cannot be edited. This role always has full access.
                        </p>
                    )}
                </div>
                
                <div className="bg-gray-50 px-6 py-4 flex justify-end items-center space-x-3 rounded-b-2xl border-t border-gray-200">
                    <button type="button" onClick={onClose} className="px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50">
                        Cancel
                    </button>
                    <button type="button" onClick={handleSave} disabled={user.role === 'SUDO'} className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 disabled:bg-gray-400">
                        Save Permissions
                    </button>
                </div>
            </div>
        </div>
    );
};
