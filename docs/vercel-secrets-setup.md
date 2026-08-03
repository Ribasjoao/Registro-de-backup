# Configuração de Secrets da Vercel para CD no GitHub Actions

Para que o workflow de CD (`.github/workflows/deploy.yml`) consiga autenticar, vincular e realizar o deploy de produção na Vercel, é necessário configurar três segredos (**Secrets**) nas configurações do seu repositório GitHub.

---

## 1. Segredos Necessários

| Secret | Descrição | Onde Obter na Vercel |
| :--- | :--- | :--- |
| `VERCEL_TOKEN` | Token de Acesso Pessoal da Vercel para autenticação na CLI | **Account Settings** → **Tokens** |
| `VERCEL_ORG_ID` | Identificador da sua Organização/Conta na Vercel | **Account / Team Settings** → **General** → **ID** |
| `VERCEL_PROJECT_ID` | Identificador único do Projeto na Vercel | **Project Settings** → **General** → **Project ID** |

---

## 2. Passo a Passo para Obter cada Secret

### A. Obter o `VERCEL_TOKEN`
1. Acesse o dashboard da [Vercel](https://vercel.com).
2. Clique no seu avatar (canto superior direito) e selecione **Account Settings**.
3. No menu lateral esquerdo, navegue até **Tokens**.
4. Clique em **Create Token** (ou **Create**).
5. Defina um nome identificador (ex: `GitHub Actions CD`) e selecione o escopo apropriado.
6. Clique em **Create** e copie o token gerado (*atenção: ele só será exibido uma vez*).

---

### B. Obter o `VERCEL_ORG_ID`
1. No dashboard da Vercel, acesse **Account Settings** (ou **Team Settings**, se o projeto estiver em um time).
2. Na aba **General**, navegue até a seção **Your ID** / **Team ID**.
3. Copie o valor alfanumérico (começa frequentemente com `team_` ou similar).

---

### C. Obter o `VERCEL_PROJECT_ID`
1. No dashboard da Vercel, abra a página do seu projeto específico.
2. Acesse a aba **Settings** no menu superior do projeto.
3. Na seção **General**, localize o campo **Project ID**.
4. Copie o ID alfanumérico do projeto (começa com `prj_` ou similar).

---

## 3. Como Cadastrar os Secrets no GitHub

1. No GitHub, abra o repositório do seu projeto.
2. Acesse a aba **Settings** (Configurações do repositório).
3. No menu lateral esquerdo, navegue em **Secrets and variables** → **Actions**.
4. Clique no botão verde **New repository secret**.
5. Crie individualmente os três segredos:
   - **Name:** `VERCEL_TOKEN` | **Secret:** *(Cole o token obtido na Vercel)*
   - **Name:** `VERCEL_ORG_ID` | **Secret:** *(Cole o Org/Team ID)*
   - **Name:** `VERCEL_PROJECT_ID` | **Secret:** *(Cole o Project ID)*
6. Clique em **Add secret** para salvar cada um.

---

## 4. Estrutura do Workflow de Deploy

Com os secrets cadastrados, o workflow executará os seguintes passos automaticamente em cada push para `main` (após o sucesso do pipeline de CI):

1. **Checkout Code**: Clona o repositório no runner ubuntu-latest.
2. **Setup Node.js**: Prepara o ambiente com Node.js 22.
3. **Install Dependencies**: Executa `npm ci` limpo.
4. **Install Vercel CLI**: Instala a CLI globalmente (`npm install -g vercel@latest`).
5. **Pull Vercel Environment**: Baixa as configurações do ambiente de produção (`vercel pull --yes --environment=production`).
6. **Build Project**: Compila o projeto com a CLI (`vercel build --prod`).
7. **Deploy to Vercel Production**: Realiza o deploy dos artefatos pré-compilados (`vercel deploy --prebuilt --prod`).
