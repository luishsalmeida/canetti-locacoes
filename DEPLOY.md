# Guia de Deploy Gratuito no Render.com (24/7)

Este guia explica como colocar o seu sistema **Canetti Locações** rodando na nuvem 24 horas por dia, acessível por qualquer computador ou celular através de um link público e permanente (ex: `https://canetti-locacoes.onrender.com`), sem precisar deixar seu PC ligado.

---

## Pré-requisitos
1. Uma conta gratuita no **GitHub** (https://github.com)
2. Uma conta gratuita no **Render.com** (https://render.com) — você pode entrar direto com sua conta do GitHub.

---

## Passo a Passo para o Deploy

### 1. Enviar o código para o GitHub
Se você ainda não tem um repositório no GitHub para o projeto:
1. Crie um novo repositório público ou privado no seu GitHub (ex: `canetti-locacoes`).
2. Abra o PowerShell na pasta do projeto e envie os arquivos:
   ```powershell
   cd "C:\Users\luish\OneDrive\Área de Trabalho\Canetti\canetti-novo"
   git init
   git add .
   git commit -m "Deploy inicial Canetti v2.0"
   git branch -M main
   git remote add origin https://github.com/SEU_USUARIO/canetti-locacoes.git
   git push -u origin main
   ```

### 2. Conectar o Render ao GitHub
1. Acesse [dashboard.render.com](https://dashboard.render.com).
2. Clique em **New** ➔ **Blueprint**.
3. Conecte sua conta do GitHub e selecione o repositório `canetti-locacoes`.
4. O Render vai ler automaticamente o arquivo `render.yaml` que criamos, configurando:
   - Um banco de dados **PostgreSQL** gratuito.
   - Um serviço Web **Node.js** gratuito que compila o frontend e o backend juntos.

### 3. Concluir o Deploy
1. Clique em **Apply**.
2. O Render fará o build automaticamente (instala dependências, compila o React e o TypeScript, e executa as migrações do banco de dados).
3. Após alguns minutos, o status ficará verde (**Live**).

### 4. Acessar o Sistema
O Render fornecerá um link oficial para o seu sistema (ex: `https://canetti-locacoes.onrender.com`).
Basta clicar no link ou abri-lo no navegador do seu **celular** de qualquer lugar com internet!

- **Login padrão**: `admin` / `senha`: `admin123`
