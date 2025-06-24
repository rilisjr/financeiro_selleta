#!/usr/bin/env python3
"""
Merge dos arquivos b_dados_cliente.csv + b_dados_credor.csv
"""

import pandas as pd
import numpy as np
from pathlib import Path
import re

def merge_clientes_credores():
    """Faz merge dos dados de clientes e credores criando base unificada"""
    base_path = Path(__file__).parent.parent
    cliente_path = base_path / 'importacao' / 'b_dados_cliente.csv'
    credor_path = base_path / 'importacao' / 'b_dados_credor.csv'
    output_path = base_path / 'importacao' / 'fornecedores_merge.csv'
    
    print("🔄 Iniciando merge de clientes e credores...")
    print(f"📁 Arquivo clientes: {cliente_path}")
    print(f"📁 Arquivo credores: {credor_path}")
    
    try:
        # Ler dados de clientes
        print("\n📖 Lendo dados de clientes...")
        df_clientes = pd.read_csv(cliente_path, encoding='utf-8-sig')
        print(f"   Total de clientes: {len(df_clientes)}")
        
        # Ler dados de credores
        print("📖 Lendo dados de credores...")
        df_credores = pd.read_csv(credor_path, encoding='utf-8-sig')
        print(f"   Total de credores: {len(df_credores)}")
        
        # Processar clientes
        clientes_processados = processar_clientes(df_clientes)
        print(f"   Clientes processados: {len(clientes_processados)}")
        
        # Processar credores  
        credores_processados = processar_credores(df_credores)
        print(f"   Credores processados: {len(credores_processados)}")
        
        # Fazer merge e identificar correspondências
        dados_unificados = fazer_merge_inteligente(clientes_processados, credores_processados)
        print(f"   Registros após merge: {len(dados_unificados)}")
        
        # Salvar resultado
        df_final = pd.DataFrame(dados_unificados)
        df_final = df_final.sort_values('nome_padronizado')
        df_final.to_csv(output_path, index=False, encoding='utf-8-sig')
        
        print(f"\n✅ Arquivo salvo: {output_path}")
        
        # Estatísticas do merge
        exibir_estatisticas_merge(df_final)
        
        return True
        
    except Exception as e:
        print(f"❌ Erro durante o merge: {e}")
        import traceback
        traceback.print_exc()
        return False

def processar_clientes(df_clientes):
    """Processa e padroniza dados de clientes"""
    clientes = []
    
    for _, row in df_clientes.iterrows():
        cliente_nome = str(row.get('Cliente_nome', '')).strip()
        
        if cliente_nome and cliente_nome.lower() not in ['', 'nan', 'null']:
            cliente = {
                'nome_original': cliente_nome,
                'nome_padronizado': padronizar_nome(cliente_nome),
                'cpf_cnpj': limpar_documento(str(row.get('CNPJ/CPF', ''))),
                'municipio': str(row.get('município', '')).strip(),
                'tipo_pessoa': determinar_tipo_pessoa(str(row.get('tipo', ''))),
                'categoria': 'Cliente',
                'origem': 'cliente_csv',
                'cliente_numero': row.get('Soma de cliente_num', ''),
                'vinculo_merge': f"CLI_{len(clientes) + 1:04d}",
                'dados_completos': {
                    'cliente_inteiro_historico': str(row.get('Cliente_inteiro_historico', '')),
                    'cliente_numero': row.get('Soma de cliente_num', ''),
                }
            }
            clientes.append(cliente)
    
    return clientes

def processar_credores(df_credores):
    """Processa e padroniza dados de credores"""
    credores = []
    
    for _, row in df_credores.iterrows():
        credor_nome = str(row.get('Credor', '')).strip()
        
        # Extrair nome do campo credor (remover código se existir)
        credor_nome = extrair_nome_credor(credor_nome)
        
        if credor_nome and credor_nome.lower() not in ['', 'nan', 'null']:
            credor = {
                'nome_original': credor_nome,
                'nome_padronizado': padronizar_nome(credor_nome),
                'cpf_cnpj': limpar_documento(str(row.get('CNPJ', '')) or str(row.get('CPF', ''))),
                'municipio': str(row.get('Município', '')).strip(),
                'tipo_pessoa': determinar_tipo_pessoa(str(row.get('tipo', ''))),
                'categoria': 'Fornecedor',
                'origem': 'credor_csv',
                'vinculo_merge': f"CRE_{len(credores) + 1:04d}",
                'dados_completos': {
                    'credor_original': str(row.get('Credor', '')),
                    'agencia': str(row.get('Agência', '')),
                    'banco': str(row.get('Banco', '')),
                    'conta': str(row.get('Conta', '')),
                    'endereco': str(row.get('Endereço', '')),
                    'favorecido': str(row.get('Favorecido', '')),
                    'forma_pagto': str(row.get('Forma Pagto.', '')),
                    'tipo_conta': str(row.get('Tipo Conta', '')),
                    'tipo_credor': str(row.get('Tipo de Credor', '')),
                    'telefone': str(row.get('Telefone', '')),
                    'ie': str(row.get('I.E.', '')),
                    'indice': str(row.get('Índice', '')),
                }
            }
            credores.append(credor)
    
    return credores

def fazer_merge_inteligente(clientes, credores):
    """Faz merge inteligente identificando correspondências entre clientes e credores"""
    dados_unificados = []
    correspondencias_encontradas = []
    
    # Primeiro, adicionar todos os clientes
    for cliente in clientes:
        # Buscar correspondência nos credores
        correspondencia = buscar_correspondencia(cliente, credores)
        
        if correspondencia:
            # Merge dos dados
            registro_unificado = {
                **cliente,
                'categoria': 'Cliente/Fornecedor',  # Ambos
                'correspondencia_encontrada': True,
                'dados_credor': correspondencia['dados_completos'],
                'credor_vinculo': correspondencia['vinculo_merge'],
                'municipio_credor': correspondencia['municipio'],
                'cpf_cnpj_credor': correspondencia['cpf_cnpj'],
                'similaridade_nome': calcular_similaridade(cliente['nome_padronizado'], correspondencia['nome_padronizado']),
                'observacoes': f"Correspondência encontrada com credor {correspondencia['vinculo_merge']}"
            }
            correspondencias_encontradas.append(correspondencia['vinculo_merge'])
        else:
            # Cliente sem correspondência
            registro_unificado = {
                **cliente,
                'correspondencia_encontrada': False,
                'dados_credor': {},
                'credor_vinculo': '',
                'municipio_credor': '',
                'cpf_cnpj_credor': '',
                'similaridade_nome': 0,
                'observacoes': 'Cliente sem correspondência em credores'
            }
        
        dados_unificados.append(registro_unificado)
    
    # Adicionar credores que não tiveram correspondência
    for credor in credores:
        if credor['vinculo_merge'] not in correspondencias_encontradas:
            registro_credor = {
                **credor,
                'correspondencia_encontrada': False,
                'dados_credor': credor['dados_completos'],
                'credor_vinculo': credor['vinculo_merge'],
                'municipio_credor': credor['municipio'],
                'cpf_cnpj_credor': credor['cpf_cnpj'],
                'similaridade_nome': 0,
                'observacoes': 'Fornecedor sem correspondência em clientes'
            }
            dados_unificados.append(registro_credor)
    
    return dados_unificados

def buscar_correspondencia(cliente, credores):
    """Busca correspondência entre cliente e lista de credores"""
    melhor_correspondencia = None
    maior_similaridade = 0
    
    for credor in credores:
        # Verificar correspondência por documento
        if cliente['cpf_cnpj'] and credor['cpf_cnpj'] and cliente['cpf_cnpj'] == credor['cpf_cnpj']:
            return credor
        
        # Verificar correspondência por nome
        similaridade = calcular_similaridade(cliente['nome_padronizado'], credor['nome_padronizado'])
        
        if similaridade > maior_similaridade and similaridade >= 0.8:  # 80% de similaridade mínima
            maior_similaridade = similaridade
            melhor_correspondencia = credor
    
    return melhor_correspondencia

def calcular_similaridade(nome1, nome2):
    """Calcula similaridade entre dois nomes"""
    if not nome1 or not nome2:
        return 0
    
    # Normalizar strings
    n1 = nome1.lower().strip()
    n2 = nome2.lower().strip()
    
    # Similaridade exata
    if n1 == n2:
        return 1.0
    
    # Verificar se um nome está contido no outro
    if n1 in n2 or n2 in n1:
        return 0.9
    
    # Calcular similaridade por palavras em comum
    palavras1 = set(n1.split())
    palavras2 = set(n2.split())
    
    if not palavras1 or not palavras2:
        return 0
    
    intersecao = len(palavras1.intersection(palavras2))
    uniao = len(palavras1.union(palavras2))
    
    return intersecao / uniao if uniao > 0 else 0

def padronizar_nome(nome):
    """Padroniza nome para comparação"""
    if not nome or str(nome).lower() in ['nan', 'null', '']:
        return ''
    
    nome_padrao = str(nome).strip()
    
    # Remover códigos no início
    nome_padrao = re.sub(r'^\d+\s*-\s*', '', nome_padrao)
    
    # Converter para maiúsculas para padronização
    nome_padrao = nome_padrao.upper()
    
    # Remover caracteres especiais desnecessários
    nome_padrao = re.sub(r'[^\w\s\-\.]', ' ', nome_padrao)
    
    # Normalizar espaços
    nome_padrao = re.sub(r'\s+', ' ', nome_padrao).strip()
    
    return nome_padrao

def extrair_nome_credor(credor_texto):
    """Extrai nome limpo do campo credor"""
    if not credor_texto:
        return ''
    
    # Remover código no início (ex: "1000 - ALESSANDRO GONÇALVES ALECRIM")
    nome_limpo = re.sub(r'^\d+\s*-\s*', '', str(credor_texto).strip())
    
    return nome_limpo

def limpar_documento(documento):
    """Limpa e padroniza CPF/CNPJ"""
    if not documento or str(documento).lower() in ['nan', 'null', '']:
        return ''
    
    # Remover caracteres não numéricos
    doc_limpo = re.sub(r'[^\d]', '', str(documento))
    
    return doc_limpo if len(doc_limpo) in [11, 14] else ''

def determinar_tipo_pessoa(tipo_texto):
    """Determina tipo de pessoa baseado no texto"""
    if not tipo_texto:
        return 'Indefinido'
    
    tipo_lower = str(tipo_texto).lower()
    
    if 'física' in tipo_lower or 'pf' in tipo_lower:
        return 'Pessoa Física'
    elif 'jurídica' in tipo_lower or 'pj' in tipo_lower:
        return 'Pessoa Jurídica'
    else:
        return 'Indefinido'

def exibir_estatisticas_merge(df_final):
    """Exibe estatísticas do resultado do merge"""
    print(f"\n📊 ESTATÍSTICAS DO MERGE:")
    print(f"   Total de registros: {len(df_final)}")
    
    # Por categoria
    print(f"\n📈 Por categoria:")
    categorias = df_final['categoria'].value_counts()
    for categoria, count in categorias.items():
        print(f"   {categoria}: {count}")
    
    # Por origem
    print(f"\n📈 Por origem:")
    origens = df_final['origem'].value_counts()
    for origem, count in origens.items():
        print(f"   {origem}: {count}")
    
    # Correspondências encontradas
    correspondencias = df_final['correspondencia_encontrada'].value_counts()
    print(f"\n🔗 Correspondências:")
    print(f"   Correspondências encontradas: {correspondencias.get(True, 0)}")
    print(f"   Sem correspondência: {correspondencias.get(False, 0)}")
    
    # Top correspondências por similaridade
    if 'similaridade_nome' in df_final.columns:
        top_correspondencias = df_final[df_final['correspondencia_encontrada'] == True].nlargest(10, 'similaridade_nome')
        if len(top_correspondencias) > 0:
            print(f"\n🎯 Top 10 correspondências por similaridade:")
            for _, row in top_correspondencias.iterrows():
                print(f"   {row['nome_padronizado'][:30]:<30} | Similaridade: {row['similaridade_nome']:.2%}")
    
    # Preview
    print(f"\n📋 Preview (primeiros 10 registros):")
    preview_cols = ['nome_original', 'categoria', 'municipio', 'correspondencia_encontrada', 'vinculo_merge']
    preview = df_final.head(10)[preview_cols]
    print(preview.to_string(index=False))

if __name__ == "__main__":
    print("=" * 80)
    print("MERGE DE CLIENTES E CREDORES")
    print("=" * 80)
    
    sucesso = merge_clientes_credores()
    
    if sucesso:
        print("\n🎉 Merge concluído com sucesso!")
        print("📁 Arquivo gerado: fornecedores_merge.csv")
        print("🔗 Campo vinculo_merge: identificador único para each registro")
        print("🎯 Correspondências identificadas por nome e documento")
        print("📊 Dados incluem: origem, categoria, correspondências e similaridades")
    else:
        print("\n💥 Merge falhou!")