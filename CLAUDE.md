# 📊 Sistema Financeiro Selleta - Documentação Conceitual

## 🎯 Visão Geral
Sistema de gestão financeira multi-empresas para controle de transações (receitas/despesas), com hierarquia de planos financeiros, centros de custo e controle bancário integrado.

## 🏗️ Arquitetura do Sistema

### Entidades Principais

#### 1. **Transações** (Core)
- **ID único**: Identificador da transação
- **Título**: Descrição principal
- **Parcelas**: Sistema de parcelamento (ex: 3/10 = parcela 3 de 10)
- **Valor**: Valor monetário da transação
- **Data Lançamento**: Data de criação
- **Data Vencimento**: Data prevista para pagamento/recebimento
- **Tipo**: Receita ou Despesa
- **Status Negociação**: Aprovado, Em Análise, Cancelado, Pendente
- **Status Pagamento**: Realizado, A Realizar
- **Observações**: Notas adicionais

#### 2. **Clientes/Fornecedores**
- **Cadastro unificado**: Pode ser cliente, fornecedor ou ambos
- **Dados**: Nome, CPF/CNPJ, Município, Tipo (PF/PJ)
- **Relacionamento**: N transações para 1 cliente/fornecedor

#### 3. **Plano Financeiro** (Hierárquico)
- **4 níveis de hierarquia**:
  - Grau 1: `2 - SAÍDAS/CUSTOS/DESPESAS`
  - Grau 2: `2.01 - CUSTOS/DESPESAS OPERACIONAIS`
  - Grau 3: `2.01.01 - MATERIAIS E INSUMOS`
  - Grau 4: `2.01.01.01 - Aquisição de Bens Imóveis`
- **Estrutura numérica**: Facilita agrupamentos e relatórios

#### 4. **Centro de Custo**
- **Definição**: Departamento/projeto que origina a transação
- **Exemplos**: "Administrativo Selleta 43", "Residencial Jatoba", "MT DIESEL"
- **Tipologia associada**: ADM, OP (Operacional), OE (Obras Empreendimento)

#### 5. **Empresas**
- **Multi-tenant**: Sistema suporta múltiplas empresas
- **Exemplos**:
  - 1 - SELLETA ARQUITETURA E CONSTRUCAO LTDA
  - 2 - JNRR CONSTRUÇÃO LTDA
  - 3 - SELLETA INFRAESTRUTURA E LOGÍSTICA LTDA
  - 4 - RESIDENCIAL JATOBA SPE LTDA
  - 5 - S.I ESTRUTURA METALICA E PRE MOLDADO LTDA
  - 6 - RLS CONTABILIDADE E CONSULTORIA EMPRESARIAL LTDA

#### 6. **Contas Bancárias**
- **Dados**: Banco, Agência, Conta, Tipo (Bancária/Investimento)
- **Máscara**: Nome amigável para identificação
- **Vinculada à empresa**: Cada conta pertence a uma empresa

## 📋 Fluxo de Trabalho

### 1. **Lançamento de Transação**
```
1. Usuário acessa formulário de nova transação
2. Seleciona:
   - Tipo (Receita/Despesa)
   - Cliente/Fornecedor (dropdown searchable)
   - Plano Financeiro (dropdown hierárquico)
   - Centro de Custo (dropdown)
   - Empresa
   - Valor
   - Data de vencimento
3. Sistema de parcelamento:
   - Opção de parcela única ou múltiplas
   - Ao escolher "10x", sistema gera automaticamente:
     - 10 registros com valores divididos
     - Datas sequenciais (mensais)
     - Preview editável antes de confirmar
4. Status inicial: "A Realizar" e "Pendente"
```

### 2. **Baixa/Liquidação**
```
1. Usuário localiza transação pendente
2. Clica em "Efetuar Baixa"
3. Seleciona:
   - Conta bancária (de onde saiu/entrou o dinheiro)
   - Data efetiva do pagamento
   - Valor pago (pode diferir do previsto)
4. Sistema atualiza:
   - Status Pagamento → "Realizado"
   - Registra data/hora da baixa
   - Vincula à conta bancária
```

### 3. **Categorização de Dados**

#### Campos Inputáveis (Usuário define):
- Cliente/Fornecedor
- Título e descrição
- Valor
- Datas
- Centro de Custo
- Plano Financeiro
- Empresa
- Observações

#### Campos Calculáveis (Sistema define):
- ID da transação
- Parcela atual/total
- Valor de entrada (se tipo = Receita)
- Valor de saída (se tipo = Despesa)
- Timestamps de criação/atualização
- Saldos e totalizadores

## 🔧 Estrutura de Banco de Dados Necessária

### Tabelas Principais:
1. **transacoes**: Core do sistema
2. **clientes_fornecedores**: Cadastro unificado
3. **plano_financeiro**: Hierarquia de categorias
4. **centros_custo**: Departamentos/projetos
5. **empresas**: Multi-tenant
6. **contas_bancarias**: Controle bancário
7. **usuarios**: Autenticação e permissões
8. **baixas**: Registro de pagamentos/recebimentos

### Tabelas Auxiliares:
1. **status_negociacao**: Estados possíveis
2. **status_pagamento**: Estados de pagamento
3. **tipos_conta**: Bancária, Investimento, etc
4. **municipios**: Normalização de cidades

## 🚀 Funcionalidades Essenciais

### CRUD Completo:
- ✅ Clientes/Fornecedores
- ✅ Contas Bancárias
- ✅ Centros de Custo
- ✅ Planos Financeiros
- ✅ Empresas
- ✅ Transações

### Formulários Especializados:
1. **Lançamento de Transação**:
   - Validações em tempo real
   - Preview de parcelas
   - Sugestões baseadas em histórico

2. **Baixa de Título**:
   - Listagem de pendências
   - Filtros por vencimento
   - Baixa individual ou em lote

### Relatórios:
- Fluxo de caixa
- DRE por centro de custo
- Contas a pagar/receber
- Extrato por conta bancária

## 📝 Regras de Negócio

1. **Parcelamento**:
   - Mínimo: 1x (à vista)
   - Máximo: definir no sistema
   - Intervalo padrão: 30 dias

2. **Status**:
   - Transação só pode ser excluída se status = "Pendente"
   - Baixa realizada não pode ser revertida (apenas cancelada com justificativa)

3. **Permissões**:
   - Criar transação: todos usuários
   - Efetuar baixa: usuários com permissão financeira
   - Excluir: apenas administradores

4. **Validações**:
   - CPF/CNPJ válidos
   - Datas futuras para vencimentos
   - Valores > 0
   - Conta bancária ativa

## 🎨 Interface (Sugestões)

### Dashboard Principal:
- Cards com totalizadores (entradas, saídas, saldo)
- Gráficos de fluxo de caixa
- Alertas de vencimentos próximos
- Atalhos para ações frequentes

### Listagem de Transações:
- Filtros avançados (período, status, empresa, etc)
- Ordenação por colunas
- Ações em lote
- Export para Excel/PDF

### Formulários:
- Design limpo e intuitivo
- Validação em tempo real
- Máscaras de entrada (valores, datas, CPF/CNPJ)
- Autocomplete para campos relacionados

## 🔐 Segurança

- Autenticação por usuário/senha (hash bcrypt)
- Sessões com timeout
- Log de auditoria (quem, quando, o que)
- Backup automático do banco de dados
- Criptografia de dados sensíveis

## 📊 Integrações Futuras

- API REST para integrações externas
- Importação de extratos bancários (OFX)
- Integração com sistemas contábeis
- Geração de boletos
- Dashboard mobile

## 🛠️ Stack Tecnológica Atual

- **Backend**: Flask (Python)
- **Database**: SQLite (migrar para PostgreSQL em produção)
- **Frontend**: HTML/CSS/JS (considerar React/Vue)
- **Autenticação**: Werkzeug
- **Deploy**: Considerar Docker

## 📈 Métricas de Sucesso

1. Tempo de lançamento < 1 minuto
2. Precisão nos cálculos = 100%
3. Disponibilidade > 99.5%
4. Satisfação do usuário > 90%

---

**Última atualização**: 2025-06-23
**Versão**: 1.0.0