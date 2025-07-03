# 📊 Estrutura Profissional do Banco de Dados - Sistema Financeiro

## 🎯 Análise das 19 Colunas Atuais

### 1. **Cliente/Fornecedor**
- **Tipo Recomendado**: `VARCHAR(200)`
- **Constraints**: `NOT NULL`
- **Índice**: `INDEX` para buscas rápidas
- **Considerações**: Considere criar tabela separada de clientes/fornecedores

### 2. **Título e Parcela**
- **Tipo Recomendado**: `VARCHAR(150)`
- **Constraints**: `NOT NULL`
- **Formato**: "Título - Parcela X/Y"
- **Sugestão**: Separar em duas colunas: `titulo VARCHAR(100)` e `parcela VARCHAR(20)`

### 3. **Valor**
- **Tipo Recomendado**: `DECIMAL(15,2)`
- **Constraints**: `NOT NULL, CHECK (valor >= 0)`
- **Justificativa**: 15 dígitos totais, 2 decimais (suporta até trilhões)

### 4. **Data**
- **Tipo Recomendado**: `DATE`
- **Constraints**: `NOT NULL`
- **Índice**: `INDEX` para filtros por período

### 5. **Centro de Custo**
- **Tipo Recomendado**: `VARCHAR(100)`
- **Constraints**: `NOT NULL`
- **Sugestão**: Criar tabela `centros_custo` e usar `centro_custo_id INTEGER`

### 6. **Empresa**
- **Tipo Recomendado**: `VARCHAR(150)`
- **Constraints**: `NOT NULL`
- **Sugestão**: Criar tabela `empresas` se houver múltiplas

### 7. **Entradas** (valor)
- **Tipo Recomendado**: `DECIMAL(15,2)`
- **Constraints**: `DEFAULT 0.00`
- **Lógica**: Preenchido apenas quando tipo = 'Receita'

### 8. **Município**
- **Tipo Recomendado**: `VARCHAR(100)`
- **Constraints**: `NULL` (opcional)
- **Sugestão**: Normalizar com tabela de municípios

### 9-11. **Plano Financeiro (3 níveis)**
- **Tipo Recomendado**: 
  - `pf_grau1 VARCHAR(100) NOT NULL`
  - `pf_grau2 VARCHAR(100)`
  - `pf_grau3 VARCHAR(100)`
- **Sugestão**: Criar tabela hierárquica de plano de contas

### 12. **Plano Financeiro Final**
- **Tipo Recomendado**: `VARCHAR(300)`
- **Formato**: "Grau1 > Grau2 > Grau3"
- **Constraints**: `GENERATED` (calculado automaticamente)

### 13. **Status Negociação**
- **Tipo Recomendado**: `ENUM('Aprovado', 'Em Análise', 'Cancelado', 'Pendente')`
- **Constraints**: `NOT NULL DEFAULT 'Pendente'`

### 14. **Saídas** (valor)
- **Tipo Recomendado**: `DECIMAL(15,2)`
- **Constraints**: `DEFAULT 0.00`
- **Lógica**: Preenchido apenas quando tipo = 'Despesa'

### 15. **Status Pagamento**
- **Tipo Recomendado**: `ENUM('Realizado', 'A Realizar')`
- **Constraints**: `NOT NULL DEFAULT 'A Realizar'`

### 16. **Tipo**
- **Tipo Recomendado**: `ENUM('Receita', 'Despesa')`
- **Constraints**: `NOT NULL`

### 17. **Tipologia do Lançamento**
- **Tipo Recomendado**: `VARCHAR(100)`
- **Exemplos**: "Venda", "Compra", "Serviço", "Impostos"

### 18. **Previsão**
- **Tipo Recomendado**: `DECIMAL(15,2)`
- **Constraints**: `DEFAULT 0.00`
- **Uso**: Valor previsto vs realizado

### 19. **Observação**
- **Tipo Recomendado**: `TEXT`
- **Constraints**: `NULL`
- **Uso**: Notas e comentários adicionais

## 🏗️ ESTRUTURA RECOMENDADA PARA O BANCO

### Tabela Principal: `transacoes`
```sql
CREATE TABLE transacoes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    
    -- Identificação
    cliente_fornecedor VARCHAR(200) NOT NULL,
    titulo VARCHAR(100) NOT NULL,
    parcela VARCHAR(20),
    
    -- Valores
    valor DECIMAL(15,2) NOT NULL CHECK (valor >= 0),
    valor_entrada DECIMAL(15,2) DEFAULT 0.00,
    valor_saida DECIMAL(15,2) DEFAULT 0.00,
    valor_previsto DECIMAL(15,2) DEFAULT 0.00,
    
    -- Datas
    data_transacao DATE NOT NULL,
    data_vencimento DATE,
    data_pagamento DATE,
    
    -- Classificação
    tipo ENUM('Receita', 'Despesa') NOT NULL,
    tipologia VARCHAR(100),
    centro_custo VARCHAR(100) NOT NULL,
    empresa VARCHAR(150) NOT NULL,
    
    -- Plano Financeiro
    pf_grau1 VARCHAR(100) NOT NULL,
    pf_grau2 VARCHAR(100),
    pf_grau3 VARCHAR(100),
    
    -- Status
    status_negociacao ENUM('Aprovado', 'Em Análise', 'Cancelado', 'Pendente') DEFAULT 'Pendente',
    status_pagamento ENUM('Realizado', 'A Realizar') DEFAULT 'A Realizar',
    
    -- Localização
    municipio VARCHAR(100),
    estado CHAR(2),
    
    -- Observações
    observacao TEXT,
    
    -- Controle
    usuario_id INTEGER,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Foreign Keys
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);

-- Índices recomendados
CREATE INDEX idx_data ON transacoes(data_transacao);
CREATE INDEX idx_tipo ON transacoes(tipo);
CREATE INDEX idx_status_pagamento ON transacoes(status_pagamento);
CREATE INDEX idx_cliente ON transacoes(cliente_fornecedor);
CREATE INDEX idx_centro_custo ON transacoes(centro_custo);
```

### Tabelas Auxiliares Recomendadas:

#### 1. `centros_custo` ✅ **IMPLEMENTADO**
```sql
CREATE TABLE centros_custo (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    centro_custo_original VARCHAR(200) NOT NULL,
    mascara_cc VARCHAR(200) NOT NULL,
    empresa_id INTEGER NOT NULL,
    tipologia VARCHAR(50) NOT NULL,
    categoria VARCHAR(20) NOT NULL,
    descricao TEXT,
    ativo INTEGER DEFAULT 1,
    data_criacao DATETIME DEFAULT CURRENT_TIMESTAMP,
    data_atualizacao DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (empresa_id) REFERENCES empresas(id)
);
```

**Implementações Especiais:**
- **Sistema de Máscaras**: `centro_custo_original` (BD merge) + `mascara_cc` (UI)
- **Categorização**: Nativo, Dependente, Genérico
- **Tipologias**: Obra Empreendimento, Obra Privada, Administrativo
- **132 registros** migrados do sistema anterior

#### 1.1. `empresas` ✅ **IMPLEMENTADO**
```sql
CREATE TABLE empresas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    codigo VARCHAR(10) NOT NULL UNIQUE,
    nome VARCHAR(200) NOT NULL,
    grupo VARCHAR(100) DEFAULT 'Grupo Selleta',
    cnpj VARCHAR(20),
    endereco VARCHAR(300),
    municipio VARCHAR(100),
    cep VARCHAR(10),
    telefone VARCHAR(20),
    ativo INTEGER DEFAULT 1,
    data_criacao DATETIME DEFAULT CURRENT_TIMESTAMP,
    data_atualizacao DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**Implementações Especiais:**
- **7 empresas** extraídas do sistema Sienge
- **Distribuição geográfica**: Cuiabá (4), Pontes e Lacerda (2), Tapurah (1)
- **Códigos únicos** para identificação
- **Interface com filtros** por município e status

#### 2. `plano_financeiro` ✅ **IMPLEMENTADO** (Plano de Contas)
```sql
CREATE TABLE plano_financeiro (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    codigo VARCHAR(20) NOT NULL UNIQUE,
    nome VARCHAR(100) NOT NULL,
    nivel INTEGER NOT NULL,
    tipo VARCHAR(20) DEFAULT 'Ambos',
    plano_pai_id INTEGER,
    ativo INTEGER DEFAULT 1,
    criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
    atualizado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (plano_pai_id) REFERENCES plano_financeiro(id)
);
```

**Implementações Especiais:**
- **4 níveis hierárquicos** completos
- **Códigos automáticos** (1, 1.01, 1.01.01, 1.01.01.01)
- **Progressive disclosure** na interface
- **Tipos**: Receita, Despesa, Ambos

#### 3. `clientes_fornecedores` 🔗 **DADOS CONSOLIDADOS**
```sql
-- Estrutura proposta baseada na consolidação realizada
CREATE TABLE clientes_fornecedores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome_principal VARCHAR(200) NOT NULL,
    nome_alternativo VARCHAR(200),
    categoria VARCHAR(30) NOT NULL, -- Cliente, Fornecedor, Cliente/Fornecedor
    tipo_vinculo VARCHAR(20) NOT NULL, -- MATCH, BD_ONLY, MERGE_ONLY
    prioridade_consolidacao INTEGER NOT NULL,
    
    -- Dados identificação
    cpf_cnpj VARCHAR(20),
    tipo_pessoa VARCHAR(20),
    
    -- Localização
    municipio_principal VARCHAR(100),
    municipio_bd VARCHAR(100),
    municipio_merge VARCHAR(100),
    
    -- Dados operacionais (do BD)
    total_transacoes INTEGER DEFAULT 0,
    valor_liquido DECIMAL(15,2) DEFAULT 0.00,
    empresas_relacionadas TEXT,
    
    -- Vínculos para rastreabilidade
    vinculo_bd VARCHAR(20),
    vinculo_merge VARCHAR(20),
    
    -- Controle
    ativo INTEGER DEFAULT 1,
    observacoes TEXT,
    data_criacao DATETIME DEFAULT CURRENT_TIMESTAMP,
    data_atualizacao DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**Dados Consolidados Prontos:**
- **3.682 registros** unificados de múltiplas fontes
- **Sistema de vínculos** para rastreabilidade completa
- **Priorização automática** por relevância operacional
- **1.420 correspondências** automáticas encontradas

## 🔐 BOAS PRÁTICAS IMPLEMENTADAS

1. **Normalização**: Evitar redundância de dados
2. **Integridade**: Constraints para garantir dados válidos
3. **Performance**: Índices nas colunas mais consultadas
4. **Auditoria**: Campos de controle (criado_em, atualizado_em)
5. **Escalabilidade**: Estrutura preparada para crescimento
6. **Flexibilidade**: Campos opcionais para diferentes cenários

## 📈 VANTAGENS DA ESTRUTURA PROPOSTA

1. **Separação clara entre Receitas e Despesas**
2. **Controle de status duplo** (negociação e pagamento)
3. **Hierarquia de plano de contas** (3 níveis)
4. **Rastreabilidade** com timestamps
5. **Relacionamentos adequados** entre tabelas
6. **Validações no banco** (não apenas na aplicação)

## ✅ IMPLEMENTAÇÕES REALIZADAS

1. **✅ Tabelas Base**: usuarios, plano_financeiro, empresas, centros_custo
2. **✅ Dados Migrados**: 7 empresas, 132 centros de custo
3. **✅ Sistema de Máscaras**: Implementado para centros de custo
4. **✅ Consolidação**: 3.682 clientes/fornecedores unificados
5. **✅ APIs Completas**: CRUD para todas as tabelas implementadas
6. **✅ Interfaces**: Frontend completo com filtros e relatórios

## 🚀 PRÓXIMOS PASSOS

1. **🔗 Migração Clientes/Fornecedores**: Importar dados consolidados para o banco
2. **🏦 Contas Bancárias**: Extrair e implementar dados bancários
3. **💰 Transações**: Migrar para nova estrutura com relacionamentos
4. **📊 Views Analíticas**: Criar views para relatórios gerenciais
5. **🔐 Triggers**: Implementar regras de negócio automatizadas
6. **💾 Backup**: Estratégia de backup automático

## 📊 ESTATÍSTICAS ATUAIS

- **4 tabelas** implementadas e populadas
- **7 empresas** do Grupo Selleta migradas
- **132 centros de custo** categorizados
- **3.682 clientes/fornecedores** consolidados
- **Sistema de vínculos** com 38.6% de correspondências automáticas

Esta estrutura já é robusta o suficiente para uma empresa de médio porte, com base sólida implementada e dados consolidados prontos para migração.