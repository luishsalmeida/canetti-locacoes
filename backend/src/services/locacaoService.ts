import prisma from '../config/prisma';
import { LocacaoInput } from '../dtos/locacao';
import { Decimal } from '@prisma/client/runtime/library';

// Helper para converter Decimal para number
const toNum = (d: Decimal | number): number => typeof d === 'number' ? d : Number(d.toString());

const dataSomente = (valor: string | Date) => (typeof valor === 'string' ? valor : valor.toISOString()).slice(0, 10);
const horario = (valor?: string | null, padrao = '00:00') => valor || padrao;

function conflitoDeHorario(atual: { dataInicio: Date; dataFim: Date; horaInicio: string | null; horaFim: string | null }, inicio: string, fim: string, horaInicio?: string | null, horaFim?: string | null) {
  const inicioAtual = dataSomente(atual.dataInicio);
  const fimAtual = dataSomente(atual.dataFim);
  if (inicioAtual > fim || fimAtual < inicio) return false;
  if (inicioAtual !== fimAtual || inicio !== fim) return true;
  return horario(horaInicio) < horario(atual.horaFim, '23:59') && horario(horaFim, '23:59') > horario(atual.horaInicio);
}

export async function verificarDisponibilidade(
  equipamentoIds: number[],
  dataInicio: string,
  dataFim?: string,
  locacaoIdExcluir?: number,
  horaInicio?: string | null,
  horaFim?: string | null
) {
  const dInicio = new Date(`${dataInicio}T00:00:00.000Z`);
  const dFim = new Date(`${dataFim || dataInicio}T23:59:59.999Z`);
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

  return conflitos.filter((locacao) => conflitoDeHorario(locacao, dataInicio, dataFim || dataInicio, horaInicio, horaFim));
}

export async function createLocacao(data: LocacaoInput, usuarioId?: number) {
  const equipamentoIds = data.itens.map((i: { equipamentoId: number }) => i.equipamentoId);
  const dataFim = data.dataFim || data.dataInicio;
  const conflitos = await verificarDisponibilidade(equipamentoIds, data.dataInicio, dataFim, undefined, data.horaInicio, data.horaFim);

  if (conflitos.length > 0) {
    const nomesEquipamentos = conflitos
      .flatMap((c) => c.itens.map((i) => i.equipamento?.descricao))
      .filter(Boolean)
      .join(', ');
    throw new Error(`Aparalho(s) jÃ¡ locado(s) nesta data: ${nomesEquipamentos}`);
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
        tecnicoId: data.tecnicoId ? Number(data.tecnicoId) : null,
        motoristaId: data.motoristaId ? Number(data.motoristaId) : null,
        criadoPorId: usuarioId || null,
      },
    });

    await tx.itemLocacao.createMany({
      data: itensParaCriar.map((item) => ({
        ...item,
        locacaoId: locacao.id,
        valoresDisparo: (data.itens.find((i: any) => i.equipamentoId === item.equipamentoId) as any)?.valoresDisparo || undefined,
      })),
    });

    if (data.pagamentos?.length) {
      await tx.pagamento.createMany({
        data: data.pagamentos.map((pagamento) => ({
          locacaoId: locacao.id,
          forma: pagamento.forma,
          valor: pagamento.valor,
          status: pagamento.status,
          vencimento: pagamento.vencimento ? new Date(pagamento.vencimento) : null,
          recebidoEm: pagamento.recebidoEm ? new Date(pagamento.recebidoEm) : null,
          observacoes: pagamento.observacoes || null,
        })),
      });
    }

    return locacao;
  });
}

export interface FiltrosLocacao {
  dataInicio?: string;
  dataFim?: string;
  clinicaId?: number;
  status?: string;
  busca?: string;
  equipamentoId?: number;
  tecnicoId?: number;
  motoristaId?: number;
}

export async function getLocacoes(filtros: FiltrosLocacao) {
  const where: any = {};

  if (filtros.dataInicio && filtros.dataFim) {
    where.dataInicio = {
      gte: new Date(`${filtros.dataInicio}T00:00:00.000Z`),
      lte: new Date(`${filtros.dataFim}T23:59:59.999Z`),
    };
  }

  if (filtros.clinicaId) {
    where.clinicaId = Number(filtros.clinicaId);
  }

  if (filtros.status) {
    where.status = filtros.status;
  }

  if (filtros.equipamentoId && Number.isInteger(filtros.equipamentoId)) {
    where.itens = { some: { equipamentoId: filtros.equipamentoId } };
  }

  if (filtros.tecnicoId && Number.isInteger(filtros.tecnicoId)) {
    where.tecnicoId = filtros.tecnicoId;
  }

  if (filtros.motoristaId && Number.isInteger(filtros.motoristaId)) {
    where.motoristaId = filtros.motoristaId;
  }

  const termoBusca = filtros.busca?.trim().slice(0, 120);
  if (termoBusca) {
    const codigo = Number(termoBusca);
    where.AND = [
      ...(where.AND || []),
      {
        OR: [
          {
            clinica: {
              is: {
                OR: [
                  { razaoSocial: { contains: termoBusca, mode: 'insensitive' } },
                  { nomeFantasia: { contains: termoBusca, mode: 'insensitive' } },
                  { cidade: { contains: termoBusca, mode: 'insensitive' } },
                ],
              },
            },
          },
          { cidadeLocacao: { contains: termoBusca, mode: 'insensitive' } },
          {
            itens: {
              some: {
                equipamento: {
                  is: { descricao: { contains: termoBusca, mode: 'insensitive' } },
                },
              },
            },
          },
          ...(Number.isInteger(codigo) ? [{ codigo }] : []),
        ],
      },
    ];
  }

  return await prisma.locacao.findMany({
    where,
    include: {
      clinica: true,
      tecnico: true,
      motorista: true,
      criadoPor: true,
      itens: {
        include: {
          equipamento: true,
        },
      },
      pagamentos: true,
    },
    orderBy: { dataInicio: 'asc' },
  });
}

export async function getLocacaoById(id: number) {
  return await prisma.locacao.findUnique({
    where: { id },
    include: {
      clinica: true,
      tecnico: true,
      motorista: true,
      itens: {
        include: {
          equipamento: true,
        },
      },
      pagamentos: true,
    },
  });
}

export async function updateLocacao(id: number, data: Partial<LocacaoInput>) {
  const locacaoAtual = await prisma.locacao.findUnique({ where: { id }, include: { itens: true } });
  if (!locacaoAtual) throw new Error('LocaÃ§Ã£o nÃ£o encontrada');

  const dataInicioValidar = data.dataInicio || dataSomente(locacaoAtual.dataInicio);
  const dataFimValidar = data.dataFim || dataInicioValidar;
  const equipamentoIdsValidar = data.itens?.map((item) => item.equipamentoId) || locacaoAtual.itens.map((item) => item.equipamentoId);
  const conflitos = await verificarDisponibilidade(equipamentoIdsValidar, dataInicioValidar, dataFimValidar, id, data.horaInicio ?? locacaoAtual.horaInicio, data.horaFim ?? locacaoAtual.horaFim);
  if (conflitos.length > 0) throw new Error('Existe conflito de aparelho no perÃ­odo e horÃ¡rio selecionados');

  const updateData: any = {};
  if (data.clinicaId !== undefined) updateData.clinicaId = data.clinicaId;
  if (data.dataInicio !== undefined) {
    updateData.dataInicio = new Date(data.dataInicio);
    updateData.dataFim = new Date(data.dataFim || data.dataInicio);
  }
  if (data.horaInicio !== undefined) updateData.horaInicio = data.horaInicio;
  if (data.horaFim !== undefined) updateData.horaFim = data.horaFim;
  if (data.enderecoLocacao !== undefined) updateData.enderecoLocacao = data.enderecoLocacao;
  if (data.cidadeLocacao !== undefined) updateData.cidadeLocacao = data.cidadeLocacao;
  if (data.valorDesconto !== undefined) updateData.valorDesconto = data.valorDesconto;
  if (data.observacoes !== undefined) updateData.observacoes = data.observacoes;
  if (data.status !== undefined) updateData.status = data.status;
  if (data.tecnicoId !== undefined) updateData.tecnicoId = data.tecnicoId ? Number(data.tecnicoId) : null;
  if (data.motoristaId !== undefined) updateData.motoristaId = data.motoristaId ? Number(data.motoristaId) : null;

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
          valoresDisparo: (item as any).valoresDisparo || undefined,
        };
      });
      await tx.itemLocacao.createMany({ data: novosItens });
      updateData.valorTotal = toNum(valorTotal);
      const vDesconto = toNum(new Decimal(data.valorDesconto !== undefined ? data.valorDesconto : locacaoAtual.valorDesconto));
      updateData.valorFinal = toNum(new Decimal(updateData.valorTotal).sub(new Decimal(vDesconto)));
    }

    if (data.pagamentos !== undefined) {
      await tx.pagamento.deleteMany({ where: { locacaoId: id } });
      if (data.pagamentos.length) {
        await tx.pagamento.createMany({
          data: data.pagamentos.map((pagamento) => ({
            locacaoId: id,
            forma: pagamento.forma,
            valor: pagamento.valor,
            status: pagamento.status,
            vencimento: pagamento.vencimento ? new Date(pagamento.vencimento) : null,
            recebidoEm: pagamento.recebidoEm ? new Date(pagamento.recebidoEm) : null,
            observacoes: pagamento.observacoes || null,
          })),
        });
      }
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

