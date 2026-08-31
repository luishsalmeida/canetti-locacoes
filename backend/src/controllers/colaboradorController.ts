import { Request, Response, NextFunction } from 'express';
import { colaboradorSchema } from '../dtos/colaborador';
import * as colaboradorService from '../services/colaboradorService';

export async function listar(req: Request, res: Response, next: NextFunction) {
  try {
    const funcao = req.query.funcao as 'TECNICO' | 'MOTORISTA' | undefined;
    const search = req.query.search as string | undefined;
    const colaboradores = await colaboradorService.getColaboradores({ funcao, search });
    res.json(colaboradores);
  } catch (err) {
    next(err);
  }
}

export async function criar(req: Request, res: Response, next: NextFunction) {
  try {
    const dados = colaboradorSchema.parse(req.body);
    const colaborador = await colaboradorService.createColaborador(dados);
    res.status(201).json(colaborador);
  } catch (err) {
    next(err);
  }
}

export async function atualizar(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    const dados = colaboradorSchema.partial().parse(req.body);
    const colaborador = await colaboradorService.updateColaborador(id, dados);
    res.json(colaborador);
  } catch (err) {
    next(err);
  }
}

export async function deletar(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    await colaboradorService.deleteColaborador(id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
