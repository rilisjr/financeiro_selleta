#!/usr/bin/env python3
"""
Script para extrair empresas com dados completos do CSV do Sienge
Processa o formato específico do arquivo empresas.csv
"""

import csv
import re
from pathlib import Path
from collections import defaultdict

def processar_csv_sienge():
    """Processa o CSV específico do Sienge com formato customizado"""
    base_path = Path(__file__).parent.parent
    csv_file = base_path / 'informacoes_llm_visual' / 'referencia_empresas' / 'empresas.csv'
    
    empresas = []
    empresa_atual = {}
    
    try:
        with open(csv_file, 'r', encoding='utf-8', errors='ignore') as f:
            lines = f.readlines()
        
        print(f"Lendo {len(lines)} linhas do arquivo CSV...")
        
        for i, line in enumerate(lines):
            line = line.strip()
            if not line or line == ';;;;;;;;':
                continue
                
            # Dividir por ponto e vírgula
            parts = [p.strip() for p in line.split(';')]
            
            if len(parts) < 2:
                continue
            
            # Identificar início de nova empresa
            if parts[0] == 'Empresa' and len(parts) > 1 and parts[1]:
                # Salvar empresa anterior se existir
                if empresa_atual.get('nome'):
                    empresas.append(empresa_atual.copy())
                
                # Iniciar nova empresa
                empresa_atual = {}
                
                # Extrair código e nome
                empresa_info = parts[1]
                match = re.match(r'^(\d+)\s*-\s*(.+)$', empresa_info)
                if match:
                    empresa_atual['codigo'] = match.group(1)
                    empresa_atual['nome'] = match.group(2).strip()
                
                # Extrair grupo e situação da mesma linha
                if len(parts) > 4 and parts[4] == 'Grupo' and len(parts) > 5:
                    empresa_atual['grupo'] = parts[5]
                if len(parts) > 8 and parts[8] and parts[7] == 'Situação':
                    empresa_atual['situacao'] = parts[8]
                    
            elif ('Endere' in parts[0] or parts[0] == 'Endereço') and empresa_atual:
                empresa_atual['endereco'] = parts[1] if len(parts) > 1 else ''
                
                # Município e CEP na mesma linha (verificar nomes com caracteres especiais)
                for i, part in enumerate(parts):
                    if 'Munic' in part and i + 1 < len(parts):
                        empresa_atual['municipio'] = parts[i + 1]
                    elif part == 'CEP' and i + 1 < len(parts):
                        empresa_atual['cep'] = parts[i + 1]
                    
            elif parts[0] == 'Fone' and empresa_atual:
                empresa_atual['telefone'] = parts[1] if len(parts) > 1 else ''
                
            elif parts[0] == 'CNPJ' and empresa_atual:
                empresa_atual['cnpj'] = parts[1] if len(parts) > 1 else ''
        
        # Adicionar última empresa
        if empresa_atual.get('nome'):
            empresas.append(empresa_atual)
            
    except Exception as e:
        print(f"Erro ao processar CSV: {e}")
        return []
    
    return empresas

def extrair_empresas_transacoes():
    """Extrai empresas das transações para comparação"""
    base_path = Path(__file__).parent.parent
    transacoes_file = base_path / 'importacao' / 'b_dados_transacoes.csv'
    
    empresas_transacoes = set()
    
    try:
        with open(transacoes_file, 'r', encoding='utf-8-sig') as f:
            reader = csv.DictReader(f)
            
            for row in reader:
                empresa = row.get('## Empresa', '').strip()
                if empresa:
                    empresas_transacoes.add(empresa)
    
    except Exception as e:
        print(f"Erro ao ler transações: {e}")
        return set()
    
    return empresas_transacoes

def normalizar_nome(nome):
    """Normaliza nome para comparação"""
    if not nome:
        return ""
    return re.sub(r'\s+', ' ', nome.strip().upper())

def main():
    """Executa o processo completo"""
    print("="*60)
    print("EXTRAÇÃO COMPLETA DE EMPRESAS")
    print("="*60)
    
    # 1. Processar CSV do Sienge
    print("\n1. Processando CSV do Sienge...")
    empresas_sienge = processar_csv_sienge()
    print(f"   Encontradas {len(empresas_sienge)} empresas no Sienge")
    
    # 2. Extrair empresas das transações
    print("\n2. Extraindo empresas das transações...")
    empresas_transacoes = extrair_empresas_transacoes()
    print(f"   Encontradas {len(empresas_transacoes)} empresas nas transações")
    
    # 3. Fazer matching e criar dataset final
    print("\n3. Fazendo matching entre as fontes...")
    empresas_finais = []
    empresas_nao_encontradas = []
    
    for empresa_transacao in sorted(empresas_transacoes):
        # Extrair código da transação
        match_codigo = re.match(r'^(\d+)\s*-', empresa_transacao)
        codigo_transacao = match_codigo.group(1) if match_codigo else None
        nome_transacao = normalizar_nome(empresa_transacao)
        
        # Buscar correspondência no Sienge
        empresa_encontrada = None
        for empresa_sienge in empresas_sienge:
            codigo_sienge = empresa_sienge.get('codigo', '')
            # Normalizar códigos removendo zeros à esquerda para comparação
            if codigo_transacao and codigo_sienge:
                if int(codigo_transacao) == int(codigo_sienge):
                    empresa_encontrada = empresa_sienge
                    break
            # Fallback: comparar por nome normalizado
            elif normalizar_nome(empresa_sienge.get('nome', '')) == nome_transacao:
                empresa_encontrada = empresa_sienge
                break
        
        if empresa_encontrada:
            # Criar registro completo
            empresa_final = {
                'id': len(empresas_finais) + 1,
                'codigo': empresa_encontrada.get('codigo', ''),
                'nome': empresa_encontrada.get('nome', ''),
                'grupo': empresa_encontrada.get('grupo', 'Grupo Selleta'),
                'cnpj': empresa_encontrada.get('cnpj', ''),
                'endereco': empresa_encontrada.get('endereco', ''),
                'municipio': empresa_encontrada.get('municipio', ''),
                'cep': empresa_encontrada.get('cep', ''),
                'telefone': empresa_encontrada.get('telefone', ''),
                'situacao': empresa_encontrada.get('situacao', 'Ativa'),
                'ativo': 1 if empresa_encontrada.get('situacao', 'Ativa') == 'Ativa' else 0
            }
            empresas_finais.append(empresa_final)
            print(f"   ✅ {empresa_final['codigo']} - {empresa_final['nome']}")
        else:
            empresas_nao_encontradas.append(empresa_transacao)
            print(f"   ❌ Não encontrada: {empresa_transacao}")
    
    # 4. Salvar CSV final
    print(f"\n4. Salvando {len(empresas_finais)} empresas...")
    
    base_path = Path(__file__).parent.parent
    output_file = base_path / 'importacao' / 'b_dados_empresas.csv'
    
    with open(output_file, 'w', encoding='utf-8-sig', newline='') as f:
        fieldnames = ['id', 'codigo', 'nome', 'grupo', 'cnpj', 'endereco', 'municipio', 'cep', 'telefone', 'ativo']
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        
        for empresa in empresas_finais:
            # Limpar dados antes de salvar
            row = {}
            for field in fieldnames:
                value = empresa.get(field, '')
                # Limpar caracteres especiais de encoding
                if isinstance(value, str):
                    value = value.replace('�', 'ã').replace('��', 'ção').replace('�', 'ú')
                row[field] = value
            writer.writerow(row)
    
    print(f"✅ Arquivo salvo: {output_file}")
    
    # 5. Estatísticas detalhadas
    print("\n📊 ESTATÍSTICAS DETALHADAS:")
    print(f"   Total de empresas processadas: {len(empresas_finais)}")
    print(f"   Empresas não encontradas: {len(empresas_nao_encontradas)}")
    
    if empresas_nao_encontradas:
        print("   Empresas não encontradas:")
        for emp in empresas_nao_encontradas:
            print(f"     - {emp}")
    
    # Análise por município
    municipios = defaultdict(int)
    grupos = defaultdict(int)
    
    for empresa in empresas_finais:
        municipio = empresa.get('municipio', 'Não informado')
        if municipio:
            municipios[municipio] += 1
        
        grupo = empresa.get('grupo', 'Sem grupo')
        grupos[grupo] += 1
    
    print(f"\n   Distribuição por município:")
    for municipio, count in sorted(municipios.items()):
        print(f"     {municipio}: {count} empresa(s)")
    
    print(f"\n   Distribuição por grupo:")
    for grupo, count in sorted(grupos.items()):
        print(f"     {grupo}: {count} empresa(s)")
    
    # 6. Preview detalhado
    print("\n📋 PREVIEW DETALHADO:")
    for empresa in empresas_finais:
        print(f"\n   📍 {empresa['codigo']} - {empresa['nome']}")
        print(f"      CNPJ: {empresa['cnpj']}")
        print(f"      Endereço: {empresa['endereco']}")
        print(f"      Município: {empresa['municipio']} - CEP: {empresa['cep']}")
        print(f"      Telefone: {empresa['telefone']}")
        print(f"      Grupo: {empresa['grupo']} | Status: {'Ativa' if empresa['ativo'] else 'Inativa'}")

if __name__ == "__main__":
    main()