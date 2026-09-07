import { Request, Response, NextFunction } from 'express';
import { calcularRotaSchema } from '../dtos/rota';
import * as rotaService from '../services/rotaService';

function conferirAcesso(req: Request) {
  if (req.user?.perfil === 'COLABORADOR' && req.user.colaboradorFuncao !== 'MOTORISTA') {
    throw new Error('Esta área é exclusiva para motoristas.');
  }
}

export async function calcularDistancia(req: Request, res: Response, next: NextFunction) {
  try {
    conferirAcesso(req);
    const dados = calcularRotaSchema.parse(req.body);
    res.json(await rotaService.calcularDistancia(dados.cidades));
  } catch (erro) { next(erro); }
}
