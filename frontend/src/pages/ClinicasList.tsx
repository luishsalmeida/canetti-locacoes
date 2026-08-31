import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Clinica } from '../types';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Modal } from '../components/Modal';
import { Search, Plus, MapPin, Building, ShieldAlert, Phone, User, Edit, Trash } from 'lucide-react';

export const ClinicasList: React.FC = () => {
  const [clinicas, setClinicas] = useState<Clinica[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingClinica, setEditingClinica] = useState<Clinica | null>(null);

  // Form states
  const [razaoSocial, setRazaoSocial] = useState('');
  const [nomeFantasia, setNomeFantasia] = useState('');
  const [tipoPessoa, setTipoPessoa] = useState<'FISICA' | 'JURIDICA'>('JURIDICA');
  const [cnpjCpf, setCnpjCpf] = useState('');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');
  const [celular, setCelular] = useState('');
  const [contato, setContato] = useState('');
  const [endereco, setEndereco] = useState('');
  const [numero, setNumero] = useState('');
  const [bairro, setBairro] = useState('');
  const [cidade, setCidade] = useState('');
  const [ie, setIe] = useState('');
  const [uf, setUf] = useState('');
  const [cep, setCep] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [status, setStatus] = useState<'ATIVA' | 'BLOQUEADA' | 'INADIMPLENTE'>('ATIVA');
  const [limiteCredito, setLimiteCredito] = useState(0);

  const carregarClinicas = async () => {
    setLoading(true);
    try {
      const data = await api.get<Clinica[]>(`/clinicas?search=${search}`);
      setClinicas(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarClinicas();
  }, [search]);

  const handleOpenCreate = () => {
    setEditingClinica(null);
    setRazaoSocial('');
    setNomeFantasia('');
    setTipoPessoa('JURIDICA');
    setCnpjCpf('');
    setEmail('');
    setTelefone('');
    setCelular('');
    setContato('');
    setEndereco('');
    setNumero('');
    setBairro('');
    setCidade('');
    setUf('');
    setCep('');
    setIe('');
    setObservacoes('');
    setStatus('ATIVA');
    setLimiteCredito(0);
    setModalOpen(true);
  };

  const handleOpenEdit = (clinica: Clinica) => {
    setEditingClinica(clinica);
    setRazaoSocial(clinica.razaoSocial);
    setNomeFantasia(clinica.nomeFantasia || '');
    setTipoPessoa(clinica.tipoPessoa);
    setCnpjCpf(clinica.cnpjCpf || '');
    setEmail(clinica.email || '');
    setTelefone(clinica.telefone || '');
    setCelular(clinica.celular || '');
    setContato(clinica.contato || '');
    setEndereco(clinica.endereco || '');
    setNumero(clinica.numero || '');
    setBairro(clinica.bairro || '');
    setCidade(clinica.cidade || '');
    setUf(clinica.uf || '');
    setCep(clinica.cep || '');
    setIe(clinica.ie || '');
    setObservacoes(clinica.observacoes || '');
    setStatus(clinica.status);
    setLimiteCredito(clinica.limiteCredito);
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      razaoSocial,
      nomeFantasia,
      tipoPessoa,
      cnpjCpf,
      ie,
      email,
      telefone,
      celular,
      contato,
      endereco,
      numero,
      bairro,
      cidade,
      uf,
      cep,
      observacoes,
      status,
      limiteCredito,
    };

    try {
      if (editingClinica) {
        await api.put(`/clinicas/${editingClinica.id}`, payload);
      } else {
        await api.post('/clinicas', payload);
      }
      setModalOpen(false);
      carregarClinicas();
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Erro ao salvar clínica');
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm('Deseja realmente deletar esta clínica?')) {
      try {
        await api.delete(`/clinicas/${id}`);
        carregarClinicas();
      } catch (err) {
        console.error(err);
      }
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Cadastro de Clínicas</h2>
          <p className="text-sm font-medium text-slate-500">Gerencie as clínicas clientes parceiras da Canetti</p>
        </div>
        <Button onClick={handleOpenCreate} leftIcon={<Plus className="w-4 h-4" />}>
          Nova Clínica
        </Button>
      </div>

      <div className="relative w-full max-w-md">
        <span className="absolute left-3.5 top-3 text-slate-400">
          <Search className="w-4 h-4" />
        </span>
        <Input
          placeholder="Pesquisar por razão social, nome fantasia, cnpj..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      ) : clinicas.length === 0 ? (
        <div className="text-center p-12 bg-white rounded-2xl border border-slate-100 flex flex-col items-center gap-2">
          <Building className="w-8 h-8 text-slate-300" />
          <h3 className="font-bold text-slate-700">Nenhuma clínica encontrada</h3>
          <p className="text-sm text-slate-500">Crie um novo registro ou mude seus filtros.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {clinicas.map((clinica) => (
            <div
              key={clinica.id}
              className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow p-6 flex flex-col gap-4 relative overflow-hidden"
            >
              <div className="absolute top-4 right-4 flex gap-1">
                <button
                  onClick={() => handleOpenEdit(clinica)}
                  className="text-slate-400 hover:text-indigo-600 p-1.5 rounded-lg hover:bg-slate-50"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(clinica.id)}
                  className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-slate-50"
                >
                  <Trash className="w-4 h-4" />
                </button>
              </div>

              <div className="flex flex-col gap-1">
                <span
                  className={`inline-flex self-start px-2 py-0.5 rounded-full text-xs font-semibold ${
                    clinica.status === 'ATIVA'
                      ? 'bg-emerald-50 text-emerald-700'
                      : clinica.status === 'BLOQUEADA'
                      ? 'bg-amber-50 text-amber-700'
                      : 'bg-rose-50 text-rose-700'
                  }`}
                >
                  {clinica.status}
                </span>
                <h3 className="text-base font-bold text-slate-800 pr-12 line-clamp-1">{clinica.razaoSocial}</h3>
                {clinica.nomeFantasia && (
                  <p className="text-xs font-semibold text-slate-500 line-clamp-1">{clinica.nomeFantasia}</p>
                )}
              </div>

              <div className="border-t border-slate-100 pt-4 flex flex-col gap-2.5 text-sm text-slate-600">
                {clinica.cnpjCpf && (
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-slate-400" />
                    <span>CNPJ/CPF: {clinica.cnpjCpf}</span>
                  </div>
                )}
                {clinica.cidade && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-slate-400" />
                    <span>{clinica.cidade} — {clinica.uf}</span>
                  </div>
                )}
                {(clinica.telefone || clinica.celular) && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-slate-400" />
                    <span>{clinica.celular || clinica.telefone}</span>
                  </div>
                )}
                {clinica.contato && (
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-slate-400" />
                    <span>Contato: {clinica.contato}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingClinica ? 'Editar Clínica' : 'Cadastrar Clínica'}
        maxWidth="2xl"
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Razão Social *"
              value={razaoSocial}
              onChange={(e) => setRazaoSocial(e.target.value)}
              required
            />
            <Input
              label="Nome Fantasia"
              value={nomeFantasia}
              onChange={(e) => setNomeFantasia(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-semibold text-slate-700">Tipo de Pessoa</label>
              <select
                value={tipoPessoa}
                onChange={(e) => setTipoPessoa(e.target.value as 'FISICA' | 'JURIDICA')}
                className="w-full px-3.5 py-2 rounded-lg border border-slate-300 bg-white"
              >
                <option value="JURIDICA">Pessoa Jurídica</option>
                <option value="FISICA">Pessoa Física</option>
              </select>
            </div>
            <Input
              label="CNPJ / CPF"
              value={cnpjCpf}
              onChange={(e) => setCnpjCpf(e.target.value)}
            />
            <Input
              label="Inscrição Estadual"
              value={ie}
              onChange={(e) => setIe(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Input
              label="Telefone"
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
            />
            <Input
              label="Celular"
              value={celular}
              onChange={(e) => setCelular(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Contato Principal"
              value={contato}
              onChange={(e) => setContato(e.target.value)}
            />
            <div className="flex flex-col gap-1">
              <label className="text-sm font-semibold text-slate-700">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as 'ATIVA' | 'BLOQUEADA' | 'INADIMPLENTE')}
                className="w-full px-3.5 py-2 rounded-lg border border-slate-300 bg-white"
              >
                <option value="ATIVA">Ativa</option>
                <option value="BLOQUEADA">Bloqueada</option>
                <option value="INADIMPLENTE">Inadimplente</option>
              </select>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4 mt-2">
            <h4 className="text-sm font-bold text-slate-700 mb-3">Endereço</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <Input
                  label="Logradouro"
                  value={endereco}
                  onChange={(e) => setEndereco(e.target.value)}
                />
              </div>
              <Input
                label="Número"
                value={numero}
                onChange={(e) => setNumero(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
              <div className="md:col-span-2">
                <Input
                  label="Cidade"
                  value={cidade}
                  onChange={(e) => setCidade(e.target.value)}
                />
              </div>
              <Input
                label="Estado (UF)"
                maxLength={2}
                value={uf}
                onChange={(e) => setUf(e.target.value)}
              />
              <Input
                label="CEP"
                value={cep}
                onChange={(e) => setCep(e.target.value)}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 border-t border-slate-100 pt-4 mt-2">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit">
              {editingClinica ? 'Salvar Alterações' : 'Cadastrar'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
