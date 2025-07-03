#!/usr/bin/env python3
"""
ANÁLISE: Contas Bancárias - Status e Estrutura
Verifica status das contas e estrutura da tabela
"""

import sqlite3
import os

def analisar_contas_bancarias():
    """Analisa as contas bancárias"""
    
    db_path = 'selleta_main.db'
    
    if not os.path.exists(db_path):
        print("❌ Banco de dados não encontrado!")
        return False
    
    print("🔍 Analisando contas bancárias...")
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # 1. VERIFICAR ESTRUTURA DA TABELA
        print("\n📋 ESTRUTURA DA TABELA conta_bancaria:")
        cursor.execute("PRAGMA table_info(conta_bancaria)")
        colunas = cursor.fetchall()
        
        for col in colunas:
            cid, name, type_name, notnull, default_value, pk = col
            print(f"   • {name} ({type_name}) - {'NOT NULL' if notnull else 'NULL'} - {'PK' if pk else ''}")
        
        # 2. CONTAR REGISTROS POR STATUS
        print("\n📊 CONTAGEM POR STATUS_CONTA:")
        cursor.execute("""
            SELECT status_conta, COUNT(*) as quantidade
            FROM conta_bancaria 
            GROUP BY status_conta 
            ORDER BY quantidade DESC
        """)
        status_counts = cursor.fetchall()
        
        for status, count in status_counts:
            print(f"   • {status}: {count} contas")
        
        # 3. CONTAR REGISTROS POR ATIVO
        print("\n🔴 CONTAGEM POR ATIVO:")
        cursor.execute("""
            SELECT ativo, COUNT(*) as quantidade
            FROM conta_bancaria 
            GROUP BY ativo 
            ORDER BY quantidade DESC
        """)
        ativo_counts = cursor.fetchall()
        
        for ativo, count in ativo_counts:
            print(f"   • {'ATIVO' if ativo else 'INATIVO'}: {count} contas")
        
        # 4. CONTAS ATIVAS COM STATUS "ATIVA"
        print("\n✅ CONTAS COM STATUS 'ATIVA' E ATIVO=1:")
        cursor.execute("""
            SELECT id, banco, agencia, conta_corrente, empresa, saldo_inicial, status_conta
            FROM conta_bancaria 
            WHERE status_conta = 'Ativa' AND ativo = 1
            ORDER BY banco, conta_corrente
        """)
        contas_ativas = cursor.fetchall()
        
        if contas_ativas:
            print(f"   📈 Encontradas {len(contas_ativas)} contas ativas:")
            print("   " + "="*90)
            print(f"   {'ID':<4} {'BANCO':<20} {'AGÊNCIA':<8} {'CONTA':<15} {'EMPRESA':<15} {'SALDO':<12}")
            print("   " + "="*90)
            
            for row in contas_ativas:
                id_conta, banco, agencia, conta, empresa, saldo, status = row
                banco_t = (banco[:17] + '...') if banco and len(banco) > 20 else (banco or 'N/A')
                empresa_t = (empresa[:12] + '...') if empresa and len(empresa) > 15 else (empresa or 'N/A')
                print(f"   {id_conta:<4} {banco_t:<20} {str(agencia):<8} {str(conta):<15} {empresa_t:<15} R$ {saldo or 0:<9.2f}")
        else:
            print("   ⚠️  Nenhuma conta encontrada com status 'Ativa' e ativo=1")
        
        # 5. TODOS OS STATUS POSSÍVEIS
        print("\n🎯 STATUS ÚNICOS ENCONTRADOS:")
        cursor.execute("SELECT DISTINCT status_conta FROM conta_bancaria ORDER BY status_conta")
        status_unicos = cursor.fetchall()
        
        for (status,) in status_unicos:
            print(f"   • '{status}'")
        
        # 6. AMOSTRAS DE CADA STATUS
        print("\n📝 AMOSTRAS DE CADA STATUS:")
        for (status,) in status_unicos:
            cursor.execute("""
                SELECT COUNT(*), banco, conta_corrente 
                FROM conta_bancaria 
                WHERE status_conta = ? 
                GROUP BY banco, conta_corrente 
                ORDER BY COUNT(*) DESC 
                LIMIT 3
            """, (status,))
            amostras = cursor.fetchall()
            
            print(f"   📌 Status '{status}':")
            for count, banco, conta in amostras:
                print(f"      • {banco or 'N/A'} - {conta or 'N/A'} ({count} registros)")
        
        return True
        
    except Exception as e:
        print(f"❌ Erro durante a análise: {str(e)}")
        return False
    
    finally:
        conn.close()

if __name__ == "__main__":
    print("=" * 70)
    print("🎯 ANÁLISE: CONTAS BANCÁRIAS")
    print("=" * 70)
    
    if analisar_contas_bancarias():
        print("\n✅ ANÁLISE CONCLUÍDA!")
    else:
        print("\n❌ ANÁLISE FALHOU!")
    
    print("=" * 70)