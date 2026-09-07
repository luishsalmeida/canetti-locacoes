import { z } from 'zod';

const numeroNaoNegativo = z.coerce.number().finite().nonnegative();

export const veiculoSchema = z.object({
  apelido: z.string().trim().max(80).optional().nullable(),
  placa: z.string().trim().max(12).optional().nullable(),
  marca: z.string().trim().max(60).optional().nullable(),
  modelo: z.string().trim().max(100).optional().nullable(),
  anoModelo: z.coerce.number().int().min(1950).max(2100).optional().nullable(),
  consumoKmLitro: z.coerce.number().finite().positive(),
  consumoGasolina: z.coerce.number().finite().positive(),
  consumoEtanol: z.coerce.number().finite().positive(),
  precoCombustivel: numeroNaoNegativo,
  precoEtanol: numeroNaoNegativo,
  desgasteEstimadoKm: numeroNaoNegativo,
  valorPneus: numeroNaoNegativo,
  vidaUtilPneusKm: z.coerce.number().finite().positive(),
  manutencaoAnual: numeroNaoNegativo,
  custosFixosAnuais: numeroNaoNegativo,
  kmAnual: z.coerce.number().finite().positive(),
  valorAtual: numeroNaoNegativo,
  valorResidual: numeroNaoNegativo,
  vidaUtilKm: z.coerce.number().finite().positive(),
});

export type VeiculoInput = z.infer<typeof veiculoSchema>;
