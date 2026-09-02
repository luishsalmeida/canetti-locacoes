import bcrypt from 'bcryptjs';
import prisma from '../config/prisma';
import { AcessoColaboradorInput } from '../dtos/usuario';

export async function criarAcessoColaborador(data: AcessoColaboradorInput) {
  const colaborador = await prisma.colaborador.findFirst({
    where: { id: data.colaboradorId, ativo: true },
    include: { usuarioAcesso: true },
  });

  if (!colaborador) throw new Error('Colaborador não encontrado ou inativo');
  if (colaborador.usuarioAcesso) throw new Error('Este colaborador já possui um acesso criado');

  const senha = await bcrypt.hash(data.senha, 12);
  return prisma.usuario.create({
    data: {
      nome: colaborador.nome,
      login: data.login,
      senha,
      perfil: 'COLABORADOR',
      colaboradorId: colaborador.id,
    },
    select: { id: true, nome: true, login: true, perfil: true, ativo: true, colaboradorId: true },
  });
}
