import React, { useMemo, useState } from 'react';
import { Car, CircleDollarSign, MapPin, Navigation, Plus, Trash2 } from 'lucide-react';
import { api } from '../services/api';
import { Button } from '../components/Button';

const DEPRECIACAO_ESTIMADA_KM = 0.35;
const cidadesSugeridas = ['Cerquilho - SP', 'Rio Claro - SP', 'Itapetininga - SP', 'Sorocaba - SP', 'Tatuí - SP', 'Botucatu - SP', 'Bauru - SP', 'Itu - SP', 'Campinas - SP', 'Marília - SP', 'Itapeva - SP', 'Santa Cruz do Rio Pardo - SP'];

type RotaCalculada = { distanciaKm: number; duracaoMinutos: number; pedagiosEstimados: number | null; pedagiosConfigurados: boolean };
const moeda = (valor: number) => valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const numero = (valor: unknown) => Math.max(0, Number(valor) || 0);

export const CalculadoraRotas: React.FC = () => {
  const [mensagem, setMensagem] = useState('');
  const [origem, setOrigem] = useState('Cerquilho - SP');
  const [destino, setDestino] = useState('');
  const [parada, setParada] = useState('');
  const [paradas, setParadas] = useState<string[]>([]);
  const [quilometragem, setQuilometragem] = useState(0);
  const [duracaoMinutos, setDuracaoMinutos] = useState<number | null>(null);
  const [calculandoRota, setCalculandoRota] = useState(false);
  const [idaEVolta, setIdaEVolta] = useState(true);
  const [consumoKmLitro, setConsumoKmLitro] = useState(10);
  const [precoCombustivel, setPrecoCombustivel] = useState(0);
  const [pedagioIda, setPedagioIda] = useState<number | null>(null);
  const [pedagiosConfigurados, setPedagiosConfigurados] = useState(false);
  const [outrosCustos, setOutrosCustos] = useState(0);

  const custo = useMemo(() => {
    const kmTotal = numero(quilometragem) * (idaEVolta ? 2 : 1);
    const litros = consumoKmLitro > 0 ? kmTotal / consumoKmLitro : 0;
    const combustivel = litros * numero(precoCombustivel);
    const depreciacao = kmTotal * DEPRECIACAO_ESTIMADA_KM;
    const pedagios = pedagioIda === null ? 0 : pedagioIda * (idaEVolta ? 2 : 1);
    const adicionais = numero(outrosCustos);
    return { kmTotal, litros, combustivel, depreciacao, pedagios, adicionais, total: combustivel + depreciacao + pedagios + adicionais };
  }, [quilometragem, idaEVolta, consumoKmLitro, precoCombustivel, pedagioIda, outrosCustos]);

  async function calcularRota() {
    const cidades = [origem, ...paradas, destino].map((cidade) => cidade.trim()).filter(Boolean);
    if (cidades.length < 2) return setMensagem('Informe pelo menos a origem e o destino para calcular a rota.');
    setCalculandoRota(true);
    setMensagem('');
    try {
      const rota = await api.post<RotaCalculada>('/rotas/calcular-distancia', { cidades });
      setQuilometragem(rota.distanciaKm);
      setDuracaoMinutos(rota.duracaoMinutos);
      setPedagioIda(rota.pedagiosEstimados);
      setPedagiosConfigurados(rota.pedagiosConfigurados);
      if (!rota.pedagiosConfigurados) setMensagem('A rota foi calculada. Os pedágios serão preenchidos automaticamente assim que a chave do Google Maps for configurada.');
    } catch (erro) {
      setMensagem(erro instanceof Error ? erro.message : 'Não foi possível calcular a rota.');
    } finally { setCalculandoRota(false); }
  }

  return <div className="p-6 flex flex-col gap-6">
    <div className="flex items-center gap-3"><div className="rounded-xl bg-indigo-50 p-3"><Car className="w-6 h-6 text-indigo-600" /></div><div><h2 className="text-2xl font-black text-slate-800">Calculadora de Rotas</h2><p className="text-sm font-medium text-slate-500">Informe cidades, consumo e preço do combustível para estimar a viagem.</p></div></div>
    {mensagem && <div className="rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm font-semibold text-indigo-700">{mensagem}</div>}

    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
      <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col gap-5">
        <div><h3 className="font-black text-slate-800">Rota da viagem</h3><p className="text-sm text-slate-500">Digite as cidades para calcular distância e pedágios.</p></div>
        <datalist id="cidades-rota">{cidadesSugeridas.map((cidade) => <option key={cidade} value={cidade} />)}</datalist>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4"><label className="flex flex-col gap-1.5 text-sm font-bold text-slate-600">Origem<input list="cidades-rota" value={origem} onChange={(e) => setOrigem(e.target.value)} className="rounded-xl border border-slate-300 px-3 py-2.5" /></label><label className="flex flex-col gap-1.5 text-sm font-bold text-slate-600">Destino<input list="cidades-rota" value={destino} onChange={(e) => setDestino(e.target.value)} placeholder="Ex.: Rio Claro - SP" className="rounded-xl border border-slate-300 px-3 py-2.5" /></label></div>
        <div className="flex flex-col gap-2"><span className="text-sm font-bold text-slate-600">Paradas intermediárias</span>{paradas.map((cidade, indice) => <div className="flex gap-2" key={`${cidade}-${indice}`}><input list="cidades-rota" value={cidade} onChange={(e) => setParadas((itens) => itens.map((item, i) => i === indice ? e.target.value : item))} className="flex-1 rounded-xl border border-slate-300 px-3 py-2.5" /><button type="button" onClick={() => setParadas((itens) => itens.filter((_, i) => i !== indice))} className="p-2 text-rose-600"><Trash2 className="w-5 h-5" /></button></div>)}<div className="flex gap-2"><input list="cidades-rota" value={parada} onChange={(e) => setParada(e.target.value)} placeholder="Adicionar cidade" className="flex-1 rounded-xl border border-slate-300 px-3 py-2.5" /><Button type="button" variant="outline" onClick={() => { if (parada.trim()) { setParadas((itens) => [...itens, parada.trim()]); setParada(''); } }} leftIcon={<Plus className="w-4 h-4" />}>Adicionar</Button></div></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-100 pt-4"><div className="flex flex-col gap-2"><span className="text-sm font-bold text-slate-600">Distância e pedágios</span><Button type="button" onClick={calcularRota} disabled={calculandoRota} leftIcon={<Navigation className="w-4 h-4" />}>{calculandoRota ? 'Calculando rota...' : 'Calcular rota'}</Button>{quilometragem > 0 && <span className="text-sm font-bold text-emerald-700">{quilometragem.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} km {duracaoMinutos !== null && `• cerca de ${Math.floor(duracaoMinutos / 60)}h${String(duracaoMinutos % 60).padStart(2, '0')}`}</span>}</div><label className="flex items-center gap-3 rounded-xl bg-slate-50 px-4 mt-6 font-bold text-slate-700"><input type="checkbox" checked={idaEVolta} onChange={(e) => setIdaEVolta(e.target.checked)} className="w-4 h-4 accent-indigo-600" />Considerar ida e volta</label></div>
        <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600 flex gap-2"><MapPin className="w-4 h-4 mt-0.5 text-indigo-500" /><span><b>{origem || 'Origem'}</b>{paradas.length ? ` → ${paradas.join(' → ')}` : ''}{destino ? ` → ${destino}` : ''}</span></div>
      </section>

      <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col gap-5">
        <div><h3 className="font-black text-slate-800">Dados do carro</h3><p className="text-sm text-slate-500">Esses valores valem apenas para o cálculo atual.</p></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4"><label className="flex flex-col gap-1.5 text-sm font-bold text-slate-600">Consumo do carro<div className="relative"><input type="number" min="0.1" step="0.1" value={consumoKmLitro || ''} onChange={(e) => setConsumoKmLitro(numero(e.target.value))} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 pr-12 font-semibold text-slate-800 outline-none focus:border-indigo-500" /><span className="absolute right-3 top-2.5 text-xs font-bold text-slate-400">km/l</span></div></label><label className="flex flex-col gap-1.5 text-sm font-bold text-slate-600">Valor do combustível<div className="relative"><input type="number" min="0" step="0.01" value={precoCombustivel || ''} onChange={(e) => setPrecoCombustivel(numero(e.target.value))} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 pr-12 font-semibold text-slate-800 outline-none focus:border-indigo-500" /><span className="absolute right-3 top-2.5 text-xs font-bold text-slate-400">R$/l</span></div></label></div>
        <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3"><div className="flex items-center gap-2 text-amber-800"><CircleDollarSign className="w-5 h-5" /><b>Depreciação estimada</b></div><p className="mt-1 text-sm text-amber-700">{moeda(DEPRECIACAO_ESTIMADA_KM)} por km, aplicada automaticamente à rota.</p></div>
        <div className="rounded-xl border border-slate-200 p-4"><span className="text-sm font-bold text-slate-600">Pedágios automáticos</span><p className="mt-1 text-lg font-black text-slate-800">{pedagioIda === null ? (pedagiosConfigurados ? 'Sem pedágios identificados' : 'Aguardando cálculo') : moeda(custo.pedagios)}</p><p className="mt-1 text-xs text-slate-500">{pedagioIda === null && pedagiosConfigurados ? 'A rota não possui tarifa estimada.' : idaEVolta && pedagioIda !== null ? 'Valor considera ida e volta.' : 'Estimativa da rota calculada.'}</p></div>
        <label className="flex flex-col gap-1.5 text-sm font-bold text-slate-600">Outros custos (opcional)<div className="relative"><input type="number" min="0" step="0.01" value={outrosCustos || ''} onChange={(e) => setOutrosCustos(numero(e.target.value))} placeholder="Ex.: alimentação, lavagem" className="w-full rounded-xl border border-slate-300 px-3 py-2.5 pr-12 font-semibold text-slate-800 outline-none focus:border-indigo-500" /><span className="absolute right-3 top-2.5 text-xs font-bold text-slate-400">R$</span></div></label>
      </section>
    </div>

    <section className="rounded-2xl bg-slate-900 text-white p-6 shadow-xl grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5"><div><span className="text-xs uppercase tracking-wider text-slate-400 font-bold">Distância total</span><p className="mt-1 text-3xl font-black">{custo.kmTotal.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} km</p><span className="text-sm text-slate-400">{custo.litros.toFixed(1)} litros previstos</span></div><div><span className="text-xs uppercase tracking-wider text-slate-400 font-bold">Combustível</span><p className="mt-1 text-3xl font-black">{moeda(custo.combustivel)}</p><span className="text-sm text-slate-400">com base no consumo informado</span></div><div><span className="text-xs uppercase tracking-wider text-slate-400 font-bold">Depreciação</span><p className="mt-1 text-3xl font-black">{moeda(custo.depreciacao)}</p><span className="text-sm text-slate-400">{moeda(DEPRECIACAO_ESTIMADA_KM)} por km</span></div><div className="rounded-xl bg-indigo-600 p-4"><span className="text-xs uppercase tracking-wider text-indigo-100 font-bold">Custo total da viagem</span><p className="mt-1 text-3xl font-black">{moeda(custo.total)}</p><span className="text-sm text-indigo-100">inclui {moeda(custo.pedagios + custo.adicionais)} em pedágios e outros</span></div></section>
  </div>;
};
