# 🚀 Deploy Gratuito no Vercel - Gate7

O **Gate7** é uma aplicação construída com **React**, **Vite** e **TypeScript**, conectando-se diretamente ao **Firebase/Firestore** no client-side para manter toda a sincronização em tempo real e reações instantâneas.

Como o Vercel oferece hospedagem estática nativa otimizada para o ecossistema Vite/React **totalmente sem custo (Hobby Plan)**, **não é necessária nenhuma estrutura de backend complexa (como Flask ou containers do Cloud Run)** para expor seu painel e registros! Toda a lógica de dados já é processada de modo serverless direto no Firebase.

Escrevemos configurações completas (`vercel.json`) para lidar com o roteamento dinâmico automático e adaptamos o código para que você configure suas credenciais de forma 100% segura sem expor nenhum dado no GitHub público.

---

## 🔒 1. Segurança com o GitHub

Para garantir que suas chaves do Firebase e do Gemini permaneçam seguras e ocultas no seu repositório público:

1. Atualizamos a leitura da configuração em `src/firebase.ts`. Agora ela lê variáveis de ambiente prefixadas com `VITE_`.
2. Se você preferir não enviar o arquivo de configuração `firebase-applet-config.json` ao GitHub, você pode adicioná-lo ao `.gitignore`:
   ```bash
   # Adicione esta linha ao final do seu arquivo .gitignore se desejar omitir o config local do git:
   firebase-applet-config.json
   ```
3. Suas credenciais serão enviadas diretamente pelo painel do Vercel de forma criptografada.

---

## ⚡ 2. Passo a Passo de Deploy no Vercel (Zero Custo)

### Passo A: Criar o Repositório no GitHub
1. Pressione o botão de exportar para o GitHub no menu de configurações do AI Studio (ou inicialize um repositório git localmente com os arquivos exportados).
2. Envie o código adaptado para seu repositório privado ou público.

### Passo B: Conectar à Vercel
1. Acesse [vercel.com](https://vercel.com) e crie uma conta gratuita (caso ainda não possua).
2. Clique em **Add New...** e selecione **Project**.
3. Importe o repositório do GitHub criado para o Gate7.

### Passo C: Configuração do Projeto no Painel da Vercel
O Vercel detectará automaticamente que este é um projeto **Vite**.
1. **Framework Preset**: Deixe selecionado como **Vite** (detectado automaticamente).
2. **Build and Output Settings**: Deixe os padrões (`npm run build` e diretório de saída `dist`).

### Passo D: Configurar Variáveis de Ambiente (Environment Variables)
No campo de **Environment Variables** (dentro da tela de deploy), insira chave por chave com os dados do seu arquivo `firebase-applet-config.json`. 

Adicione os seguintes nomes e seus respectivos valores:

| Chave de Ambiente no Vercel | Valor Correspondente do seu `firebase-applet-config.json` |
| :--- | :--- |
| `VITE_FIREBASE_API_KEY` | `apiKey` |
| `VITE_FIREBASE_AUTH_DOMAIN` | `authDomain` |
| `VITE_FIREBASE_PROJECT_ID` | `projectId` |
| `VITE_FIREBASE_STORAGE_BUCKET`| `storageBucket` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | `messagingSenderId` |
| `VITE_FIREBASE_APP_ID` | `appId` |
| `VITE_FIREBASE_MEASUREMENT_ID` | `measurementId` |
| `VITE_FIREBASE_FIRESTORE_DATABASE_ID` | `firestoreDatabaseId` (comumente `(default)`) |

---

## 🛠️ Como Funciona o Roteamento Dinâmico no Vercel

Configuramos o arquivo `vercel.json` na raiz da seguinte forma:
```json
{
  "name": "gate-7",
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```
Isso garante que, ao usar abas complexas, relatórios ou atualizar a página direto em sub-rotas como `/records`, o sistema do Vercel redirecione internamente para o roteamento inteligente do React no lado do cliente, evitando o erro `404 Not Found` típico de SPAs!

E prontinho! Seu Gate7 estará online instantaneamente com um domínio amigável `https://gate7.vercel.app` (ou semelhante) e com zero custos!
