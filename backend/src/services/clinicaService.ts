import prisma from '../config/prisma';
import { ClinicaInput } from '../dtos/clinica';

function toNum(val: any, defaultVal = 0): number {
  if (val === undefined || val === null || val === '') return defaultVal;
  const n = Number(val);
  return isNaN(n) ? defaultVal : n;
}

function toStrOrNull(val: any): string | null {
  if (val === undefined || val === null || val === '') return null;
  return String(val);
}

export async function createClinica(data: ClinicaInput) {
  return await prisma.clinica.create({
    data: {
      razaoSocial: toStrOrNull(data.razaoSocial) || 'Clínica sem nome',
      nomeFantasia: toStrOrNull(data.nomeFantasia),
      tipoPessoa: toStrOrNull(data.tipoPessoa) || 'JURIDICA',
      cnpjCpf: toStrOrNull(data.cnpjCpf),
      ie: toStrOrNull(data.ie),
      email: toStrOrNull(data.email),
      telefone: toStrOrNull(data.telefone),
      celular: toStrOrNull(data.celular),
      contato: toStrOrNull(data.contato),
      endereco: toStrOrNull(data.endereco),
      numero: toStrOrNull(data.numero),
      complemento: toStrOrNull(data.complemento),
      bairro: toStrOrNull(data.bairro),
      cidade: toStrOrNull(data.cidade),
      uf: toStrOrNull(data.uf),
      cep: toStrOrNull(data.cep),
      regiao: toStrOrNull(data.regiao),
      observacoes: toStrOrNull(data.observacoes),
      status: toStrOrNull(data.status) || 'ATIVA',
      limiteCredito: toNum(data.limiteCredito, 0),
      saldoCredor: toNum(data.saldoCredor, 0),
    },
  });
}

export async function getClinicas(filtros: { cidade?: string; status?: string; search?: string }) {
  const where: any = {};
  if (filtros.cidade) where.cidade = { contains: filtros.cidade };
  if (filtros.status) where.status = filtros.status;
  if (filtros.search) {
    where.OR = [
      { razaoSocial: { contains: filtros.search } },
      { nomeFantasia: { contains: filtros.search } },
      { cnpjCpf: { contains: filtros.search } },
      { cidade: { contains: filtros.search } },
    ];
  }

  return await prisma.clinica.findMany({
    where,
    orderBy: { razaoSocial: 'asc' },
  });
}

export async function getClinicaById(id: number) {
  const clinica = await prisma.clinica.findUnique({ where: { id } });
  if (!clinica) throw new Error('Clínica não encontrada');
  return clinica;
}

export async function updateClinica(id: number, data: Partial<ClinicaInput>) {
  const dataToUpdate: any = {};
  if (data.razaoSocial !== undefined) dataToUpdate.razaoSocial = toStrOrNull(data.razaoSocial) || 'Clínica sem nome';
  if (data.nomeFantasia !== undefined) dataToUpdate.nomeFantasia = toStrOrNull(data.nomeFantasia);
  if (data.tipoPessoa !== undefined) dataToUpdate.tipoPessoa = toStrOrNull(data.tipoPessoa) || 'JURIDICA';
  if (data.cnpjCpf !== undefined) dataToUpdate.cnpjCpf = toStrOrNull(data.cnpjCpf);
  if (data.ie !== undefined) dataToUpdate.ie = toStrOrNull(data.ie);
  if (data.email !== undefined) dataToUpdate.email = toStrOrNull(data.email);
  if (data.telefone !== undefined) dataToUpdate.telefone = toStrOrNull(data.telefone);
  if (data.celular !== undefined) dataToUpdate.celular = toStrOrNull(data.celular);
  if (data.contato !== undefined) dataToUpdate.contato = toStrOrNull(data.contato);
  if (data.endereco !== undefined) dataToUpdate.endereco = toStrOrNull(data.endereco);
  if (data.numero !== undefined) dataToUpdate.numero = toStrOrNull(data.numero);
  if (data.complemento !== undefined) dataToUpdate.complemento = toStrOrNull(data.complemento);
  if (data.bairro !== undefined) dataToUpdate.bairro = toStrOrNull(data.bairro);
  if (data.cidade !== undefined) dataToUpdate.cidade = toStrOrNull(data.cidade);
  if (data.uf !== undefined) dataToUpdate.uf = toStrOrNull(data.uf);
  if (data.cep !== undefined) dataToUpdate.cep = toStrOrNull(data.cep);
  if (data.regiao !== undefined) dataToUpdate.regiao = toStrOrNull(data.regiao);
  if (data.observacoes !== undefined) dataToUpdate.observacoes = toStrOrNull(data.observacoes);
  if (data.status !== undefined) dataToUpdate.status = toStrOrNull(data.status) || 'ATIVA';
  if (data.limiteCredito !== undefined) dataToUpdate.limiteCredito = toNum(data.limiteCredito, 0);
  if (data.saldoCredor !== undefined) dataToUpdate.saldoCredor = toNum(data.saldoCredor, 0);

  return await prisma.clinica.update({
    where: { id },
    data: dataToUpdate,
  });
}

export async function deleteClinica(id: number) {
  return await prisma.clinica.delete({ where: { id } });
}
