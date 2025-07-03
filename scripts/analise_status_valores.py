#!/usr/bin/env python3
"""
ANÁLISE: Status de Pagamento e Negociação
Identifica todos os valores únicos usados no BD
"""

import sqlite3
import os

def analisar_status_valores():
    """Analisa valores únicos de status"""
    
    db_path = 'selleta_main.db'
    
    if not os.path.exists(db_path):
        print("❌ Banco de dados não encontrado!")
        return False
    
    print("🔍 Analisando valores de status no banco...")
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # 1. STATUS_PAGAMENTO
        print("\n📊 VALORES ÚNICOS DE STATUS_PAGAMENTO:")
        cursor.execute("""
            SELECT DISTINCT status_pagamento, COUNT(*) as quantidade
            FROM transacoes 
            GROUP BY status_pagamento 
            ORDER BY quantidade DESC
        """)
        status_pagamento = cursor.fetchall()
        
        for status, count in status_pagamento:
            percentual = (count / 24522) * 100  # Total conhecido de transações
            print(f"   • '{status}': {count:,} transações ({percentual:.1f}%)")
        
        # 2. STATUS_NEGOCIACAO
        print("\n📊 VALORES ÚNICOS DE STATUS_NEGOCIACAO:")
        cursor.execute("""
            SELECT DISTINCT status_negociacao, COUNT(*) as quantidade
            FROM transacoes 
            WHERE status_negociacao IS NOT NULL AND status_negociacao != ''
            GROUP BY status_negociacao 
            ORDER BY quantidade DESC
        """)
        status_negociacao = cursor.fetchall()
        
        if status_negociacao:
            for status, count in status_negociacao:
                print(f"   • '{status}': {count:,} transações")
        else:
            print("   ⚠️  Nenhum valor encontrado para status_negociacao")
        
        # 3. VALORES PADRÃO PARA NOVAS TRANSAÇÕES
        print("\n🎯 RECOMENDAÇÃO PARA NOVAS TRANSAÇÕES:")
        print("   • status_negociacao: 'Aprovado' (valor fixo)")
        print("   • status_pagamento: 'Previsao' (para transações futuras)")
        print("                    ou 'Atrasado' (se data_vencimento < hoje)")
        
        # 4. VERIFICAR TRANSAÇÕES RECENTES
        print("\n📅 STATUS DAS ÚLTIMAS 10 TRANSAÇÕES CRIADAS:")
        cursor.execute("""
            SELECT id, titulo, status_negociacao, status_pagamento, data_lancamento
            FROM transacoes 
            WHERE origem_importacao = 'MANUAL' OR data_lancamento >= date('now', '-30 days')
            ORDER BY id DESC 
            LIMIT 10
        """)
        recentes = cursor.fetchall()
        
        if recentes:
            for row in recentes:
                id_t, titulo, status_neg, status_pag, data_lanc = row
                titulo_t = (titulo[:30] + '...') if titulo and len(titulo) > 33 else titulo
                print(f"   ID {id_t}: {titulo_t} | Neg: '{status_neg}' | Pag: '{status_pag}'")
        else:
            print("   ⚠️  Nenhuma transação manual recente encontrada")
        
        return True
        
    except Exception as e:
        print(f"❌ Erro durante a análise: {str(e)}")
        return False
    
    finally:
        conn.close()

if __name__ == "__main__":
    print("=" * 70)
    print("🎯 ANÁLISE: STATUS DE PAGAMENTO E NEGOCIAÇÃO")
    print("=" * 70)
    
    if analisar_status_valores():
        print("\n✅ ANÁLISE CONCLUÍDA!")
    else:
        print("\n❌ ANÁLISE FALHOU!")
    
    print("=" * 70)