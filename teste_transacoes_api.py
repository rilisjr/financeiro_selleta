#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Teste da API de Transações
Verifica se as rotas estão funcionando corretamente
"""

import requests
import sys

def test_transacoes_api():
    """Testa a API de transações"""
    
    base_url = "http://127.0.0.1:5000"
    
    # Primeiro, fazer login
    login_data = {
        'username': 'rilis',
        'password': '123'
    }
    
    session = requests.Session()
    
    try:
        # Login
        login_response = session.post(f"{base_url}/", data=login_data)
        if login_response.status_code != 200:
            print(f"❌ Erro no login: {login_response.status_code}")
            return False
            
        print("✅ Login realizado com sucesso")
        
        # Testar rota de transações (página)
        page_response = session.get(f"{base_url}/transacoes")
        if page_response.status_code != 200:
            print(f"❌ Erro na página /transacoes: {page_response.status_code}")
            return False
            
        print("✅ Página /transacoes carregada com sucesso")
        
        # Testar API de transações
        api_response = session.get(f"{base_url}/api/transacoes?per_page=5")
        if api_response.status_code != 200:
            print(f"❌ Erro na API /api/transacoes: {api_response.status_code}")
            return False
            
        api_data = api_response.json()
        print(f"✅ API /api/transacoes funcionando - {len(api_data.get('transacoes', []))} transações retornadas")
        
        # Verificar tipos de transação
        tipos_encontrados = set()
        for transacao in api_data.get('transacoes', []):
            tipos_encontrados.add(transacao.get('tipo'))
            
        print(f"📊 Tipos encontrados: {list(tipos_encontrados)}")
        
        # Testar filtro por tipo
        for tipo in ['Entrada', 'Saída']:
            filtro_response = session.get(f"{base_url}/api/transacoes?tipo={tipo}&per_page=3")
            if filtro_response.status_code == 200:
                filtro_data = filtro_response.json()
                count = len(filtro_data.get('transacoes', []))
                print(f"✅ Filtro por tipo '{tipo}': {count} transações")
            else:
                print(f"❌ Erro no filtro por tipo '{tipo}': {filtro_response.status_code}")
        
        # Testar KPIs
        kpi_response = session.get(f"{base_url}/api/dashboard/kpis")
        if kpi_response.status_code == 200:
            kpi_data = kpi_response.json()
            print(f"✅ KPIs carregados - Receitas: R$ {kpi_data.get('receitas_mes', 0):,.2f}")
        else:
            print(f"❌ Erro nos KPIs: {kpi_response.status_code}")
            
        return True
        
    except Exception as e:
        print(f"❌ Erro durante teste: {e}")
        return False

if __name__ == "__main__":
    print("🚀 Testando API de Transações...")
    success = test_transacoes_api()
    
    if success:
        print("\n✅ Todos os testes passaram!")
        sys.exit(0)
    else:
        print("\n❌ Alguns testes falharam!")
        sys.exit(1)