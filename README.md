# 📋 Registro de Backup

[![CI Pipeline](https://github.com/Ribasjoao/Registro-de-backup/actions/workflows/ci.yml/badge.svg)](https://github.com/Ribasjoao/Registro-de-backup/actions/workflows/ci.yml)

Plataforma dedicada ao registro e monitoramento diário de backups, desenvolvida para facilitar o controle de integridade e a rotina de verificação de sistemas.

---

## 🚀 Sobre o Projeto
Este projeto tem como objetivo centralizar o log de backups realizados, permitindo uma visualização rápida do status das rotinas de backup. Ideal para equipes de TI e Analistas de Redes que buscam automatizar ou organizar melhor o checklist diário de conformidade.

---

## 🛠️ Tecnologias Utilizadas
- **Linguagem**: TypeScript (Node 20)
- **Framework/Stack**: React 18, Vite, @dnd-kit (Drag and Drop), motion/react (Animações)
- **Backend/Banco**: Firebase (Authentication & Firestore Database)
- **Estilização**: Tailwind CSS e Lucide React (Ícones)
- **Qualidade & Testes**: Vitest, React Testing Library, ESLint, Coverage v8
- **CI/CD & Hosting**: GitHub Actions, Vercel

---

## 🔄 Pipeline de CI/CD (GitHub Actions + Vercel)

O projeto conta com uma esteira automatizada de Integração Contínua (CI) e Entrega Contínua (CD) configurada via **GitHub Actions**:

```
[ Push / Pull Request ]
           │
           ▼
  1. Lint (ESLint)
           │
           ▼
2. Type-Check (tsc)
           │
           ▼
3. Testes & Coverage (Vitest)
           │
           ▼
4. Build de Produção (Vite)
           │
           ▼ (Apenas em push na branch 'main')
5. Deploy Automático em Produção (Vercel)
```

### 1. Workflow de CI (`.github/workflows/ci.yml`)
Roda em todo **push** para a branch `main` e em todos os **Pull Requests**:
- **Lint**: Executa o ESLint para verificar padrões de código e qualidade (`npm run lint`).
- **Type-Check**: Valida os tipos TypeScript sem compilar arquivos (`npm run type-check`).
- **Test**: Executa a suíte de testes unitários e de integração gerando relatório de cobertura e armazenando como artifact (`npm run test:coverage`).
- **Build**: Compila a aplicação para validar se o pacote de produção é gerado com sucesso (`npm run build`).

### 2. Workflow de Deploy (`.github/workflows/deploy.yml`)
Roda **exclusivamente na branch `main`** e **apenas se o pipeline de CI for concluído com sucesso**:
- Dispara a publicação do projeto na **Vercel** com a flag `--prod`.

---

## 🔑 Como Configurar os Secrets da Vercel no GitHub

Para habilitar o deploy automático na Vercel via GitHub Actions:

1. **Obter as credenciais da Vercel**:
   - **`VERCEL_TOKEN`**: Acesse sua conta na Vercel em [Account Settings → Tokens](https://vercel.com/account/tokens) e crie um novo Personal Access Token.
   - **`VERCEL_ORG_ID`**: Encontrado no arquivo `.vercel/project.json` da sua máquina após rodar `vercel link`, ou no painel de configurações da equipe/conta na Vercel.
   - **`VERCEL_PROJECT_ID`**: Encontrado nas configurações do seu projeto na Vercel (**Project Settings → General → Project ID**).

2. **Cadastrar no GitHub**:
   - No seu repositório no GitHub, acesse **Settings** → **Secrets and variables** → **Actions**.
   - Clique em **New repository secret** e cadastre cada uma das variáveis:
     - Secret: `VERCEL_TOKEN`
     - Secret: `VERCEL_ORG_ID`
     - Secret: `VERCEL_PROJECT_ID`

3. **Branch Protection Rules**:
   - Para garantir a estabilidade do ambiente de produção, consulte as instruções completas em [docs/branch-protection.md](docs/branch-protection.md).

---

## ⚙️ Como Instalar e Rodar Localmente

### Pré-requisitos:
- Node.js (v20+ recomendado)
- Gerenciador de pacotes (npm)

### Passo a passo:

1. **Clone o repositório**:
   ```bash
   git clone https://github.com/Ribasjoao/Registro-de-backup.git
   cd Registro-de-backup
   ```

2. **Instale as dependências**:
   ```bash
   npm install
   ```

3. **Configure as variáveis de ambiente**:
   - Crie um arquivo `.env` na raiz do projeto baseado no `.env.example`.
   - Adicione suas credenciais do Firebase e demais chaves necessárias.

4. **Inicie o ambiente de desenvolvimento**:
   ```bash
   npm run dev
   ```

5. **Executar Linter e Checagem de Tipos**:
   ```bash
   npm run lint
   npm run type-check
   ```

6. **Executar a Suíte de Testes e Cobertura**:
   ```bash
   npm run test:run        # Executa testes uma vez
   npm run test:coverage   # Gera relatório de cobertura
   ```

---

## 📝 Funcionalidades
- [x] Registro e monitoramento em tempo real do status de backups (Sucesso/Erro).
- [x] Painel Administrativo moderno com visualização completa e gestão de usuários (incluindo exibição de e-mail e papéis/roles).
- [x] Sistema de Gamificação técnico (XP e níveis como *Operador de Snapshot L1*, *Analista de Retenção*, *Engenheiro de Disaster Recovery* e *SysAdmin Root*).
- [x] Quadro de tarefas estilo Kanban com drag-and-drop e efeito confetti para metas concluídas.
- [x] Recurso de **Golden Task** (Tarefa de Ouro) com bônus especial de +50 XP.
- [x] Controle de tarefas avançado com **Modo Foco (Pomodoro)** e timer regressivo automático.
