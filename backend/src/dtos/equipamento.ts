import { z } from 'zod';

export const equipamentoSchema = z.object({
  descricao: z.any().optional().nullable(),
  modelo: z.any().optional().nullable(),
  marca: z.any().optional().nullable(),
  numeroSerie: z.any().optional().nullable(),
  patrimonio: z.any().optional().nullable(),
  categoriaId: z.any().optional().nullable(),
  unidade: z.any().optional().nullable(),
  valorDiaria: z.any().optional().nullable(),
  valorSemanal: z.any().optional().nullable(),
  valorMensal: z.any().optional().nullable(),
  status: z.any().optional().nullable(),
  observacoes: z.any().optional().nullable(),
});

export type EquipamentoInput = z.infer<typeof equipamentoSchema>;
