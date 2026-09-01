import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';

export function notFound(req: Request, res: Response) {
  res.status(404).json({ error: 'Rota nÃ£o encontrada' });
}

export function handleError(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
) {
  console.error('Erro de API:', { metodo: req.method, rota: req.originalUrl, nome: err.name, mensagem: err.message });

  if (err instanceof ZodError) {
    const detalhes = err.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
    return res.status(400).json({
      error: `Dados invÃ¡lidos: ${detalhes}`,
      details: err.errors,
    });
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    console.error('âŒ [PRISMA KNOWN ERROR CODE]:', err.code, err.meta);
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'Registro duplicado no banco de dados' });
    }
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Registro nÃ£o encontrado' });
    }
    return res.status(400).json({ error: `Erro no banco de dados: ${err.message}` });
  }

  if (err instanceof Prisma.PrismaClientValidationError) {
    console.error('âŒ [PRISMA VALIDATION ERROR]:', err.message);
    return res.status(400).json({ error: `Erro de validaÃ§Ã£o do Prisma: ${err.message}` });
  }

  return res.status(500).json({
    error: err.message || 'Erro interno do servidor',
  });
}

