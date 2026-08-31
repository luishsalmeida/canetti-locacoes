import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Locacao, Clinica, Equipamento, Colaborador, StatusLocacao } from '../types';
import { Button } from '../components/Button';
import { Modal } from '../components/Modal';
import { Input } from '../components/Input';
import { ChevronLeft, ChevronRight, Plus, Clock, Shield, Truck, Calendar as CalendarIcon } from 'lucide-react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ItemAgendamento {
  equipamentoId: number;
  valorDiaria: number;
  valoresDisparo?: Record<string, number>;
}

const TIPOS_DISPARO: Record<string, string[]> = {
  harmony: ['Disparo Normal', 'Disparo Pixel'],
  m22: ['Disparo Normal'],
  ultraformer: ['Disparo Normal'],
  'ultraformer iii': ['Disparo Normal'],
  'liftera 2': ['Disparo Linear', 'Disparo Caneta'],
};

const tiposDisparoDoEquipamento = (eq: Equipamento) => eq.tiposDisparo?.length
  ? eq.tiposDisparo
  : TIPOS_DISPARO[(eq.descricao || '').trim().toLowerCase()] || [];

export const Agenda: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [locacoes, setLocacoes] = useState<Locacao[]>([]);
  const [clinicas, setClinicas] = useState<Clinica[]>([]);
  const [equipamentos, setEquipamentos] = useState<Equipamento[]>([]);
  const [tecnicos, setTecnicos] = useState<Colaborador[]>([]);
  const [motoristas, setMotoristas] = useState<Colaborador[]>([]);
  const [loading, setLoading] = useState(true);

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
  const [observacoes, setObservacoes] = useState('');
  const [status, setStatus] = useState<StatusLocacao>('AGENDADA');

  const carregarDados = async () => {
    setLoading(true);
    try {
      const dStart = format(startOfMonth(currentDate), 'yyyy-MM-dd');
      const dEnd = format(endOfMonth(currentDate), 'yyyy-MM-dd');

      const [resLoc, resCli, resEq, resTec, resMot] = await Promise.all([
        api.get<Locacao[]>(`/locacoes?dataInicio=${dStart}&dataFim=${dEnd}`).catch(() => []),
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
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, [currentDate]);

  const handleClinicaChange = (idStr: string) => {
    const id = idStr ? Number(idStr) : '';
    setClinicaId(id);
    const cli = clinicas.find((c) => c.id === id);
    if (cli) {
      // Monta cidade com UF se houver
      const cidadeUf = `${cli.cidade || ''}${cli.uf ? ' - ' + cli.uf : ''}`;
      setCidadeLocacao(cidadeUf.trim());

      // Monta endereAÂ§o completo: Rua, NAÂºmero, Bairro
      const partesEndereco = [];
      if (cli.endereco) partesEndereco.push(cli.endereco);
      if (cli.numero) partesEndereco.push(`NAÂº ${cli.numero}`);
      if (cli.bairro) partesEndereco.push(`Bairro: ${cli.bairro}`);
      if (cli.complemento) partesEndereco.push(`(${cli.complemento})`);

      setEnderecoLocacao(partesEndereco.join(', '));
    }
  };

  const handleOpenCreate = (dateStr?: string) => {
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

  const handleValorDisparoChange = (equipamentoId: number, tipo: string, valor: number) => {
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
    if (!clinicaId) {
      alert('Selecione uma clAÂ­nica.');
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
      itens: itensLocacao,
      valorDesconto: Number(valorDesconto || 0),
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

  const handleDelete = async (id: number) => {
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

  const handlePrevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1));

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  return (
    <div className="flex flex-col gap-6 p-6 max-w-[1600px] mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <CalendarIcon className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">Agenda de Loca&ccedil;&otilde;es</h2>
            <p className="text-sm font-medium text-slate-500">Gerenciamento diAÂ¡rio de equipamentos e compromissos</p>
          </div>
        </div>
        <Button onClick={() => handleOpenCreate()} leftIcon={<Plus className="w-4 h-4" />}>
          Novo Agendamento
        </Button>
      </div>

      {/* Controles de MAÂªs */}
      <div className="flex items-center justify-between bg-white rounded-2xl border border-slate-100 px-6 py-4 shadow-sm">
        <div className="flex items-center gap-4">
          <button onClick={handlePrevMonth} className="p-2 hover:bg-slate-50 rounded-xl border border-slate-200 text-slate-600 transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-lg font-black text-slate-800 capitalize min-w-[180px] text-center">
            {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
          </span>
          <button onClick={handleNextMonth} className="p-2 hover:bg-slate-50 rounded-xl border border-slate-200 text-slate-600 transition-colors">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
        <Button variant="outline" onClick={() => setCurrentDate(new Date())}>
          Hoje
        </Button>
      </div>

      {/* CalendAÂ¡rio Grid */}
      {loading ? (
        <div className="flex items-center justify-center p-20 bg-white rounded-3xl border border-slate-100">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-4">
          {daysInMonth.map((day) => {
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
                  <button
                    onClick={() => handleOpenCreate(dateStr)}
                    className="text-slate-400 hover:text-indigo-600 p-1.5 rounded-lg hover:bg-slate-50 transition-colors"
                    title="Novo Agendamento neste dia"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex flex-col gap-2 overflow-y-auto max-h-[240px]">
                  {locacoesDoDia.map((loc) => {
                    const nomeClinica = loc.clinica ? (loc.clinica.nomeFantasia || loc.clinica.razaoSocial) : 'ClAÂ­nica';
                    const cidadeClinica = loc.clinica?.cidade || loc.cidadeLocacao || 'Cidade nAÂ£o informada';
                    const equipamentosStr = loc.itens && loc.itens.map((i) => i.equipamento?.descricao).filter(Boolean).join(', ') || 'Nenhum aparelho';
                    const tecnicoNome = loc.tecnico?.nome;
                    const motoristaNome = loc.motorista?.nome;

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
                        {tecnicoNome && <div className="text-[11px] text-slate-600 truncate">TAÂ©cnico: {tecnicoNome}</div>}
                        {motoristaNome && <div className="text-[11px] text-slate-600 truncate">Motorista: {motoristaNome}</div>}
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

      {/* Modal Agendamento / EdiAÂ§AÂ£o */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={selectedLocacao ? 'Editar Agendamento' : 'Novo Agendamento'}
        maxWidth="2xl"
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Cl&iacute;nica / Cliente *</label>
              <select
                value={clinicaId}
                onChange={(e) => handleClinicaChange(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none cursor-pointer"
                required
              >
                <option value="">Selecione uma clAÂ­nica...</option>
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
                label="Hor&aacute;rio In&iacute;cio"
              type="time"
              value={horaInicio}
              onChange={(e) => setHoraInicio(e.target.value)}
            />
            <Input
                label="Hor&aacute;rio T&eacute;rmino"
              type="time"
              value={horaFim}
              onChange={(e) => setHoraFim(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Endere&ccedil;o da Loca&ccedil;&atilde;o (Rua, N&uacute;mero, Bairro)"
              value={enderecoLocacao}
              onChange={(e) => setEnderecoLocacao(e.target.value)}
              placeholder="Rua, nAÂº, bairro..."
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
                <option value="">Selecione o TAÂ©cnico...</option>
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
                <option value="">Selecione o Motorista...</option>
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
                          {tiposDisparoDoEquipamento(eq).map((tipo) => (
                            <Input key={tipo} label="" placeholder={`${tipo} R$`} type="number" step="0.01"
                              value={itemEncontrado.valoresDisparo?.[tipo] ?? ''}
                              onChange={(e) => handleValorDisparoChange(eq.id, tipo, Number(e.target.value))} />
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
                <option value="CONCLUIDA">ConcluAÂ­da</option>
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
                {selectedLocacao ? 'Salvar AlteraAÂ§AÂµes' : 'Concluir Agendamento'}
              </Button>
            </div>
          </div>
        </form>
      </Modal>
      {selectedLocacao && (
        <section className="print-protocol" aria-hidden="true">
          <h1>CANETTI LOCAAâ€¡Aâ€¢ES aâ‚¬â€ PROTOCOLO DE ENTREGA</h1>
          <p><strong>NAÂºmero:</strong> {String(selectedLocacao.codigo || selectedLocacao.id).padStart(8, '0')} &nbsp; <strong>Data:</strong> {dataInicio}</p>
          <h2>Cliente</h2>
          <p><strong>{selectedLocacao.clinica?.razaoSocial || selectedLocacao.clinica?.nomeFantasia || 'NAÂ£o informado'}</strong><br />
            EndereAÂ§o: {enderecoLocacao || 'NAÂ£o informado'} aâ‚¬â€ {cidadeLocacao || 'Cidade nAÂ£o informada'}</p>
          <p>Entrega: {horaInicio} &nbsp;&nbsp; Retirada: {horaFim}</p>
          <h2>Equipamentos e valores</h2>
          {itensLocacao.map((item) => { const eq = equipamentos.find((e) => e.id === item.equipamentoId); const tipos = eq ? tiposDisparoDoEquipamento(eq) : []; return (
            <div key={item.equipamentoId} className="protocol-item"><strong>{eq?.descricao || `Equipamento ${item.equipamentoId}`}</strong> aâ‚¬â€ DiAÂ¡ria: R$ {Number(item.valorDiaria || 0).toFixed(2)}
              {tipos.length > 0 && <div>Disparos: {tipos.map((tipo) => `${tipo}: R$ ${Number(item.valoresDisparo?.[tipo] || 0).toFixed(2)}`).join(' | ')}</div>}
            </div>);
          })}
          <p><strong>TAÂ©cnico:</strong> {selectedLocacao.tecnico?.nome || 'NAÂ£o informado'} &nbsp; <strong>Motorista:</strong> {selectedLocacao.motorista?.nome || 'NAÂ£o informado'}</p>
          <p className="protocol-sign">Declaro que recebi e conferi os equipamentos e materiais assinalados.</p>
          <div className="protocol-lines">Motorista: ____________________________________<br /><br />LocatAÂ¡ria: ____________________________________</div>
        </section>
      )}
    </div>
  );
};

