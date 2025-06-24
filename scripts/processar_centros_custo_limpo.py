#!/usr/bin/env python3
"""
Script para processar o CSV limpo de centros de custo
Adiciona colunas ID, categoria e expande tipologias
"""

import csv
import re
from pathlib import Path

def expandir_tipologia(tipologia):
    """Expande as siglas de tipologia para termos compreensíveis"""
    mapeamento = {
        'OE': 'Obra Empreendimento',
        'OP': 'Obra Privada', 
        'ADM': 'Administrativo',
        'Não definido': 'Não definido'
    }
    return mapeamento.get(tipologia, tipologia)

def analisar_categoria_centro_custo(centro_custo, empresa):
    """Analisa o centro de custo e determina sua categoria"""
    centro_lower = centro_custo.lower()
    empresa_numero = empresa.split(' - ')[0] if ' - ' in empresa else ''
    
    # Detectar padrões administrativos genéricos
    if any(term in centro_lower for term in ['administrativo', 'sede', 'administrato']):
        # Se tem sufixo específico da empresa, é nativo
        if any(sufixo in centro_custo for sufixo in ['43', '21', 'JNRR', 'Jatoba', 'RLS', 'Estrutura']):
            return 'nativo'
        # Se é genérico como "Sede" sem sufixo, é genérico
        elif centro_custo in ['Sede', 'Administrativo']:
            return 'genérico'
        else:
            return 'nativo'  # Administrativo específico da empresa
    
    # Detectar sufixos que indicam empresa específica
    sufixos_empresa = {
        'SEL 43': '1',
        'SELLETA 43': '1', 
        'SEL 21': '3',
        'JATOBA': '4',
        'jatoba': '4',
        'ESTRUTURA': '5',
        'PRE MOLDADO': '5'
    }
    
    for sufixo, emp_cod in sufixos_empresa.items():
        if sufixo in centro_custo:
            if empresa_numero == emp_cod:
                return 'nativo'  # Empresa dona do sufixo
            else:
                return 'dependente'  # Outras empresas usando
    
    # Analisar centros que aparecem em múltiplas empresas sem sufixo
    centros_multiplos = [
        'Residencial Jatoba', 'MT DIESEL', 'BMG', 'Residencial Ipes',
        'Enel Alto Araguaia', 'Galeria 02', 'Residencial Jacaranda',
        'Multifamiliar Heloisa', 'Canelas', 'Sede', 'Francisco',
        'Empresa pre moldado', 'Gilberto Bessane'
    ]
    
    for centro_mult in centros_multiplos:
        if centro_mult in centro_custo:
            # Lógica de determinação de empresa nativa por projeto
            if 'Jatoba' in centro_custo and empresa_numero == '4':
                return 'nativo'  # Residencial Jatoba SPE é dona dos projetos Jatoba
            elif 'MT DIESEL' in centro_custo and empresa_numero == '3':
                return 'nativo'  # Selleta Infraestrutura é nativa do MT DIESEL
            elif 'Galeria' in centro_custo and empresa_numero == '2':
                return 'nativo'  # JNRR é nativa das galerias
            elif 'Residencial Jacaranda' in centro_custo and empresa_numero == '2':
                return 'nativo'  # JNRR é nativa do Jacaranda
            elif 'Enel' in centro_custo and empresa_numero == '3':
                return 'nativo'  # Selleta Infraestrutura é nativa das obras Enel
            else:
                return 'dependente'
    
    # Caso padrão: empresa que usa é nativa
    return 'nativo'

def processar_csv_limpo():
    """Processa o CSV limpo adicionando ID e categoria"""
    base_path = Path(__file__).parent.parent
    input_file = base_path / 'importacao' / 'b_dados_centro_custo.csv'
    output_file = base_path / 'importacao' / 'b_dados_centro_custo_final.csv'
    
    print("🔄 Processando CSV limpo de centros de custo...")
    
    try:
        centros_processados = []
        
        # Ler CSV limpo
        with open(input_file, 'r', encoding='utf-8-sig') as f:
            reader = csv.DictReader(f)
            
            for i, row in enumerate(reader, 1):
                centro_custo = row['centro_custo'].strip()
                empresa = row['empresa'].strip()
                tipologia_original = row['tipologia'].strip()
                
                # Expandir tipologia
                tipologia_expandida = expandir_tipologia(tipologia_original)
                
                # Analisar categoria
                categoria = analisar_categoria_centro_custo(centro_custo, empresa)
                
                # Criar registro processado
                centro_processado = {
                    'id': i,
                    'centro_custo': centro_custo,
                    'empresa': empresa,
                    'tipologia': tipologia_expandida,
                    'categoria': categoria
                }
                
                centros_processados.append(centro_processado)
        
        # Salvar CSV final
        with open(output_file, 'w', encoding='utf-8-sig', newline='') as f:
            fieldnames = ['id', 'centro_custo', 'empresa', 'tipologia', 'categoria']
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            
            for centro in centros_processados:
                writer.writerow(centro)
        
        print(f"✅ CSV final gerado: {output_file}")
        print(f"📊 Total de registros: {len(centros_processados)}")
        
        # Estatísticas de categorias
        stats_categoria = {}
        stats_tipologia = {}
        
        for centro in centros_processados:
            categoria = centro['categoria']
            tipologia = centro['tipologia']
            
            stats_categoria[categoria] = stats_categoria.get(categoria, 0) + 1
            stats_tipologia[tipologia] = stats_tipologia.get(tipologia, 0) + 1
        
        print(f"\n📋 Distribuição por categoria:")
        for categoria, count in sorted(stats_categoria.items()):
            print(f"   {categoria}: {count} centros")
        
        print(f"\n📋 Distribuição por tipologia:")
        for tipologia, count in sorted(stats_tipologia.items()):
            print(f"   {tipologia}: {count} centros")
        
        # Preview das primeiras 10 linhas
        print(f"\n📄 Preview (primeiras 10 linhas):")
        print(f"{'ID':<3} | {'Centro de Custo':<35} | {'Empresa':<8} | {'Tipologia':<20} | {'Categoria':<12}")
        print("-" * 95)
        
        for centro in centros_processados[:10]:
            empresa_cod = centro['empresa'].split(' - ')[0]
            centro_nome = centro['centro_custo'][:33] + '...' if len(centro['centro_custo']) > 35 else centro['centro_custo']
            
            print(f"{centro['id']:<3} | {centro_nome:<35} | {empresa_cod:<8} | {centro['tipologia']:<20} | {centro['categoria']:<12}")
        
        return output_file, centros_processados
        
    except Exception as e:
        print(f"❌ Erro ao processar CSV: {e}")
        import traceback
        traceback.print_exc()
        return None, []

def main():
    """Executa o processamento completo"""
    print("="*80)
    print("PROCESSAMENTO FINAL DE CENTROS DE CUSTO")
    print("="*80)
    
    output_file, centros = processar_csv_limpo()
    
    if output_file:
        print(f"\n🎉 Processamento concluído!")
        print(f"📁 Arquivo final: {output_file}")
        print(f"📊 Estrutura: ID | Centro de Custo | Empresa | Tipologia | Categoria")
        print(f"\n💡 Tipologias expandidas:")
        print(f"   OE → Obra Empreendimento")
        print(f"   OP → Obra Privada")
        print(f"   ADM → Administrativo")
        print(f"\n🏷️ Categorias definidas:")
        print(f"   nativo: Empresa responsável principal pelo centro de custo")
        print(f"   dependente: Outras empresas que utilizam o centro de custo")
        print(f"   genérico: Centros comuns que requerem seleção obrigatória da empresa")

if __name__ == "__main__":
    main()