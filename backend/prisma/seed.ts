import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('ðŸŒ± Iniciando semeadura do banco de dados...');

  // Limpar banco (compatÃ­vel com SQLite)
  try {
    await prisma.itemLocacao.deleteMany();
    await prisma.locacao.deleteMany();
    await prisma.equipamento.deleteMany();
    await prisma.categoriaEquipamento.deleteMany();
    await prisma.clinica.deleteMany();
    await prisma.usuario.deleteMany();
  } catch (e) {
    console.log('Tabelas ainda nÃ£o existem, criando dados iniciais...');
  }

  // UsuÃ¡rios
  const senhaAdmin = process.env.SEED_ADMIN_PASSWORD;
  const senhaOperador = process.env.SEED_OPERADOR_PASSWORD;
  if (!senhaAdmin || senhaAdmin.length < 12 || !senhaOperador || senhaOperador.length < 12) {
    throw new Error('Defina SEED_ADMIN_PASSWORD e SEED_OPERADOR_PASSWORD fortes antes de executar a semeadura.');
  }
  const senhaHash = await bcrypt.hash(senhaAdmin, 12);
  const operadorHash = await bcrypt.hash(senhaOperador, 12);

  const admin = await prisma.usuario.create({
    data: {
      nome: 'Administrador',
      login: 'admin',
      senha: senhaHash,
      perfil: 'ADMIN',
    },
  });

  const operador = await prisma.usuario.create({
    data: {
      nome: 'Operador PadrÃ£o',
      login: 'operador',
      senha: operadorHash,
      perfil: 'OPERADOR',
    },
  });

  // Categorias de equipamentos
  const catEstetica = await prisma.categoriaEquipamento.create({
    data: {
      nome: 'EstÃ©tica Facial',
      descricao: 'Equipamentos para tratamentos estÃ©ticos faciais',
    },
  });

  const catFisio = await prisma.categoriaEquipamento.create({
    data: {
      nome: 'Fisioterapia',
      descricao: 'Aparelhos de eletroterapia e terapia manual',
    },
  });

  const catCorpo = await prisma.categoriaEquipamento.create({
    data: {
      nome: 'EstÃ©tica Corporal',
      descricao: 'Equipamentos para estÃ©tica e modelagem corporal',
    },
  });

  // Equipamentos
  const eq1 = await prisma.equipamento.create({
    data: {
      descricao: 'Microcorrente EstÃ©tica',
      modelo: 'MC-5000',
      marca: 'Canetti',
      numeroSerie: 'MC2024001',
      patrimonio: 'EQ-001',
      categoriaId: catEstetica.id,
      unidade: 'UN',
      valorDiaria: 150.00,
      valorSemanal: 900.00,
      valorMensal: 3000.00,
      status: 'DISPONIVEL',
    },
  });

  const eq2 = await prisma.equipamento.create({
    data: {
      descricao: 'TENS 4 Canais',
      modelo: 'TENS-400',
      marca: 'PhysioMed',
      numeroSerie: 'TENS2024001',
      patrimonio: 'EQ-002',
      categoriaId: catFisio.id,
      unidade: 'UN',
      valorDiaria: 80.00,
      valorSemanal: 480.00,
      valorMensal: 1600.00,
      status: 'DISPONIVEL',
    },
  });

  const eq3 = await prisma.equipamento.create({
    data: {
      descricao: 'RadiofrequÃªncia Corporal',
      modelo: 'RF-2000',
      marca: 'Canetti',
      numeroSerie: 'RF2024001',
      patrimonio: 'EQ-003',
      categoriaId: catCorpo.id,
      unidade: 'UN',
      valorDiaria: 200.00,
      valorSemanal: 1200.00,
      valorMensal: 4000.00,
      status: 'DISPONIVEL',
    },
  });

  const eq4 = await prisma.equipamento.create({
    data: {
      descricao: 'Ultrasom TerapÃªutico',
      modelo: 'US-1000',
      marca: 'PhysioMed',
      numeroSerie: 'US2024001',
      patrimonio: 'EQ-004',
      categoriaId: catFisio.id,
      unidade: 'UN',
      valorDiaria: 120.00,
      valorSemanal: 720.00,
      valorMensal: 2400.00,
      status: 'DISPONIVEL',
    },
  });

  // ClÃ­nicas
  const cli1 = await prisma.clinica.create({
    data: {
      razaoSocial: 'ClÃ­nica Renova EstÃ©tica',
      nomeFantasia: 'Renova EstÃ©tica',
      tipoPessoa: 'JURIDICA',
      cnpjCpf: '12.345.678/0001-90',
      ie: '123.456.789.012',
      email: 'contato@renova.com.br',
      telefone: '(11) 3456-7890',
      celular: '(11) 98765-4321',
      contato: 'Dra. Maria Silva',
      endereco: 'Av. Paulista, 1000',
      numero: '1000',
      complemento: 'Sala 301',
      bairro: 'Bela Vista',
      cidade: 'SÃ£o Paulo',
      uf: 'SP',
      cep: '01310-100',
      status: 'ATIVA',
      limiteCredito: 50000.00,
    },
  });

  const cli2 = await prisma.clinica.create({
    data: {
      razaoSocial: 'Centro de Fisioterapia Bem Estar',
      nomeFantasia: 'Bem Estar Fisio',
      tipoPessoa: 'JURIDICA',
      cnpjCpf: '98.765.432/0001-10',
      email: 'contato@bemestar.com.br',
      telefone: '(21) 3333-4444',
      celular: '(21) 99876-5432',
      contato: 'JoÃ£o Santos',
      endereco: 'Rua das Laranjeiras',
      numero: '250',
      bairro: 'Laranjeiras',
      cidade: 'Rio de Janeiro',
      uf: 'RJ',
      cep: '22240-003',
      status: 'ATIVA',
      limiteCredito: 30000.00,
    },
  });

  const cli3 = await prisma.clinica.create({
    data: {
      razaoSocial: 'Instituto Beleza Pura',
      nomeFantasia: 'Beleza Pura',
      tipoPessoa: 'JURIDICA',
      cnpjCpf: '11.222.333/0001-44',
      email: 'contato@belezapura.com.br',
      telefone: '(31) 3222-5555',
      celular: '(31) 99765-1234',
      contato: 'Ana Ferreira',
      endereco: 'Av. Afonso Pena',
      numero: '800',
      bairro: 'FuncionÃ¡rios',
      cidade: 'Belo Horizonte',
      uf: 'MG',
      cep: '30130-009',
      status: 'ATIVA',
      limiteCredito: 40000.00,
    },
  });

  const cli4 = await prisma.clinica.create({
    data: {
      razaoSocial: 'EspaÃ§o Vida EstÃ©tica',
      tipoPessoa: 'JURIDICA',
      cnpjCpf: '44.555.666/0001-77',
      status: 'BLOQUEADA',
      limiteCredito: 10000.00,
    },
  });

  // LocaÃ§Ãµes
  const loc1 = await prisma.locacao.create({
    data: {
      clinicaId: cli1.id,
      dataInicio: new Date('2026-08-25'),
      horaInicio: '08:00',
      dataFim: new Date('2026-09-25'),
      horaFim: '18:00',
      enderecoLocacao: 'Av. Paulista, 1000 â€” Sala 301',
      cidadeLocacao: 'SÃ£o Paulo',
      responsavel: 'Dra. Maria',
      telefoneResp: '(11) 98765-4321',
      valorTotal: 4500.00,
      valorDesconto: 500.00,
      valorFinal: 4000.00,
      status: 'EM_ANDAMENTO',
      criadoPorId: admin.id,
      itens: {
        create: {
          equipamentoId: eq1.id,
          valorDiaria: 150.00,
          quantidade: 1,
          valorTotal: 4500.00,
        },
      },
    },
  });

  const loc2 = await prisma.locacao.create({
    data: {
      clinicaId: cli2.id,
      dataInicio: new Date('2026-09-01'),
      horaInicio: '09:00',
      dataFim: new Date('2026-09-15'),
      horaFim: '18:00',
      enderecoLocacao: 'Rua das Laranjeiras, 250',
      cidadeLocacao: 'Rio de Janeiro',
      responsavel: 'JoÃ£o',
      telefoneResp: '(21) 99876-5432',
      valorTotal: 600.00,
      valorDesconto: 0,
      valorFinal: 600.00,
      status: 'CONFIRMADA',
      criadoPorId: admin.id,
      itens: {
        create: {
          equipamentoId: eq2.id,
          valorDiaria: 80.00,
          quantidade: 1,
          valorTotal: 600.00,
        },
      },
    },
  });

  const loc3 = await prisma.locacao.create({
    data: {
      clinicaId: cli1.id,
      dataInicio: new Date('2026-09-10'),
      horaInicio: '08:00',
      dataFim: new Date('2026-09-12'),
      horaFim: '18:00',
      enderecoLocacao: 'Rua das Flores, 123',
      cidadeLocacao: 'Campinas',
      responsavel: 'Dr. Roberto',
      valorTotal: 600.00,
      valorDesconto: 0,
      valorFinal: 600.00,
      status: 'AGENDADA',
      criadoPorId: admin.id,
      itens: {
        create: {
          equipamentoId: eq2.id,
          valorDiaria: 600.00,
          quantidade: 1,
          valorTotal: 600.00,
        },
      },
    },
  });

  console.log('âœ… Dados criados com sucesso!');
  console.log('   - 2 usuÃ¡rios (admin / operador)');
  console.log('   - 3 categorias de equipamentos');
  console.log('   - 4 equipamentos');
  console.log('   - 4 clÃ­nicas');
  console.log('   - 3 locaÃ§Ãµes');
}

main()
  .catch((e) => {
    console.error('âŒ Erro na semeadura:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

