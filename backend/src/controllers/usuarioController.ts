import { Request, Response, NextFunction } from 'express';
import { acessoColaboradorSchema } from '../dtos/usuario';
import { criarAcessoColaborador as criarAcessoColaboradorService } from '../services/usuarioService';

export async function criarAcessoColaborador(req: Request, res: Response, next: NextFunction) {
  try {
    const dados = acessoColaboradorSchema.parse(req.body);
    const usuario = await criarAcessoColaboradorService(dados);
    res.status(201).json(usuario);
  } catch (error) {
    next(error);
  }
}
