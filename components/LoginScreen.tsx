import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

type LoginTab = 'staff' | 'client';

export const LoginScreen: React.FC = () => {
  const [loginTab, setLoginTab] = useState<LoginTab>('staff');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [clientId, setClientId] = useState('');
  const [clientPassword, setClientPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();

  const handleStaffSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      await login(username, password);
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClientSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      if (!clientId || !clientPassword) {
        throw new Error('Client ID and password are required');
      }

      const response = await fetch('http://localhost:5001/api/auth/client-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: parseInt(clientId),
          password: clientPassword,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Login failed');
      }

      const data = await response.json();

      console.log('✅ B2B Client login successful:', data.user);

      // Clear any existing session first
      sessionStorage.clear();
      localStorage.clear();

      // Store new token in both sessionStorage and localStorage
      sessionStorage.setItem('authToken', data.token);
      localStorage.setItem('authToken', data.token);

      // Reload the page to trigger session restore with new token
      window.location.reload();
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col justify-center items-center p-4">
      <div className="max-w-md w-full mx-auto">
        <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-brand-secondary leading-tight">
            Sri Lakshmi Narasimha<br/>Diagnostic Center
            </h1>
            <p className="text-sm text-gray-500 mt-2">(SLNCity)</p>
        </div>
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Tab Navigation */}
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setLoginTab('staff')}
              className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
                loginTab === 'staff'
                  ? 'bg-brand-primary text-white'
                  : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
              }`}
            >
              Staff Login
            </button>
            <button
              onClick={() => setLoginTab('client')}
              className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
                loginTab === 'client'
                  ? 'bg-brand-primary text-white'
                  : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
              }`}
            >
              Client Login
            </button>
          </div>

          <div className="p-8">
            {/* Staff Login Tab */}
            {loginTab === 'staff' && (
              <>
                <h2 className="text-xl font-semibold text-gray-800 text-center mb-6">
                  Lab Management System Login
                </h2>
                <form onSubmit={handleStaffSubmit} className="space-y-6">
                  <div>
                    <label
                      htmlFor="username"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Username
                    </label>
                    <div className="mt-1">
                      <input
                        id="username"
                        name="username"
                        type="text"
                        autoComplete="username"
                        required
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 bg-white text-gray-900 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-primary sm:text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="password"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Password
                    </label>
                    <div className="mt-1">
                      <input
                        id="password"
                        name="password"
                        type="password"
                        autoComplete="current-password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 bg-white text-gray-900 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-primary sm:text-sm"
                      />
                    </div>
                  </div>

                  {error && loginTab === 'staff' && (
                    <div className="text-sm text-red-700 bg-red-100 p-3 rounded-lg">
                      {error}
                    </div>
                  )}

                  <div>
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-brand-primary hover:bg-brand-primary_hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary disabled:bg-gray-400"
                    >
                      {isLoading ? 'Signing in...' : 'Sign in'}
                    </button>
                  </div>
                  <div className="text-center text-xs text-gray-500">
                      <p>Use: sudo/sudo, admin/admin, reception/reception</p>
                  </div>
                </form>
              </>
            )}

            {/* Client Login Tab */}
            {loginTab === 'client' && (
              <>
                <h2 className="text-xl font-semibold text-gray-800 text-center mb-6">
                  B2B Client Portal
                </h2>
                <form onSubmit={handleClientSubmit} className="space-y-6">
                  <div>
                    <label
                      htmlFor="clientId"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Client ID
                    </label>
                    <div className="mt-1">
                      <input
                        id="clientId"
                        name="clientId"
                        type="number"
                        required
                        value={clientId}
                        onChange={(e) => setClientId(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 bg-white text-gray-900 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-primary sm:text-sm"
                        placeholder="Enter your client ID"
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="clientPassword"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Password
                    </label>
                    <div className="mt-1">
                      <input
                        id="clientPassword"
                        name="clientPassword"
                        type="password"
                        autoComplete="current-password"
                        required
                        value={clientPassword}
                        onChange={(e) => setClientPassword(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 bg-white text-gray-900 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-primary sm:text-sm"
                        placeholder="Enter your password"
                      />
                    </div>
                  </div>

                  {error && loginTab === 'client' && (
                    <div className="text-sm text-red-700 bg-red-100 p-3 rounded-lg">
                      {error}
                    </div>
                  )}

                  <div>
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-brand-primary hover:bg-brand-primary_hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary disabled:bg-gray-400"
                    >
                      {isLoading ? 'Signing in...' : 'Sign in'}
                    </button>
                  </div>
                  <div className="text-center text-xs text-gray-500">
                      <p>Contact admin for client credentials</p>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
       <footer className="text-center py-4 text-sm text-gray-500 mt-8">
          <p>&copy; 2024 Sri Lakshmi Narasimha Diagnostic Center. All rights reserved.</p>
        </footer>
    </div>
  );
};