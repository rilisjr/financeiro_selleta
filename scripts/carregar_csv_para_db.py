import sqlite3
import csv
import os
from datetime import datetime

def criar_estrutura_banco(cursor):
    """Recria a estrutura do banco de dados"""
    
    # Criar tabela de usuários
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS usuarios (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL,
            senha TEXT NOT NULL
        )
    ''')
    
    # Criar tabela de transações
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

def limpar_banco(cursor):
    """Remove todas as tabelas existentes"""
    
    # Obter lista de todas as tabelas
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';")
    tabelas = cursor.fetchall()
    
    # Excluir cada tabela
    for tabela in tabelas:
        cursor.execute(f"DROP TABLE IF EXISTS {tabela[0]}")
        print(f"Tabela {tabela[0]} removida")

def carregar_csv_para_banco():
    """Carrega dados do CSV para o banco SQLite, sobrescrevendo completamente"""
    
    # Caminhos dos arquivos
    db_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'selleta.db')
    csv_path = os.path.join(os.path.dirname(__file__), 'banco de dados.csv')
    
    # Verificar se o CSV existe
    if not os.path.exists(csv_path):
        print(f"Erro: Arquivo CSV não encontrado em {csv_path}")
        return
    
    try:
        print(f"Conectando ao banco: {db_path}")
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Fazer backup do banco atual (opcional)
        backup_path = db_path + f".backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        if os.path.exists(db_path):
            import shutil
            shutil.copy2(db_path, backup_path)
            print(f"Backup criado: {backup_path}")
        
        # Limpar banco existente
        print("Limpando banco de dados...")
        limpar_banco(cursor)
        
        # Recriar estrutura
        print("Recriando estrutura do banco...")
        criar_estrutura_banco(cursor)
        
        # Ler arquivo CSV
        print("Lendo arquivo CSV...")
        with open(csv_path, 'r', encoding='utf-8') as csvfile:
            reader = csv.reader(csvfile, delimiter=';')
            
            tabela_atual = None
            colunas = []
            
            for linha in reader:
                if not linha or not linha[0]:  # Linha vazia
                    continue
                
                # Identificar início de uma nova tabela
                if linha[0].startswith('=== TABELA:'):
                    tabela_atual = linha[0].split(':')[1].strip().replace(' ===', '').lower()
                    print(f"Processando tabela: {tabela_atual}")
                    continue
                
                # Pular header do arquivo
                if linha[0].startswith('EXPORT NIK0FINANCE'):
                    continue
                
                # Capturar nomes das colunas
                if tabela_atual and not linha[0].isdigit():
                    colunas = linha
                    continue
                
                # Inserir dados
                if tabela_atual and linha[0].isdigit():
                    if tabela_atual == 'usuarios':
                        cursor.execute(
                            "INSERT INTO usuarios (id, username, senha) VALUES (?, ?, ?)",
                            linha
                        )
                    elif tabela_atual == 'transacoes':
                        cursor.execute(
                            "INSERT INTO transacoes (id, origem, descricao, tipo, valor, modelo, data) VALUES (?, ?, ?, ?, ?, ?, ?)",
                            linha
                        )
        
        # Commit das mudanças
        conn.commit()
        
        # Verificar dados importados
        cursor.execute("SELECT COUNT(*) FROM usuarios")
        usuarios_count = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM transacoes")
        transacoes_count = cursor.fetchone()[0]
        
        conn.close()
        
        print(f"\n✅ Importação concluída com sucesso!")
        print(f"Usuários importados: {usuarios_count}")
        print(f"Transações importadas: {transacoes_count}")
        print(f"Banco de dados atualizado: {db_path}")
        
    except Exception as e:
        print(f"❌ Erro durante a importação: {str(e)}")
        if 'conn' in locals():
            conn.rollback()
            conn.close()

if __name__ == "__main__":
    print("=== CARREGAR CSV PARA BANCO ===")
    
    # Confirmação de segurança
    resposta = input("⚠️  ATENÇÃO: Esta operação irá SOBRESCREVER completamente o banco de dados.\nDeseja continuar? (s/N): ")
    
    if resposta.lower() in ['s', 'sim', 'y', 'yes']:
        print("Iniciando importação...")
        carregar_csv_para_banco()
    else:
        print("Operação cancelada pelo usuário.")