# ====================================
# Filtros Avançados - Sistema Selleta
# Lógicas especializadas para filtros complexos
# ====================================

from datetime import datetime, date, timedelta
import sqlite3


class FiltrosAvancados:
    """
    Classe para gerenciar filtros complexos e especializados
    do sistema de transações.
    """
    
    def __init__(self, db_path='selleta_main.db'):
        self.db_path = db_path
    
    def aplicar_filtro_previsao(self, query_base, params_base):
        """
        Filtro PREVISÃO: Todos lançamentos que não foram ainda realizados
        
        Critérios:
        - status_pagamento != 'Realizado'
        - Inclui: 'A realizar', 'Á realizar', NULL, outros
        """
        query_filtrada = query_base + """
            AND (t.status_pagamento != 'Realizado' 
                 OR t.status_pagamento IS NULL 
                 OR t.status_pagamento = 'A realizar'
                 OR t.status_pagamento = 'Á realizar')
        """
        
        return query_filtrada, params_base
    
    def aplicar_filtro_consolidado(self, query_base, params_base):
        """
        Filtro CONSOLIDADO: Todos lançamentos já realizados
        
        Critérios:
        - status_pagamento = 'Realizado'
        """
        query_filtrada = query_base + """
            AND t.status_pagamento = 'Realizado'
        """
        
        return query_filtrada, params_base
    
    def aplicar_filtro_atrasado(self, query_base, params_base):
        """
        Filtro ATRASADO: Previstos com data < hoje E ainda não pagos
        
        Critérios:
        - data_vencimento < data_atual
        - status_pagamento != 'Realizado'
        """
        hoje = date.today().strftime('%Y-%m-%d')
        
        query_filtrada = query_base + """
            AND t.data_vencimento < ?
            AND (t.status_pagamento != 'Realizado' 
                 OR t.status_pagamento IS NULL 
                 OR t.status_pagamento = 'A realizar'
                 OR t.status_pagamento = 'Á realizar')
        """
        
        params_filtrados = params_base + [hoje]
        
        return query_filtrada, params_filtrados
    
    def contar_registros_por_filtro(self):
        """
        Conta registros para cada tipo de filtro
        Retorna dicionário com contagens
        """
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Query base para contagem
            query_base = """
                SELECT COUNT(*) as total
                FROM transacoes t
                WHERE 1=1
            """
            
            hoje = date.today().strftime('%Y-%m-%d')
            
            # Contar Previsão
            cursor.execute(query_base + """
                AND (t.status_pagamento != 'Realizado' 
                     OR t.status_pagamento IS NULL 
                     OR t.status_pagamento = 'A realizar'
                     OR t.status_pagamento = 'Á realizar')
            """)
            previsao_count = cursor.fetchone()[0]
            
            # Contar Consolidado
            cursor.execute(query_base + """
                AND t.status_pagamento = 'Realizado'
            """)
            consolidado_count = cursor.fetchone()[0]
            
            # Contar Atrasado
            cursor.execute(query_base + """
                AND t.data_vencimento < ?
                AND (t.status_pagamento != 'Realizado' 
                     OR t.status_pagamento IS NULL 
                     OR t.status_pagamento = 'A realizar'
                     OR t.status_pagamento = 'Á realizar')
            """, [hoje])
            atrasado_count = cursor.fetchone()[0]
            
            conn.close()
            
            return {
                'previsao': previsao_count,
                'consolidado': consolidado_count,
                'atrasado': atrasado_count,
                'total': previsao_count + consolidado_count
            }
            
        except Exception as e:
            print(f"Erro ao contar registros: {e}")
            return {
                'previsao': 0,
                'consolidado': 0,
                'atrasado': 0,
                'total': 0
            }
    
    def calcular_metricas_por_filtro(self, tipo_filtro='previsao'):
        """
        Calcula métricas financeiras específicas por tipo de filtro
        
        Args:
            tipo_filtro: 'previsao', 'consolidado', 'atrasado'
        """
        try:
            conn = sqlite3.connect(self.db_path)
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            
            # Query base para métricas
            query_base = """
                SELECT 
                    SUM(CASE WHEN t.tipo = 'Receita' THEN t.valor ELSE 0 END) as receitas,
                    SUM(CASE WHEN t.tipo = 'Despesa' THEN t.valor ELSE 0 END) as despesas,
                    COUNT(CASE WHEN t.tipo = 'Receita' THEN 1 END) as count_receitas,
                    COUNT(CASE WHEN t.tipo = 'Despesa' THEN 1 END) as count_despesas,
                    COUNT(*) as total_transacoes,
                    AVG(t.valor) as valor_medio
                FROM transacoes t
                WHERE 1=1
            """
            
            # Aplicar filtro específico
            if tipo_filtro == 'previsao':
                query, params = self.aplicar_filtro_previsao(query_base, [])
            elif tipo_filtro == 'consolidado':
                query, params = self.aplicar_filtro_consolidado(query_base, [])
            elif tipo_filtro == 'atrasado':
                query, params = self.aplicar_filtro_atrasado(query_base, [])
            else:
                query, params = query_base, []
            
            cursor.execute(query, params)
            resultado = cursor.fetchone()
            
            conn.close()
            
            if resultado:
                receitas = resultado['receitas'] or 0
                despesas = resultado['despesas'] or 0
                saldo = receitas - despesas
                
                return {
                    'receitas': receitas,
                    'despesas': despesas,
                    'saldo': saldo,
                    'count_receitas': resultado['count_receitas'] or 0,
                    'count_despesas': resultado['count_despesas'] or 0,
                    'total_transacoes': resultado['total_transacoes'] or 0,
                    'valor_medio': resultado['valor_medio'] or 0
                }
            
            return {
                'receitas': 0, 'despesas': 0, 'saldo': 0,
                'count_receitas': 0, 'count_despesas': 0,
                'total_transacoes': 0, 'valor_medio': 0
            }
            
        except Exception as e:
            print(f"Erro ao calcular métricas: {e}")
            return {
                'receitas': 0, 'despesas': 0, 'saldo': 0,
                'count_receitas': 0, 'count_despesas': 0,
                'total_transacoes': 0, 'valor_medio': 0
            }
    
    def filtrar_por_periodo_e_view(self, data_inicio=None, data_fim=None, view_type='previsao'):
        """
        Combina filtros de período com view type
        
        Args:
            data_inicio: Data início no formato 'YYYY-MM-DD'
            data_fim: Data fim no formato 'YYYY-MM-DD'
            view_type: 'previsao', 'consolidado', 'atrasado'
        """
        try:
            conn = sqlite3.connect(self.db_path)
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            
            # Query base com JOINs
            query_base = """
                SELECT t.*, 
                       f.nome as fornecedor_nome,
                       cc.mascara_cc as centro_custo_nome,
                       e.nome as empresa_nome,
                       pf.codigo as plano_financeiro_codigo,
                       pf.nome as plano_financeiro_nome,
                       u.username as usuario_nome
                FROM transacoes t
                LEFT JOIN fornecedores f ON t.cliente_fornecedor_id = f.id
                LEFT JOIN centros_custo cc ON t.centro_custo_id = cc.id
                LEFT JOIN empresas e ON t.empresa_id = e.id
                LEFT JOIN plano_financeiro pf ON t.plano_financeiro_id = pf.id
                LEFT JOIN usuarios u ON t.usuario_id = u.id
                WHERE 1=1
            """
            
            params = []
            
            # Aplicar filtro de período
            if data_inicio:
                query_base += " AND t.data_vencimento >= ?"
                params.append(data_inicio)
            
            if data_fim:
                query_base += " AND t.data_vencimento <= ?"
                params.append(data_fim)
            
            # Aplicar filtro de view
            if view_type == 'previsao':
                query_final, params_final = self.aplicar_filtro_previsao(query_base, params)
            elif view_type == 'consolidado':
                query_final, params_final = self.aplicar_filtro_consolidado(query_base, params)
            elif view_type == 'atrasado':
                query_final, params_final = self.aplicar_filtro_atrasado(query_base, params)
            else:
                query_final, params_final = query_base, params
            
            # Ordenar por data de vencimento
            query_final += " ORDER BY t.data_vencimento DESC, t.id DESC"
            
            cursor.execute(query_final, params_final)
            resultados = cursor.fetchall()
            
            conn.close()
            
            # Converter para lista de dicionários
            transacoes = []
            for row in resultados:
                transacoes.append(dict(row))
            
            return transacoes
            
        except Exception as e:
            print(f"Erro ao filtrar por período e view: {e}")
            return []


# Funções utilitárias para uso direto
def get_status_counts():
    """Função utilitária para obter contagens rapidamente"""
    filtros = FiltrosAvancados()
    return filtros.contar_registros_por_filtro()


def get_view_metrics(view_type):
    """Função utilitária para obter métricas por view"""
    filtros = FiltrosAvancados()
    return filtros.calcular_metricas_por_filtro(view_type)


def aplicar_filtro_smart(query_base, params_base, view_type):
    """
    Função utilitária para aplicar filtros smart
    
    Args:
        query_base: Query SQL base
        params_base: Parâmetros da query base
        view_type: 'previsao', 'consolidado', 'atrasado'
    
    Returns:
        tuple: (query_filtrada, params_filtrados)
    """
    filtros = FiltrosAvancados()
    
    if view_type == 'previsao':
        return filtros.aplicar_filtro_previsao(query_base, params_base)
    elif view_type == 'consolidado':
        return filtros.aplicar_filtro_consolidado(query_base, params_base)
    elif view_type == 'atrasado':
        return filtros.aplicar_filtro_atrasado(query_base, params_base)
    else:
        return query_base, params_base