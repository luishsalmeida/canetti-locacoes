import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Locacao, Clinica, Equipamento, Colaborador, StatusLocacao } from '../types';
import { Button } from '../components/Button';
import { Modal } from '../components/Modal';
import { Input } from '../components/Input';
import { ChevronLeft, ChevronRight, Plus, Clock, Shield, Truck, Calendar as CalendarIcon, Search, SlidersHorizontal, X, FileSpreadsheet } from 'lucide-react';
import { format, addMonths, subMonths, addWeeks, subWeeks, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import protocoloLogo from '../assets/canetti-logo-transparent.png';
import { useAuth } from '../context/AuthContext';

interface ItemAgendamento {
  equipamentoId: number;
  valorDiaria: number;
  valoresDisparo?: Record<string, number | string>;
}

const TIPOS_DISPARO: Record<string, string[]> = {
  harmony: ['Disparo Normal', 'Disparo Pixel'],
  m22: ['Disparo Normal'],
  ultraformer: ['Disparo Normal'],
  'ultraformer iii': ['Disparo Normal'],
  liftera: ['Disparo Linear', 'Disparo Caneta'],
  'liftera 2': ['Disparo Linear', 'Disparo Caneta'],
  sylfirm: ['Agulhas usadas'],
  'sylfirm x': ['Agulhas usadas'],
};

const tiposDisparoDoEquipamento = (eq: Equipamento) => eq.tiposDisparo?.length
  ? eq.tiposDisparo
  : TIPOS_DISPARO[(eq.descricao || '').trim().toLowerCase()] || [];

const disparoEhQuantidade = (eq: Equipamento) => /liftera|sylfirm/i.test(eq.descricao || '');
const ehLiftera2 = (eq: Equipamento) => /liftera\s*2/i.test(eq.descricao || '');

const numeroDecimal = (valor: string) => {
  const numero = Number(valor.replace(',', '.'));
  return Number.isFinite(numero) ? numero : 0;
};

export const Agenda: React.FC = () => {
  const { usuario } = useAuth();
  const acessoRestrito = usuario?.perfil === 'COLABORADOR';
  const [currentDate, setCurrentDate] = useState(new Date());
  const [locacoes, setLocacoes] = useState<Locacao[]>([]);
  const [clinicas, setClinicas] = useState<Clinica[]>([]);
  const [equipamentos, setEquipamentos] = useState<Equipamento[]>([]);
  const [tecnicos, setTecnicos] = useState<Colaborador[]>([]);
  const [motoristas, setMotoristas] = useState<Colaborador[]>([]);
  const [loading, setLoading] = useState(true);
  const [modoVisualizacao, setModoVisualizacao] = useState<'MES' | 'SEMANA'>('MES');
  const [busca, setBusca] = useState('');
  const [filtroEquipamentoId, setFiltroEquipamentoId] = useState('');
  const [filtroTecnicoId, setFiltroTecnicoId] = useState('');
  const [filtroMotoristaId, setFiltroMotoristaId] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<'' | StatusLocacao>('');

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedLocacao, setSelectedLocacao] = useState<Locacao | null>(null);

  // Form states
  const [clinicaId, setClinicaId] = useState<string | number>('');
  const [dataInicio, setDataInicio] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [horaInicio, setHoraInicio] = useState('08:00');
  const [horaFim, setHoraFim] = useState('18:00');
  const [enderecoLocacao, setEnderecoLocacao] = useState('');
  const [cidadeLocacao, setCidadeLocacao] = useState('');
  const [tecnicoId, setTecnicoId] = useState<string | number>('');
  const [motoristaId, setMotoristaId] = useState<string | number>('');
  const [itensLocacao, setItensLocacao] = useState<ItemAgendamento[]>([]);
  const [valorDesconto, setValorDesconto] = useState<number>(0);
  const [formaPagamento, setFormaPagamento] = useState<'EMPRESA' | 'DR'>('EMPRESA');
  const [valorPagamento, setValorPagamento] = useState<number>(0);
  const [statusPagamento, setStatusPagamento] = useState<'PENDENTE' | 'RECEBIDO'>('PENDENTE');
  const [observacoes, setObservacoes] = useState('');
  const [status, setStatus] = useState<StatusLocacao>('AGENDADA');

  const periodoInicio = modoVisualizacao === 'SEMANA'
    ? startOfWeek(currentDate, { weekStartsOn: 1 })
    : startOfMonth(currentDate);
  const periodoFim = modoVisualizacao === 'SEMANA'
    ? endOfWeek(currentDate, { weekStartsOn: 1 })
    : endOfMonth(currentDate);
  const diasVisiveis = eachDayOfInterval({ start: periodoInicio, end: periodoFim });

  const carregarDados = async () => {
    setLoading(true);
    try {
      const parametros = new URLSearchParams({
        dataInicio: format(periodoInicio, 'yyyy-MM-dd'),
        dataFim: format(periodoFim, 'yyyy-MM-dd'),
      });
      if (busca.trim()) parametros.set('busca', busca.trim());
      if (filtroEquipamentoId) parametros.set('equipamentoId', filtroEquipamentoId);
      if (filtroTecnicoId) parametros.set('tecnicoId', filtroTecnicoId);
      if (filtroMotoristaId) parametros.set('motoristaId', filtroMotoristaId);
      if (filtroStatus) parametros.set('status', filtroStatus);

      if (acessoRestrito) {
        const resLoc = await api.get<Locacao[]>(`/locacoes?${parametros.toString()}`).catch(() => []);
        setLocacoes(Array.isArray(resLoc) ? resLoc : []);
        setClinicas([]);
        setEquipamentos([]);
        setTecnicos([]);
        setMotoristas([]);
      } else {
        const [resLoc, resCli, resEq, resTec, resMot] = await Promise.all([
          api.get<Locacao[]>(`/locacoes?${parametros.toString()}`).catch(() => []),
          api.get<Clinica[]>('/clinicas').catch(() => []),
          api.get<Equipamento[]>('/equipamentos').catch(() => []),
          api.get<Colaborador[]>('/colaboradores?funcao=TECNICO').catch(() => []),
          api.get<Colaborador[]>('/colaboradores?funcao=MOTORISTA').catch(() => []),
        ]);

        setLocacoes(Array.isArray(resLoc) ? resLoc : []);
        setClinicas(Array.isArray(resCli) ? resCli : []);
        setEquipamentos(Array.isArray(resEq) ? resEq : []);
        setTecnicos(Array.isArray(resTec) ? resTec : []);
        setMotoristas(Array.isArray(resMot) ? resMot : []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, [currentDate, modoVisualizacao, busca, filtroEquipamentoId, filtroTecnicoId, filtroMotoristaId, filtroStatus, acessoRestrito]);

  const handleClinicaChange = (idStr: string) => {
    const id = idStr ? Number(idStr) : '';
    setClinicaId(id);
    const cli = clinicas.find((c) => c.id === id);
    if (cli) {
      // Monta endereco completo: Rua, numero, bairro
      const cidadeUf = `${cli.cidade || ''}${cli.uf ? ' - ' + cli.uf : ''}`;
      setCidadeLocacao(cidadeUf.trim());

      // Monta endereco completo: Rua, numero, bairro
      const partesEndereco = [];
      if (cli.endereco) partesEndereco.push(cli.endereco);
      if (cli.numero) partesEndereco.push(`No. ${cli.numero}`);
      if (cli.bairro) partesEndereco.push(`Bairro: ${cli.bairro}`);
      if (cli.complemento) partesEndereco.push(`(${cli.complemento})`);

      setEnderecoLocacao(partesEndereco.join(', '));
    }
  };

  const handleOpenCreate = (dateStr?: string) => {
    if (acessoRestrito) return;
    setSelectedLocacao(null);
    setClinicaId('');
    setDataInicio(dateStr || format(new Date(), 'yyyy-MM-dd'));
    setHoraInicio('08:00');
    setHoraFim('18:00');
    setCidadeLocacao('');
    setEnderecoLocacao('');
    setTecnicoId('');
    setMotoristaId('');
    setItensLocacao([]);
    setValorDesconto(0);
    setFormaPagamento('EMPRESA');
    setValorPagamento(0);
    setStatusPagamento('PENDENTE');
    setObservacoes('');
    setStatus('AGENDADA');
    setModalOpen(true);
  };

  const handleOpenEdit = (loc: Locacao) => {
    setSelectedLocacao(loc);
    setClinicaId(loc.clinicaId);
    setDataInicio(loc.dataInicio ? loc.dataInicio.split('T')[0] : format(new Date(), 'yyyy-MM-dd'));
    setHoraInicio(loc.horaInicio || '08:00');
    setHoraFim(loc.horaFim || '18:00');
    setEnderecoLocacao(loc.enderecoLocacao || '');
    setCidadeLocacao(loc.cidadeLocacao || '');
    setTecnicoId(loc.tecnicoId || '');
    setMotoristaId(loc.motoristaId || '');
    setItensLocacao(
      (loc.itens || []).map((i) => ({
        equipamentoId: i.equipamentoId,
        valorDiaria: Number(i.valorDiaria || 0),
        valoresDisparo: i.valoresDisparo || {},
      }))
    );
    setValorDesconto(loc.valorDesconto || 0);
    const pagamento = loc.pagamentos?.[0];
    setFormaPagamento(pagamento?.forma === 'DR' ? 'DR' : 'EMPRESA');
    setValorPagamento(Number(pagamento?.valor || 0));
    setStatusPagamento(pagamento?.status === 'RECEBIDO' ? 'RECEBIDO' : 'PENDENTE');
    setObservacoes(loc.observacoes || '');
    setStatus(loc.status || 'AGENDADA');
    setModalOpen(true);
  };

  const handleToggleEquipamento = (equipamentoId: number, checked: boolean) => {
    if (checked) {
      const eq = equipamentos.find(e => e.id === equipamentoId);
      const valorSugerido = eq ? (eq.valorDiaria || 0) : 0;
      setItensLocacao([...itensLocacao, { equipamentoId, valorDiaria: valorSugerido, valoresDisparo: {} }]);
    } else {
      setItensLocacao(itensLocacao.filter((i) => i.equipamentoId !== equipamentoId));
    }
  };

  const handleValorDisparoChange = (equipamentoId: number, tipo: string, valor: string) => {
    setItensLocacao(itensLocacao.map((item) => item.equipamentoId === equipamentoId
      ? { ...item, valoresDisparo: { ...(item.valoresDisparo || {}), [tipo]: valor } }
      : item));
  };

  const handleValorItemChange = (equipamentoId: number, valor: number) => {
    setItensLocacao(
      itensLocacao.map((item) => (item.equipamentoId === equipamentoId ? { ...item, valorDiaria: valor } : item))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (acessoRestrito) return;
    if (!clinicaId) {
      alert('Selecione uma clinica.');
      return;
    }
    if (itensLocacao.length === 0) {
      alert('Selecione pelo menos um equipamento e informe seu valor.');
      return;
    }

    const payload = {
      clinicaId: Number(clinicaId),
      dataInicio,
      horaInicio,
      horaFim,
      enderecoLocacao,
      cidadeLocacao,
      tecnicoId: tecnicoId ? Number(tecnicoId) : null,
      motoristaId: motoristaId ? Number(motoristaId) : null,
      itens: itensLocacao.map((item) => ({
        ...item,
        valoresDisparo: Object.fromEntries(
          Object.entries(item.valoresDisparo || {}).map(([tipo, valor]) => [tipo, numeroDecimal(String(valor))])
        ),
      })),
      valorDesconto: Number(valorDesconto || 0),
      pagamentos: valorPagamento > 0 ? [{ forma: formaPagamento, valor: Number(valorPagamento), status: statusPagamento, recebidoEm: statusPagamento === 'RECEBIDO' ? dataInicio : null }] : [],
      observacoes,
      status,
    };

    try {
      if (selectedLocacao) {
        await api.put(`/locacoes/${selectedLocacao.id}`, payload);
      } else {
        await api.post('/locacoes', payload);
      }
      setModalOpen(false);
      carregarDados();
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Erro ao salvar agendamento');
    }
  };

  const imprimirProtocolo = () => window.setTimeout(() => window.print(), 50);

  const enviarParaExcel = () => {
    if (acessoRestrito) return;
    window.open('http://127.0.0.1:3335/sincronizar', '_blank', 'noopener,noreferrer');
  };

  const handleDelete = async (id: number) => {
    if (acessoRestrito) return;
    if (confirm('Deseja realmente cancelar/deletar este agendamento?')) {
      try {
        await api.delete(`/locacoes/${id}`);
        carregarDados();
      } catch (err: any) {
        console.error(err);
        alert(err.message || 'Erro ao deletar agendamento');
      }
    }
  };

  const handlePrevPeriodo = () => setCurrentDate(modoVisualizacao === 'SEMANA' ? subWeeks(currentDate, 1) : subMonths(currentDate, 1));
  const handleNextPeriodo = () => setCurrentDate(modoVisualizacao === 'SEMANA' ? addWeeks(currentDate, 1) : addMonths(currentDate, 1));
  const limparFiltros = () => {
    setBusca('');
    setFiltroEquipamentoId('');
    setFiltroTecnicoId('');
    setFiltroMotoristaId('');
    setFiltroStatus('');
  };
  const tituloPeriodo = modoVisualizacao === 'SEMANA'
    ? `Semana de ${format(periodoInicio, 'dd/MM')} a ${format(periodoFim, 'dd/MM/yyyy')}`
    : format(currentDate, 'MMMM yyyy', { locale: ptBR });
  const dataProtocolo = dataInicio ? dataInicio.split('-').reverse().join('/') : '';
  const totalDiariasProtocolo = itensLocacao.reduce((sum, item) => sum + Number(item.valorDiaria || 0), 0);
  const equipamentoDoItem = (equipamentoId: number) => selectedLocacao?.itens.find((item) => item.equipamentoId === equipamentoId)?.equipamento
    || equipamentos.find((equipamento) => equipamento.id === equipamentoId);
  const responsavelRelacionado = acessoRestrito
    ? usuario?.colaboradorFuncao === 'MOTORISTA'
      ? { titulo: 'Técnica responsável', nome: selectedLocacao?.tecnico?.nome || 'Não informado' }
      : { titulo: 'Motorista responsável', nome: selectedLocacao?.motorista?.nome || 'Não informado' }
    : null;

  return (
    <div className="flex flex-col gap-6 p-6 max-w-[1600px] mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <CalendarIcon className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">{acessoRestrito ? 'Minha Agenda' : 'Agenda de Locações'}</h2>
            <p className="text-sm font-medium text-slate-500">{acessoRestrito ? 'Visualização dos agendamentos em que você está relacionado(a)' : 'Gerenciamento diário de equipamentos e compromissos'}</p>
          </div>
        </div>
        {!acessoRestrito && <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={enviarParaExcel} leftIcon={<FileSpreadsheet className="w-4 h-4" />}>
            Enviar para Excel
          </Button>
          <Button onClick={() => handleOpenCreate()} leftIcon={<Plus className="w-4 h-4" />}>
            Novo Agendamento
          </Button>
        </div>}
      </div>

      {/* Busca, filtros e periodo */}
      <div className="bg-white rounded-2xl border border-slate-100 px-6 py-5 shadow-sm space-y-4">
        {!acessoRestrito && <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-3">
          <label className="xl:col-span-2 relative">
            <span className="sr-only">Pesquisa rapida</span>
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Pesquisar clinica, aparelho, protocolo ou cidade"
              className="w-full h-11 pl-10 pr-3 rounded-xl border border-slate-200 text-sm text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10"
            />
          </label>
          <select value={filtroEquipamentoId} onChange={(e) => setFiltroEquipamentoId(e.target.value)} className="h-11 px-3 rounded-xl border border-slate-200 text-sm text-slate-700 bg-white">
            <option value="">Todos os aparelhos</option>
            {equipamentos.map((equipamento) => <option key={equipamento.id} value={equipamento.id}>{equipamento.descricao}</option>)}
          </select>
          <select value={filtroTecnicoId} onChange={(e) => setFiltroTecnicoId(e.target.value)} className="h-11 px-3 rounded-xl border border-slate-200 text-sm text-slate-700 bg-white">
            <option value="">Todos os tecnicos</option>
            {tecnicos.map((tecnico) => <option key={tecnico.id} value={tecnico.id}>{tecnico.nome}</option>)}
          </select>
          <select value={filtroMotoristaId} onChange={(e) => setFiltroMotoristaId(e.target.value)} className="h-11 px-3 rounded-xl border border-slate-200 text-sm text-slate-700 bg-white">
            <option value="">Todos os motoristas</option>
            {motoristas.map((motorista) => <option key={motorista.id} value={motorista.id}>{motorista.nome}</option>)}
          </select>
          <select value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value as '' | StatusLocacao)} className="h-11 px-3 rounded-xl border border-slate-200 text-sm text-slate-700 bg-white">
            <option value="">Todos os status</option>
            <option value="AGENDADA">Agendada</option>
            <option value="CONFIRMADA">Confirmada</option>
            <option value="EM_ANDAMENTO">Em andamento</option>
            <option value="CONCLUIDA">Concluida</option>
            <option value="CANCELADA">Cancelada</option>
            <option value="NO_SHOW">Nao compareceu</option>
          </select>
        </div>}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-100 pt-4">
          <div className="flex items-center gap-2">
            {!acessoRestrito && <><SlidersHorizontal className="w-4 h-4 text-slate-400" />
            <div className="inline-flex rounded-xl bg-slate-100 p-1">
              <button onClick={() => setModoVisualizacao('MES')} className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-colors ${modoVisualizacao === 'MES' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>Mes</button>
              <button onClick={() => setModoVisualizacao('SEMANA')} className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-colors ${modoVisualizacao === 'SEMANA' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>Semana</button>
            </div>
            {(busca || filtroEquipamentoId || filtroTecnicoId || filtroMotoristaId || filtroStatus) && (
              <button onClick={limparFiltros} className="inline-flex items-center gap-1 px-2 py-1.5 text-xs font-bold text-slate-500 hover:text-indigo-600" title="Limpar filtros">
                <X className="w-3.5 h-3.5" /> Limpar filtros
              </button>
            )}</>}
          </div>
          <span className="text-xs font-semibold text-slate-400">{locacoes.length} agendamento(s) encontrado(s)</span>
        </div>
      </div>

      <div className="flex items-center justify-between bg-white rounded-2xl border border-slate-100 px-6 py-4 shadow-sm">
        <div className="flex items-center gap-4">
          <button onClick={handlePrevPeriodo} className="p-2 hover:bg-slate-50 rounded-xl border border-slate-200 text-slate-600 transition-colors" aria-label="Periodo anterior">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-lg font-black text-slate-800 capitalize min-w-[180px] text-center">
            {tituloPeriodo}
          </span>
          <button onClick={handleNextPeriodo} className="p-2 hover:bg-slate-50 rounded-xl border border-slate-200 text-slate-600 transition-colors" aria-label="Proximo periodo">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
        <Button variant="outline" onClick={() => setCurrentDate(new Date())}>
          Hoje
        </Button>
      </div>

      {/* Calendario */}
      {loading ? (
        <div className="flex items-center justify-center p-20 bg-white rounded-3xl border border-slate-100">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-4">
          {diasVisiveis.map((day) => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const locacoesDoDia = locacoes.filter((l) => l.dataInicio && l.dataInicio.split('T')[0] === dateStr);
            const isToday = isSameDay(day, new Date());

            return (
              <div
                key={dateStr}
                className={`bg-white rounded-2xl border transition-all ${
                  isToday ? 'border-indigo-500 ring-2 ring-indigo-500/10 shadow-md' : 'border-slate-100 hover:border-slate-200 shadow-sm'
                } p-4 flex flex-col gap-3 min-h-[180px]`}
              >
                <div className="flex items-center justify-between pb-2 border-b border-slate-50">
                  <span
                    className={`text-xs font-black uppercase tracking-wider ${
                      isToday ? 'text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-xl' : 'text-slate-600'
                    }`}
                  >
                    {format(day, 'dd/MM (eee)', { locale: ptBR })}
                  </span>
                  {!acessoRestrito && <button
                    onClick={() => handleOpenCreate(dateStr)}
                    className="text-slate-400 hover:text-indigo-600 p-1.5 rounded-lg hover:bg-slate-50 transition-colors"
                    title="Novo Agendamento neste dia"
                  >
                    <Plus className="w-4 h-4" />
                  </button>}
                </div>

                <div className="flex flex-col gap-2 overflow-y-auto max-h-[240px]">
                  {locacoesDoDia.map((loc) => {
                    const nomeClinica = loc.clinica ? (loc.clinica.nomeFantasia || loc.clinica.razaoSocial) : 'Clinica';
                   const cidadeClinica = loc.clinica?.cidade || loc.cidadeLocacao || 'Cidade nao informada';
                   const equipamentosStr = loc.itens && loc.itens.map((i) => i.equipamento?.descricao).filter(Boolean).join(', ') || 'Nenhum aparelho';
                    const valorLocacao = (loc.itens || []).reduce((total, item) => total + Number(item.valorDiaria || 0), 0);
                    const valoresDisparo = (loc.itens || []).flatMap((item) => Object.entries(item.valoresDisparo || {})
                      .filter(([, valor]) => numeroDecimal(String(valor)) > 0)
                      .map(([, valor]) => ({
                        valor: numeroDecimal(String(valor)),
                        quantidade: Boolean(item.equipamento && disparoEhQuantidade(item.equipamento)),
                      })));
                    const totalDisparosMonetarios = valoresDisparo.filter((disparo) => !disparo.quantidade).reduce((total, disparo) => total + disparo.valor, 0);
                    const possuiDisparosPorQuantidade = valoresDisparo.some((disparo) => disparo.quantidade);
                    return (
                      <div
                        key={loc.id}
                        onClick={() => handleOpenEdit(loc)}
                        className="group bg-slate-50 hover:bg-indigo-50/60 border border-slate-200/60 hover:border-indigo-200 rounded-xl p-3 flex flex-col gap-1 cursor-pointer transition-all shadow-2xs"
                      >
                        <div className="text-xs font-bold text-slate-800 truncate" title={nomeClinica}>
                          {nomeClinica}
                        </div>
                        <div className="text-[11px] font-semibold text-slate-500 truncate" title={cidadeClinica}>
                          {cidadeClinica}
                        </div>
                         <div className="text-[11px] font-black text-indigo-600 truncate bg-white px-2 py-1 rounded-lg border border-indigo-100/50 mt-0.5" title={equipamentosStr}>
                           {equipamentosStr}
                         </div>
                         {acessoRestrito && <div className="text-[11px] font-bold text-slate-700 mt-0.5">Locação: R$ {valorLocacao.toFixed(2)}</div>}
                         {acessoRestrito && totalDisparosMonetarios > 0 && <div className="text-[10px] font-medium text-slate-500">Disparos: R$ {totalDisparosMonetarios.toFixed(2)}</div>}
                         {acessoRestrito && totalDisparosMonetarios === 0 && possuiDisparosPorQuantidade && <div className="text-[10px] font-medium text-slate-500">Disparos registrados</div>}
                       </div>
                    );
                  })}
                  {locacoesDoDia.length === 0 && (
                    <div className="flex-1 flex items-center justify-center p-6 text-slate-300 text-xs font-semibold">
                      Sem agendamentos
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de agendamento */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={acessoRestrito ? 'Detalhes do Agendamento' : selectedLocacao ? 'Editar Agendamento' : 'Novo Agendamento'}
        maxWidth="2xl"
      >
        {acessoRestrito && selectedLocacao ? (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="rounded-xl bg-slate-50 border border-slate-100 p-4"><span className="block text-xs font-bold uppercase text-slate-400 mb-1">Clínica</span><b className="text-slate-800">{selectedLocacao.clinica?.nomeFantasia || selectedLocacao.clinica?.razaoSocial}</b></div>
              <div className="rounded-xl bg-slate-50 border border-slate-100 p-4"><span className="block text-xs font-bold uppercase text-slate-400 mb-1">Data e horário</span><b className="text-slate-800">{format(new Date(`${selectedLocacao.dataInicio.split('T')[0]}T12:00:00`), 'dd/MM/yyyy')} · {selectedLocacao.horaInicio || '--:--'} à {selectedLocacao.horaFim || '--:--'}</b></div>
              <div className="rounded-xl bg-slate-50 border border-slate-100 p-4"><span className="block text-xs font-bold uppercase text-slate-400 mb-1">Endereço</span><b className="text-slate-800">{selectedLocacao.enderecoLocacao || 'Não informado'}</b><span className="block text-slate-600 mt-1">{selectedLocacao.cidadeLocacao || selectedLocacao.clinica?.cidade || ''}</span></div>
              <div className="rounded-xl bg-slate-50 border border-slate-100 p-4"><span className="block text-xs font-bold uppercase text-slate-400 mb-1">Status</span><b className="text-slate-800">{selectedLocacao.status.replaceAll('_', ' ')}</b></div>
              {responsavelRelacionado && <div className="rounded-xl bg-slate-50 border border-slate-100 p-4"><span className="block text-xs font-bold uppercase text-slate-400 mb-1">{responsavelRelacionado.titulo}</span><b className="text-slate-800">{responsavelRelacionado.nome}</b></div>}
            </div>
            <div className="rounded-xl border border-slate-100 p-4"><span className="block text-xs font-bold uppercase text-slate-400 mb-2">Aparelho(s)</span><div className="flex flex-col gap-2">{selectedLocacao.itens.map((item) => <b key={item.id} className="text-slate-800">{item.equipamento?.descricao}</b>)}</div></div>
            {selectedLocacao.observacoes && <div className="rounded-xl border border-slate-100 p-4 text-sm text-slate-700"><span className="block text-xs font-bold uppercase text-slate-400 mb-1">Observações</span>{selectedLocacao.observacoes}</div>}
            <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">{usuario?.colaboradorFuncao === 'MOTORISTA' && <Button type="button" variant="outline" onClick={imprimirProtocolo}>Imprimir protocolo / PDF</Button>}<Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Fechar</Button></div>
          </div>
        ) : <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Cl&iacute;nica / Cliente *</label>
              <select
                value={clinicaId}
                onChange={(e) => handleClinicaChange(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none cursor-pointer"
                required
              >
                <option value="">Selecione uma clinica...</option>
                {clinicas.map((cli) => (
                  <option key={cli.id} value={cli.id}>
                    {cli.razaoSocial} {cli.nomeFantasia ? `(${cli.nomeFantasia})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Data da Loca&ccedil;&atilde;o *</label>
              <input
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
                label="Horário Início"
              type="time"
              value={horaInicio}
              onChange={(e) => setHoraInicio(e.target.value)}
            />
            <Input
                label="Horário Término"
              type="time"
              value={horaFim}
              onChange={(e) => setHoraFim(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Endereço da Locação (Rua, Número, Bairro)"
              value={enderecoLocacao}
              onChange={(e) => setEnderecoLocacao(e.target.value)}
              placeholder="Rua, numero, bairro..."
            />
            <Input
              label="Cidade / UF"
              value={cidadeLocacao}
              onChange={(e) => setCidadeLocacao(e.target.value)}
              placeholder="Cidade - UF"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-100 pt-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-purple-600" />
                T&eacute;cnico Respons&aacute;vel
              </label>
              <select
                value={tecnicoId}
                onChange={(e) => setTecnicoId(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none cursor-pointer"
              >
                <option value="">Selecione o TECNICO...</option>
                {tecnicos.map((tec) => (
                  <option key={tec.id} value={tec.id}>
                    {tec.nome}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5 text-blue-600" />
                Motorista Respons&aacute;vel
              </label>
              <select
                value={motoristaId}
                onChange={(e) => setMotoristaId(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none cursor-pointer"
              >
                <option value="">Selecione o TECNICO...</option>
                {motoristas.map((mot) => (
                  <option key={mot.id} value={mot.id}>
                    {mot.nome}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-2 border-t border-slate-100 pt-4">
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Aparelhos e Valores da Di&aacute;ria *</label>
            <div className="max-h-56 overflow-y-auto border border-slate-300 rounded-2xl p-3 flex flex-col gap-2.5 bg-slate-50">
              {equipamentos.length === 0 ? (
                <div className="text-center py-4 text-slate-400 text-xs font-semibold">
                  Nenhum aparelho cadastrado no sistema. Cadastre aparelhos primeiro.
                </div>
              ) : (
                equipamentos.map((eq) => {
                  const itemEncontrado = itensLocacao.find((i) => i.equipamentoId === eq.id);
                  const checked = !!itemEncontrado;

                  return (
                    <div key={eq.id} className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-200 gap-4 shadow-2xs">
                      <label className="flex items-center gap-3 cursor-pointer flex-1">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => handleToggleEquipamento(eq.id, e.target.checked)}
                          className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                        />
                        <span className="text-sm font-bold text-slate-800">{eq.descricao}</span>
                      </label>

                      {checked && (
                        <div className="flex flex-col gap-2 w-52">
                          <Input
                            label=""
                            placeholder="Valor R$"
                            type="number"
                            step="0.01"
                            value={itemEncontrado.valorDiaria}
                            onChange={(e) => handleValorItemChange(eq.id, Number(e.target.value))}
                            required
                          />
                          {ehLiftera2(eq) ? (
                            <div className="rounded-lg border border-indigo-200 bg-indigo-50/60 p-2.5 space-y-2">
                              <p className="text-[11px] font-extrabold uppercase tracking-wide text-indigo-700">Disparos realizados</p>
                              {['Disparo Linear', 'Disparo Caneta'].map((tipo) => (
                                <Input key={tipo}
                                  label={`${tipo} (un.)`}
                                  placeholder="Quantidade"
                                  type="text"
                                  inputMode="numeric"
                                  required={status === 'CONCLUIDA'}
                                  value={itemEncontrado.valoresDisparo?.[tipo] ?? ''}
                                  onChange={(e) => handleValorDisparoChange(eq.id, tipo, e.target.value)} />
                              ))}
                            </div>
                          ) : tiposDisparoDoEquipamento(eq).map((tipo) => (
                            <Input key={tipo}
                              label={`${tipo} (${disparoEhQuantidade(eq) ? 'un.' : 'R$'})`}
                              placeholder={disparoEhQuantidade(eq) ? 'Quantidade' : '0,00'}
                              type="text" inputMode="decimal"
                              value={itemEncontrado.valoresDisparo?.[tipo] ?? ''}
                              onChange={(e) => handleValorDisparoChange(eq.id, tipo, e.target.value)} />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-100 pt-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Status do Agendamento</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as StatusLocacao)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none cursor-pointer"
              >
                <option value="AGENDADA">Agendada</option>
                <option value="CONFIRMADA">Confirmada</option>
                <option value="EM_ANDAMENTO">Em Andamento</option>
                <option value="CONCLUIDA">Concluida</option>
                <option value="CANCELADA">Cancelada</option>
              </select>
            </div>
            <Input
              label="Desconto Geral (R$)"
              type="number"
              step="0.01"
              value={valorDesconto}
              onChange={(e) => setValorDesconto(Number(e.target.value))}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-slate-100 pt-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Recebido por</label>
              <select value={formaPagamento} onChange={(e) => setFormaPagamento(e.target.value as typeof formaPagamento)} className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white font-semibold text-slate-800">
                <option value="EMPRESA">Empresa</option><option value="DR">Dr Ricardo</option>
              </select>
            </div>
            <Input label="Valor Recebido (R$)" type="number" step="0.01" value={valorPagamento} onChange={(e) => setValorPagamento(Number(e.target.value))} />
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Situacao do Pagamento</label>
              <select value={statusPagamento} onChange={(e) => setStatusPagamento(e.target.value as typeof statusPagamento)} className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white font-semibold text-slate-800">
                <option value="PENDENTE">Pendente</option><option value="RECEBIDO">Recebido</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-slate-100 pt-5 mt-2">
            {selectedLocacao ? (
              <Button type="button" variant="danger" onClick={() => { handleDelete(selectedLocacao.id); setModalOpen(false); }}>
                Excluir Agendamento
              </Button>
            ) : <div />}

            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
                Cancelar
              </Button>
              {selectedLocacao && <Button type="button" variant="outline" onClick={imprimirProtocolo}>Imprimir protocolo / PDF</Button>}
              <Button type="submit">
                {selectedLocacao ? 'Salvar Alteracoes' : 'Concluir Agendamento'}
              </Button>
            </div>
          </div>
        </form>}
      </Modal>
      {(!acessoRestrito || usuario?.colaboradorFuncao === 'MOTORISTA') && selectedLocacao && (
        <section className="print-protocol" aria-hidden="true">
          <header className="protocol-header"><img src={protocoloLogo} alt="Canetti"/><span>Rua Angelo Cisotto, 86 - Cerquilho/SP<br/>CEP 18520-000 - Cerquilho/SP<br/>Fones: (015) 3284-4278 / 3384-3630<br/>canetti.locacao@hotmail.com</span></header>
          <h1>PROTOCOLO DE ENTREGA E RETIRADA</h1>
          <div className="protocol-grid"><span><b>NUMERO:</b> {String(selectedLocacao.codigo || selectedLocacao.id).padStart(8, '0')}</span><span><b>DATA:</b> {dataProtocolo}</span><span><b>ENTREGA:</b> {horaInicio}</span><span><b>RETIRADA:</b> {horaFim}</span></div>
          <div className="protocol-client"><div><b>CLIENTE:</b> {selectedLocacao.clinica?.razaoSocial || selectedLocacao.clinica?.nomeFantasia || 'NAO INFORMADO'}<br/><b>ENDERECO:</b> {enderecoLocacao || 'NAO INFORMADO'}<br/><b>CIDADE / UF:</b> {cidadeLocacao || 'NAO INFORMADA'}</div><div><b>FONE:</b> {selectedLocacao.clinica?.telefone || selectedLocacao.clinica?.celular || '________________'}<br/><b>CPF/CNPJ:</b> {selectedLocacao.clinica?.cnpjCpf || '________________'}</div></div>
          <table className="protocol-table"><thead><tr><th>MODELO / APARELHO</th><th>VALOR DA LOCACAO</th><th>VALOR DOS DISPAROS</th></tr></thead><tbody>{itensLocacao.map((item) => { const eq = equipamentoDoItem(item.equipamentoId); const tipos = eq ? tiposDisparoDoEquipamento(eq) : []; return <tr key={item.equipamentoId}><td>{eq?.descricao || 'EQUIPAMENTO'}</td><td>R$ {Number(item.valorDiaria || 0).toFixed(2)}</td><td>{tipos.length ? tipos.map((tipo) => <div key={tipo}>{tipo}: {eq && disparoEhQuantidade(eq) ? `${numeroDecimal(String(item.valoresDisparo?.[tipo] || 0))} un.` : `R$ ${numeroDecimal(String(item.valoresDisparo?.[tipo] || 0)).toFixed(2)}`}</div>) : 'NAO SE APLICA'}</td></tr>; })}</tbody></table>
          <div className="protocol-split"><div className="protocol-box"><b>OCORRENCIAS:</b><br/>{selectedLocacao.observacoes || '_______________________________________________________________'}<br/>_______________________________________________________________</div><div className="protocol-box"><b>MATERIAIS CONFERIDOS:</b><br/>[ ] OCULOS &nbsp; [ ] PONTEIRA ET &nbsp; [ ] PONTEIRA HS<br/>[ ] TIP HS &nbsp; [ ] CABO &nbsp; [ ] PEDAL</div></div>
          <div className="protocol-box protocol-firing"><b>CONTROLE DE DISPAROS / HANDPIECES</b><table><thead><tr><th>TIPO</th><th>DIS. INICIAIS</th><th>DIS. FINAIS</th><th>DIFERENCA</th></tr></thead><tbody>{itensLocacao.flatMap((item) => { const eq = equipamentoDoItem(item.equipamentoId); const tipos = eq ? tiposDisparoDoEquipamento(eq) : []; return tipos.map((tipo) => <tr key={`${item.equipamentoId}-${tipo}`}><td>{tipo}</td><td></td><td></td><td></td></tr>); })}</tbody></table></div>
          <div className="protocol-money"><div><b>VALOR DA LOCACAO:</b> R$ {totalDiariasProtocolo.toFixed(2)}<br/><b>DESCONTO:</b> R$ {Number(valorDesconto || 0).toFixed(2)}</div><div><b>VALOR TOTAL (LOCACAO + DISPAROS):</b> R$ __________________<br/><b>FORMA DE PAGAMENTO:</b> [ ] PIX &nbsp; [ ] DINHEIRO &nbsp; [ ] CHEQUE &nbsp; [ ] BOLETO</div></div>
          <p className="protocol-sign">Declaro que recebi e conferi o equipamento e os materiais assinalados, e que os handpieces nao estao com os cristais danificados.</p>
          <p className="protocol-freelancer">DECLARO PARA OS FINS DE DIREITO QUE CONTRATEI OS SERVICOS DE <b>{selectedLocacao.tecnico?.nome || '________________________________'}</b>, NA FUNCAO DE TECNICA DE ESTETICA, COMO FREELANCER, COM A FINALIDADE DE OPERAR O EQUIPAMENTO DE ESTETICA LOCADO NESTA DATA, CUJO VALOR PELO SERVICO CONTRATADO CORRERA EXCLUSIVAMENTE SOB A RESPONSABILIDADE DA LOCATARIA.</p>
          <div className="protocol-lines"><span>Motorista: __________________________</span><span>Locataria / Empresa: __________________________</span></div>
        </section>
      )}    </div>
  );
};
