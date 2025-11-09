import React, { useState, useEffect } from 'react';
import { Client } from '../../types';
import { API_BASE_URL } from '../../config/api';

interface B2BLoginStatus {
  clientId: number;
  name: string;
  type: string;
  hasLogin: boolean;
  isActive: boolean;
  lastLogin?: string;
}

interface B2BAccountManagementModalProps {
  client: Client;
  onClose: () => void;
}

export const B2BAccountManagementModal: React.FC<B2BAccountManagementModalProps> = ({ client, onClose }) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loginStatus, setLoginStatus] = useState<B2BLoginStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchLoginStatus();
  }, [client.id]);

  const fetchLoginStatus = async () => {
    try {
      const authToken = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/clients/${client.id}/login-status`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setLoginStatus(data);
      }
    } catch (error) {
      console.error('Error fetching login status:', error);
    }
  };

  const handleSetupLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (!password || !confirmPassword) {
      setMessage({ type: 'error', text: 'Please fill all fields' });
      return;
    }

    if (password !== confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match' });
      return;
    }

    if (password.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters' });
      return;
    }

    setIsLoading(true);
    try {
      const authToken = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/clients/${client.id}/setup-login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({ password }),
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Login credentials set up successfully' });
        setPassword('');
        setConfirmPassword('');
        await fetchLoginStatus();
      } else {
        const data = await response.json();
        setMessage({ type: 'error', text: data.error || 'Failed to set up login' });
      }
    } catch (error) {
      console.error('Error setting up login:', error);
      setMessage({ type: 'error', text: 'An error occurred' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisableLogin = async () => {
    if (!window.confirm('Are you sure you want to disable this client\'s login access?')) {
      return;
    }

    setIsLoading(true);
    try {
      const authToken = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/clients/${client.id}/disable-login`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Client login disabled successfully' });
        await fetchLoginStatus();
      } else {
        const data = await response.json();
        setMessage({ type: 'error', text: data.error || 'Failed to disable login' });
      }
    } catch (error) {
      console.error('Error disabling login:', error);
      setMessage({ type: 'error', text: 'An error occurred' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-96 overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-800">B2B Account Management</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Client Info */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600">Client ID: <span className="font-semibold">{client.id}</span></p>
            <p className="text-sm text-gray-600">Client Name: <span className="font-semibold">{client.name}</span></p>
          </div>

          {/* Login Status */}
          {loginStatus && (
            <div className={`p-4 rounded-lg ${loginStatus.hasLogin ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'}`}>
              <p className="text-sm font-semibold mb-2">
                {loginStatus.hasLogin ? '✓ Login Configured' : '⚠ No Login Configured'}
              </p>
              {loginStatus.hasLogin && (
                <>
                  <p className="text-xs text-gray-600">Status: <span className={loginStatus.isActive ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                    {loginStatus.isActive ? 'Active' : 'Inactive'}
                  </span></p>
                  {loginStatus.lastLogin && (
                    <p className="text-xs text-gray-600">Last Login: {new Date(loginStatus.lastLogin).toLocaleString()}</p>
                  )}
                </>
              )}
            </div>
          )}

          {/* Messages */}
          {message && (
            <div className={`p-3 rounded-lg text-sm ${
              message.type === 'success'
                ? 'bg-green-100 text-green-800'
                : 'bg-red-100 text-red-800'
            }`}>
              {message.text}
            </div>
          )}

          {/* Setup/Change Password Form */}
          <form onSubmit={handleSetupLogin} className="space-y-4" noValidate>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {loginStatus?.hasLogin ? 'New Password' : 'Set Password'}
              </label>
              <input
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password (min 6 characters)"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary text-sm"
                disabled={isLoading}
                autoComplete="off"
              />
              <p className="text-xs text-gray-500 mt-1">Minimum 6 characters</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confirm Password
              </label>
              <input
                type="text"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm password"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary text-sm"
                disabled={isLoading}
                autoComplete="off"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full px-4 py-2 bg-brand-primary text-white rounded-lg hover:bg-brand-primary-dark disabled:opacity-50 text-sm font-medium"
            >
              {isLoading ? 'Saving...' : loginStatus?.hasLogin ? 'Update Password' : 'Set Up Login'}
            </button>
          </form>

          {/* Disable Login Button */}
          {loginStatus?.hasLogin && (
            <button
              onClick={handleDisableLogin}
              disabled={isLoading}
              className="w-full px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 disabled:opacity-50 text-sm font-medium"
            >
              {isLoading ? 'Disabling...' : 'Disable Client Login'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

