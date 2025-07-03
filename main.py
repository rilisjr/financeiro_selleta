from flask import Flask, render_template, request, redirect, url_for, flash, session, jsonify
from werkzeug.security import check_password_hash, generate_password_hash
import sqlite3
import os
from datetime import datetime, date, timedelta
import logging
from filtros_avancados import FiltrosAvancados, aplicar_filtro_smart, get_status_counts, get_view_metrics
from rotas_adm import admin_bp
from api_filtros_transacoes import get_filtros_api, executar_query_filtrada

# Configurar logger
logger = logging.getLogger(__name__)

app = Flask(__name__)
app.secret_key = os.urandom(24)

# Registrar Blueprint administrativo
app.register_blueprint(admin_bp)

# Verifica se o banco de dados existe, se não, cria
db_path = 'selleta_main.db'
if not os.path.exists(db_path):
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # Crie a tabela de usuários
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS usuarios (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL,
            senha TEXT NOT NULL
        )
    ''')

    # Crie a tabela de transações
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS transacoes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            origem TEXT,
            descricao TEXT,
            tipo TEXT CHECK (tipo IN ('Fixo', 'Variável')),
            valor REAL,
            modelo TEXT CHECK (modelo IN ('Renda', 'Custo')),
            data DATE NOT NULL
        )
    ''')

@app.route('/')

#página principal
def index():
    return render_template('login.html')

@app.route('/login', methods=['POST'])
def login():
    username = request.form['username']
    password = request.form['password']

    # Conecta ao banco de dados SQLite
    conn = sqlite3.connect('selleta_main.db')
    cursor = conn.cursor()

    # Obtém o hash da senha do banco de dados
    cursor.execute('SELECT * FROM usuarios WHERE username=?', (username,))
    user = cursor.fetchone()

    # Fecha a conexão
    conn.close()

    if user and check_password_hash(user[2], password):
        # Lógica de autenticação bem-sucedida, pode ser expandida conforme necessário
        session['user_id'] = user[0]
        return redirect(url_for('dashboard'))
    else:
        # Lógica de autenticação falhou, redireciona de volta para a página de login
        flash('error', 'Usuário ou Senha Inválidos')
        return redirect(url_for('index'))

@app.route('/cadastro', methods=['GET','POST'])
def cadastro():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        confirm_password = request.form['confirmPassword']

        # Verifica se as senhas coincidem
        if password != confirm_password:
            flash('error', 'As senhas não coincidem. Por favor, insira senhas iguais.')
            return redirect(url_for('cadastro'))

        # Hash da senha antes de armazenar no banco de dados
        hashed_password = generate_password_hash(password)

        try:
            # Conectar ao banco de dados SQLite
            conn = sqlite3.connect('selleta_main.db')
            cursor = conn.cursor()

            # Verifica se o usuário já existe
            cursor.execute("SELECT id FROM usuarios WHERE username = ?", (username,))
            existing_user = cursor.fetchone()

            if existing_user:
                flash('error', 'Este usuário já existe. Por favor, escolha um nome de usuário diferente.')
                return redirect(url_for('cadastro'))

            # Insere o novo usuário no banco de dados
            cursor.execute("INSERT INTO usuarios (username, senha) VALUES (?, ?)", (username, hashed_password))
            conn.commit()

            flash('success', 'Cadastro realizado com sucesso! Faça o login para acessar sua conta.')
            return redirect(url_for('index'))

        except Exception as e:
            flash('error', f"Erro ao cadastrar usuário: {str(e)}")
            return redirect(url_for('cadastro'))

        finally:
            # Fechar a conexão com o banco de dados
            conn.close()

    return render_template('cadastro.html')

@app.route('/dashboard')
def dashboard():
    if 'user_id' not in session:
        flash('error', 'Você não está autenticado.')
        return redirect(url_for('index'))
    
    try:
        # Usando template que estende base.html para consistência de navegação
        return render_template('dashboard_novo_base.html')
        
    except Exception as e:
        flash('error', f"Erro ao carregar dashboard: {str(e)}")
        return redirect(url_for('index'))

@app.route('/gestao_usuarios')
def gestao_usuarios():
    try:
        # Conectar ao banco de dados SQLite
        conn = sqlite3.connect('selleta_main.db')
        cursor = conn.cursor()

        # Consulta para obter todos os usuários
        cursor.execute('SELECT * FROM usuarios')
        users = cursor.fetchall()

        # Fechar a conexão com o banco de dados
        conn.close()

        return render_template('gestao_usuarios.html', users=users)

    except Exception as e:
        # Trate a exceção conforme necessário
        return f"Erro ao carregar usuários: {str(e)}"

@app.route('/excluir_usuario/<int:user_id>', methods=['POST'])
def excluir_usuario(user_id):
    try:
        # Conectar ao banco de dados SQLite
        conn = sqlite3.connect('selleta_main.db')
        cursor = conn.cursor()

        # Verificar se o usuário está excluindo a própria conta
        if 'user_id' in session and session['user_id'] == user_id:
            # Limpar a sessão (logout) se o usuário estiver excluindo sua própria conta
            session.clear()

        # Excluir o usuário com base no ID
        cursor.execute('DELETE FROM usuarios WHERE id=?', (user_id,))

        # Commit e fechar a conexão
        conn.commit()
        conn.close()

        flash('success', 'Usuário excluído com sucesso!')

        # Redirecionar para a página de login se o usuário excluiu sua própria conta
        if 'user_id' not in session:
            return redirect(url_for('index'))
        else:
            return redirect(url_for('gestao_usuarios'))

    except Exception as e:
        flash('error', f"Erro ao excluir usuário: {str(e)}")
        return redirect(url_for('gestao_usuarios'))

@app.route('/obter_dados_transacao/<int:transacao_id>', methods=['GET'])
def obter_dados_transacao(transacao_id):
    # Lógica para obter os dados da transação com base no ID
    conn = sqlite3.connect('selleta_main.db')
    cursor = conn.cursor()

    cursor.execute('SELECT * FROM transacoes WHERE id = ?', (transacao_id,))
    transacao = cursor.fetchone()

    conn.close()

    if transacao:
        # Retorne um JSON com nomes de campo
        return jsonify({
            'origem': transacao[1],
            'descricao': transacao[2],
            'tipo': transacao[3],
            'valor': transacao[4],
            'modelo': transacao[5],
            'data': transacao[6]
        })
    else:
        return jsonify({'error': 'Transação não encontrada'}), 404

@app.route('/adicionar_transacao', methods=['POST'])
def adicionar_transacao():
    transacao_id = request.form.get('transacao_id')

    origem = request.form['origem']
    descricao = request.form['descricao']
    tipo = request.form['tipo']
    valor = request.form['valor']
    modelo = request.form['modelo']
    data = request.form['data']

    try:
        conn = sqlite3.connect('selleta_main.db')
        cursor = conn.cursor()

        if transacao_id:
            # Atualiza a transação existente no banco de dados
            cursor.execute('''
                UPDATE transacoes
                SET origem=?, descricao=?, tipo=?, valor=?, modelo=?, data=?
                WHERE id=?
            ''', (origem, descricao, tipo, valor, modelo, data, transacao_id))
        else:
            # Insere uma nova transação no banco de dados
            cursor.execute('INSERT INTO transacoes (origem, descricao, tipo, valor, modelo, data) VALUES (?, ?, ?, ?, ?, ?)',
                        (origem, descricao, tipo, valor, modelo, data))

        # Commit e fecha a conexão
        conn.commit()
        conn.close()

        # Redireciona de volta para o dashboard
        return redirect(url_for('dashboard'))

    except Exception as e:
        flash('error', f"Erro ao adicionar/editar transação: {str(e)}")
        return redirect(url_for('dashboard'))

@app.route('/excluir_transacao/<int:transacao_id>', methods=['POST'])
def excluir_transacao(transacao_id):
    if 'user_id' not in session:
        flash('error', 'Você não está autenticado.')
        return redirect(url_for('index'))

    try:
        # Conectar ao banco de dados SQLite
        conn = sqlite3.connect('selleta_main.db')
        cursor = conn.cursor()

        # Exclui a transação com base no ID
        cursor.execute('DELETE FROM transacoes WHERE id=?', (transacao_id,))

        # Commit e fecha a conexão
        conn.commit()
        conn.close()

        # Retorna uma resposta JSON, você pode personalizar conforme necessário
        return redirect(url_for('dashboard'))

    except Exception as e:
        flash('error', f"Erro ao excluir transação: {str(e)}")
        return redirect(url_for('dashboard'))

@app.route('/logout', methods=['POST'])
def logout():
    # Limpa a sessão e redireciona para a página de login
    session.clear()
    return redirect(url_for('index'))

# ====== ROTAS DO PLANO FINANCEIRO ======
@app.route('/plano_financeiro')
def plano_financeiro():
    if 'user_id' not in session:
        flash('error', 'Você não está autenticado.')
        return redirect(url_for('index'))
    
    return render_template('plano_financeiro.html')

@app.route('/api/planos_financeiros', methods=['GET'])
def api_listar_planos():
    if 'user_id' not in session:
        return jsonify({'error': 'Não autenticado'}), 401
    
    try:
        conn = sqlite3.connect('selleta_main.db')
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        # Buscar todos os planos ordenados por código
        cursor.execute('''
            SELECT id, codigo, nome, nivel, tipo, plano_pai_id, ativo
            FROM plano_financeiro
            ORDER BY codigo
        ''')
        
        planos = []
        for row in cursor.fetchall():
            planos.append({
                'id': row['id'],
                'codigo': row['codigo'],
                'nome': row['nome'],
                'nivel': row['nivel'],
                'tipo': row['tipo'],
                'plano_pai_id': row['plano_pai_id'],
                'ativo': row['ativo']
            })
        
        conn.close()
        return jsonify(planos)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/planos_financeiros', methods=['POST'])
def api_criar_plano():
    if 'user_id' not in session:
        return jsonify({'error': 'Não autenticado'}), 401
    
    try:
        data = request.get_json()
        
        conn = sqlite3.connect('selleta_main.db')
        cursor = conn.cursor()
        
        # Validar e gerar código
        plano_pai_id = data.get('plano_pai_id')
        nome = data.get('nome')
        
        if not nome:
            return jsonify({'error': 'Nome é obrigatório'}), 400
        
        # Determinar nível e tipo baseado no pai
        if plano_pai_id:
            cursor.execute('SELECT codigo, nivel, tipo FROM plano_financeiro WHERE id = ?', (plano_pai_id,))
            pai = cursor.fetchone()
            if not pai:
                return jsonify({'error': 'Plano pai não encontrado'}), 400
            
            codigo_pai, nivel_pai, tipo_pai = pai
            nivel = nivel_pai + 1
            tipo = tipo_pai
            
            # Gerar próximo código
            cursor.execute('''
                SELECT MAX(codigo) FROM plano_financeiro 
                WHERE plano_pai_id = ? AND nivel = ?
            ''', (plano_pai_id, nivel))
            
            ultimo_codigo = cursor.fetchone()[0]
            if ultimo_codigo:
                # Extrair último número e incrementar
                partes = ultimo_codigo.split('.')
                ultimo_num = int(partes[-1])
                partes[-1] = str(ultimo_num + 1).zfill(2)
                codigo = '.'.join(partes)
            else:
                # Primeiro filho
                codigo = f"{codigo_pai}.01"
        else:
            # Plano de nível 1
            nivel = 1
            tipo = data.get('tipo', 'Ambos')
            
            # Gerar próximo código de nível 1
            cursor.execute('SELECT MAX(CAST(codigo AS INTEGER)) FROM plano_financeiro WHERE nivel = 1')
            ultimo = cursor.fetchone()[0]
            codigo = str((ultimo or 0) + 1)
        
        # Inserir novo plano
        cursor.execute('''
            INSERT INTO plano_financeiro (codigo, nome, nivel, tipo, plano_pai_id)
            VALUES (?, ?, ?, ?, ?)
        ''', (codigo, nome, nivel, tipo, plano_pai_id))
        
        novo_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        return jsonify({
            'id': novo_id,
            'codigo': codigo,
            'nome': nome,
            'nivel': nivel,
            'tipo': tipo,
            'plano_pai_id': plano_pai_id,
            'ativo': True
        }), 201
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/planos_financeiros/<int:plano_id>', methods=['PUT'])
def api_atualizar_plano(plano_id):
    if 'user_id' not in session:
        return jsonify({'error': 'Não autenticado'}), 401
    
    try:
        data = request.get_json()
        nome = data.get('nome')
        ativo = data.get('ativo')
        
        conn = sqlite3.connect('selleta_main.db')
        cursor = conn.cursor()
        
        # Verificar se existe
        cursor.execute('SELECT id FROM plano_financeiro WHERE id = ?', (plano_id,))
        if not cursor.fetchone():
            return jsonify({'error': 'Plano não encontrado'}), 404
        
        # Se desativando, verificar se tem filhos ativos
        if ativo == False:
            cursor.execute('''
                SELECT COUNT(*) FROM plano_financeiro 
                WHERE plano_pai_id = ? AND ativo = 1
            ''', (plano_id,))
            if cursor.fetchone()[0] > 0:
                return jsonify({'error': 'Não pode desativar plano com filhos ativos'}), 400
        
        # Atualizar
        updates = []
        params = []
        
        if nome is not None:
            updates.append('nome = ?')
            params.append(nome)
        
        if ativo is not None:
            updates.append('ativo = ?')
            params.append(ativo)
        
        if updates:
            params.append(plano_id)
            cursor.execute(f'''
                UPDATE plano_financeiro 
                SET {', '.join(updates)}, atualizado_em = CURRENT_TIMESTAMP
                WHERE id = ?
            ''', params)
            
            conn.commit()
        
        conn.close()
        return jsonify({'success': True})
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ====== ROTAS DE EMPRESAS ======
@app.route('/empresas')
def empresas():
    if 'user_id' not in session:
        flash('error', 'Você não está autenticado.')
        return redirect(url_for('index'))
    
    return render_template('empresas.html')

@app.route('/api/empresas', methods=['GET'])
def api_listar_empresas():
    if 'user_id' not in session:
        return jsonify({'error': 'Não autenticado'}), 401
    
    try:
        conn = sqlite3.connect('selleta_main.db')
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        # Buscar todas as empresas ordenadas por código
        cursor.execute('''
            SELECT id, codigo, nome, grupo, cnpj, endereco, municipio, cep, telefone, ativo
            FROM empresas
            ORDER BY codigo
        ''')
        
        empresas = []
        for row in cursor.fetchall():
            empresas.append({
                'id': row['id'],
                'codigo': row['codigo'],
                'nome': row['nome'],
                'grupo': row['grupo'],
                'cnpj': row['cnpj'],
                'endereco': row['endereco'],
                'municipio': row['municipio'],
                'cep': row['cep'],
                'telefone': row['telefone'],
                'ativo': row['ativo']
            })
        
        conn.close()
        return jsonify(empresas)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/empresas', methods=['POST'])
def api_criar_empresa():
    if 'user_id' not in session:
        return jsonify({'error': 'Não autenticado'}), 401
    
    try:
        data = request.get_json()
        
        conn = sqlite3.connect('selleta_main.db')
        cursor = conn.cursor()
        
        # Validações
        codigo = data.get('codigo', '').strip()
        nome = data.get('nome', '').strip()
        
        if not codigo or not nome:
            return jsonify({'error': 'Código e nome são obrigatórios'}), 400
        
        # Verificar se código já existe
        cursor.execute('SELECT id FROM empresas WHERE codigo = ?', (codigo,))
        if cursor.fetchone():
            return jsonify({'error': 'Código já existe'}), 400
        
        # Inserir nova empresa
        cursor.execute('''
            INSERT INTO empresas (codigo, nome, grupo, cnpj, endereco, municipio, cep, telefone, ativo)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            codigo,
            nome,
            data.get('grupo', 'Grupo Selleta'),
            data.get('cnpj', ''),
            data.get('endereco', ''),
            data.get('municipio', ''),
            data.get('cep', ''),
            data.get('telefone', ''),
            data.get('ativo', 1)
        ))
        
        novo_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        return jsonify({
            'id': novo_id,
            'codigo': codigo,
            'nome': nome,
            'grupo': data.get('grupo', 'Grupo Selleta'),
            'cnpj': data.get('cnpj', ''),
            'endereco': data.get('endereco', ''),
            'municipio': data.get('municipio', ''),
            'cep': data.get('cep', ''),
            'telefone': data.get('telefone', ''),
            'ativo': data.get('ativo', 1)
        }), 201
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/empresas/<int:empresa_id>', methods=['PUT'])
def api_atualizar_empresa(empresa_id):
    if 'user_id' not in session:
        return jsonify({'error': 'Não autenticado'}), 401
    
    try:
        data = request.get_json()
        
        conn = sqlite3.connect('selleta_main.db')
        cursor = conn.cursor()
        
        # Verificar se existe
        cursor.execute('SELECT id FROM empresas WHERE id = ?', (empresa_id,))
        if not cursor.fetchone():
            return jsonify({'error': 'Empresa não encontrada'}), 404
        
        # Verificar se código é único (se alterado)
        if 'codigo' in data:
            cursor.execute('SELECT id FROM empresas WHERE codigo = ? AND id != ?', (data['codigo'], empresa_id))
            if cursor.fetchone():
                return jsonify({'error': 'Código já existe para outra empresa'}), 400
        
        # Atualizar campos
        updates = []
        params = []
        
        for field in ['codigo', 'nome', 'grupo', 'cnpj', 'endereco', 'municipio', 'cep', 'telefone', 'ativo']:
            if field in data:
                updates.append(f'{field} = ?')
                params.append(data[field])
        
        if updates:
            params.append(empresa_id)
            cursor.execute(f'''
                UPDATE empresas 
                SET {', '.join(updates)}, data_atualizacao = CURRENT_TIMESTAMP
                WHERE id = ?
            ''', params)
            
            conn.commit()
        
        conn.close()
        return jsonify({'success': True})
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ====== ROTAS DE CENTRO DE CUSTO ======
@app.route('/centro_custo')
def centro_custo():
    if 'user_id' not in session:
        flash('error', 'Você não está autenticado.')
        return redirect(url_for('index'))
    
    return render_template('centro_custo.html')

@app.route('/api/centros_custo', methods=['GET'])
def api_listar_centros_custo():
    if 'user_id' not in session:
        return jsonify({'error': 'Não autenticado'}), 401
    
    try:
        conn = sqlite3.connect('selleta_main.db')
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        # Buscar centros de custo com informações da empresa
        cursor.execute('''
            SELECT cc.id, cc.centro_custo_original, cc.mascara_cc, 
                   cc.tipologia, cc.categoria, cc.descricao, cc.ativo,
                   e.codigo as empresa_codigo, e.nome as empresa_nome
            FROM centros_custo cc
            JOIN empresas e ON cc.empresa_id = e.id
            ORDER BY cc.mascara_cc
        ''')
        
        centros = []
        for row in cursor.fetchall():
            centros.append({
                'id': row['id'],
                'centro_custo_original': row['centro_custo_original'],
                'mascara_cc': row['mascara_cc'],
                'tipologia': row['tipologia'],
                'categoria': row['categoria'],
                'descricao': row['descricao'],
                'ativo': row['ativo'],
                'empresa_codigo': row['empresa_codigo'],
                'empresa_nome': row['empresa_nome']
            })
        
        conn.close()
        return jsonify(centros)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/centros_custo', methods=['POST'])
def api_criar_centro_custo():
    if 'user_id' not in session:
        return jsonify({'error': 'Não autenticado'}), 401
    
    try:
        data = request.get_json()
        
        conn = sqlite3.connect('selleta_main.db')
        cursor = conn.cursor()
        
        # Validações
        mascara_cc = data.get('mascara_cc', '').strip()
        empresa_id = data.get('empresa_id')
        tipologia = data.get('tipologia', 'Obra Privada')
        categoria = data.get('categoria', 'nativo')
        
        if not mascara_cc or not empresa_id:
            return jsonify({'error': 'Máscara CC e empresa são obrigatórios'}), 400
        
        # Verificar se empresa existe
        cursor.execute('SELECT id FROM empresas WHERE id = ?', (empresa_id,))
        if not cursor.fetchone():
            return jsonify({'error': 'Empresa não encontrada'}), 400
        
        # Inserir novo centro de custo
        centro_custo_original = data.get('centro_custo_original', mascara_cc)
        descricao = data.get('descricao', f"Centro de custo {tipologia.lower()} - {categoria}")
        
        cursor.execute('''
            INSERT INTO centros_custo (centro_custo_original, mascara_cc, empresa_id, 
                                     tipologia, categoria, descricao, ativo)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (
            centro_custo_original,
            mascara_cc,
            empresa_id,
            tipologia,
            categoria,
            descricao,
            data.get('ativo', 1)
        ))
        
        novo_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        return jsonify({
            'id': novo_id,
            'centro_custo_original': centro_custo_original,
            'mascara_cc': mascara_cc,
            'tipologia': tipologia,
            'categoria': categoria,
            'descricao': descricao,
            'ativo': data.get('ativo', 1)
        }), 201
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/centros_custo/<int:centro_id>', methods=['PUT'])
def api_atualizar_centro_custo(centro_id):
    if 'user_id' not in session:
        return jsonify({'error': 'Não autenticado'}), 401
    
    try:
        data = request.get_json()
        
        conn = sqlite3.connect('selleta_main.db')
        cursor = conn.cursor()
        
        # Verificar se existe
        cursor.execute('SELECT id FROM centros_custo WHERE id = ?', (centro_id,))
        if not cursor.fetchone():
            return jsonify({'error': 'Centro de custo não encontrado'}), 404
        
        # Atualizar campos
        updates = []
        params = []
        
        for field in ['mascara_cc', 'tipologia', 'categoria', 'descricao', 'ativo']:
            if field in data:
                updates.append(f'{field} = ?')
                params.append(data[field])
        
        if updates:
            params.append(centro_id)
            cursor.execute(f'''
                UPDATE centros_custo 
                SET {', '.join(updates)}, data_atualizacao = CURRENT_TIMESTAMP
                WHERE id = ?
            ''', params)
            
            conn.commit()
        
        conn.close()
        return jsonify({'success': True})
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ====== ROTAS DE FORNECEDORES ======

@app.route('/fornecedores')
def fornecedores():
    if 'user_id' not in session:
        flash('error', 'Você não está autenticado.')
        return redirect(url_for('index'))
    
    return render_template('fornecedores.html')

@app.route('/api/fornecedores', methods=['GET'])
def api_listar_fornecedores():
    if 'user_id' not in session:
        return jsonify({'error': 'Não autenticado'}), 401
    
    try:
        conn = sqlite3.connect('selleta_main.db')
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        # Buscar todos os fornecedores ordenados por nome
        cursor.execute('''
            SELECT id, nome, nome_original, cnpj_cpf, origem, tipo_fornecedor,
                   agencia, banco, conta, chave_pix, tipo_conta, favorecido, cpf_cnpj_favorecido,
                   descricao, metodo_deteccao, similaridade, deteccao_forcada, deteccao_corrigida,
                   observacoes, valor_total_movimentado, total_transacoes, ativo
            FROM fornecedores
            WHERE ativo = 1
            ORDER BY nome
        ''')
        
        fornecedores = []
        for row in cursor.fetchall():
            fornecedores.append({
                'id': row['id'],
                'nome': row['nome'],
                'nome_original': row['nome_original'],
                'cnpj_cpf': row['cnpj_cpf'],
                'origem': row['origem'],
                'tipo_fornecedor': row['tipo_fornecedor'],
                'agencia': row['agencia'],
                'banco': row['banco'],
                'conta': row['conta'],
                'chave_pix': row['chave_pix'],
                'tipo_conta': row['tipo_conta'],
                'favorecido': row['favorecido'],
                'cpf_cnpj_favorecido': row['cpf_cnpj_favorecido'],
                'descricao': row['descricao'],
                'metodo_deteccao': row['metodo_deteccao'],
                'similaridade': row['similaridade'],
                'deteccao_forcada': bool(row['deteccao_forcada']),
                'deteccao_corrigida': bool(row['deteccao_corrigida']),
                'observacoes': row['observacoes'],
                'valor_total_movimentado': row['valor_total_movimentado'],
                'total_transacoes': row['total_transacoes'],
                'ativo': bool(row['ativo'])
            })
        
        conn.close()
        return jsonify(fornecedores)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/fornecedores', methods=['POST'])
def api_criar_fornecedor():
    if 'user_id' not in session:
        return jsonify({'error': 'Não autenticado'}), 401
    
    try:
        data = request.get_json()
        
        # Validações
        if not data.get('nome'):
            return jsonify({'error': 'Nome é obrigatório'}), 400
        
        conn = sqlite3.connect('selleta_main.db')
        cursor = conn.cursor()
        
        # Verificar se já existe fornecedor com o mesmo nome
        cursor.execute('SELECT id FROM fornecedores WHERE nome = ? AND ativo = 1', (data['nome'],))
        if cursor.fetchone():
            return jsonify({'error': 'Já existe um fornecedor com este nome'}), 400
        
        # Inserir novo fornecedor
        cursor.execute('''
            INSERT INTO fornecedores (
                nome, nome_original, cnpj_cpf, origem, tipo_fornecedor,
                agencia, banco, conta, chave_pix, tipo_conta, favorecido, cpf_cnpj_favorecido,
                descricao, metodo_deteccao, similaridade, deteccao_forcada, deteccao_corrigida,
                observacoes, valor_total_movimentado, total_transacoes, ativo
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            data['nome'],
            data.get('nome_original', data['nome']),
            data.get('cnpj_cpf', ''),
            data.get('origem', 'MANUAL'),
            data.get('tipo_fornecedor', 'empresa'),
            data.get('agencia', ''),
            data.get('banco', ''),
            data.get('conta', ''),
            data.get('chave_pix', ''),
            data.get('tipo_conta', ''),
            data.get('favorecido', ''),
            data.get('cpf_cnpj_favorecido', ''),
            data.get('descricao', ''),
            data.get('metodo_deteccao', 'manual'),
            data.get('similaridade', 1.0),
            data.get('deteccao_forcada', False),
            data.get('deteccao_corrigida', False),
            data.get('observacoes', ''),
            data.get('valor_total_movimentado', 0),
            data.get('total_transacoes', 0),
            data.get('ativo', True)
        ))
        
        fornecedor_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        return jsonify({'id': fornecedor_id, 'success': True})
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/fornecedores/<int:fornecedor_id>', methods=['PUT'])
def api_atualizar_fornecedor(fornecedor_id):
    if 'user_id' not in session:
        return jsonify({'error': 'Não autenticado'}), 401
    
    try:
        data = request.get_json()
        
        # Validações
        if not data.get('nome'):
            return jsonify({'error': 'Nome é obrigatório'}), 400
        
        conn = sqlite3.connect('selleta_main.db')
        cursor = conn.cursor()
        
        # Verificar se o fornecedor existe
        cursor.execute('SELECT id FROM fornecedores WHERE id = ? AND ativo = 1', (fornecedor_id,))
        if not cursor.fetchone():
            return jsonify({'error': 'Fornecedor não encontrado'}), 404
        
        # Verificar se já existe outro fornecedor com o mesmo nome
        cursor.execute('SELECT id FROM fornecedores WHERE nome = ? AND id != ? AND ativo = 1', (data['nome'], fornecedor_id))
        if cursor.fetchone():
            return jsonify({'error': 'Já existe outro fornecedor com este nome'}), 400
        
        # Atualizar fornecedor
        cursor.execute('''
            UPDATE fornecedores SET
                nome = ?, cnpj_cpf = ?, tipo_fornecedor = ?, agencia = ?, banco = ?, conta = ?,
                chave_pix = ?, tipo_conta = ?, favorecido = ?, cpf_cnpj_favorecido = ?,
                descricao = ?, similaridade = ?, observacoes = ?
            WHERE id = ?
        ''', (
            data['nome'],
            data.get('cnpj_cpf', ''),
            data.get('tipo_fornecedor', 'empresa'),
            data.get('agencia', ''),
            data.get('banco', ''),
            data.get('conta', ''),
            data.get('chave_pix', ''),
            data.get('tipo_conta', ''),
            data.get('favorecido', ''),
            data.get('cpf_cnpj_favorecido', ''),
            data.get('descricao', ''),
            data.get('similaridade', 1.0),
            data.get('observacoes', ''),
            fornecedor_id
        ))
        
        conn.commit()
        conn.close()
        
        return jsonify({'success': True})
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/fornecedores/<int:fornecedor_id>', methods=['DELETE'])
def api_excluir_fornecedor(fornecedor_id):
    if 'user_id' not in session:
        return jsonify({'error': 'Não autenticado'}), 401
    
    try:
        conn = sqlite3.connect('selleta_main.db')
        cursor = conn.cursor()
        
        # Verificar se o fornecedor existe
        cursor.execute('SELECT id FROM fornecedores WHERE id = ? AND ativo = 1', (fornecedor_id,))
        if not cursor.fetchone():
            return jsonify({'error': 'Fornecedor não encontrado'}), 404
        
        # Soft delete - marcar como inativo
        cursor.execute('UPDATE fornecedores SET ativo = 0 WHERE id = ?', (fornecedor_id,))
        
        conn.commit()
        conn.close()
        
        return jsonify({'success': True})
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ====== ROTAS FUTURAS (PLACEHOLDER) ======

@app.route('/clientes_fornecedores')
def clientes_fornecedores():
    if 'user_id' not in session:
        flash('error', 'Você não está autenticado.')
        return redirect(url_for('index'))
    
    # Redirecionar para a página de fornecedores que já está implementada
    return redirect(url_for('fornecedores'))

@app.route('/transacoes')
def transacoes():
    if 'user_id' not in session:
        flash('error', 'Você não está autenticado.')
        return redirect(url_for('index'))
    
    try:
        # NOVA ARQUITETURA v2.0: Sistema completo de filtros
        # Features: APIs dedicadas + Filtros hierárquicos + UX moderna
        return render_template('transacoes.html')
        
    except Exception as e:
        flash('error', f"Erro ao carregar transações: {str(e)}")
        return redirect(url_for('dashboard'))

@app.route('/nova_transacao')
def nova_transacao():
    if 'user_id' not in session:
        flash('error', 'Você não está autenticado.')
        return redirect(url_for('index'))
    
    # Página de nova transação - FASE 3
    # TODO: Implementar template nova_transacao.html
    flash('info', 'Nova Transação - APIs implementadas, aguardando template')
    return redirect(url_for('dashboard'))

@app.route('/contas_pagar')
def contas_pagar():
    if 'user_id' not in session:
        flash('error', 'Você não está autenticado.')
        return redirect(url_for('index'))
    flash('info', 'Contas a Pagar - Em desenvolvimento')
    return redirect(url_for('dashboard'))

@app.route('/contas_receber')
def contas_receber():
    if 'user_id' not in session:
        flash('error', 'Você não está autenticado.')
        return redirect(url_for('index'))
    flash('info', 'Contas a Receber - Em desenvolvimento')
    return redirect(url_for('dashboard'))

@app.route('/relatorios')
def relatorios():
    if 'user_id' not in session:
        flash('error', 'Você não está autenticado.')
        return redirect(url_for('index'))
    flash('info', 'Relatórios - Em desenvolvimento')
    return redirect(url_for('dashboard'))

@app.route('/conta_bancaria')
def conta_bancaria():
    if 'user_id' not in session:
        flash('error', 'Você não está autenticado.')
        return redirect(url_for('index'))
    
    return render_template('conta_bancaria.html')

@app.route('/api/contas_bancarias', methods=['GET'])
def api_listar_contas_bancarias():
    if 'user_id' not in session:
        return jsonify({'error': 'Não autenticado'}), 401
    
    try:
        conn = sqlite3.connect('selleta_main.db')
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        # Buscar todas as contas bancárias ordenadas por banco e conta
        cursor.execute('''
            SELECT id, agencia, banco, conta_corrente, empresa, mascara, 
                   tipo_conta, ativo, created_at, updated_at, saldo_inicial, status_conta
            FROM conta_bancaria
            WHERE ativo = 1
            ORDER BY empresa, banco, conta_corrente
        ''')
        
        contas = []
        for row in cursor.fetchall():
            contas.append({
                'id': row['id'],
                'agencia': row['agencia'],
                'banco': row['banco'],
                'conta_corrente': row['conta_corrente'],
                'empresa': row['empresa'],
                'mascara': row['mascara'],
                'tipo_conta': row['tipo_conta'],
                'ativo': row['ativo'],
                'created_at': row['created_at'],
                'updated_at': row['updated_at'],
                'saldo_inicial': row['saldo_inicial'],
                'status_conta': row['status_conta']
            })
        
        conn.close()
        return jsonify(contas)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/contas_bancarias', methods=['POST'])
def api_criar_conta_bancaria():
    if 'user_id' not in session:
        return jsonify({'error': 'Não autenticado'}), 401
    
    try:
        data = request.get_json()
        
        # Validações básicas
        required_fields = ['agencia', 'banco', 'conta_corrente', 'empresa']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'error': f'Campo {field} é obrigatório'}), 400
        
        # Validar status_conta
        status_validos = ['Aberta', 'Ativa', 'Desativada']
        if data.get('status_conta') and data['status_conta'] not in status_validos:
            return jsonify({'error': f'Status deve ser um dos: {", ".join(status_validos)}'}), 400
        
        conn = sqlite3.connect('selleta_main.db')
        cursor = conn.cursor()
        
        # Verificar se conta já existe
        cursor.execute('SELECT id FROM conta_bancaria WHERE conta_corrente = ? AND ativo = 1', 
                      (data['conta_corrente'],))
        if cursor.fetchone():
            return jsonify({'error': 'Conta corrente já cadastrada'}), 400
        
        # Inserir nova conta
        cursor.execute('''
            INSERT INTO conta_bancaria (
                agencia, banco, conta_corrente, empresa, mascara, tipo_conta, saldo_inicial, status_conta
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            data['agencia'],
            data['banco'], 
            data['conta_corrente'],
            data['empresa'],
            data.get('mascara'),
            data.get('tipo_conta'),
            float(data.get('saldo_inicial', 0.0)),
            data.get('status_conta', 'Ativa')
        ))
        
        conn.commit()
        conta_id = cursor.lastrowid
        conn.close()
        
        return jsonify({'message': 'Conta bancária criada com sucesso', 'id': conta_id}), 201
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/contas_bancarias/<int:conta_id>', methods=['PUT'])
def api_atualizar_conta_bancaria(conta_id):
    if 'user_id' not in session:
        return jsonify({'error': 'Não autenticado'}), 401
    
    try:
        data = request.get_json()
        
        conn = sqlite3.connect('selleta_main.db')
        cursor = conn.cursor()
        
        # Verificar se conta existe
        cursor.execute('SELECT id FROM conta_bancaria WHERE id = ? AND ativo = 1', (conta_id,))
        if not cursor.fetchone():
            return jsonify({'error': 'Conta bancária não encontrada'}), 404
        
        # Verificar se nova conta_corrente já existe (se foi alterada)
        if 'conta_corrente' in data:
            cursor.execute('SELECT id FROM conta_bancaria WHERE conta_corrente = ? AND id != ? AND ativo = 1', 
                          (data['conta_corrente'], conta_id))
            if cursor.fetchone():
                return jsonify({'error': 'Conta corrente já cadastrada'}), 400
        
        # Atualizar conta
        cursor.execute('''
            UPDATE conta_bancaria SET
                agencia = ?, banco = ?, conta_corrente = ?, empresa = ?,
                mascara = ?, tipo_conta = ?, saldo_inicial = ?, status_conta = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        ''', (
            data.get('agencia'),
            data.get('banco'),
            data.get('conta_corrente'),
            data.get('empresa'),
            data.get('mascara'),
            data.get('tipo_conta'),
            float(data.get('saldo_inicial', 0.0)),
            data.get('status_conta', 'Ativa'),
            conta_id
        ))
        
        conn.commit()
        conn.close()
        
        return jsonify({'message': 'Conta bancária atualizada com sucesso'}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/contas_bancarias/<int:conta_id>', methods=['DELETE'])
def api_excluir_conta_bancaria(conta_id):
    if 'user_id' not in session:
        return jsonify({'error': 'Não autenticado'}), 401
    
    try:
        conn = sqlite3.connect('selleta_main.db')
        cursor = conn.cursor()
        
        # Verificar se conta existe
        cursor.execute('SELECT id FROM conta_bancaria WHERE id = ? AND ativo = 1', (conta_id,))
        if not cursor.fetchone():
            return jsonify({'error': 'Conta bancária não encontrada'}), 404
        
        # Soft delete (marcar como inativo)
        cursor.execute('UPDATE conta_bancaria SET ativo = 0 WHERE id = ?', (conta_id,))
        
        conn.commit()
        conn.close()
        
        return jsonify({'message': 'Conta bancária excluída com sucesso'}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/bancos', methods=['GET'])
def api_listar_bancos():
    if 'user_id' not in session:
        return jsonify({'error': 'Não autenticado'}), 401
    
    try:
        conn = sqlite3.connect('selleta_main.db')
        cursor = conn.cursor()
        
        # Buscar bancos únicos
        cursor.execute('''
            SELECT DISTINCT banco 
            FROM conta_bancaria 
            WHERE ativo = 1 AND banco IS NOT NULL AND banco != ''
            ORDER BY banco
        ''')
        
        bancos = [row[0] for row in cursor.fetchall()]
        conn.close()
        
        return jsonify(bancos)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ====== FUNÇÕES AUXILIARES PARA TRANSAÇÕES ======
def calcular_status_dinamico(data_vencimento, status_pagamento):
    """
    Calcula status dinâmico baseado na data de vencimento
    Args:
        data_vencimento: string no formato 'YYYY-MM-DD'
        status_pagamento: string com o status atual
    Returns:
        string com o status dinâmico
    """
    if status_pagamento == 'Realizado':
        return status_pagamento
    
    try:
        vencimento = datetime.strptime(data_vencimento, '%Y-%m-%d').date()
        hoje = date.today()
        
        if vencimento < hoje:
            return 'Vencida'
        else:
            return 'Á realizar'
    except:
        return status_pagamento

def validar_status_transacao(status_pagamento, status_negociacao):
    """
    Valida se os status de transação são válidos conforme CSV importado
    Args:
        status_pagamento: string
        status_negociacao: string
    Returns:
        dict com 'valid': bool e 'errors': list
    """
    # Status válidos conforme CSV importado
    status_pagamento_validos = ['Realizado', 'Á realizar']
    status_negociacao_validos = ['NEGOCIADO', 'PARCIALMENTE NEGOCIADO', 'NÃO NEGOCIADO', 'A NEGOCIAR', 'PAGO']
    
    errors = []
    
    if status_pagamento and status_pagamento not in status_pagamento_validos:
        errors.append(f'Status de pagamento inválido. Valores aceitos: {", ".join(status_pagamento_validos)}')
    
    if status_negociacao and status_negociacao not in status_negociacao_validos:
        errors.append(f'Status de negociação inválido. Valores aceitos: {", ".join(status_negociacao_validos)}')
    
    return {
        'valid': len(errors) == 0,
        'errors': errors
    }

# ====== ROTAS DE TRANSAÇÕES (NOVO) ======
@app.route('/api/transacoes', methods=['GET'])
def api_listar_transacoes():
    if 'user_id' not in session:
        return jsonify({'error': 'Não autenticado'}), 401
    
    try:
        conn = sqlite3.connect('selleta_main.db')
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        # Parâmetros de filtro
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 50, type=int)
        tipo = request.args.get('tipo')
        status_pagamento = request.args.get('status_pagamento')
        status_negociacao = request.args.get('status_negociacao')
        empresa_id = request.args.get('empresa_id')
        centro_custo_id = request.args.get('centro_custo_id')
        plano_financeiro_id = request.args.get('plano_financeiro_id')
        tipologia = request.args.get('tipologia')
        # Suporte para ambos os nomes de parâmetros de data
        data_inicio = request.args.get('data_inicio') or request.args.get('data_vencimento_inicio')
        data_fim = request.args.get('data_fim') or request.args.get('data_vencimento_fim')
        search = request.args.get('search')
        view_type = request.args.get('view_type', 'previsao')  # Novo: view toggle
        
        # Query base com JOINs
        query = '''
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
        '''
        
        params = []
        
        # Aplicar filtros
        if tipo:
            query += ' AND t.tipo = ?'
            params.append(tipo)
            
        if status_pagamento:
            # Suporte a múltiplos status (separados por vírgula)
            if ',' in status_pagamento:
                status_list = [s.strip() for s in status_pagamento.split(',') if s.strip()]
                placeholders = ','.join(['?' for _ in status_list])
                query += f' AND t.status_pagamento IN ({placeholders})'
                params.extend(status_list)
            else:
                query += ' AND t.status_pagamento = ?'
                params.append(status_pagamento)
            
        if status_negociacao:
            query += ' AND t.status_negociacao = ?'
            params.append(status_negociacao)
            
        if empresa_id:
            query += ' AND t.empresa_id = ?'
            params.append(empresa_id)
            
        if centro_custo_id:
            query += ' AND t.centro_custo_id = ?'
            params.append(centro_custo_id)
            
        if plano_financeiro_id:
            query += ' AND t.plano_financeiro_id = ?'
            params.append(plano_financeiro_id)
            
        if tipologia:
            query += ' AND cc.tipologia = ?'
            params.append(tipologia)
            
        if data_inicio:
            query += ' AND t.data_vencimento >= ?'
            params.append(data_inicio)
            
        if data_fim:
            query += ' AND t.data_vencimento <= ?'
            params.append(data_fim)
            
        if search:
            query += ''' AND (t.titulo LIKE ? OR t.numero_documento LIKE ? 
                         OR f.nome LIKE ? OR t.observacao LIKE ?)'''
            search_param = f'%{search}%'
            params.extend([search_param, search_param, search_param, search_param])
        
        # Aplicar filtro avançado de view (NOVO)
        query, params = aplicar_filtro_smart(query, params, view_type)
        
        # Contar total de registros
        count_query = '''
            SELECT COUNT(*) as total
            FROM transacoes t
            LEFT JOIN fornecedores f ON t.cliente_fornecedor_id = f.id
            LEFT JOIN centros_custo cc ON t.centro_custo_id = cc.id
            LEFT JOIN empresas e ON t.empresa_id = e.id
            LEFT JOIN plano_financeiro pf ON t.plano_financeiro_id = pf.id
            LEFT JOIN usuarios u ON t.usuario_id = u.id
            WHERE 1=1
        '''
        
        # Aplicar os mesmos filtros na contagem
        if tipo:
            count_query += ' AND t.tipo = ?'
        if status_pagamento:
            # Suporte a múltiplos status na contagem também
            if ',' in status_pagamento:
                status_list = [s.strip() for s in status_pagamento.split(',') if s.strip()]
                placeholders = ','.join(['?' for _ in status_list])
                count_query += f' AND t.status_pagamento IN ({placeholders})'
            else:
                count_query += ' AND t.status_pagamento = ?'
        if status_negociacao:
            count_query += ' AND t.status_negociacao = ?'
        if empresa_id:
            count_query += ' AND t.empresa_id = ?'
        if centro_custo_id:
            count_query += ' AND t.centro_custo_id = ?'
        if plano_financeiro_id:
            count_query += ' AND t.plano_financeiro_id = ?'
        if tipologia:
            count_query += ' AND cc.tipologia = ?'
        if data_inicio:
            count_query += ' AND t.data_vencimento >= ?'
        if data_fim:
            count_query += ' AND t.data_vencimento <= ?'
        if search:
            count_query += ''' AND (t.titulo LIKE ? OR t.numero_documento LIKE ? 
                         OR f.nome LIKE ? OR t.observacao LIKE ?)'''
        
        # Aplicar filtro avançado na contagem também
        count_query, count_params = aplicar_filtro_smart(count_query, params, view_type)
        
        cursor.execute(count_query, count_params)
        total = cursor.fetchone()['total']
        
        # Aplicar paginação
        query += ' ORDER BY t.data_vencimento DESC, t.id DESC'
        query += f' LIMIT {per_page} OFFSET {(page - 1) * per_page}'
        
        cursor.execute(query, params)
        
        transacoes = []
        for row in cursor.fetchall():
            # Calcular status dinâmico baseado na data de vencimento
            status_pagamento_original = row['status_pagamento']
            status_pagamento_dinamico = calcular_status_dinamico(row['data_vencimento'], status_pagamento_original)
            
            transacoes.append({
                'id': row['id'],
                'titulo': row['titulo'],
                'numero_documento': row['numero_documento'],
                'parcela_atual': row['parcela_atual'],
                'parcela_total': row['parcela_total'],
                'valor': float(row['valor']) if row['valor'] else 0.00,
                'data_lancamento': row['data_lancamento'],
                'data_vencimento': row['data_vencimento'],
                'data_competencia': row['data_competencia'],
                'tipo': row['tipo'],
                'tipologia': row['tipologia'],
                'status_negociacao': row['status_negociacao'],
                'status_pagamento': status_pagamento_dinamico,
                'status_pagamento_original': status_pagamento_original,
                'municipio': row['municipio'],
                'observacao': row['observacao'],
                'cliente_fornecedor_id': row['cliente_fornecedor_id'],
                'fornecedor_nome': row['fornecedor_nome'],
                'centro_custo_id': row['centro_custo_id'],
                'centro_custo_nome': row['centro_custo_nome'],
                'empresa_id': row['empresa_id'],
                'empresa_nome': row['empresa_nome'],
                'plano_financeiro_id': row['plano_financeiro_id'],
                'plano_financeiro_nome': row['plano_financeiro_nome'],
                'usuario_id': row['usuario_id'],
                'usuario_nome': row['usuario_nome'],
                'criado_em': row['criado_em'],
                'atualizado_em': row['atualizado_em']
            })
        
        conn.close()
        
        return jsonify({
            'transacoes': transacoes,
            'total': total,
            'page': page,
            'per_page': per_page,
            'total_pages': (total + per_page - 1) // per_page
        })
        
    except Exception as e:
        logger.error(f"Erro ao listar transações: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/transacoes/view-counts', methods=['GET'])
def api_view_counts():
    """
    Nova API para obter contagens dos filtros de view
    Retorna contagens para Previsão, Consolidado e Atrasado
    """
    if 'user_id' not in session:
        return jsonify({'error': 'Não autenticado'}), 401
    
    try:
        # Obter contagens dos filtros avançados
        counts = get_status_counts()
        
        return jsonify({
            'previsao': counts['previsao'],
            'consolidado': counts['consolidado'], 
            'atrasado': counts['atrasado'],
            'total': counts['total']
        })
        
    except Exception as e:
        logger.error(f"Erro ao obter contagens de view: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/transacoes/view-metrics/<view_type>', methods=['GET'])
def api_view_metrics(view_type):
    """
    Nova API para obter métricas específicas por tipo de view
    """
    if 'user_id' not in session:
        return jsonify({'error': 'Não autenticado'}), 401
    
    if view_type not in ['previsao', 'consolidado', 'atrasado']:
        return jsonify({'error': 'View type inválido'}), 400
    
    try:
        # Obter métricas específicas do view
        metrics = get_view_metrics(view_type)
        
        return jsonify({
            'view_type': view_type,
            'receitas': metrics['receitas'],
            'despesas': metrics['despesas'],
            'saldo': metrics['saldo'],
            'count_receitas': metrics['count_receitas'],
            'count_despesas': metrics['count_despesas'],
            'total_transacoes': metrics['total_transacoes'],
            'valor_medio': metrics['valor_medio']
        })
        
    except Exception as e:
        logger.error(f"Erro ao obter métricas de view: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/transacoes', methods=['POST'])
def api_criar_transacao():
    if 'user_id' not in session:
        return jsonify({'error': 'Não autenticado'}), 401
    
    try:
        data = request.get_json()
        conn = sqlite3.connect('selleta_main.db')
        cursor = conn.cursor()
        
        # Validações básicas
        required_fields = ['titulo', 'valor', 'tipo', 'data_vencimento', 
                          'cliente_fornecedor_id', 'centro_custo_id', 
                          'empresa_id', 'plano_financeiro_id']
        
        for field in required_fields:
            if field not in data or not data[field]:
                return jsonify({'error': f'Campo {field} é obrigatório'}), 400
        
        # Validar status se fornecidos
        status_validation = validar_status_transacao(
            data.get('status_pagamento'), 
            data.get('status_negociacao')
        )
        if not status_validation['valid']:
            return jsonify({'error': '; '.join(status_validation['errors'])}), 400
        
        # Verificar se é parcelamento
        parcela_total = data.get('parcela_total', 1)
        
        if parcela_total > 1:
            # Criar transações parceladas
            return api_criar_transacoes_parceladas(data)
        
        # Criar transação única
        cursor.execute('''
            INSERT INTO transacoes (
                titulo, numero_documento, parcela_atual, parcela_total,
                valor, data_lancamento, data_vencimento, data_competencia,
                tipo, tipologia, cliente_fornecedor_id, centro_custo_id,
                empresa_id, plano_financeiro_id, usuario_id,
                status_negociacao, status_pagamento, municipio, observacao,
                origem_importacao
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            data['titulo'],
            data.get('numero_documento'),
            1,
            1,
            float(data['valor']),
            date.today().isoformat(),
            data['data_vencimento'],
            data.get('data_competencia', data['data_vencimento']),
            data['tipo'],
            data.get('tipologia'),
            data['cliente_fornecedor_id'],
            data['centro_custo_id'],
            data['empresa_id'],
            data['plano_financeiro_id'],
            session['user_id'],
            data.get('status_negociacao', 'A NEGOCIAR'),
            data.get('status_pagamento', 'Á realizar'),
            data.get('municipio'),
            data.get('observacao'),
            'manual'
        ))
        
        transacao_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        return jsonify({
            'id': transacao_id,
            'message': 'Transação criada com sucesso'
        }), 201
        
    except Exception as e:
        logger.error(f"Erro ao criar transação: {e}")
        return jsonify({'error': str(e)}), 500

def api_criar_transacoes_parceladas(data):
    """Cria múltiplas transações parceladas"""
    try:
        conn = sqlite3.connect('selleta_main.db')
        cursor = conn.cursor()
        
        parcela_total = int(data['parcela_total'])
        valor_total = float(data['valor'])
        valor_parcela = round(valor_total / parcela_total, 2)
        
        # Ajustar última parcela para diferenças de arredondamento
        valor_ultima = valor_total - (valor_parcela * (parcela_total - 1))
        
        data_inicial = datetime.strptime(data['data_vencimento'], '%Y-%m-%d')
        intervalo_dias = int(data.get('intervalo_dias', 30))
        
        transacoes_criadas = []
        transacao_origem_id = None
        
        for i in range(parcela_total):
            parcela_atual = i + 1
            valor_atual = valor_parcela if i < parcela_total - 1 else valor_ultima
            
            # Calcular data de vencimento da parcela
            if i == 0:
                data_parcela = data_inicial
            else:
                data_parcela = data_inicial + timedelta(days=intervalo_dias * i)
            
            # Ajustar título para incluir parcela
            titulo_parcela = f"{data['titulo']} - Parcela {parcela_atual}/{parcela_total}"
            
            cursor.execute('''
                INSERT INTO transacoes (
                    titulo, numero_documento, parcela_atual, parcela_total,
                    valor, data_lancamento, data_vencimento, data_competencia,
                    tipo, tipologia, cliente_fornecedor_id, centro_custo_id,
                    empresa_id, plano_financeiro_id, usuario_id,
                    status_negociacao, status_pagamento, municipio, observacao,
                    origem_importacao, transacao_origem_id
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                titulo_parcela,
                data.get('numero_documento'),
                parcela_atual,
                parcela_total,
                valor_atual,
                date.today().isoformat(),
                data_parcela.strftime('%Y-%m-%d'),
                data_parcela.strftime('%Y-%m-%d'),
                data['tipo'],
                data.get('tipologia'),
                data['cliente_fornecedor_id'],
                data['centro_custo_id'],
                data['empresa_id'],
                data['plano_financeiro_id'],
                session['user_id'],
                data.get('status_negociacao', 'A NEGOCIAR'),
                data.get('status_pagamento', 'Á realizar'),
                data.get('municipio'),
                data.get('observacao'),
                'manual',
                transacao_origem_id
            ))
            
            transacao_id = cursor.lastrowid
            
            # Primeira parcela é a origem
            if i == 0:
                transacao_origem_id = transacao_id
            
            transacoes_criadas.append({
                'id': transacao_id,
                'parcela': parcela_atual,
                'valor': valor_atual,
                'data_vencimento': data_parcela.strftime('%Y-%m-%d')
            })
        
        conn.commit()
        conn.close()
        
        return jsonify({
            'message': f'{parcela_total} parcelas criadas com sucesso',
            'parcelas': transacoes_criadas
        }), 201
        
    except Exception as e:
        logger.error(f"Erro ao criar parcelas: {e}")
        if conn:
            conn.rollback()
            conn.close()
        return jsonify({'error': str(e)}), 500

@app.route('/api/transacoes/<int:id>', methods=['PUT'])
def api_atualizar_transacao(id):
    if 'user_id' not in session:
        return jsonify({'error': 'Não autenticado'}), 401
    
    try:
        data = request.get_json()
        conn = sqlite3.connect('selleta_main.db')
        cursor = conn.cursor()
        
        # Verificar se transação existe
        cursor.execute('SELECT id FROM transacoes WHERE id = ?', (id,))
        if not cursor.fetchone():
            return jsonify({'error': 'Transação não encontrada'}), 404
        
        # Validar status se fornecidos
        if 'status_pagamento' in data or 'status_negociacao' in data:
            status_validation = validar_status_transacao(
                data.get('status_pagamento'), 
                data.get('status_negociacao')
            )
            if not status_validation['valid']:
                return jsonify({'error': '; '.join(status_validation['errors'])}), 400
        
        # Construir query de atualização dinamicamente
        campos = []
        valores = []
        
        campos_permitidos = [
            'titulo', 'numero_documento', 'valor', 'data_vencimento',
            'tipo', 'tipologia', 'cliente_fornecedor_id', 'centro_custo_id',
            'empresa_id', 'plano_financeiro_id', 'status_negociacao',
            'status_pagamento', 'municipio', 'observacao'
        ]
        
        for campo in campos_permitidos:
            if campo in data:
                campos.append(f'{campo} = ?')
                valores.append(data[campo])
        
        if not campos:
            return jsonify({'error': 'Nenhum campo para atualizar'}), 400
        
        # Adicionar timestamp de atualização
        campos.append('atualizado_em = CURRENT_TIMESTAMP')
        valores.append(id)
        
        query = f"UPDATE transacoes SET {', '.join(campos)} WHERE id = ?"
        cursor.execute(query, valores)
        
        conn.commit()
        conn.close()
        
        return jsonify({'message': 'Transação atualizada com sucesso'}), 200
        
    except Exception as e:
        logger.error(f"Erro ao atualizar transação: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/transacoes/<int:id>', methods=['DELETE'])
def api_excluir_transacao(id):
    if 'user_id' not in session:
        return jsonify({'error': 'Não autenticado'}), 401
    
    try:
        conn = sqlite3.connect('selleta_main.db')
        cursor = conn.cursor()
        
        # Verificar se pode excluir (apenas se status = A NEGOCIAR)
        cursor.execute('''
            SELECT status_negociacao, status_pagamento 
            FROM transacoes WHERE id = ?
        ''', (id,))
        
        result = cursor.fetchone()
        if not result:
            return jsonify({'error': 'Transação não encontrada'}), 404
        
        if result[0] != 'A NEGOCIAR' or result[1] == 'Realizado':
            return jsonify({'error': 'Transação não pode ser excluída'}), 400
        
        # Excluir transação
        cursor.execute('DELETE FROM transacoes WHERE id = ?', (id,))
        
        conn.commit()
        conn.close()
        
        return jsonify({'message': 'Transação excluída com sucesso'}), 200
        
    except Exception as e:
        logger.error(f"Erro ao excluir transação: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/transacoes/parcelas/preview', methods=['POST'])
def api_preview_parcelas():
    """Gera preview das parcelas antes de criar"""
    if 'user_id' not in session:
        return jsonify({'error': 'Não autenticado'}), 401
    
    try:
        data = request.get_json()
        
        valor_total = float(data.get('valor', 0))
        parcela_total = int(data.get('parcela_total', 1))
        data_inicial = datetime.strptime(data.get('data_vencimento'), '%Y-%m-%d')
        intervalo_dias = int(data.get('intervalo_dias', 30))
        
        if parcela_total < 1 or valor_total <= 0:
            return jsonify({'error': 'Valores inválidos'}), 400
        
        valor_parcela = round(valor_total / parcela_total, 2)
        valor_ultima = valor_total - (valor_parcela * (parcela_total - 1))
        
        parcelas = []
        
        for i in range(parcela_total):
            parcela_atual = i + 1
            valor_atual = valor_parcela if i < parcela_total - 1 else valor_ultima
            
            if i == 0:
                data_parcela = data_inicial
            else:
                data_parcela = data_inicial + timedelta(days=intervalo_dias * i)
            
            parcelas.append({
                'parcela': f'{parcela_atual}/{parcela_total}',
                'valor': valor_atual,
                'data_vencimento': data_parcela.strftime('%Y-%m-%d'),
                'dia_semana': data_parcela.strftime('%A')
            })
        
        return jsonify({
            'parcelas': parcelas,
            'valor_total': valor_total,
            'quantidade': parcela_total
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 400

# ====== API AUXILIARES TRANSAÇÕES ======
@app.route('/api/transacoes/date-range', methods=['GET'])
def api_date_range():
    """
    API para obter o range de datas das transações
    """
    if 'user_id' not in session:
        return jsonify({'error': 'Não autenticado'}), 401
    
    try:
        conn = sqlite3.connect('selleta_main.db')
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT MIN(data_vencimento) as min_date, 
                   MAX(data_vencimento) as max_date
            FROM transacoes
            WHERE data_vencimento IS NOT NULL
        ''')
        
        result = cursor.fetchone()
        conn.close()
        
        return jsonify({
            'min_date': result[0] if result[0] else '2023-01-01',
            'max_date': result[1] if result[1] else datetime.now().strftime('%Y-%m-%d')
        })
        
    except Exception as e:
        logger.error(f"Erro ao obter range de datas: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/transacoes/status', methods=['GET'])
def api_status_transacoes():
    """Retorna os status válidos para transações"""
    if 'user_id' not in session:
        return jsonify({'error': 'Não autenticado'}), 401
    
    return jsonify({
        'status_pagamento': ['Realizado', 'Á realizar'],
        'status_negociacao': ['NEGOCIADO', 'PARCIALMENTE NEGOCIADO', 'NÃO NEGOCIADO', 'A NEGOCIAR', 'PAGO'],
        'status_dinamicos': ['Realizado', 'Á realizar', 'Vencida']
    })

# ====== API DASHBOARD KPIs ======
@app.route('/api/dashboard/kpis', methods=['GET'])
def api_dashboard_kpis():
    if 'user_id' not in session:
        return jsonify({'error': 'Não autenticado'}), 401
    
    try:
        conn = sqlite3.connect('selleta_main.db')
        cursor = conn.cursor()
        
        # Mês atual
        hoje = date.today()
        primeiro_dia = hoje.replace(day=1)
        
        # KPI 1: Receitas do mês (usar dezembro 2024 como referência - dados mais ricos)
        cursor.execute('''
            SELECT COALESCE(SUM(valor), 0) as total
            FROM transacoes
            WHERE tipo IN ('Receita', 'Entrada')
            AND strftime('%Y-%m', data_vencimento) = '2024-12'
            AND status_pagamento != 'Cancelado'
        ''')
        receitas_mes = float(cursor.fetchone()[0])
        
        # KPI 2: Despesas do mês (usar dezembro 2024 como referência)
        cursor.execute('''
            SELECT COALESCE(SUM(valor), 0) as total
            FROM transacoes
            WHERE tipo IN ('Despesa', 'Saída')
            AND strftime('%Y-%m', data_vencimento) = '2024-12'
            AND status_pagamento != 'Cancelado'
        ''')
        despesas_mes = float(cursor.fetchone()[0])
        
        # KPI 3: Saldo total (todas as transações realizadas)
        cursor.execute('''
            SELECT 
                COALESCE(SUM(CASE WHEN tipo IN ('Receita', 'Entrada') THEN valor ELSE 0 END), 0) -
                COALESCE(SUM(CASE WHEN tipo IN ('Despesa', 'Saída') THEN valor ELSE 0 END), 0) as saldo
            FROM transacoes
            WHERE status_pagamento = 'Realizado'
        ''')
        saldo_total = float(cursor.fetchone()[0])
        
        # KPI 4: Total de transações
        cursor.execute('SELECT COUNT(*) FROM transacoes')
        total_transacoes = cursor.fetchone()[0]
        
        # Contas a vencer (próximos 7 dias) - usar status corretos
        cursor.execute('''
            SELECT COUNT(*) as qtd, COALESCE(SUM(valor), 0) as total
            FROM transacoes
            WHERE status_pagamento IN ('Previsao', 'Atrasado')
            AND data_vencimento BETWEEN date('now') AND date('now', '+7 days')
        ''')
        result = cursor.fetchone()
        contas_vencer = result[0]
        valor_vencer = float(result[1])
        
        # Últimas 5 transações
        cursor.execute('''
            SELECT t.id, t.titulo, t.valor, t.tipo, t.data_vencimento,
                   f.nome as fornecedor_nome
            FROM transacoes t
            LEFT JOIN fornecedores f ON t.cliente_fornecedor_id = f.id
            ORDER BY t.criado_em DESC
            LIMIT 5
        ''')
        
        ultimas_transacoes = []
        for row in cursor.fetchall():
            ultimas_transacoes.append({
                'id': row[0],
                'titulo': row[1],
                'valor': float(row[2]),
                'tipo': row[3],
                'data_vencimento': row[4],
                'fornecedor_nome': row[5]
            })
        
        # Gráfico receitas x despesas (últimos 6 meses)
        cursor.execute('''
            SELECT 
                strftime('%Y-%m', data_vencimento) as mes,
                SUM(CASE WHEN tipo IN ('Receita', 'Entrada') THEN valor ELSE 0 END) as receitas,
                SUM(CASE WHEN tipo IN ('Despesa', 'Saída') THEN valor ELSE 0 END) as despesas
            FROM transacoes
            WHERE data_vencimento >= date('now', '-6 months')
            AND status_pagamento != 'Cancelado'
            GROUP BY strftime('%Y-%m', data_vencimento)
            ORDER BY mes
        ''')
        
        grafico_mensal = []
        for row in cursor.fetchall():
            grafico_mensal.append({
                'mes': row[0],
                'receitas': float(row[1]),
                'despesas': float(row[2])
            })
        
        conn.close()
        
        return jsonify({
            'receitas_mes': receitas_mes,
            'despesas_mes': despesas_mes,
            'saldo_total': saldo_total,
            'total_transacoes': total_transacoes,
            'contas_vencer': contas_vencer,
            'valor_vencer': valor_vencer,
            'ultimas_transacoes': ultimas_transacoes,
            'grafico_mensal': grafico_mensal
        })
        
    except Exception as e:
        logger.error(f"Erro ao buscar KPIs: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/dashboard/resumo_centros', methods=['GET'])
def api_resumo_centros_custo():
    """Resumo por centro de custo para o dashboard"""
    if 'user_id' not in session:
        return jsonify({'error': 'Não autenticado'}), 401
    
    try:
        conn = sqlite3.connect('selleta_main.db')
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT 
                cc.mascara_cc as centro_nome,
                SUM(CASE WHEN t.tipo IN ('Receita', 'Entrada') THEN t.valor ELSE 0 END) as receitas,
                SUM(CASE WHEN t.tipo IN ('Despesa', 'Saída') THEN t.valor ELSE 0 END) as despesas,
                COUNT(t.id) as total_transacoes
            FROM transacoes t
            JOIN centros_custo cc ON t.centro_custo_id = cc.id
            WHERE strftime('%Y-%m', t.data_vencimento) = strftime('%Y-%m', 'now')
            GROUP BY cc.id, cc.mascara_cc
            ORDER BY (receitas - despesas) DESC
            LIMIT 5
        ''')
        
        resumo_centros = []
        for row in cursor.fetchall():
            receitas = float(row[1])
            despesas = float(row[2])
            resumo_centros.append({
                'centro_nome': row[0],
                'receitas': receitas,
                'despesas': despesas,
                'saldo': receitas - despesas,
                'total_transacoes': row[3]
            })
        
        conn.close()
        
        return jsonify(resumo_centros)
        
    except Exception as e:
        logger.error(f"Erro ao buscar resumo centros: {e}")
        return jsonify({'error': str(e)}), 500

# ==========================================
# NOVAS ROTAS DA API DE FILTROS
# ==========================================

@app.route('/api/transacoes/filtros', methods=['GET'])
def api_filtros_transacoes():
    """API para obter todos os filtros disponíveis"""
    if 'user_id' not in session:
        return jsonify({'error': 'Não autenticado'}), 401
    
    try:
        filtros = get_filtros_api()
        return jsonify(filtros)
    except Exception as e:
        logger.error(f"Erro ao carregar filtros: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/transacoes/buscar', methods=['POST'])
def api_buscar_transacoes():
    """API para buscar transações com filtros aplicados"""
    if 'user_id' not in session:
        return jsonify({'error': 'Não autenticado'}), 401
    
    try:
        # Receber filtros do frontend
        data = request.get_json() or {}
        filtros = data.get('filtros', {})
        page = data.get('page', 1)
        per_page = min(data.get('per_page', 50), 500)  # Máximo 500 por página
        
        # Executar busca
        resultado = executar_query_filtrada(filtros, page, per_page)
        
        return jsonify(resultado)
        
    except Exception as e:
        logger.error(f"Erro na busca de transações: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/transacoes/kpis', methods=['POST'])
def api_kpis_filtrados():
    """API para obter apenas os KPIs baseados nos filtros"""
    if 'user_id' not in session:
        return jsonify({'error': 'Não autenticado'}), 401
    
    try:
        data = request.get_json() or {}
        filtros = data.get('filtros', {})
        
        # Executar apenas para obter KPIs (página 1, 1 resultado)
        resultado = executar_query_filtrada(filtros, page=1, per_page=1)
        
        return jsonify(resultado['kpis'])
        
    except Exception as e:
        logger.error(f"Erro ao calcular KPIs: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/transacoes/kpis-globais', methods=['GET'])
def api_kpis_globais():
    """KPIs de TODAS as transações (valores absolutos globais)"""
    if 'user_id' not in session:
        return jsonify({'error': 'Não autenticado'}), 401
    
    try:
        conn = sqlite3.connect('selleta_main.db')
        cursor = conn.cursor()
        
        # Query otimizada para agregações globais
        cursor.execute('''
            SELECT 
                COUNT(*) as total_transacoes,
                COUNT(CASE WHEN tipo = 'Entrada' THEN 1 END) as count_receitas,
                COUNT(CASE WHEN tipo = 'Saída' THEN 1 END) as count_despesas,
                COALESCE(SUM(CASE WHEN tipo = 'Entrada' THEN valor ELSE 0 END), 0) as total_receitas,
                COALESCE(SUM(CASE WHEN tipo = 'Saída' THEN valor ELSE 0 END), 0) as total_despesas,
                MIN(data_vencimento) as data_inicial,
                MAX(data_vencimento) as data_final
            FROM transacoes
        ''')
        
        result = cursor.fetchone()
        conn.close()
        
        if not result:
            return jsonify({
                'total_transacoes': 0,
                'count_receitas': 0,
                'count_despesas': 0,
                'total_receitas': 0,
                'total_despesas': 0,
                'saldo': 0,
                'tipo': 'global'
            })
        
        total_receitas = float(result[3] or 0)
        total_despesas = float(result[4] or 0)
        saldo = total_receitas - total_despesas
        
        return jsonify({
            'total_transacoes': result[0] or 0,
            'count_receitas': result[1] or 0, 
            'count_despesas': result[2] or 0,
            'total_receitas': total_receitas,
            'total_despesas': total_despesas,
            'saldo': saldo,
            'data_inicial': result[5],
            'data_final': result[6],
            'tipo': 'global'
        })
        
    except Exception as e:
        logger.error(f"Erro ao calcular KPIs globais: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/fornecedores/buscar', methods=['POST'])
def api_buscar_fornecedores():
    """API para busca de fornecedores com aproximação"""
    if 'user_id' not in session:
        return jsonify({'error': 'Não autenticado'}), 401
    
    try:
        data = request.get_json() or {}
        termo_busca = data.get('termo', '').strip()
        tipo_filtro = data.get('tipo', '')
        limite = data.get('limite', 50)
        
        conn = sqlite3.connect('selleta_main.db')
        cursor = conn.cursor()
        
        # Query base
        query = '''
            SELECT id, nome, tipo_fornecedor, 
                   valor_total_movimentado, total_transacoes
            FROM fornecedores 
            WHERE ativo = 1
        '''
        params = []
        
        # Filtro por tipo
        if tipo_filtro:
            query += ' AND tipo_fornecedor = ?'
            params.append(tipo_filtro)
        
        # Busca por aproximação
        if termo_busca:
            query += ' AND (nome LIKE ? OR nome LIKE ? OR nome LIKE ?)'
            params.extend([
                f'%{termo_busca}%',           # Contém o termo
                f'{termo_busca}%',            # Começa com o termo
                f'%{termo_busca.replace(" ", "%")}%'  # Palavras separadas
            ])
        
        # Ordenação: primeiro por relevância (movimentação), depois alfabética
        query += '''
            ORDER BY 
                CASE 
                    WHEN nome LIKE ? THEN 1
                    WHEN nome LIKE ? THEN 2
                    ELSE 3
                END,
                valor_total_movimentado DESC,
                nome ASC
            LIMIT ?
        '''
        
        # Adicionar parâmetros de ordenação
        if termo_busca:
            params.extend([f'{termo_busca}%', f'%{termo_busca}%'])
        else:
            params.extend(['', ''])  # Valores vazios para quando não há busca
        
        params.append(limite)
        
        cursor.execute(query, params)
        resultados = cursor.fetchall()
        
        fornecedores = []
        for row in resultados:
            fornecedores.append({
                'id': row[0],
                'nome': row[1],
                'tipo': row[2],
                'valor_movimentado': float(row[3] or 0),
                'total_transacoes': row[4] or 0,
                'label': f"{row[1]} ({row[2]})",
                'value': row[0]
            })
        
        conn.close()
        
        return jsonify({
            'fornecedores': fornecedores,
            'total': len(fornecedores),
            'termo_busca': termo_busca
        })
        
    except Exception as e:
        logger.error(f"Erro na busca de fornecedores: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/centros-custo', methods=['GET'])
def api_get_centros_custo():
    """Retorna lista de centros de custo para selects"""
    if 'user_id' not in session:
        return jsonify({'success': False, 'message': 'Não autenticado'}), 401
    
    try:
        conn = sqlite3.connect('selleta_main.db')
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT id, centro_custo_original, mascara_cc, tipologia
            FROM centros_custo
            WHERE ativo = 1
            ORDER BY mascara_cc, centro_custo_original
        """)
        
        centros = []
        for row in cursor.fetchall():
            centros.append({
                'id': row[0],
                'nome': row[1],
                'mascara_cc': row[2] or '',
                'tipologia': row[3] or ''
            })
        
        conn.close()
        
        return jsonify({
            'success': True,
            'data': centros
        })
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/centros-custo/detalhes', methods=['GET'])
def api_detalhes_centros_custo():
    """API para obter detalhes dos centros de custo com informações de empresas"""
    if 'user_id' not in session:
        return jsonify({'error': 'Não autenticado'}), 401
    
    try:
        conn = sqlite3.connect('selleta_main.db')
        cursor = conn.cursor()
        
        # Buscar centros únicos com contagem de empresas e transações
        cursor.execute('''
            SELECT 
                cc.mascara_cc,
                cc.tipologia,
                COUNT(DISTINCT cc.empresa_id) as total_empresas,
                COUNT(DISTINCT cc.id) as total_registros,
                COUNT(DISTINCT t.id) as total_transacoes,
                GROUP_CONCAT(DISTINCT e.nome) as nomes_empresas
            FROM centros_custo cc
            LEFT JOIN empresas e ON cc.empresa_id = e.id
            LEFT JOIN transacoes t ON t.centro_custo_id = cc.id
            WHERE cc.ativo = 1 AND cc.mascara_cc IS NOT NULL
            GROUP BY cc.mascara_cc, cc.tipologia
            ORDER BY cc.tipologia, cc.mascara_cc
        ''')
        
        centros = []
        for row in cursor.fetchall():
            centros.append({
                'nome': row[0],
                'tipologia': row[1] or 'Não definido',
                'total_empresas': row[2],
                'total_registros': row[3],
                'total_transacoes': row[4] or 0,
                'empresas': row[5].split(',') if row[5] else [],
                'label': f"{row[0]} ({row[2]} empresa{'s' if row[2] > 1 else ''}, {row[4] or 0} transações)"
            })
        
        conn.close()
        
        return jsonify({
            'centros': centros,
            'total': len(centros)
        })
        
    except Exception as e:
        logger.error(f"Erro ao buscar detalhes dos centros de custo: {e}")
        return jsonify({'error': str(e)}), 500

# ==========================================
# ROTAS DE DEBUG
# ==========================================

@app.route('/debug/teste-kpis')
def debug_teste_kpis():
    """Página de teste isolado para debug dos KPIs"""
    with open('debug/teste_isolado_kpis.html', 'r', encoding='utf-8') as f:
        return f.read()

@app.route('/debug/javascript')
def debug_javascript():
    """Página de debug completo do JavaScript"""
    with open('debug/debug_javascript.html', 'r', encoding='utf-8') as f:
        return f.read()

# ==========================================
# APIS DE EDIÇÃO DE TRANSAÇÕES
# ==========================================

from api_transacao_edicao import (
    get_transacao_detalhes, atualizar_transacao, realizar_baixa_transacao,
    criar_nova_transacao, buscar_transacoes_edicao, get_historico_transacao,
    estornar_baixa
)

@app.route('/api/transacao/<int:transacao_id>', methods=['GET'])
def api_get_transacao_detalhes(transacao_id):
    """Retorna dados completos de uma transação"""
    if 'user_id' not in session:
        return jsonify({'success': False, 'message': 'Não autenticado'}), 401
    
    result = get_transacao_detalhes(transacao_id)
    return jsonify(result)

@app.route('/api/transacao/<int:transacao_id>', methods=['PUT'])
def api_editar_transacao(transacao_id):
    """Atualiza uma transação existente"""
    if 'user_id' not in session:
        return jsonify({'success': False, 'message': 'Não autenticado'}), 401
    
    try:
        dados = request.get_json()
        result = atualizar_transacao(transacao_id, dados)
        return jsonify(result)
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/transacao', methods=['POST'])
def api_nova_transacao():
    """Cria uma nova transação"""
    if 'user_id' not in session:
        return jsonify({'success': False, 'message': 'Não autenticado'}), 401
    
    try:
        dados = request.get_json()
        result = criar_nova_transacao(dados)
        return jsonify(result)
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/transacao/<int:transacao_id>/baixa', methods=['POST'])
def api_realizar_baixa(transacao_id):
    """Realiza baixa de uma transação"""
    if 'user_id' not in session:
        return jsonify({'success': False, 'message': 'Não autenticado'}), 401
    
    try:
        dados_baixa = request.get_json()
        result = realizar_baixa_transacao(transacao_id, dados_baixa)
        return jsonify(result)
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/transacao/<int:transacao_id>/estornar', methods=['POST'])
def api_estornar_baixa(transacao_id):
    """Estorna uma baixa realizada (apenas ADM)"""
    if 'user_id' not in session:
        return jsonify({'success': False, 'message': 'Não autenticado'}), 401
    
    try:
        result = estornar_baixa(transacao_id)
        return jsonify(result)
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/transacao/<int:transacao_id>/historico', methods=['GET'])
def api_get_historico_transacao(transacao_id):
    """Retorna histórico de alterações de uma transação"""
    if 'user_id' not in session:
        return jsonify({'success': False, 'message': 'Não autenticado'}), 401
    
    result = get_historico_transacao(transacao_id)
    return jsonify(result)

@app.route('/api/transacoes/buscar-edicao', methods=['POST'])
def api_buscar_transacoes_edicao():
    """Busca transações para edição com filtros específicos"""
    if 'user_id' not in session:
        return jsonify({'success': False, 'message': 'Não autenticado'}), 401
    
    try:
        filtros = request.get_json() or {}
        result = buscar_transacoes_edicao(filtros)
        return jsonify(result)
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/plano-financeiro', methods=['GET'])
def api_get_planos_financeiros():
    """Retorna lista de planos financeiros para selects"""
    if 'user_id' not in session:
        return jsonify({'success': False, 'message': 'Não autenticado'}), 401
    
    try:
        conn = sqlite3.connect('selleta_main.db')
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT id, codigo, nome, nivel
            FROM plano_financeiro
            WHERE ativo = 1
            ORDER BY codigo
        """)
        
        planos = []
        for row in cursor.fetchall():
            planos.append({
                'id': row[0],
                'codigo': row[1],
                'nome': row[2],
                'nivel': row[3]
            })
        
        conn.close()
        
        return jsonify({
            'success': True,
            'data': planos
        })
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/contas-bancarias', methods=['GET'])
def api_get_contas_bancarias():
    """Retorna lista de contas bancárias para selects"""
    if 'user_id' not in session:
        return jsonify({'success': False, 'message': 'Não autenticado'}), 401
    
    try:
        conn = sqlite3.connect('selleta_main.db')
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT id, banco, agencia, conta_corrente, tipo_conta, status_conta
            FROM conta_bancaria
            WHERE status_conta = 'Ativa' AND ativo = 1
            ORDER BY banco, conta_corrente
        """)
        
        contas = []
        for row in cursor.fetchall():
            contas.append({
                'id': row[0],
                'banco': row[1] or '',
                'agencia': row[2] or '',
                'conta': row[3] or '',
                'tipo': row[4] or '',
                'status': row[5] or ''
            })
        
        conn.close()
        
        return jsonify({
            'success': True,
            'data': contas
        })
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

# ==========================================
# ROTA PARA PÁGINA DE EDIÇÃO
# ==========================================

@app.route('/editar-transacao')
@app.route('/editar-transacao/<int:transacao_id>')
def editar_transacao(transacao_id=None):
    """Página de edição de transações"""
    if 'user_id' not in session:
        flash('error', 'Você não está autenticado.')
        return redirect(url_for('index'))
    
    return render_template('editar_transacao.html', transacao_id=transacao_id)

if __name__ == '__main__':
    app.run(debug=True)
