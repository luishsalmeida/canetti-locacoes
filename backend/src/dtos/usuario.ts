import { z } from 'zod';

export const acessoColaboradorSchema = z.object({
  colaboradorId: z.coerce.number().int().positive(),
  login: z.string().trim().toLowerCase().min(3).max(30).regex(/^[a-z0-9._-]+$/, 'Use somente letras, números, ponto, traço ou sublinhado no login'),
  senha: z.string().min(8, 'A senha deve ter pelo menos 8 caracteres').max(72),
});

export type AcessoColaboradorInput = z.infer<typeof acessoColaboradorSchema>;
