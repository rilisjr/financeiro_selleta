-- Sistema Financeiro Selleta - Estrutura Completa do Banco de Dados
-- Versão: 1.0.0
-- Data: 2025-06-23

-- Drop tables if exists (ordem inversa das dependências)
DROP TABLE IF EXISTS baixas;
DROP TABLE IF EXISTS transacoes;
DROP TABLE IF EXISTS contas_bancarias;
DROP TABLE IF EXISTS plano_financeiro;
DROP TABLE IF EXISTS centros_custo;
DROP TABLE IF EXISTS clientes_fornecedores;
DROP TABLE IF EXISTS empresas;
DROP TABLE IF EXISTS usuarios;

-- Tabela de Usuários
CREATE TABLE usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    senha TEXT NOT NULL,
    nome_completo VARCHAR(150) NOT NULL,
    email VARCHAR(150) UNIQUE,
    ativo BOOLEAN DEFAULT TRUE,
    perfil VARCHAR(20) DEFAULT 'operador', -- admin, financeiro, operador
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Empresas
CREATE TABLE empresas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    razao_social VARCHAR(200) NOT NULL,
    nome_fantasia VARCHAR(150),
    cnpj VARCHAR(20) UNIQUE NOT NULL,
    inscricao_estadual VARCHAR(30),
    endereco TEXT,
    municipio VARCHAR(100),
    estado CHAR(2),
    cep VARCHAR(10),
    telefone VARCHAR(20),
    email VARCHAR(150),
    ativo BOOLEAN DEFAULT TRUE,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Clientes/Fornecedores
CREATE TABLE clientes_fornecedores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome VARCHAR(200) NOT NULL,
    tipo_pessoa CHAR(2) CHECK (tipo_pessoa IN ('PF', 'PJ')) NOT NULL,
    cpf_cnpj VARCHAR(20) UNIQUE,
    tipo_cadastro VARCHAR(20) CHECK (tipo_cadastro IN ('Cliente', 'Fornecedor', 'Ambos')) DEFAULT 'Ambos',
    endereco TEXT,
    municipio VARCHAR(100),
    estado CHAR(2),
    cep VARCHAR(10),
    telefone VARCHAR(20),
    email VARCHAR(150),
    inscricao_estadual VARCHAR(30),
    observacoes TEXT,
    ativo BOOLEAN DEFAULT TRUE,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Centros de Custo
CREATE TABLE centros_custo (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    codigo VARCHAR(20) UNIQUE,
    nome VARCHAR(100) NOT NULL,
    descricao TEXT,
    tipologia VARCHAR(50) CHECK (tipologia IN ('ADM', 'OP', 'OE')), -- Administrativo, Operacional, Obras Empreendimento
    empresa_id INTEGER,
    ativo BOOLEAN DEFAULT TRUE,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (empresa_id) REFERENCES empresas(id)
);

-- Tabela de Plano Financeiro (Hierárquica)
CREATE TABLE plano_financeiro (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    codigo VARCHAR(20) UNIQUE NOT NULL,
    nome VARCHAR(150) NOT NULL,
    nivel INTEGER NOT NULL CHECK (nivel BETWEEN 1 AND 4),
    tipo VARCHAR(20) CHECK (tipo IN ('Receita', 'Despesa', 'Ambos')) DEFAULT 'Ambos',
    plano_pai_id INTEGER,
    ativo BOOLEAN DEFAULT TRUE,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (plano_pai_id) REFERENCES plano_financeiro(id)
);

-- Tabela de Contas Bancárias
CREATE TABLE contas_bancarias (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    banco_codigo VARCHAR(10) NOT NULL,
    banco_nome VARCHAR(100) NOT NULL,
    agencia VARCHAR(10) NOT NULL,
    conta VARCHAR(20) NOT NULL,
    tipo_conta VARCHAR(20) CHECK (tipo_conta IN ('Bancaria', 'Investimento', 'Poupanca')) DEFAULT 'Bancaria',
    mascara VARCHAR(50), -- Nome amigável
    empresa_id INTEGER NOT NULL,
    saldo_inicial DECIMAL(15,2) DEFAULT 0.00,
    saldo_atual DECIMAL(15,2) DEFAULT 0.00,
    ativo BOOLEAN DEFAULT TRUE,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (empresa_id) REFERENCES empresas(id),
    UNIQUE(banco_codigo, agencia, conta)
);

-- Tabela Principal de Transações
CREATE TABLE transacoes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    
    -- Identificação
    titulo VARCHAR(200) NOT NULL,
    numero_documento VARCHAR(50),
    parcela_atual INTEGER DEFAULT 1,
    parcela_total INTEGER DEFAULT 1,
    transacao_origem_id INTEGER, -- Para vincular parcelas
    
    -- Valores
    valor_original DECIMAL(15,2) NOT NULL CHECK (valor_original > 0),
    valor_entrada DECIMAL(15,2) DEFAULT 0.00,
    valor_saida DECIMAL(15,2) DEFAULT 0.00,
    
    -- Datas
    data_lancamento DATE NOT NULL DEFAULT CURRENT_DATE,
    data_vencimento DATE NOT NULL,
    data_competencia DATE, -- Mês/ano de competência
    
    -- Classificação
    tipo VARCHAR(20) CHECK (tipo IN ('Receita', 'Despesa')) NOT NULL,
    tipologia VARCHAR(50), -- ADM, OP, OE
    
    -- Relacionamentos
    cliente_fornecedor_id INTEGER NOT NULL,
    centro_custo_id INTEGER NOT NULL,
    empresa_id INTEGER NOT NULL,
    plano_financeiro_id INTEGER NOT NULL,
    usuario_id INTEGER NOT NULL,
    
    -- Status
    status_negociacao VARCHAR(20) CHECK (status_negociacao IN ('Aprovado', 'Em Analise', 'Cancelado', 'Pendente')) DEFAULT 'Pendente',
    status_pagamento VARCHAR(20) CHECK (status_pagamento IN ('Realizado', 'A Realizar', 'Cancelado')) DEFAULT 'A Realizar',
    
    -- Localização
    municipio VARCHAR(100),
    
    -- Observações
    observacao TEXT,
    
    -- Controle
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign Keys
    FOREIGN KEY (cliente_fornecedor_id) REFERENCES clientes_fornecedores(id),
    FOREIGN KEY (centro_custo_id) REFERENCES centros_custo(id),
    FOREIGN KEY (empresa_id) REFERENCES empresas(id),
    FOREIGN KEY (plano_financeiro_id) REFERENCES plano_financeiro(id),
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
    FOREIGN KEY (transacao_origem_id) REFERENCES transacoes(id)
);

-- Tabela de Baixas/Liquidações
CREATE TABLE baixas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    transacao_id INTEGER NOT NULL,
    conta_bancaria_id INTEGER NOT NULL,
    
    -- Valores
    valor_previsto DECIMAL(15,2) NOT NULL,
    valor_pago DECIMAL(15,2) NOT NULL,
    valor_juros DECIMAL(15,2) DEFAULT 0.00,
    valor_desconto DECIMAL(15,2) DEFAULT 0.00,
    valor_multa DECIMAL(15,2) DEFAULT 0.00,
    
    -- Datas
    data_baixa DATE NOT NULL,
    hora_baixa TIME DEFAULT CURRENT_TIME,
    
    -- Informações adicionais
    forma_pagamento VARCHAR(50), -- PIX, TED, Boleto, Cartão, Dinheiro
    numero_comprovante VARCHAR(100),
    observacao TEXT,
    
    -- Controle
    usuario_id INTEGER NOT NULL,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign Keys
    FOREIGN KEY (transacao_id) REFERENCES transacoes(id),
    FOREIGN KEY (conta_bancaria_id) REFERENCES contas_bancarias(id),
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);

-- Índices para melhor performance
CREATE INDEX idx_transacoes_data ON transacoes(data_vencimento);
CREATE INDEX idx_transacoes_tipo ON transacoes(tipo);
CREATE INDEX idx_transacoes_status_pag ON transacoes(status_pagamento);
CREATE INDEX idx_transacoes_cliente ON transacoes(cliente_fornecedor_id);
CREATE INDEX idx_transacoes_centro ON transacoes(centro_custo_id);
CREATE INDEX idx_transacoes_empresa ON transacoes(empresa_id);
CREATE INDEX idx_baixas_data ON baixas(data_baixa);
CREATE INDEX idx_plano_codigo ON plano_financeiro(codigo);

-- Views úteis
CREATE VIEW vw_transacoes_pendentes AS
SELECT 
    t.*,
    cf.nome as cliente_fornecedor_nome,
    cc.nome as centro_custo_nome,
    e.nome_fantasia as empresa_nome,
    pf.codigo || ' - ' || pf.nome as plano_financeiro_completo
FROM transacoes t
JOIN clientes_fornecedores cf ON t.cliente_fornecedor_id = cf.id
JOIN centros_custo cc ON t.centro_custo_id = cc.id
JOIN empresas e ON t.empresa_id = e.id
JOIN plano_financeiro pf ON t.plano_financeiro_id = pf.id
WHERE t.status_pagamento = 'A Realizar';

CREATE VIEW vw_fluxo_caixa AS
SELECT 
    data_vencimento as data,
    tipo,
    SUM(CASE WHEN tipo = 'Receita' THEN valor_original ELSE 0 END) as total_receitas,
    SUM(CASE WHEN tipo = 'Despesa' THEN valor_original ELSE 0 END) as total_despesas,
    SUM(CASE WHEN tipo = 'Receita' THEN valor_original ELSE -valor_original END) as saldo_dia
FROM transacoes
WHERE status_pagamento = 'A Realizar'
GROUP BY data_vencimento, tipo
ORDER BY data_vencimento;

-- Triggers para atualizar timestamps
CREATE TRIGGER update_usuarios_timestamp 
AFTER UPDATE ON usuarios
BEGIN
    UPDATE usuarios SET atualizado_em = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER update_empresas_timestamp 
AFTER UPDATE ON empresas
BEGIN
    UPDATE empresas SET atualizado_em = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER update_clientes_timestamp 
AFTER UPDATE ON clientes_fornecedores
BEGIN
    UPDATE clientes_fornecedores SET atualizado_em = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER update_centros_timestamp 
AFTER UPDATE ON centros_custo
BEGIN
    UPDATE centros_custo SET atualizado_em = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER update_plano_timestamp 
AFTER UPDATE ON plano_financeiro
BEGIN
    UPDATE plano_financeiro SET atualizado_em = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER update_contas_timestamp 
AFTER UPDATE ON contas_bancarias
BEGIN
    UPDATE contas_bancarias SET atualizado_em = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER update_transacoes_timestamp 
AFTER UPDATE ON transacoes
BEGIN
    UPDATE transacoes SET atualizado_em = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Trigger para atualizar valores de entrada/saída baseado no tipo
CREATE TRIGGER set_valores_transacao
AFTER INSERT ON transacoes
BEGIN
    UPDATE transacoes 
    SET 
        valor_entrada = CASE WHEN NEW.tipo = 'Receita' THEN NEW.valor_original ELSE 0 END,
        valor_saida = CASE WHEN NEW.tipo = 'Despesa' THEN NEW.valor_original ELSE 0 END
    WHERE id = NEW.id;
END;

-- Dados iniciais de exemplo
INSERT INTO usuarios (username, senha, nome_completo, email, perfil) VALUES
('admin', 'scrypt:32768:8:1$Y5JgRFvlTxJHxKtR$2e3a5a3a2bdc5d0c2eaeb59a87287c9ac1fbc10cdba44c17c33ee5e95df93c2e4cf3b87c088055b0bf7b27b1a6eb2026df6cf21e67a72ffe91f9fe93c3f9c5f4', 'Administrador', 'admin@selleta.com.br', 'admin');

-- Dados das empresas baseados nos CSVs
INSERT INTO empresas (razao_social, nome_fantasia, cnpj) VALUES
('SELLETA ARQUITETURA E CONSTRUCAO LTDA', 'Selleta Arquitetura', '00.000.001/0001-00'),
('JNRR CONSTRUÇÃO LTDA', 'JNRR Construção', '00.000.002/0001-00'),
('SELLETA INFRAESTRUTURA E LOGÍSTICA LTDA', 'Selleta Infraestrutura', '00.000.003/0001-00'),
('RESIDENCIAL JATOBA SPE LTDA', 'Residencial Jatoba', '00.000.004/0001-00'),
('S.I ESTRUTURA METALICA E PRE MOLDADO LTDA', 'SI Estrutura', '00.000.005/0001-00'),
('RLS CONTABILIDADE E CONSULTORIA EMPRESARIAL LTDA', 'RLS Contabilidade', '00.000.006/0001-00');