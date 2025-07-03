#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Debug do Frontend de Transações
Testa toda a cadeia de carregamento
"""

import requests
import sys
import json

def debug_transacoes_frontend():
    """Debug completo do frontend"""
    
    base_url = "http://127.0.0.1:5000"
    session = requests.Session()
    
    try:
        print("🔍 DEBUGGING FRONTEND DE TRANSAÇÕES")
        print("=" * 50)
        
        # 1. Fazer login
        login_data = {'username': 'rilis', 'password': '123'}
        login_response = session.post(f"{base_url}/login", data=login_data)
        
        if login_response.status_code != 200:
            print(f"❌ Login falhou: {login_response.status_code}")
            return False
            
        print("✅ 1. Login realizado com sucesso")
        
        # 2. Testar página de transações
        page_response = session.get(f"{base_url}/transacoes")
        if page_response.status_code != 200:
            print(f"❌ Página /transacoes falhou: {page_response.status_code}")
            return False
            
        print("✅ 2. Página /transacoes carregada")
        
        # 3. Testar API KPIs
        kpis_response = session.get(f"{base_url}/api/dashboard/kpis")
        if kpis_response.status_code == 200:
            kpis_data = kpis_response.json()
            print(f"✅ 3. API KPIs funcionando - {kpis_data.get('total_transacoes', 0)} transações")
        else:
            print(f"❌ API KPIs falhou: {kpis_response.status_code}")
        
        # 4. Testar API de transações (mesmo call que JS faz)
        api_params = {
            'page': 1,
            'per_page': 20,
            'view_type': 'previsao'
        }
        
        api_response = session.get(f"{base_url}/api/transacoes", params=api_params)
        if api_response.status_code != 200:
            print(f"❌ API /api/transacoes falhou: {api_response.status_code}")
            print(f"Response: {api_response.text[:200]}")
            return False
            
        api_data = api_response.json()
        transacoes = api_data.get('transacoes', [])
        
        print(f"✅ 4. API /api/transacoes funcionando")
        print(f"   📊 Total encontrado: {api_data.get('total', 0)}")
        print(f"   📋 Transações retornadas: {len(transacoes)}")
        
        if len(transacoes) > 0:
            primeira = transacoes[0]
            print(f"   🔍 Primeira transação:")
            print(f"       ID: {primeira.get('id')}")
            print(f"       Título: {primeira.get('titulo')}")
            print(f"       Tipo: {primeira.get('tipo')}")
            print(f"       Valor: R$ {primeira.get('valor', 0):,.2f}")
            print(f"       Status: {primeira.get('status_pagamento')}")
        else:
            print("   ⚠️ Nenhuma transação retornada!")
            
        # 5. Testar com filtros diferentes
        print("\n🧪 TESTANDO FILTROS ESPECÍFICOS")
        print("-" * 30)
        
        # Teste sem filtros
        no_filter_response = session.get(f"{base_url}/api/transacoes?per_page=5")
        if no_filter_response.status_code == 200:
            no_filter_data = no_filter_response.json()
            print(f"✅ Sem filtros: {len(no_filter_data.get('transacoes', []))} transações")
        
        # Teste com tipo Entrada
        entrada_response = session.get(f"{base_url}/api/transacoes?tipo=Entrada&per_page=5")
        if entrada_response.status_code == 200:
            entrada_data = entrada_response.json()
            print(f"✅ Tipo Entrada: {len(entrada_data.get('transacoes', []))} transações")
        
        # Teste com tipo Saída
        saida_response = session.get(f"{base_url}/api/transacoes?tipo=Saída&per_page=5")
        if saida_response.status_code == 200:
            saida_data = saida_response.json()
            print(f"✅ Tipo Saída: {len(saida_data.get('transacoes', []))} transações")
            
        # 6. Verificar estrutura de dados
        if len(transacoes) > 0:
            print(f"\n📋 ESTRUTURA DA PRIMEIRA TRANSAÇÃO:")
            print("-" * 40)
            sample = transacoes[0]
            for key, value in sample.items():
                print(f"   {key}: {value}")
        
        return True
        
    except Exception as e:
        print(f"❌ Erro durante debug: {e}")
        return False

if __name__ == "__main__":
    debug_transacoes_frontend()