import csv
import re
from pathlib import Path
from collections import OrderedDict

def extrair_codigo_numerico(texto):
    """Extrai o código numérico do início do texto do plano financeiro"""
    if not texto or texto == '':
        return None
    # Procura por padrão como "2.01.01.01 - " no início
    match = re.match(r'^([\d\.]+)\s*-\s*', str(texto))
    if match:
        return match.group(1)
    return None

def extrair_nome_plano(texto):
    """Extrai apenas o nome do plano, removendo o código"""
    if not texto or texto == '':
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
    
    # Ler o CSV e extrair planos únicos
    planos_unicos = []
    planos_set = set()  # Para verificar duplicatas
    
    with open(input_file, 'r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        
        for row in reader:
            # Extrair os 4 graus
            grau1 = row.get('## P.F Grau 1', '').strip()
            grau2 = row.get('## PF Grau 2', '').strip()
            grau3 = row.get('## PF Grau 3', '').strip()
            grau4 = row.get('## Plano Financeiro _ Final', '').strip()
            
            # Criar tupla para verificar unicidade
            plano_tuple = (grau1, grau2, grau3, grau4)
            
            # Se não é duplicata e tem pelo menos um valor
            if plano_tuple not in planos_set and any(plano_tuple):
                planos_set.add(plano_tuple)
                planos_unicos.append({
                    'grau1': grau1,
                    'grau2': grau2,
                    'grau3': grau3,
                    'grau4': grau4
                })
    
    # Ordenar por hierarquia
    def sort_key(plano):
        return (
            extrair_codigo_numerico(plano['grau1']) or '',
            extrair_codigo_numerico(plano['grau2']) or '',
            extrair_codigo_numerico(plano['grau3']) or '',
            extrair_codigo_numerico(plano['grau4']) or ''
        )
    
    planos_unicos.sort(key=sort_key)
    
    # Estatísticas
    print("\n=== ESTATÍSTICAS ===")
    print(f"Total de combinações únicas: {len(planos_unicos)}")
    
    # Contar únicos por grau
    graus_unicos = {1: set(), 2: set(), 3: set(), 4: set()}
    for plano in planos_unicos:
        for i, grau in enumerate(['grau1', 'grau2', 'grau3', 'grau4'], 1):
            if plano[grau]:
                graus_unicos[i].add(plano[grau])
    
    for i in range(1, 5):
        print(f"Planos de Grau {i} únicos: {len(graus_unicos[i])}")
    
    # Mostrar exemplos
    print("\n=== EXEMPLOS DE HIERARQUIA ===")
    grau1_mostrados = set()
    for plano in planos_unicos[:20]:
        if plano['grau1'] and plano['grau1'] not in grau1_mostrados:
            grau1_mostrados.add(plano['grau1'])
            print(f"\nGrau 1: {extrair_codigo_numerico(plano['grau1'])} - {extrair_nome_plano(plano['grau1'])}")
            
            # Mostrar alguns graus 2 deste grau 1
            grau2_count = 0
            for p2 in planos_unicos:
                if p2['grau1'] == plano['grau1'] and p2['grau2'] and grau2_count < 2:
                    print(f"  Grau 2: {extrair_codigo_numerico(p2['grau2'])} - {extrair_nome_plano(p2['grau2'])}")
                    grau2_count += 1
            
            if len(grau1_mostrados) >= 3:
                break
    
    # Escrever o CSV de saída
    with open(output_file, 'w', encoding='utf-8-sig', newline='') as f:
        fieldnames = [
            'id',
            'id_pf_h1', 'plano_financeiro_hierarquia_1',
            'id_pf_h2', 'plano_financeiro_hierarquia_2',
            'id_pf_h3', 'plano_financeiro_hierarquia_3',
            'id_pf_h4', 'plano_financeiro_hierarquia_4'
        ]
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        
        for idx, plano in enumerate(planos_unicos, 1):
            row = {
                'id': idx,
                'id_pf_h1': extrair_codigo_numerico(plano['grau1']),
                'plano_financeiro_hierarquia_1': extrair_nome_plano(plano['grau1']),
                'id_pf_h2': extrair_codigo_numerico(plano['grau2']),
                'plano_financeiro_hierarquia_2': extrair_nome_plano(plano['grau2']),
                'id_pf_h3': extrair_codigo_numerico(plano['grau3']),
                'plano_financeiro_hierarquia_3': extrair_nome_plano(plano['grau3']),
                'id_pf_h4': extrair_codigo_numerico(plano['grau4']),
                'plano_financeiro_hierarquia_4': extrair_nome_plano(plano['grau4'])
            }
            writer.writerow(row)
    
    print(f"\n✅ Arquivo salvo em: {output_file}")
    
    # Mostrar primeiras linhas
    print("\n=== PRIMEIRAS 10 LINHAS ===")
    with open(output_file, 'r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        for i, row in enumerate(reader):
            if i >= 10:
                break
            print(f"{row['id']}: {row['id_pf_h1']} | {row['id_pf_h2']} | {row['id_pf_h3']} | {row['id_pf_h4']}")

if __name__ == "__main__":
    main()