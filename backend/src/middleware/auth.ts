import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../config/prisma';

interface JwtPayload {
  id: number;
  login: string;
  nome?: string;
  perfil: string;
  colaboradorId?: number | null;
  colaboradorFuncao?: string | null;
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token de acesso não fornecido' });
  }

  const token = authHeader.substring(7);
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret || jwtSecret.length < 32) {
    return res.status(500).json({ error: 'Configuração de segurança incompleta' });
  }
  try {
    const decoded = jwt.verify(token, jwtSecret) as JwtPayload;
    // O perfil e o vínculo são lidos do banco a cada requisição. Isso faz
    // desativações e trocas entre motorista/técnica valerem imediatamente.
    const usuario = await prisma.usuario.findFirst({
      where: { id: decoded.id, ativo: true },
      include: { colaborador: { select: { id: true, funcao: true } } },
    });
    if (!usuario) return res.status(401).json({ error: 'Usuário não encontrado ou inativo' });

    req.user = {
      id: usuario.id,
      nome: usuario.nome,
      login: usuario.login,
      perfil: usuario.perfil,
      colaboradorId: usuario.colaboradorId,
      colaboradorFuncao: usuario.colaborador?.funcao || null,
    };
    next();
  } catch {
    return res.status(401).json({ error: 'Token inválido ou expirado' });
  }
}

export function requireProfile(...perfisPermitidos: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: 'Não autenticado' });
    if (!perfisPermitidos.includes(req.user.perfil)) {
      return res.status(403).json({ error: 'Acesso negado: permissão insuficiente' });
    }
    next();
  };
}
