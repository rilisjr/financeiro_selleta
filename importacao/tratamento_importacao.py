import csv
import os
from datetime import datetime

def ler_colunas_csv(nome_arquivo='b_dados_2.csv'):
    """
    Lê um arquivo CSV e retorna os nomes das colunas (primeira linha)
    """
    # Caminho completo do arquivo
    arquivo_path = os.path.join(os.path.dirname(__file__), nome_arquivo)
    
    # Verificar se o arquivo existe
    if not os.path.exists(arquivo_path):
        print(f"❌ Erro: Arquivo '{nome_arquivo}' não encontrado no diretório /importacao")
        print(f"Caminho esperado: {arquivo_path}")
        return None
    
    try:
        # Abrir e ler o arquivo CSV
        with open(arquivo_path, 'r', encoding='utf-8') as csvfile:
            # Detectar o delimitador automaticamente
            sample = csvfile.read(1024)
            csvfile.seek(0)
            
            # Tentar detectar o delimitador
            delimiter = ';'  # Padrão usado nos exports
            if ',' in sample and ';' not in sample:
                delimiter = ','
            elif '\t' in sample:
                delimiter = '\t'
            
            # Criar o leitor CSV
            reader = csv.reader(csvfile, delimiter=delimiter)
            
            # Ler a primeira linha (cabeçalho com nomes das colunas)
            colunas = next(reader, None)
            
            if colunas:
                print(f"✅ Arquivo '{nome_arquivo}' lido com sucesso!")
                print(f"📊 Delimitador detectado: '{delimiter}'")
                print(f"📋 Total de colunas: {len(colunas)}")
                print("\n🔤 Nomes das colunas:")
                print("-" * 50)
                for i, coluna in enumerate(colunas, 1):
                    print(f"{i:2d}. {coluna}")
                print("-" * 50)
                
                return colunas
            else:
                print(f"⚠️ Aviso: O arquivo '{nome_arquivo}' está vazio ou não possui cabeçalho")
                return []
                
    except Exception as e:
        print(f"❌ Erro ao ler o arquivo: {str(e)}")
        return None

def main():
    """
    Função principal do script
    """
    print("=== TRATAMENTO DE IMPORTAÇÃO ===")
    print(f"Data/Hora: {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}")
    print("")
    
    # Ler as colunas do arquivo CSV
    colunas = ler_colunas_csv()
    
    if colunas:
        print(f"\n✅ Processamento concluído com sucesso!")
    else:
        print(f"\n❌ Falha no processamento do arquivo")

if __name__ == "__main__":
    main()