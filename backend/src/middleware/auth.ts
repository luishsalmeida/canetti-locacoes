import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

interface JwtPayload {
  id: number;
  login: string;
  perfil: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token de acesso nÃ£o fornecido' });
  }

  const token = authHeader.substring(7);
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret || jwtSecret.length < 32) {
    return res.status(500).json({ error: 'ConfiguraÃ§Ã£o de seguranÃ§a incompleta' });
  }
  try {
    const decoded = jwt.verify(token, jwtSecret) as JwtPayload;
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: 'Token invÃ¡lido ou expirado' });
  }
}

export function requireProfile(...perfisPermitidos: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: 'NÃ£o autenticado' });
    if (!perfisPermitidos.includes(req.user.perfil)) {
      return res.status(403).json({ error: 'Acesso negado: permissÃ£o insuficiente' });
    }
    next();
  };
}

