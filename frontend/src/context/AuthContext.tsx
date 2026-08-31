import React, { createContext, useContext, useState, useEffect } from 'react';
import { Usuario } from '../types';
import { api } from '../services/api';

interface AuthContextType {
  usuario: Usuario | null;
  token: string | null;
  autenticado: boolean;
  carregando: boolean;
  login: (login: string, senha: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    async function carregarDados() {
      const storedToken = localStorage.getItem('token');
      if (storedToken) {
        try {
          const res = await api.get<{ usuario: Usuario }>('/auth/me');
          setUsuario(res.usuario);
          setToken(storedToken);
        } catch {
          localStorage.removeItem('token');
        }
      }
      setCarregando(false);
    }
    carregarDados();
  }, []);

  const login = async (loginInput: string, senhaInput: string) => {
    const res = await api.post<{ usuario: Usuario; token: string }>('/auth/login', { login: loginInput, senha: senhaInput });
    localStorage.setItem('token', res.token);
    setUsuario(res.usuario);
    setToken(res.token);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUsuario(null);
    setToken(null);
  };

  return (
    <AuthContext.Provider
      value={{
        usuario,
        token,
        autenticado: !!token,
        carregando,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  return context;
};
