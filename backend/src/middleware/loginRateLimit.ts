import { NextFunction, Request, Response } from 'express';

const tentativas = new Map<string, { total: number; expiraEm: number }>();
const JANELA_MS = 15 * 60 * 1000;
const LIMITE = 10;

export function loginRateLimit(req: Request, res: Response, next: NextFunction) {
  const chave = req.ip || req.socket.remoteAddress || 'desconhecido';
  const agora = Date.now();
  const registro = tentativas.get(chave);

  if (!registro || registro.expiraEm <= agora) {
    tentativas.set(chave, { total: 1, expiraEm: agora + JANELA_MS });
    return next();
  }

  if (registro.total >= LIMITE) {
    return res.status(429).json({ error: 'Muitas tentativas de login. Aguarde alguns minutos.' });
  }

  registro.total += 1;
  next();
}

export function limparTentativasLogin(req: Request) {
  const chave = req.ip || req.socket.remoteAddress || 'desconhecido';
  tentativas.delete(chave);
}

