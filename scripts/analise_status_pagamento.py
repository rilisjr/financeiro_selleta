#!/usr/bin/env python3
"""
ANÁLISE: Status de Pagamento vs Data de Pagamento
Verifica inconsistências entre status_pagamento e data_pagamento
"""

import sqlite3
import os
from datetime import datetime

def analisar_status_pagamento():
    """Analisa o status de pagamento das transações"""
    
    db_path = 'selleta_main.db'
    
    if not os.path.exists(db_path):
        print("❌ Banco de dados não encontrado!")
        return False
    
    print("🔍 Analisando status de pagamento das transações...")
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # 1. VERIFICAR VALORES ÚNICOS DE STATUS_PAGAMENTO
        print("\n📊 VALORES ÚNICOS DE STATUS_PAGAMENTO:")
        cursor.execute("""
            SELECT status_pagamento, COUNT(*) as quantidade
            FROM transacoes 
            GROUP BY status_pagamento 
            ORDER BY quantidade DESC
        """)
        status_counts = cursor.fetchall()
        
        for status, count in status_counts:
            print(f"   • {status}: {count:,} transações")
        
        # 2. VERIFICAR TRANSAÇÕES COM STATUS "REALIZADO" E DATA_PAGAMENTO
        print("\n🎯 TRANSAÇÕES COM STATUS 'REALIZADO' QUE JÁ TEM DATA_PAGAMENTO:")
        cursor.execute("""
            SELECT 
                id,
                titulo,
                valor,
                status_pagamento,
                data_pagamento,
                data_vencimento,
                observacao_baixa
            FROM transacoes 
            WHERE LOWER(status_pagamento) LIKE '%realizado%' 
               OR LOWER(status_pagamento) LIKE '%pago%'
            ORDER BY data_pagamento DESC
            LIMIT 20
        """)
        transacoes_realizadas = cursor.fetchall()
        
        if transacoes_realizadas:
            print(f"   ⚠️  Encontradas {len(transacoes_realizadas)} transações com status 'realizado/pago':")
            print("   " + "="*100)
            print(f"   {'ID':<8} {'TÍTULO':<30} {'VALOR':<12} {'STATUS':<15} {'DATA_PAGTO':<12} {'DATA_VENC':<12}")
            print("   " + "="*100)
            
            for row in transacoes_realizadas:
                id_transacao, titulo, valor, status, data_pag, data_venc, obs_baixa = row
                titulo_truncado = (titulo[:27] + '...') if len(titulo) > 30 else titulo
                print(f"   {id_transacao:<8} {titulo_truncado:<30} R$ {valor:<9.2f} {status:<15} {str(data_pag):<12} {str(data_venc):<12}")
        else:
            print("   ✅ Nenhuma transação encontrada com status 'realizado/pago'")
        
        # 3. VERIFICAR TRANSAÇÕES COM DATA_PAGAMENTO MAS STATUS NÃO REALIZADO
        print("\n🔍 TRANSAÇÕES COM DATA_PAGAMENTO MAS STATUS ≠ 'REALIZADO':")
        cursor.execute("""
            SELECT 
                id,
                titulo,
                valor,
                status_pagamento,
                data_pagamento,
                data_vencimento
            FROM transacoes 
            WHERE data_pagamento IS NOT NULL 
              AND (LOWER(status_pagamento) NOT LIKE '%realizado%' 
                   AND LOWER(status_pagamento) NOT LIKE '%pago%')
            ORDER BY data_pagamento DESC
            LIMIT 10
        """)
        inconsistencias = cursor.fetchall()
        
        if inconsistencias:
            print(f"   ⚠️  Encontradas {len(inconsistencias)} inconsistências:")
            print("   " + "="*100)
            print(f"   {'ID':<8} {'TÍTULO':<30} {'VALOR':<12} {'STATUS':<15} {'DATA_PAGTO':<12}")
            print("   " + "="*100)
            
            for row in inconsistencias:
                id_transacao, titulo, valor, status, data_pag, data_venc = row
                titulo_truncado = (titulo[:27] + '...') if len(titulo) > 30 else titulo
                print(f"   {id_transacao:<8} {titulo_truncado:<30} R$ {valor:<9.2f} {status:<15} {str(data_pag):<12}")
        else:
            print("   ✅ Nenhuma inconsistência encontrada")
        
        # 4. VERIFICAR TRANSAÇÕES COM STATUS "A REALIZAR" E DATA_PAGAMENTO
        print("\n⚡ TRANSAÇÕES COM STATUS 'A REALIZAR' MAS COM DATA_PAGAMENTO:")
        cursor.execute("""
            SELECT 
                id,
                titulo,
                valor,
                status_pagamento,
                data_pagamento,
                data_vencimento
            FROM transacoes 
            WHERE data_pagamento IS NOT NULL 
              AND LOWER(status_pagamento) LIKE '%realizar%'
            ORDER BY data_pagamento DESC
            LIMIT 10
        """)
        a_realizar_com_data = cursor.fetchall()
        
        if a_realizar_com_data:
            print(f"   ⚠️  Encontradas {len(a_realizar_com_data)} transações:")
            for row in a_realizar_com_data:
                id_transacao, titulo, valor, status, data_pag, data_venc = row
                titulo_truncado = (titulo[:27] + '...') if len(titulo) > 30 else titulo
                print(f"   • ID {id_transacao}: {titulo_truncado} - {status} com data {data_pag}")
        else:
            print("   ✅ Nenhuma transação 'A Realizar' com data_pagamento")
        
        # 5. ESTATÍSTICAS GERAIS
        print("\n📈 ESTATÍSTICAS GERAIS:")
        
        cursor.execute("SELECT COUNT(*) FROM transacoes")
        total_transacoes = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM transacoes WHERE data_pagamento IS NOT NULL")
        com_data_pagamento = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM transacoes WHERE LOWER(status_pagamento) LIKE '%realizado%' OR LOWER(status_pagamento) LIKE '%pago%'")
        status_realizado = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM transacoes WHERE valor_pago IS NOT NULL")
        com_valor_pago = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM transacoes WHERE observacao_baixa IS NOT NULL")
        com_obs_baixa = cursor.fetchone()[0]
        
        print(f"   📊 Total de transações: {total_transacoes:,}")
        print(f"   💳 Com data_pagamento: {com_data_pagamento:,}")
        print(f"   ✅ Com status 'realizado': {status_realizado:,}")
        print(f"   💰 Com valor_pago: {com_valor_pago:,}")
        print(f"   📝 Com observação_baixa: {com_obs_baixa:,}")
        
        # 6. POSSÍVEIS VALORES DE STATUS_PAGAMENTO VÁLIDOS
        print("\n🎯 RECOMENDAÇÕES:")
        if status_realizado > 0 or com_data_pagamento > 0:
            print("   ⚠️  INCONSISTÊNCIAS DETECTADAS!")
            print("   📋 Valores recomendados para status_pagamento:")
            print("      • 'A Realizar' - Para transações pendentes")
            print("      • 'Realizado' - Para transações pagas")
            print("      • 'Cancelado' - Para transações canceladas")
            print("      • 'Em Processamento' - Para transações em andamento")
            
            if com_data_pagamento > 0:
                print(f"\n   🔧 CORREÇÃO NECESSÁRIA:")
                print(f"      • {com_data_pagamento} transações têm data_pagamento")
                print(f"      • Essas devem ter status 'Realizado'")
        else:
            print("   ✅ Base de dados consistente!")
        
        return True
        
    except Exception as e:
        print(f"❌ Erro durante a análise: {str(e)}")
        return False
    
    finally:
        conn.close()

if __name__ == "__main__":
    print("=" * 80)
    print("🎯 ANÁLISE: STATUS DE PAGAMENTO vs DATA DE PAGAMENTO")
    print("=" * 80)
    
    if analisar_status_pagamento():
        print("\n✅ ANÁLISE CONCLUÍDA!")
    else:
        print("\n❌ ANÁLISE FALHOU!")
    
    print("=" * 80)