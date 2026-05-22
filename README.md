# 📋 Registro de Backup

Plataforma dedicada ao registro e monitoramento diário de backups, desenvolvida para facilitar o controle de integridade e a rotina de verificação de sistemas.

🚀 Sobre o Projeto
Este projeto tem como objetivo centralizar o log de backups realizados, permitindo uma visualização rápida do status das rotinas de backup. Ideal para equipes de TI e Analistas de Redes que buscam automatizar ou organizar melhor o checklist diário de conformidade.

🛠️ Tecnologias Utilizadas
- **Linguagem**: TypeScript
- **Framework/Stack**: React 18, Vite, @dnd-kit (Drag and Drop), motion/react (Animações)
- **Backend/Banco**: Firebase (Authentication & Firestore Database)
- **Estilização**: Tailwind CSS e Lucide React (Ícones)

⚙️ Como Instalar e Rodar Localmente
### Pré-requisitos:
- Node.js instalado
- Gerenciador de pacotes (npm, yarn ou pnpm)

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

📝 Funcionalidades
- [x] Registro e monitoramento em tempo real do status de backups (Sucesso/Erro).
- [x] Painel Administrativo moderno com visualização completa e gestão de usuários (incluindo exibição de e-mail e papéis/roles).
- [x] Sistema de Gamificação técnico (XP e níveis como *Operador de Snapshot L1*, *Analista de Retenção*, *Engenheiro de Disaster Recovery* e *SysAdmin Root*).
- [x] Quadro de tarefas estilo Kanban com drag-and-drop e efeito confetti para metas concluídas.
- [x] Recurso de **Golden Task** (Tarefa de Ouro) com bônus especial de +50 XP.
- [x] Controle de tarefas avançado com **Modo Foco (Pomodoro)** e timer regressivo automático.
