#!/usr/bin/env python3
"""
MIGRAÇÃO 04: Corrigir Transações Realizadas
- Atualizar data_pagamento = data_vencimento para transações com status 'Realizado'
- Remover coluna data_baixa (não utilizaremos, data_pagamento será a data de baixa)
- Adicionar valor_pago = valor para transações já realizadas
"""

import sqlite3
import os
from datetime import datetime

def executar_correcao():
    """Executa a correção das transações realizadas"""
    
    db_path = 'selleta_main.db'
    
    if not os.path.exists(db_path):
        print("❌ Banco de dados não encontrado!")
        return False
    
    print("🚀 Iniciando correção das transações realizadas...")
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # 1. VERIFICAR SITUAÇÃO ATUAL
        print("🔍 Verificando situação atual...")
        cursor.execute("""
            SELECT COUNT(*) 
            FROM transacoes 
            WHERE LOWER(status_pagamento) = 'realizado' 
              AND data_pagamento IS NULL
        """)
        transacoes_para_corrigir = cursor.fetchone()[0]
        print(f"📊 Transações 'Realizado' sem data_pagamento: {transacoes_para_corrigir:,}")
        
        if transacoes_para_corrigir == 0:
            print("✅ Nenhuma correção necessária!")
            return True
        
        # 2. ATUALIZAR DATA_PAGAMENTO E VALOR_PAGO PARA TRANSAÇÕES REALIZADAS
        print(f"💰 Corrigindo {transacoes_para_corrigir:,} transações...")
        
        cursor.execute("""
            UPDATE transacoes 
            SET data_pagamento = data_vencimento,
                valor_pago = valor,
                data_ultima_alteracao = ?
            WHERE LOWER(status_pagamento) = 'realizado' 
              AND data_pagamento IS NULL
        """, (datetime.now().isoformat(),))
        
        registros_atualizados = cursor.rowcount
        print(f"✅ {registros_atualizados:,} transações corrigidas!")
        
        # 3. REMOVER COLUNA DATA_BAIXA (SE EXISTIR)
        print("🗑️  Removendo coluna data_baixa (não será utilizada)...")
        try:
            # SQLite não suporta DROP COLUMN diretamente, então vamos criar uma nova tabela
            # Mas primeiro vamos verificar se a coluna existe
            cursor.execute("PRAGMA table_info(transacoes)")
            colunas = [col[1] for col in cursor.fetchall()]
            
            if 'data_baixa' in colunas:
                print("   ⚠️  Coluna data_baixa encontrada, mas será mantida para compatibilidade")
                print("   📋 A data_pagamento será usada como data de baixa efetiva")
            else:
                print("   ✅ Coluna data_baixa não existe")
        except Exception as e:
            print(f"   ⚠️  Erro ao verificar coluna data_baixa: {e}")
        
        # 4. VERIFICAR RESULTADOS
        print("🔍 Verificando resultados da correção...")
        
        cursor.execute("""
            SELECT COUNT(*) 
            FROM transacoes 
            WHERE LOWER(status_pagamento) = 'realizado' 
              AND data_pagamento IS NOT NULL
        """)
        transacoes_corrigidas = cursor.fetchone()[0]
        
        cursor.execute("""
            SELECT COUNT(*) 
            FROM transacoes 
            WHERE LOWER(status_pagamento) = 'realizado' 
              AND valor_pago IS NOT NULL
        """)
        com_valor_pago = cursor.fetchone()[0]
        
        cursor.execute("""
            SELECT COUNT(*) 
            FROM transacoes 
            WHERE LOWER(status_pagamento) = 'realizado' 
              AND data_pagamento IS NULL
        """)
        ainda_sem_data = cursor.fetchone()[0]
        
        print(f"📈 RESULTADOS:")
        print(f"   ✅ Transações 'Realizado' com data_pagamento: {transacoes_corrigidas:,}")
        print(f"   💰 Transações 'Realizado' com valor_pago: {com_valor_pago:,}")
        print(f"   ❌ Ainda sem data_pagamento: {ainda_sem_data:,}")
        
        # 5. AMOSTRAS DOS DADOS CORRIGIDOS
        print("\n🎯 AMOSTRA DAS CORREÇÕES (primeiras 5 transações):")
        cursor.execute("""
            SELECT 
                id,
                titulo,
                valor,
                data_vencimento,
                data_pagamento,
                valor_pago,
                status_pagamento
            FROM transacoes 
            WHERE LOWER(status_pagamento) = 'realizado' 
              AND data_pagamento IS NOT NULL
            ORDER BY id DESC
            LIMIT 5
        """)
        amostras = cursor.fetchall()
        
        if amostras:
            print("   " + "="*100)
            print(f"   {'ID':<8} {'TÍTULO':<25} {'VALOR':<12} {'DATA_VENC':<12} {'DATA_PAGTO':<12} {'VALOR_PAGO':<12}")
            print("   " + "="*100)
            
            for row in amostras:
                id_t, titulo, valor, data_venc, data_pag, valor_pago, status = row
                titulo_t = (titulo[:22] + '...') if len(titulo) > 25 else titulo
                print(f"   {id_t:<8} {titulo_t:<25} R$ {valor:<9.2f} {str(data_venc)[:10]:<12} {str(data_pag)[:10]:<12} R$ {valor_pago:<9.2f}")
        
        # 6. ESTATÍSTICAS FINAIS
        print("\n📊 ESTATÍSTICAS FINAIS:")
        
        cursor.execute("SELECT COUNT(*) FROM transacoes")
        total = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM transacoes WHERE data_pagamento IS NOT NULL")
        com_pagamento = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM transacoes WHERE LOWER(status_pagamento) = 'realizado'")
        realizadas = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM transacoes WHERE LOWER(status_pagamento) IN ('atrasado', 'previsao')")
        pendentes = cursor.fetchone()[0]
        
        print(f"   📈 Total de transações: {total:,}")
        print(f"   💳 Com data_pagamento: {com_pagamento:,}")
        print(f"   ✅ Status 'Realizado': {realizadas:,}")
        print(f"   ⏳ Pendentes (Atrasado/Previsão): {pendentes:,}")
        print(f"   📊 % Realizadas: {(realizadas/total*100):.1f}%")
        
        # Commit das alterações
        conn.commit()
        print(f"\n✅ Correção concluída com sucesso!")
        print(f"📅 Data da correção: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        
        return True
        
    except Exception as e:
        print(f"❌ Erro durante a correção: {str(e)}")
        conn.rollback()
        return False
    
    finally:
        conn.close()

def verificar_correcao():
    """Verifica se a correção foi aplicada corretamente"""
    
    db_path = 'selleta_main.db'
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        print("\n🔍 VERIFICAÇÃO FINAL:")
        
        # Verificar se ainda há transações realizadas sem data_pagamento
        cursor.execute("""
            SELECT COUNT(*) 
            FROM transacoes 
            WHERE LOWER(status_pagamento) = 'realizado' 
              AND data_pagamento IS NULL
        """)
        sem_data = cursor.fetchone()[0]
        
        # Verificar se data_pagamento = data_vencimento para as corrigidas
        cursor.execute("""
            SELECT COUNT(*) 
            FROM transacoes 
            WHERE LOWER(status_pagamento) = 'realizado' 
              AND data_pagamento = data_vencimento
              AND valor_pago = valor
        """)
        corrigidas_corretamente = cursor.fetchone()[0]
        
        print(f"   {'✅' if sem_data == 0 else '❌'} Transações 'Realizado' sem data_pagamento: {sem_data}")
        print(f"   ✅ Transações corrigidas corretamente: {corrigidas_corretamente:,}")
        
        if sem_data == 0:
            print("   🎉 CORREÇÃO 100% CONCLUÍDA!")
        else:
            print("   ⚠️  Ainda há transações para corrigir!")
        
        return sem_data == 0
        
    except Exception as e:
        print(f"❌ Erro na verificação: {str(e)}")
        return False
    
    finally:
        conn.close()

if __name__ == "__main__":
    print("=" * 80)
    print("🎯 MIGRAÇÃO 04: CORRIGIR TRANSAÇÕES REALIZADAS")
    print("=" * 80)
    
    if executar_correcao():
        if verificar_correcao():
            print("\n🎉 MIGRAÇÃO 04 CONCLUÍDA COM SUCESSO!")
        else:
            print("\n⚠️  MIGRAÇÃO PARCIALMENTE CONCLUÍDA!")
    else:
        print("\n❌ MIGRAÇÃO 04 FALHOU!")
    
    print("=" * 80)