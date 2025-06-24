import pandas as pd
import re
from pathlib import Path

def extrair_codigo_numerico(texto):
    """Extrai o código numérico do início do texto do plano financeiro"""
    if pd.isna(texto) or texto == '':
        return None
    # Procura por padrão como "2.01.01.01 - " no início
    match = re.match(r'^([\d\.]+)\s*-\s*', str(texto))
    if match:
        return match.group(1)
    return None

def extrair_nome_plano(texto):
    """Extrai apenas o nome do plano, removendo o código"""
    if pd.isna(texto) or texto == '':
        return None
    # Remove o código numérico do início
    texto_limpo = re.sub(r'^[\d\.]+\s*-\s*', '', str(texto))
    return texto_limpo.strip()

def main():
    # Caminho do arquivo
    base_path = Path(__file__).parent.parent
    input_file = base_path / 'importacao' / 'b_dados_transacoes.csv'
    output_file = base_path / 'importacao' / 'b_dados_plano_financeiro.csv'
    
    print(f"Lendo arquivo: {input_file}")
    
    # Ler o CSV
    df = pd.read_csv(input_file, encoding='utf-8-sig')
    
    # Colunas de interesse
    colunas_plano = ['## P.F Grau 1', '## PF Grau 2', '## PF Grau 3', '## Plano Financeiro _ Final']
    
    # Criar DataFrame apenas com as colunas de plano financeiro
    df_planos = df[colunas_plano].copy()
    
    # Renomear colunas para facilitar
    df_planos.columns = ['grau1', 'grau2', 'grau3', 'grau4']
    
    # Remover duplicatas considerando todas as colunas
    df_planos_unicos = df_planos.drop_duplicates()
    
    # Remover linhas onde todos os valores são NaN
    df_planos_unicos = df_planos_unicos.dropna(how='all')
    
    # Criar o DataFrame final com a estrutura solicitada
    resultado = pd.DataFrame()
    
    # ID sequencial
    resultado['id'] = range(1, len(df_planos_unicos) + 1)
    
    # Extrair códigos e nomes para cada grau
    for i in range(1, 5):
        grau = f'grau{i}'
        # ID do plano (código numérico)
        resultado[f'id_pf_h{i}'] = df_planos_unicos[grau].apply(extrair_codigo_numerico)
        # Nome do plano
        resultado[f'plano_financeiro_hierarquia_{i}'] = df_planos_unicos[grau].apply(extrair_nome_plano)
    
    # Ordenar por hierarquia (códigos)
    resultado = resultado.sort_values(by=['id_pf_h1', 'id_pf_h2', 'id_pf_h3', 'id_pf_h4'], 
                                      na_position='first')
    
    # Resetar o ID após ordenação
    resultado['id'] = range(1, len(resultado) + 1)
    
    # Estatísticas
    print("\n=== ESTATÍSTICAS ===")
    print(f"Total de combinações únicas: {len(resultado)}")
    print(f"\nPlanos de Grau 1 únicos: {resultado['id_pf_h1'].nunique()}")
    print(f"Planos de Grau 2 únicos: {resultado['id_pf_h2'].nunique()}")
    print(f"Planos de Grau 3 únicos: {resultado['id_pf_h3'].nunique()}")
    print(f"Planos de Grau 4 únicos: {resultado['id_pf_h4'].nunique()}")
    
    # Mostrar exemplos
    print("\n=== EXEMPLOS DE HIERARQUIA ===")
    # Pegar um exemplo de cada grau 1
    for grau1 in resultado['id_pf_h1'].dropna().unique()[:3]:
        exemplo = resultado[resultado['id_pf_h1'] == grau1].iloc[0]
        print(f"\nGrau 1: {grau1} - {exemplo['plano_financeiro_hierarquia_1']}")
        
        # Mostrar alguns graus 2 deste grau 1
        graus2 = resultado[(resultado['id_pf_h1'] == grau1) & 
                          (resultado['id_pf_h2'].notna())]['id_pf_h2'].unique()[:2]
        for grau2 in graus2:
            exemplo2 = resultado[(resultado['id_pf_h1'] == grau1) & 
                               (resultado['id_pf_h2'] == grau2)].iloc[0]
            print(f"  Grau 2: {grau2} - {exemplo2['plano_financeiro_hierarquia_2']}")
    
    # Salvar o CSV
    resultado.to_csv(output_file, index=False, encoding='utf-8-sig')
    print(f"\n✅ Arquivo salvo em: {output_file}")
    
    # Mostrar primeiras linhas
    print("\n=== PRIMEIRAS 10 LINHAS ===")
    print(resultado.head(10).to_string())
    
    return resultado

if __name__ == "__main__":
    main()