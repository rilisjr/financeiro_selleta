-- ESTRUTURA COMPLETA DO BANCO DE DADOS SELLETA
-- Gerado em: 01/07/2025 às 13:23:35
-- =-- =-- =-- =-- =-- =-- =-- =-- =-- =-- =-- =-- =-- =-- =-- =-- =-- =-- =-- =-- =-- =-- =-- =-- =-- =-- =-- =-- =-- =

-- TABELA: backup_plano_financeiro_original
--------------------------------------------------
CREATE TABLE backup_plano_financeiro_original(
  id INT,
  codigo TEXT,
  nome TEXT,
  nivel INT,
  tipo TEXT,
  plano_pai_id INT,
  ativo NUM,
  criado_em NUM,
  atualizado_em NUM,
  referencia TEXT
);

-- Colunas:
--   id: INT
--   codigo: TEXT
--   nome: TEXT
--   nivel: INT
--   tipo: TEXT
--   plano_pai_id: INT
--   ativo: NUM
--   criado_em: NUM
--   atualizado_em: NUM
--   referencia: TEXT

-- TABELA: centros_custo
--------------------------------------------------
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

-- Colunas:
--   id: INTEGER PRIMARY KEY
--   centro_custo_original: VARCHAR(200) NOT NULL
--   mascara_cc: VARCHAR(200) NOT NULL
--   empresa_id: INTEGER NOT NULL
--   tipologia: VARCHAR(50) NOT NULL
--   categoria: VARCHAR(20) NOT NULL
--   descricao: TEXT
--   ativo: INTEGER DEFAULT 1
--   data_criacao: DATETIME DEFAULT CURRENT_TIMESTAMP
--   data_atualizacao: DATETIME DEFAULT CURRENT_TIMESTAMP

-- TABELA: clientes_fornecedores
--------------------------------------------------
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

-- Colunas:
--   id: INTEGER PRIMARY KEY
--   nome: VARCHAR(200) NOT NULL
--   tipo_pessoa: CHAR(2) NOT NULL
--   cpf_cnpj: VARCHAR(20)
--   tipo_cadastro: VARCHAR(20) DEFAULT 'Ambos'
--   endereco: TEXT
--   municipio: VARCHAR(100)
--   estado: CHAR(2)
--   cep: VARCHAR(10)
--   telefone: VARCHAR(20)
--   email: VARCHAR(150)
--   inscricao_estadual: VARCHAR(30)
--   observacoes: TEXT
--   ativo: BOOLEAN DEFAULT TRUE
--   criado_em: TIMESTAMP DEFAULT CURRENT_TIMESTAMP
--   atualizado_em: TIMESTAMP DEFAULT CURRENT_TIMESTAMP

-- TABELA: conta_bancaria
--------------------------------------------------
CREATE TABLE "conta_bancaria" (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                agencia TEXT NOT NULL,
                banco TEXT,  -- REMOVIDA RESTRIÇÃO NOT NULL
                conta_corrente TEXT NOT NULL UNIQUE,
                empresa TEXT NOT NULL,
                mascara TEXT,
                tipo_conta TEXT,
                ativo BOOLEAN DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                saldo_inicial REAL DEFAULT 0.0,
                status_conta TEXT DEFAULT 'Ativa'
            );

-- Colunas:
--   id: INTEGER PRIMARY KEY
--   agencia: TEXT NOT NULL
--   banco: TEXT
--   conta_corrente: TEXT NOT NULL
--   empresa: TEXT NOT NULL
--   mascara: TEXT
--   tipo_conta: TEXT
--   ativo: BOOLEAN DEFAULT 1
--   created_at: TIMESTAMP DEFAULT CURRENT_TIMESTAMP
--   updated_at: TIMESTAMP DEFAULT CURRENT_TIMESTAMP
--   saldo_inicial: REAL DEFAULT 0.0
--   status_conta: TEXT DEFAULT 'Ativa'

-- TABELA: empresas
--------------------------------------------------
CREATE TABLE empresas (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                codigo VARCHAR(10) NOT NULL UNIQUE,
                nome VARCHAR(200) NOT NULL,
                grupo VARCHAR(100) DEFAULT 'Grupo Selleta',
                cnpj VARCHAR(20),
                endereco TEXT,
                municipio VARCHAR(100),
                cep VARCHAR(10),
                telefone VARCHAR(20),
                ativo INTEGER DEFAULT 1,
                data_criacao DATETIME DEFAULT CURRENT_TIMESTAMP,
                data_atualizacao DATETIME DEFAULT CURRENT_TIMESTAMP
            );

-- Colunas:
--   id: INTEGER PRIMARY KEY
--   codigo: VARCHAR(10) NOT NULL
--   nome: VARCHAR(200) NOT NULL
--   grupo: VARCHAR(100) DEFAULT 'Grupo Selleta'
--   cnpj: VARCHAR(20)
--   endereco: TEXT
--   municipio: VARCHAR(100)
--   cep: VARCHAR(10)
--   telefone: VARCHAR(20)
--   ativo: INTEGER DEFAULT 1
--   data_criacao: DATETIME DEFAULT CURRENT_TIMESTAMP
--   data_atualizacao: DATETIME DEFAULT CURRENT_TIMESTAMP

-- TABELA: fornecedores
--------------------------------------------------
CREATE TABLE fornecedores (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome VARCHAR(255) NOT NULL,
            nome_original TEXT,
            cnpj_cpf VARCHAR(20),
            origem VARCHAR(50),
            tipo_fornecedor VARCHAR(30),
            agencia VARCHAR(10),
            banco VARCHAR(100),
            conta VARCHAR(20),
            chave_pix VARCHAR(100),
            tipo_conta VARCHAR(30),
            favorecido VARCHAR(255),
            cpf_cnpj_favorecido VARCHAR(20),
            descricao TEXT,
            metodo_deteccao VARCHAR(50),
            similaridade DECIMAL(5,3),
            deteccao_forcada BOOLEAN DEFAULT FALSE,
            deteccao_corrigida BOOLEAN DEFAULT FALSE,
            observacoes TEXT,
            valor_total_movimentado DECIMAL(15,2),
            total_transacoes INTEGER,
            data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            ativo BOOLEAN DEFAULT TRUE
        );

-- Colunas:
--   id: INTEGER PRIMARY KEY
--   nome: VARCHAR(255) NOT NULL
--   nome_original: TEXT
--   cnpj_cpf: VARCHAR(20)
--   origem: VARCHAR(50)
--   tipo_fornecedor: VARCHAR(30)
--   agencia: VARCHAR(10)
--   banco: VARCHAR(100)
--   conta: VARCHAR(20)
--   chave_pix: VARCHAR(100)
--   tipo_conta: VARCHAR(30)
--   favorecido: VARCHAR(255)
--   cpf_cnpj_favorecido: VARCHAR(20)
--   descricao: TEXT
--   metodo_deteccao: VARCHAR(50)
--   similaridade: DECIMAL(5,3)
--   deteccao_forcada: BOOLEAN DEFAULT FALSE
--   deteccao_corrigida: BOOLEAN DEFAULT FALSE
--   observacoes: TEXT
--   valor_total_movimentado: DECIMAL(15,2)
--   total_transacoes: INTEGER
--   data_criacao: TIMESTAMP DEFAULT CURRENT_TIMESTAMP
--   ativo: BOOLEAN DEFAULT TRUE

-- TABELA: plano_financeiro
--------------------------------------------------
CREATE TABLE plano_financeiro (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            codigo VARCHAR(20) UNIQUE NOT NULL,
            nome VARCHAR(150) NOT NULL,
            nivel INTEGER NOT NULL CHECK (nivel BETWEEN 1 AND 4),
            tipo VARCHAR(20) CHECK (tipo IN ('Receita', 'Despesa', 'Ambos')) DEFAULT 'Ambos',
            plano_pai_id INTEGER,
            ativo BOOLEAN DEFAULT TRUE,
            criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP, referencia VARCHAR(50),
            FOREIGN KEY (plano_pai_id) REFERENCES plano_financeiro(id)
        );

-- Colunas:
--   id: INTEGER PRIMARY KEY
--   codigo: VARCHAR(20) NOT NULL
--   nome: VARCHAR(150) NOT NULL
--   nivel: INTEGER NOT NULL
--   tipo: VARCHAR(20) DEFAULT 'Ambos'
--   plano_pai_id: INTEGER
--   ativo: BOOLEAN DEFAULT TRUE
--   criado_em: TIMESTAMP DEFAULT CURRENT_TIMESTAMP
--   atualizado_em: TIMESTAMP DEFAULT CURRENT_TIMESTAMP
--   referencia: VARCHAR(50)

-- TABELA: sqlite_sequence
--------------------------------------------------
CREATE TABLE sqlite_sequence(name,seq);

-- Colunas:
--   name: 
--   seq: 

-- TABELA: transacoes
--------------------------------------------------
CREATE TABLE transacoes (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    titulo VARCHAR(200) NOT NULL,
                    numero_documento VARCHAR(50),
                    parcela_atual INTEGER DEFAULT 1,
                    parcela_total INTEGER DEFAULT 1,
                    valor DECIMAL(15,2) NOT NULL CHECK (valor > 0),
                    data_lancamento DATE NOT NULL DEFAULT CURRENT_DATE,
                    data_vencimento DATE NOT NULL,
                    data_competencia DATE,
                    tipo VARCHAR(20) CHECK (tipo IN ('Receita', 'Despesa', 'Entrada', 'Saída')) NOT NULL,
                    tipologia VARCHAR(50),
                    cliente_fornecedor_id INTEGER,
                    centro_custo_id INTEGER NOT NULL,
                    empresa_id INTEGER NOT NULL,
                    plano_financeiro_id INTEGER NOT NULL,
                    usuario_id INTEGER NOT NULL,
                    status_negociacao VARCHAR(20) DEFAULT 'Pendente',
                    status_pagamento VARCHAR(20) DEFAULT 'A Realizar',
                    municipio VARCHAR(100),
                    observacao TEXT,
                    origem_importacao VARCHAR(50) DEFAULT 'manual',
                    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (centro_custo_id) REFERENCES centros_custo(id),
                    FOREIGN KEY (empresa_id) REFERENCES empresas(id),
                    FOREIGN KEY (plano_financeiro_id) REFERENCES plano_financeiro(id),
                    FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
                );

-- Colunas:
--   id: INTEGER PRIMARY KEY
--   titulo: VARCHAR(200) NOT NULL
--   numero_documento: VARCHAR(50)
--   parcela_atual: INTEGER DEFAULT 1
--   parcela_total: INTEGER DEFAULT 1
--   valor: DECIMAL(15,2) NOT NULL
--   data_lancamento: DATE NOT NULL DEFAULT CURRENT_DATE
--   data_vencimento: DATE NOT NULL
--   data_competencia: DATE
--   tipo: VARCHAR(20) NOT NULL
--   tipologia: VARCHAR(50)
--   cliente_fornecedor_id: INTEGER
--   centro_custo_id: INTEGER NOT NULL
--   empresa_id: INTEGER NOT NULL
--   plano_financeiro_id: INTEGER NOT NULL
--   usuario_id: INTEGER NOT NULL
--   status_negociacao: VARCHAR(20) DEFAULT 'Pendente'
--   status_pagamento: VARCHAR(20) DEFAULT 'A Realizar'
--   municipio: VARCHAR(100)
--   observacao: TEXT
--   origem_importacao: VARCHAR(50) DEFAULT 'manual'
--   criado_em: TIMESTAMP DEFAULT CURRENT_TIMESTAMP
--   atualizado_em: TIMESTAMP DEFAULT CURRENT_TIMESTAMP

-- TABELA: usuarios
--------------------------------------------------
CREATE TABLE usuarios (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username VARCHAR(50) UNIQUE NOT NULL,
            senha TEXT NOT NULL,
            nome_completo VARCHAR(150),
            email VARCHAR(150),
            ativo BOOLEAN DEFAULT TRUE,
            perfil VARCHAR(20) DEFAULT 'operador',
            criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

-- Colunas:
--   id: INTEGER PRIMARY KEY
--   username: VARCHAR(50) NOT NULL
--   senha: TEXT NOT NULL
--   nome_completo: VARCHAR(150)
--   email: VARCHAR(150)
--   ativo: BOOLEAN DEFAULT TRUE
--   perfil: VARCHAR(20) DEFAULT 'operador'
--   criado_em: TIMESTAMP DEFAULT CURRENT_TIMESTAMP
--   atualizado_em: TIMESTAMP DEFAULT CURRENT_TIMESTAMP

