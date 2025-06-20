# 📋 Documentação de Rotas - NIK0 Finance

## 🔗 Visão Geral das Rotas

O sistema NIK0 Finance utiliza o framework Flask e possui as seguintes rotas organizadas por funcionalidade:

---

## 🏠 Rota Principal

### `GET /`
- **Descrição**: Página inicial do sistema
- **Função**: `index()` (linha 37-41)
- **Template**: `login.html`
- **Autenticação**: Não requerida
- **Ação**: Renderiza a página de login

---

## 🔐 Autenticação

### `POST /login`
- **Descrição**: Processa o login do usuário
- **Função**: `login()` (linha 43-66)
- **Parâmetros**:
  - `username`: Nome de usuário
  - `password`: Senha do usuário
- **Autenticação**: Não requerida
- **Ações**:
  - Verifica credenciais no banco de dados
  - Valida senha com hash
  - Cria sessão se autenticado
  - Redireciona para dashboard ou exibe erro

### `POST /logout`
- **Descrição**: Encerra a sessão do usuário
- **Função**: `logout()` (linha 325-329)
- **Autenticação**: Requerida
- **Ação**: Limpa a sessão e redireciona para login

---

## 👤 Gestão de Usuários

### `GET/POST /cadastro`
- **Descrição**: Página e processamento de cadastro de novos usuários
- **Função**: `cadastro()` (linha 68-111)
- **Template**: `cadastro.html` (GET)
- **Parâmetros** (POST):
  - `username`: Nome de usuário
  - `password`: Senha
  - `confirmPassword`: Confirmação de senha
- **Autenticação**: Não requerida
- **Validações**:
  - Verifica se senhas coincidem
  - Verifica se usuário já existe
  - Gera hash da senha antes de salvar

### `GET /gestao_usuarios`
- **Descrição**: Lista todos os usuários cadastrados
- **Função**: `gestao_usuarios()` (linha 187-205)
- **Template**: `gestao_usuarios.html`
- **Autenticação**: Requerida (implicitamente)
- **Ação**: Exibe lista de todos os usuários

### `POST /excluir_usuario/<int:user_id>`
- **Descrição**: Exclui um usuário específico
- **Função**: `excluir_usuario()` (linha 207-236)
- **Parâmetro URL**: `user_id` (ID do usuário)
- **Autenticação**: Requerida
- **Ações**:
  - Exclui usuário do banco
  - Se excluir própria conta, faz logout automático

---

## 💰 Dashboard e Transações

### `GET /dashboard`
- **Descrição**: Painel principal com resumo financeiro
- **Função**: `dashboard()` (linha 113-185)
- **Template**: `dashboard.html`
- **Parâmetros de Query (opcionais)**:
  - `filtro_ano`: Filtrar por ano
  - `filtro_mes`: Filtrar por mês
- **Autenticação**: Requerida
- **Funcionalidades**:
  - Lista transações de renda e custo
  - Calcula totais por tipo (fixo/variável)
  - Aplica filtros de data
  - Formata valores monetários em R$

---

## 📊 API de Transações

### `GET /obter_dados_transacao/<int:transacao_id>`
- **Descrição**: Retorna dados de uma transação específica em JSON
- **Função**: `obter_dados_transacao()` (linha 238-260)
- **Parâmetro URL**: `transacao_id` (ID da transação)
- **Autenticação**: Requerida (implicitamente)
- **Retorno**: JSON com campos:
  - `origem`
  - `descricao`
  - `tipo` (Fixo/Variável)
  - `valor`
  - `modelo` (Renda/Custo)
  - `data`

### `POST /adicionar_transacao`
- **Descrição**: Adiciona nova transação ou edita existente
- **Função**: `adicionar_transacao()` (linha 262-298)
- **Parâmetros**:
  - `transacao_id` (opcional): ID para edição
  - `origem`: Origem da transação
  - `descricao`: Descrição
  - `tipo`: Fixo ou Variável
  - `valor`: Valor monetário
  - `modelo`: Renda ou Custo
  - `data`: Data da transação
- **Autenticação**: Requerida (implicitamente)
- **Ação**: Insere nova ou atualiza existente

### `POST /excluir_transacao/<int:transacao_id>`
- **Descrição**: Exclui uma transação específica
- **Função**: `excluir_transacao()` (linha 300-323)
- **Parâmetro URL**: `transacao_id` (ID da transação)
- **Autenticação**: Requerida
- **Ação**: Remove transação do banco

---

## 🔒 Controle de Acesso

### Rotas Públicas (sem autenticação):
- `/` (GET)
- `/login` (POST)
- `/cadastro` (GET/POST)

### Rotas Protegidas (requerem sessão):
- `/dashboard` (GET)
- `/gestao_usuarios` (GET)
- `/excluir_usuario/<id>` (POST)
- `/obter_dados_transacao/<id>` (GET)
- `/adicionar_transacao` (POST)
- `/excluir_transacao/<id>` (POST)
- `/logout` (POST)

---

## 📝 Observações Técnicas

1. **Autenticação**: Baseada em sessão Flask (`session['user_id']`)
2. **Segurança**: Senhas armazenadas com hash usando Werkzeug
3. **Banco de Dados**: SQLite com duas tabelas principais:
   - `usuarios`: id, username, senha (hash)
   - `transacoes`: id, origem, descricao, tipo, valor, modelo, data
4. **Formatação**: Valores monetários formatados como R$ com separadores brasileiros
5. **Validações**: Tipos de transação (Fixo/Variável) e modelos (Renda/Custo) validados no banco

---

**Última atualização**: 20/06/2025