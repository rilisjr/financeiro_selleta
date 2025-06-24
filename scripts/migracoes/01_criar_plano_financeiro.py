#!/usr/bin/env python3
"""
Migração 01: Criar e popular tabela de Plano Financeiro
Banco: selleta_main.db
Data: 2025-01-24
"""

import sqlite3
import csv
from pathlib import Path
import sys

# Caminhos
BASE_DIR = Path(__file__).parent.parent.parent
DB_PATH = BASE_DIR / 'selleta_main.db'
CSV_PATH = BASE_DIR / 'importacao' / 'b_dados_plano_financeiro.csv'

def criar_tabela_plano_financeiro(conn):
    """Cria a tabela de plano financeiro com estrutura hierárquica"""
    cursor = conn.cursor()
    
    # Criar tabela
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS plano_financeiro (
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
        )
    ''')
    
    # Criar índices
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_plano_codigo ON plano_financeiro(codigo)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_plano_nivel ON plano_financeiro(nivel)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_plano_pai ON plano_financeiro(plano_pai_id)')
    
    conn.commit()
    print("✅ Tabela plano_financeiro criada com sucesso!")

def popular_planos_financeiros(conn):
    """Popula a tabela com dados do CSV"""
    cursor = conn.cursor()
    
    # Verificar se já existem dados
    cursor.execute('SELECT COUNT(*) FROM plano_financeiro')
    if cursor.fetchone()[0] > 0:
        print("⚠️  Tabela plano_financeiro já contém dados. Pulando população.")
        return
    
    # Ler CSV
    with open(CSV_PATH, 'r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        rows = list(reader)
    
    # Dicionário para mapear código -> id do banco
    codigo_para_id = {}
    
    # Processar por nível (1 a 4)
    for nivel in range(1, 5):
        print(f"\n📊 Processando Nível {nivel}...")
        
        # Conjunto para evitar duplicatas
        planos_nivel = set()
        
        for row in rows:
            codigo = row[f'id_pf_h{nivel}']
            nome = row[f'plano_financeiro_hierarquia_{nivel}']
            
            if codigo and nome and codigo not in planos_nivel:
                planos_nivel.add(codigo)
                
                # Determinar tipo baseado no código
                if codigo.startswith('1'):
                    tipo = 'Receita'
                elif codigo.startswith('2'):
                    tipo = 'Despesa'
                else:
                    tipo = 'Ambos'
                
                # Determinar plano pai
                plano_pai_id = None
                if nivel > 1:
                    # Encontrar o código do pai
                    codigo_parts = codigo.split('.')
                    if nivel == 2:
                        codigo_pai = codigo_parts[0]
                    elif nivel == 3:
                        codigo_pai = '.'.join(codigo_parts[:2])
                    elif nivel == 4:
                        codigo_pai = '.'.join(codigo_parts[:3])
                    
                    plano_pai_id = codigo_para_id.get(codigo_pai)
                
                # Inserir no banco
                try:
                    cursor.execute('''
                        INSERT INTO plano_financeiro 
                        (codigo, nome, nivel, tipo, plano_pai_id)
                        VALUES (?, ?, ?, ?, ?)
                    ''', (codigo, nome, nivel, tipo, plano_pai_id))
                    
                    # Guardar o ID para referências futuras
                    codigo_para_id[codigo] = cursor.lastrowid
                    
                except sqlite3.IntegrityError as e:
                    print(f"⚠️  Erro ao inserir {codigo}: {e}")
        
        print(f"✅ Nível {nivel}: {len(planos_nivel)} planos inseridos")
    
    conn.commit()
    
    # Estatísticas finais
    cursor.execute('SELECT nivel, COUNT(*) FROM plano_financeiro GROUP BY nivel')
    stats = cursor.fetchall()
    
    print("\n📈 ESTATÍSTICAS FINAIS:")
    total = 0
    for nivel, count in stats:
        print(f"   Nível {nivel}: {count} planos")
        total += count
    print(f"   TOTAL: {total} planos financeiros")

def verificar_hierarquia(conn):
    """Verifica e exibe alguns exemplos da hierarquia"""
    cursor = conn.cursor()
    
    print("\n🌳 EXEMPLOS DE HIERARQUIA:")
    
    # Pegar alguns planos de nível 1
    cursor.execute('SELECT id, codigo, nome FROM plano_financeiro WHERE nivel = 1 ORDER BY codigo')
    nivel1_planos = cursor.fetchall()
    
    for p1_id, p1_codigo, p1_nome in nivel1_planos[:2]:  # Mostrar apenas 2 exemplos
        print(f"\n{p1_codigo} - {p1_nome}")
        
        # Nível 2
        cursor.execute('''
            SELECT id, codigo, nome FROM plano_financeiro 
            WHERE nivel = 2 AND plano_pai_id = ? 
            ORDER BY codigo LIMIT 3
        ''', (p1_id,))
        
        for p2_id, p2_codigo, p2_nome in cursor.fetchall():
            print(f"  └─ {p2_codigo} - {p2_nome}")
            
            # Nível 3
            cursor.execute('''
                SELECT codigo, nome FROM plano_financeiro 
                WHERE nivel = 3 AND plano_pai_id = ? 
                ORDER BY codigo LIMIT 2
            ''', (p2_id,))
            
            for p3_codigo, p3_nome in cursor.fetchall():
                print(f"      └─ {p3_codigo} - {p3_nome}")

def main():
    """Executa a migração"""
    print("="*60)
    print("MIGRAÇÃO 01: Plano Financeiro")
    print("="*60)
    
    # Verificar se o CSV existe
    if not CSV_PATH.exists():
        print(f"❌ Arquivo CSV não encontrado: {CSV_PATH}")
        print("   Execute primeiro o script de extração!")
        sys.exit(1)
    
    # Conectar ao banco
    print(f"\n📁 Banco de dados: {DB_PATH}")
    conn = sqlite3.connect(DB_PATH)
    
    try:
        # Executar migração
        criar_tabela_plano_financeiro(conn)
        popular_planos_financeiros(conn)
        verificar_hierarquia(conn)
        
        print("\n✅ MIGRAÇÃO CONCLUÍDA COM SUCESSO!")
        
    except Exception as e:
        print(f"\n❌ ERRO NA MIGRAÇÃO: {e}")
        conn.rollback()
        raise
    
    finally:
        conn.close()

if __name__ == "__main__":
    main()