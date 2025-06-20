import sqlite3
import os

def verificar_banco():
    """Verifica o conteúdo atual do banco de dados"""
    
    db_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'selleta.db')
    
    if not os.path.exists(db_path):
        print(f"❌ Banco não encontrado: {db_path}")
        return
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        print("=== VERIFICAÇÃO DO BANCO ===")
        print(f"Arquivo: {db_path}")
        print()
        
        # Verificar tabelas existentes
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tabelas = cursor.fetchall()
        print(f"Tabelas encontradas: {[t[0] for t in tabelas]}")
        print()
        
        # Verificar usuários
        print("=== TABELA USUARIOS ===")
        cursor.execute("SELECT COUNT(*) FROM usuarios")
        count_usuarios = cursor.fetchone()[0]
        print(f"Total de usuários: {count_usuarios}")
        
        if count_usuarios > 0:
            cursor.execute("SELECT id, username FROM usuarios")
            usuarios = cursor.fetchall()
            for user in usuarios:
                print(f"  ID: {user[0]} | Username: {user[1]}")
        print()
        
        # Verificar transações
        print("=== TABELA TRANSACOES ===")
        cursor.execute("SELECT COUNT(*) FROM transacoes")
        count_transacoes = cursor.fetchone()[0]
        print(f"Total de transações: {count_transacoes}")
        
        if count_transacoes > 0:
            cursor.execute("SELECT id, origem, descricao, tipo, valor, modelo, data FROM transacoes")
            transacoes = cursor.fetchall()
            for trans in transacoes:
                print(f"  ID: {trans[0]} | {trans[1]} | {trans[2]} | {trans[3]} | R${trans[4]} | {trans[5]} | {trans[6]}")
        
        conn.close()
        
    except Exception as e:
        print(f"❌ Erro ao verificar banco: {str(e)}")

if __name__ == "__main__":
    verificar_banco()