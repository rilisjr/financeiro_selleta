#!/usr/bin/env python3
"""
Migração dos centros de custo para a base selleta_main.db
"""

import sqlite3
import csv
from pathlib import Path

def migrar_centros_custo():
    """Cria tabela centros_custo e popula com dados do CSV"""
    base_path = Path(__file__).parent.parent
    db_path = base_path / 'selleta_main.db'
    csv_path = base_path / 'importacao' / 'b_dados_centro_custo_com_mascara.csv'
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        print("🏗️ Criando tabela centros_custo...")
        
        # Criar tabela centros_custo
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS centros_custo (
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
            )
        ''')
        
        # Verificar se já existem dados
        cursor.execute("SELECT COUNT(*) FROM centros_custo")
        count = cursor.fetchone()[0]
        
        if count > 0:
            print(f"⚠️ Tabela já contém {count} registros. Limpando...")
            cursor.execute("DELETE FROM centros_custo")
        
        # Mapear empresas por código para obter IDs
        cursor.execute("SELECT id, codigo, nome FROM empresas")
        empresas_map = {}
        for emp_id, codigo, nome in cursor.fetchall():
            empresas_map[codigo] = emp_id
        
        # Ler CSV e inserir dados
        print(f"📄 Lendo dados do CSV: {csv_path}")
        
        with open(csv_path, 'r', encoding='utf-8-sig') as f:
            reader = csv.DictReader(f)
            centros_inseridos = 0
            
            for row in reader:
                # Extrair empresa_id do código da empresa
                empresa_nome = row['empresa'].strip()
                empresa_codigo_raw = empresa_nome.split(' - ')[0] if ' - ' in empresa_nome else ''
                
                # Normalizar código com zeros à esquerda
                empresa_codigo = empresa_codigo_raw.zfill(4) if empresa_codigo_raw.isdigit() else empresa_codigo_raw
                
                # Buscar empresa por código
                empresa_id = empresas_map.get(empresa_codigo)
                
                if not empresa_id:
                    print(f"⚠️ Empresa não encontrada: {empresa_nome} (código original: {empresa_codigo_raw}, normalizado: {empresa_codigo})")
                    continue
                
                # Inserir centro de custo
                cursor.execute('''
                    INSERT INTO centros_custo (
                        centro_custo_original, mascara_cc, empresa_id, tipologia, categoria, descricao
                    ) VALUES (?, ?, ?, ?, ?, ?)
                ''', (
                    row['centro_custo'],
                    row['mascara_cc'],
                    empresa_id,
                    row['tipologia'],
                    row['categoria'],
                    f"Centro de custo {row['tipologia'].lower()} - {row['categoria']}"
                ))
                centros_inseridos += 1
        
        conn.commit()
        
        print(f"✅ {centros_inseridos} centros de custo inseridos com sucesso!")
        
        # Estatísticas
        print(f"\n📊 Estatísticas por categoria:")
        cursor.execute('''
            SELECT categoria, COUNT(*) as total 
            FROM centros_custo 
            GROUP BY categoria 
            ORDER BY total DESC
        ''')
        for categoria, total in cursor.fetchall():
            print(f"   {categoria}: {total} centro(s)")
        
        print(f"\n📊 Estatísticas por tipologia:")
        cursor.execute('''
            SELECT tipologia, COUNT(*) as total 
            FROM centros_custo 
            GROUP BY tipologia 
            ORDER BY total DESC
        ''')
        for tipologia, total in cursor.fetchall():
            print(f"   {tipologia}: {total} centro(s)")
        
        print(f"\n📊 Estatísticas por empresa:")
        cursor.execute('''
            SELECT e.nome, COUNT(*) as total 
            FROM centros_custo cc
            JOIN empresas e ON cc.empresa_id = e.id
            GROUP BY e.nome 
            ORDER BY total DESC
        ''')
        for empresa, total in cursor.fetchall():
            empresa_curta = empresa.split(' - ')[1][:30] if ' - ' in empresa else empresa[:30]
            print(f"   {empresa_curta}: {total} centro(s)")
        
        # Preview com JOIN das empresas
        print(f"\n📋 Preview (primeiros 10 centros):")
        cursor.execute('''
            SELECT cc.id, cc.mascara_cc, e.codigo, cc.tipologia, cc.categoria
            FROM centros_custo cc
            JOIN empresas e ON cc.empresa_id = e.id
            ORDER BY cc.id
            LIMIT 10
        ''')
        
        print(f"{'ID':<3} | {'Máscara CC':<35} | {'Emp':<4} | {'Tipologia':<20} | {'Categoria':<12}")
        print("-" * 85)
        
        for cc_id, mascara, emp_codigo, tipologia, categoria in cursor.fetchall():
            mascara_short = mascara[:33] + '...' if len(mascara) > 35 else mascara
            print(f"{cc_id:<3} | {mascara_short:<35} | {emp_codigo:<4} | {tipologia:<20} | {categoria:<12}")
        
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
    print("="*80)
    print("MIGRAÇÃO DE CENTROS DE CUSTO")
    print("="*80)
    
    sucesso = migrar_centros_custo()
    
    if sucesso:
        print("\n🎉 Migração concluída com sucesso!")
        print("📋 Tabela: centros_custo")
        print("🔗 Relacionamento: empresa_id → empresas.id")
        print("🎭 Campo mascara_cc: para uso na aplicação")
        print("🔗 Campo centro_custo_original: para mesclagem com banco anterior")
    else:
        print("\n💥 Migração falhou!")