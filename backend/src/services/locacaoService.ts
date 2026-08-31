import prisma from '../config/prisma';
import { LocacaoInput } from '../dtos/locacao';
import { Decimal } from '@prisma/client/runtime/library';

// Helper para converter Decimal para number
const toNum = (d: Decimal | number): number => typeof d === 'number' ? d : Number(d.toString());

export async function verificarDisponibilidade(
  equipamentoIds: number[],
  dataInicio: string,
  dataFim?: string,
  locacaoIdExcluir?: number
) {
  const dInicio = new Date(dataInicio);
  const dFim = dataFim ? new Date(dataFim) : dInicio;
  const conflitos = await prisma.locacao.findMany({
    where: {
      id: locacaoIdExcluir ? { not: locacaoIdExcluir } : undefined,
      status: { in: ['AGENDADA', 'CONFIRMADA', 'EM_ANDAMENTO'] },
      AND: [
        { dataInicio: { lte: dFim } },
        { dataFim: { gte: dInicio } },
      ],
      itens: {
        some: {
          equipamentoId: { in: equipamentoIds },
        },
      },
    },
    include: {
      clinica: true,
      itens: { include: { equipamento: true } },
    },
  });

  return conflitos;
}

export async function createLocacao(data: LocacaoInput, usuarioId?: number) {
  const equipamentoIds = data.itens.map((i: { equipamentoId: number }) => i.equipamentoId);
  const conflitos = await verificarDisponibilidade(equipamentoIds, data.dataInicio, data.dataInicio);

  if (conflitos.length > 0) {
    const nomesEquipamentos = conflitos
      .flatMap((c) => c.itens.map((i) => i.equipamento?.descricao))
      .filter(Boolean)
      .join(', ');
    throw new Error(`Aparalho(s) já locado(s) nesta data: ${nomesEquipamentos}`);
  }

  let valorTotal = new Decimal(0);
  const itensParaCriar: { equipamentoId: number; valorDiaria: number; quantidade: number; valorTotal: number }[] = [];

  for (const item of data.itens) {
    const vDiaria = toNum(new Decimal(item.valorDiaria));
    valorTotal = valorTotal.add(new Decimal(vDiaria));

    itensParaCriar.push({
      equipamentoId: item.equipamentoId,
      valorDiaria: vDiaria,
      quantidade: 1,
      valorTotal: vDiaria,
    });
  }

  const valorDesconto = toNum(new Decimal(data.valorDesconto || 0));
  const valorFinal = toNum(new Decimal(valorTotal).sub(new Decimal(valorDesconto)));

  // Data fim padrão igual à data de início se não informada
  const dataFim = data.dataInicio;

  return await prisma.$transaction(async (tx) => {
    const locacao = await tx.locacao.create({
      data: {
        clinicaId: data.clinicaId,
        dataInicio: new Date(data.dataInicio),
        horaInicio: data.horaInicio || null,
        dataFim: new Date(dataFim),
        horaFim: data.horaFim || null,
        enderecoLocacao: data.enderecoLocacao || null,
        cidadeLocacao: data.cidadeLocacao || null,
        valorTotal: toNum(valorTotal),
        valorDesconto: valorDesconto,
        valorFinal: valorFinal,
        status: data.status,
        observacoes: data.observacoes || null,
        criadoPorId: usuarioId || null,
      },
    });

    await tx.itemLocacao.createMany({
      data: itensParaCriar.map((item) => ({
        ...item,
        locacaoId: locacao.id,
      })),
    });

    return locacao;
  });
}

export async function getLocacoes(filtros: { dataInicio?: string; dataFim?: string; clinicaId?: number; status?: string }) {
  const where: any = {};

  if (filtros.dataInicio && filtros.dataFim) {
    where.dataInicio = {
      gte: new Date(filtros.dataInicio),
      lte: new Date(filtros.dataFim),
    };
  }

  if (filtros.clinicaId) {
    where.clinicaId = Number(filtros.clinicaId);
  }

  if (filtros.status) {
    where.status = filtros.status;
  }

  return await prisma.locacao.findMany({
    where,
    include: {
      clinica: true,
      criadoPor: true,
      itens: {
        include: {
          equipamento: true,
        },
      },
    },
    orderBy: { dataInicio: 'asc' },
  });
}

export async function getLocacaoById(id: number) {
  return await prisma.locacao.findUnique({
    where: { id },
    include: {
      clinica: true,
      itens: {
        include: {
          equipamento: true,
        },
      },
    },
  });
}

export async function updateLocacao(id: number, data: Partial<LocacaoInput>) {
  const locacaoAtual = await prisma.locacao.findUnique({ where: { id }, include: { itens: true } });
  if (!locacaoAtual) throw new Error('Locação não encontrada');

  const updateData: any = {};
  if (data.clinicaId !== undefined) updateData.clinicaId = data.clinicaId;
  if (data.dataInicio !== undefined) {
    updateData.dataInicio = new Date(data.dataInicio);
    updateData.dataFim = new Date(data.dataInicio);
  }
  if (data.horaInicio !== undefined) updateData.horaInicio = data.horaInicio;
  if (data.horaFim !== undefined) updateData.horaFim = data.horaFim;
  if (data.enderecoLocacao !== undefined) updateData.enderecoLocacao = data.enderecoLocacao;
  if (data.cidadeLocacao !== undefined) updateData.cidadeLocacao = data.cidadeLocacao;
  if (data.valorDesconto !== undefined) updateData.valorDesconto = data.valorDesconto;
  if (data.observacoes !== undefined) updateData.observacoes = data.observacoes;
  if (data.status !== undefined) updateData.status = data.status;

  return await prisma.$transaction(async (tx) => {
    let valorTotal = new Decimal(0);
    if (data.itens) {
      await tx.itemLocacao.deleteMany({ where: { locacaoId: id } });
      const novosItens = data.itens.map((item: { equipamentoId: number; valorDiaria: number }) => {
        const vDiaria = toNum(new Decimal(item.valorDiaria));
        valorTotal = valorTotal.add(new Decimal(vDiaria));
        return {
          locacaoId: id,
          equipamentoId: item.equipamentoId,
          valorDiaria: vDiaria,
          quantidade: 1,
          valorTotal: vDiaria,
        };
      });
      await tx.itemLocacao.createMany({ data: novosItens });
      updateData.valorTotal = toNum(valorTotal);
      const vDesconto = toNum(new Decimal(data.valorDesconto !== undefined ? data.valorDesconto : locacaoAtual.valorDesconto));
      updateData.valorFinal = toNum(new Decimal(updateData.valorTotal).sub(new Decimal(vDesconto)));
    }

    delete updateData.itens;
    return await tx.locacao.update({
      where: { id },
      data: updateData,
    });
  });
}

export async function deleteLocacao(id: number) {
  return await prisma.locacao.delete({ where: { id } });
}
