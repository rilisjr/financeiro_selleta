"""
API TRANSAÇÃO EDIÇÃO
APIs específicas para edição, baixa e manipulação de transações
Versão: 1.0
"""

import sqlite3
import json
from datetime import datetime
from flask import session

def get_db_connection():
    """Retorna conexão com o banco de dados"""
    conn = sqlite3.connect('selleta_main.db')
    conn.row_factory = sqlite3.Row
    return conn

def log_auditoria(transacao_id, acao, dados_anteriores=None, dados_novos=None, observacoes=None):
    """
    Registra ação na auditoria
    """
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        usuario_id = session.get('user_id')
        ip_origem = "127.0.0.1"  # TODO: pegar IP real
        
        cursor.execute("""
            INSERT INTO auditoria_transacoes 
            (transacao_id, usuario_id, acao, dados_anteriores, dados_novos, ip_origem, observacoes)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (
            transacao_id,
            usuario_id,
            acao,
            json.dumps(dados_anteriores) if dados_anteriores else None,
            json.dumps(dados_novos) if dados_novos else None,
            ip_origem,
            observacoes
        ))
        
        conn.commit()
        conn.close()
        
    except Exception as e:
        print(f"Erro ao registrar auditoria: {str(e)}")

def verificar_permissao_admin():
    """
    Verifica se o usuário tem permissão de administrador
    """
    try:
        user_id = session.get('user_id')
        if not user_id:
            return False
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("SELECT tipo_usuario FROM usuarios WHERE id = ?", (user_id,))
        result = cursor.fetchone()
        conn.close()
        
        return result and result['tipo_usuario'] == 'adm'
        
    except Exception as e:
        print(f"Erro ao verificar permissão: {str(e)}")
        return False

def get_transacao_detalhes(transacao_id):
    """
    Retorna dados completos de uma transação
    """
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Query com JOIN para pegar nomes relacionados
        cursor.execute("""
            SELECT 
                t.*,
                cf.nome as fornecedor_nome,
                e.nome as empresa_nome,
                pf.codigo as plano_codigo,
                pf.nome as plano_nome,
                cc.mascara_cc as centro_codigo,
                cc.centro_custo_original as centro_nome,
                cb.banco as conta_banco,
                cb.conta_corrente as conta_numero
            FROM transacoes t
            LEFT JOIN clientes_fornecedores cf ON t.cliente_fornecedor_id = cf.id
            LEFT JOIN empresas e ON t.empresa_id = e.id
            LEFT JOIN plano_financeiro pf ON t.plano_financeiro_id = pf.id
            LEFT JOIN centros_custo cc ON t.centro_custo_id = cc.id
            LEFT JOIN conta_bancaria cb ON t.conta_bancaria_id = cb.id
            WHERE t.id = ?
        """, (transacao_id,))
        
        transacao = cursor.fetchone()
        conn.close()
        
        if transacao:
            # Converter Row para dict
            transacao_dict = dict(transacao)
            
            # Formatar datas
            if transacao_dict.get('data_vencimento'):
                transacao_dict['data_vencimento'] = transacao_dict['data_vencimento'].split()[0]  # Apenas data
            
            if transacao_dict.get('data_pagamento'):
                transacao_dict['data_pagamento'] = transacao_dict['data_pagamento'].split()[0]
            
            return {
                'success': True,
                'data': transacao_dict
            }
        else:
            return {
                'success': False,
                'message': 'Transação não encontrada'
            }
            
    except Exception as e:
        return {
            'success': False,
            'message': f'Erro ao buscar transação: {str(e)}'
        }

def atualizar_transacao(transacao_id, dados):
    """
    Atualiza uma transação existente
    """
    try:
        # Verificar permissão de admin
        if not verificar_permissao_admin():
            return {
                'success': False,
                'message': 'Apenas administradores podem editar transações'
            }
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Buscar dados atuais para auditoria
        cursor.execute("SELECT * FROM transacoes WHERE id = ?", (transacao_id,))
        dados_anteriores = dict(cursor.fetchone())
        
        # Preparar campos para atualização
        campos_atualizacao = []
        valores = []
        
        campos_permitidos = [
            'titulo', 'numero_documento', 'cliente_fornecedor_id', 'empresa_id',
            'plano_financeiro_id', 'centro_custo_id', 'tipo', 'valor',
            'data_vencimento', 'status_negociacao', 'status_pagamento', 'observacao'
        ]
        
        for campo in campos_permitidos:
            if campo in dados:
                campos_atualizacao.append(f"{campo} = ?")
                valores.append(dados[campo])
        
        # Adicionar campos de controle
        campos_atualizacao.append("data_ultima_alteracao = ?")
        valores.append(datetime.now().isoformat())
        
        valores.append(transacao_id)  # Para WHERE
        
        # Executar atualização
        query = f"""
            UPDATE transacoes 
            SET {', '.join(campos_atualizacao)}
            WHERE id = ?
        """
        
        cursor.execute(query, valores)
        
        # Buscar dados atualizados
        cursor.execute("SELECT * FROM transacoes WHERE id = ?", (transacao_id,))
        dados_novos = dict(cursor.fetchone())
        
        conn.commit()
        conn.close()
        
        # Registrar auditoria
        log_auditoria(
            transacao_id, 
            'EDICAO', 
            dados_anteriores, 
            dados_novos,
            'Transação editada via formulário'
        )
        
        return {
            'success': True,
            'message': 'Transação atualizada com sucesso',
            'data': dados_novos
        }
        
    except Exception as e:
        return {
            'success': False,
            'message': f'Erro ao atualizar transação: {str(e)}'
        }

def realizar_baixa_transacao(transacao_id, dados_baixa):
    """
    Realiza baixa de uma transação
    """
    try:
        # Verificar permissão de admin
        if not verificar_permissao_admin():
            return {
                'success': False,
                'message': 'Apenas administradores podem realizar baixas'
            }
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Buscar dados da transação original
        cursor.execute("SELECT * FROM transacoes WHERE id = ?", (transacao_id,))
        transacao_original = dict(cursor.fetchone())
        
        if not transacao_original:
            return {
                'success': False,
                'message': 'Transação não encontrada'
            }
        
        valor_original = float(transacao_original['valor'])
        valor_pago = float(dados_baixa['valor_pago'])
        usuario_id = session.get('user_id')
        
        # Verificar se é baixa parcial
        baixa_parcial = dados_baixa.get('baixa_parcial', False)
        
        if baixa_parcial and valor_pago < valor_original:
            # BAIXA PARCIAL - Criar clone
            valor_restante = valor_original - valor_pago
            
            # 1. Criar transação clone com valor pago (status: Realizado)
            cursor.execute("""
                INSERT INTO transacoes (
                    titulo, numero_documento, cliente_fornecedor_id, empresa_id,
                    plano_financeiro_id, centro_custo_id, tipo, valor,
                    data_vencimento, data_lancamento, status_negociacao,
                    status_pagamento, observacao, parcela_atual, parcela_total,
                    origem_importacao, transacao_pai_id, valor_pago,
                    data_pagamento, observacao_baixa, usuario_baixa,
                    data_ultima_alteracao
                ) VALUES (
                    ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Realizado', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
                )
            """, (
                f"{transacao_original['titulo']} (Parcial)",
                transacao_original.get('numero_documento'),
                transacao_original.get('cliente_fornecedor_id'),
                transacao_original.get('empresa_id'),
                transacao_original.get('plano_financeiro_id'),
                transacao_original.get('centro_custo_id'),
                transacao_original.get('tipo'),
                valor_pago,
                transacao_original.get('data_vencimento'),
                transacao_original.get('data_lancamento'),
                transacao_original.get('status_negociacao'),
                f"{transacao_original.get('observacao', '')} - Baixa parcial",
                transacao_original.get('parcela_atual'),
                transacao_original.get('parcela_total'),
                transacao_original.get('origem_importacao', 'MANUAL'),
                transacao_id,  # ID da transação pai
                valor_pago,
                dados_baixa['data_pagamento'],
                dados_baixa.get('observacao_baixa', ''),
                usuario_id,
                datetime.now().isoformat()
            ))
            
            clone_id = cursor.lastrowid
            
            # 2. Atualizar transação original com valor restante
            cursor.execute("""
                UPDATE transacoes 
                SET valor = ?, 
                    valor_entrada = ?, 
                    valor_saida = ?,
                    observacao = ?,
                    data_ultima_alteracao = ?
                WHERE id = ?
            """, (
                valor_restante,
                valor_restante if transacao_original.get('tipo') == 'Entrada' else 0,
                valor_restante if transacao_original.get('tipo') == 'Saída' else 0,
                f"{transacao_original.get('observacao', '')} - Valor ajustado após baixa parcial",
                datetime.now().isoformat(),
                transacao_id
            ))
            
            # Registrar auditoria
            log_auditoria(
                transacao_id,
                'BAIXA_PARCIAL',
                transacao_original,
                {
                    'valor_original': valor_original,
                    'valor_pago': valor_pago,
                    'valor_restante': valor_restante,
                    'clone_id': clone_id
                },
                f'Baixa parcial realizada. Clone criado: {clone_id}'
            )
            
            message = f'Baixa parcial realizada. Transação clonada (ID: {clone_id}) com valor pago R$ {valor_pago:.2f}'
            
        else:
            # BAIXA TOTAL - Atualizar status
            cursor.execute("""
                UPDATE transacoes 
                SET status_pagamento = 'Realizado',
                    valor_pago = ?,
                    data_pagamento = ?,
                    observacao_baixa = ?,
                    conta_bancaria_id = ?,
                    usuario_baixa = ?,
                    data_ultima_alteracao = ?
                WHERE id = ?
            """, (
                valor_pago,
                dados_baixa['data_pagamento'],
                dados_baixa.get('observacao_baixa', ''),
                dados_baixa.get('conta_bancaria_id'),
                usuario_id,
                datetime.now().isoformat(),
                transacao_id
            ))
            
            # Registrar auditoria
            log_auditoria(
                transacao_id,
                'BAIXA_TOTAL',
                transacao_original,
                dados_baixa,
                'Baixa total realizada'
            )
            
            message = f'Baixa realizada com sucesso. Valor: R$ {valor_pago:.2f}'
        
        conn.commit()
        conn.close()
        
        return {
            'success': True,
            'message': message,
            'data': {
                'transacao_id': transacao_id,
                'valor_pago': valor_pago,
                'baixa_parcial': baixa_parcial
            }
        }
        
    except Exception as e:
        return {
            'success': False,
            'message': f'Erro ao realizar baixa: {str(e)}'
        }

def criar_nova_transacao(dados):
    """
    Cria uma nova transação
    """
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        usuario_id = session.get('user_id')
        
        # Calcular valor_entrada e valor_saida baseado no tipo
        valor = float(dados['valor'])
        valor_entrada = valor if dados['tipo'] == 'Entrada' else 0
        valor_saida = valor if dados['tipo'] == 'Saída' else 0
        
        cursor.execute("""
            INSERT INTO transacoes (
                titulo, numero_documento, cliente_fornecedor_id, empresa_id,
                plano_financeiro_id, centro_custo_id, tipo, valor,
                data_vencimento, data_lancamento, status_negociacao,
                status_pagamento, observacao, origem_importacao, data_ultima_alteracao
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'MANUAL', ?)
        """, (
            dados['titulo'],
            dados.get('numero_documento', ''),
            dados.get('cliente_fornecedor_id'),
            dados.get('empresa_id'),
            dados.get('plano_financeiro_id'),
            dados.get('centro_custo_id'),
            dados['tipo'],
            valor,
            dados['data_vencimento'],
            datetime.now().date().isoformat(),
            dados.get('status_negociacao', 'Aprovado'),
            dados.get('status_pagamento', 'A Realizar'),
            dados.get('observacao', ''),
            datetime.now().isoformat()
        ))
        
        transacao_id = cursor.lastrowid
        
        # Buscar dados criados
        cursor.execute("SELECT * FROM transacoes WHERE id = ?", (transacao_id,))
        dados_criados = dict(cursor.fetchone())
        
        conn.commit()
        conn.close()
        
        # Registrar auditoria
        log_auditoria(
            transacao_id,
            'CRIACAO',
            None,
            dados_criados,
            'Transação criada via formulário'
        )
        
        return {
            'success': True,
            'message': 'Transação criada com sucesso',
            'data': dados_criados
        }
        
    except Exception as e:
        return {
            'success': False,
            'message': f'Erro ao criar transação: {str(e)}'
        }

def buscar_transacoes_edicao(filtros):
    """
    Busca transações para edição (com filtros mais específicos)
    """
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Query base
        query = """
            SELECT 
                t.id,
                t.titulo,
                t.numero_documento,
                t.valor,
                t.tipo,
                t.status_pagamento,
                t.data_vencimento,
                cf.nome as fornecedor_nome,
                e.nome as empresa_nome
            FROM transacoes t
            LEFT JOIN clientes_fornecedores cf ON t.cliente_fornecedor_id = cf.id
            LEFT JOIN empresas e ON t.empresa_id = e.id
            WHERE 1=1
        """
        
        params = []
        
        # Aplicar filtros
        if filtros.get('id'):
            query += " AND t.id = ?"
            params.append(int(filtros['id']))
            
        if filtros.get('titulo'):
            query += " AND t.titulo LIKE ?"
            params.append(f"%{filtros['titulo']}%")
            
        if filtros.get('fornecedor'):
            query += " AND cf.nome LIKE ?"
            params.append(f"%{filtros['fornecedor']}%")
            
        if filtros.get('valor'):
            query += " AND t.valor = ?"
            params.append(float(filtros['valor']))
        
        # Ordenar por data mais recente
        query += " ORDER BY t.data_vencimento DESC"
        
        # Limitar resultados
        limite = filtros.get('limite', 20)
        query += f" LIMIT {limite}"
        
        cursor.execute(query, params)
        resultados = [dict(row) for row in cursor.fetchall()]
        
        conn.close()
        
        return {
            'success': True,
            'data': resultados,
            'total': len(resultados)
        }
        
    except Exception as e:
        return {
            'success': False,
            'message': f'Erro na busca: {str(e)}'
        }

def get_historico_transacao(transacao_id):
    """
    Retorna histórico de alterações de uma transação
    """
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT 
                a.*,
                u.username as usuario_nome
            FROM auditoria_transacoes a
            LEFT JOIN usuarios u ON a.usuario_id = u.id
            WHERE a.transacao_id = ?
            ORDER BY a.data_acao DESC
        """, (transacao_id,))
        
        historico = [dict(row) for row in cursor.fetchall()]
        conn.close()
        
        return {
            'success': True,
            'data': historico
        }
        
    except Exception as e:
        return {
            'success': False,
            'message': f'Erro ao buscar histórico: {str(e)}'
        }

def estornar_baixa(transacao_id):
    """
    Estorna uma baixa realizada (apenas para ADM)
    """
    try:
        # Verificar permissão de admin
        if not verificar_permissao_admin():
            return {
                'success': False,
                'message': 'Apenas administradores podem estornar baixas'
            }
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Buscar transação
        cursor.execute("SELECT * FROM transacoes WHERE id = ?", (transacao_id,))
        transacao = dict(cursor.fetchone())
        
        if transacao['status_pagamento'] != 'Realizado':
            return {
                'success': False,
                'message': 'Transação não está com status Realizado'
            }
        
        dados_anteriores = transacao.copy()
        
        # Resetar campos de baixa
        cursor.execute("""
            UPDATE transacoes 
            SET status_pagamento = 'A Realizar',
                valor_pago = NULL,
                data_pagamento = NULL,
                observacao_baixa = NULL,
                conta_bancaria_id = NULL,
                usuario_baixa = NULL,
                data_ultima_alteracao = ?
            WHERE id = ?
        """, (datetime.now().isoformat(), transacao_id))
        
        # Se existir clone (baixa parcial), remover
        cursor.execute("DELETE FROM transacoes WHERE transacao_pai_id = ?", (transacao_id,))
        clones_removidos = cursor.rowcount
        
        conn.commit()
        conn.close()
        
        # Registrar auditoria
        log_auditoria(
            transacao_id,
            'ESTORNO',
            dados_anteriores,
            {'status_pagamento': 'A Realizar'},
            f'Estorno realizado. Clones removidos: {clones_removidos}'
        )
        
        return {
            'success': True,
            'message': 'Baixa estornada com sucesso',
            'data': {
                'transacao_id': transacao_id,
                'clones_removidos': clones_removidos
            }
        }
        
    except Exception as e:
        return {
            'success': False,
            'message': f'Erro ao estornar baixa: {str(e)}'
        }