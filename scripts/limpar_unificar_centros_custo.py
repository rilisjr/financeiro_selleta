#!/usr/bin/env python3
"""
Script para limpar e unificar centros de custo
Cria coluna mascara_cc para uso na aplicação
Mantém centro_custo original para mesclagem com banco anterior
"""

import csv
import re
from pathlib import Path

def limpar_sufixos_empresa(nome_centro):
    """Remove sufixos específicos de empresa do nome do centro de custo"""
    # Lista de sufixos a serem removidos
    sufixos_para_remover = [
        r' - SEL \d+',          # - SEL 43, - SEL 21, etc.
        r' -SEL \d+',           # -SEL 21 (sem espaço antes)
        r' - SELLETA \d+',      # - SELLETA 43
        r' - JATOBA SPE',       # - JATOBA SPE
        r' - JATOBA',           # - JATOBA
        r' - jatoba',           # - jatoba (minúsculo)
        r' - ESTRUTURA',        # - ESTRUTURA
        r' - CONTA JATOBA',     # - CONTA JATOBA
        r' PRE MOLDADO$',       # PRE MOLDADO no final (para casos específicos)
        r' - VILA BELA PRE MOLDADO'  # - VILA BELA PRE MOLDADO
    ]
    
    nome_limpo = nome_centro
    
    # Aplicar remoção de sufixos
    for sufixo in sufixos_para_remover:
        nome_limpo = re.sub(sufixo, '', nome_limpo)
    
    # Limpezas específicas
    nome_limpo = nome_limpo.strip()
    
    return nome_limpo

def unificar_administrativos(nome_centro):
    """Unifica centros administrativos para termo genérico"""
    nome_lower = nome_centro.lower()
    
    # Mapeamento de unificação para administrativos
    if any(term in nome_lower for term in ['administrativo selleta', 'administrativo jnrr', 'administrativo jatoba', 'administrativo rls']):
        return 'Administrativo'
    elif 'administrativo estrutura' in nome_lower:
        return 'Administrativo'
    elif nome_centro == 'Empresa pre moldado':
        return 'Administrativo Pré-Moldado'
    elif 'administrato tapurah' in nome_lower:  # Corrigir erro de grafia
        return 'Administrativo Tapurah'
    elif nome_centro == 'RLS implantação':
        return 'Administrativo RLS Implantação'
    elif nome_centro == 'ALOJAMENTO -FABRICA':
        return 'Administrativo Alojamento'
    elif nome_centro == 'Sede':
        return 'Sede'  # Manter como está (já é genérico)
    
    return nome_centro

def criar_mascara_cc(nome_centro):
    """Cria a máscara limpa para uso na aplicação"""
    # 1. Primeiro remove sufixos de empresa
    nome_sem_sufixos = limpar_sufixos_empresa(nome_centro)
    
    # 2. Depois unifica administrativos
    mascara_final = unificar_administrativos(nome_sem_sufixos)
    
    # 3. Limpezas finais
    mascara_final = mascara_final.strip()
    
    return mascara_final

def processar_csv_com_mascara():
    """Processa CSV adicionando coluna mascara_cc"""
    base_path = Path(__file__).parent.parent
    input_file = base_path / 'importacao' / 'b_dados_centro_custo_final.csv'
    output_file = base_path / 'importacao' / 'b_dados_centro_custo_com_mascara.csv'
    
    print("🎭 Criando máscaras para centros de custo...")
    
    try:
        centros_processados = []
        mascaras_unicas = set()
        
        # Ler CSV final
        with open(input_file, 'r', encoding='utf-8-sig') as f:
            reader = csv.DictReader(f)
            
            for row in reader:
                centro_custo_original = row['centro_custo'].strip()
                
                # Criar máscara limpa
                mascara_cc = criar_mascara_cc(centro_custo_original)
                mascaras_unicas.add(mascara_cc)
                
                # Criar registro processado
                centro_processado = {
                    'id': row['id'],
                    'centro_custo': centro_custo_original,  # Nome específico original (para mesclagem)
                    'mascara_cc': mascara_cc,              # Nome limpo/unificado (para aplicação)
                    'empresa': row['empresa'],
                    'tipologia': row['tipologia'],
                    'categoria': row['categoria']
                }
                
                centros_processados.append(centro_processado)
        
        # Salvar CSV com máscara
        with open(output_file, 'w', encoding='utf-8-sig', newline='') as f:
            fieldnames = ['id', 'centro_custo', 'mascara_cc', 'empresa', 'tipologia', 'categoria']
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            
            for centro in centros_processados:
                writer.writerow(centro)
        
        print(f"✅ CSV com máscaras gerado: {output_file}")
        print(f"📊 Total de registros: {len(centros_processados)}")
        print(f"🎭 Máscaras únicas: {len(mascaras_unicas)}")
        
        # Estatísticas de limpeza
        centros_com_mudanca = [c for c in centros_processados if c['centro_custo'] != c['mascara_cc']]
        print(f"🧹 Centros limpos: {len(centros_com_mudanca)}")
        
        # Mostrar exemplos de limpeza
        print(f"\n📋 Exemplos de limpeza (primeiros 15):")
        print(f"{'Original':<45} | {'Máscara':<35}")
        print("-" * 85)
        
        count = 0
        for centro in centros_processados:
            if centro['centro_custo'] != centro['mascara_cc'] and count < 15:
                original = centro['centro_custo'][:43] + '...' if len(centro['centro_custo']) > 45 else centro['centro_custo']
                mascara = centro['mascara_cc'][:33] + '...' if len(centro['mascara_cc']) > 35 else centro['mascara_cc']
                print(f"{original:<45} | {mascara:<35}")
                count += 1
        
        # Mostrar máscaras administrativas unificadas
        print(f"\n🏢 Máscaras administrativas unificadas:")
        mascaras_admin = [m for m in mascaras_unicas if 'Administrativo' in m or m == 'Sede']
        for mascara in sorted(mascaras_admin):
            count_uso = len([c for c in centros_processados if c['mascara_cc'] == mascara])
            print(f"   {mascara}: {count_uso} uso(s)")
        
        return output_file, centros_processados
        
    except Exception as e:
        print(f"❌ Erro ao processar CSV: {e}")
        import traceback
        traceback.print_exc()
        return None, []

def main():
    """Executa o processamento completo"""
    print("="*80)
    print("LIMPEZA E UNIFICAÇÃO DE CENTROS DE CUSTO")
    print("="*80)
    
    output_file, centros = processar_csv_com_mascara()
    
    if output_file:
        print(f"\n🎉 Processamento concluído!")
        print(f"📁 Arquivo final: {output_file}")
        print(f"📊 Estrutura: ID | Centro de Custo (original) | Mascara CC (limpo) | Empresa | Tipologia | Categoria")
        print(f"\n💡 #memorize conceito implementado:")
        print(f"   🎭 mascara_cc: Nome limpo/unificado para uso na APLICAÇÃO")
        print(f"   🔗 centro_custo: Nome específico original para MESCLAGEM com banco anterior")
        print(f"   🎯 Na aplicação: usuário vê a MÁSCARA")
        print(f"   🔧 No backend: sistema usa CENTRO_CUSTO para associar transações existentes")

if __name__ == "__main__":
    main()