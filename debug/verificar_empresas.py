#!/usr/bin/env python3
import sqlite3
from pathlib import Path

base_path = Path(__file__).parent.parent
db_path = base_path / 'selleta_main.db'

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

print("Empresas no banco:")
cursor.execute("SELECT id, codigo, nome FROM empresas ORDER BY codigo")
for emp_id, codigo, nome in cursor.fetchall():
    print(f"ID: {emp_id}, Código: '{codigo}', Nome: {nome}")

conn.close()