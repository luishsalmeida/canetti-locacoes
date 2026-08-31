import { z } from 'zod';

export const locacaoSchema = z.object({
  clinicaId: z.any().optional().nullable(),
  dataInicio: z.any().optional().nullable(),
  horaInicio: z.any().optional().nullable(),
  horaFim: z.any().optional().nullable(),
  enderecoLocacao: z.any().optional().nullable(),
  cidadeLocacao: z.any().optional().nullable(),
  tecnicoId: z.any().optional().nullable(),
  motoristaId: z.any().optional().nullable(),
  valorDesconto: z.any().optional().nullable(),
  observacoes: z.any().optional().nullable(),
  status: z.any().optional().nullable(),
  itens: z.any().optional().nullable(),
});

export type LocacaoInput = z.infer<typeof locacaoSchema>;
