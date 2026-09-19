import React, { createContext, useContext, useEffect, useState } from 'react';
import { authAPI, Usuario } from '../lib/api';

interface AuthContextValue {
  usuario: Usuario | null;
  cargando: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refrescar: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('cp_token');
    if (!token) {
      setCargando(false);
      return;
    }
    authAPI
      .me()
      .then((r) => {
        setUsuario(r.data.usuario);
        try {
          localStorage.setItem('cp_usuario', JSON.stringify(r.data.usuario));
        } catch {
          /* sin almacenamiento */
        }
      })
      .catch(() => {
        localStorage.removeItem('cp_token');
        localStorage.removeItem('cp_usuario');
        setUsuario(null);
      })
      .finally(() => setCargando(false));
  }, []);

  const login = async (email: string, password: string) => {
    const r = await authAPI.login(email, password);
    localStorage.setItem('cp_token', r.data.token);
    localStorage.setItem('cp_usuario', JSON.stringify(r.data.usuario));
    setUsuario(r.data.usuario);
  };

  const logout = () => {
    localStorage.removeItem('cp_token');
    localStorage.removeItem('cp_usuario');
    setUsuario(null);
  };

  const refrescar = async () => {
    const r = await authAPI.me();
    setUsuario(r.data.usuario);
    try {
      localStorage.setItem('cp_usuario', JSON.stringify(r.data.usuario));
    } catch {
      /* sin almacenamiento */
    }
  };

  return (
    <AuthContext.Provider value={{ usuario, cargando, login, logout, refrescar }}>{children}</AuthContext.Provider>
  );
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}