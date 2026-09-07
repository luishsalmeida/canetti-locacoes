import { Request, Response, NextFunction } from 'express';
import { veiculoSchema } from '../dtos/veiculo';
import * as veiculoService from '../services/veiculoService';

function motoristaDaRequisicao(req: Request) {
  if (req.user?.perfil === 'COLABORADOR') {
    if (req.user.colaboradorFuncao !== 'MOTORISTA' || !req.user.colaboradorId) {
      throw new Error('Esta área é exclusiva para motoristas.');
    }
    return req.user.colaboradorId;
  }
  const motoristaId = Number(req.params.motoristaId);
  if (!Number.isInteger(motoristaId) || motoristaId <= 0) throw new Error('Motorista inválido.');
  return motoristaId;
}

export async function meuVeiculo(req: Request, res: Response, next: NextFunction) {
  try { res.json(await veiculoService.getVeiculo(motoristaDaRequisicao(req))); } catch (erro) { next(erro); }
}

export async function salvarMeuVeiculo(req: Request, res: Response, next: NextFunction) {
  try {
    if (req.user?.perfil !== 'ADMIN') throw new Error('Somente o administrador pode alterar o cadastro do veículo.');
    res.json(await veiculoService.salvarVeiculo(motoristaDaRequisicao(req), veiculoSchema.parse(req.body)));
  } catch (erro) { next(erro); }
}

export async function veiculoDoMotorista(req: Request, res: Response, next: NextFunction) {
  try {
    const motoristaId = Number(req.params.motoristaId);
    if (!Number.isInteger(motoristaId) || motoristaId <= 0) throw new Error('Motorista inválido.');
    res.json(await veiculoService.getVeiculo(motoristaId));
  } catch (erro) { next(erro); }
}

export async function salvarVeiculoDoMotorista(req: Request, res: Response, next: NextFunction) {
  try {
    const motoristaId = Number(req.params.motoristaId);
    if (!Number.isInteger(motoristaId) || motoristaId <= 0) throw new Error('Motorista inválido.');
    res.json(await veiculoService.salvarVeiculo(motoristaId, veiculoSchema.parse(req.body)));
  } catch (erro) { next(erro); }
}
