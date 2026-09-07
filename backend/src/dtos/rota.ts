import { z } from 'zod';

export const calcularRotaSchema = z.object({
  cidades: z.array(z.string().trim().min(2).max(120)).min(2).max(8),
});
