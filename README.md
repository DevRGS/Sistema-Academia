# Sistema Academia - Black Academy

Sistema completo de gestão para academias e personal trainers, desenvolvido para gerenciar alunos, treinos, dietas, acompanhamento de peso, bioimpedância e relatórios. Utiliza **Google Sheets** como banco de dados, sem necessidade de servidor dedicado — ideal para hospedagem gratuita (ex.: GitHub Pages).

## 🚀 Tecnologias

- **React 18** com **TypeScript**
- **Vite 6** — Build tool e dev server
- **React Router 6** — Roteamento
- **Tailwind CSS** — Estilização
- **shadcn/ui** (Radix UI) — Componentes de interface
- **React Hook Form** + **Zod** — Formulários e validação
- **Recharts** — Gráficos e visualizações
- **TanStack Query** — Estado assíncrono e cache
- **Google Identity Services (GIS)** + **Sheets/Drive API** — Autenticação e banco de dados
- **IndexedDB** — Cache local para performance

## 📋 Funcionalidades

### 👤 Gestão de Usuários
- **Perfis**: Alunos, Personal Trainers e Administradores
- **Autenticação**: Login com Google OAuth (client-side, sem expor client_secret)
- **Compartilhamento**: Personal trainers podem acessar planilhas de alunos
- **Histórico**: Acompanhamento de evolução dos dados pessoais

### 🏋️ Treinos
- **Criação Manual**: Treinos personalizados com exercícios, séries, repetições e descanso
- **Treinos Base Automáticos**:
  - Treino ABC (Peito/Tríceps, Costas/Bíceps, Pernas/Ombros)
  - Treino Inicial (Full Body para iniciantes)
  - Treino Intermediário
  - Treino Avançado (Push/Pull/Legs)
  - Treino Personalizado (distribuição de foco por grupo muscular)
- **Sessão de Treino**: Timer, registro de performance e acompanhamento em tempo real
- **Filtragem por Limitações**: Exercícios filtrados conforme o dicionário de regras de segurança

### 🍎 Dieta
- **Planos Alimentares**: Refeições com macronutrientes
- **Logs Diários**: Registro de consumo diário
- **Cálculo Automático**: Totais de calorias, proteínas, carboidratos e gorduras
- **Gestão por Aluno**: Administradores podem criar dietas para alunos específicos

### ⚖️ Acompanhamento Físico
- **Peso**: Registro e histórico com gráficos (rota `/weight-tracking`)
- **Bioimpedância**: Componentes para composição corporal (massa gorda/magra, medidas segmentares, TMB, idade metabólica)
- **Gráficos**: Evolução ao longo do tempo

### 📊 Relatórios
- **Dashboard de Relatórios**: Métricas, progresso e estatísticas (rota `/reports`)

### ⚙️ Configurações e Limitações
- **Dados Pessoais**: Altura, peso, idade, rotina, locomoção
- **Dicionário de Regras de Segurança**: Limitações físicas com thresholds (estresse lombar, ombro, cotovelo, punho, joelho, carga axial, estabilidade)
- **Ações**: Bloqueio total ou aviso de cuidado para exercícios

## 🗄️ Banco de Dados

O sistema usa **Google Sheets** como backend:
- Dados na nuvem do Google; cada usuário tem sua planilha (nome padrão: **APP_DB**)
- Sem custo de servidor ou banco dedicado
- Acesso via Google Sheets API com token OAuth do usuário

### Cache Local (IndexedDB)
- Consultas rápidas a partir do cache
- Sincronização em background
- TTL configurável (ex.: 5 minutos); invalidado em inserções/atualizações/deleções

## 📁 Estrutura do Projeto

```
src/
├── components/          # Componentes reutilizáveis
│   ├── admin/           # Administradores (alunos, dietas)
│   ├── bioimpedance/    # Bioimpedância
│   ├── dashboard/       # Cards do dashboard
│   ├── diet/            # Dieta
│   ├── personal/        # Personal trainers
│   ├── reports/         # Relatórios
│   ├── settings/        # Configurações e limitações
│   ├── student/         # Perfil e compartilhamento
│   ├── ui/              # Componentes UI (shadcn/ui)
│   ├── weight/          # Peso e gráficos
│   └── workouts/        # Treinos e sessão
├── contexts/            # SessionContext (sessão e perfil)
├── hooks/               # useGoogleSheetsDB, useWorkoutExpiration, etc.
├── integrations/google/ # client.ts (Google API e OAuth)
├── pages/               # Páginas (Dashboard, Diet, Workouts, Reports, etc.)
├── utils/               # cacheService, exerciseService, workoutGenerator, toast
├── App.tsx
└── main.tsx

public/
├── EXERCICIOS-CONTROLE - exercicios.csv   # Base de exercícios
└── EXERCICIOS-CONTROLE - limitacoes.csv  # Regras de limitações
```

## 🛠️ Instalação e Uso

### Pré-requisitos
- **Node.js 20+** (recomendado; o CI usa Node 20)
- Conta Google
- **Google Cloud Project** com OAuth 2.0 configurado (tipo "Aplicativo da Web" ou "Aplicativo JavaScript") e Client ID

### Instalação

1. **Clone o repositório**
   ```bash
   git clone <repository-url>
   cd Sistema-Academia
   ```

2. **Instale as dependências**
   ```bash
   npm install
   ```
   Ou com pnpm: `pnpm install`

3. **Configuração do Google**
   - O **Client ID** do Google está em `src/integrations/google/client.ts`
   - No Google Cloud Console, adicione como origem autorizada a URL do app (ex.: `http://localhost:5173` em dev e a URL do GitHub Pages em produção)

4. **Servidor de desenvolvimento**
   ```bash
   npm run dev
   ```
   Acesse `http://localhost:5173`

### Build para Produção

```bash
npm run build
```

Saída em `dist/`. Para testar o build localmente:

```bash
npm run preview
```

## 🌐 Deploy (GitHub Pages)

O projeto inclui workflow para **GitHub Pages** (`.github/workflows/deploy.yml`):
- Disparo em push na branch `main`
- Usa `npm ci` e `npm run build`
- Faz upload do conteúdo de `dist/` para GitHub Pages

Configure no repositório: **Settings → Pages → Source**: GitHub Actions. Após o deploy, adicione a URL do Pages nas origens autorizadas do OAuth no Google Cloud Console.

## 📖 Como Usar

### Primeiro Acesso
1. **Login** com conta Google
2. **Configurações**: preencha dados pessoais e limitações (se houver)
3. A planilha **APP_DB** é criada automaticamente no Drive do usuário na primeira utilização

### Treinos
- **Treinos base**: em **Treinos** → **Gerar Treinos Base** → escolha o tipo (ABC, Inicial, Intermediário, Avançado, Personalizado)
- **Manual**: **Adicionar Treino** → nome, grupo muscular, exercícios com séries/repetições/descanso

### Compartilhamento
- **Configurações** → **Compartilhar com Personal Trainer** para alunos compartilharem a planilha com o personal

## 🔧 Scripts

| Script | Descrição |
|--------|-----------|
| `npm run dev` | Servidor de desenvolvimento (Vite) |
| `npm run build` | Build de produção |
| `npm run build:dev` | Build em modo development |
| `npm run preview` | Preview do build (serve `dist/`) |
| `npm run lint` | ESLint |

## 📝 Notas

- **Google Sheets**: Uma planilha por usuário; abas por tipo de dado; estrutura gerenciada pelo app.
- **Segurança**: Apenas o **client_id** (público) fica no frontend; **client_secret** não é utilizado no projeto.
- **Cache**: IndexedDB no navegador; para limpar, use as opções de limpar dados do site.
- **Limitações**: Regras em `public/EXERCICIOS-CONTROLE - limitacoes.csv`; exercícios em `public/EXERCICIOS-CONTROLE - exercicios.csv`.

## 🤝 Contribuindo

Projeto privado. Para sugestões ou melhorias, entre em contato com os mantenedores.

## 📄 Licença

Projeto privado e proprietário.

---

**Desenvolvido para Black Academy**
