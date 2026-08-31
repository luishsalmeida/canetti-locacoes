import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Equipamento, CategoriaEquipamento } from '../types';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Modal } from '../components/Modal';
import { Search, Plus, Cpu, Edit, Trash } from 'lucide-react';

export const EquipamentosList: React.FC = () => {
  const [equipamentos, setEquipamentos] = useState<Equipamento[]>([]);
  const [categorias, setCategorias] = useState<CategoriaEquipamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEquipamento, setEditingEquipamento] = useState<Equipamento | null>(null);

  // Form states
  const [descricao, setDescricao] = useState('');
  const [categoriaId, setCategoriaId] = useState<number>(1);
  const [status, setStatus] = useState<'DISPONIVEL' | 'LOCADO' | 'MANUTENCAO' | 'INATIVO'>('DISPONIVEL');
  const [observacoes, setObservacoes] = useState('');

  const carregarDados = async () => {
    setLoading(true);
    try {
      const resEquips = await api.get<Equipamento[]>(`/equipamentos?search=${search}`);
      setEquipamentos(resEquips);
      setCategorias([
        { id: 1, nome: 'Estética', ativo: true },
        { id: 2, nome: 'Fisioterapia', ativo: true },
      ]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, [search]);

  const handleOpenCreate = () => {
    setEditingEquipamento(null);
    setDescricao('');
    setCategoriaId(1);
    setStatus('DISPONIVEL');
    setObservacoes('');
    setModalOpen(true);
  };

  const handleOpenEdit = (eq: Equipamento) => {
    setEditingEquipamento(eq);
    setDescricao(eq.descricao);
    setCategoriaId(eq.categoriaId);
    setStatus(eq.status);
    setObservacoes(eq.observacoes || '');
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      descricao,
      categoriaId: Number(categoriaId),
      status,
      observacoes,
    };

    try {
      if (editingEquipamento) {
        await api.put(`/equipamentos/${editingEquipamento.id}`, payload);
      } else {
        await api.post('/equipamentos', payload);
      }
      setModalOpen(false);
      carregarDados();
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Erro ao salvar equipamento');
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm('Deseja realmente deletar este equipamento?')) {
      try {
        await api.delete(`/equipamentos/${id}`);
        carregarDados();
      } catch (err: any) {
        console.error(err);
        alert(err.message || 'Erro ao deletar equipamento');
      }
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Cadastro de Aparelhos</h2>
          <p className="text-sm font-medium text-slate-500">Gerencie o parque de equipamentos disponíveis para locação</p>
        </div>
        <Button onClick={handleOpenCreate} leftIcon={<Plus className="w-4 h-4" />}>
          Novo Aparelho
        </Button>
      </div>

      <div className="relative w-full max-w-md">
        <span className="absolute left-3.5 top-3 text-slate-400">
          <Search className="w-4 h-4" />
        </span>
        <Input
          placeholder="Pesquisar por nome do aparelho..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      ) : equipamentos.length === 0 ? (
        <div className="text-center p-12 bg-white rounded-2xl border border-slate-100 flex flex-col items-center gap-2">
          <Cpu className="w-8 h-8 text-slate-300" />
          <h3 className="font-bold text-slate-700">Nenhum equipamento encontrado</h3>
          <p className="text-sm text-slate-500">Cadastre novos aparelhos para iniciar as locações.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {equipamentos.map((eq) => (
            <div
              key={eq.id}
              className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow p-6 flex flex-col gap-4 relative overflow-hidden"
            >
              <div className="absolute top-4 right-4 flex gap-1">
                <button
                  onClick={() => handleOpenEdit(eq)}
                  className="text-slate-400 hover:text-indigo-600 p-1.5 rounded-lg hover:bg-slate-50"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(eq.id)}
                  className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-slate-50"
                >
                  <Trash className="w-4 h-4" />
                </button>
              </div>

              <div className="flex flex-col gap-1">
                <span
                  className={`inline-flex self-start px-2 py-0.5 rounded-full text-xs font-semibold ${
                    eq.status === 'DISPONIVEL'
                      ? 'bg-emerald-50 text-emerald-700'
                      : eq.status === 'LOCADO'
                      ? 'bg-indigo-50 text-indigo-700'
                      : 'bg-amber-50 text-amber-700'
                  }`}
                >
                  {eq.status}
                </span>
                <h3 className="text-lg font-bold text-slate-800 pr-12 mt-1">{eq.descricao}</h3>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingEquipamento ? 'Editar Aparelho' : 'Cadastrar Aparelho'}
        maxWidth="lg"
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            label="Nome do Aparelho *"
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            required
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-semibold text-slate-700">Categoria</label>
              <select
                value={categoriaId}
                onChange={(e) => setCategoriaId(Number(e.target.value))}
                className="w-full px-3.5 py-2 rounded-lg border border-slate-300 bg-white"
              >
                {categorias.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.nome}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-semibold text-slate-700">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full px-3.5 py-2 rounded-lg border border-slate-300 bg-white"
              >
                <option value="DISPONIVEL">Disponível</option>
                <option value="LOCADO">Locado</option>
                <option value="MANUTENCAO">Manutenção</option>
                <option value="INATIVO">Inativo</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 border-t border-slate-100 pt-4 mt-2">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit">
              {editingEquipamento ? 'Salvar Alterações' : 'Cadastrar'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
