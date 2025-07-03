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

### 🏗️ **Centro de Custo**

#### `/centro_custo` (GET)
- **Descrição**: Gestão avançada de centros de custo com sistema de máscaras
- **Template**: `centro_custo.html`
- **CSS**: `centro_custo.css`
- **JavaScript**: `centro_custo.js`
- **Conceito Visual**:
  - Interface multi-visualização: Cards, Tabela, Estatísticas
  - KPI dashboard interativo (Nativos/Dependentes/Genéricos/Total)
  - Sistema de filtros avançados por empresa, tipologia, categoria
  - Sistema de relatórios (6 tipos diferentes)
  - Dual naming: máscara_cc (UI) + centro_custo_original (BD)
- **Dados**: 132 centros únicos extraídos e categorizados
- **Categorias**: Nativo (proprietário), Dependente (usa de outra), Genérico (uso comum)
- **Tipologias**: Obra Empreendimento, Obra Privada, Administrativo
- **Status**: ✅ Implementado e refinado
- **Autenticação**: Obrigatória

#### **API Sub-rotas:**
- `GET /api/centros_custo` - Listar centros com JOIN empresas
- `POST /api/centros_custo` - Criar novo centro
- `PUT /api/centros_custo/<id>` - Atualizar centro existente

#### **Sistema de Máscaras (#memorize):**
- **mascara_cc**: Nome limpo para interface do usuário
- **centro_custo_original**: Nome específico para mesclagem com BD anterior
- **Lógica**: Interface usa máscara, backend usa original para associação de transações

---

## 👥 **MÓDULO: PESSOAS**

### 🤝 **Clientes/Fornecedores** ✅ **IMPLEMENTADO COMPLETO**

#### **Sistema de Detecção Inteligente:**
- **2.083 fornecedores únicos** migrados para banco
- **Sistema Fuzzy Matching**: Detecção automática com 44.1% de precisão
- **Detecção Forçada**: 646 empresas declaradas automaticamente
- **Correções Aplicadas**: Matches perdidos recuperados (RAFAEL RIZZ, JOAO BARBOZ)
- **100% de Cobertura**: Todos fornecedores categorizados
- **Flags de Auditoria**: `deteccao_forcada` e `deteccao_corrigida`

#### `/clientes_fornecedores` (GET) → redireciona para `/fornecedores`
- **Descrição**: Gestão completa de fornecedores com sistema de detecção
- **Template**: `fornecedores.html`
- **CSS**: Integrado com paleta Selleta
- **JavaScript**: `fornecedores.js`
- **Conceito Visual**:
  - Dashboard KPI interativo (6 métricas principais)
  - Dual view: Cards responsivos + Tabela detalhada
  - Filtros avançados: Método, Tipo, Flags especiais
  - Sistema de badges coloridos por tipo de detecção
  - CRUD completo com validações
  - Exportação CSV
- **Status**: ✅ **Implementado e ativo**
- **Autenticação**: Obrigatória

#### **API Sub-rotas:**
- `GET /api/fornecedores` - Listar fornecedores com todos os dados
- `POST /api/fornecedores` - Criar novo fornecedor
- `PUT /api/fornecedores/<id>` - Atualizar fornecedor existente
- `DELETE /api/fornecedores/<id>` - Exclusão lógica (soft delete)

#### **Métricas do Sistema:**
- **Sistema Original**: 1.329 fornecedores (R$ 72.8M)
- **Detecção Forçada**: 646 fornecedores (R$ 3.9M)
- **Detecção Fuzzy**: 101 fornecedores (R$ 9.1M)
- **Correções**: 2 fornecedores (R$ 308K)
- **Genéricos**: 5 fornecedores (R$ 2.9M)
- **Total Movimentado**: R$ 88.1 milhões

---

## 🏦 **MÓDULO: FINANCEIRO**

### 💳 **Contas Bancárias** ⚠️ CRÍTICO - Debugging em andamento
#### `/conta_bancaria` (GET)
- **Descrição**: Interface completa para gestão de contas bancárias
- **Template**: `conta_bancaria.html`
- **Funcionalidades**:
  - KPI Dashboard (Bancárias, Saldo Total Ativas, Bancos, Total)
  - Dual view: Tabela (✅ funcional) + Cards (❌ quebrada)
  - Filtros: Banco, Tipo, Empresa, Status
  - CRUD completo com validações
  - Sistema de soft delete
- **Status**: 🚨 **DEBUGGING CRÍTICO**
  - ✅ Backend/API funcionando
  - ✅ Tabela view operacional  
  - ❌ Cards view não renderiza
  - ❌ Filtro padrão "Ativa" perdido
- **Autenticação**: Obrigatória

#### **API Sub-rotas:**
- `GET /api/contas_bancarias` - Listar contas bancárias
- `POST /api/contas_bancarias` - Criar nova conta
- `PUT /api/contas_bancarias/<id>` - Atualizar conta existente
- `DELETE /api/contas_bancarias/<id>` - Exclusão lógica
- `GET /api/bancos` - Listar bancos únicos

#### **Dados do Sistema:**
- **Total Contas**: 55 (27 com banco, 28 ex-TRAVADO=NULL)
- **Contas Ativas**: 2 (150264-6: +R$ 1.000, 47115-2: -R$ 5.400)
- **Saldo Total Ativas**: -R$ 4.400,00 (exibe em vermelho)
- **Bancos Únicos**: 4 instituições

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
- ✅ `empresas` - Empresas do Grupo Selleta (7 empresas)
- ✅ `centros_custo` - Centros de custo com sistema de máscaras (132 registros)
- ✅ `fornecedores` - **NOVO**: 2.083 fornecedores com detecção inteligente

### **Tabelas Futuras:**
- 🚧 `contas_bancarias` - Contas do grupo
- 🚧 `transacoes` - Movimentação financeira (nova estrutura)
- 🚧 `status_negociacao` - Status customizáveis

---

## 📝 **PRÓXIMAS IMPLEMENTAÇÕES**

### **Ordem de Prioridade:**
1. ✅ **Centro de Custo** - Implementado (tipologias: ADM, OP, OE)
2. ✅ **Clientes/Fornecedores** - **CONCLUÍDO** com sistema de detecção inteligente
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

### **v1.1 - Módulos Avançados**
- ✅ Centro de Custo (132 registros com sistema de máscaras)
- ✅ Interface multi-visualização (Cards/Tabela/Estatísticas)
- ✅ Sistema de categorização inteligente (Nativo/Dependente/Genérico)
- ✅ Consolidação Clientes/Fornecedores (3.682 registros unificados)
- ✅ Sistema de vínculos e correspondências automáticas

### **v1.2 - Sistema de Fornecedores Inteligente**
- ✅ **Fornecedores com Detecção Fuzzy** (2.083 registros únicos)
- ✅ **Sistema de Matching Automático** (44.1% de precisão)
- ✅ **Detecção Forçada** (646 empresas declaradas)
- ✅ **Correções Aplicadas** (RAFAEL RIZZ, JOAO BARBOZ recuperados)
- ✅ **CRUD Completo** com interface dual (Cards/Tabela)
- ✅ **KPI Dashboard** (6 métricas de detecção)
- ✅ **Flags de Auditoria** para rastreamento
- ✅ **100% de Cobertura** via categorias genéricas

### **Refinamentos Aplicados:**
- ✅ Plano Financeiro: Progressive disclosure (níveis 1-2 iniciais)
- ✅ Empresas: Filtro padrão ativas, botão Relatório, correção "Cuiabá"
- ✅ Centro de Custo: KPI dashboard, filtros avançados, 6 tipos de relatórios
- ✅ **Fornecedores**: Sistema de detecção inteligente + CRUD completo

---

**📌 Última atualização**: 2025-06-25
**📌 Responsável**: Sistema Financeiro Selleta
**📌 Versão**: 1.2 - Sistema de Fornecedores Inteligente