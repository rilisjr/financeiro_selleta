#!/usr/bin/env python3
"""
Correção do município 'Cuiab' para 'Cuiabá' no banco de dados
"""

import sqlite3
from pathlib import Path

def corrigir_municipio_cuiaba():
    """Corrige o nome do município de 'Cuiab' para 'Cuiabá'"""
    base_path = Path(__file__).parent.parent
    db_path = base_path / 'selleta_main.db'
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        print("🏙️ Corrigindo município 'Cuiab' para 'Cuiabá'...")
        
        # Verificar registros antes da correção
        cursor.execute("SELECT COUNT(*) FROM empresas WHERE municipio = 'Cuiab'")
        count_antes = cursor.fetchone()[0]
        print(f"   Empresas com 'Cuiab': {count_antes}")
        
        # Fazer a correção
        cursor.execute("UPDATE empresas SET municipio = 'Cuiabá' WHERE municipio = 'Cuiab'")
        rows_updated = cursor.rowcount
        
        conn.commit()
        
        # Verificar registros após a correção
        cursor.execute("SELECT COUNT(*) FROM empresas WHERE municipio = 'Cuiabá'")
        count_depois = cursor.fetchone()[0]
        print(f"   Empresas com 'Cuiabá': {count_depois}")
        
        print(f"✅ {rows_updated} empresas atualizadas com sucesso!")
        
        # Mostrar distribuição atual por município
        cursor.execute('''
            SELECT municipio, COUNT(*) as total 
            FROM empresas 
            WHERE municipio IS NOT NULL 
            GROUP BY municipio 
            ORDER BY total DESC
        ''')
        municipios = cursor.fetchall()
        
        print(f"\n📊 Distribuição atual por município:")
        for municipio, total in municipios:
            print(f"   {municipio}: {total} empresa(s)")
        
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
    print("CORREÇÃO DO MUNICÍPIO CUIABÁ")
    print("="*60)
    
    sucesso = corrigir_municipio_cuiaba()
    
    if sucesso:
        print("\n🎉 Correção concluída com sucesso!")
    else:
        print("\n💥 Correção falhou!")