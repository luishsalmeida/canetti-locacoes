import { Request, Response } from 'express';
import { equipamentoSchema } from '../dtos/equipamento';
import * as service from '../services/equipamentoService';

export async function index(req: Request, res: Response) {
  const { categoriaId, status, search } = req.query as { categoriaId?: string; status?: 'DISPONIVEL' | 'LOCADO' | 'MANUTENCAO' | 'INATIVO'; search?: string };
  const equipamentos = await service.getEquipamentos({
    categoriaId: categoriaId ? Number(categoriaId) : undefined,
    status,
    search,
  });
  res.json(equipamentos);
}

export async function show(req: Request, res: Response) {
  const id = Number(req.params.id);
  const equipamento = await service.getEquipamentoById(id);
  res.json(equipamento);
}

export async function create(req: Request, res: Response) {
  const data = equipamentoSchema.parse(req.body);
  const equipamento = await service.createEquipamento(data);
  res.status(201).json(equipamento);
}

export async function update(req: Request, res: Response) {
  const id = Number(req.params.id);
  const data = equipamentoSchema.partial().parse(req.body);
  const equipamento = await service.updateEquipamento(id, data);
  res.json(equipamento);
}

export async function remove(req: Request, res: Response) {
  const id = Number(req.params.id);
  await service.deleteEquipamento(id);
  res.status(204).send();
}