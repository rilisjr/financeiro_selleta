#!/usr/bin/env python3
"""
Verifica estrutura do banco de dados
"""

import sqlite3
from pathlib import Path

def verificar_estrutura():
    base_path = Path(__file__).parent.parent
    db_path = base_path / 'selleta_main.db'
    
    print(f"🔍 Verificando estrutura do banco: {db_path}")
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Listar todas as tabelas
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tabelas = cursor.fetchall()
        
        print(f"\n📊 Tabelas encontradas: {len(tabelas)}")
        for tabela in tabelas:
            print(f"   - {tabela[0]}")
        
        # Para cada tabela, mostrar estrutura
        for tabela in tabelas:
            nome_tabela = tabela[0]
            print(f"\n🏗️ Estrutura da tabela '{nome_tabela}':")
            
            cursor.execute(f"PRAGMA table_info({nome_tabela})")
            colunas = cursor.fetchall()
            
            for coluna in colunas:
                print(f"   {coluna[1]} ({coluna[2]}) - {'NOT NULL' if coluna[3] else 'NULL'}")
            
            # Contar registros
            cursor.execute(f"SELECT COUNT(*) FROM {nome_tabela}")
            count = cursor.fetchone()[0]
            print(f"   📊 Total de registros: {count}")
        
        conn.close()
        
    except Exception as e:
        print(f"❌ Erro: {e}")

if __name__ == "__main__":
    verificar_estrutura()