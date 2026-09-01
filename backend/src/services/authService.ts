import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../config/prisma';
import { LoginInput } from '../dtos/auth';

export async function loginService(data: LoginInput) {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret || jwtSecret.length < 32) {
    throw new Error('ConfiguraÃ§Ã£o de seguranÃ§a incompleta: JWT_SECRET invÃ¡lido');
  }
  const usuario = await prisma.usuario.findFirst({
    where: { login: data.login, ativo: true },
  });

  if (!usuario) {
    throw new Error('UsuÃ¡rio nÃ£o encontrado ou inativo');
  }

  const senhaValida = await bcrypt.compare(data.senha, usuario.senha);
  if (!senhaValida) {
    throw new Error('Senha incorreta');
  }

  const token = jwt.sign(
    { id: usuario.id, login: usuario.login, perfil: usuario.perfil },
    jwtSecret,
    { expiresIn: (process.env.JWT_EXPIRES_IN || '8h') as any }
  );

  return {
    usuario: {
      id: usuario.id,
      nome: usuario.nome,
      login: usuario.login,
      perfil: usuario.perfil,
    },
    token,
  };
}

