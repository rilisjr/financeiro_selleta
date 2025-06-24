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

#### 1. `centros_custo`
```sql
CREATE TABLE centros_custo (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome VARCHAR(100) NOT NULL UNIQUE,
    descricao TEXT,
    ativo BOOLEAN DEFAULT TRUE
);
```

#### 2. `categorias` (Plano de Contas)
```sql
CREATE TABLE categorias (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    codigo VARCHAR(20) UNIQUE,
    nome VARCHAR(100) NOT NULL,
    nivel INTEGER NOT NULL,
    categoria_pai_id INTEGER,
    tipo ENUM('Receita', 'Despesa', 'Ambos'),
    FOREIGN KEY (categoria_pai_id) REFERENCES categorias(id)
);
```

#### 3. `clientes_fornecedores`
```sql
CREATE TABLE clientes_fornecedores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome VARCHAR(200) NOT NULL,
    tipo ENUM('Cliente', 'Fornecedor', 'Ambos'),
    cnpj_cpf VARCHAR(20) UNIQUE,
    municipio VARCHAR(100),
    estado CHAR(2),
    ativo BOOLEAN DEFAULT TRUE
);
```

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

## 🚀 PRÓXIMOS PASSOS

1. **Migração de Dados**: Script para converter do CSV atual
2. **Validações**: Implementar triggers para regras de negócio
3. **Views**: Criar views para relatórios comuns
4. **Procedures**: Stored procedures para operações complexas
5. **Backup**: Estratégia de backup automático

Esta estrutura é robusta o suficiente para uma empresa de médio porte, mantendo simplicidade para não ser excessivamente complexa.