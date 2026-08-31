import prisma from '../config/prisma';
import { ColaboradorInput } from '../dtos/colaborador';

export async function createColaborador(data: ColaboradorInput) {
  return await prisma.colaborador.create({
    data: {
      nome: data.nome || 'Colaborador sem nome',
      funcao: data.funcao || 'TECNICO',
      telefone: data.telefone || null,
      email: data.email || null,
      ativo: data.ativo !== undefined ? Boolean(data.ativo) : true,
    },
  });
}

export async function getColaboradores(filtros: { funcao?: string; search?: string }) {
  const where: any = {};
  if (filtros.funcao) where.funcao = filtros.funcao;
  if (filtros.search) where.nome = { contains: filtros.search };

  return await prisma.colaborador.findMany({
    where,
    orderBy: { nome: 'asc' },
  });
}

export async function updateColaborador(id: number, data: Partial<ColaboradorInput>) {
  const dataToUpdate: any = {};
  if (data.nome !== undefined) dataToUpdate.nome = data.nome;
  if (data.funcao !== undefined) dataToUpdate.funcao = data.funcao;
  if (data.telefone !== undefined) dataToUpdate.telefone = data.telefone;
  if (data.email !== undefined) dataToUpdate.email = data.email;
  if (data.ativo !== undefined) dataToUpdate.ativo = Boolean(data.ativo);

  return await prisma.colaborador.update({
    where: { id },
    data: dataToUpdate,
  });
}

export async function deleteColaborador(id: number) {
  return await prisma.colaborador.delete({ where: { id } });
}
