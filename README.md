# Canetti Locações — Sistema de Gestão de Equipamentos Clínicos

## Visão Geral

O **Canetti Locações** é um sistema moderno, seguro e escalável para gestão de locação de equipamentos médicos e estéticos. Ele substitui o legado WinAdm com uma arquitetura web baseada em **React + Vite + TypeScript** no frontend e **Node.js + Express + Prisma + Firebird** no backend.

O sistema oferece:

- **Agenda Inteligente**: Visualização diária, semanal e mensal de locações
- **Cadastro de Clínicas**: Gerenciamento completo de clientes parceiros
- **Cadastro de Aparelhos**: Controle do parque de equipamentos
- **Faturamento e Relatórios**: Métricas financeiras e operacionais
- **Autenticação Segura**: JWT + bcrypt
- **Validação Robusta**: Zod + React Hook Form

## Estrutura do Projeto

```bash
canetti-novo/
├── backend/          # API REST (Node.js + Express + Prisma)
│   ├── src/
│   │   ├── config/       # Configurações (Prisma, JWT)
│   │   ├── controllers/   # Controladores REST
│   │   ├── dtos/          # Validação com Zod
│   │   ├── middleware/    # Autenticação e erros
│   │   ├── routes/        # Definição de rotas
│   │   ├── services/      # Regras de negócio
│   │   └── server.ts      # Entrada da API
│   ├── prisma/
│   │   ├── schema.prisma  # Esquema do banco (Firebird)
│   │   └── seed.ts        # Dados iniciais
│   └── package.json
│
└── frontend/         # SPA (React + Vite + Tailwind)
    ├── public/        # Assets estáticos
    ├── src/
    │   ├── components/  # Componentes reutilizáveis (Button, Input, Modal)
    │   ├── context/     # Gerenciamento de estado (AuthContext)
    │   ├── pages/       # Telas principais (Agenda, Clínicas, Aparelhos, Relatórios)
    │   ├── services/    # Chamadas API
    │   ├── types/       # Tipagens TypeScript
    │   ├── App.tsx      # Roteamento e layout
    │   └── main.tsx     # Entrada React
    ├── index.html
    ├── vite.config.ts
    └── package.json
```

## Tecnologias Utilizadas

### Backend
- **Node.js 20+**
- **Express** (framework web)
- **Prisma ORM** (acesso ao Firebird)
- **Zod** (validação de dados)
- **JWT + bcrypt** (autenticação)
- **Helmet + CORS** (segurança)

### Frontend
- **React 18** + **TypeScript**
- **Vite** (build rápido)
- **Tailwind CSS** (estilização)
- **Lucide Icons** (ícones)
- **React Hook Form** (formulários)
- **date-fns** (manipulação de datas)

### Banco de Dados
- **Firebird 3.0+** (compatível com esquema legado)

## Pré-requisitos

- Node.js 20 ou superior
- npm ou yarn
- Firebird 3.0 ou superior
- Git

## Instalação e Configuração

### 1. Clonar o Repositório

```bash
# Clone o projeto
git clone https://github.com/seu-repo/canetti-novo.git
cd canetti-novo
```

### 2. Configurar Backend

```bash
cd backend

# Instalar dependências
npm install

# Criar arquivo .env (copiar de .env.example)
cp .env.example .env

# Editar .env com suas configurações
nano .env

# Gerar cliente Prisma
npx prisma generate

# Rodar migrações (se necessário)
npx prisma migrate dev

# Semeadura do banco (opcional)
npx prisma db seed

# Iniciar servidor de desenvolvimento
npm run dev
```

### 3. Configurar Frontend

```bash
cd ../frontend

# Instalar dependências
npm install

# Criar arquivo .env (copiar de .env.example)
cp .env.example .env

# Editar .env com URL da API
nano .env

# Iniciar servidor de desenvolvimento
npm run dev
```

### 4. Acessar o Sistema

Abra o navegador em: http://localhost:5173

Usuário padrão: `admin` / Senha: `admin123`

## Configuração do Banco de Dados Firebird

### 1. Instalar Firebird

- **Windows**: Baixe o instalador em https://firebirdsql.org/
- **Linux**: `sudo apt-get install firebird3.0-server firebird3.0-utils`

### 2. Criar Banco de Dados

```bash
# Criar banco (substitua caminho e credenciais)
isqlf -u SYSDBA -p masterkey -i /caminho/para/create_database.sql
```

### 3. Configurar Conexão no Prisma

Edite `backend/prisma/schema.prisma`:

```prisma
datasource db {
  provider = "firebird"
  url      = "env(DATABASE_URL)"
}
```

E defina no `.env`:

```env
DATABASE_URL="firebird://SYSDBA:masterkey@localhost:3050/caminho/para/CANETTI.FDB"
```

## Variáveis de Ambiente

### Backend (.env)

```env
PORT=3333
DATABASE_URL="firebird://SYSDBA:masterkey@localhost:3050/caminho/para/CANETTI.FDB"
JWT_SECRET="sua_chave_secreta_aqui_32_caracteres_minimo"
JWT_EXPIRES_IN="8h"
FRONTEND_URL="http://localhost:5173"
```

### Frontend (.env)

```env
VITE_API_URL="http://localhost:3333/api"
```

## Scripts Disponíveis

### Backend

```bash
npm run dev          # Inicia servidor em modo desenvolvimento
npm run build        # Compila TypeScript
npm run start        # Inicia servidor em produção
npm run prisma:generate  # Gera cliente Prisma
npm run prisma:migrate  # Aplica migrações
npm run prisma:studio   # Interface gráfica para o banco
npm run db:seed        # Semeia dados iniciais
```

### Frontend

```bash
npm run dev          # Inicia servidor de desenvolvimento
npm run build        # Compila para produção
npm run preview      # Visualiza build de produção
```

## API REST

### Autenticação

- **POST** `/api/auth/login` — Login de usuário
- **GET** `/api/auth/me` — Dados do usuário autenticado

### Clínicas

- **GET** `/api/clinicas` — Lista de clínicas
- **GET** `/api/clinicas/:id` — Detalhes de uma clínica
- **POST** `/api/clinicas` — Criar clínica
- **PUT** `/api/clinicas/:id` — Atualizar clínica
- **DELETE** `/api/clinicas/:id` — Deletar clínica

### Equipamentos

- **GET** `/api/equipamentos` — Lista de equipamentos
- **GET** `/api/equipamentos/:id` — Detalhes de um equipamento
- **POST** `/api/equipamentos` — Criar equipamento
- **PUT** `/api/equipamentos/:id` — Atualizar equipamento
- **DELETE** `/api/equipamentos/:id` — Deletar equipamento

### Locações (Agenda)

- **GET** `/api/locacoes` — Lista de locações
- **GET** `/api/locacoes/:id` — Detalhes de uma locação
- **POST** `/api/locacoes` — Criar locação
- **PUT** `/api/locacoes/:id` — Atualizar locação
- **DELETE** `/api/locacoes/:id` — Deletar locação
- **POST** `/api/locacoes/verificar-disponibilidade` — Verificar disponibilidade de equipamentos

## Funcionalidades Principais

### Agenda

- Visualização em calendário mensal
- Filtros por data e status
- Criação e edição de locações
- Verificação de disponibilidade de equipamentos
- Status: Agendada, Confirmada, Em Andamento, Concluída, Cancelada, No Show

### Cadastro de Clínicas

- Razão Social e Nome Fantasia
- CNPJ/CPF e Inscrição Estadual
- Contatos (email, telefone, celular)
- Endereço completo
- Status (Ativa, Bloqueada, Inadimplente)
- Limite de crédito

### Cadastro de Aparelhos

- Descrição, Modelo, Marca
- Número de Série e Patrimônio
- Categoria (Estética, Fisioterapia, etc.)
- Valores de locação (Diária, Semanal, Mensal)
- Status (Disponível, Locado, Manutenção, Inativo)

### Relatórios

- Faturamento líquido por período
- Volume de locações
- Descontos concedidos
- Lista detalhada de locações com valores
- Exportação para CSV (em breve)

## Segurança

- **Autenticação JWT**: Tokens com expiração configurável
- **Senhas Hash**: bcrypt com salt
- **Validação de Dados**: Zod para entrada segura
- **CORS**: Restrito ao frontend configurado
- **Helmet**: Headers de segurança HTTP
- **Express Async Errors**: Tratamento centralizado de erros

## Validação e Tratamento de Erros

O sistema utiliza **Zod** para validação de entrada e **express-async-errors** para tratamento centralizado:

```typescript
// Exemplo de validação com Zod
const clinicaSchema = z.object({
  razaoSocial: z.string().min(3).max(150),
  nomeFantasia: z.string().min(3).max(150).optional(),
  tipoPessoa: z.enum(['FISICA', 'JURIDICA']),
  // ... outros campos
});
```

## Testes

### Testes Manuais Recomendados

1. **Login**: Autenticação com credenciais válidas/inválidas
2. **Agenda**: Criar, editar, cancelar locação
3. **Cadastro de Clínicas**: Criar, editar, deletar clínica
4. **Cadastro de Aparelhos**: Criar, editar, deletar equipamento
5. **Relatórios**: Filtrar por período e visualizar métricas

### Testes de Integração

```bash
# Testar conexão com banco
npx prisma studio

# Testar API com curl
curl -X POST http://localhost:3333/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"login":"admin","senha":"admin123"}'
```

## Deploy

### Produção

```bash
# Backend
cd backend
npm run build
npm run start

# Frontend
cd frontend
npm run build
# Servir arquivos estáticos (ex: nginx, vercel, netlify)
```

### Docker (em breve)

```bash
# Construir imagens
docker-compose build

# Iniciar serviços
docker-compose up
```

## Migração do WinAdm

### Dados Migrados

- Clínicas (tbCli)
- Equipamentos (tbEquip)
- Locações (tbLocacao)
- Itens de Locação (tbLocacaoItens)
- Usuários (tbUsuarios)

### Estratégia

1. Exportar dados do Firebird legado
2. Ajustar esquema para compatibilidade
3. Importar via Prisma seed
4. Validar consistência

## Suporte e Manutenção

- **Documentação**: Este README
- **Issues**: GitHub Issues
- **Contato**: suporte@canetti.com.br

## Licença

MIT License — © 2026 Canetti Locações

## Próximos Passos

- [ ] Integração com pagamentos (Mercado Pago, PagSeguro)
- [ ] Notificações por email/SMS
- [ ] Dashboard analítico avançado
- [ ] Mobile app (React Native)
- [ ] Multi-tenancy

---

**Canetti Locações** — Gestão Inteligente de Equipamentos Clínicos
