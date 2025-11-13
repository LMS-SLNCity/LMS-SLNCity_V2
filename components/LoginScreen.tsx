import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../config/api';
import { Building2, User, Lock, LogIn } from 'lucide-react';

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

      const response = await fetch(`${API_BASE_URL}/auth/client-login`, {
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-slate-50 flex flex-col justify-center items-center p-4">
      <div className="max-w-md w-full mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4">
            <Building2 className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 leading-tight">
            Sri Lakshmi Narasimha City<br/>Diagnostic Center
          </h1>
          <p className="text-sm text-gray-500 mt-2 font-medium">(SLNCity)</p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
          {/* Tab Navigation */}
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setLoginTab('staff')}
              className={`flex-1 py-3.5 px-4 text-sm font-semibold transition-all relative ${
                loginTab === 'staff'
                  ? 'text-blue-600 bg-blue-50'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <User className="h-4 w-4" />
                Staff Login
              </div>
              {loginTab === 'staff' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"></div>
              )}
            </button>
            <button
              onClick={() => setLoginTab('client')}
              className={`flex-1 py-3.5 px-4 text-sm font-semibold transition-all relative ${
                loginTab === 'client'
                  ? 'text-blue-600 bg-blue-50'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Building2 className="h-4 w-4" />
                Client Login
              </div>
              {loginTab === 'client' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"></div>
              )}
            </button>
          </div>

          <div className="p-8">
            {/* Staff Login Tab */}
            {loginTab === 'staff' && (
              <>
                <h2 className="text-lg font-semibold text-gray-900 text-center mb-6">
                  Lab Management System
                </h2>
                <form onSubmit={handleStaffSubmit} className="space-y-5">
                  <div>
                    <label
                      htmlFor="username"
                      className="block text-sm font-medium text-gray-700 mb-1.5"
                    >
                      Username
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <input
                        id="username"
                        name="username"
                        type="text"
                        autoComplete="username"
                        required
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-300 bg-white text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm"
                        placeholder="Enter your username"
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="password"
                      className="block text-sm font-medium text-gray-700 mb-1.5"
                    >
                      Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <input
                        id="password"
                        name="password"
                        type="password"
                        autoComplete="current-password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-300 bg-white text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm"
                        placeholder="Enter your password"
                      />
                    </div>
                  </div>

                  {error && loginTab === 'staff' && (
                    <div className="flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-200 p-3 rounded-lg">
                      <span className="font-medium">{error}</span>
                    </div>
                  )}

                  <div>
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 border border-transparent rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all"
                    >
                      {isLoading ? (
                        'Signing in...'
                      ) : (
                        <>
                          <LogIn className="h-4 w-4" />
                          Sign in
                        </>
                      )}
                    </button>
                  </div>
                  <div className="text-center text-xs text-gray-500 bg-gray-50 p-2 rounded">
                      <p>Use: sudo/sudo, admin/admin, reception/reception</p>
                  </div>
                </form>
              </>
            )}

            {/* Client Login Tab */}
            {loginTab === 'client' && (
              <>
                <h2 className="text-lg font-semibold text-gray-900 text-center mb-6">
                  B2B Client Portal
                </h2>
                <form onSubmit={handleClientSubmit} className="space-y-5">
                  <div>
                    <label
                      htmlFor="clientId"
                      className="block text-sm font-medium text-gray-700 mb-1.5"
                    >
                      Client ID
                    </label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <input
                        id="clientId"
                        name="clientId"
                        type="number"
                        required
                        value={clientId}
                        onChange={(e) => setClientId(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-300 bg-white text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm"
                        placeholder="Enter your client ID"
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="clientPassword"
                      className="block text-sm font-medium text-gray-700 mb-1.5"
                    >
                      Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <input
                        id="clientPassword"
                        name="clientPassword"
                        type="password"
                        autoComplete="current-password"
                        required
                        value={clientPassword}
                        onChange={(e) => setClientPassword(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-300 bg-white text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm"
                        placeholder="Enter your password"
                      />
                    </div>
                  </div>

                  {error && loginTab === 'client' && (
                    <div className="flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-200 p-3 rounded-lg">
                      <span className="font-medium">{error}</span>
                    </div>
                  )}

                  <div>
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 border border-transparent rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all"
                    >
                      {isLoading ? (
                        'Signing in...'
                      ) : (
                        <>
                          <LogIn className="h-4 w-4" />
                          Sign in
                        </>
                      )}
                    </button>
                  </div>
                  <div className="text-center text-xs text-gray-500 bg-gray-50 p-2 rounded">
                      <p>Contact admin for client credentials</p>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
       <footer className="text-center py-4 text-sm text-gray-500 mt-8">
          <p>&copy; 2025 Sri Lakshmi Narasimha City Diagnostic Center. All rights reserved.</p>
        </footer>
    </div>
  );
};