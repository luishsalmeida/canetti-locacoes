import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import 'express-async-errors';
import dotenv from 'dotenv';
import prisma from './config/prisma';
import routes from './routes';
import { handleError, notFound } from './middleware/errorHandler';
import bcrypt from 'bcryptjs';
import path from 'path';
import fs from 'fs';

dotenv.config();

const app: Application = express();

app.use(helmet({
  contentSecurityPolicy: false,
}));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api', routes);

// Resolve o frontend compilado a partir de backend/dist em qualquer ambiente.
const frontendDistPath = path.resolve(__dirname, '../../frontend/dist');

if (fs.existsSync(frontendDistPath)) {
  app.use(express.static(frontendDistPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendDistPath, 'index.html'));
  });
  console.log('📁 Servindo frontend estático de:', frontendDistPath);
} else {
  console.warn('⚠️ Pasta frontend/dist não encontrada. Execute npm run build no frontend.');
}

// Tratamento de erros
app.use(notFound);
app.use(handleError);

async function seedDatabase() {
  try {
    const existingUser = await prisma.usuario.findFirst();
    if (existingUser) {
      const catCount = await prisma.categoriaEquipamento.count();
      if (catCount === 0) {
        await prisma.categoriaEquipamento.createMany({
          data: [
            { nome: 'Estética Facial', descricao: 'Equipamentos para tratamentos faciais' },
            { nome: 'Fisioterapia', descricao: 'Aparelhos de eletroterapia e reabilitação' },
            { nome: 'Estética Corporal', descricao: 'Equipamentos para modelagem e corporal' },
          ],
        });
      }
      return;
    }

    const hashedPassword = await bcrypt.hash('admin123', 10);
    await prisma.usuario.create({
      data: {
        nome: 'Administrador',
        login: 'admin',
        senha: hashedPassword,
        perfil: 'ADMIN',
      },
    });

    await prisma.categoriaEquipamento.createMany({
      data: [
        { nome: 'Estética Facial', descricao: 'Equipamentos para tratamentos faciais' },
        { nome: 'Fisioterapia', descricao: 'Aparelhos de eletroterapia e reabilitação' },
        { nome: 'Estética Corporal', descricao: 'Equipamentos para modelagem e corporal' },
      ],
    });

    console.log('🔑 Usuário admin e categorias padrão criadas com sucesso!');
  } catch (e) {
    console.log('Seed database notice:', e);
  }
}

async function startServer() {
  try {
    await prisma.$executeRawUnsafe('SELECT 1');
    console.log('📦 Conexão com banco estabelecida.');
  } catch {
    console.log('⚠️ Primeira execução — criando estrutura do banco...');
  }

  await seedDatabase();

  const PORT = process.env.PORT || 3333;
  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`🚀 Servidor Canetti rodando em http://localhost:${PORT}`);
  });
}

startServer().catch((e) => {
  console.error('❌ Erro ao iniciar servidor:', e);
  process.exit(1);
});
