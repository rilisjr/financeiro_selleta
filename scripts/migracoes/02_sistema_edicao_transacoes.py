#!/usr/bin/env python3
"""
MIGRAÇÃO 02: Sistema de Edição de Transações
- Adicionar coluna tipo_usuario na tabela usuarios
- Atualizar usuários existentes para 'adm'
- Criar tabela de auditoria
- Adicionar colunas para baixa parcial na tabela transacoes
"""

import sqlite3
import os
from datetime import datetime

def executar_migracao():
    """Executa a migração completa do sistema de edição"""
    
    # Caminho do banco de dados
    db_path = 'selleta_main.db'
    
    if not os.path.exists(db_path):
        print("❌ Banco de dados não encontrado!")
        return False
    
    print("🚀 Iniciando migração do sistema de edição de transações...")
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # 1. ADICIONAR COLUNA TIPO_USUARIO
        print("📝 Adicionando coluna tipo_usuario na tabela usuarios...")
        try:
            cursor.execute("""
                ALTER TABLE usuarios 
                ADD COLUMN tipo_usuario TEXT DEFAULT 'user' 
                CHECK (tipo_usuario IN ('user', 'adm'))
            """)
            print("✅ Coluna tipo_usuario adicionada com sucesso!")
        except sqlite3.OperationalError as e:
            if "duplicate column name" in str(e):
                print("⚠️  Coluna tipo_usuario já existe!")
            else:
                raise e
        
        # 2. ATUALIZAR USUÁRIOS EXISTENTES PARA ADM
        print("👑 Atualizando usuários existentes para 'adm'...")
        cursor.execute("UPDATE usuarios SET tipo_usuario = 'adm' WHERE tipo_usuario IS NULL OR tipo_usuario = 'user'")
        usuarios_atualizados = cursor.rowcount
        print(f"✅ {usuarios_atualizados} usuários atualizados para ADM!")
        
        # 3. CRIAR TABELA DE AUDITORIA
        print("📊 Criando tabela de auditoria...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS auditoria_transacoes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                transacao_id INTEGER NOT NULL,
                usuario_id INTEGER NOT NULL,
                acao TEXT NOT NULL,
                dados_anteriores TEXT,
                dados_novos TEXT,
                ip_origem TEXT,
                data_acao DATETIME DEFAULT CURRENT_TIMESTAMP,
                observacoes TEXT,
                FOREIGN KEY (transacao_id) REFERENCES transacoes(id),
                FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
            )
        """)
        print("✅ Tabela de auditoria criada com sucesso!")
        
        # 4. ADICIONAR COLUNAS PARA BAIXA PARCIAL
        print("💰 Adicionando colunas para baixa parcial na tabela transacoes...")
        
        # Coluna valor_pago
        try:
            cursor.execute("ALTER TABLE transacoes ADD COLUMN valor_pago REAL DEFAULT NULL")
            print("✅ Coluna valor_pago adicionada!")
        except sqlite3.OperationalError as e:
            if "duplicate column name" in str(e):
                print("⚠️  Coluna valor_pago já existe!")
            else:
                raise e
        
        # Coluna data_pagamento
        try:
            cursor.execute("ALTER TABLE transacoes ADD COLUMN data_pagamento DATE DEFAULT NULL")
            print("✅ Coluna data_pagamento adicionada!")
        except sqlite3.OperationalError as e:
            if "duplicate column name" in str(e):
                print("⚠️  Coluna data_pagamento já existe!")
            else:
                raise e
        
        # Coluna observacao_baixa
        try:
            cursor.execute("ALTER TABLE transacoes ADD COLUMN observacao_baixa TEXT DEFAULT NULL")
            print("✅ Coluna observacao_baixa adicionada!")
        except sqlite3.OperationalError as e:
            if "duplicate column name" in str(e):
                print("⚠️  Coluna observacao_baixa já existe!")
            else:
                raise e
        
        # Coluna transacao_pai_id (para clonagem)
        try:
            cursor.execute("ALTER TABLE transacoes ADD COLUMN transacao_pai_id INTEGER DEFAULT NULL")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_transacao_pai ON transacoes(transacao_pai_id)")
            print("✅ Coluna transacao_pai_id adicionada!")
        except sqlite3.OperationalError as e:
            if "duplicate column name" in str(e):
                print("⚠️  Coluna transacao_pai_id já existe!")
            else:
                raise e
        
        # Coluna usuario_baixa
        try:
            cursor.execute("ALTER TABLE transacoes ADD COLUMN usuario_baixa INTEGER DEFAULT NULL")
            print("✅ Coluna usuario_baixa adicionada!")
        except sqlite3.OperationalError as e:
            if "duplicate column name" in str(e):
                print("⚠️  Coluna usuario_baixa já existe!")
            else:
                raise e
        
        # Coluna data_ultima_alteracao
        try:
            cursor.execute("ALTER TABLE transacoes ADD COLUMN data_ultima_alteracao DATETIME DEFAULT NULL")
            print("✅ Coluna data_ultima_alteracao adicionada!")
        except sqlite3.OperationalError as e:
            if "duplicate column name" in str(e):
                print("⚠️  Coluna data_ultima_alteracao já existe!")
            else:
                raise e
        
        # 5. CRIAR ÍNDICES PARA PERFORMANCE
        print("🔍 Criando índices para performance...")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_transacoes_status_pagamento ON transacoes(status_pagamento)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_transacoes_data_pagamento ON transacoes(data_pagamento)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_auditoria_transacao ON auditoria_transacoes(transacao_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_auditoria_usuario ON auditoria_transacoes(usuario_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_auditoria_data ON auditoria_transacoes(data_acao)")
        print("✅ Índices criados com sucesso!")
        
        # 6. VERIFICAR ESTRUTURA FINAL
        print("🔍 Verificando estrutura final das tabelas...")
        
        # Verificar tabela usuarios
        cursor.execute("PRAGMA table_info(usuarios)")
        colunas_usuarios = [col[1] for col in cursor.fetchall()]
        print(f"📋 Colunas da tabela usuarios: {colunas_usuarios}")
        
        # Verificar tabela transacoes
        cursor.execute("PRAGMA table_info(transacoes)")
        colunas_transacoes = [col[1] for col in cursor.fetchall()]
        print(f"📋 Colunas da tabela transacoes: {len(colunas_transacoes)} colunas")
        
        # Verificar tabela auditoria
        cursor.execute("PRAGMA table_info(auditoria_transacoes)")
        colunas_auditoria = [col[1] for col in cursor.fetchall()]
        print(f"📋 Colunas da tabela auditoria_transacoes: {colunas_auditoria}")
        
        # Commit das alterações
        conn.commit()
        print("✅ Migração concluída com sucesso!")
        
        # Estatísticas finais
        cursor.execute("SELECT COUNT(*) FROM usuarios WHERE tipo_usuario = 'adm'")
        total_admins = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM transacoes")
        total_transacoes = cursor.fetchone()[0]
        
        print(f"\n📊 ESTATÍSTICAS FINAIS:")
        print(f"   👑 Administradores: {total_admins}")
        print(f"   💰 Transações: {total_transacoes}")
        print(f"   📅 Data da migração: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        
        return True
        
    except Exception as e:
        print(f"❌ Erro durante a migração: {str(e)}")
        conn.rollback()
        return False
    
    finally:
        conn.close()

def verificar_migracao():
    """Verifica se a migração foi aplicada corretamente"""
    
    db_path = 'selleta_main.db'
    
    if not os.path.exists(db_path):
        print("❌ Banco de dados não encontrado!")
        return False
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Verificar se as colunas foram adicionadas
        cursor.execute("PRAGMA table_info(usuarios)")
        colunas_usuarios = [col[1] for col in cursor.fetchall()]
        
        cursor.execute("PRAGMA table_info(transacoes)")
        colunas_transacoes = [col[1] for col in cursor.fetchall()]
        
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='auditoria_transacoes'")
        tabela_auditoria = cursor.fetchone()
        
        # Verificações
        checks = {
            'tipo_usuario em usuarios': 'tipo_usuario' in colunas_usuarios,
            'valor_pago em transacoes': 'valor_pago' in colunas_transacoes,
            'data_pagamento em transacoes': 'data_pagamento' in colunas_transacoes,
            'observacao_baixa em transacoes': 'observacao_baixa' in colunas_transacoes,
            'transacao_pai_id em transacoes': 'transacao_pai_id' in colunas_transacoes,
            'usuario_baixa em transacoes': 'usuario_baixa' in colunas_transacoes,
            'data_ultima_alteracao em transacoes': 'data_ultima_alteracao' in colunas_transacoes,
            'tabela auditoria_transacoes': tabela_auditoria is not None
        }
        
        print("🔍 VERIFICAÇÃO DA MIGRAÇÃO:")
        all_ok = True
        for check_name, check_result in checks.items():
            status = "✅" if check_result else "❌"
            print(f"   {status} {check_name}")
            if not check_result:
                all_ok = False
        
        return all_ok
        
    except Exception as e:
        print(f"❌ Erro na verificação: {str(e)}")
        return False
    
    finally:
        conn.close()

if __name__ == "__main__":
    print("=" * 60)
    print("🎯 MIGRAÇÃO 02: SISTEMA DE EDIÇÃO DE TRANSAÇÕES")
    print("=" * 60)
    
    # Executar migração
    if executar_migracao():
        print("\n" + "=" * 60)
        print("✅ MIGRAÇÃO CONCLUÍDA COM SUCESSO!")
        print("=" * 60)
        
        # Verificar migração
        if verificar_migracao():
            print("\n🎉 Todas as verificações passaram!")
        else:
            print("\n⚠️  Algumas verificações falharam!")
    else:
        print("\n❌ MIGRAÇÃO FALHOU!")
        print("=" * 60)