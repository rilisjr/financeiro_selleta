# 📊 Modelo Recomendado - Tabela de Transações

## 🎯 Estrutura Proposta

### Tabela: `transacoes`

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| **id** | INTEGER PRIMARY KEY | ✅ | Identificador único |
| **titulo** | VARCHAR(200) | ✅ | Descrição principal da transação |
| **numero_documento** | VARCHAR(50) | ❌ | NF, contrato, etc |
| **parcela_atual** | INTEGER | ✅ | Número da parcela atual (default: 1) |
| **parcela_total** | INTEGER | ✅ | Total de parcelas (default: 1) |
| **transacao_origem_id** | INTEGER FK | ❌ | ID da transação original (para parcelas) |
| **valor_original** | DECIMAL(15,2) | ✅ | Valor da transação |
| **data_lancamento** | DATE | ✅ | Data de criação (default: hoje) |
| **data_vencimento** | DATE | ✅ | Data prevista pagamento |
| **data_competencia** | DATE | ❌ | Mês/ano de competência |
| **tipo** | ENUM | ✅ | 'Receita' ou 'Despesa' |
| **cliente_fornecedor_id** | INTEGER FK | ✅ | Referência ao credor/cliente |
| **centro_custo_id** | INTEGER FK | ✅ | Centro de custo |
| **empresa_id** | INTEGER FK | ✅ | Empresa do grupo |
| **plano_financeiro_id** | INTEGER FK | ✅ | Categoria financeira |
| **status_negociacao** | ENUM | ✅ | Status da negociação |
| **status_pagamento** | ENUM | ✅ | Status do pagamento |
| **observacao** | TEXT | ❌ | Observações gerais |
| **usuario_id** | INTEGER FK | ✅ | Usuário que criou |
| **criado_em** | TIMESTAMP | ✅ | Data/hora criação |
| **atualizado_em** | TIMESTAMP | ✅ | Última atualização |

## 🔄 Comparação: Estrutura Atual vs Proposta

### Mudanças Necessárias:

| Campo Atual | Campo Novo | Ação |
|-------------|------------|------|
| origem | cliente_fornecedor_id | 🔄 Migrar para FK |
| descricao | titulo | 🔄 Renomear |
| tipo (Fixo/Variável) | - | ❌ Remover |
| valor | valor_original | 🔄 Renomear e ajustar tipo |
| modelo (Renda/Custo) | tipo (Receita/Despesa) | 🔄 Renomear valores |
| data | data_vencimento | 🔄 Renomear |
| - | data_lancamento | ✅ Adicionar (usar data atual) |
| - | data_competencia | ✅ Adicionar |
| - | parcela_atual/total | ✅ Adicionar |
| - | centro_custo_id | ✅ Adicionar |
| - | empresa_id | ✅ Adicionar |
| - | plano_financeiro_id | ✅ Adicionar |
| - | status_negociacao | ✅ Adicionar |
| - | status_pagamento | ✅ Adicionar |
| - | observacao | ✅ Adicionar |
| - | numero_documento | ✅ Adicionar |
| - | usuario_id | ✅ Adicionar |
| - | timestamps | ✅ Adicionar |

## 🏗️ SQL de Criação Recomendado

```sql
CREATE TABLE transacoes_nova (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    
    -- Identificação
    titulo VARCHAR(200) NOT NULL,
    numero_documento VARCHAR(50),
    parcela_atual INTEGER DEFAULT 1,
    parcela_total INTEGER DEFAULT 1,
    transacao_origem_id INTEGER,
    
    -- Valores
    valor_original DECIMAL(15,2) NOT NULL CHECK (valor_original > 0),
    
    -- Datas
    data_lancamento DATE NOT NULL DEFAULT CURRENT_DATE,
    data_vencimento DATE NOT NULL,
    data_competencia DATE,
    
    -- Classificação
    tipo VARCHAR(20) CHECK (tipo IN ('Receita', 'Despesa')) NOT NULL,
    
    -- Relacionamentos (inicialmente nullable para migração)
    cliente_fornecedor_id INTEGER,
    centro_custo_id INTEGER,
    empresa_id INTEGER,
    plano_financeiro_id INTEGER,
    usuario_id INTEGER,
    
    -- Status
    status_negociacao VARCHAR(20) DEFAULT 'Pendente',
    status_pagamento VARCHAR(20) DEFAULT 'A Realizar',
    
    -- Observações
    observacao TEXT,
    
    -- Controle
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign Keys (adicionar após migração)
    FOREIGN KEY (transacao_origem_id) REFERENCES transacoes_nova(id),
    FOREIGN KEY (cliente_fornecedor_id) REFERENCES clientes_fornecedores(id),
    FOREIGN KEY (centro_custo_id) REFERENCES centros_custo(id),
    FOREIGN KEY (empresa_id) REFERENCES empresas(id),
    FOREIGN KEY (plano_financeiro_id) REFERENCES plano_financeiro(id),
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);
```

## 📝 Estratégia de Migração

### Fase 1: Preparação
1. Criar tabelas auxiliares (empresas, centros_custo, etc)
2. Popular tabelas auxiliares com dados dos CSVs
3. Criar nova tabela transacoes_nova

### Fase 2: Migração de Dados
```sql
-- Migrar dados existentes
INSERT INTO transacoes_nova (
    titulo,
    valor_original,
    data_vencimento,
    tipo,
    observacao,
    usuario_id
)
SELECT 
    COALESCE(descricao, 'Sem descrição'),
    valor,
    data,
    CASE 
        WHEN modelo = 'Renda' THEN 'Receita'
        WHEN modelo = 'Custo' THEN 'Despesa'
    END,
    origem, -- colocar em observação temporariamente
    1 -- assumir usuário ID 1
FROM transacoes;
```

### Fase 3: Ajustes
1. Vincular transações aos clientes_fornecedores corretos
2. Atribuir centros de custo padrão
3. Definir empresa padrão
4. Configurar planos financeiros

### Fase 4: Finalização
1. Renomear tabela antiga para backup
2. Renomear nova tabela para 'transacoes'
3. Ajustar código da aplicação

## 🚀 Benefícios da Nova Estrutura

1. **Rastreabilidade Completa**: Quem, quando, o quê
2. **Parcelamento Nativo**: Suporte a parcelas com vínculo
3. **Multi-empresa**: Segregação por empresa
4. **Categorização Rica**: Centro de custo + Plano financeiro
5. **Status Duplo**: Negociação e Pagamento independentes
6. **Flexibilidade**: Campos opcionais para diversos cenários
7. **Performance**: Índices otimizados para consultas comuns

## ⚠️ Pontos de Atenção

1. **Migração de 'origem'**: Precisará análise manual para vincular aos fornecedores
2. **Tipo Fixo/Variável**: Conceito removido - avaliar se necessário em outro lugar
3. **Validações**: Implementar no código Python as regras de negócio
4. **Defaults**: Definir valores padrão para campos novos na migração

## 📊 Campos Calculados (não armazenar)

Estes campos devem ser calculados em tempo real:
- `valor_entrada`: valor_original se tipo = 'Receita', senão 0
- `valor_saida`: valor_original se tipo = 'Despesa', senão 0
- `plano_financeiro_completo`: concatenação da hierarquia
- `dias_atraso`: data_atual - data_vencimento (se vencido)
- `saldo_parcelas`: soma das parcelas pagas vs total