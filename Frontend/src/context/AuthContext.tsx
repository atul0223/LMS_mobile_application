import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  customSignup,
  getMe,
  getStoredToken,
  login,
  removeStoredToken,
  sendOtp,
  setStoredToken,
  verifyOtp,
} from '../services/api';
import { AuthResponse, User } from '../types/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  role: 'student' | 'teacher' | null;
  loginUser: (payload: { identifier: string; password: string }) => Promise<AuthResponse>;
  signupUser: (payload: {
    username: string;
    password: string;
    email: string;
    fullName?: string;
    role: 'student' | 'teacher';
  }) => Promise<AuthResponse>;
  verifyUserOtp: (payload: { identifier: string; otp: string }) => Promise<AuthResponse>;
  sendUserOtp: (identifier: string) => Promise<{ message: string; requiresOtp?: boolean }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<User | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const initAuth = async () => {
    try {
      setIsLoading(true);
      const storedToken = await getStoredToken();
      if (storedToken) {
        setToken(storedToken);
        const res = await getMe();
        if (res?.user) {
          setUser(res.user);
        } else {
          await removeStoredToken();
          setToken(null);
          setUser(null);
        }
      }
    } catch {
      // If token expired or invalid
      await removeStoredToken();
      setToken(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    initAuth();
  }, []);

  const loginUser = async (payload: { identifier: string; password: string }) => {
    const res = await login(payload);
    let currentUser: User | undefined;
    if (res.accessToken) {
      setToken(res.accessToken);
      try {
        const meRes = await getMe();
        setUser(meRes.user);
        currentUser = meRes.user;
      } catch (err) {
        console.error('Failed to fetch user profile after login', err);
      }
    }
    return { ...res, user: currentUser || res.user };
  };

  const signupUser = async (payload: {
    username: string;
    password: string;
    email: string;
    fullName?: string;
    role: 'student' | 'teacher';
  }) => {
    return await customSignup(payload);
  };

  const verifyUserOtp = async (payload: { identifier: string; otp: string }) => {
    const res = await verifyOtp(payload);
    let currentUser: User | undefined;
    if (res.accessToken) {
      setToken(res.accessToken);
      try {
        const meRes = await getMe();
        setUser(meRes.user);
        currentUser = meRes.user;
      } catch (err) {
        console.error('Failed to fetch user profile after OTP verification', err);
      }
    }
    return { ...res, user: currentUser || res.user };
  };

  const sendUserOtp = async (identifier: string) => {
    return await sendOtp(identifier);
  };

  const logout = async () => {
    await removeStoredToken();
    setToken(null);
    setUser(null);
  };

  const refreshUser = async () => {
    try {
      const res = await getMe();
      if (res?.user) {
        setUser(res.user);
        return res.user;
      }
    } catch (e) {
      console.error('refreshUser failed', e);
    }
    return null;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: !!token && !!user,
        role: user?.role || null,
        loginUser,
        signupUser,
        verifyUserOtp,
        sendUserOtp,
        logout,
        refreshUser,
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
