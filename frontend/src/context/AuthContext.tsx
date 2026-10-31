import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, WebAuthnCredentialSummary } from '../types/index.js';
import { api } from '../services/api.js';
import { executeWebAuthnRegistration } from '../services/webauthn.js';

interface AuthContextType {
  user: User | null;
  authenticators: WebAuthnCredentialSummary[];
  hasBiometrics: boolean;
  isLoading: boolean;
  error: string | null;
  isAdmin: boolean;
  isOfficer: boolean;
  isVoter: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  loginWithWebAuthn: (identifier: string) => Promise<void>;
  register: (data: {
    student_id: string;
    email: string;
    full_name: string;
    department: string;
    batch_year: number;
    password: string;
  }) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  enrollBiometrics: (deviceName?: string) => Promise<void>;
  resetBiometricKeys: (password: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [authenticators, setAuthenticators] = useState<WebAuthnCredentialSummary[]>([]);
  const [hasBiometrics, setHasBiometrics] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCurrentUser = async () => {
    try {
      if (!api.getToken()) {
        setIsLoading(false);
        return;
      }
      const data = await api.getCurrentUser();
      setUser(data.user);
      setAuthenticators(data.authenticators || []);
      setHasBiometrics(data.hasBiometrics);
    } catch (err: any) {
      console.warn('Session expired or invalid:', err.message);
      api.setToken(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  const login = async (identifier: string, password: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.login(identifier, password);
      setUser(res.user);
      setHasBiometrics(res.hasBiometrics);
      await fetchCurrentUser();
    } catch (err: any) {
      setError(err.message || 'Login failed');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithWebAuthn = async (identifier: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const { options, userId } = await api.getLoginOptions(identifier);
      const { executeWebAuthnAuthentication } = await import('../services/webauthn.js');
      const authResponse = await executeWebAuthnAuthentication(options);
      const res = await api.verifyLogin(userId, authResponse);
      setUser(res.user);
      setHasBiometrics(true);
      await fetchCurrentUser();
    } catch (err: any) {
      setError(err.message || 'Biometric login failed');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: any) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.register(data);
      setUser(res.user);
      setHasBiometrics(false);
      await fetchCurrentUser();
    } catch (err: any) {
      setError(err.message || 'Registration failed');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    api.setToken(null);
    setUser(null);
    setAuthenticators([]);
    setHasBiometrics(false);
  };

  const refreshUser = async () => {
    await fetchCurrentUser();
  };

  const enrollBiometrics = async (deviceName: string = 'Touch ID / Biometric Passkey') => {
    try {
      const options = await api.getRegisterOptions();
      const regResponse = await executeWebAuthnRegistration(options);
      await api.verifyRegistration(regResponse, deviceName);
      await fetchCurrentUser();
    } catch (err: any) {
      throw err;
    }
  };

  const resetBiometricKeys = async (password: string) => {
    await api.resetBiometrics(password);
    await fetchCurrentUser();
  };

  const isAdmin = user?.role === 'ADMIN';
  const isOfficer = user?.role === 'ELECTION_OFFICER';
  const isVoter = user?.role === 'VOTER';

  return (
    <AuthContext.Provider
      value={{
        user,
        authenticators,
        hasBiometrics,
        isLoading,
        error,
        isAdmin,
        isOfficer,
        isVoter,
        login,
        loginWithWebAuthn,
        register,
        logout,
        refreshUser,
        enrollBiometrics,
        resetBiometricKeys,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

