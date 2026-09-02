import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Colaborador } from '../types';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Modal } from '../components/Modal';
import { Search, Plus, UserCheck, Edit, Trash, Shield, Truck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const ColaboradoresList: React.FC = () => {
  const { usuario } = useAuth();
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'TECNICO' | 'MOTORISTA'>('TECNICO');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingColaborador, setEditingColaborador] = useState<Colaborador | null>(null);
  const [acessoModalOpen, setAcessoModalOpen] = useState(false);
  const [colaboradorParaAcesso, setColaboradorParaAcesso] = useState<Colaborador | null>(null);
  const [loginAcesso, setLoginAcesso] = useState('');
  const [senhaAcesso, setSenhaAcesso] = useState('');

  // Form states
  const [nome, setNome] = useState('');
  const [funcao, setFuncao] = useState<'TECNICO' | 'MOTORISTA'>('TECNICO');
  const [telefone, setTelefone] = useState('');
  const [ativo, setAtivo] = useState(true);

  const carregarDados = async () => {
    setLoading(true);
    try {
      const res = await api.get<Colaborador[]>(`/colaboradores?search=${search}`);
      setColaboradores(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, [search]);

  const handleOpenCreate = (defaultFuncao: 'TECNICO' | 'MOTORISTA') => {
    setEditingColaborador(null);
    setNome('');
    setFuncao(defaultFuncao);
    setTelefone('');
    setAtivo(true);
    setModalOpen(true);
  };

  const handleOpenEdit = (col: Colaborador) => {
    setEditingColaborador(col);
    setNome(col.nome);
    setFuncao(col.funcao);
    setTelefone(col.telefone || '');
    setAtivo(col.ativo);
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      nome,
      funcao,
      telefone: telefone || null,
      ativo,
    };

    try {
      if (editingColaborador) {
        await api.put(`/colaboradores/${editingColaborador.id}`, payload);
      } else {
        await api.post('/colaboradores', payload);
      }
      setModalOpen(false);
      carregarDados();
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Erro ao salvar colaborador');
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm('Deseja realmente deletar este colaborador?')) {
      try {
        await api.delete(`/colaboradores/${id}`);
        carregarDados();
      } catch (err: any) {
        console.error(err);
        alert(err.message || 'Erro ao deletar colaborador');
      }
    }
  };

  const sugerirLogin = (nomeColaborador: string) => nomeColaborador
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().trim().replace(/\s+/g, '.').replace(/[^a-z0-9._-]/g, '').slice(0, 30);

  const handleOpenAcesso = (colaborador: Colaborador) => {
    setColaboradorParaAcesso(colaborador);
    setLoginAcesso(sugerirLogin(colaborador.nome));
    setSenhaAcesso('');
    setAcessoModalOpen(true);
  };

  const handleCriarAcesso = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!colaboradorParaAcesso) return;
    try {
      await api.post('/usuarios/colaborador', {
        colaboradorId: colaboradorParaAcesso.id,
        login: loginAcesso,
        senha: senhaAcesso,
      });
      setAcessoModalOpen(false);
      carregarDados();
      alert(`Acesso criado para ${colaboradorParaAcesso.nome}.`);
    } catch (err: any) {
      alert(err.message || 'Não foi possível criar o acesso');
    }
  };

  const filtrados = colaboradores.filter((c) => c.funcao === tab);

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Colaboradores</h2>
          <p className="text-sm font-medium text-slate-500">Gerencie técnicos e motoristas responsáveis</p>
        </div>
        <Button onClick={() => handleOpenCreate(tab)} leftIcon={<Plus className="w-4 h-4" />}>
          Novo {tab === 'TECNICO' ? 'Técnico' : 'Motorista'}
        </Button>
      </div>

      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex gap-2 bg-slate-100 p-1.5 rounded-2xl w-full md:w-auto">
          <button
            onClick={() => setTab('TECNICO')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${
              tab === 'TECNICO' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Shield className="w-4 h-4" />
            Técnicos ({colaboradores.filter((c) => c.funcao === 'TECNICO').length})
          </button>
          <button
            onClick={() => setTab('MOTORISTA')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${
              tab === 'MOTORISTA' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Truck className="w-4 h-4" />
            Motoristas ({colaboradores.filter((c) => c.funcao === 'MOTORISTA').length})
          </button>
        </div>

        <div className="relative w-full md:w-80">
          <span className="absolute left-3.5 top-3 text-slate-400">
            <Search className="w-4 h-4" />
          </span>
          <Input
            placeholder="Pesquisar por nome..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      ) : filtrados.length === 0 ? (
        <div className="text-center p-12 bg-white rounded-2xl border border-slate-100 flex flex-col items-center gap-2">
          <UserCheck className="w-8 h-8 text-slate-300" />
          <h3 className="font-bold text-slate-700">Nenhum {tab === 'TECNICO' ? 'técnico' : 'motorista'} encontrado</h3>
          <p className="text-sm text-slate-500">Cadastre novos colaboradores para alocar nas locações.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtrados.map((col) => (
            <div
              key={col.id}
              className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow p-6 flex flex-col gap-4 relative overflow-hidden"
            >
              <div className="absolute top-4 right-4 flex gap-1">
                <button
                  onClick={() => handleOpenEdit(col)}
                  className="text-slate-400 hover:text-indigo-600 p-1.5 rounded-lg hover:bg-slate-50"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(col.id)}
                  className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-slate-50"
                >
                  <Trash className="w-4 h-4" />
                </button>
              </div>

              <div className="flex flex-col gap-1.5">
                <span
                  className={`inline-flex self-start px-2 py-0.5 rounded-full text-xs font-semibold ${
                    col.ativo ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {col.ativo ? 'Ativo' : 'Inativo'}
                </span>
                <h3 className="text-lg font-bold text-slate-800 pr-12 mt-1">{col.nome}</h3>
              </div>

              <div className="border-t border-slate-100 pt-3 text-sm text-slate-600">
                {col.telefone && <div>Telefone: <span className="font-medium text-slate-800">{col.telefone}</span></div>}
              </div>
              {usuario?.perfil === 'ADMIN' && (
                col.usuarioAcesso ? (
                  <div className="rounded-xl bg-emerald-50 text-emerald-700 px-3 py-2 text-xs font-bold">Acesso ativo: {col.usuarioAcesso.login}</div>
                ) : (
                  <Button variant="outline" onClick={() => handleOpenAcesso(col)}>Criar acesso à agenda</Button>
                )
              )}
            </div>
          ))}
        </div>
      )}

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingColaborador ? 'Editar Colaborador' : `Cadastrar ${tab === 'TECNICO' ? 'Técnico' : 'Motorista'}`}
        maxWidth="lg"
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            label="Nome do Colaborador *"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            required
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-semibold text-slate-700">Função *</label>
              <select
                value={funcao}
                onChange={(e) => setFuncao(e.target.value as any)}
                className="w-full px-3.5 py-2 rounded-lg border border-slate-300 bg-white"
              >
                <option value="TECNICO">Técnico Responsável</option>
                <option value="MOTORISTA">Motorista Responsável</option>
              </select>
            </div>
            <Input
              label="Telefone / Contato"
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
              placeholder="(00) 00000-0000"
            />
          </div>

          <div className="flex items-center gap-2 mt-2">
            <input
              type="checkbox"
              id="ativoColab"
              checked={ativo}
              onChange={(e) => setAtivo(e.target.checked)}
              className="w-4 h-4 text-indigo-600 rounded border-slate-300"
            />
            <label htmlFor="ativoColab" className="text-sm font-semibold text-slate-700">Colaborador Ativo</label>
          </div>

          <div className="flex justify-end gap-3 border-t border-slate-100 pt-4 mt-2">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit">
              {editingColaborador ? 'Salvar Alterações' : 'Cadastrar'}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={acessoModalOpen}
        onClose={() => setAcessoModalOpen(false)}
        title={`Criar acesso: ${colaboradorParaAcesso?.nome || ''}`}
        maxWidth="md"
      >
        <form onSubmit={handleCriarAcesso} className="flex flex-col gap-4">
          <p className="text-sm text-slate-600">Esta conta terá apenas visualização dos agendamentos em que {colaboradorParaAcesso?.funcao === 'MOTORISTA' ? 'o motorista' : 'a técnica'} estiver relacionado(a). Ela não poderá alterar agendamentos ou acessar os demais cadastros.</p>
          <Input label="Login *" value={loginAcesso} onChange={(event) => setLoginAcesso(event.target.value.toLowerCase())} required placeholder="ex.: maria.silva" />
          <Input label="Senha inicial *" type="password" value={senhaAcesso} onChange={(event) => setSenhaAcesso(event.target.value)} required minLength={8} placeholder="Mínimo de 8 caracteres" />
          <div className="flex justify-end gap-3 border-t border-slate-100 pt-4 mt-2">
            <Button type="button" variant="outline" onClick={() => setAcessoModalOpen(false)}>Cancelar</Button>
            <Button type="submit">Criar acesso</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
