import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { api, getToken, setToken } from './api';
import type { User } from './types';

type AuthState = {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string, displayName: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }
    api.get<{ user: User }>('/api/me')
      .then((data) => setUser(data.user))
      .catch(() => {
        setToken(null);
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  async function login(username: string, password: string) {
    const data = await api.post<{ token: string; user: User }>('/api/auth/login', {
      username,
      password,
    });
    setToken(data.token);
    setUser(data.user);
  }

  async function register(username: string, password: string, displayName: string) {
    const data = await api.post<{ token: string; user: User }>('/api/auth/register', {
      username,
      password,
      displayName,
    });
    setToken(data.token);
    setUser(data.user);
  }

  async function logout() {
    try {
      await api.post('/api/auth/logout');
    } finally {
      setToken(null);
      setUser(null);
    }
  }

  async function refresh() {
    const data = await api.get<{ user: User }>('/api/me');
    setUser(data.user);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
