#!/usr/bin/env python3
"""
TESTE DIRETO: Simulação da API de Contas Bancárias
Testa diretamente no banco sem autenticação
"""

import sqlite3
import json

def teste_direto_contas():
    """Testa diretamente no banco"""
    
    print("🧪 Testando consulta direta no banco...")
    
    try:
        conn = sqlite3.connect('selleta_main.db')
        cursor = conn.cursor()
        
        # Mesma query da API
        cursor.execute("""
            SELECT id, banco, agencia, conta_corrente, tipo_conta, status_conta, empresa, saldo_inicial
            FROM conta_bancaria
            WHERE status_conta = 'Ativa' AND ativo = 1
            ORDER BY banco, conta_corrente
        """)
        
        results = cursor.fetchall()
        
        print(f"📊 Resultado da query: {len(results)} registros encontrados")
        
        contas = []
        for row in results:
            conta = {
                'id': row[0],
                'banco': row[1] or '',
                'agencia': row[2] or '',
                'conta': row[3] or '',
                'tipo': row[4] or '',
                'status': row[5] or '',
                'empresa': row[6] or '',
                'saldo_inicial': row[7] or 0
            }
            contas.append(conta)
            
            # Formato que apareceria no dropdown
            banco_fmt = (conta['banco'] or 'N/A')[:30]
            agencia_fmt = conta['agencia'] or 'N/A'
            conta_fmt = conta['conta'] or 'N/A'
            empresa_fmt = f" ({conta['empresa'][:15]})" if conta['empresa'] else ''
            
            dropdown_text = f"{banco_fmt} - Ag: {agencia_fmt} - CC: {conta_fmt}{empresa_fmt}"
            
            print(f"\n📋 Conta {conta['id']}:")
            print(f"   • Banco: {conta['banco']}")
            print(f"   • Agência: {conta['agencia']}")
            print(f"   • Conta: {conta['conta']}")
            print(f"   • Empresa: {conta['empresa']}")
            print(f"   • Saldo: R$ {conta['saldo_inicial']:.2f}")
            print(f"   • Status: {conta['status']}")
            print(f"   • Dropdown: {dropdown_text}")
        
        # JSON que seria retornado pela API
        api_response = {
            'success': True,
            'data': contas
        }
        
        print(f"\n📤 JSON que seria retornado pela API:")
        print(json.dumps(api_response, indent=2, ensure_ascii=False))
        
        conn.close()
        return True
        
    except Exception as e:
        print(f"❌ Erro: {str(e)}")
        return False

if __name__ == "__main__":
    print("=" * 70)
    print("🎯 TESTE DIRETO: CONTAS BANCÁRIAS")
    print("=" * 70)
    
    if teste_direto_contas():
        print("\n✅ TESTE CONCLUÍDO!")
    else:
        print("\n❌ TESTE FALHOU!")
    
    print("=" * 70)