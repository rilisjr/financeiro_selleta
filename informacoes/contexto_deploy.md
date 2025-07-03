# 🚀 SISTEMA FINANCEIRO SELLETA - CONTEXTO COMPLETO PARA DEPLOY

## 📋 **INFORMAÇÕES ESSENCIAIS DA APLICAÇÃO**

### **Identificação do Projeto**
- **Nome**: Sistema Financeiro Selleta
- **Versão**: 3.0 (TableComponent + Smart Financial Header)
- **Tipo**: Aplicação web de gestão financeira multi-empresas
- **Framework**: Flask (Python) + SQLite + JavaScript/jQuery
- **Status**: 100% FUNCIONAL com 27.353 transações operacionais

### **Repositório Git**
```bash
# ESTE PROJETO AINDA NÃO TEM REPOSITÓRIO GIT CONFIGURADO
# Será necessário criar e configurar durante o deploy
```

---

## 🏗️ **ARQUITETURA E TECNOLOGIAS**

### **Backend**
- **Framework**: Flask 2.x (Python)
- **Banco de Dados**: SQLite (`selleta_main.db`)
- **APIs**: REST endpoints completos
- **Autenticação**: Flask sessions
- **Logging**: Python logging configurado

### **Frontend**
- **Templates**: Jinja2
- **CSS**: CSS customizado com variáveis
- **JavaScript**: jQuery + componentes modulares
- **Componentes**: TableComponent reutilizável
- **Design**: Responsivo com breakpoints

### **Banco de Dados**
- **Arquivo principal**: `selleta_main.db` (27.353 transações)
- **Tabelas principais**:
  - `transacoes` (core do sistema)
  - `empresas` (6 empresas)
  - `fornecedores` (2.083 registros)
  - `centros_custo` (132 registros)
  - `plano_financeiro` (hierárquico 4 níveis)
  - `usuarios` (sistema de login)

---

## 📁 **ESTRUTURA DE DIRETÓRIOS**

```
financeiro_selleta/
├── main.py                     # ← ARQUIVO PRINCIPAL (Flask app)
├── api_filtros_transacoes.py   # ← APIs de filtros e busca
├── selleta_main.db             # ← BANCO DE DADOS (27K transações)
├── CLAUDE.md                   # ← Documentação do projeto
├── static/
│   ├── css/
│   │   ├── transacoes.css      # ← Estilos principais
│   │   └── components/
│   │       └── table_component.css  # ← CSS do TableComponent
│   └── js/
│       ├── transacoes_v3.js    # ← JavaScript principal (v3.0)
│       └── components/
│           └── table_component.js   # ← Componente reutilizável
├── templates/
│   ├── base.html               # ← Template base
│   ├── login.html              # ← Página de login
│   ├── transacoes.html         # ← Página principal
│   └── [outras páginas].html
├── scripts/                    # ← Scripts de migração/utilidades
├── correcao/                   # ← Dados de correção/backup
└── informacoes/                # ← Documentação
```

---

## ⚙️ **CONFIGURAÇÃO DO AMBIENTE**

### **Dependências Python**
```python
# PRINCIPAIS DEPENDÊNCIAS (instalar via pip):
Flask==2.3.3
sqlite3 (built-in)
datetime (built-in)
json (built-in)
logging (built-in)
bcrypt  # Para hash de senhas
```

### **Configuração do Flask**
```python
# Variáveis de ambiente necessárias:
FLASK_APP=main.py
FLASK_ENV=production  # ou development
SECRET_KEY="sua_chave_secreta_aqui"
```

### **Estrutura do main.py**
```python
from flask import Flask, render_template, request, session, jsonify, redirect, url_for
import sqlite3
import bcrypt
import logging
from datetime import datetime, timedelta
from api_filtros_transacoes import executar_query_filtrada, get_filtros_api

app = Flask(__name__)
app.secret_key = 'sua_chave_secreta'

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# PORTA PADRÃO: 5000
if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=False)
```

---

## 🗄️ **CONFIGURAÇÃO DO BANCO DE DADOS**

### **Arquivo Principal**
- **Nome**: `selleta_main.db`
- **Localização**: Raiz do projeto
- **Tamanho**: ~50MB (27.353 transações)
- **Status**: PRODUÇÃO com dados reais

### **Credenciais de Acesso**
```python
# Login da aplicação:
Usuario: rilis
Senha: 123

# Configuração SQLite (sem senha):
DATABASE_PATH = 'selleta_main.db'
```

### **Backup de Segurança**
```bash
# IMPORTANTE: Fazer backup antes do deploy
cp selleta_main.db selleta_main_backup_$(date +%Y%m%d_%H%M%S).db
```

---

## 🌐 **APIS E ENDPOINTS PRINCIPAIS**

### **Autenticação**
```
POST /login          # Login do usuário
GET  /logout         # Logout
GET  /               # Dashboard (requer login)
```

### **Transações (CORE)**
```
POST /api/transacoes/buscar     # ← API PRINCIPAL (filtros + paginação)
GET  /api/transacoes/filtros    # ← Dados para filtros avançados
POST /api/transacoes/kpis       # KPIs filtrados
GET  /api/transacoes/kpis-globais  # KPIs globais
```

### **Entidades**
```
GET  /api/empresas              # Lista de empresas
GET  /api/centros-custo         # Centros de custo
POST /api/fornecedores/buscar   # Busca de fornecedores
```

### **Páginas Principais**
```
GET  /transacoes               # ← PÁGINA PRINCIPAL
GET  /fornecedores
GET  /empresas
GET  /centro_custo
GET  /conta_bancaria
```

---

## 🚀 **COMANDOS DE DEPLOY**

### **1. Preparação do Servidor**
```bash
# Atualizar sistema
apt update && apt upgrade -y

# Instalar Python e pip
apt install python3 python3-pip python3-venv -y

# Instalar Git
apt install git -y

# Criar usuário de aplicação (recomendado)
useradd -m -s /bin/bash selleta
su - selleta
```

### **2. Clone e Configuração**
```bash
# Criar diretório
mkdir -p /opt/selleta
cd /opt/selleta

# AQUI SERIA O GIT CLONE (quando repositório estiver configurado)
# git clone https://github.com/usuario/financeiro_selleta.git .

# Por enquanto, copiar arquivos manualmente
# Criar ambiente virtual
python3 -m venv venv
source venv/bin/activate

# Instalar dependências
pip install Flask bcrypt
```

### **3. Configuração da Aplicação**
```bash
# Configurar variáveis de ambiente
cat > .env << 'EOF'
FLASK_APP=main.py
FLASK_ENV=production
SECRET_KEY=sua_chave_secreta_super_segura_aqui
EOF

# Definir permissões
chmod 600 .env
chmod 644 selleta_main.db
chmod +x main.py
```

### **4. Teste Local**
```bash
# Ativar ambiente
source venv/bin/activate

# Rodar aplicação
python main.py

# Testar em outra terminal
curl http://localhost:5000
```

### **5. Configuração do Nginx (Proxy Reverso)**
```nginx
# /etc/nginx/sites-available/selleta
server {
    listen 80;
    server_name seu_dominio.com;
    
    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    location /static {
        alias /opt/selleta/static;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
```

### **6. Configuração do Systemd (Service)**
```ini
# /etc/systemd/system/selleta.service
[Unit]
Description=Sistema Financeiro Selleta
After=network.target

[Service]
Type=simple
User=selleta
WorkingDirectory=/opt/selleta
Environment=PATH=/opt/selleta/venv/bin
ExecStart=/opt/selleta/venv/bin/python main.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

---

## 🔧 **FUNCIONALIDADES IMPLEMENTADAS**

### **✅ Sistema de Transações (100% Funcional)**
- Smart Financial Header com KPIs reais
- Filtros inteligentes (busca, ordenação, paginação)
- TableComponent reutilizável
- 27.353 transações operacionais
- APIs completas de CRUD

### **✅ Filtros Avançados**
- Busca textual (título, fornecedor, observações)
- Filtros por empresa, centro de custo, fornecedor
- Filtros por plano financeiro (4 níveis hierárquicos)
- Filtros de data (períodos + personalizados)
- Filtros de valor e status

### **✅ Gestão de Entidades**
- 6 empresas do grupo Selleta
- 2.083 fornecedores com detecção automática
- 132 centros de custo com tipologia
- Plano financeiro hierárquico (4 níveis)
- Contas bancárias (parcialmente funcional)

### **✅ Interface**
- Design responsivo (mobile, tablet, desktop)
- TableComponent com ordenação visual
- Sistema de busca em tempo real
- KPIs dinâmicos
- Paginação inteligente

---

## 🔐 **SEGURANÇA E BACKUP**

### **Segurança**
```bash
# Configurar firewall
ufw allow ssh
ufw allow 80
ufw allow 443
ufw enable

# Backup automático do banco
crontab -e
# Adicionar: 0 2 * * * cp /opt/selleta/selleta_main.db /backup/selleta_$(date +\%Y\%m\%d).db
```

### **Monitoramento**
```bash
# Logs da aplicação
tail -f /var/log/selleta/app.log

# Status do serviço
systemctl status selleta

# Uso de recursos
htop
df -h
```

---

## 📊 **DADOS E ESTATÍSTICAS**

### **Métricas Atuais**
- **27.353 transações** carregadas e funcionais
- **R$ 1.072.697,25** em despesas
- **R$ 161.720,08** em receitas
- **2.083 fornecedores** com detecção automática
- **6 empresas** multi-tenant configuradas
- **132 centros de custo** categorizados

### **Performance**
- Carregamento < 2 segundos (27K registros)
- Filtros em tempo real
- Paginação otimizada (50 registros/página)
- APIs REST eficientes

---

## 🆘 **TROUBLESHOOTING COMUM**

### **Problema: Banco não conecta**
```bash
# Verificar permissões
ls -la selleta_main.db
chmod 644 selleta_main.db
```

### **Problema: Static files não carregam**
```bash
# Verificar Nginx
nginx -t
systemctl reload nginx
```

### **Problema: Port 5000 em uso**
```bash
# Verificar processo
lsof -i :5000
# Matar se necessário
kill -9 <PID>
```

### **Logs Importantes**
```bash
# Logs da aplicação
/var/log/selleta/app.log

# Logs do sistema
journalctl -u selleta -f

# Logs do Nginx
/var/log/nginx/error.log
```

---

## 🎯 **CHECKLIST DE DEPLOY**

### **Pré-Deploy**
- [ ] Backup do banco atual (`selleta_main.db`)
- [ ] Configurar repositório Git
- [ ] Gerar SECRET_KEY segura
- [ ] Configurar domínio/DNS

### **Deploy**
- [ ] Servidor configurado (Python 3.8+)
- [ ] Dependências instaladas
- [ ] Banco de dados copiado
- [ ] Variáveis de ambiente configuradas
- [ ] Nginx configurado
- [ ] Systemd service criado
- [ ] Firewall configurado

### **Pós-Deploy**
- [ ] Testar login (rilis/123)
- [ ] Verificar carregamento de transações
- [ ] Testar filtros e busca
- [ ] Configurar backup automático
- [ ] Configurar monitoramento

---

## 📞 **SUPORTE E CONTATO**

### **Credenciais de Teste**
```
URL: http://seu_dominio.com
Usuário: rilis
Senha: 123
```

### **Arquivos Críticos**
- `main.py` - Aplicação principal
- `selleta_main.db` - Banco de dados
- `api_filtros_transacoes.py` - APIs de filtros
- `static/js/transacoes_v3.js` - Frontend principal
- `static/js/components/table_component.js` - Componente da tabela

### **Comandos de Manutenção**
```bash
# Reiniciar aplicação
systemctl restart selleta

# Ver logs em tempo real
journalctl -u selleta -f

# Backup manual
cp selleta_main.db backup_$(date +%Y%m%d_%H%M%S).db

# Verificar status
systemctl status selleta nginx
```

---

**📝 NOTA IMPORTANTE**: Este sistema está 100% funcional em desenvolvimento. Durante o deploy, é essencial manter a estrutura de arquivos e o banco de dados `selleta_main.db` intactos para preservar as 27.353 transações operacionais.