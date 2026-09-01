import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import 'express-async-errors';
import dotenv from 'dotenv';
import prisma from './config/prisma';
import routes from './routes';
import { handleError, notFound } from './middleware/errorHandler';
import path from 'path';
import fs from 'fs';

dotenv.config();

const app: Application = express();

app.use(helmet({
  contentSecurityPolicy: false,
}));
const allowedOrigins = (process.env.CORS_ORIGIN || '').split(',').map((origin) => origin.trim()).filter(Boolean);
if (allowedOrigins.length > 0) {
  app.use(cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error('Origem nÃ£o permitida pelo CORS'));
    },
  }));
}
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
  console.log('ðŸ“ Servindo frontend estÃ¡tico de:', frontendDistPath);
} else {
  console.warn('âš ï¸ Pasta frontend/dist nÃ£o encontrada. Execute npm run build no frontend.');
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
            { nome: 'EstÃ©tica Facial', descricao: 'Equipamentos para tratamentos faciais' },
            { nome: 'Fisioterapia', descricao: 'Aparelhos de eletroterapia e reabilitaÃ§Ã£o' },
            { nome: 'EstÃ©tica Corporal', descricao: 'Equipamentos para modelagem e corporal' },
          ],
        });
      }
      return;
    }

    const loginInicial = process.env.INITIAL_ADMIN_LOGIN;
    const senhaInicial = process.env.INITIAL_ADMIN_PASSWORD;
    if (!loginInicial || !senhaInicial || senhaInicial.length < 12) {
      throw new Error('Banco sem usuÃ¡rio. Defina INITIAL_ADMIN_LOGIN e INITIAL_ADMIN_PASSWORD forte antes da primeira inicializaÃ§Ã£o.');
    }
    const bcrypt = await import('bcryptjs');
    const hashedPassword = await bcrypt.default.hash(senhaInicial, 12);
    await prisma.usuario.create({ data: { nome: 'Administrador', login: loginInicial, senha: hashedPassword, perfil: 'ADMIN' } });

    await prisma.categoriaEquipamento.createMany({
      data: [
        { nome: 'EstÃ©tica Facial', descricao: 'Equipamentos para tratamentos faciais' },
        { nome: 'Fisioterapia', descricao: 'Aparelhos de eletroterapia e reabilitaÃ§Ã£o' },
        { nome: 'EstÃ©tica Corporal', descricao: 'Equipamentos para modelagem e corporal' },
      ],
    });

    console.log('ðŸ”‘ UsuÃ¡rio admin e categorias padrÃ£o criadas com sucesso!');
  } catch (e) {
    console.log('Seed database notice:', e);
  }
}

async function startServer() {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET deve ter pelo menos 32 caracteres.');
  }
  try {
    await prisma.$executeRawUnsafe('SELECT 1');
    console.log('ðŸ“¦ ConexÃ£o com banco estabelecida.');
  } catch {
    console.log('âš ï¸ Primeira execuÃ§Ã£o â€” criando estrutura do banco...');
  }

  await seedDatabase();

  const PORT = process.env.PORT || 3333;
  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`ðŸš€ Servidor Canetti rodando em http://localhost:${PORT}`);
  });
}

startServer().catch((e) => {
  console.error('âŒ Erro ao iniciar servidor:', e);
  process.exit(1);
});

