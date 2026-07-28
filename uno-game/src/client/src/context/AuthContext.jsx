import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

const TOKEN_KEY = 'uno_auth_token';
const AuthContext = createContext(null);

async function parseJson(response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || 'Request failed');
  }
  return data;
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(token));

  useEffect(() => {
    let active = true;

    async function loadMe() {
      if (!token) {
        setUser(null);
        setLoading(false);
        return;
      }

      try {
        const response = await fetch('/api/auth/me', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const currentUser = await parseJson(response);
        if (active) setUser(currentUser);
      } catch {
        localStorage.removeItem(TOKEN_KEY);
        if (active) {
          setToken(null);
          setUser(null);
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadMe();
    return () => {
      active = false;
    };
  }, [token]);

  async function submitAuth(path, payload) {
    const response = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await parseJson(response);
    localStorage.setItem(TOKEN_KEY, data.token);
    setToken(data.token);
    setUser(data.user);
    return data.user;
  }

  async function authFetch(path, options = {}) {
    const headers = {
      ...(options.headers || {}),
      Authorization: `Bearer ${token}`,
    };

    if (options.body && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    return fetch(path, { ...options, headers });
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem('uno_session');
    setToken(null);
    setUser(null);
  }

  const value = useMemo(
    () => ({
      token,
      user,
      loading,
      login: (payload) => submitAuth('/api/auth/login', payload),
      register: (payload) => submitAuth('/api/auth/register', payload),
      authFetch,
      logout,
      setUser,
    }),
    [token, user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }

  return context;
}
