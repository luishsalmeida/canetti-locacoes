import React from 'react';
import { Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { Login } from './pages/Login';
import { Agenda } from './pages/Agenda';
import { ClinicasList } from './pages/ClinicasList';
import { EquipamentosList } from './pages/EquipamentosList';
import { ColaboradoresList } from './pages/ColaboradoresList';
import { Relatorios } from './pages/Relatorios';
import { Calendar, Building2, Cpu, Users, BarChart3, LogOut, User, Menu, X } from 'lucide-react';
import logoCanetti from './assets/logo-canetti.svg';

const App: React.FC = () => {
  const { autenticado, usuario, logout, carregando } = useAuth();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const location = useLocation();

  if (carregando) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!autenticado) {
    return <Login />;
  }

  const menuItems = [
    { label: 'Agenda / Locações', path: '/', icon: Calendar },
    { label: 'Clínicas', path: '/clinicas', icon: Building2 },
    { label: 'Aparelhos', path: '/equipamentos', icon: Cpu },
    { label: 'Colaboradores', path: '/colaboradores', icon: Users },
    { label: 'Relatórios', path: '/relatorios', icon: BarChart3 },
  ];

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col lg:flex-row">
      {/* Sidebar Desktop */}
      <aside className="hidden lg:flex w-72 bg-white border-r border-slate-200 flex-col justify-between p-6">
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-center px-1 py-3">
            <img src={logoCanetti} alt="Canetti Locações" className="w-full max-w-[210px] h-auto object-contain" />
          </div>

          <nav className="flex flex-col gap-1.5">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const active = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                    active
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                      : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex flex-col gap-4 pt-6 border-t border-slate-100">
          <div className="flex items-center gap-3 px-2">
            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold">
              <User className="w-4 h-4" />
            </div>
            <div className="flex flex-col overflow-hidden">
              <span className="text-sm font-bold text-slate-800 truncate">{usuario?.nome}</span>
              <span className="text-xs text-slate-400 capitalize">{usuario?.perfil?.toLowerCase()}</span>
            </div>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-3 w-full px-4 py-2.5 rounded-xl text-sm font-bold text-rose-600 hover:bg-rose-50 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sair do Sistema
          </button>
        </div>
      </aside>

      {/* Header Mobile */}
      <div className="lg:hidden bg-white border-b border-slate-200 p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src={logoCanetti} alt="Canetti Locações" className="h-9 w-auto object-contain" />
        </div>
        <button onClick={() => setSidebarOpen(true)} className="p-2 hover:bg-slate-100 rounded-xl">
          <Menu className="w-6 h-6 text-slate-700" />
        </button>
      </div>

      {/* Conteúdo Principal */}
      <main className="flex-1 overflow-y-auto">
        <Routes>
          <Route path="/" element={<Agenda />} />
          <Route path="/clinicas" element={<ClinicasList />} />
          <Route path="/equipamentos" element={<EquipamentosList />} />
          <Route path="/colaboradores" element={<ColaboradoresList />} />
          <Route path="/relatorios" element={<Relatorios />} />
        </Routes>
      </main>

      {/* Sidebar Mobile Modal */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden bg-slate-900/40 backdrop-blur-sm">
          <div className="w-72 bg-white flex flex-col h-full animate-slide-in">
            <div className="p-4 flex items-center justify-between border-b border-slate-50">
              <img src={logoCanetti} alt="Canetti Locações" className="h-8 w-auto object-contain" />
              <button onClick={() => setSidebarOpen(false)} className="p-1 hover:bg-slate-50 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 p-4 flex flex-col gap-1">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const active = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
                      active
                        ? 'bg-indigo-50 text-indigo-600'
                        : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
            <div className="p-4 border-t border-slate-50">
              <button
                onClick={logout}
                className="flex items-center gap-3 w-full px-4 py-2.5 rounded-xl text-sm font-bold text-rose-500 hover:bg-rose-50"
              >
                <LogOut className="w-4 h-4" />
                Sair
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
