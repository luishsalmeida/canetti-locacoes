import { Request, Response } from 'express';
import { clinicaSchema } from '../dtos/clinica';
import * as service from '../services/clinicaService';

export async function index(req: Request, res: Response) {
  const { search, cidade, status } = req.query as { search?: string; cidade?: string; status?: 'ATIVA' | 'BLOQUEADA' | 'INADIMPLENTE' };
  const clinicas = await service.getClinicas({ search, cidade, status });
  res.json(clinicas);
}

export async function show(req: Request, res: Response) {
  const id = Number(req.params.id);
  const clinica = await service.getClinicaById(id);
  res.json(clinica);
}

export async function create(req: Request, res: Response) {
  const data = clinicaSchema.parse(req.body);
  const clinica = await service.createClinica(data);
  res.status(201).json(clinica);
}

export async function update(req: Request, res: Response) {
  const id = Number(req.params.id);
  const data = clinicaSchema.partial().parse(req.body);
  const clinica = await service.updateClinica(id, data);
  res.json(clinica);
}

export async function remove(req: Request, res: Response) {
  const id = Number(req.params.id);
  await service.deleteClinica(id);
  res.status(204).send();
}