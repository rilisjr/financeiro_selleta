#!/usr/bin/env python3
"""
Script para extrair centros de custo únicos das transações
Gera CSV para análise e limpeza via LLM
"""

import csv
import sqlite3
from pathlib import Path
from collections import defaultdict

def extrair_centros_custo_transacoes():
    """Extrai centros de custo únicos das transações do CSV com filtro dinâmico"""
    base_path = Path(__file__).parent.parent
    transacoes_file = base_path / 'importacao' / 'b_dados_transacoes.csv'
    
    print("📊 Extraindo centros de custo das transações com filtro dinâmico...")
    
    try:
        # Ler todos os dados primeiro
        dados_brutos = []
        empresas_encontradas = set()
        
        with open(transacoes_file, 'r', encoding='utf-8-sig') as f:
            reader = csv.DictReader(f)
            
            for row in reader:
                centro_custo = row.get('## Centro Custo', '').strip()
                empresa = row.get('## Empresa', '').strip()
                tipologia = row.get('## Tipologia do lançamento', '').strip()
                
                if centro_custo and empresa:
                    empresas_encontradas.add(empresa)
                    dados_brutos.append({
                        'centro_custo': centro_custo,
                        'empresa': empresa,
                        'tipologia': tipologia or 'Não definido'
                    })
        
        print(f"   📈 Total de registros brutos: {len(dados_brutos)}")
        print(f"   🏢 Total de empresas encontradas: {len(empresas_encontradas)}")
        
        # Aplicar filtro dinâmico por empresa
        centros_custo_finais = []
        
        print(f"\n🔄 Aplicando filtro dinâmico por empresa:")
        
        for empresa in sorted(empresas_encontradas):
            print(f"\n   🏢 Processando: {empresa}")
            
            # Filtrar dados por empresa
            dados_empresa = [d for d in dados_brutos if d['empresa'] == empresa]
            print(f"      📊 Registros da empresa: {len(dados_empresa)}")
            
            # Remover duplicatas por centro de custo (manter apenas o primeiro)
            centros_vistos = set()
            centros_unicos_empresa = []
            
            for dado in dados_empresa:
                centro_nome = dado['centro_custo']
                if centro_nome not in centros_vistos:
                    centros_vistos.add(centro_nome)
                    centros_unicos_empresa.append(dado)
            
            print(f"      ✅ Centros únicos: {len(centros_unicos_empresa)}")
            
            # Adicionar ao resultado final
            centros_custo_finais.extend(centros_unicos_empresa)
        
        print(f"\n📋 RESULTADO FINAL:")
        print(f"   Total de centros únicos (todas empresas): {len(centros_custo_finais)}")
        
        # Estatísticas finais por empresa
        print(f"\n📊 Distribuição final por empresa:")
        for empresa in sorted(empresas_encontradas):
            count = len([c for c in centros_custo_finais if c['empresa'] == empresa])
            print(f"   {empresa}: {count} centros únicos")
        
        return centros_custo_finais, empresas_encontradas
        
    except Exception as e:
        print(f"❌ Erro ao ler transações: {e}")
        return [], set()

def analisar_padroes_nomenclatura(centros_custo):
    """Analisa padrões de nomenclatura nos centros de custo"""
    print(f"\n🔍 Análise de padrões de nomenclatura...")
    
    # Agrupar por nome base (antes do traço)
    padroes = defaultdict(list)
    nomes_unicos = set()
    
    for centro in centros_custo:
        nome = centro['centro_custo']
        empresa = centro['empresa']
        
        nomes_unicos.add(nome)
        
        # Identificar padrão de sufixo da empresa
        if '-' in nome:
            nome_base = nome.split('-')[0].strip()
            sufixo = nome.split('-', 1)[1].strip() if len(nome.split('-')) > 1 else ''
            padroes[nome_base].append({
                'nome_completo': nome,
                'sufixo': sufixo,
                'empresa': empresa
            })
        else:
            padroes[nome].append({
                'nome_completo': nome,
                'sufixo': '',
                'empresa': empresa
            })
    
    print(f"   📝 Total de nomes únicos: {len(nomes_unicos)}")
    print(f"   🔄 Grupos de padrões: {len(padroes)}")
    
    # Mostrar grupos com múltiplas variações
    print(f"\n🔄 Grupos com múltiplas variações:")
    for nome_base, variações in padroes.items():
        if len(variações) > 1:
            print(f"\n   📂 \"{nome_base}\":")
            for var in variações:
                sufixo_info = f" (sufixo: {var['sufixo']})" if var['sufixo'] else " (sem sufixo)"
                print(f"      - \"{var['nome_completo']}\"{sufixo_info} → {var['empresa']}")
    
    return padroes

def gerar_csv_para_analise(centros_custo):
    """Gera CSV estruturado para análise via LLM (apenas 3 colunas)"""
    base_path = Path(__file__).parent.parent
    output_file = base_path / 'importacao' / 'b_dados_centro_custo.csv'
    
    print(f"\n💾 Gerando CSV para análise (3 colunas): {output_file}")
    
    try:
        with open(output_file, 'w', encoding='utf-8-sig', newline='') as f:
            fieldnames = ['centro_custo', 'empresa', 'tipologia']
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            
            for centro in centros_custo:
                writer.writerow({
                    'centro_custo': centro['centro_custo'],
                    'empresa': centro['empresa'],
                    'tipologia': centro['tipologia']
                })
        
        print(f"✅ CSV gerado com {len(centros_custo)} registros únicos")
        print(f"📊 Colunas: centro_custo, empresa, tipologia")
        return output_file
        
    except Exception as e:
        print(f"❌ Erro ao gerar CSV: {e}")
        return None

def mapear_empresas_por_cnpj():
    """Mapeia empresas por início do CNPJ para identificar padrões SEL XX"""
    base_path = Path(__file__).parent.parent
    db_path = base_path / 'selleta_main.db'
    
    mapeamento = {}
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        cursor.execute('SELECT codigo, nome, cnpj FROM empresas ORDER BY codigo')
        empresas = cursor.fetchall()
        
        print(f"\n🏢 Mapeamento de empresas por CNPJ:")
        for codigo, nome, cnpj in empresas:
            if cnpj:
                # Extrair primeiros 2 dígitos do CNPJ
                cnpj_inicio = cnpj.split('.')[0] if '.' in cnpj else cnpj[:2]
                mapeamento[cnpj_inicio] = {
                    'codigo': codigo,
                    'nome': nome,
                    'cnpj': cnpj
                }
                print(f"   SEL {cnpj_inicio} → {codigo} - {nome}")
        
        conn.close()
        return mapeamento
        
    except Exception as e:
        print(f"❌ Erro ao mapear empresas: {e}")
        return {}

def main():
    """Executa processo completo de extração"""
    print("="*80)
    print("EXTRAÇÃO DE CENTROS DE CUSTO")
    print("="*80)
    
    # 1. Extrair centros de custo das transações
    centros_custo, empresas = extrair_centros_custo_transacoes()
    
    if not centros_custo:
        print("❌ Nenhum centro de custo encontrado")
        return
    
    # 2. Analisar padrões de nomenclatura
    padroes = analisar_padroes_nomenclatura(centros_custo)
    
    # 3. Mapear empresas por CNPJ
    mapeamento_cnpj = mapear_empresas_por_cnpj()
    
    # 4. Gerar CSV para análise
    csv_file = gerar_csv_para_analise(centros_custo)
    
    if csv_file:
        print(f"\n🎯 PRÓXIMOS PASSOS:")
        print(f"   1. CSV gerado: {csv_file}")
        print(f"   2. Analisar via LLM para identificar:")
        print(f"      - Centros 'nativos' (empresa responsável)")
        print(f"      - Centros 'dependentes' (outras empresas)")
        print(f"      - Centros 'genéricos' (ex: Administrativo)")
        print(f"   3. Criar estrutura final do banco de dados")
        
        print(f"\n📋 ESTATÍSTICAS FINAIS:")
        print(f"   Total de centros únicos: {len(centros_custo)}")
        print(f"   Total de empresas: {len(empresas)}")
        print(f"   Padrões identificados: {len(padroes)}")

if __name__ == "__main__":
    main()