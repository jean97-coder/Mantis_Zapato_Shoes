import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User } from '../types';
import { api, getToken, setToken, clearToken, setUnauthorizedHandler, ApiError } from '../lib/api';

interface AuthContextType {
  currentUser: User | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const logout = useCallback(() => {
    clearToken();
    setCurrentUser(null);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => setCurrentUser(null));
  }, []);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setIsLoading(false);
      return;
    }
    api
      .get<{ user: User }>('/auth/me')
      .then((res) => setCurrentUser(res.user))
      .catch(() => clearToken())
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    try {
      const res = await api.post<{ token: string; user: User }>('/auth/login', { username, password });
      setToken(res.token);
      setCurrentUser(res.user);
    } catch (err) {
      if (err instanceof ApiError) throw new Error(err.message);
      throw err;
    }
  }, []);

  return (
    <AuthContext.Provider value={{ currentUser, isLoading, login, logout }}>{children}</AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
};
