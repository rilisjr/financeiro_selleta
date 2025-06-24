from flask import Flask, render_template, request, redirect, url_for, flash, session, jsonify
from werkzeug.security import check_password_hash, generate_password_hash
import sqlite3
import os

app = Flask(__name__)
app.secret_key = os.urandom(24)

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
        # Por enquanto, vamos retornar dados estáticos até implementarmos as novas transações
        return render_template('dashboard_novo.html')
        
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

# ====== ROTAS FUTURAS (PLACEHOLDER) ======

@app.route('/clientes_fornecedores')
def clientes_fornecedores():
    if 'user_id' not in session:
        flash('error', 'Você não está autenticado.')
        return redirect(url_for('index'))
    flash('info', 'Clientes/Fornecedores - Em desenvolvimento')
    return redirect(url_for('dashboard'))

@app.route('/conta_bancaria')
def conta_bancaria():
    if 'user_id' not in session:
        flash('error', 'Você não está autenticado.')
        return redirect(url_for('index'))
    flash('info', 'Contas Bancárias - Em desenvolvimento')
    return redirect(url_for('dashboard'))

@app.route('/transacoes')
def transacoes():
    if 'user_id' not in session:
        flash('error', 'Você não está autenticado.')
        return redirect(url_for('index'))
    flash('info', 'Gestão de Transações - Em desenvolvimento')
    return redirect(url_for('dashboard'))

@app.route('/nova_transacao')
def nova_transacao():
    if 'user_id' not in session:
        flash('error', 'Você não está autenticado.')
        return redirect(url_for('index'))
    flash('info', 'Nova Transação - Em desenvolvimento')
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

if __name__ == '__main__':
    app.run(debug=True)
