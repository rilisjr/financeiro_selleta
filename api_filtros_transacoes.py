#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
API DE FILTROS PARA TRANSAÇÕES
===============================
Sistema completo de filtros hierárquicos e inteligentes
"""

import sqlite3
import json
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional

class TransacoesFiltros:
    """Classe para gerenciar filtros de transações"""
    
    def __init__(self, db_path: str = 'selleta_main.db'):
        self.db_path = db_path
        
    def get_connection(self):
        """Conexão com banco de dados"""
        return sqlite3.connect(self.db_path)
    
    def get_filtros_disponiveis(self) -> Dict[str, Any]:
        """
        Retorna todos os filtros disponíveis organizados por categoria
        """
        conn = self.get_connection()
        cursor = conn.cursor()
        
        try:
            filtros = {
                'basicos': self._get_filtros_basicos(cursor),
                'entidades': self._get_filtros_entidades(cursor),
                'avancados': self._get_filtros_avancados(cursor),
                'configuracoes': self._get_configuracoes_default()
            }
            
            return filtros
            
        finally:
            conn.close()
    
    def _get_filtros_basicos(self, cursor) -> Dict[str, Any]:
        """Filtros básicos (tipo, status, período)"""
        
        # Tipos de transação
        cursor.execute('SELECT DISTINCT tipo FROM transacoes WHERE tipo IS NOT NULL ORDER BY tipo')
        tipos = [{'value': row[0], 'label': row[0]} for row in cursor.fetchall()]
        
        # Status de pagamento
        cursor.execute('SELECT DISTINCT status_pagamento FROM transacoes WHERE status_pagamento IS NOT NULL ORDER BY status_pagamento')
        status_pagamento = [{'value': row[0], 'label': row[0]} for row in cursor.fetchall()]
        
        # Status de negociação
        cursor.execute('SELECT DISTINCT status_negociacao FROM transacoes WHERE status_negociacao IS NOT NULL ORDER BY status_negociacao')
        status_negociacao = [{'value': row[0], 'label': row[0]} for row in cursor.fetchall()]
        
        # Períodos pré-definidos
        periodos = [
            {'value': 'todos', 'label': 'Todos os períodos'},
            {'value': 'mes_atual', 'label': 'Mês atual'},
            {'value': 'trimestre_atual', 'label': 'Trimestre atual'},
            {'value': 'ano_atual', 'label': 'Ano atual'},
            {'value': 'ultimo_mes', 'label': 'Último mês'},
            {'value': 'ultimos_3_meses', 'label': 'Últimos 3 meses'},
            {'value': 'custom', 'label': 'Período personalizado'}
        ]
        
        return {
            'tipos': [{'value': '', 'label': 'Todos os tipos'}] + tipos,
            'status_pagamento': [{'value': '', 'label': 'Todos os status'}] + status_pagamento,
            'status_negociacao': [{'value': '', 'label': 'Todos os status'}] + status_negociacao,
            'periodos': periodos
        }
    
    def _get_filtros_entidades(self, cursor) -> Dict[str, Any]:
        """Filtros de entidades (empresas, centros, fornecedores, planos)"""
        
        # EMPRESAS
        cursor.execute('SELECT id, nome FROM empresas ORDER BY nome')
        empresas = [{'value': row[0], 'label': row[1]} for row in cursor.fetchall()]
        
        # CENTROS DE CUSTO - Por tipologia E por máscara
        cursor.execute('''
            SELECT DISTINCT tipologia 
            FROM centros_custo 
            WHERE ativo = 1 AND tipologia IS NOT NULL 
            ORDER BY tipologia
        ''')
        tipologias_cc = [{'value': row[0], 'label': row[0]} for row in cursor.fetchall()]
        
        # CENTROS DE CUSTO - Nomes únicos (sem duplicação entre empresas)
        cursor.execute('''
            SELECT DISTINCT mascara_cc, tipologia
            FROM centros_custo 
            WHERE ativo = 1 AND mascara_cc IS NOT NULL
            ORDER BY tipologia, mascara_cc
        ''')
        centros_custo = []
        for row in cursor.fetchall():
            centros_custo.append({
                'value': row[0],  # Usar nome como value para busca por nome
                'label': row[1] and f"{row[0]} ({row[1]})" or row[0],  # Nome (tipologia)
                'tipologia': row[1],
                'nome': row[0],
                'search_text': f"{row[0]} {row[1] or ''}"
            })
        
        # FORNECEDORES - Por nome E por tipo (TABELA CORRETA: fornecedores)
        cursor.execute('''
            SELECT DISTINCT tipo_fornecedor 
            FROM fornecedores 
            WHERE ativo = 1 AND tipo_fornecedor IS NOT NULL 
            ORDER BY tipo_fornecedor
        ''')
        tipos_fornecedor = [{'value': row[0], 'label': row[0].title()} for row in cursor.fetchall()]
        
        cursor.execute('''
            SELECT id, nome, tipo_fornecedor
            FROM fornecedores 
            WHERE ativo = 1 
            ORDER BY nome
        ''')
        fornecedores = []
        for row in cursor.fetchall():
            fornecedores.append({
                'value': row[0],
                'label': row[1],
                'tipo': row[2] or 'Não definido',
                'search_text': f"{row[1]} {row[2] or ''}"
            })
        
        # PLANO FINANCEIRO - Hierárquico por níveis
        planos_hierarquicos = self._get_planos_hierarquicos(cursor)
        
        return {
            'empresas': [{'value': '', 'label': 'Todas as empresas'}] + empresas,
            'centros_custo': {
                'por_tipologia': [{'value': '', 'label': 'Todas as tipologias'}] + tipologias_cc,
                'por_mascara': [{'value': '', 'label': 'Todos os centros'}] + centros_custo
            },
            'fornecedores': {
                'por_tipo': [{'value': '', 'label': 'Todos os tipos'}] + tipos_fornecedor,
                'por_nome': [{'value': '', 'label': 'Todos os fornecedores'}] + fornecedores
            },
            'plano_financeiro': planos_hierarquicos
        }
    
    def _get_planos_hierarquicos(self, cursor) -> Dict[str, Any]:
        """Constrói hierarquia inteligente do plano financeiro"""
        
        # Buscar todos os planos ordenados por código
        cursor.execute('''
            SELECT id, codigo, nome, nivel, plano_pai_id
            FROM plano_financeiro 
            WHERE ativo = 1 
            ORDER BY codigo
        ''')
        planos_raw = cursor.fetchall()
        
        # Organizar por níveis
        por_nivel = {1: [], 2: [], 3: [], 4: []}
        mapa_planos = {}  # Para lookup rápido
        
        for plano in planos_raw:
            id_plano, codigo, nome, nivel, pai_id = plano
            
            item = {
                'value': id_plano,
                'label': f"{codigo} - {nome}",
                'codigo': codigo,
                'nome': nome,
                'nivel': nivel,
                'pai_id': pai_id,
                'filhos': []
            }
            
            mapa_planos[id_plano] = item
            
            if nivel in por_nivel:
                por_nivel[nivel].append(item)
        
        # Construir hierarquia
        for plano in mapa_planos.values():
            if plano['pai_id'] and plano['pai_id'] in mapa_planos:
                mapa_planos[plano['pai_id']]['filhos'].append(plano)
        
        return {
            'por_nivel': {
                '1': [{'value': '', 'label': 'Todos os níveis 1'}] + por_nivel[1],
                '2': [{'value': '', 'label': 'Todos os níveis 2'}] + por_nivel[2],
                '3': [{'value': '', 'label': 'Todos os níveis 3'}] + por_nivel[3],
                '4': [{'value': '', 'label': 'Todos os níveis 4'}] + por_nivel[4]
            },
            'hierarquia_completa': por_nivel[1],  # Apenas raízes, filhos já linkados
            'mapa_lookup': mapa_planos
        }
    
    def _get_filtros_avancados(self, cursor) -> Dict[str, Any]:
        """Filtros avançados (valores, parcelas, origem)"""
        
        # Faixas de valor pré-definidas
        faixas_valor = [
            {'value': '', 'label': 'Todos os valores'},
            {'value': '0-100', 'label': 'Até R$ 100'},
            {'value': '100-500', 'label': 'R$ 100 - R$ 500'},
            {'value': '500-1000', 'label': 'R$ 500 - R$ 1.000'},
            {'value': '1000-5000', 'label': 'R$ 1.000 - R$ 5.000'},
            {'value': '5000-10000', 'label': 'R$ 5.000 - R$ 10.000'},
            {'value': '10000-50000', 'label': 'R$ 10.000 - R$ 50.000'},
            {'value': '50000+', 'label': 'Acima de R$ 50.000'},
            {'value': 'custom', 'label': 'Valor personalizado'}
        ]
        
        # Tipos de parcela
        tipos_parcela = [
            {'value': '', 'label': 'Todas as parcelas'},
            {'value': 'unica', 'label': 'Parcela única'},
            {'value': 'parcelado', 'label': 'Parcelado'},
            {'value': 'primeira', 'label': 'Primeira parcela'},
            {'value': 'ultima', 'label': 'Última parcela'}
        ]
        
        # Origem da transação
        cursor.execute('SELECT DISTINCT origem_importacao FROM transacoes WHERE origem_importacao IS NOT NULL ORDER BY origem_importacao')
        origens = [{'value': row[0], 'label': row[0].title()} for row in cursor.fetchall()]
        
        # Municípios
        cursor.execute('SELECT DISTINCT municipio FROM transacoes WHERE municipio IS NOT NULL ORDER BY municipio')
        municipios = [{'value': row[0], 'label': row[0]} for row in cursor.fetchall()]
        
        return {
            'faixas_valor': faixas_valor,
            'tipos_parcela': tipos_parcela,
            'origem': [{'value': '', 'label': 'Todas as origens'}] + origens,
            'municipios': [{'value': '', 'label': 'Todos os municípios'}] + municipios
        }
    
    def _get_configuracoes_default(self) -> Dict[str, Any]:
        """Configurações padrão quando a página abre"""
        return {
            'filtros_default': {
                'tipo': '',  # Todos os tipos
                'status_pagamento': '',  # Todos os status
                'status_negociacao': '',  # Todos os status
                'periodo': 'todos',  # Todos os períodos
                'empresa_id': '',  # Todas as empresas
                'centro_custo_tipologia': '',  # Todas as tipologias
                'centro_custo_id': '',  # Todos os centros
                'fornecedor_tipo': '',  # Todos os tipos
                'fornecedor_id': '',  # Todos os fornecedores
                'plano_nivel': '',  # Todos os níveis
                'plano_id': '',  # Todos os planos
                'faixa_valor': '',  # Todos os valores
                'tipo_parcela': '',  # Todas as parcelas
                'origem': '',  # Todas as origens
                'municipio': ''  # Todos os municípios
            },
            'ordenacao_default': {
                'campo': 'data_vencimento',
                'direcao': 'desc'
            },
            'paginacao_default': {
                'page': 1,
                'per_page': 50
            },
            'view_default': 'table'  # table, cards, timeline, parcelas
        }
    
    def aplicar_filtros_plano_hierarquico(self, plano_id: int, cursor) -> List[int]:
        """
        LÓGICA INTELIGENTE: Quando seleciona um plano de nível 4,
        automaticamente inclui os planos pai (nível 3, 2, 1)
        """
        if not plano_id:
            return []
        
        # Buscar informações do plano selecionado
        cursor.execute('''
            SELECT id, nivel, plano_pai_id, codigo
            FROM plano_financeiro 
            WHERE id = ? AND ativo = 1
        ''', (plano_id,))
        
        plano_info = cursor.fetchone()
        if not plano_info:
            return [plano_id]
        
        id_plano, nivel, pai_id, codigo = plano_info
        planos_incluidos = [id_plano]
        
        # Se é nível 4, incluir hierarquia completa acima
        if nivel == 4:
            # Buscar caminho até a raiz
            atual_id = pai_id
            while atual_id:
                cursor.execute('''
                    SELECT id, plano_pai_id 
                    FROM plano_financeiro 
                    WHERE id = ? AND ativo = 1
                ''', (atual_id,))
                
                pai_info = cursor.fetchone()
                if pai_info:
                    planos_incluidos.append(pai_info[0])
                    atual_id = pai_info[1]
                else:
                    break
        
        # Também incluir todos os filhos do plano selecionado
        def buscar_filhos(parent_id):
            cursor.execute('''
                SELECT id FROM plano_financeiro 
                WHERE plano_pai_id = ? AND ativo = 1
            ''', (parent_id,))
            
            filhos = cursor.fetchall()
            for filho in filhos:
                planos_incluidos.append(filho[0])
                buscar_filhos(filho[0])  # Recursivo para netos
        
        buscar_filhos(id_plano)
        
        return planos_incluidos
    
    def construir_query_filtrada(self, filtros: Dict[str, Any]) -> tuple:
        """
        Constrói query SQL com todos os filtros aplicados
        Retorna: (query, params)
        """
        
        # Query base com JOINs
        base_query = '''
            SELECT DISTINCT
                t.id,
                t.titulo,
                t.numero_documento,
                t.parcela_atual,
                t.parcela_total,
                t.valor,
                t.data_lancamento,
                t.data_vencimento,
                t.data_competencia,
                t.tipo,
                t.tipologia,
                t.status_negociacao,
                t.status_pagamento,
                t.municipio,
                t.observacao,
                t.origem_importacao,
                t.criado_em,
                e.nome as empresa_nome,
                cc.mascara_cc as centro_custo_nome,
                cc.tipologia as centro_custo_tipologia,
                cf.nome as fornecedor_nome,
                cf.tipo_fornecedor as fornecedor_tipo,
                pf.codigo as plano_codigo,
                pf.nome as plano_nome,
                pf.nivel as plano_nivel
            FROM transacoes t
            LEFT JOIN empresas e ON t.empresa_id = e.id
            LEFT JOIN centros_custo cc ON t.centro_custo_id = cc.id
            LEFT JOIN fornecedores cf ON t.cliente_fornecedor_id = cf.id
            LEFT JOIN plano_financeiro pf ON t.plano_financeiro_id = pf.id
        '''
        
        where_clauses = []
        params = []
        
        # FILTROS BÁSICOS
        if filtros.get('tipo'):
            where_clauses.append('t.tipo = ?')
            params.append(filtros['tipo'])
        
        if filtros.get('status_pagamento'):
            where_clauses.append('t.status_pagamento = ?')
            params.append(filtros['status_pagamento'])
        
        if filtros.get('status_negociacao'):
            where_clauses.append('t.status_negociacao = ?')
            params.append(filtros['status_negociacao'])
        
        # FILTROS DE PERÍODO E DATAS PERSONALIZADAS
        periodo = filtros.get('periodo', 'todos')
        data_inicio_custom = filtros.get('data_inicio')
        data_fim_custom = filtros.get('data_fim')
        
        # PRIORIDADE 1: Datas personalizadas (data_inicio e data_fim)
        if data_inicio_custom or data_fim_custom:
            print(f"🔍 DEBUG: Aplicando filtro de datas personalizadas - Início: {data_inicio_custom}, Fim: {data_fim_custom}")
            
            if data_inicio_custom and data_fim_custom:
                # Ambas as datas preenchidas
                where_clauses.append('t.data_vencimento BETWEEN ? AND ?')
                params.extend([data_inicio_custom, data_fim_custom])
                print(f"✅ Filtro aplicado: data_vencimento BETWEEN {data_inicio_custom} AND {data_fim_custom}")
            
            elif data_inicio_custom:
                # Apenas data de início
                where_clauses.append('t.data_vencimento >= ?')
                params.append(data_inicio_custom)
                print(f"✅ Filtro aplicado: data_vencimento >= {data_inicio_custom}")
            
            elif data_fim_custom:
                # Apenas data de fim
                where_clauses.append('t.data_vencimento <= ?')
                params.append(data_fim_custom)
                print(f"✅ Filtro aplicado: data_vencimento <= {data_fim_custom}")
        
        # PRIORIDADE 2: Períodos predefinidos (apenas se não há datas personalizadas)
        elif periodo != 'todos' and periodo:
            print(f"🔍 DEBUG: Aplicando período predefinido: {periodo}")
            data_inicio, data_fim = self._calcular_periodo(periodo, filtros)
            if data_inicio and data_fim:
                where_clauses.append('t.data_vencimento BETWEEN ? AND ?')
                params.extend([data_inicio, data_fim])
                print(f"✅ Período aplicado: data_vencimento BETWEEN {data_inicio} AND {data_fim}")
        
        # FILTROS DE ENTIDADES
        # Filtro de empresa (único ou múltiplo)
        if filtros.get('empresa_id'):
            where_clauses.append('t.empresa_id = ?')
            params.append(filtros['empresa_id'])
        elif filtros.get('empresas_ids'):
            # Filtro múltiplo de empresas
            empresas_list = filtros['empresas_ids']
            if isinstance(empresas_list, list) and empresas_list:
                placeholders = ','.join(['?'] * len(empresas_list))
                where_clauses.append(f't.empresa_id IN ({placeholders})')
                params.extend(empresas_list)
                print(f"📊 DEBUG: Filtro múltiplo empresas: {empresas_list}")
        
        if filtros.get('centro_custo_tipologia'):
            where_clauses.append('cc.tipologia = ?')
            params.append(filtros['centro_custo_tipologia'])
        
        # LÓGICA INTELIGENTE CENTRO DE CUSTO
        if filtros.get('centro_custo_id'):
            centro_filtro = filtros['centro_custo_id']
            
            # Se é um ID numérico, buscar por ID específico
            if centro_filtro.isdigit():
                print(f"🏢 DEBUG: Filtro centro por ID específico: {centro_filtro}")
                where_clauses.append('t.centro_custo_id = ?')
                params.append(int(centro_filtro))
            else:
                # Se é um nome, buscar por mascara_cc em todas as empresas
                print(f"🏢 DEBUG: Filtro centro por nome (todas empresas): {centro_filtro}")
                
                # Se há filtro de empresa, aplicar ambos
                if filtros.get('empresa_id'):
                    where_clauses.append('cc.mascara_cc = ? AND cc.empresa_id = ?')
                    params.extend([centro_filtro, filtros['empresa_id']])
                    print(f"✅ Aplicado: centro='{centro_filtro}' E empresa={filtros['empresa_id']}")
                else:
                    where_clauses.append('cc.mascara_cc = ?')
                    params.append(centro_filtro)
                    print(f"✅ Aplicado: centro='{centro_filtro}' (todas as empresas)")
        
        elif filtros.get('centros_nomes'):
            # Filtro múltiplo de centros por nome
            centros_list = filtros['centros_nomes']
            if isinstance(centros_list, list) and centros_list:
                placeholders = ','.join(['?'] * len(centros_list))
                
                # Se há filtro múltiplo de empresas, combinar
                if filtros.get('empresas_ids'):
                    empresas_list = filtros['empresas_ids']
                    empresas_placeholders = ','.join(['?'] * len(empresas_list))
                    where_clauses.append(f'cc.mascara_cc IN ({placeholders}) AND cc.empresa_id IN ({empresas_placeholders})')
                    params.extend(centros_list)
                    params.extend(empresas_list)
                    print(f"🏢 DEBUG: Filtro múltiplo centros+empresas: {centros_list} x {empresas_list}")
                else:
                    where_clauses.append(f'cc.mascara_cc IN ({placeholders})')
                    params.extend(centros_list)
                    print(f"🏢 DEBUG: Filtro múltiplo centros: {centros_list}")
        
        if filtros.get('fornecedor_tipo'):
            where_clauses.append('cf.tipo_fornecedor = ?')
            params.append(filtros['fornecedor_tipo'])
        
        if filtros.get('fornecedor_id'):
            where_clauses.append('t.cliente_fornecedor_id = ?')
            params.append(filtros['fornecedor_id'])
        
        # FILTRO PLANO FINANCEIRO HIERÁRQUICO
        if filtros.get('plano_id'):
            conn = self.get_connection()
            cursor = conn.cursor()
            try:
                planos_incluidos = self.aplicar_filtros_plano_hierarquico(int(filtros['plano_id']), cursor)
                if planos_incluidos:
                    placeholders = ','.join(['?'] * len(planos_incluidos))
                    where_clauses.append(f't.plano_financeiro_id IN ({placeholders})')
                    params.extend(planos_incluidos)
            finally:
                conn.close()
        
        # FILTROS AVANÇADOS
        if filtros.get('faixa_valor') and filtros['faixa_valor'] != 'custom':
            valor_min, valor_max = self._parse_faixa_valor(filtros['faixa_valor'])
            if valor_min is not None:
                where_clauses.append('t.valor >= ?')
                params.append(valor_min)
            if valor_max is not None:
                where_clauses.append('t.valor <= ?')
                params.append(valor_max)
        
        if filtros.get('valor_min'):
            where_clauses.append('t.valor >= ?')
            params.append(float(filtros['valor_min']))
        
        if filtros.get('valor_max'):
            where_clauses.append('t.valor <= ?')
            params.append(float(filtros['valor_max']))
        
        if filtros.get('tipo_parcela'):
            if filtros['tipo_parcela'] == 'unica':
                where_clauses.append('t.parcela_total = 1')
            elif filtros['tipo_parcela'] == 'parcelado':
                where_clauses.append('t.parcela_total > 1')
            elif filtros['tipo_parcela'] == 'primeira':
                where_clauses.append('t.parcela_atual = 1 AND t.parcela_total > 1')
            elif filtros['tipo_parcela'] == 'ultima':
                where_clauses.append('t.parcela_atual = t.parcela_total AND t.parcela_total > 1')
        
        if filtros.get('origem'):
            where_clauses.append('t.origem_importacao = ?')
            params.append(filtros['origem'])
        
        if filtros.get('municipio'):
            where_clauses.append('t.municipio = ?')
            params.append(filtros['municipio'])
        
        # FILTRO DE BUSCA TEXTUAL
        if filtros.get('busca'):
            busca_termo = f"%{filtros['busca']}%"
            busca_clause = '''(
                t.titulo LIKE ? OR 
                t.numero_documento LIKE ? OR 
                cf.nome LIKE ? OR 
                cc.mascara_cc LIKE ? OR 
                pf.nome LIKE ? OR
                t.observacao LIKE ?
            )'''
            where_clauses.append(busca_clause)
            params.extend([busca_termo] * 6)  # 6 campos de busca
            print(f"🔍 DEBUG: Filtro de busca aplicado: '{filtros['busca']}'")
        
        # Construir query final
        if where_clauses:
            query = base_query + ' WHERE ' + ' AND '.join(where_clauses)
        else:
            query = base_query
        
        # Ordenação
        order_by = self._construir_ordenacao(filtros)
        query += f' ORDER BY {order_by}'
        
        return query, params
    
    def _calcular_periodo(self, periodo: str, filtros: Dict[str, Any]) -> tuple:
        """Calcula datas de início e fim baseado no período selecionado"""
        hoje = datetime.now()
        
        if periodo == 'mes_atual':
            inicio = hoje.replace(day=1)
            if hoje.month == 12:
                fim = hoje.replace(year=hoje.year + 1, month=1, day=1) - timedelta(days=1)
            else:
                fim = hoje.replace(month=hoje.month + 1, day=1) - timedelta(days=1)
        
        elif periodo == 'trimestre_atual':
            trimestre = (hoje.month - 1) // 3 + 1
            inicio = hoje.replace(month=(trimestre - 1) * 3 + 1, day=1)
            if trimestre == 4:
                fim = hoje.replace(year=hoje.year + 1, month=1, day=1) - timedelta(days=1)
            else:
                fim = hoje.replace(month=trimestre * 3 + 1, day=1) - timedelta(days=1)
        
        elif periodo == 'ano_atual':
            inicio = hoje.replace(month=1, day=1)
            fim = hoje.replace(month=12, day=31)
        
        elif periodo == 'ultimo_mes':
            if hoje.month == 1:
                inicio = hoje.replace(year=hoje.year - 1, month=12, day=1)
                fim = hoje.replace(day=1) - timedelta(days=1)
            else:
                inicio = hoje.replace(month=hoje.month - 1, day=1)
                fim = hoje.replace(day=1) - timedelta(days=1)
        
        elif periodo == 'ultimos_3_meses':
            inicio = (hoje - timedelta(days=90)).replace(day=1)
            fim = hoje
        
        elif periodo == 'custom':
            inicio = datetime.strptime(filtros.get('data_inicio', ''), '%Y-%m-%d') if filtros.get('data_inicio') else None
            fim = datetime.strptime(filtros.get('data_fim', ''), '%Y-%m-%d') if filtros.get('data_fim') else None
        
        else:
            return None, None
        
        return inicio.strftime('%Y-%m-%d') if inicio else None, fim.strftime('%Y-%m-%d') if fim else None
    
    def _parse_faixa_valor(self, faixa: str) -> tuple:
        """Parse faixa de valor como '1000-5000' para (1000, 5000)"""
        if faixa.endswith('+'):
            return float(faixa[:-1]), None
        
        if '-' in faixa:
            min_val, max_val = faixa.split('-')
            return float(min_val), float(max_val)
        
        return None, None
    
    def _construir_ordenacao(self, filtros: Dict[str, Any]) -> str:
        """Constrói cláusula ORDER BY"""
        campo = filtros.get('sort_by', 'data_vencimento')
        direcao = filtros.get('sort_direction', 'desc').upper()
        
        # Mapear campos para nomes reais na query
        mapeamento_campos = {
            'data_vencimento': 't.data_vencimento',
            'data_lancamento': 't.data_lancamento',
            'valor': 't.valor',
            'titulo': 't.titulo',
            'tipo': 't.tipo',
            'status_pagamento': 't.status_pagamento',
            'empresa': 'e.nome',
            'fornecedor': 'cf.nome',
            'centro_custo': 'cc.mascara_cc',
            'plano_financeiro': 'pf.codigo'
        }
        
        campo_real = mapeamento_campos.get(campo, 't.data_vencimento')
        return f'{campo_real} {direcao}'


# ==========================================
# FUNÇÕES AUXILIARES PARA FLASK
# ==========================================

def get_filtros_api():
    """Função para ser usada na rota Flask"""
    filtros_manager = TransacoesFiltros()
    return filtros_manager.get_filtros_disponiveis()

def executar_query_filtrada(filtros: Dict[str, Any], page: int = 1, per_page: int = 50) -> Dict[str, Any]:
    """Executa query com filtros e retorna resultado paginado"""
    print(f"🔍 DEBUG executar_query_filtrada - Filtros recebidos: {filtros}")
    print(f"📊 DEBUG - Página: {page}, Per page: {per_page}")
    
    filtros_manager = TransacoesFiltros()
    
    conn = filtros_manager.get_connection()
    cursor = conn.cursor()
    
    try:
        # Construir query
        query, params = filtros_manager.construir_query_filtrada(filtros)
        print(f"🔍 DEBUG - Query construída: {query}")
        print(f"🔍 DEBUG - Parâmetros: {params}")
        
        # Contar total (sem paginação) - método direto
        base_from = query[query.find('FROM'):]
        base_from = base_from.split('ORDER BY')[0]  # Remove ORDER BY
        count_query = f'SELECT COUNT(DISTINCT t.id) as total {base_from}'
        
        cursor.execute(count_query, params)
        total = cursor.fetchone()[0]
        
        # Aplicar paginação
        offset = (page - 1) * per_page
        query += f' LIMIT {per_page} OFFSET {offset}'
        
        # Executar query principal
        cursor.execute(query, params)
        columns = [description[0] for description in cursor.description]
        rows = cursor.fetchall()
        
        # Formatear resultados
        transacoes = []
        for row in rows:
            transacao = dict(zip(columns, row))
            transacoes.append(transacao)
        
        # Calcular KPIs dos dados filtrados
        kpis = calcular_kpis_filtrados(cursor, filtros_manager, filtros)
        
        return {
            'transacoes': transacoes,
            'total': total,
            'page': page,
            'per_page': per_page,
            'total_pages': (total + per_page - 1) // per_page,
            'kpis': kpis
        }
        
    finally:
        conn.close()

def calcular_kpis_filtrados(cursor, filtros_manager, filtros: Dict[str, Any]) -> Dict[str, Any]:
    """Calcula KPIs baseado nos filtros aplicados"""
    
    # Usar mesma query de filtros, mas agregando
    base_query, params = filtros_manager.construir_query_filtrada(filtros)
    
    # Query para KPIs
    kpi_query = '''
        SELECT 
            SUM(CASE WHEN t.tipo = 'Entrada' THEN t.valor ELSE 0 END) as receitas,
            SUM(CASE WHEN t.tipo = 'Saída' THEN t.valor ELSE 0 END) as despesas,
            COUNT(CASE WHEN t.tipo = 'Entrada' THEN 1 END) as count_receitas,
            COUNT(CASE WHEN t.tipo = 'Saída' THEN 1 END) as count_despesas,
            COUNT(*) as total_transacoes,
            AVG(t.valor) as valor_medio,
            MIN(t.data_vencimento) as data_min,
            MAX(t.data_vencimento) as data_max
        FROM (''' + base_query + ''') t
    '''
    
    cursor.execute(kpi_query, params)
    result = cursor.fetchone()
    
    if result:
        receitas, despesas, count_receitas, count_despesas, total, valor_medio, data_min, data_max = result
        
        return {
            'receitas': float(receitas or 0),
            'despesas': float(despesas or 0),
            'saldo': float((receitas or 0) - (despesas or 0)),
            'count_receitas': int(count_receitas or 0),
            'count_despesas': int(count_despesas or 0),
            'total_transacoes': int(total or 0),
            'valor_medio': float(valor_medio or 0),
            'periodo_dados': {
                'inicio': data_min,
                'fim': data_max
            }
        }
    
    return {
        'receitas': 0.0,
        'despesas': 0.0,
        'saldo': 0.0,
        'count_receitas': 0,
        'count_despesas': 0,
        'total_transacoes': 0,
        'valor_medio': 0.0,
        'periodo_dados': {'inicio': None, 'fim': None}
    }

# ==========================================
# TESTE DA API
# ==========================================

if __name__ == "__main__":
    # Teste básico
    print("🧪 TESTANDO API DE FILTROS")
    print("=" * 50)
    
    # Teste 1: Filtros disponíveis
    filtros_disponiveis = get_filtros_api()
    print(f"✅ Filtros carregados: {len(filtros_disponiveis)} categorias")
    
    # Teste 2: Query com filtros
    filtros_teste = {
        'tipo': 'Saída',
        'status_pagamento': 'Realizado',
        'periodo': 'todos'
    }
    
    resultado = executar_query_filtrada(filtros_teste, page=1, per_page=5)
    print(f"✅ Query executada: {resultado['total']} transações encontradas")
    print(f"📊 KPIs: R$ {resultado['kpis']['despesas']:,.2f} em despesas")
    
    print("\n🎉 API de filtros funcionando corretamente!")