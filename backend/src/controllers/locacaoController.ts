import { Request, Response } from 'express';
import { locacaoSchema } from '../dtos/locacao';
import * as service from '../services/locacaoService';

export async function index(req: Request, res: Response) {
  const { dataInicio, dataFim, clinicaId, status } = req.query as { dataInicio?: string; dataFim?: string; clinicaId?: string; status?: string };
  const locacoes = await service.getLocacoes({
    dataInicio,
    dataFim,
    clinicaId: clinicaId ? Number(clinicaId) : undefined,
    status,
  });
  res.json(locacoes);
}

export async function show(req: Request, res: Response) {
  const id = Number(req.params.id);
  const locacao = await service.getLocacaoById(id);
  res.json(locacao);
}

export async function create(req: Request, res: Response) {
  if (!req.user) return res.status(401).json({ error: 'Não autenticado' });
  const data = locacaoSchema.parse(req.body);
  const locacao = await service.createLocacao(data, req.user.id);
  res.status(201).json(locacao);
}

export async function update(req: Request, res: Response) {
  const id = Number(req.params.id);
  const data = locacaoSchema.partial().parse(req.body);
  const locacao = await service.updateLocacao(id, data);
  res.json(locacao);
}

export async function remove(req: Request, res: Response) {
  const id = Number(req.params.id);
  await service.deleteLocacao(id);
  res.status(204).send();
}

export async function verificarDisponibilidadeController(req: Request, res: Response) {
  const { equipamentoIds, dataInicio, dataFim, locacaoIdExcluir } = req.body as {
    equipamentoIds: number[];
    dataInicio: string;
    dataFim: string;
    locacaoIdExcluir?: number;
  };

  if (!equipamentoIds || !dataInicio || !dataFim) {
    return res.status(400).json({ error: 'Parâmetros inválidos' });
  }

  const conflitos = await service.verificarDisponibilidade(
    equipamentoIds,
    dataInicio,
    dataFim,
    locacaoIdExcluir ? Number(locacaoIdExcluir) : undefined
  );

  res.json({ disponivel: conflitos.length === 0, conflitos });
}
