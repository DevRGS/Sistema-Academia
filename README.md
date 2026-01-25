# Sistema Academia - Black Academy

Sistema completo de gestão para academias e personal trainers, desenvolvido para gerenciar alunos, treinos, dietas, acompanhamento de peso, bioimpedância e relatórios. Utiliza Google Sheets como banco de dados, oferecendo segurança e economia sem necessidade de servidor dedicado.

## 🚀 Tecnologias

- **React 18** com **TypeScript**
- **Vite** - Build tool e dev server
- **React Router** - Roteamento
- **Tailwind CSS** - Estilização
- **shadcn/ui** - Componentes UI
- **React Hook Form** + **Zod** - Formulários e validação
- **Recharts** - Gráficos e visualizações
- **Google Sheets API** - Banco de dados
- **IndexedDB** - Cache local para performance

## 📋 Funcionalidades

### 👤 Gestão de Usuários
- **Perfis**: Alunos, Personal Trainers e Administradores
- **Autenticação**: Login com Google OAuth
- **Compartilhamento**: Personal trainers podem acessar planilhas de alunos
- **Histórico**: Acompanhamento de evolução dos dados pessoais

### 🏋️ Treinos
- **Criação Manual**: Crie treinos personalizados com exercícios, séries, repetições e descanso
- **Treinos Base Automáticos**:
  - Treino ABC (Peito/Tríceps, Costas/Bíceps, Pernas/Ombros)
  - Treino Inicial (Full Body para iniciantes)
  - Treino Intermediário
  - Treino Avançado (Push/Pull/Legs)
  - Treino Personalizado (com distribuição de foco por grupo muscular)
- **Sessão de Treino**: Timer, registro de performance e acompanhamento em tempo real
- **Filtragem Inteligente**: Exercícios filtrados automaticamente baseado nas limitações físicas do usuário

### 🍎 Dieta
- **Planos Alimentares**: Criação de refeições com macronutrientes
- **Logs Diários**: Registro de consumo diário
- **Cálculo Automático**: Total de calorias, proteínas, carboidratos e gorduras
- **Gestão por Aluno**: Administradores podem criar dietas para alunos específicos

### ⚖️ Acompanhamento Físico
- **Peso**: Registro e histórico de peso com gráficos
- **Bioimpedância**: Registro completo de composição corporal
  - Massa gorda, massa magra, água corporal
  - Medidas segmentares (braços, pernas, tronco)
  - Taxa metabólica basal, idade metabólica
- **Gráficos**: Visualização da evolução ao longo do tempo

### 📊 Relatórios
- **Dashboard**: Visão geral com métricas principais
- **Relatórios Detalhados**: Análise de progresso, recordes pessoais e estatísticas

### ⚙️ Configurações e Limitações
- **Dados Pessoais**: Altura, peso, idade, rotina, locomoção
- **Dicionário de Regras de Segurança**: Sistema avançado de limitações físicas
  - Cada limitação define thresholds (limites máximos) de estresse
  - Filtragem automática de exercícios baseada em:
    - Estresse Lombar, Ombro, Cotovelo, Punho, Joelho
    - Carga Axial
    - Estabilidade Mínima Exigida
  - Ações: Bloqueio Total ou Aviso de Cuidado

## 🗄️ Banco de Dados

O sistema utiliza **Google Sheets** como banco de dados, oferecendo:
- ✅ **Segurança**: Dados armazenados na nuvem do Google
- ✅ **Economia**: Sem custos de servidor ou banco de dados
- ✅ **Acessibilidade**: Dados acessíveis via planilhas do Google
- ✅ **Colaboração**: Compartilhamento fácil entre personal trainers e alunos

### Cache Local
Sistema de cache implementado com **IndexedDB** para:
- ⚡ **Performance**: Consultas instantâneas do cache local
- 🔄 **Sincronização em Background**: Atualização automática sem bloquear a UI
- 📱 **Offline**: Funcionalidade básica mesmo sem conexão
- ⏱️ **TTL Configurável**: Cache válido por 5 minutos (ajustável)

## 📁 Estrutura do Projeto

```
src/
├── components/          # Componentes reutilizáveis
│   ├── admin/          # Componentes para administradores
│   ├── bioimpedance/   # Componentes de bioimpedância
│   ├── dashboard/      # Componentes do dashboard
│   ├── diet/           # Componentes de dieta
│   ├── personal/       # Componentes para personal trainers
│   ├── reports/        # Componentes de relatórios
│   ├── settings/       # Componentes de configurações
│   ├── student/        # Componentes para alunos
│   ├── ui/             # Componentes UI (shadcn/ui)
│   └── workouts/       # Componentes de treinos
├── contexts/           # Contextos React (SessionContext)
├── hooks/              # Custom hooks
│   └── useGoogleSheetsDB.ts  # Hook principal para acesso ao banco
├── integrations/       # Integrações externas
│   └── google/        # Integração com Google APIs
├── pages/              # Páginas da aplicação
├── utils/              # Utilitários
│   ├── cacheService.ts        # Serviço de cache IndexedDB
│   ├── exerciseService.ts     # Serviço de exercícios e limitações
│   └── workoutGenerator.ts    # Gerador de treinos base
└── main.tsx           # Entry point

public/
├── EXERCICIOS-CONTROLE - exercicios.csv      # Base de exercícios
└── EXERCICIOS-CONTROLE - limitacoes.csv      # Regras de limitações
```

## 🛠️ Instalação e Uso

### Pré-requisitos
- Node.js 18+ instalado
- Conta Google para autenticação
- Google Cloud Project configurado com OAuth 2.0

### Instalação

1. **Clone o repositório**
```bash
git clone <repository-url>
cd Sistema-Academia
```

2. **Instale as dependências**
```bash
npm install
# ou
pnpm install
```

3. **Configure as variáveis de ambiente** (se necessário)
   - O Client ID do Google está configurado em `src/integrations/google/client.ts`

4. **Inicie o servidor de desenvolvimento**
```bash
npm run dev
# ou
pnpm dev
```

5. **Acesse a aplicação**
   - Abra `http://localhost:5173` no navegador

### Build para Produção

```bash
npm run build
# ou
pnpm build
```

Os arquivos serão gerados na pasta `dist/`.

## 📖 Como Usar

### Primeiro Acesso

1. **Login**: Faça login com sua conta Google
2. **Configurações**: Acesse "Configurações" e preencha seus dados pessoais
3. **Limitações**: Selecione suas limitações físicas (se houver)
4. **Pronto**: Comece a usar o sistema!

### Criando Treinos

#### Treinos Base Automáticos
1. Vá em **Treinos**
2. Clique em **Gerar Treinos Base**
3. Escolha o tipo de treino:
   - **ABC**: Divisão clássica em 3 dias
   - **Inicial**: Full body para iniciantes
   - **Intermediário**: Baseado no ABC
   - **Avançado**: Push/Pull/Legs
   - **Personalizado**: Defina porcentagens de foco por grupo muscular
4. Clique em **Gerar Treinos**

#### Treinos Manuais
1. Clique em **Adicionar Treino**
2. Preencha nome, grupo muscular
3. Adicione exercícios com séries, repetições e descanso
4. Salve

### Configurando Limitações

1. Acesse **Configurações** > **Dicionário de Regras de Segurança**
2. Marque as limitações que você possui
3. O sistema automaticamente filtrará exercícios baseado nos thresholds definidos
4. Salve suas limitações

### Compartilhando com Personal Trainer

1. Alunos podem compartilhar sua planilha com personal trainers
2. Personal trainers podem acessar e editar treinos/dietas dos alunos
3. Acesse **Configurações** > **Compartilhar com Personal Trainer**

## 🔧 Scripts Disponíveis

- `npm run dev` - Inicia servidor de desenvolvimento
- `npm run build` - Build para produção
- `npm run build:dev` - Build em modo desenvolvimento
- `npm run lint` - Executa o linter
- `npm run preview` - Preview do build de produção

## 📝 Notas Importantes

### Google Sheets como Banco de Dados
- A primeira vez que um usuário acessa, o sistema cria automaticamente uma planilha chamada "APP_DB"
- Cada usuário tem sua própria planilha
- Os dados são organizados em abas (sheets) por tipo de informação
- O sistema gerencia automaticamente a estrutura das planilhas

### Cache Local
- O cache é armazenado no navegador usando IndexedDB
- Cache válido por 5 minutos por padrão
- Cache é invalidado automaticamente após inserções/atualizações/deleções
- Para limpar o cache, limpe os dados do navegador

### Limitações Físicas
- O sistema usa um dicionário de regras de segurança baseado em thresholds
- Cada limitação define limites máximos de estresse permitidos
- Exercícios que excedam os limites são bloqueados automaticamente
- As regras são definidas no arquivo `EXERCICIOS-CONTROLE - limitacoes.csv`

## 🤝 Contribuindo

Este é um projeto privado. Para sugestões ou melhorias, entre em contato com os mantenedores.

## 📄 Licença

Este projeto é privado e proprietário.

---

**Desenvolvido com ❤️ para Black Academy**
