import { z } from 'zod';

export const clinicaSchema = z.object({
  razaoSocial: z.any().optional().nullable(),
  nomeFantasia: z.any().optional().nullable(),
  tipoPessoa: z.any().optional().nullable(),
  cnpjCpf: z.any().optional().nullable(),
  ie: z.any().optional().nullable(),
  email: z.any().optional().nullable(),
  telefone: z.any().optional().nullable(),
  celular: z.any().optional().nullable(),
  contato: z.any().optional().nullable(),
  endereco: z.any().optional().nullable(),
  numero: z.any().optional().nullable(),
  complemento: z.any().optional().nullable(),
  bairro: z.any().optional().nullable(),
  cidade: z.any().optional().nullable(),
  uf: z.any().optional().nullable(),
  cep: z.any().optional().nullable(),
  regiao: z.any().optional().nullable(),
  observacoes: z.any().optional().nullable(),
  status: z.any().optional().nullable(),
  limiteCredito: z.any().optional().nullable(),
  saldoCredor: z.any().optional().nullable(),
});

export type ClinicaInput = z.infer<typeof clinicaSchema>;
