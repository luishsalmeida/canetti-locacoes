import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { KeyRound, User, Sparkles } from 'lucide-react';

export const Login: React.FC = () => {
  const { login } = useAuth();
  const [loginInput, setLoginInput] = useState('');
  const [senhaInput, setSenhaInput] = useState('');
  const [erro, setErro] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');
    setLoading(true);

    try {
      await login(loginInput, senhaInput);
    } catch (err: any) {
      setErro(err.message || 'Erro ao fazer login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 border border-slate-100">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 mb-4 shadow-sm">
            <Sparkles className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-black text-slate-900">Canetti Locações</h1>
          <p className="text-sm font-medium text-slate-500 mt-1">Gestão Inteligente de Equipamentos Clínicos</p>
        </div>

        {erro && (
          <div className="mb-6 p-4 bg-rose-50 border border-rose-100 text-rose-600 text-sm font-bold rounded-xl flex items-center gap-2 animate-shake">
            {erro}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <span className="absolute left-3 top-10 text-slate-400">
              <User className="w-4 h-4" />
            </span>
            <Input
              label="Usuário"
              type="text"
              placeholder="Digite seu usuário"
              value={loginInput}
              onChange={(e) => setLoginInput(e.target.value)}
              className="pl-10"
              disabled={loading}
            />
          </div>

          <div className="relative">
            <span className="absolute left-3 top-10 text-slate-400">
              <KeyRound className="w-4 h-4" />
            </span>
            <Input
              label="Senha"
              type="password"
              placeholder="Digite sua senha"
              value={senhaInput}
              onChange={(e) => setSenhaInput(e.target.value)}
              className="pl-10"
              disabled={loading}
            />
          </div>

          <Button type="submit" disabled={loading} className="w-full py-2.5 mt-2">
            {loading ? 'Entrando...' : 'Entrar no Sistema'}
          </Button>
        </form>
      </div>
    </div>
  );
};
