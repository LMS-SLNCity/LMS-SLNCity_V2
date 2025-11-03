import React, { createContext, useContext, useState, ReactNode, useCallback, useEffect } from 'react';
import { User, Permission } from '../types';
import { apiClient } from '../api/client';

interface AuthContextType {
  user: User | null;
  login: (username: string, password_hash: string) => Promise<void>;
  logout: () => void;
  hasPermission: (permission: Permission) => boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Restore session on mount
  useEffect(() => {
    const restoreSession = async () => {
      // Check sessionStorage first (persists only during browser session, survives refresh)
      const sessionToken = sessionStorage.getItem('authToken');
      const token = sessionToken || localStorage.getItem('authToken');

      console.log('🔄 Attempting session restore...');
      console.log('📍 Token found in:', sessionToken ? 'sessionStorage' : (token ? 'localStorage' : 'none'));

      if (!token) {
        console.log('❌ No token found, showing login screen');
        setIsLoading(false);
        return;
      }

      try {
        // Decode JWT to check role (without verification)
        let payload;
        try {
          const base64Url = token.split('.')[1];
          const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
          payload = JSON.parse(atob(base64));
          console.log('🔍 Token payload:', payload);
        } catch (decodeError) {
          console.error('❌ Failed to decode token:', decodeError);
          // If we can't decode, clear the token and show login
          sessionStorage.removeItem('authToken');
          localStorage.removeItem('authToken');
          setUser(null);
          setIsLoading(false);
          return;
        }

        let response;

        // Check if it's a B2B client token based on role
        if (payload.role === 'B2B_CLIENT') {
          console.log('🏢 Detected B2B_CLIENT token, using verify-client endpoint');
          response = await fetch('http://localhost:5001/api/auth/verify-client', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            }
          });
        } else {
          console.log('👤 Detected staff token, using verify endpoint');
          response = await fetch('http://localhost:5001/api/auth/verify', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            }
          });
        }

        if (response.ok) {
          const data = await response.json();
          console.log('✅ Session restored successfully!');
          console.log('👤 User:', data.user.username);
          console.log('🎭 Role:', data.user.role);
          console.log('📋 Permissions:', data.user.permissions);
          setUser(data.user);
          // Store in sessionStorage for this browser session
          sessionStorage.setItem('authToken', token);
        } else {
          console.log('❌ Token verification failed');
          // Token invalid or expired, clear it
          sessionStorage.removeItem('authToken');
          localStorage.removeItem('authToken');
          setUser(null);
        }
      } catch (error) {
        console.error('❌ Session restoration error:', error);
        sessionStorage.removeItem('authToken');
        localStorage.removeItem('authToken');
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    restoreSession();
  }, []);

  const login = async (username: string, password_hash: string): Promise<void> => {
    try {
      const response = await apiClient.login(username, password_hash);
      if (response && response.user && response.token) {
        // Store token in sessionStorage (persists during browser session, survives refresh)
        sessionStorage.setItem('authToken', response.token);
        // Also store in localStorage as backup for "remember me" functionality
        localStorage.setItem('authToken', response.token);
        setUser(response.user);
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Login failed');
    }
  };

  const logout = useCallback(async () => {
    // Log the logout event
    if (user) {
      try {
        const authToken = sessionStorage.getItem('authToken') || localStorage.getItem('authToken');
        await fetch('http://localhost:5001/api/auth/logout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          },
          body: JSON.stringify({
            username: user.username,
            userId: user.id
          })
        });
      } catch (error) {
        console.error('Error logging logout:', error);
        // Continue with logout even if logging fails
      }
    }

    // Clear tokens from both storages
    sessionStorage.removeItem('authToken');
    localStorage.removeItem('authToken');
    setUser(null);
  }, [user]);

  const hasPermission = useCallback((permission: Permission): boolean => {
    if (!user) {
        return false;
    }
    return user.permissions?.includes(permission) || false;
  }, [user]);


  return (
    <AuthContext.Provider value={{ user, login, logout, hasPermission, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};