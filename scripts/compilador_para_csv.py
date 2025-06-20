import sqlite3
import csv
import os
from datetime import datetime

def exportar_banco_para_csv():
    # Caminho para o banco de dados (pasta pai)
    db_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'selleta.db')
    csv_path = os.path.join(os.path.dirname(__file__), 'banco de dados.csv')
    
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
        
        print(f"Tabelas encontradas: {[t[0] for t in tabelas]}")
        
        # Criar arquivo CSV
        with open(csv_path, 'w', newline='', encoding='utf-8') as csvfile:
            writer = csv.writer(csvfile, delimiter=';')
            
            # Header do arquivo
            writer.writerow([f'EXPORT NIK0FINANCE - {datetime.now().strftime("%d/%m/%Y %H:%M:%S")}'])
            writer.writerow([])
            
            # Exportar cada tabela
            for tabela in tabelas:
                nome_tabela = tabela[0]
                
                # Pular tabelas do sistema SQLite
                if nome_tabela.startswith('sqlite_'):
                    continue
                
                print(f"Exportando tabela: {nome_tabela}")
                
                # Obter estrutura da tabela
                cursor.execute(f"PRAGMA table_info({nome_tabela})")
                colunas = cursor.fetchall()
                nomes_colunas = [col[1] for col in colunas]
                
                # Header da tabela
                writer.writerow([f'=== TABELA: {nome_tabela.upper()} ==='])
                writer.writerow(nomes_colunas)
                
                # Dados da tabela
                cursor.execute(f"SELECT * FROM {nome_tabela}")
                dados = cursor.fetchall()
                
                for linha in dados:
                    writer.writerow(linha)
                
                writer.writerow([])  # Linha em branco entre tabelas
                print(f"  → {len(dados)} registros exportados")
        
        conn.close()
        print(f"\nExportação concluída! Arquivo salvo em: {csv_path}")
        print(f"Total de tabelas exportadas: {len([t for t in tabelas if not t[0].startswith('sqlite_')])}")
        
    except Exception as e:
        print(f"Erro durante a exportação: {str(e)}")

if __name__ == "__main__":
    print("=== COMPILADOR BANCO PARA CSV ===")
    print("Iniciando exportação do banco selleta.db...")
    exportar_banco_para_csv()