# 📋 Documentação de Rotas - Sistema Financeiro Selleta

## 🎯 **#memorize**: Sempre atualizar esta documentação quando implementar novas rotas/funcionalidades

---

## 🔐 **AUTENTICAÇÃO**

### `/` (GET)
- **Descrição**: Página inicial de login
- **Template**: `login.html`
- **Funcionalidade**: Formulário de autenticação de usuários
- **Status**: ✅ Implementado

### `/login` (POST)
- **Descrição**: Processa autenticação do usuário
- **Parâmetros**: `username`, `password`
- **Redirecionamento**: `/dashboard` (sucesso) ou `/` (falha)
- **Status**: ✅ Implementado

### `/cadastro` (GET/POST)
- **Descrição**: Cadastro de novos usuários
- **Template**: `cadastro.html`
- **Funcionalidade**: Criação de conta com validação de senha
- **Status**: ✅ Implementado

### `/logout` (POST)
- **Descrição**: Encerra sessão do usuário
- **Redirecionamento**: `/`
- **Status**: ✅ Implementado

---

## 🏠 **DASHBOARD PRINCIPAL**

### `/dashboard` (GET)
- **Descrição**: Painel principal do sistema
- **Template**: `dashboard_novo.html`
- **CSS**: `dashboard_novo.css`
- **Conceito Visual**: 
  - Header azul Selleta com logo e busca
  - Sidebar com navegação hierárquica
  - KPI cards com métricas
  - Gráficos de receitas/despesas
  - Feed de atividades recentes
- **Status**: ✅ Implementado
- **Autenticação**: Obrigatória

---

## 📁 **MÓDULO: CADASTROS**

### 🗂️ **Plano Financeiro**

#### `/plano_financeiro` (GET)
- **Descrição**: Gestão hierárquica de planos financeiros (4 níveis)
- **Template**: `plano_financeiro.html`
- **CSS**: `plano_financeiro_novo.css`
- **JavaScript**: `plano_financeiro_novo.js`
- **Conceito Visual**:
  - Layout dividido: árvore hierárquica + formulário
  - Expansão progressiva (níveis 1-2 iniciais)
  - Design clean/minimalist
  - Cores Selleta com badges de status
- **Status**: ✅ Implementado e refinado
- **Autenticação**: Obrigatória

#### **API Sub-rotas:**
- `GET /api/planos_financeiros` - Listar todos os planos
- `POST /api/planos_financeiros` - Criar novo plano
- `PUT /api/planos_financeiros/<id>` - Atualizar plano existente

### 🏢 **Empresas**

#### `/empresas` (GET)
- **Descrição**: Gestão de empresas do Grupo Selleta
- **Template**: `empresas.html`
- **CSS**: `empresas.css`
- **JavaScript**: `empresas.js`
- **Conceito Visual**:
  - Cards responsivos em grid
  - Filtros por município e status
  - Busca em tempo real
  - Botões de ação: Relatório (verde) + Editar (azul)
  - Modal para CRUD com formatação automática
- **Dados**: 7 empresas extraídas do Sienge
- **Filtro Padrão**: Empresas ativas
- **Status**: ✅ Implementado e refinado
- **Autenticação**: Obrigatória

#### **API Sub-rotas:**
- `GET /api/empresas` - Listar todas as empresas
- `POST /api/empresas` - Criar nova empresa
- `PUT /api/empresas/<id>` - Atualizar empresa existente

#### **Distribuição Geográfica:**
- **Cuiabá**: 4 empresas (sede)
- **Pontes e Lacerda**: 2 empresas
- **Tapurah**: 1 empresa

### 🏗️ **Centro de Custo** ⚠️ Em desenvolvimento
#### `/centro_custo` (GET)
- **Status**: 🚧 Placeholder - redireciona para dashboard
- **Próximos passos**: Extrair dados dos CSVs, criar CRUD

---

## 👥 **MÓDULO: PESSOAS**

### 🤝 **Clientes/Fornecedores** ⚠️ Em desenvolvimento
#### `/clientes_fornecedores` (GET)
- **Status**: 🚧 Placeholder - redireciona para dashboard
- **Próximos passos**: Extrair dados dos CSVs, criar CRUD

---

## 🏦 **MÓDULO: FINANCEIRO**

### 💳 **Contas Bancárias** ⚠️ Em desenvolvimento
#### `/conta_bancaria` (GET)
- **Status**: 🚧 Placeholder - redireciona para dashboard
- **Próximos passos**: Extrair dados dos CSVs, criar CRUD

---

## 💰 **MÓDULO: MOVIMENTAÇÃO**

### 📝 **Transações** ⚠️ Em desenvolvimento
#### `/nova_transacao` (GET)
- **Status**: 🚧 Placeholder - redireciona para dashboard
- **Conceito Futuro**: Formulário multi-etapas com parcelas

#### `/transacoes` (GET)
- **Status**: 🚧 Placeholder - redireciona para dashboard
- **Conceito Futuro**: Listagem com filtros avançados

### 💸 **Contas a Pagar** ⚠️ Em desenvolvimento
#### `/contas_pagar` (GET)
- **Status**: 🚧 Placeholder - redireciona para dashboard
- **Conceito Futuro**: Gestão de obrigações financeiras

### 💵 **Contas a Receber** ⚠️ Em desenvolvimento
#### `/contas_receber` (GET)
- **Status**: 🚧 Placeholder - redireciona para dashboard
- **Conceito Futuro**: Gestão de recebimentos

---

## 📊 **MÓDULO: RELATÓRIOS**

### 📈 **Relatórios Gerenciais** ⚠️ Em desenvolvimento
#### `/relatorios` (GET)
- **Status**: 🚧 Placeholder - redireciona para dashboard
- **Conceito Futuro**: Dashboards analíticos e exportação

---

## ⚙️ **MÓDULO: ADMINISTRAÇÃO**

### 👨‍💼 **Gestão de Usuários**
#### `/gestao_usuarios` (GET)
- **Descrição**: Administração de usuários do sistema
- **Template**: `gestao_usuarios.html`
- **Funcionalidade**: Listar, excluir usuários
- **Status**: ✅ Implementado
- **Autenticação**: Obrigatória

#### `/excluir_usuario/<id>` (POST)
- **Descrição**: Exclusão de usuário específico
- **Redirecionamento**: `/gestao_usuarios` ou `/` (auto-exclusão)

---

## 🎨 **CONCEITO VISUAL GERAL**

### **Paleta de Cores Selleta:**
```css
--selleta-primary: #1976D2;        /* Azul principal */
--selleta-primary-dark: #0D47A1;   /* Azul escuro */
--selleta-primary-light: #42A5F5;  /* Azul claro */
--selleta-white: #FFFFFF;          /* Branco */
--selleta-off-white: #F8F9FA;      /* Branco suave */
--selleta-gray: #666666;           /* Cinza médio */
--selleta-light-gray: #E0E0E0;     /* Cinza claro */
--selleta-dark: #333333;           /* Texto escuro */
```

### **Padrões de Interface:**
- **Header**: Gradiente azul com logo, busca e menu do usuário
- **Sidebar**: Navegação hierárquica com ícones e badges de status
- **Cards**: Border-left colorido, shadow sutil, hover effects
- **Botões**: Border-radius 8px, transitions suaves
- **Modais**: Backdrop blur, border-radius 12px
- **Grid**: Responsive, auto-fit minmax
- **Typography**: Font Poppins, hierarquia clara

### **Estados dos Badges:**
- 🟢 **success/Pronto**: Funcionalidade implementada
- 🟡 **warning/Em breve**: Em desenvolvimento
- 🔵 **info/Ativo**: Página atual

### **Filosofia UX:**
- **Clean/Minimalist**: Interfaces limpas, progressive disclosure
- **Mobile-first**: Design responsivo
- **Feedback visual**: Hover states, loading states
- **Consistência**: Padrões visuais repetidos

---

## 🗃️ **ESTRUTURA DE BANCO DE DADOS**

### **Tabelas Implementadas:**
- ✅ `usuarios` - Autenticação
- ✅ `plano_financeiro` - Hierarquia de planos (4 níveis)
- ✅ `empresas` - Empresas do Grupo Selleta

### **Tabelas Futuras:**
- 🚧 `centros_custo` - Centros de custo por tipologia
- 🚧 `clientes_fornecedores` - Registro unificado
- 🚧 `contas_bancarias` - Contas do grupo
- 🚧 `transacoes` - Movimentação financeira
- 🚧 `status_negociacao` - Status customizáveis

---

## 📝 **PRÓXIMAS IMPLEMENTAÇÕES**

### **Ordem de Prioridade:**
1. **Centro de Custo** (tipologias: ADM, OP, OE)
2. **Clientes/Fornecedores** (registro unificado)
3. **Contas Bancárias** (integração bancária)
4. **Transações** (sistema de parcelas)
5. **Relatórios** (análises gerenciais)

### **Padrão de Implementação:**
1. **Extração**: Scripts para processar CSVs
2. **Backend**: Rotas API + validações
3. **Frontend**: Templates + CSS + JavaScript
4. **Refinamento**: Ajustes UX conforme feedback
5. **Documentação**: Atualizar este arquivo

---

## 🔄 **CHANGELOG**

### **v1.0 - Funcionalidades Base**
- ✅ Sistema de autenticação
- ✅ Dashboard principal
- ✅ Plano Financeiro (4 níveis hierárquicos)
- ✅ Empresas (7 empresas do Grupo Selleta)
- ✅ Gestão de usuários

### **Refinamentos Aplicados:**
- ✅ Plano Financeiro: Progressive disclosure (níveis 1-2 iniciais)
- ✅ Empresas: Filtro padrão ativas, botão Relatório, correção "Cuiabá"

---

**📌 Última atualização**: 2025-06-24
**📌 Responsável**: Sistema Financeiro Selleta
**📌 Versão**: 1.0