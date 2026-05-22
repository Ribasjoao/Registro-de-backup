# 🛡️ Guia de Variáveis de Ambiente e Deploy na Vercel — Registro de Backup

Este guia orienta sobre como configurar as variáveis de ambiente, manter o repositório unificado (Monorepo) seguro no GitHub e realizar o deploy gratuito do frontend do **Registro de Backup** na Vercel integrado à sua infraestrutura atual de **Firebase/Firestore** e **Cloud Functions (Node.js)**.

---

## 📂 1. Estrutura de Monorepo do Repositório

Mantemos todo o código consolidado de forma unificada no mesmo repositório do GitHub. Isso facilita a manutenção contínua e as atualizações rápidas:

```text
├── .env.example              # Exemplo de variáveis locais do Frontend
├── .gitignore                # Regras de ocultação de segredos em repositórios públicos
├── vercel.json               # Configurações de redirecionamento dinâmico de SPA no Vercel
├── package.json              # Scripts e dependências do Frontend (React/Vite)
├── src/                      # Código-fonte principal do Frontend (React + TS)
│   └── firebase.ts           # Inicializador dinâmico de conexões de banco de dados
├── functions/                # Workspace do Backend (Cloud Functions)
│   ├── .env                  # Chaves locais do emulador do backend (Oculto)
│   ├── src/index.ts          # Definições do backend que consome o Gemini API com segurança
│   ├── tsconfig.json         # Configuração TypeScript do backend
│   └── package.json          # Dependências do backend do Firebase
```

O arquivo `.gitignore` na raiz já está configurado para segurar seus arquivos de ambiente locais de irem ao ar publicamente:
- `.env` (Frontend local)
- `functions/.env` (Backend local)
- `node_modules` e caches de compilação.

---

## 🔒 2. Gestão de Segredos e Chave Gemini (`GEMINI_API_KEY`)

Como seu backend roda em **Firebase Cloud Functions**, o frontend (React/Vite) **nunca** faz requisições diretas expondo a chave do Gemini ao navegador. Isso garante proteção total!

A chave `GEMINI_API_KEY` pertence exclusivamente ao ambiente das **Cloud Functions**, protegendo-a de vazamentos ou mau uso.

### Configurando o Segredo do Gemini no Firebase:
Durante o deploy das suas Cloud Functions, você deve definir a chave através do Firebase CLI utilizando os seguintes comandos:

```bash
# 1. Acesse o diretório functions
cd functions

# 2. Defina a chave secreta de forma oficial no Firebase Secrets Manager
firebase functions:secrets:set GEMINI_API_KEY="SUA_CHAVE_PRIVADA_AQUI"

# 3. Ou registre no ambiente padrão do Firebase Functions se não utilizar o Secrets:
firebase functions:config:set gemini.key="SUA_CHAVE_PRIVADA_AQUI"
```

---

## 🌐 3. Configurando Variáveis de Ambiente no Painel do Vercel

O frontend do Registro de Backup hospedado de forma estática e gratuita na Vercel obterá suas credenciais de conexão dinamicamente a partir das **Environment Variables** configuradas no painel.

Ao importar seu repositório na Vercel:
1. Acesse **Settings** > **Environment Variables** no projeto criado no Vercel.
2. Cadastre as seguintes chaves do seu arquivo `firebase-applet-config.json` para que o frontend se conecte perfeitamente ao seu Firestore e Cloud Functions:

| Nome da Variável no Vercel | Valor Correspondente | Descrição |
| :--- | :--- | :--- |
| `VITE_FIREBASE_API_KEY` | Seu `apiKey` do Firebase | Conexão estática do Firebase no lado do cliente |
| `VITE_FIREBASE_AUTH_DOMAIN` | Seu `authDomain` do Firebase | Domínio de login e autenticação |
| `VITE_FIREBASE_PROJECT_ID` | Seu `projectId` do Firebase | Identificador do projeto Firebase |
| `VITE_FIREBASE_STORAGE_BUCKET` | Seu `storageBucket` do Firebase | Bucket do Cloud Storage se aplicável |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Seu `messagingSenderId` | Identificador de mensageria do Firebase |
| `VITE_FIREBASE_APP_ID` | Seu `appId` | Identificador único do App Firebase |
| `VITE_FIREBASE_MEASUREMENT_ID` | Seu `measurementId` | Id opcional de monitoramento |
| `VITE_FIREBASE_FIRESTORE_DATABASE_ID` | `(default)` | ID do Banco Firestore (padrão) |

*Nota: Todas as variáveis destinadas ao frontend do Vite **precisam** vir obrigatoriamente prefixadas com `VITE_` para que fiquem expostas às requisições do navegador de forma segura no build estático.*

---

## ⚡ 4. Passo a Passo de Deploy na Vercel (Hobby/Gratuito)

### Passo A: Enviar ao GitHub
Faça push de todo o ecossistema para o seu GitHub unificado (com `.env` oculto).

### Passo B: Conectar o Projeto na Vercel
1. Acesse [vercel.com](https://vercel.com) e conecte sua conta do GitHub.
2. Clique em **Add New...** -> **Project**.
3. Importe o repositório do Registro de Backup.

### Passo C: Configurações de Build na Vercel
Nas opções de Build do projeto, a Vercel detectará e preencherá automaticamente:
- **Framework Preset**: `Vite`
- **Root Directory**: `./` (a pasta raiz do repositório)
- **Build Command**: `npm run build`
- **Output Directory**: `dist`

### Passo D: Variáveis e Lançamento
1. Expanda a seção **Environment Variables** e insira as variáveis cadastradas na tabela do item 3.
2. Clique em **Deploy**!

A Vercel compilará o build estático otimizado do React com Vite e publicará em um link amigável, rápido e do plano gratuito como `https://registro-de-backup.vercel.app`. Todos os acessos de dados e chamadas de relatórios com o Gemini viajarão direto para as suas Cloud Functions do seu Firebase estabelecido de modo fluido e responsivo!
