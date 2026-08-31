import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Locacao } from '../types';
import { Button } from '../components/Button';
import { FileSpreadsheet, Download, RefreshCw, Calendar, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';

export const Relatorios: React.FC = () => {
  const [locacoes, setLocacoes] = useState<Locacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');

  const carregarDados = async () => {
    setLoading(true);
    try {
      let endpoint = '/locacoes';
      if (dataInicio && dataFim) {
        endpoint += `?dataInicio=${dataInicio}&dataFim=${dataFim}`;
      }
      const data = await api.get<Locacao[]>(endpoint);
      setLocacoes(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, []);

  const totalFaturamento = locacoes.reduce((acc, loc) => acc + Number(loc.valorFinal), 0);
  const totalAgendamentos = locacoes.length;
  const totalDescontos = locacoes.reduce((acc, loc) => acc + Number(loc.valorDesconto), 0);

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h2 className="text-2xl font-black text-slate-800 tracking-tight">Faturamento e Relatórios</h2>
        <p className="text-sm font-medium text-slate-500">Acompanhe as métricas de performance financeira das locações</p>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-end bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
        <div className="flex-1">
          <label className="text-xs font-semibold text-slate-500 block mb-1.5">Data Início</label>
          <input
            type="date"
            value={dataInicio}
            onChange={(e) => setDataInicio(e.target.value)}
            className="w-full px-3.5 py-2 rounded-lg border border-slate-300 bg-white"
          />
        </div>
        <div className="flex-1">
          <label className="text-xs font-semibold text-slate-500 block mb-1.5">Data Fim</label>
          <input
            type="date"
            value={dataFim}
            onChange={(e) => setDataFim(e.target.value)}
            className="w-full px-3.5 py-2 rounded-lg border border-slate-300 bg-white"
          />
        </div>
        <Button onClick={carregarDados} leftIcon={<RefreshCw className="w-4 h-4" />}>
          Atualizar Filtros
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl border border-slate-100 p-6 flex flex-col gap-1.5 shadow-sm">
          <span className="text-xs font-semibold text-slate-500">Faturamento Líquido</span>
          <div className="flex items-center justify-between mt-1">
            <span className="text-3xl font-black text-slate-800">R$ {totalFaturamento.toFixed(2)}</span>
            <TrendingUp className="w-6 h-6 text-emerald-500" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 p-6 flex flex-col gap-1.5 shadow-sm">
          <span className="text-xs font-semibold text-slate-500">Volume de Locações</span>
          <div className="flex items-center justify-between mt-1">
            <span className="text-3xl font-black text-slate-800">{totalAgendamentos}</span>
            <Calendar className="w-6 h-6 text-indigo-500" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 p-6 flex flex-col gap-1.5 shadow-sm">
          <span className="text-xs font-semibold text-slate-500">Total Descontos Concedidos</span>
          <div className="flex items-center justify-between mt-1">
            <span className="text-3xl font-black text-slate-800">R$ {totalDescontos.toFixed(2)}</span>
            <FileSpreadsheet className="w-6 h-6 text-rose-500" />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  <th className="px-6 py-4">Clínica</th>
                  <th className="px-6 py-4">Data</th>
                  <th className="px-6 py-4">Aparelhos</th>
                  <th className="px-6 py-4">Faturamento Bruto</th>
                  <th className="px-6 py-4">Desconto</th>
                  <th className="px-6 py-4">Total Pago</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                {locacoes.map((loc) => (
                  <tr key={loc.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-bold">{loc.clinica.nomeFantasia || loc.clinica.razaoSocial}</td>
                    <td className="px-6 py-4 font-medium">{format(new Date(loc.dataInicio), 'dd/MM/yyyy')}</td>
                    <td className="px-6 py-4">
                      {loc.itens.map((i) => i.equipamento.descricao).join(', ')}
                    </td>
                    <td className="px-6 py-4 font-medium">R$ {Number(loc.valorTotal).toFixed(2)}</td>
                    <td className="px-6 py-4 text-rose-600 font-medium">- R$ {Number(loc.valorDesconto).toFixed(2)}</td>
                    <td className="px-6 py-4 font-bold text-indigo-600">R$ {Number(loc.valorFinal).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
