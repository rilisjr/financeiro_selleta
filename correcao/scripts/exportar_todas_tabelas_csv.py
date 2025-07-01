#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
SCRIPT DE EXPORTAÇÃO COMPLETA DO BANCO DE DADOS
==============================================
Exporta todas as tabelas do banco de dados selleta_main.db para arquivos CSV individuais

Autor: Sistema Financeiro Selleta
Data: 01/07/2025
Objetivo: Criar backup completo em CSV para análise e reestruturação semântica
"""

import sqlite3
import csv
import os
from datetime import datetime

def exportar_todas_tabelas():
    """
    Exporta todas as tabelas do banco de dados para arquivos CSV
    """
    
    # Caminhos
    db_path = "../../selleta_main.db"
    output_dir = "../base_exportada_bd"
    
    # Verificar se o banco existe
    if not os.path.exists(db_path):
        print(f"❌ Erro: Banco de dados não encontrado em {db_path}")
        return False
    
    try:
        # Conectar ao banco
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        print("🚀 INICIANDO EXPORTAÇÃO COMPLETA DO BANCO DE DADOS")
        print("=" * 60)
        print(f"📅 Data/Hora: {datetime.now().strftime('%d/%m/%Y às %H:%M:%S')}")
        print(f"💾 Banco origem: {db_path}")
        print(f"📁 Destino: {output_dir}")
        print()
        
        # Obter lista de todas as tabelas
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
        tabelas = cursor.fetchall()
        
        print(f"📋 Tabelas encontradas: {len(tabelas)}")
        print("-" * 60)
        
        total_registros_exportados = 0
        tabelas_exportadas = 0
        
        for (nome_tabela,) in tabelas:
            try:
                print(f"📊 Exportando: {nome_tabela}")
                
                # Obter todos os dados da tabela
                cursor.execute(f"SELECT * FROM {nome_tabela}")
                dados = cursor.fetchall()
                
                # Obter nomes das colunas
                cursor.execute(f"PRAGMA table_info({nome_tabela})")
                colunas_info = cursor.fetchall()
                nomes_colunas = [col[1] for col in colunas_info]
                
                # Criar arquivo CSV
                csv_path = os.path.join(output_dir, f"{nome_tabela}.csv")
                
                with open(csv_path, 'w', newline='', encoding='utf-8') as csvfile:
                    writer = csv.writer(csvfile)
                    
                    # Escrever cabeçalho
                    writer.writerow(nomes_colunas)
                    
                    # Escrever dados
                    writer.writerows(dados)
                
                registros = len(dados)
                total_registros_exportados += registros
                tabelas_exportadas += 1
                
                print(f"   ✅ {registros:,} registros exportados → {csv_path}")
                
            except Exception as e:
                print(f"   ❌ Erro ao exportar {nome_tabela}: {e}")
        
        print()
        print("=" * 60)
        print("🎉 EXPORTAÇÃO CONCLUÍDA!")
        print(f"✅ Tabelas exportadas: {tabelas_exportadas}")
        print(f"📊 Total de registros: {total_registros_exportados:,}")
        print(f"📁 Arquivos criados em: {output_dir}")
        
        # Gerar relatório de exportação
        relatorio_path = os.path.join(output_dir, "relatorio_exportacao.txt")
        with open(relatorio_path, 'w', encoding='utf-8') as f:
            f.write("RELATÓRIO DE EXPORTAÇÃO - BANCO DE DADOS SELLETA\n")
            f.write("=" * 50 + "\n")
            f.write(f"Data/Hora: {datetime.now().strftime('%d/%m/%Y às %H:%M:%S')}\n")
            f.write(f"Banco origem: {db_path}\n")
            f.write(f"Destino: {output_dir}\n")
            f.write(f"Tabelas exportadas: {tabelas_exportadas}\n")
            f.write(f"Total de registros: {total_registros_exportados:,}\n\n")
            
            f.write("DETALHAMENTO POR TABELA:\n")
            f.write("-" * 30 + "\n")
            
            for (nome_tabela,) in tabelas:
                cursor.execute(f"SELECT COUNT(*) FROM {nome_tabela}")
                count = cursor.fetchone()[0]
                f.write(f"{nome_tabela}: {count:,} registros\n")
        
        print(f"📋 Relatório salvo em: {relatorio_path}")
        
        conn.close()
        return True
        
    except Exception as e:
        print(f"❌ Erro geral na exportação: {e}")
        return False

def gerar_estrutura_tabelas():
    """
    Gera arquivo com estrutura de todas as tabelas (DDL)
    """
    db_path = "../../selleta_main.db"
    output_dir = "../base_exportada_bd"
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        print()
        print("🏗️ GERANDO ESTRUTURA DAS TABELAS")
        print("-" * 40)
        
        # Obter lista de tabelas
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
        tabelas = cursor.fetchall()
        
        estrutura_path = os.path.join(output_dir, "estrutura_tabelas.sql")
        
        with open(estrutura_path, 'w', encoding='utf-8') as f:
            f.write("-- ESTRUTURA COMPLETA DO BANCO DE DADOS SELLETA\n")
            f.write(f"-- Gerado em: {datetime.now().strftime('%d/%m/%Y às %H:%M:%S')}\n")
            f.write("-- =" * 30 + "\n\n")
            
            for (nome_tabela,) in tabelas:
                f.write(f"-- TABELA: {nome_tabela}\n")
                f.write("-" * 50 + "\n")
                
                # Obter DDL da tabela
                cursor.execute("SELECT sql FROM sqlite_master WHERE type='table' AND name=?", (nome_tabela,))
                ddl = cursor.fetchone()
                
                if ddl and ddl[0]:
                    f.write(f"{ddl[0]};\n\n")
                
                # Obter informações das colunas
                cursor.execute(f"PRAGMA table_info({nome_tabela})")
                colunas = cursor.fetchall()
                
                f.write("-- Colunas:\n")
                for col in colunas:
                    cid, nome, tipo, notnull, default, pk = col
                    constraints = []
                    if pk:
                        constraints.append("PRIMARY KEY")
                    if notnull:
                        constraints.append("NOT NULL")
                    if default:
                        constraints.append(f"DEFAULT {default}")
                    
                    constraints_str = " " + " ".join(constraints) if constraints else ""
                    f.write(f"--   {nome}: {tipo}{constraints_str}\n")
                
                f.write("\n")
        
        print(f"✅ Estrutura salva em: {estrutura_path}")
        
        conn.close()
        
    except Exception as e:
        print(f"❌ Erro ao gerar estrutura: {e}")

def gerar_info_detalhada():
    """
    Gera arquivo com informações detalhadas sobre o banco
    """
    db_path = "../../selleta_main.db"
    output_dir = "../base_exportada_bd"
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        print()
        print("📋 GERANDO INFORMAÇÕES DETALHADAS")
        print("-" * 40)
        
        info_path = os.path.join(output_dir, "info_detalhada_bd.txt")
        
        with open(info_path, 'w', encoding='utf-8') as f:
            f.write("INFORMAÇÕES DETALHADAS - BANCO DE DADOS SELLETA\n")
            f.write("=" * 55 + "\n")
            f.write(f"Gerado em: {datetime.now().strftime('%d/%m/%Y às %H:%M:%S')}\n\n")
            
            # Obter lista de tabelas
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
            tabelas = cursor.fetchall()
            
            f.write(f"TOTAL DE TABELAS: {len(tabelas)}\n")
            f.write("-" * 30 + "\n\n")
            
            total_geral = 0
            
            for (nome_tabela,) in tabelas:
                f.write(f"TABELA: {nome_tabela}\n")
                f.write("-" * 20 + "\n")
                
                # Contagem de registros
                cursor.execute(f"SELECT COUNT(*) FROM {nome_tabela}")
                count = cursor.fetchone()[0]
                total_geral += count
                
                f.write(f"Registros: {count:,}\n")
                
                # Informações das colunas
                cursor.execute(f"PRAGMA table_info({nome_tabela})")
                colunas = cursor.fetchall()
                
                f.write(f"Colunas: {len(colunas)}\n")
                f.write("Estrutura:\n")
                
                for col in colunas:
                    cid, nome, tipo, notnull, default, pk = col
                    status = []
                    if pk:
                        status.append("PK")
                    if notnull:
                        status.append("NOT NULL")
                    
                    status_str = f" ({', '.join(status)})" if status else ""
                    f.write(f"  - {nome}: {tipo}{status_str}\n")
                
                # Verificar se há foreign keys
                cursor.execute(f"PRAGMA foreign_key_list({nome_tabela})")
                fks = cursor.fetchall()
                
                if fks:
                    f.write("Foreign Keys:\n")
                    for fk in fks:
                        f.write(f"  - {fk[3]} → {fk[2]}.{fk[4]}\n")
                
                f.write("\n")
            
            f.write("=" * 40 + "\n")
            f.write(f"TOTAL GERAL DE REGISTROS: {total_geral:,}\n")
        
        print(f"✅ Informações salvas em: {info_path}")
        
        conn.close()
        
    except Exception as e:
        print(f"❌ Erro ao gerar informações: {e}")

if __name__ == "__main__":
    print("🔄 SISTEMA DE EXPORTAÇÃO COMPLETA - BANCO SELLETA")
    print("Preparando para exportar todas as tabelas...")
    print()
    
    # Verificar se diretório de saída existe
    output_dir = "../base_exportada_bd"
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
        print(f"📁 Diretório criado: {output_dir}")
    
    # Executar exportações
    sucesso = exportar_todas_tabelas()
    
    if sucesso:
        gerar_estrutura_tabelas()
        gerar_info_detalhada()
        
        print()
        print("🎉 PROCESSO COMPLETO FINALIZADO!")
        print("✅ Todas as tabelas foram exportadas para CSV")
        print("✅ Estrutura SQL documentada")
        print("✅ Informações detalhadas geradas")
        print()
        print(f"📁 Verifique os arquivos em: {output_dir}")
    else:
        print("❌ Falha na exportação. Verifique os erros acima.")