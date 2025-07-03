#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
SCRIPT DE LIMPEZA E IMPORTAÇÃO DE DADOS TRATADOS
================================================
Limpa as tabelas fornecedores, plano_financeiro e transacoes
e importa os dados tratados dos CSVs preservando os IDs

Autor: Sistema Financeiro Selleta
Data: 01/07/2025
Objetivo: Substituir dados antigos pelos novos dados tratados
"""

import sqlite3
import csv
import os
from datetime import datetime
import shutil
import re

def criar_backup():
    """
    Cria backup completo do banco antes da migração
    """
    print("🔒 CRIANDO BACKUP DO BANCO DE DADOS")
    print("-" * 50)
    
    db_original = "../../selleta_main.db"
    db_backup = f"../../selleta_main_backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}.db"
    
    try:
        shutil.copy2(db_original, db_backup)
        print(f"✅ Backup criado: {db_backup}")
        return True
    except Exception as e:
        print(f"❌ Erro ao criar backup: {e}")
        return False

def verificar_arquivos_csv():
    """
    Verifica se os arquivos CSV tratados existem
    """
    print("\n📁 VERIFICANDO ARQUIVOS CSV TRATADOS")
    print("-" * 50)
    
    base_dir = "../base_tratada_para_bd"
    arquivos_necessarios = ["fornecedor.csv", "plano_financeiro.csv", "transacoes.csv"]
    
    todos_existem = True
    for arquivo in arquivos_necessarios:
        caminho = os.path.join(base_dir, arquivo)
        if os.path.exists(caminho):
            # Contar linhas
            with open(caminho, 'r', encoding='utf-8-sig') as f:
                linhas = sum(1 for _ in f) - 1  # -1 para excluir cabeçalho
            print(f"✅ {arquivo}: {linhas:,} registros")
        else:
            print(f"❌ {arquivo}: NÃO ENCONTRADO")
            todos_existem = False
    
    return todos_existem

def limpar_tabelas(conn):
    """
    Limpa as tabelas que serão reimportadas
    """
    print("\n🧹 LIMPANDO TABELAS")
    print("-" * 50)
    
    cursor = conn.cursor()
    
    try:
        # Desabilitar constraints temporariamente
        cursor.execute("PRAGMA foreign_keys = OFF")
        
        # Contar registros antes de limpar
        tabelas = ['transacoes', 'fornecedores', 'plano_financeiro']
        
        for tabela in tabelas:
            cursor.execute(f"SELECT COUNT(*) FROM {tabela}")
            count_antes = cursor.fetchone()[0]
            
            # Limpar tabela
            cursor.execute(f"DELETE FROM {tabela}")
            
            # Resetar sequence
            cursor.execute(f"DELETE FROM sqlite_sequence WHERE name = '{tabela}'")
            
            print(f"✅ {tabela}: {count_antes:,} registros removidos")
        
        conn.commit()
        print("\n✅ Tabelas limpas com sucesso")
        return True
        
    except Exception as e:
        print(f"❌ Erro ao limpar tabelas: {e}")
        conn.rollback()
        return False

def importar_plano_financeiro(conn):
    """
    Importa dados do plano_financeiro.csv
    """
    print("\n📊 IMPORTANDO PLANO FINANCEIRO")
    print("-" * 50)
    
    cursor = conn.cursor()
    csv_path = "../base_tratada_para_bd/plano_financeiro.csv"
    
    try:
        with open(csv_path, 'r', encoding='utf-8-sig') as f:
            reader = csv.DictReader(f)
            count = 0
            
            for row in reader:
                # Preparar valores
                valores = (
                    int(row['id']),
                    row['codigo'],
                    row['nome'],
                    int(row['nivel']),
                    row['tipo'],
                    int(row['plano_pai_id']) if row['plano_pai_id'] else None,
                    int(row['ativo']),
                    row['criado_em'],
                    row['atualizado_em'],
                    row['referencia'] if row['referencia'] else None
                )
                
                # Inserir com ID específico
                cursor.execute("""
                    INSERT INTO plano_financeiro 
                    (id, codigo, nome, nivel, tipo, plano_pai_id, ativo, criado_em, atualizado_em, referencia)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, valores)
                
                count += 1
                
                if count % 100 == 0:
                    print(f"   Processados: {count} registros...")
        
        conn.commit()
        print(f"✅ Total importado: {count:,} registros")
        return True
        
    except Exception as e:
        print(f"❌ Erro ao importar plano_financeiro: {e}")
        conn.rollback()
        return False

def importar_fornecedores(conn):
    """
    Importa dados do fornecedor.csv
    """
    print("\n🏢 IMPORTANDO FORNECEDORES")
    print("-" * 50)
    
    cursor = conn.cursor()
    csv_path = "../base_tratada_para_bd/fornecedor.csv"
    
    try:
        with open(csv_path, 'r', encoding='utf-8-sig') as f:
            reader = csv.DictReader(f)
            count = 0
            
            for row in reader:
                # Preparar valores (ignorar coluna "Nome da Origem" se existir)
                valores = (
                    int(row['id']),
                    row['nome'],
                    row['nome_original'],
                    row['cnpj_cpf'] if row['cnpj_cpf'] else None,
                    row['origem'],
                    row['tipo_fornecedor'] if row['tipo_fornecedor'] else None,
                    row['agencia'] if row['agencia'] else None,
                    row['banco'] if row['banco'] else None,
                    row['conta'] if row['conta'] else None,
                    row['chave_pix'] if row['chave_pix'] else None,
                    row['tipo_conta'] if row['tipo_conta'] else None,
                    row['favorecido'] if row['favorecido'] else None,
                    row['cpf_cnpj_favorecido'] if row['cpf_cnpj_favorecido'] else None,
                    row['descricao'] if row['descricao'] else None,
                    row['metodo_deteccao'] if row['metodo_deteccao'] else None,
                    float(row['similaridade']) if row['similaridade'] else None,
                    int(row['deteccao_forcada']) if row['deteccao_forcada'] else 0,
                    int(row['deteccao_corrigida']) if row['deteccao_corrigida'] else 0,
                    row['observacoes'] if row['observacoes'] else None,
                    float(row['valor_total_movimentado']) if row['valor_total_movimentado'] else 0,
                    int(row['total_transacoes']) if row['total_transacoes'] else 0,
                    row['data_criacao'] if row['data_criacao'] else datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
                    int(row['ativo']) if row['ativo'] else 1
                )
                
                # Inserir com ID específico
                cursor.execute("""
                    INSERT INTO fornecedores 
                    (id, nome, nome_original, cnpj_cpf, origem, tipo_fornecedor, 
                     agencia, banco, conta, chave_pix, tipo_conta, favorecido, 
                     cpf_cnpj_favorecido, descricao, metodo_deteccao, similaridade,
                     deteccao_forcada, deteccao_corrigida, observacoes, 
                     valor_total_movimentado, total_transacoes, data_criacao, ativo)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, valores)
                
                count += 1
                
                if count % 500 == 0:
                    print(f"   Processados: {count} registros...")
        
        conn.commit()
        print(f"✅ Total importado: {count:,} registros")
        return True
        
    except Exception as e:
        print(f"❌ Erro ao importar fornecedores: {e}")
        conn.rollback()
        return False

def converter_data_br_para_iso(data_br):
    """
    Converte data do formato BR (DD/MM/YYYY) para ISO (YYYY-MM-DD)
    """
    if not data_br or data_br == '':
        return None
    
    # Verificar se já está em formato ISO
    if re.match(r'^\d{4}-\d{2}-\d{2}', data_br):
        return data_br
    
    # Tentar converter de BR para ISO
    try:
        # Remover parte de hora se existir
        data_parte = data_br.split(' ')[0]
        
        # Converter DD/MM/YYYY para YYYY-MM-DD
        if '/' in data_parte:
            dia, mes, ano = data_parte.split('/')
            return f"{ano}-{mes.zfill(2)}-{dia.zfill(2)}"
        else:
            return data_br
    except:
        return data_br

def importar_transacoes(conn):
    """
    Importa dados do transacoes.csv
    """
    print("\n💰 IMPORTANDO TRANSAÇÕES")
    print("-" * 50)
    
    cursor = conn.cursor()
    csv_path = "../base_tratada_para_bd/transacoes.csv"
    
    try:
        # Primeiro, obter estrutura da tabela para verificar colunas
        cursor.execute("PRAGMA table_info(transacoes)")
        colunas_bd = {col[1] for col in cursor.fetchall()}
        
        # Verificar se conta_bancaria_id existe, senão adicionar
        if 'conta_bancaria_id' not in colunas_bd:
            print("   ➕ Adicionando coluna conta_bancaria_id...")
            cursor.execute("ALTER TABLE transacoes ADD COLUMN conta_bancaria_id INTEGER")
            conn.commit()
        
        with open(csv_path, 'r', encoding='utf-8-sig') as f:
            reader = csv.DictReader(f)
            count = 0
            erros = 0
            
            for row in reader:
                try:
                    # Converter datas
                    data_lancamento = converter_data_br_para_iso(row['data_lancamento'])
                    data_vencimento = converter_data_br_para_iso(row['data_vencimento'])
                    data_competencia = converter_data_br_para_iso(row['data_competencia'])
                    
                    # Corrigir nome da coluna empresas_id → empresa_id
                    empresa_id = int(row.get('empresas_id', row.get('empresa_id', 1)))
                    
                    # Converter tipo: entrada → Entrada, saida → Saída
                    tipo_original = row['tipo'].lower()
                    if tipo_original == 'entrada':
                        tipo = 'Entrada'
                    elif tipo_original == 'saida':
                        tipo = 'Saída'
                    else:
                        tipo = row['tipo']  # Manter original se não for entrada/saida
                    
                    # Preparar valores
                    valores = (
                        int(row['id']),
                        row['titulo'],
                        row['numero_documento'] if row['numero_documento'] else None,
                        int(row['parcela_atual']) if row['parcela_atual'] else 1,
                        int(row['parcela_total']) if row['parcela_total'] else 1,
                        float(row['valor']),
                        data_lancamento,
                        data_vencimento,
                        data_competencia,
                        tipo,  # Agora usando o tipo convertido
                        row['tipologia'] if row['tipologia'] else None,
                        int(row['cliente_fornecedor_id']) if row['cliente_fornecedor_id'] else None,
                        int(row['centro_custo_id']) if row['centro_custo_id'] else None,
                        empresa_id,
                        int(row['plano_financeiro_id']) if row['plano_financeiro_id'] else None,
                        int(row['usuario_id']) if row['usuario_id'] else 1,
                        row['status_negociacao'],
                        row['status_pagamento'],
                        row['municipio'] if row['municipio'] else None,
                        row['observacao'] if row['observacao'] else None,
                        row['origem_importacao'] if row['origem_importacao'] else 'importacao_csv',
                        row['criado_em'],
                        row['atualizado_em'],
                        int(row['conta_bancaria_id']) if row.get('conta_bancaria_id') else None
                    )
                    
                    # Inserir com ID específico
                    cursor.execute("""
                        INSERT INTO transacoes 
                        (id, titulo, numero_documento, parcela_atual, parcela_total, valor,
                         data_lancamento, data_vencimento, data_competencia, tipo, tipologia,
                         cliente_fornecedor_id, centro_custo_id, empresa_id, plano_financeiro_id,
                         usuario_id, status_negociacao, status_pagamento, municipio, observacao,
                         origem_importacao, criado_em, atualizado_em, conta_bancaria_id)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """, valores)
                    
                    count += 1
                    
                    if count % 1000 == 0:
                        print(f"   Processados: {count} registros...")
                        conn.commit()  # Commit parcial para transações grandes
                        
                except Exception as e:
                    erros += 1
                    if erros <= 5:  # Mostrar apenas os 5 primeiros erros
                        print(f"   ⚠️ Erro na linha {count + erros + 1}: {e}")
                        print(f"      Dados: {row}")
        
        conn.commit()
        print(f"✅ Total importado: {count:,} registros")
        if erros > 0:
            print(f"⚠️ Total de erros: {erros}")
        return True
        
    except Exception as e:
        print(f"❌ Erro ao importar transações: {e}")
        conn.rollback()
        return False

def atualizar_sequences(conn):
    """
    Atualiza as sequences para os próximos IDs
    """
    print("\n🔧 ATUALIZANDO SEQUENCES")
    print("-" * 50)
    
    cursor = conn.cursor()
    
    try:
        tabelas = ['plano_financeiro', 'fornecedores', 'transacoes']
        
        for tabela in tabelas:
            # Obter maior ID
            cursor.execute(f"SELECT MAX(id) FROM {tabela}")
            max_id = cursor.fetchone()[0]
            
            if max_id:
                # Atualizar sequence
                cursor.execute("""
                    INSERT OR REPLACE INTO sqlite_sequence (name, seq) 
                    VALUES (?, ?)
                """, (tabela, max_id))
                
                print(f"✅ {tabela}: próximo ID será {max_id + 1}")
        
        conn.commit()
        return True
        
    except Exception as e:
        print(f"❌ Erro ao atualizar sequences: {e}")
        return False

def validar_importacao(conn):
    """
    Valida a importação realizada
    """
    print("\n✔️ VALIDANDO IMPORTAÇÃO")
    print("-" * 50)
    
    cursor = conn.cursor()
    
    # Verificar contagens
    tabelas = ['plano_financeiro', 'fornecedores', 'transacoes']
    
    for tabela in tabelas:
        cursor.execute(f"SELECT COUNT(*) FROM {tabela}")
        count = cursor.fetchone()[0]
        print(f"📊 {tabela}: {count:,} registros")
    
    # Verificar integridade referencial básica
    print("\n🔍 Verificando integridade referencial:")
    
    # Transações sem fornecedor válido
    cursor.execute("""
        SELECT COUNT(*) FROM transacoes t
        WHERE t.cliente_fornecedor_id IS NOT NULL 
        AND NOT EXISTS (SELECT 1 FROM fornecedores f WHERE f.id = t.cliente_fornecedor_id)
    """)
    orphan_fornecedor = cursor.fetchone()[0]
    
    # Transações sem plano financeiro válido
    cursor.execute("""
        SELECT COUNT(*) FROM transacoes t
        WHERE t.plano_financeiro_id IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM plano_financeiro p WHERE p.id = t.plano_financeiro_id)
    """)
    orphan_plano = cursor.fetchone()[0]
    
    print(f"   - Transações sem fornecedor válido: {orphan_fornecedor}")
    print(f"   - Transações sem plano financeiro válido: {orphan_plano}")
    
    if orphan_fornecedor == 0 and orphan_plano == 0:
        print("\n✅ Integridade referencial OK!")
    else:
        print("\n⚠️ Existem problemas de integridade referencial")

def executar_vacuum(conn):
    """
    Executa VACUUM para otimizar o banco
    """
    print("\n🔄 OTIMIZANDO BANCO DE DADOS")
    print("-" * 50)
    
    try:
        conn.execute("VACUUM")
        print("✅ Banco de dados otimizado")
        return True
    except Exception as e:
        print(f"❌ Erro ao otimizar: {e}")
        return False

def main():
    """
    Função principal
    """
    print("🚀 SISTEMA DE LIMPEZA E IMPORTAÇÃO DE DADOS TRATADOS")
    print("=" * 60)
    print(f"📅 Data/Hora: {datetime.now().strftime('%d/%m/%Y às %H:%M:%S')}")
    print()
    
    # Verificar arquivos
    if not verificar_arquivos_csv():
        print("\n❌ Arquivos CSV não encontrados. Abortando...")
        return
    
    # Criar backup
    if not criar_backup():
        print("\n❌ Falha ao criar backup. Abortando...")
        return
    
    # Conectar ao banco
    db_path = "../../selleta_main.db"
    
    try:
        conn = sqlite3.connect(db_path)
        
        # Limpar tabelas
        if not limpar_tabelas(conn):
            print("\n❌ Falha ao limpar tabelas. Abortando...")
            conn.close()
            return
        
        # Importar dados
        sucesso = True
        
        if not importar_plano_financeiro(conn):
            sucesso = False
        
        if sucesso and not importar_fornecedores(conn):
            sucesso = False
        
        if sucesso and not importar_transacoes(conn):
            sucesso = False
        
        if sucesso:
            # Atualizar sequences
            atualizar_sequences(conn)
            
            # Reabilitar constraints
            conn.execute("PRAGMA foreign_keys = ON")
            
            # Validar importação
            validar_importacao(conn)
            
            # Otimizar banco
            executar_vacuum(conn)
            
            print("\n" + "=" * 60)
            print("🎉 IMPORTAÇÃO CONCLUÍDA COM SUCESSO!")
            print("=" * 60)
            
            # Gerar relatório
            relatorio_path = "../relatorio_importacao.txt"
            with open(relatorio_path, 'w', encoding='utf-8') as f:
                f.write("RELATÓRIO DE IMPORTAÇÃO - DADOS TRATADOS\n")
                f.write("=" * 50 + "\n")
                f.write(f"Data/Hora: {datetime.now().strftime('%d/%m/%Y às %H:%M:%S')}\n")
                f.write("Status: SUCESSO\n")
                f.write("\nTabelas importadas:\n")
                f.write("- plano_financeiro\n")
                f.write("- fornecedores\n") 
                f.write("- transacoes (com nova coluna conta_bancaria_id)\n")
                f.write("\nTabelas mantidas:\n")
                f.write("- usuarios\n")
                f.write("- empresas\n")
                f.write("- centros_custo\n")
                f.write("- conta_bancaria\n")
            
            print(f"\n📋 Relatório salvo em: {relatorio_path}")
        else:
            print("\n❌ IMPORTAÇÃO FALHOU!")
            print("Verifique os erros acima e tente novamente.")
        
        conn.close()
        
    except Exception as e:
        print(f"\n❌ Erro geral: {e}")

if __name__ == "__main__":
    main()