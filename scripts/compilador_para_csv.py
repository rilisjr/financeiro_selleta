import sqlite3
import csv
import os
from datetime import datetime

def exportar_tabela_para_csv(cursor, nome_tabela, csv_filename):
    """Exporta uma tabela específica para um arquivo CSV"""
    csv_path = os.path.join(os.path.dirname(__file__), csv_filename)
    
    try:
        # Obter estrutura da tabela
        cursor.execute(f"PRAGMA table_info({nome_tabela})")
        colunas = cursor.fetchall()
        nomes_colunas = [col[1] for col in colunas]
        
        # Criar arquivo CSV
        with open(csv_path, 'w', newline='', encoding='utf-8') as csvfile:
            writer = csv.writer(csvfile, delimiter=';')
            
            # Header da tabela (nomes das colunas)
            writer.writerow(nomes_colunas)
            
            # Dados da tabela
            cursor.execute(f"SELECT * FROM {nome_tabela}")
            dados = cursor.fetchall()
            
            for linha in dados:
                writer.writerow(linha)
            
            print(f"  → {len(dados)} registros exportados para {csv_filename}")
            return True
            
    except Exception as e:
        print(f"Erro ao exportar {nome_tabela}: {str(e)}")
        return False

def exportar_banco_para_csv():
    # Caminho para o banco de dados (pasta pai)
    db_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'selleta.db')
    
    # Verificar se o banco existe
    if not os.path.exists(db_path):
        print(f"Erro: Banco de dados não encontrado em {db_path}")
        return
    
    try:
        # Conectar ao banco SQLite
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Obter estrutura das tabelas
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tabelas = cursor.fetchall()
        
        tabelas_filtradas = [t[0] for t in tabelas if not t[0].startswith('sqlite_')]
        print(f"Tabelas encontradas: {tabelas_filtradas}")
        
        # Exportar tabela de usuários
        if 'usuarios' in tabelas_filtradas:
            print("\nExportando tabela: usuarios")
            exportar_tabela_para_csv(cursor, 'usuarios', 'usuarios.csv')
        
        # Exportar tabela de transações
        if 'transacoes' in tabelas_filtradas:
            print("\nExportando tabela: transacoes")
            exportar_tabela_para_csv(cursor, 'transacoes', 'transacoes.csv')
        
        # Exportar também um arquivo consolidado com todas as tabelas
        print("\nCriando arquivo consolidado...")
        csv_path = os.path.join(os.path.dirname(__file__), 'banco_completo.csv')
        
        with open(csv_path, 'w', newline='', encoding='utf-8') as csvfile:
            writer = csv.writer(csvfile, delimiter=';')
            
            # Exportar cada tabela
            for i, nome_tabela in enumerate(tabelas_filtradas):
                print(f"  → Adicionando tabela {nome_tabela} ao arquivo consolidado")
                
                # Obter estrutura da tabela
                cursor.execute(f"PRAGMA table_info({nome_tabela})")
                colunas = cursor.fetchall()
                nomes_colunas = [col[1] for col in colunas]
                
                # Separador visual entre tabelas (se não for a primeira)
                if i > 0:
                    writer.writerow([])  # Linha em branco
                    writer.writerow([f'=== TABELA: {nome_tabela.upper()} ==='])
                
                # Header da tabela
                writer.writerow(nomes_colunas)
                
                # Dados da tabela
                cursor.execute(f"SELECT * FROM {nome_tabela}")
                dados = cursor.fetchall()
                
                for linha in dados:
                    writer.writerow(linha)
                
                writer.writerow([])  # Linha em branco entre tabelas
        
        conn.close()
        
        print(f"\n✅ Exportação concluída!")
        print(f"Arquivos criados:")
        print(f"  - usuarios.csv")
        print(f"  - transacoes.csv") 
        print(f"  - banco_completo.csv")
        print(f"Total de tabelas processadas: {len(tabelas_filtradas)}")
        
    except Exception as e:
        print(f"Erro durante a exportação: {str(e)}")

if __name__ == "__main__":
    print("=== COMPILADOR BANCO PARA CSV ===")
    print("Iniciando exportação do banco selleta.db...")
    exportar_banco_para_csv()