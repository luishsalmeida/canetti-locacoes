import prisma from '../config/prisma';
import { EquipamentoInput } from '../dtos/equipamento';

function toNum(val: any, defaultVal = 0): number {
  if (val === undefined || val === null || val === '') return defaultVal;
  const n = Number(val);
  return isNaN(n) ? defaultVal : n;
}

function toStrOrNull(val: any): string | null {
  if (val === undefined || val === null || val === '') return null;
  return String(val);
}

export async function createEquipamento(data: EquipamentoInput) {
  let catId = toNum(data.categoriaId, 0);
  if (!catId) {
    let cat = await prisma.categoriaEquipamento.findFirst();
    if (!cat) {
      cat = await prisma.categoriaEquipamento.create({ data: { nome: 'Geral' } });
    }
    catId = cat.id;
  }

  return await prisma.equipamento.create({
    data: {
      descricao: toStrOrNull(data.descricao) || 'Aparelho sem nome',
      modelo: toStrOrNull(data.modelo),
      marca: toStrOrNull(data.marca),
      numeroSerie: toStrOrNull(data.numeroSerie),
      patrimonio: toStrOrNull(data.patrimonio),
      categoriaId: catId,
      unidade: toStrOrNull(data.unidade) || 'UN',
      valorDiaria: toNum(data.valorDiaria, 0),
      valorSemanal: toNum(data.valorSemanal, 0),
      valorMensal: toNum(data.valorMensal, 0),
      observacoes: toStrOrNull(data.observacoes),
      status: toStrOrNull(data.status) || 'DISPONIVEL',
    },
  });
}

export async function getEquipamentos(filtros: { status?: string; search?: string; categoriaId?: number }) {
  const where: any = {};
  if (filtros.status) where.status = filtros.status;
  if (filtros.categoriaId) where.categoriaId = Number(filtros.categoriaId);
  if (filtros.search) {
    where.OR = [{ descricao: { contains: filtros.search } }];
  }

  return await prisma.equipamento.findMany({
    where,
    include: { categoria: true },
    orderBy: { descricao: 'asc' },
  });
}

export async function getEquipamentoById(id: number) {
  return await prisma.equipamento.findUnique({
    where: { id },
    include: { categoria: true },
  });
}

export async function updateEquipamento(id: number, data: Partial<EquipamentoInput>) {
  const dataToUpdate: any = {};
  if (data.descricao !== undefined) dataToUpdate.descricao = toStrOrNull(data.descricao);
  if (data.modelo !== undefined) dataToUpdate.modelo = toStrOrNull(data.modelo);
  if (data.marca !== undefined) dataToUpdate.marca = toStrOrNull(data.marca);
  if (data.numeroSerie !== undefined) dataToUpdate.numeroSerie = toStrOrNull(data.numeroSerie);
  if (data.patrimonio !== undefined) dataToUpdate.patrimonio = toStrOrNull(data.patrimonio);
  if (data.categoriaId !== undefined && data.categoriaId !== '') dataToUpdate.categoriaId = toNum(data.categoriaId);
  if (data.unidade !== undefined) dataToUpdate.unidade = toStrOrNull(data.unidade) || 'UN';
  if (data.valorDiaria !== undefined) dataToUpdate.valorDiaria = toNum(data.valorDiaria);
  if (data.valorSemanal !== undefined) dataToUpdate.valorSemanal = toNum(data.valorSemanal);
  if (data.valorMensal !== undefined) dataToUpdate.valorMensal = toNum(data.valorMensal);
  if (data.status !== undefined) dataToUpdate.status = toStrOrNull(data.status) || 'DISPONIVEL';
  if (data.observacoes !== undefined) dataToUpdate.observacoes = toStrOrNull(data.observacoes);

  return await prisma.equipamento.update({
    where: { id },
    data: dataToUpdate,
  });
}

export async function deleteEquipamento(id: number) {
  return await prisma.equipamento.delete({ where: { id } });
}
