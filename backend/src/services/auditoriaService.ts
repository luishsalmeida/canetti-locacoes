import prisma from '../config/prisma';

function serializar(dados: unknown) {
  if (dados === undefined || dados === null) return undefined;
  return JSON.parse(JSON.stringify(dados));
}

export async function registrarAuditoria(params: {
  usuarioId?: number;
  entidade: string;
  entidadeId?: number;
  acao: string;
  dadosAntes?: unknown;
  dadosDepois?: unknown;
  ip?: string;
}) {
  await prisma.auditoria.create({
    data: {
      usuarioId: params.usuarioId,
      entidade: params.entidade,
      entidadeId: params.entidadeId,
      acao: params.acao,
      dadosAntes: serializar(params.dadosAntes),
      dadosDepois: serializar(params.dadosDepois),
      ip: params.ip,
    },
  });
}

