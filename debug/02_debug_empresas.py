#!/usr/bin/env python3
"""
Debug: Verificar empresas encontradas no CSV do Sienge
"""

import csv
import re
from pathlib import Path

def debug_csv_sienge():
    """Debug detalhado do CSV do Sienge"""
    base_path = Path(__file__).parent.parent
    csv_file = base_path / 'informacoes_llm_visual' / 'referencia_empresas' / 'empresas.csv'
    
    empresas = []
    empresa_atual = {}
    
    print("=== DEBUG CSV SIENGE ===")
    
    try:
        with open(csv_file, 'r', encoding='utf-8', errors='ignore') as f:
            lines = f.readlines()
        
        print(f"Total de linhas: {len(lines)}")
        print("\nPrimeiras 20 linhas processadas:")
        
        for i, line in enumerate(lines[:20]):
            line = line.strip()
            print(f"{i+1:2d}: {repr(line)}")
            
            if not line or line == ';;;;;;;;':
                continue
                
            parts = [p.strip() for p in line.split(';')]
            print(f"    Parts: {parts}")
            
            if parts[0] == 'Empresa' and len(parts) > 1 and parts[1]:
                if empresa_atual.get('nome'):
                    empresas.append(empresa_atual.copy())
                    print(f"    ✅ Empresa salva: {empresa_atual}")
                
                empresa_atual = {}
                empresa_info = parts[1]
                print(f"    📝 Nova empresa: {empresa_info}")
                
                match = re.match(r'^(\d+)\s*-\s*(.+)$', empresa_info)
                if match:
                    empresa_atual['codigo'] = match.group(1)
                    empresa_atual['nome'] = match.group(2).strip()
                    print(f"    📊 Código: {empresa_atual['codigo']}, Nome: {empresa_atual['nome']}")
                
                # Extrair grupo e situação
                if len(parts) > 4 and parts[4] == 'Grupo' and len(parts) > 5:
                    empresa_atual['grupo'] = parts[5]
                if len(parts) > 8 and parts[8] and parts[7] == 'Situação':
                    empresa_atual['situacao'] = parts[8]
                    
            elif parts[0] == 'Endereço' and empresa_atual:
                empresa_atual['endereco'] = parts[1] if len(parts) > 1 else ''
                if len(parts) > 4 and parts[4] == 'Município' and len(parts) > 5:
                    empresa_atual['municipio'] = parts[5]
                if len(parts) > 7 and parts[7] == 'CEP' and len(parts) > 8:
                    empresa_atual['cep'] = parts[8]
                    
            elif parts[0] == 'CNPJ' and empresa_atual:
                empresa_atual['cnpj'] = parts[1] if len(parts) > 1 else ''
        
        # Adicionar última empresa
        if empresa_atual.get('nome'):
            empresas.append(empresa_atual)
            print(f"    ✅ Última empresa salva: {empresa_atual}")
            
        print(f"\n=== EMPRESAS ENCONTRADAS ({len(empresas)}) ===")
        for i, emp in enumerate(empresas, 1):
            print(f"{i}. Código: {emp.get('codigo', 'N/A')}")
            print(f"   Nome: {emp.get('nome', 'N/A')}")
            print(f"   CNPJ: {emp.get('cnpj', 'N/A')}")
            print(f"   Município: {emp.get('municipio', 'N/A')}")
            print(f"   Grupo: {emp.get('grupo', 'N/A')}")
            print()
            
    except Exception as e:
        print(f"❌ Erro: {e}")
        import traceback
        traceback.print_exc()
    
    return empresas

def debug_transacoes():
    """Debug das empresas nas transações"""
    base_path = Path(__file__).parent.parent
    transacoes_file = base_path / 'importacao' / 'b_dados_transacoes.csv'
    
    empresas_transacoes = set()
    
    print("\n=== DEBUG EMPRESAS NAS TRANSAÇÕES ===")
    
    try:
        with open(transacoes_file, 'r', encoding='utf-8-sig') as f:
            reader = csv.DictReader(f)
            
            for i, row in enumerate(reader):
                if i < 5:  # Mostrar apenas primeiras 5 linhas
                    empresa = row.get('## Empresa', '').strip()
                    print(f"Linha {i+1}: '{empresa}'")
                    if empresa:
                        empresas_transacoes.add(empresa)
    
        print(f"\nEmpresas únicas nas transações ({len(empresas_transacoes)}):")
        for emp in sorted(empresas_transacoes):
            print(f"  - '{emp}'")
            
    except Exception as e:
        print(f"❌ Erro: {e}")
    
    return empresas_transacoes

if __name__ == "__main__":
    empresas_sienge = debug_csv_sienge()
    empresas_trans = debug_transacoes()
    
    print("\n=== COMPARAÇÃO ===")
    for emp_trans in sorted(empresas_trans):
        print(f"\nTransação: '{emp_trans}'")
        
        # Extrair código
        match = re.match(r'^(\d+)\s*-', emp_trans)
        codigo = match.group(1) if match else None
        print(f"Código extraído: {codigo}")
        
        # Buscar no Sienge
        encontrado = False
        for emp_sienge in empresas_sienge:
            if emp_sienge.get('codigo') == codigo:
                print(f"✅ Encontrado: {emp_sienge['nome']}")
                encontrado = True
                break
        
        if not encontrado:
            print("❌ Não encontrado")