import React, { useEffect, useMemo, useState } from 'react';
import { Car, CircleDollarSign, MapPin, Plus, RotateCcw, Save, Trash2 } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/Button';

type Veiculo = {
  id?: number;
  colaboradorId?: number;
  apelido?: string | null;
  placa?: string | null;
  consumoKmLitro: number;
  precoCombustivel: number;
  valorPneus: number;
  vidaUtilPneusKm: number;
  manutencaoAnual: number;
  custosFixosAnuais: number;
  kmAnual: number;
  valorAtual: number;
  valorResidual: number;
  vidaUtilKm: number;
};

type Motorista = { id: number; nome: string; funcao: string };

const veiculoInicial: Veiculo = {
  apelido: '', placa: '', consumoKmLitro: 10, precoCombustivel: 0,
  valorPneus: 0, vidaUtilPneusKm: 40000, manutencaoAnual: 0,
  custosFixosAnuais: 0, kmAnual: 12000, valorAtual: 0,
  valorResidual: 0, vidaUtilKm: 150000,
};

const cidadesSugeridas = [
  'Cerquilho - SP', 'Rio Claro - SP', 'Itapetininga - SP', 'Sorocaba - SP',
  'Tatuí - SP', 'Botucatu - SP', 'Bauru - SP', 'Itu - SP', 'Campinas - SP',
  'Marília - SP', 'Itapeva - SP', 'Santa Cruz do Rio Pardo - SP',
];

const moeda = (valor: number) => valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const numero = (valor: unknown) => Math.max(0, Number(valor) || 0);

export const CalculadoraRotas: React.FC = () => {
  const { usuario } = useAuth();
  const administrador = usuario?.perfil === 'ADMIN';
  const [motoristas, setMotoristas] = useState<Motorista[]>([]);
  const [motoristaId, setMotoristaId] = useState<number | null>(null);
  const [veiculo, setVeiculo] = useState<Veiculo>(veiculoInicial);
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState('');
  const [origem, setOrigem] = useState('Cerquilho - SP');
  const [destino, setDestino] = useState('');
  const [parada, setParada] = useState('');
  const [paradas, setParadas] = useState<string[]>([]);
  const [quilometragem, setQuilometragem] = useState(0);
  const [idaEVolta, setIdaEVolta] = useState(true);
  const [pedagios, setPedagios] = useState(0);
  const [estacionamento, setEstacionamento] = useState(0);

  useEffect(() => {
    if (!administrador) {
      carregarVeiculo();
      return;
    }
    api.get<Motorista[]>('/colaboradores?funcao=MOTORISTA')
      .then((lista) => { setMotoristas(lista); if (lista[0]) setMotoristaId(lista[0].id); })
      .catch(() => setMensagem('Não foi possível carregar os motoristas.'));
  }, [administrador]);

  useEffect(() => { if (administrador && motoristaId) carregarVeiculo(motoristaId); }, [administrador, motoristaId]);

  async function carregarVeiculo(id?: number) {
    try {
      const endpoint = id ? `/rotas/veiculos/${id}` : '/rotas/meu-veiculo';
      const dados = await api.get<Veiculo | null>(endpoint);
      setVeiculo(dados ? { ...veiculoInicial, ...dados } : veiculoInicial);
      setMensagem(dados ? '' : 'Preencha e salve os dados do veículo para calcular o custo real.');
    } catch (erro) {
      setVeiculo(veiculoInicial);
      setMensagem(erro instanceof Error ? erro.message : 'Não foi possível carregar o veículo.');
    }
  }

  const custo = useMemo(() => {
    const kmTotal = numero(quilometragem) * (idaEVolta ? 2 : 1);
    const litros = veiculo.consumoKmLitro > 0 ? kmTotal / numero(veiculo.consumoKmLitro) : 0;
    const combustivel = litros * numero(veiculo.precoCombustivel);
    const pneusKm = veiculo.vidaUtilPneusKm > 0 ? numero(veiculo.valorPneus) / numero(veiculo.vidaUtilPneusKm) : 0;
    const manutencaoKm = veiculo.kmAnual > 0 ? numero(veiculo.manutencaoAnual) / numero(veiculo.kmAnual) : 0;
    const fixosKm = veiculo.kmAnual > 0 ? numero(veiculo.custosFixosAnuais) / numero(veiculo.kmAnual) : 0;
    const depreciacaoKm = veiculo.vidaUtilKm > 0 ? Math.max(0, numero(veiculo.valorAtual) - numero(veiculo.valorResidual)) / numero(veiculo.vidaUtilKm) : 0;
    const desgastePorKm = pneusKm + manutencaoKm + fixosKm + depreciacaoKm;
    const desgaste = kmTotal * desgastePorKm;
    const extras = numero(pedagios) + numero(estacionamento);
    return { kmTotal, litros, combustivel, pneusKm, manutencaoKm, fixosKm, depreciacaoKm, desgastePorKm, desgaste, extras, total: combustivel + desgaste + extras };
  }, [quilometragem, idaEVolta, veiculo, pedagios, estacionamento]);

  function atualizarCampo(campo: keyof Veiculo, valor: string) {
    setVeiculo((atual) => ({ ...atual, [campo]: campo === 'apelido' || campo === 'placa' ? valor : numero(valor) }));
  }

  async function salvarVeiculo() {
    if (administrador && !motoristaId) return setMensagem('Selecione um motorista.');
    setSalvando(true);
    try {
      const endpoint = administrador ? `/rotas/veiculos/${motoristaId}` : '/rotas/meu-veiculo';
      const salvo = await api.put<Veiculo>(endpoint, veiculo);
      setVeiculo({ ...veiculoInicial, ...salvo });
      setMensagem('Dados do veículo salvos.');
    } catch (erro) {
      setMensagem(erro instanceof Error ? erro.message : 'Não foi possível salvar o veículo.');
    } finally { setSalvando(false); }
  }

  const Campo = ({ label, campo, sufixo, tipo = 'number' }: { label: string; campo: keyof Veiculo; sufixo?: string; tipo?: string }) => (
    <label className="flex flex-col gap-1.5 text-sm font-bold text-slate-600">
      {label}
      <div className="relative"><input type={tipo} min={tipo === 'number' ? 0 : undefined} step={tipo === 'number' ? '0.01' : undefined} value={veiculo[campo] ?? ''} onChange={(e) => atualizarCampo(campo, e.target.value)} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 pr-12 font-semibold text-slate-800 outline-none focus:border-indigo-500" />{sufixo && <span className="absolute right-3 top-2.5 text-xs font-bold text-slate-400">{sufixo}</span>}</div>
    </label>
  );

  return <div className="p-6 flex flex-col gap-6">
    <div className="flex flex-col gap-1"><div className="flex items-center gap-3"><div className="rounded-xl bg-indigo-50 p-3"><Car className="w-6 h-6 text-indigo-600" /></div><div><h2 className="text-2xl font-black text-slate-800">Calculadora de Rotas</h2><p className="text-sm font-medium text-slate-500">Custo de combustível, desgaste e despesas do veículo.</p></div></div></div>

    {administrador && <div className="max-w-md"><label className="block text-sm font-bold text-slate-600 mb-1.5">Veículo do motorista</label><select value={motoristaId ?? ''} onChange={(e) => setMotoristaId(Number(e.target.value))} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 font-semibold"><option value="">Selecione</option>{motoristas.map((motorista) => <option key={motorista.id} value={motorista.id}>{motorista.nome}</option>)}</select></div>}
    {mensagem && <div className="rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm font-semibold text-indigo-700">{mensagem}</div>}

    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
      <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col gap-5">
        <div><h3 className="font-black text-slate-800">Rota da viagem</h3><p className="text-sm text-slate-500">Digite qualquer cidade ou escolha uma das sugestões.</p></div>
        <datalist id="cidades-rota">{cidadesSugeridas.map((cidade) => <option key={cidade} value={cidade} />)}</datalist>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4"><label className="flex flex-col gap-1.5 text-sm font-bold text-slate-600">Origem<input list="cidades-rota" value={origem} onChange={(e) => setOrigem(e.target.value)} className="rounded-xl border border-slate-300 px-3 py-2.5" /></label><label className="flex flex-col gap-1.5 text-sm font-bold text-slate-600">Destino<input list="cidades-rota" value={destino} onChange={(e) => setDestino(e.target.value)} placeholder="Ex.: Rio Claro - SP" className="rounded-xl border border-slate-300 px-3 py-2.5" /></label></div>
        <div className="flex flex-col gap-2"><span className="text-sm font-bold text-slate-600">Paradas intermediárias</span>{paradas.map((cidade, indice) => <div className="flex gap-2" key={`${cidade}-${indice}`}><input value={cidade} onChange={(e) => setParadas((itens) => itens.map((item, i) => i === indice ? e.target.value : item))} className="flex-1 rounded-xl border border-slate-300 px-3 py-2.5" /><button onClick={() => setParadas((itens) => itens.filter((_, i) => i !== indice))} className="p-2 text-rose-600"><Trash2 className="w-5 h-5" /></button></div>)}<div className="flex gap-2"><input list="cidades-rota" value={parada} onChange={(e) => setParada(e.target.value)} placeholder="Adicionar cidade" className="flex-1 rounded-xl border border-slate-300 px-3 py-2.5" /><Button type="button" variant="outline" onClick={() => { if (parada.trim()) { setParadas((itens) => [...itens, parada.trim()]); setParada(''); } }} leftIcon={<Plus className="w-4 h-4" />}>Adicionar</Button></div></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-100 pt-4"><label className="flex flex-col gap-1.5 text-sm font-bold text-slate-600">Quilometragem de ida<input type="number" min="0" step="0.1" value={quilometragem || ''} onChange={(e) => setQuilometragem(numero(e.target.value))} placeholder="Informe os km da rota" className="rounded-xl border border-slate-300 px-3 py-2.5" /><span className="text-xs font-medium text-slate-400">Confira a distância da rota no aplicativo de mapas.</span></label><label className="flex items-center gap-3 rounded-xl bg-slate-50 px-4 mt-6 font-bold text-slate-700"><input type="checkbox" checked={idaEVolta} onChange={(e) => setIdaEVolta(e.target.checked)} className="w-4 h-4 accent-indigo-600" />Considerar ida e volta</label></div>
        <div className="grid grid-cols-2 gap-4"><label className="flex flex-col gap-1.5 text-sm font-bold text-slate-600">Pedágios (R$)<input type="number" min="0" step="0.01" value={pedagios || ''} onChange={(e) => setPedagios(numero(e.target.value))} className="rounded-xl border border-slate-300 px-3 py-2.5" /></label><label className="flex flex-col gap-1.5 text-sm font-bold text-slate-600">Estacionamento (R$)<input type="number" min="0" step="0.01" value={estacionamento || ''} onChange={(e) => setEstacionamento(numero(e.target.value))} className="rounded-xl border border-slate-300 px-3 py-2.5" /></label></div>
        <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600 flex gap-2"><MapPin className="w-4 h-4 mt-0.5 text-indigo-500" /><span><b>{origem || 'Origem'}</b>{paradas.length ? ` → ${paradas.join(' → ')}` : ''}{destino ? ` → ${destino}` : ''}</span></div>
      </section>

      <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col gap-5">
        <div className="flex items-center justify-between gap-3"><div><h3 className="font-black text-slate-800">Meu veículo</h3><p className="text-sm text-slate-500">Informações usadas no custo por quilômetro.</p></div><Button type="button" onClick={salvarVeiculo} disabled={salvando} leftIcon={<Save className="w-4 h-4" />}>{salvando ? 'Salvando...' : 'Salvar veículo'}</Button></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4"><Campo label="Nome / apelido" campo="apelido" tipo="text" /><Campo label="Placa" campo="placa" tipo="text" /><Campo label="Consumo médio" campo="consumoKmLitro" sufixo="km/l" /><Campo label="Preço da gasolina" campo="precoCombustivel" sufixo="R$/l" /></div>
        <details className="rounded-xl border border-slate-200 p-4" open><summary className="cursor-pointer font-black text-slate-700">Desgaste do veículo</summary><p className="mt-2 text-sm text-slate-500">Preencha com médias anuais ou estimativas do seu carro. O sistema divide cada despesa pelos quilômetros previstos.</p><div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4"><Campo label="Valor do jogo de pneus" campo="valorPneus" sufixo="R$" /><Campo label="Vida útil dos pneus" campo="vidaUtilPneusKm" sufixo="km" /><Campo label="Manutenção por ano" campo="manutencaoAnual" sufixo="R$" /><Campo label="IPVA, seguro e licenciamento / ano" campo="custosFixosAnuais" sufixo="R$" /><Campo label="Quilômetros por ano" campo="kmAnual" sufixo="km" /><Campo label="Valor atual do carro" campo="valorAtual" sufixo="R$" /><Campo label="Valor de revenda estimado" campo="valorResidual" sufixo="R$" /><Campo label="Vida útil planejada" campo="vidaUtilKm" sufixo="km" /></div></details>
      </section>
    </div>

    <section className="rounded-2xl bg-slate-900 text-white p-6 shadow-xl grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5"><div><span className="text-xs uppercase tracking-wider text-slate-400 font-bold">Distância total</span><p className="mt-1 text-3xl font-black">{custo.kmTotal.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} km</p><span className="text-sm text-slate-400">{custo.litros.toFixed(1)} litros previstos</span></div><div><span className="text-xs uppercase tracking-wider text-slate-400 font-bold">Combustível</span><p className="mt-1 text-3xl font-black">{moeda(custo.combustivel)}</p><span className="text-sm text-slate-400">{moeda(custo.combustivel / Math.max(1, custo.kmTotal))} por km</span></div><div><span className="text-xs uppercase tracking-wider text-slate-400 font-bold">Desgaste do carro</span><p className="mt-1 text-3xl font-black">{moeda(custo.desgaste)}</p><span className="text-sm text-slate-400">{moeda(custo.desgastePorKm)} por km</span></div><div className="rounded-xl bg-indigo-600 p-4"><span className="text-xs uppercase tracking-wider text-indigo-100 font-bold">Custo total da viagem</span><p className="mt-1 text-3xl font-black">{moeda(custo.total)}</p><span className="text-sm text-indigo-100">inclui {moeda(custo.extras)} em extras</span></div></section>
    <section className="bg-white rounded-2xl border border-slate-100 p-5"><h3 className="font-black text-slate-800 mb-3">Composição do desgaste por km</h3><div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm"><div><span className="text-slate-500">Pneus</span><b className="block text-slate-800">{moeda(custo.pneusKm)}</b></div><div><span className="text-slate-500">Manutenção</span><b className="block text-slate-800">{moeda(custo.manutencaoKm)}</b></div><div><span className="text-slate-500">Depreciação</span><b className="block text-slate-800">{moeda(custo.depreciacaoKm)}</b></div><div><span className="text-slate-500">Custos fixos</span><b className="block text-slate-800">{moeda(custo.fixosKm)}</b></div></div></section>
  </div>;
};
