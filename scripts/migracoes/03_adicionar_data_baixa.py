#!/usr/bin/env python3
"""
MIGRAÇÃO 03: Adicionar Data de Baixa
- Adicionar coluna data_baixa na tabela transacoes para contabilização no caixa
- data_baixa é diferente de data_pagamento (data_pagamento = quando foi pago, data_baixa = quando foi contabilizado)
"""

import sqlite3
import os
from datetime import datetime

def executar_migracao():
    """Executa a migração para adicionar data_baixa"""
    
    db_path = 'selleta_main.db'
    
    if not os.path.exists(db_path):
        print("❌ Banco de dados não encontrado!")
        return False
    
    print("🚀 Iniciando migração 03: Adicionar data_baixa...")
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # 1. ADICIONAR COLUNA DATA_BAIXA
        print("📅 Adicionando coluna data_baixa na tabela transacoes...")
        try:
            cursor.execute("""
                ALTER TABLE transacoes 
                ADD COLUMN data_baixa DATE DEFAULT NULL
            """)
            print("✅ Coluna data_baixa adicionada com sucesso!")
        except sqlite3.OperationalError as e:
            if "duplicate column name" in str(e):
                print("⚠️  Coluna data_baixa já existe!")
            else:
                raise e
        
        # 2. CRIAR ÍNDICE PARA PERFORMANCE
        print("🔍 Criando índice para data_baixa...")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_transacoes_data_baixa ON transacoes(data_baixa)")
        print("✅ Índice criado com sucesso!")
        
        # 3. POPULAR DATA_BAIXA COM DATA_PAGAMENTO EXISTENTE (onde aplicável)
        print("🔄 Populando data_baixa com data_pagamento existente...")
        cursor.execute("""
            UPDATE transacoes 
            SET data_baixa = data_pagamento 
            WHERE data_pagamento IS NOT NULL AND data_baixa IS NULL
        """)
        registros_atualizados = cursor.rowcount
        print(f"✅ {registros_atualizados} registros atualizados com data_baixa!")
        
        # 4. VERIFICAR ESTRUTURA FINAL
        print("🔍 Verificando estrutura final...")
        cursor.execute("PRAGMA table_info(transacoes)")
        colunas = [col[1] for col in cursor.fetchall()]
        
        colunas_relacionadas_baixa = [col for col in colunas if 'baixa' in col.lower() or 'pagamento' in col.lower()]
        print(f"📋 Colunas relacionadas à baixa: {colunas_relacionadas_baixa}")
        
        # Commit das alterações
        conn.commit()
        print("✅ Migração 03 concluída com sucesso!")
        
        # Estatísticas finais
        cursor.execute("SELECT COUNT(*) FROM transacoes WHERE data_baixa IS NOT NULL")
        total_com_baixa = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM transacoes WHERE data_pagamento IS NOT NULL")
        total_com_pagamento = cursor.fetchone()[0]
        
        print(f"\n📊 ESTATÍSTICAS FINAIS:")
        print(f"   💰 Transações com data_baixa: {total_com_baixa}")
        print(f"   💳 Transações com data_pagamento: {total_com_pagamento}")
        print(f"   📅 Data da migração: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        
        return True
        
    except Exception as e:
        print(f"❌ Erro durante a migração: {str(e)}")
        conn.rollback()
        return False
    
    finally:
        conn.close()

if __name__ == "__main__":
    print("=" * 60)
    print("🎯 MIGRAÇÃO 03: ADICIONAR DATA_BAIXA")
    print("=" * 60)
    
    if executar_migracao():
        print("\n✅ MIGRAÇÃO 03 CONCLUÍDA COM SUCESSO!")
    else:
        print("\n❌ MIGRAÇÃO 03 FALHOU!")
    
    print("=" * 60)