import { z } from 'zod';

export const colaboradorSchema = z.object({
  nome: z.any().optional().nullable(),
  funcao: z.any().optional().nullable(),
  telefone: z.any().optional().nullable(),
  email: z.any().optional().nullable(),
  ativo: z.any().optional().nullable(),
});

export type ColaboradorInput = z.infer<typeof colaboradorSchema>;
