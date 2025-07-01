#!/usr/bin/env python3
# -*- coding: utf-8 -*-

from flask import Blueprint, render_template, jsonify, request
import sqlite3
from datetime import datetime

# Criar Blueprint para rotas administrativas
admin_bp = Blueprint('admin', __name__)

@admin_bp.route('/db')
def visualizar_banco_dados():
    """Rota para visualizar estrutura completa do banco de dados"""
    try:
        conn = sqlite3.connect('selleta_main.db')
        cursor = conn.cursor()
        
        # Obter lista de todas as tabelas
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
        tabelas = cursor.fetchall()
        
        dados_tabelas = []
        
        for (nome_tabela,) in tabelas:
            # Obter informações das colunas
            cursor.execute(f"PRAGMA table_info({nome_tabela})")
            colunas = cursor.fetchall()
            
            # Obter 5 registros de exemplo
            cursor.execute(f"SELECT * FROM {nome_tabela} LIMIT 5")
            registros_exemplo = cursor.fetchall()
            
            # Contar total de registros
            cursor.execute(f"SELECT COUNT(*) FROM {nome_tabela}")
            total_registros = cursor.fetchone()[0]
            
            dados_tabelas.append({
                'nome': nome_tabela,
                'colunas': colunas,
                'registros_exemplo': registros_exemplo,
                'total_registros': total_registros
            })
        
        # Gerar HTML estaticamente
        html_content = f"""
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Visualização do Banco de Dados</title>
    <style>
        body {{
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #f5f7fa;
        }}
        
        .container {{
            max-width: 1400px;
            margin: 0 auto;
        }}
        
        .header {{
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            border-radius: 12px;
            text-align: center;
            margin-bottom: 30px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
        }}
        
        .header h1 {{
            margin: 0;
            font-size: 2.5em;
            font-weight: 600;
        }}
        
        .header .subtitle {{
            margin-top: 10px;
            font-size: 1.1em;
            opacity: 0.9;
        }}
        
        .tabela-card {{
            background: white;
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
            margin-bottom: 30px;
            overflow: hidden;
        }}
        
        .tabela-header {{
            background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
            color: white;
            padding: 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }}
        
        .tabela-nome {{
            font-size: 1.5em;
            font-weight: 600;
        }}
        
        .tabela-stats {{
            display: flex;
            gap: 20px;
            font-size: 0.9em;
        }}
        
        .stat {{
            background: rgba(255,255,255,0.2);
            padding: 8px 12px;
            border-radius: 6px;
        }}
        
        .tabela-content {{
            padding: 20px;
        }}
        
        .colunas-section {{
            margin-bottom: 30px;
        }}
        
        .section-title {{
            font-size: 1.2em;
            font-weight: 600;
            color: #333;
            margin-bottom: 15px;
            padding-bottom: 8px;
            border-bottom: 2px solid #e9ecef;
        }}
        
        .colunas-grid {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 15px;
        }}
        
        .coluna-card {{
            background: #f8f9fa;
            border: 1px solid #e9ecef;
            border-radius: 8px;
            padding: 15px;
        }}
        
        .coluna-nome {{
            font-weight: 600;
            color: #495057;
            margin-bottom: 5px;
        }}
        
        .coluna-tipo {{
            color: #6c757d;
            font-size: 0.9em;
            margin-bottom: 5px;
        }}
        
        .coluna-constraints {{
            display: flex;
            gap: 8px;
            margin-top: 8px;
        }}
        
        .constraint {{
            background: #007bff;
            color: white;
            padding: 2px 8px;
            border-radius: 12px;
            font-size: 0.75em;
            font-weight: 500;
        }}
        
        .constraint.pk {{
            background: #dc3545;
        }}
        
        .constraint.unique {{
            background: #28a745;
        }}
        
        .registros-section {{
            margin-top: 30px;
        }}
        
        .registros-table {{
            width: 100%;
            border-collapse: collapse;
            margin-top: 15px;
            font-size: 12px;
        }}
        
        .registros-table th {{
            background: #343a40;
            color: white;
            padding: 12px 8px;
            text-align: left;
            font-weight: 600;
            border: 1px solid #dee2e6;
        }}
        
        .registros-table td {{
            padding: 8px;
            border: 1px solid #dee2e6;
            vertical-align: top;
            max-width: 200px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }}
        
        .registros-table tr:nth-child(even) {{
            background-color: #f8f9fa;
        }}
        
        .registros-table tr:hover {{
            background-color: #e9ecef;
        }}
        
        .null-value {{
            color: #6c757d;
            font-style: italic;
        }}
        
        .numeric-value {{
            color: #28a745;
            font-weight: 500;
        }}
        
        .string-value {{
            color: #007bff;
        }}
        
        .date-value {{
            color: #dc3545;
        }}
        
        .no-data {{
            text-align: center;
            color: #6c757d;
            padding: 40px;
            font-style: italic;
        }}
        
        .summary-stats {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }}
        
        .summary-card {{
            background: white;
            border-radius: 12px;
            padding: 20px;
            text-align: center;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }}
        
        .summary-value {{
            font-size: 2em;
            font-weight: bold;
            color: #333;
        }}
        
        .summary-label {{
            color: #6c757d;
            margin-top: 5px;
            font-size: 0.9em;
        }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🗄️ Visualização do Banco de Dados</h1>
            <div class="subtitle">Estrutura completa do sistema - Gerado em: {datetime.now().strftime('%d/%m/%Y às %H:%M:%S')}</div>
        </div>
        
        <div class="summary-stats">
            <div class="summary-card">
                <div class="summary-value">{len(dados_tabelas)}</div>
                <div class="summary-label">Tabelas</div>
            </div>
            <div class="summary-card">
                <div class="summary-value">{sum(len(t['colunas']) for t in dados_tabelas)}</div>
                <div class="summary-label">Total de Colunas</div>
            </div>
            <div class="summary-card">
                <div class="summary-value">{sum(t['total_registros'] for t in dados_tabelas):,}</div>
                <div class="summary-label">Total de Registros</div>
            </div>
        </div>
"""
        
        # Gerar cards para cada tabela
        for tabela in dados_tabelas:
            nome = tabela['nome']
            colunas = tabela['colunas']
            registros = tabela['registros_exemplo']
            total = tabela['total_registros']
            
            html_content += f"""
        <div class="tabela-card">
            <div class="tabela-header">
                <div class="tabela-nome">📋 {nome}</div>
                <div class="tabela-stats">
                    <div class="stat">
                        <strong>{len(colunas)}</strong> colunas
                    </div>
                    <div class="stat">
                        <strong>{total:,}</strong> registros
                    </div>
                </div>
            </div>
            
            <div class="tabela-content">
                <div class="colunas-section">
                    <div class="section-title">🏗️ Estrutura das Colunas</div>
                    <div class="colunas-grid">
"""
            
            # Adicionar informações das colunas
            for col in colunas:
                cid, nome_col, tipo, notnull, default, pk = col
                
                constraints = []
                if pk:
                    constraints.append('<span class="constraint pk">PK</span>')
                if notnull:
                    constraints.append('<span class="constraint">NOT NULL</span>')
                if default:
                    constraints.append('<span class="constraint">DEFAULT</span>')
                
                constraints_html = ' '.join(constraints)
                
                html_content += f"""
                        <div class="coluna-card">
                            <div class="coluna-nome">{nome_col}</div>
                            <div class="coluna-tipo">{tipo}</div>
                            <div class="coluna-constraints">{constraints_html}</div>
                        </div>
"""
            
            html_content += """
                    </div>
                </div>
                
                <div class="registros-section">
                    <div class="section-title">📊 Registros de Exemplo (5 primeiros)</div>
"""
            
            # Adicionar tabela de registros exemplo
            if registros:
                html_content += """
                    <table class="registros-table">
                        <thead>
                            <tr>
"""
                
                # Cabeçalhos das colunas
                for col in colunas:
                    html_content += f"<th>{col[1]}</th>"
                
                html_content += """
                            </tr>
                        </thead>
                        <tbody>
"""
                
                # Dados dos registros
                for registro in registros:
                    html_content += "<tr>"
                    for i, valor in enumerate(registro):
                        if valor is None:
                            classe = "null-value"
                            valor_fmt = "NULL"
                        elif isinstance(valor, (int, float)):
                            classe = "numeric-value"
                            valor_fmt = str(valor)
                        elif isinstance(valor, str) and len(valor) > 50:
                            classe = "string-value"
                            valor_fmt = valor[:50] + "..."
                        else:
                            classe = "string-value"
                            valor_fmt = str(valor)
                        
                        html_content += f'<td class="{classe}" title="{valor}">{valor_fmt}</td>'
                    html_content += "</tr>"
                
                html_content += """
                        </tbody>
                    </table>
"""
            else:
                html_content += """
                    <div class="no-data">
                        📭 Nenhum registro encontrado nesta tabela
                    </div>
"""
            
            html_content += """
                </div>
            </div>
        </div>
"""
        
        html_content += """
    </div>
</body>
</html>
"""
        
        conn.close()
        return html_content
        
    except Exception as e:
        return f"<html><body><h1>Erro ao visualizar banco de dados</h1><p>{str(e)}</p></body></html>"

@admin_bp.route('/relatorio_conferencia')
def relatorio_conferencia():
    """Rota para exibir relatório de conferência do plano financeiro"""
    try:
        # Ler o arquivo HTML gerado
        with open('verify/relatorio_conferencia.html', 'r', encoding='utf-8') as file:
            html_content = file.read()
        return html_content
    except FileNotFoundError:
        return "<html><body><h1>Relatório não encontrado</h1><p>Execute o script de geração primeiro.</p></body></html>"
    except Exception as e:
        return f"<html><body><h1>Erro ao carregar relatório</h1><p>{str(e)}</p></body></html>"

@admin_bp.route('/relatorio_conferencia/dinamicojs')
def relatorio_dinamico():
    """Rota para exibir relatório dinâmico interativo"""
    try:
        # Ler o arquivo HTML gerado
        with open('verify/relatorio_dinamico.html', 'r', encoding='utf-8') as file:
            html_content = file.read()
        return html_content
    except FileNotFoundError:
        return "<html><body><h1>Relatório dinâmico não encontrado</h1><p>Execute o script de geração primeiro.</p></body></html>"
    except Exception as e:
        return f"<html><body><h1>Erro ao carregar relatório dinâmico</h1><p>{str(e)}</p></body></html>"

@admin_bp.route('/dbtransacoes')
def visualizar_transacoes():
    """Rota para visualizar especificamente a tabela de transações com scroll horizontal"""
    try:
        conn = sqlite3.connect('selleta_main.db')
        cursor = conn.cursor()
        
        # Obter informações das colunas da tabela transacoes
        cursor.execute("PRAGMA table_info(transacoes)")
        colunas_info = cursor.fetchall()
        
        # Contar total de registros
        cursor.execute("SELECT COUNT(*) FROM transacoes")
        total_registros = cursor.fetchone()[0]
        
        # Verificar quais tabelas relacionadas existem
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tabelas_existentes = [row[0] for row in cursor.fetchall()]
        
        # Verificar quais colunas existem na tabela transacoes
        colunas_transacoes = [col[1] for col in colunas_info]
        
        # Construir lista de campos básicos baseado no que realmente existe
        campos_basicos = ['t.id']
        if 'titulo' in colunas_transacoes:
            campos_basicos.append('t.titulo')
        else:
            campos_basicos.append("'N/A' as titulo")
            
        if 'valor' in colunas_transacoes:
            campos_basicos.append('t.valor')
        else:
            campos_basicos.append('0 as valor')
            
        if 'tipo' in colunas_transacoes:
            campos_basicos.append('t.tipo')
        else:
            campos_basicos.append("'N/A' as tipo")
            
        if 'data_lancamento' in colunas_transacoes:
            campos_basicos.append('t.data_lancamento')
        else:
            campos_basicos.append("NULL as data_lancamento")
            
        if 'data_vencimento' in colunas_transacoes:
            campos_basicos.append('t.data_vencimento')
        else:
            campos_basicos.append("NULL as data_vencimento")
            
        if 'status_negociacao' in colunas_transacoes:
            campos_basicos.append('t.status_negociacao')
        else:
            campos_basicos.append("'N/A' as status_negociacao")
            
        if 'status_pagamento' in colunas_transacoes:
            campos_basicos.append('t.status_pagamento')
        else:
            campos_basicos.append("'N/A' as status_pagamento")
            
        if 'parcela_atual' in colunas_transacoes:
            campos_basicos.append('t.parcela_atual')
        else:
            campos_basicos.append('1 as parcela_atual')
            
        if 'parcela_total' in colunas_transacoes:
            campos_basicos.append('t.parcela_total')
        else:
            campos_basicos.append('1 as parcela_total')
            
        if 'observacoes' in colunas_transacoes:
            campos_basicos.append('t.observacoes')
        elif 'observacao' in colunas_transacoes:
            campos_basicos.append('t.observacao as observacoes')
        else:
            campos_basicos.append("NULL as observacoes")
        
        # Construir query dinamicamente baseado nas tabelas que existem
        joins = []
        selects = campos_basicos.copy()
        
        # Verificar e adicionar JOINs apenas se as colunas FK existirem na tabela transacoes
        if 'empresas' in tabelas_existentes and 'empresa_id' in colunas_transacoes:
            joins.append("LEFT JOIN empresas e ON t.empresa_id = e.id")
            selects.append("CASE WHEN t.empresa_id IS NOT NULL THEN COALESCE(e.nome, 'N/A') ELSE 'N/A' END as empresa")
        else:
            selects.append("'N/A' as empresa")
            
        if 'clientes_fornecedores' in tabelas_existentes and 'cliente_fornecedor_id' in colunas_transacoes:
            joins.append("LEFT JOIN clientes_fornecedores cf ON t.cliente_fornecedor_id = cf.id")
            selects.append("CASE WHEN t.cliente_fornecedor_id IS NOT NULL THEN COALESCE(cf.nome, 'N/A') ELSE 'N/A' END as cliente_fornecedor")
        else:
            selects.append("'N/A' as cliente_fornecedor")
            
        if 'plano_financeiro' in tabelas_existentes and 'plano_financeiro_id' in colunas_transacoes:
            joins.append("LEFT JOIN plano_financeiro pf ON t.plano_financeiro_id = pf.id")
            selects.append("CASE WHEN t.plano_financeiro_id IS NOT NULL THEN COALESCE(pf.codigo || ' - ' || pf.nome, 'N/A') ELSE 'N/A' END as plano_financeiro")
        else:
            selects.append("'N/A' as plano_financeiro")
            
        if 'centros_custo' in tabelas_existentes and 'centro_custo_id' in colunas_transacoes:
            joins.append("LEFT JOIN centros_custo cc ON t.centro_custo_id = cc.id")
            selects.append("CASE WHEN t.centro_custo_id IS NOT NULL THEN COALESCE(cc.descricao, cc.centro_custo_original, 'N/A') ELSE 'N/A' END as centro_custo")
        else:
            selects.append("'N/A' as centro_custo")
            
        # Conta bancária não existe na estrutura atual
        selects.append("'N/A' as conta_bancaria")
        
        # Adicionar campos de timestamp (usar nomes corretos da tabela)
        if 'created_at' in colunas_transacoes:
            selects.append('t.created_at')
        elif 'criado_em' in colunas_transacoes:
            selects.append('t.criado_em as created_at')
        else:
            selects.append("NULL as created_at")
            
        if 'updated_at' in colunas_transacoes:
            selects.append('t.updated_at')
        elif 'atualizado_em' in colunas_transacoes:
            selects.append('t.atualizado_em as updated_at')
        else:
            selects.append("NULL as updated_at")
        
        # Construir query final
        query = f"""
            SELECT {', '.join(selects)}
            FROM transacoes t
            {' '.join(joins)}
            ORDER BY t.id DESC
            LIMIT 100
        """
        
        cursor.execute(query)
        
        registros = cursor.fetchall()
        
        # Definir colunas para exibição (incluindo joins)
        colunas_exibicao = [
            'ID', 'Título', 'Valor', 'Tipo', 'Data Lançamento', 'Data Vencimento',
            'Status Negociação', 'Status Pagamento', 'Parcela Atual', 'Parcela Total',
            'Observações', 'Empresa', 'Cliente/Fornecedor', 'Plano Financeiro',
            'Centro de Custo', 'Conta Bancária', 'Criado em', 'Atualizado em'
        ]
        
        # Gerar HTML específico para transações
        html_content = f"""
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Tabela de Transações - Administração</title>
    <style>
        body {{
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #f5f7fa;
        }}
        
        .container {{
            max-width: 100vw;
            margin: 0 auto;
        }}
        
        .header {{
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            border-radius: 12px;
            text-align: center;
            margin-bottom: 30px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
        }}
        
        .header h1 {{
            margin: 0;
            font-size: 2.5em;
            font-weight: 600;
        }}
        
        .header .subtitle {{
            margin-top: 10px;
            font-size: 1.1em;
            opacity: 0.9;
        }}
        
        .stats-row {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }}
        
        .stat-card {{
            background: white;
            border-radius: 12px;
            padding: 20px;
            text-align: center;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }}
        
        .stat-value {{
            font-size: 2em;
            font-weight: bold;
            color: #333;
        }}
        
        .stat-label {{
            color: #6c757d;
            margin-top: 5px;
            font-size: 0.9em;
        }}
        
        .table-container {{
            background: white;
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
            overflow: hidden;
        }}
        
        .table-header {{
            background: #343a40;
            color: white;
            padding: 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }}
        
        .table-title {{
            font-size: 1.5em;
            font-weight: 600;
        }}
        
        .table-info {{
            font-size: 0.9em;
            opacity: 0.9;
        }}
        
        .scroll-container {{
            overflow-x: auto;
            overflow-y: auto;
            max-height: 70vh;
            position: relative;
        }}
        
        .transactions-table {{
            width: 100%;
            border-collapse: collapse;
            font-size: 12px;
            min-width: 2000px;
        }}
        
        .transactions-table th {{
            background: #495057;
            color: white;
            padding: 12px 8px;
            text-align: left;
            font-weight: 600;
            position: sticky;
            top: 0;
            z-index: 10;
            border-right: 1px solid #6c757d;
            white-space: nowrap;
        }}
        
        .transactions-table th:first-child {{
            position: sticky;
            left: 0;
            z-index: 11;
            background: #343a40;
            border-right: 2px solid #007bff;
        }}
        
        .transactions-table td {{
            padding: 8px;
            border-bottom: 1px solid #e9ecef;
            border-right: 1px solid #e9ecef;
            vertical-align: top;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            max-width: 200px;
        }}
        
        .transactions-table td:first-child {{
            position: sticky;
            left: 0;
            background: white;
            font-weight: bold;
            border-right: 2px solid #007bff;
            z-index: 1;
        }}
        
        .transactions-table tr:nth-child(even) {{
            background-color: #f8f9fa;
        }}
        
        .transactions-table tr:nth-child(even) td:first-child {{
            background-color: #f8f9fa;
        }}
        
        .transactions-table tr:hover {{
            background-color: #e9ecef;
        }}
        
        .transactions-table tr:hover td:first-child {{
            background-color: #e9ecef;
        }}
        
        .valor-positivo {{
            color: #28a745;
            font-weight: bold;
        }}
        
        .valor-negativo {{
            color: #dc3545;
            font-weight: bold;
        }}
        
        .status-realizado {{
            background: #d4edda;
            color: #155724;
            padding: 4px 8px;
            border-radius: 12px;
            font-size: 11px;
            font-weight: 600;
        }}
        
        .status-pendente {{
            background: #fff3cd;
            color: #856404;
            padding: 4px 8px;
            border-radius: 12px;
            font-size: 11px;
            font-weight: 600;
        }}
        
        .tipo-receita {{
            background: #d1ecf1;
            color: #0c5460;
            padding: 4px 8px;
            border-radius: 12px;
            font-size: 11px;
            font-weight: 600;
        }}
        
        .tipo-despesa {{
            background: #f8d7da;
            color: #721c24;
            padding: 4px 8px;
            border-radius: 12px;
            font-size: 11px;
            font-weight: 600;
        }}
        
        .null-value {{
            color: #6c757d;
            font-style: italic;
        }}
        
        .controls {{
            background: #f8f9fa;
            padding: 15px 20px;
            border-bottom: 1px solid #e9ecef;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }}
        
        .btn {{
            background: #007bff;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 12px;
            text-decoration: none;
            display: inline-block;
        }}
        
        .btn:hover {{
            background: #0056b3;
        }}
        
        .btn.secondary {{
            background: #6c757d;
        }}
        
        .btn.secondary:hover {{
            background: #545b62;
        }}
        
        .scroll-hint {{
            background: #e7f3ff;
            border: 1px solid #b3d9ff;
            padding: 10px;
            border-radius: 6px;
            margin-bottom: 20px;
            font-size: 14px;
        }}
        
        .scroll-hint i {{
            color: #007bff;
            margin-right: 8px;
        }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🗂️ Tabela de Transações</h1>
            <div class="subtitle">Visualização completa com scroll horizontal - Gerado em: {datetime.now().strftime('%d/%m/%Y às %H:%M:%S')}</div>
        </div>
        
        <div class="stats-row">
            <div class="stat-card">
                <div class="stat-value">{total_registros:,}</div>
                <div class="stat-label">Total de Transações</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">{len(colunas_info)}</div>
                <div class="stat-label">Colunas na Tabela</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">100</div>
                <div class="stat-label">Registros Exibidos</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">{len(tabelas_existentes)}</div>
                <div class="stat-label">Tabelas no BD</div>
            </div>
        </div>
        
        <div class="scroll-hint">
            <i class="fas fa-info-circle"></i>
            <strong>Tabelas encontradas:</strong> {', '.join(sorted(tabelas_existentes))} | 
            <strong>Colunas FK válidas:</strong> {', '.join([col for col in ['empresa_id', 'cliente_fornecedor_id', 'plano_financeiro_id', 'centro_custo_id'] if col in colunas_transacoes])} | 
            <strong>Dica:</strong> Use o scroll horizontal para navegar por todas as colunas. A primeira coluna (ID) fica fixa para referência.
        </div>
        
        <div class="table-container">
            <div class="table-header">
                <div class="table-title">📊 Transações (Últimas 100)</div>
                <div class="table-info">
                    Scroll horizontal ativo | {len(colunas_exibicao)} colunas
                </div>
            </div>
            
            <div class="controls">
                <div>
                    <a href="/admin/db" class="btn secondary">← Voltar para Visualização Geral</a>
                    <button class="btn" onclick="location.reload()">🔄 Atualizar</button>
                </div>
                <div>
                    <span style="font-size: 12px; color: #6c757d;">
                        Mostrando {min(100, total_registros)} de {total_registros:,} registros
                    </span>
                </div>
            </div>
            
            <div class="scroll-container">
                <table class="transactions-table">
                    <thead>
                        <tr>
"""
        
        # Adicionar cabeçalhos das colunas
        for coluna in colunas_exibicao:
            html_content += f"<th>{coluna}</th>"
        
        html_content += """
                        </tr>
                    </thead>
                    <tbody>
"""
        
        # Adicionar dados das transações
        for registro in registros:
            html_content += "<tr>"
            
            for i, valor in enumerate(registro):
                css_class = ""
                valor_fmt = ""
                
                if valor is None:
                    css_class = "null-value"
                    valor_fmt = "NULL"
                elif i == 2:  # Coluna valor
                    css_class = "valor-positivo" if valor > 0 else "valor-negativo"
                    valor_fmt = f"R$ {valor:,.2f}"
                elif i == 3:  # Coluna tipo
                    css_class = "tipo-receita" if valor == "Receita" else "tipo-despesa"
                    valor_fmt = str(valor)
                elif i in [6, 7]:  # Status negociação e pagamento
                    css_class = "status-realizado" if "Realizado" in str(valor) else "status-pendente"
                    valor_fmt = str(valor)
                elif isinstance(valor, str) and len(valor) > 30:
                    valor_fmt = valor[:30] + "..."
                else:
                    valor_fmt = str(valor)
                
                html_content += f'<td class="{css_class}" title="{valor}">{valor_fmt}</td>'
            
            html_content += "</tr>"
        
        html_content += """
                    </tbody>
                </table>
            </div>
        </div>
    </div>

    <script>
        // Melhorar a experiência de scroll
        document.addEventListener('DOMContentLoaded', function() {{
            const scrollContainer = document.querySelector('.scroll-container');
            
            // Adicionar indicador de scroll
            let isScrolling = false;
            scrollContainer.addEventListener('scroll', function() {{
                if (!isScrolling) {{
                    scrollContainer.style.boxShadow = 'inset 0 0 10px rgba(0,0,0,0.1)';
                    isScrolling = true;
                }}
                
                clearTimeout(scrollContainer.scrollTimeout);
                scrollContainer.scrollTimeout = setTimeout(function() {{
                    scrollContainer.style.boxShadow = 'none';
                    isScrolling = false;
                }}, 150);
            }});
            
            console.log('✅ Tabela de transações carregada com {len(registros)} registros');
        }});
    </script>
</body>
</html>
"""
        
        conn.close()
        return html_content
        
    except Exception as e:
        return f"<html><body><h1>Erro ao visualizar transações</h1><p>{str(e)}</p></body></html>"

@admin_bp.route('/api/plano_financeiro/<int:plano_id>/detalhes')
def api_plano_financeiro_detalhes(plano_id):
    """API para buscar detalhes de um plano financeiro específico"""
    try:
        conn = sqlite3.connect('selleta_main.db')
        cursor = conn.cursor()
        
        # Buscar informações do plano financeiro
        cursor.execute("""
            SELECT id, codigo, nome, nivel 
            FROM plano_financeiro 
            WHERE id = ?
        """, (plano_id,))
        
        plano = cursor.fetchone()
        if not plano:
            return jsonify({'error': 'Plano financeiro não encontrado'}), 404
        
        plano_dict = {
            'id': plano[0],
            'codigo': plano[1],
            'nome': plano[2],
            'nivel': plano[3]
        }
        
        # Buscar transações relacionadas
        cursor.execute("""
            SELECT 
                t.id,
                t.titulo,
                t.valor,
                t.tipo,
                t.data_vencimento,
                t.status_pagamento,
                cf.nome as credor_nome,
                cf.cpf_cnpj,
                cf.tipo as credor_tipo
            FROM transacoes t
            LEFT JOIN clientes_fornecedores cf ON t.cliente_fornecedor_id = cf.id
            WHERE t.plano_financeiro_id = ?
            ORDER BY t.data_vencimento DESC
        """, (plano_id,))
        
        transacoes_raw = cursor.fetchall()
        
        transacoes = []
        credores_unicos = set()
        total_valor = 0
        
        for t in transacoes_raw:
            transacao = {
                'id': t[0],
                'titulo': t[1],
                'valor': t[2],
                'tipo': t[3],
                'data_vencimento': t[4],
                'status_pagamento': t[5],
                'credor': {
                    'nome': t[6] or 'Não informado',
                    'cpf_cnpj': t[7],
                    'tipo': t[8]
                }
            }
            
            transacoes.append(transacao)
            if t[6]:
                credores_unicos.add(t[6])
            total_valor += t[2] or 0
        
        # Resumo
        resumo = {
            'total_transacoes': len(transacoes),
            'total_valor': total_valor,
            'qtd_credores': len(credores_unicos),
            'credores_unicos': list(credores_unicos)
        }
        
        conn.close()
        
        return jsonify({
            'plano': plano_dict,
            'transacoes': transacoes,
            'resumo': resumo
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500