#!/usr/bin/env python3
"""
Migração das empresas para a base selleta_main.db
"""

import sqlite3
import csv
from pathlib import Path

def migrar_empresas():
    """Cria tabela empresas e popula com dados do CSV"""
    base_path = Path(__file__).parent.parent
    db_path = base_path / 'selleta_main.db'
    csv_path = base_path / 'importacao' / 'b_dados_empresas.csv'
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        print("🏢 Criando tabela empresas...")
        
        # Criar tabela empresas
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS empresas (
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
            )
        ''')
        
        # Verificar se já existem dados
        cursor.execute("SELECT COUNT(*) FROM empresas")
        count = cursor.fetchone()[0]
        
        if count > 0:
            print(f"⚠️ Tabela já contém {count} registros. Limpando...")
            cursor.execute("DELETE FROM empresas")
        
        # Ler CSV e inserir dados
        print(f"📄 Lendo dados do CSV: {csv_path}")
        
        with open(csv_path, 'r', encoding='utf-8-sig') as f:
            reader = csv.DictReader(f)
            empresas_inseridas = 0
            
            for row in reader:
                cursor.execute('''
                    INSERT INTO empresas (
                        codigo, nome, grupo, cnpj, endereco, 
                        municipio, cep, telefone, ativo
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    row['codigo'],
                    row['nome'],
                    row['grupo'],
                    row['cnpj'],
                    row['endereco'],
                    row['municipio'],
                    row['cep'],
                    row['telefone'],
                    int(row['ativo'])
                ))
                empresas_inseridas += 1
        
        conn.commit()
        
        print(f"✅ {empresas_inseridas} empresas inseridas com sucesso!")
        
        # Estatísticas
        cursor.execute('''
            SELECT municipio, COUNT(*) as total 
            FROM empresas 
            WHERE municipio IS NOT NULL 
            GROUP BY municipio 
            ORDER BY total DESC
        ''')
        municipios = cursor.fetchall()
        
        print(f"\n📊 Distribuição por município:")
        for municipio, total in municipios:
            print(f"   {municipio}: {total} empresa(s)")
        
        # Preview
        cursor.execute('''
            SELECT codigo, nome, cnpj, municipio 
            FROM empresas 
            ORDER BY codigo
        ''')
        empresas = cursor.fetchall()
        
        print(f"\n📋 Preview das empresas:")
        for codigo, nome, cnpj, municipio in empresas:
            print(f"   {codigo} - {nome}")
            print(f"      CNPJ: {cnpj} | {municipio}")
        
        return True
        
    except Exception as e:
        print(f"❌ Erro: {e}")
        import traceback
        traceback.print_exc()
        return False
        
    finally:
        if 'conn' in locals():
            conn.close()

if __name__ == "__main__":
    print("="*60)
    print("MIGRAÇÃO DE EMPRESAS")
    print("="*60)
    
    sucesso = migrar_empresas()
    
    if sucesso:
        print("\n🎉 Migração concluída com sucesso!")
    else:
        print("\n💥 Migração falhou!")