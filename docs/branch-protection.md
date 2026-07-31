# 🛡️ Configuração de Branch Protection Rules (GitHub)

Este documento fornece um guia passo a passo para configurar as Regras de Proteção de Branch (**Branch Protection Rules**) na branch principal (`main`) do repositório no GitHub, garantindo que nenhum código quebre o ambiente de produção e que todas as mudanças passem pelo pipeline de CI/CD.

---

## 📋 Pré-requisitos
- Permissão de Administrador ou Mantenedor no repositório GitHub.
- Repositório com o workflow de CI (`.github/workflows/ci.yml`) já enviado para o GitHub.

---

## ⚙️ Passo a Passo para Configuração

1. **Acesse as Configurações do Repositório**:
   - No GitHub, navegue até a página principal do projeto.
   - Clique na aba **Settings** (Configurações) no menu superior.

2. **Navegue até a Seção de Branches**:
   - No menu lateral esquerdo, sob a seção *Code and automation*, clique em **Branches**.

3. **Adicionar Regra de Proteção**:
   - Na seção *Branch protection rules*, clique no botão **Add branch protection rule** (ou **Add rule**).

4. **Definir o Padrão do Nome da Branch**:
   - No campo **Branch name pattern**, digite: `main`

---

## 🔒 Regras de Proteção Recomendadas

Marque as seguintes opções nas configurações da regra:

### 1. Require a pull request before merging (Exigir Pull Request)
- [x] **Require a pull request before merging**
- [x] **Require approvals**: Defina para no mínimo **1** revisão/aprovação.
- [x] **Dismiss stale pull request approvals when new commits are pushed**: Cancela aprovações antigas quando novos commits são enviados para o PR, forçando re-revisão do código atualizado.

### 2. Require status checks to pass before merging (Exigir Verificações de Status)
- [x] **Require status checks to pass before merging**
- [x] **Require branches to be up to date before merging**: Garante que o PR seja testado contra a versão mais recente da `main`.
- Na caixa de pesquisa de status checks (**Search for checks**), busque e selecione os status jobs do pipeline de CI:
  - `1. Lint (ESLint)`
  - `2. Type Check (TypeScript)`
  - `3. Unit & Integration Tests (Vitest)`
  - `4. Production Build (Vite)`

### 3. Outras Boas Práticas Adicionais
- [x] **Require conversation resolution before merging**: Exige que todos os comentários/discussões do PR sejam resolvidos antes do merge.
- [x] **Do not allow bypassing the above settings**: Aplica as mesmas regras inclusive para administradores do repositório.

---

## 🚀 Fluxo de Trabalho Esperado

Após aplicar as configurações:
1. Commits diretos na branch `main` estarão bloqueados.
2. Toda alteração deverá ser feita em uma branch secundária (ex: `feature/nova-tela`, `fix/correcao-bug`) e submetida via **Pull Request (PR)**.
3. O GitHub Actions executará o workflow **CI Pipeline** no PR.
4. O botão de **Merge Pull Request** só ficará liberado após:
   - Todos os 4 jobs de CI passarem com sucesso (Lint, Type Check, Tests, Build).
   - O PR receber ao menos 1 aprovação de revisão de código.
5. Quando o PR for mesclado na `main`, o workflow de **CD Deployment (Vercel)** será disparado automaticamente para atualizar a produção.
