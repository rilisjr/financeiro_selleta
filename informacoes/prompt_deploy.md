# 🚀 PROMPT PARA DEPLOY - SISTEMA FINANCEIRO SELLETA

## 📋 **PROMPT PARA CLAUDE CODE NA VPS**

Copie e cole este prompt completo no Claude Code quando estiver na VPS como root:

---

**Olá! Preciso fazer o deploy de uma aplicação Flask chamada "Sistema Financeiro Selleta" nesta VPS. Aqui estão todas as informações:**

## 🎯 **CONTEXTO DA APLICAÇÃO**
- **Aplicação**: Sistema de gestão financeira multi-empresas
- **Framework**: Flask (Python) + SQLite + JavaScript
- **Status**: 100% funcional em desenvolvimento com 27.353 transações reais
- **Banco**: SQLite (`selleta_main.db`) com dados de produção
- **Credenciais**: Login `rilis` / Senha `123`

## 📁 **ESTRUTURA DE ARQUIVOS**
A aplicação possui esta estrutura principal:
```
financeiro_selleta/
├── main.py                     # Aplicação Flask principal
├── api_filtros_transacoes.py   # APIs de filtros e busca
├── selleta_main.db             # Banco SQLite (27K transações)
├── static/
│   ├── css/transacoes.css
│   ├── css/components/table_component.css
│   ├── js/transacoes_v3.js     # JavaScript principal
│   └── js/components/table_component.js
├── templates/
│   ├── base.html
│   ├── transacoes.html         # Página principal
│   └── login.html
└── informacoes/
    └── contexto_deploy.md      # Documentação completa
```

## ⚙️ **DEPENDÊNCIAS PYTHON**
```python
Flask==2.3.3
bcrypt
sqlite3 (built-in)
datetime (built-in)
json (built-in)
logging (built-in)
```

## 🗄️ **BANCO DE DADOS**
- **Arquivo**: `selleta_main.db` (já existe com dados)
- **Tamanho**: ~50MB com 27.353 transações operacionais
- **⚠️ CRÍTICO**: NÃO recriar o banco, usar o arquivo existente

## 🌐 **PRINCIPAIS ENDPOINTS**
- `GET /` - Dashboard principal
- `POST /login` - Autenticação
- `GET /transacoes` - Página principal do sistema
- `POST /api/transacoes/buscar` - API principal de filtros
- `GET /api/transacoes/filtros` - Dados para filtros avançados

## 🚀 **REQUISITOS DE DEPLOY**
1. **Instalar Python 3.8+ e dependências**
2. **Configurar Nginx como proxy reverso** (porta 80 → 5000)
3. **Criar service systemd** para auto-start
4. **Configurar backup automático** do banco
5. **Configurar firewall** (SSH + HTTP + HTTPS)

## 🎯 **TAREFAS QUE PRECISO QUE VOCÊ EXECUTE**
1. Preparar o ambiente (Python, Nginx, etc)
2. Criar diretório `/opt/selleta/`
3. Configurar ambiente virtual Python
4. Instalar dependências
5. Configurar Nginx proxy
6. Criar systemd service
7. Configurar firewall básico
8. Testar a aplicação

## 📋 **CONFIGURAÇÕES NECESSÁRIAS**

### **Nginx Config:**
```nginx
server {
    listen 80;
    server_name _;
    
    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    location /static {
        alias /opt/selleta/static;
        expires 30d;
    }
}
```

### **Systemd Service:**
```ini
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

[Install]
WantedBy=multi-user.target
```

### **Variáveis de Ambiente:**
```bash
FLASK_APP=main.py
FLASK_ENV=production
SECRET_KEY=gerar_uma_chave_segura_aqui
```

## 🔐 **SEGURANÇA**
- Criar usuário `selleta` para rodar a aplicação
- Configurar firewall (UFW): SSH + HTTP + HTTPS
- Aplicar permissões corretas nos arquivos
- Configurar backup automático do banco

## ✅ **TESTE FINAL**
Após o deploy, testar:
1. Acesso via navegador
2. Login com `rilis` / `123`
3. Carregamento da página `/transacoes`
4. Funcionamento dos filtros
5. Verificar se as 27.353 transações estão carregando

## 📞 **SUPORTE**
- A aplicação roda na porta 5000 por padrão
- Logs importantes em `/var/log/selleta/`
- Comando para reiniciar: `systemctl restart selleta`

**IMPORTANTE**: Esta aplicação já está 100% funcional em desenvolvimento. O objetivo é apenas fazer o deploy mantendo todas as funcionalidades. O arquivo `selleta_main.db` contém dados reais de produção e deve ser preservado.

**Pode começar o processo de deploy completo? Preciso que configure tudo do zero para uma aplicação Flask pronta para produção.**

---

## 📝 **INFORMAÇÕES ADICIONAIS**

Se você precisar de mais detalhes sobre algum aspecto específico, consulte o arquivo `/opt/selleta/informacoes/contexto_deploy.md` que contém a documentação completa com:
- Estrutura detalhada do banco de dados
- APIs e endpoints completos  
- Troubleshooting comum
- Comandos de manutenção
- Métricas e estatísticas da aplicação

**Status atual**: Aplicação testada e funcionando perfeitamente em desenvolvimento com dados reais de produção.