#!/usr/bin/env python3
"""
Extração de clientes/fornecedores do banco de dados principal
"""

import pandas as pd
import numpy as np
from pathlib import Path

def extrair_fornecedores_bd():
    """Extrai clientes/fornecedores únicos do banco de dados principal de transações"""
    base_path = Path(__file__).parent.parent
    transacoes_path = base_path / 'importacao' / 'b_dados_transacoes.csv'
    output_path = base_path / 'importacao' / 'fornecedores_bd.csv'
    
    print("🔍 Extraindo fornecedores do banco de dados principal...")
    print(f"📁 Arquivo origem: {transacoes_path}")
    
    try:
        # Ler dados de transações
        df = pd.read_csv(transacoes_path, encoding='utf-8-sig')
        print(f"📊 Total de registros de transações: {len(df)}")
        
        # Verificar se a coluna existe
        col_cliente = '## Cliente/Fornecedor - Copiar'
        if col_cliente not in df.columns:
            print("❌ Coluna '## Cliente/Fornecedor - Copiar' não encontrada")
            print("📋 Colunas disponíveis:")
            for i, col in enumerate(df.columns, 1):
                print(f"   {i}: {col}")
            return False
        
        # Extrair fornecedores únicos
        fornecedores_raw = df[col_cliente].dropna().unique()
        print(f"🎯 Fornecedores únicos encontrados: {len(fornecedores_raw)}")
        
        # Criar DataFrame estruturado
        fornecedores_data = []
        
        for i, fornecedor in enumerate(fornecedores_raw, 1):
            # Limpar nome do fornecedor
            nome_limpo = str(fornecedor).strip()
            
            if nome_limpo and nome_limpo.lower() not in ['', 'nan', 'null']:
                # Coletar informações adicionais das transações
                transacoes_fornecedor = df[df[col_cliente] == fornecedor]
                
                # Extrair dados relevantes
                empresas_relacionadas = transacoes_fornecedor['## Empresa'].dropna().unique()
                centros_custo = transacoes_fornecedor['## Centro Custo'].dropna().unique()
                municipios = transacoes_fornecedor['## Municipio'].dropna().unique()
                tipos_transacao = transacoes_fornecedor['## Tipo (receita ou despesa)'].dropna().unique()
                
                # Calcular valores (convertendo strings para float)
                entradas_raw = transacoes_fornecedor['Soma de ## Entradas'].fillna('0')
                saidas_raw = transacoes_fornecedor['Soma de ## Saídas'].fillna('0')
                
                # Converter valores monetários brasileiros para float
                total_entradas = converter_valor_monetario(entradas_raw.sum()) if len(entradas_raw) > 0 else 0
                total_saidas = converter_valor_monetario(saidas_raw.sum()) if len(saidas_raw) > 0 else 0
                total_transacoes = len(transacoes_fornecedor)
                
                # Definir categoria baseada nos tipos de transação
                if 'Receita' in tipos_transacao and 'Despesa' in tipos_transacao:
                    categoria = 'Cliente/Fornecedor'
                elif 'Receita' in tipos_transacao:
                    categoria = 'Cliente'
                elif 'Despesa' in tipos_transacao:
                    categoria = 'Fornecedor'
                else:
                    categoria = 'Indefinido'
                
                # Criar registro
                fornecedores_data.append({
                    'id': i,
                    'nome_original': nome_limpo,
                    'nome_limpo': limpar_nome_fornecedor(nome_limpo),
                    'categoria': categoria,
                    'municipio_principal': municipios[0] if len(municipios) > 0 else '',
                    'municipios_todos': ' | '.join(municipios),
                    'empresas_relacionadas': ' | '.join(empresas_relacionadas),
                    'centros_custo_relacionados': ' | '.join(centros_custo[:3]) + ('...' if len(centros_custo) > 3 else ''),
                    'total_transacoes': total_transacoes,
                    'total_entradas': total_entradas,
                    'total_saidas': total_saidas,
                    'valor_liquido': total_entradas - total_saidas,
                    'origem': 'banco_dados',
                    'vinculo_bd': f"BD_{i:04d}",
                    'observacoes': f"Ativo em {len(empresas_relacionadas)} empresa(s), {len(centros_custo)} centro(s) de custo"
                })
        
        # Criar DataFrame final
        df_fornecedores = pd.DataFrame(fornecedores_data)
        
        # Ordenar por nome limpo
        df_fornecedores = df_fornecedores.sort_values('nome_limpo')
        
        # Salvar CSV
        df_fornecedores.to_csv(output_path, index=False, encoding='utf-8-sig')
        
        print(f"\n✅ Arquivo salvo: {output_path}")
        print(f"📊 Total de fornecedores únicos processados: {len(df_fornecedores)}")
        
        # Estatísticas por categoria
        print(f"\n📈 Distribuição por categoria:")
        categorias = df_fornecedores['categoria'].value_counts()
        for categoria, count in categorias.items():
            print(f"   {categoria}: {count}")
        
        # Top 10 por valor de transações
        print(f"\n💰 Top 10 por valor líquido:")
        top_fornecedores = df_fornecedores.nlargest(10, 'valor_liquido')
        for _, fornecedor in top_fornecedores.iterrows():
            valor_formatado = f"R$ {fornecedor['valor_liquido']:,.2f}".replace(',', 'X').replace('.', ',').replace('X', '.')
            print(f"   {fornecedor['nome_limpo'][:40]:<40} | {valor_formatado:>15} | {fornecedor['total_transacoes']:>3} trans.")
        
        # Preview dos primeiros registros
        print(f"\n📋 Preview (primeiros 10 registros):")
        preview = df_fornecedores.head(10)[['id', 'nome_limpo', 'categoria', 'municipio_principal', 'total_transacoes', 'vinculo_bd']]
        print(preview.to_string(index=False))
        
        return True
        
    except Exception as e:
        print(f"❌ Erro durante a extração: {e}")
        import traceback
        traceback.print_exc()
        return False

def converter_valor_monetario(valor):
    """Converte string de valor monetário brasileiro para float"""
    if pd.isna(valor) or valor == '' or valor == 0:
        return 0.0
    
    try:
        # Se já é número
        if isinstance(valor, (int, float)):
            return float(valor)
        
        # Converter string
        valor_str = str(valor).strip()
        
        # Remover símbolo de moeda e espaços
        valor_str = valor_str.replace('R$', '').replace('$', '').strip()
        
        # Tratar valores negativos
        negativo = valor_str.startswith('-')
        if negativo:
            valor_str = valor_str[1:].strip()
        
        # Remover pontos de milhar e converter vírgula decimal
        if ',' in valor_str and '.' in valor_str:
            # Formato brasileiro: 1.234.567,89
            valor_str = valor_str.replace('.', '').replace(',', '.')
        elif ',' in valor_str:
            # Apenas vírgula decimal: 1234,89
            valor_str = valor_str.replace(',', '.')
        
        resultado = float(valor_str)
        return -resultado if negativo else resultado
        
    except (ValueError, TypeError):
        return 0.0

def limpar_nome_fornecedor(nome):
    """Limpa e padroniza o nome do fornecedor"""
    if not nome or str(nome).lower() in ['nan', 'null', '']:
        return ''
    
    nome_limpo = str(nome).strip()
    
    # Remover prefixos comuns
    prefixos_remover = [
        r'^\d+\s*-\s*',  # "123 - "
        r'^Código:\s*\d+\s*-\s*',  # "Código: 123 - "
    ]
    
    import re
    for prefixo in prefixos_remover:
        nome_limpo = re.sub(prefixo, '', nome_limpo)
    
    # Capitalizar adequadamente
    nome_limpo = nome_limpo.title()
    
    # Correções específicas para siglas e abreviações
    correcoes = {
        'Ltda': 'LTDA',
        'Ltda.': 'LTDA',
        'Ltd': 'LTDA',
        'S/a': 'S/A',
        'S.a.': 'S/A',
        'Me': 'ME',
        'Epp': 'EPP',
        'Eireli': 'EIRELI'
    }
    
    for erro, correcao in correcoes.items():
        nome_limpo = nome_limpo.replace(erro, correcao)
    
    return nome_limpo.strip()

if __name__ == "__main__":
    print("=" * 80)
    print("EXTRAÇÃO DE FORNECEDORES DO BANCO DE DADOS")
    print("=" * 80)
    
    sucesso = extrair_fornecedores_bd()
    
    if sucesso:
        print("\n🎉 Extração concluída com sucesso!")
        print("📁 Arquivo gerado: fornecedores_bd.csv")
        print("🔗 Campo vinculo_bd: identificador único para mesclagem")
        print("📊 Dados incluem: categoria, valores, transações e relacionamentos")
    else:
        print("\n💥 Extração falhou!")