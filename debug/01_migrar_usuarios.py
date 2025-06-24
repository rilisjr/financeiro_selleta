#!/usr/bin/env python3
"""
Debug Script 01: Migrar tabela de usuários do banco antigo para o novo
Problema: selleta_main.db não tem a tabela usuarios
Solução: Copiar estrutura e dados de selleta.db
"""

import sqlite3
import os
from pathlib import Path

# Caminhos
BASE_DIR = Path(__file__).parent.parent
DB_ANTIGO = BASE_DIR / 'selleta.db'
DB_NOVO = BASE_DIR / 'selleta_main.db'

def verificar_bancos():
    """Verifica se os bancos existem"""
    print("🔍 Verificando bancos de dados...")
    
    if not DB_ANTIGO.exists():
        print(f"❌ Banco antigo não encontrado: {DB_ANTIGO}")
        return False
    else:
        print(f"✅ Banco antigo encontrado: {DB_ANTIGO}")
    
    if not DB_NOVO.exists():
        print(f"❌ Banco novo não encontrado: {DB_NOVO}")
        return False
    else:
        print(f"✅ Banco novo encontrado: {DB_NOVO}")
    
    return True

def criar_tabela_usuarios(conn_novo):
    """Cria a tabela de usuários no banco novo"""
    cursor = conn_novo.cursor()
    
    # Criar tabela com estrutura atualizada
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS usuarios (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username VARCHAR(50) UNIQUE NOT NULL,
            senha TEXT NOT NULL,
            nome_completo VARCHAR(150),
            email VARCHAR(150),
            ativo BOOLEAN DEFAULT TRUE,
            perfil VARCHAR(20) DEFAULT 'operador',
            criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    conn_novo.commit()
    print("✅ Tabela usuarios criada/verificada no banco novo")

def migrar_usuarios():
    """Migra os usuários do banco antigo para o novo"""
    
    # Conectar aos bancos
    conn_antigo = sqlite3.connect(DB_ANTIGO)
    conn_novo = sqlite3.connect(DB_NOVO)
    
    try:
        # Criar tabela no banco novo
        criar_tabela_usuarios(conn_novo)
        
        # Verificar se já existem usuários no banco novo
        cursor_novo = conn_novo.cursor()
        cursor_novo.execute("SELECT COUNT(*) FROM usuarios")
        count_novo = cursor_novo.fetchone()[0]
        
        if count_novo > 0:
            print(f"⚠️  Banco novo já possui {count_novo} usuários. Pulando migração.")
            return
        
        # Buscar usuários do banco antigo
        cursor_antigo = conn_antigo.cursor()
        cursor_antigo.execute("SELECT id, username, senha FROM usuarios")
        usuarios_antigos = cursor_antigo.fetchall()
        
        print(f"\n📊 Encontrados {len(usuarios_antigos)} usuários para migrar")
        
        # Migrar cada usuário
        for user_id, username, senha in usuarios_antigos:
            try:
                # Inserir no banco novo com campos adicionais
                cursor_novo.execute('''
                    INSERT INTO usuarios (username, senha, nome_completo, perfil)
                    VALUES (?, ?, ?, ?)
                ''', (username, senha, username.title(), 'admin' if username == 'admin' else 'operador'))
                
                print(f"✅ Usuário migrado: {username}")
                
            except sqlite3.IntegrityError as e:
                print(f"⚠️  Erro ao migrar {username}: {e}")
        
        conn_novo.commit()
        print("\n✅ Migração de usuários concluída!")
        
        # Mostrar estatísticas
        cursor_novo.execute("SELECT COUNT(*) FROM usuarios")
        total = cursor_novo.fetchone()[0]
        print(f"📈 Total de usuários no banco novo: {total}")
        
        # Listar usuários
        cursor_novo.execute("SELECT username, perfil FROM usuarios")
        print("\n👥 Usuários no sistema:")
        for username, perfil in cursor_novo.fetchall():
            print(f"   - {username} ({perfil})")
        
    except Exception as e:
        print(f"\n❌ Erro durante migração: {e}")
        conn_novo.rollback()
        raise
    
    finally:
        conn_antigo.close()
        conn_novo.close()

def criar_usuario_padrao():
    """Cria um usuário padrão caso não exista nenhum"""
    conn = sqlite3.connect(DB_NOVO)
    cursor = conn.cursor()
    
    try:
        # Verificar se existe algum usuário
        cursor.execute("SELECT COUNT(*) FROM usuarios")
        if cursor.fetchone()[0] == 0:
            print("\n🆕 Criando usuário padrão...")
            
            # Criar usuário admin com senha 'admin123'
            # Hash gerado com werkzeug.security.generate_password_hash('admin123')
            cursor.execute('''
                INSERT INTO usuarios (username, senha, nome_completo, email, perfil)
                VALUES (?, ?, ?, ?, ?)
            ''', (
                'admin',
                'scrypt:32768:8:1$Y5JgRFvlTxJHxKtR$2e3a5a3a2bdc5d0c2eaeb59a87287c9ac1fbc10cdba44c17c33ee5e95df93c2e4cf3b87c088055b0bf7b27b1a6eb2026df6cf21e67a72ffe91f9fe93c3f9c5f4',
                'Administrador',
                'admin@selleta.com.br',
                'admin'
            ))
            
            conn.commit()
            print("✅ Usuário admin criado (senha: admin123)")
    
    except Exception as e:
        print(f"❌ Erro ao criar usuário padrão: {e}")
    
    finally:
        conn.close()

def main():
    """Executa o processo de migração"""
    print("="*60)
    print("DEBUG 01: Migração de Usuários")
    print("="*60)
    
    # Verificar se os bancos existem
    if not verificar_bancos():
        print("\n⚠️  Criando usuário padrão no banco novo...")
        criar_usuario_padrao()
        return
    
    # Executar migração
    try:
        migrar_usuarios()
    except:
        # Se falhar, criar usuário padrão
        print("\n⚠️  Falha na migração. Criando usuário padrão...")
        criar_usuario_padrao()

if __name__ == "__main__":
    main()