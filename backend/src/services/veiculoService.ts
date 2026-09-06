import prisma from '../config/prisma';
import { VeiculoInput } from '../dtos/veiculo';

export async function getVeiculo(colaboradorId: number) {
  return prisma.veiculo.findUnique({ where: { colaboradorId } });
}

export async function salvarVeiculo(colaboradorId: number, dados: VeiculoInput) {
  const colaborador = await prisma.colaborador.findUnique({ where: { id: colaboradorId } });
  if (!colaborador || colaborador.funcao !== 'MOTORISTA') {
    throw new Error('Motorista não encontrado.');
  }
  return prisma.veiculo.upsert({
    where: { colaboradorId },
    create: { colaboradorId, ...dados },
    update: dados,
  });
}
