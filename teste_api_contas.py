#!/usr/bin/env python3
"""
TESTE: API de Contas Bancárias
Testa o endpoint /api/contas-bancarias
"""

import requests
import json

def testar_api_contas():
    """Testa a API de contas bancárias"""
    
    print("🧪 Testando API /api/contas-bancarias...")
    
    try:
        # URL do endpoint
        url = 'http://127.0.0.1:5000/api/contas-bancarias'
        
        print(f"📡 Fazendo requisição para: {url}")
        
        # Fazer requisição
        response = requests.get(url)
        
        print(f"📈 Status Code: {response.status_code}")
        print(f"📋 Headers: {dict(response.headers)}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Resposta JSON:")
            print(json.dumps(data, indent=2, ensure_ascii=False))
            
            if 'data' in data:
                contas = data['data']
                print(f"\n📊 Total de contas ativas: {len(contas)}")
                
                for i, conta in enumerate(contas, 1):
                    print(f"   {i}. ID: {conta.get('id')} - {conta.get('banco', 'N/A')} - {conta.get('conta', 'N/A')}")
            
        elif response.status_code == 401:
            print("❌ Não autenticado - faça login primeiro")
            
        else:
            print(f"❌ Erro: {response.status_code}")
            print(f"📄 Resposta: {response.text}")
            
    except requests.exceptions.ConnectionError:
        print("❌ Erro de conexão - servidor não está rodando?")
    except Exception as e:
        print(f"❌ Erro: {str(e)}")

if __name__ == "__main__":
    print("=" * 60)
    print("🎯 TESTE: API DE CONTAS BANCÁRIAS")
    print("=" * 60)
    
    testar_api_contas()
    
    print("=" * 60)