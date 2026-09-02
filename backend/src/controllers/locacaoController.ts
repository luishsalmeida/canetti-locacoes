import { Request, Response } from 'express';
import { locacaoSchema } from '../dtos/locacao';
import * as service from '../services/locacaoService';
import { registrarAuditoria } from '../services/auditoriaService';

const ipDaRequisicao = (req: Request) => req.ip || req.socket.remoteAddress;

export async function index(req: Request, res: Response) {
  const { dataInicio, dataFim, clinicaId, status, busca, equipamentoId, tecnicoId, motoristaId } = req.query as {
    dataInicio?: string;
    dataFim?: string;
    clinicaId?: string;
    status?: string;
    busca?: string;
    equipamentoId?: string;
    tecnicoId?: string;
    motoristaId?: string;
  };
  const acessoRestrito = req.user?.perfil === 'COLABORADOR';
  if (acessoRestrito && (!req.user?.colaboradorId || !req.user.colaboradorFuncao)) {
    return res.json([]);
  }

  const locacoes = await service.getLocacoes({
    dataInicio,
    dataFim,
    clinicaId: clinicaId ? Number(clinicaId) : undefined,
    status,
    busca,
    equipamentoId: equipamentoId ? Number(equipamentoId) : undefined,
    tecnicoId: tecnicoId ? Number(tecnicoId) : undefined,
    motoristaId: motoristaId ? Number(motoristaId) : undefined,
    acessoColaboradorId: acessoRestrito ? req.user?.colaboradorId ?? undefined : undefined,
    acessoColaboradorFuncao: acessoRestrito ? req.user?.colaboradorFuncao : undefined,
  });
  res.json(locacoes);
}

export async function exportarConcluidas(_req: Request, res: Response) {
  const locacoes = await service.getLocacoes({ status: 'CONCLUIDA' });
  res.json({ geradoEm: new Date().toISOString(), locacoes });
}

export async function show(req: Request, res: Response) {
  const id = Number(req.params.id);
  const acesso = req.user?.perfil === 'COLABORADOR'
    ? { colaboradorId: req.user.colaboradorId ?? undefined, colaboradorFuncao: req.user.colaboradorFuncao }
    : undefined;
  const locacao = await service.getLocacaoById(id, acesso);
  if (!locacao) return res.status(404).json({ error: 'Agendamento não encontrado' });
  res.json(locacao);
}

export async function create(req: Request, res: Response) {
  if (!req.user) return res.status(401).json({ error: 'Não autenticado' });
  const data = locacaoSchema.parse(req.body);
  const locacao = await service.createLocacao(data, req.user.id);
  await registrarAuditoria({ usuarioId: req.user.id, entidade: 'LOCACAO', entidadeId: locacao.id, acao: 'CRIAR', dadosDepois: locacao, ip: ipDaRequisicao(req) });
  res.status(201).json(locacao);
}

export async function update(req: Request, res: Response) {
  const id = Number(req.params.id);
  const data = locacaoSchema.partial().parse(req.body);
  const antes = await service.getLocacaoById(id);
  const locacao = await service.updateLocacao(id, data);
  await registrarAuditoria({ usuarioId: req.user?.id, entidade: 'LOCACAO', entidadeId: id, acao: 'ATUALIZAR', dadosAntes: antes, dadosDepois: locacao, ip: ipDaRequisicao(req) });
  res.json(locacao);
}

export async function remove(req: Request, res: Response) {
  const id = Number(req.params.id);
  const antes = await service.getLocacaoById(id);
  await service.deleteLocacao(id);
  await registrarAuditoria({ usuarioId: req.user?.id, entidade: 'LOCACAO', entidadeId: id, acao: 'EXCLUIR', dadosAntes: antes, ip: ipDaRequisicao(req) });
  res.status(204).send();
}

export async function verificarDisponibilidadeController(req: Request, res: Response) {
  const { equipamentoIds, dataInicio, dataFim, locacaoIdExcluir, horaInicio, horaFim } = req.body as {
    equipamentoIds: number[];
    dataInicio: string;
    dataFim: string;
    locacaoIdExcluir?: number;
    horaInicio?: string;
    horaFim?: string;
  };

  if (!equipamentoIds || !dataInicio || !dataFim) {
    return res.status(400).json({ error: 'Parâmetros inválidos' });
  }

  const conflitos = await service.verificarDisponibilidade(
    equipamentoIds,
    dataInicio,
    dataFim,
    locacaoIdExcluir ? Number(locacaoIdExcluir) : undefined,
    horaInicio,
    horaFim
  );

  res.json({ disponivel: conflitos.length === 0, conflitos });
}
