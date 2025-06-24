# 🎨 Guia Visual do Frontend - Sistema Financeiro Selleta

## 📊 Análise das Referências

### **Sienge - Estrutura Identificada:**
- ✅ **Menu lateral esquerdo** com árvore hierárquica colapsável
- ✅ **Área principal** com cards promocionais/informativos
- ✅ **Seção "Acessados recentemente"** com ícones azuis circulares
- ✅ **Seção "Avisos e notificações"** com ícones vermelhos
- ✅ **Agenda lateral direita** com timeline de eventos
- ✅ **Layout responsivo** e clean
- ✅ **Breadcrumb** para navegação
- ✅ **Filtros avançados** em formulários
- ✅ **Tabelas com ações** (consulta de títulos)

### **Logo Selleta - Cores Identificadas:**
- 🔵 **Azul Principal**: #1976D2 (tom médio-escuro)
- 🔷 **Azul Claro**: #42A5F5 (gradiente superior)
- ⚫ **Azul Escuro**: #0D47A1 (sombras e contornos)
- ✨ **Efeito 3D**: Gradientes e profundidade

## 🌈 Paleta de Cores Oficial

### **Cores Primárias (baseadas na logo Selleta):**
```css
:root {
  /* Cores Principais */
  --selleta-primary: #1976D2;      /* Azul principal da logo */
  --selleta-primary-dark: #0D47A1; /* Azul escuro para contrastes */
  --selleta-primary-light: #42A5F5; /* Azul claro para destaques */
  --selleta-primary-ultra-light: #E3F2FD; /* Azul muito claro para backgrounds */
  
  /* Cores Secundárias (harmoniosas) */
  --selleta-secondary: #37474F;    /* Cinza azulado escuro */
  --selleta-secondary-light: #607D8B; /* Cinza azulado médio */
  --selleta-accent: #FF6B35;       /* Laranja vibrante (complementar ao azul) */
  
  /* Cores Neutras */
  --selleta-white: #FFFFFF;
  --selleta-gray-50: #FAFAFA;
  --selleta-gray-100: #F5F5F5;
  --selleta-gray-200: #EEEEEE;
  --selleta-gray-300: #E0E0E0;
  --selleta-gray-400: #BDBDBD;
  --selleta-gray-500: #9E9E9E;
  --selleta-gray-600: #757575;
  --selleta-gray-700: #616161;
  --selleta-gray-800: #424242;
  --selleta-gray-900: #212121;
  
  /* Status/Feedback */
  --selleta-success: #4CAF50;      /* Verde para sucesso */
  --selleta-success-light: #C8E6C9; /* Verde claro */
  --selleta-warning: #FF9800;      /* Laranja para atenção */
  --selleta-warning-light: #FFE0B2; /* Laranja claro */
  --selleta-error: #F44336;        /* Vermelho para erro */
  --selleta-error-light: #FFCDD2;  /* Vermelho claro */
  --selleta-info: #2196F3;         /* Azul para informação */
  --selleta-info-light: #BBDEFB;   /* Azul claro */
}
```

## 🏗️ Estrutura de Layout

### **Dashboard Principal:**
```
┌─────────────────────────────────────────────────────────┐
│ Header (--selleta-primary-dark)                        │
│ Logo + Navegação + User Menu                           │
├─────────────────────────────────────────────────────────┤
│ Breadcrumb + Filtros (--selleta-gray-100)             │
├─────────────────────────────────────────────────────────┤
│ Cards KPI (Grid 4 colunas)                            │
│ [Receitas] [Despesas] [Saldo] [Pendências]            │
├─────────────────────────────────────────────────────────┤
│ Gráficos (Grid 2x2)                                   │
│ [Fluxo Caixa]    [Receitas vs Despesas]              │
│ [Por Centro]      [Evolução Mensal]                   │
├─────────────────────────────────────────────────────────┤
│ Seções Laterais                                        │
│ [Acessados]      [Agenda]        [Notificações]       │
└─────────────────────────────────────────────────────────┘
```

### **Layout de Cadastros (inspirado no Sienge):**
```
┌─────────────────────────────────────────────────────────┐
│ Header + Breadcrumb                                     │
├─────────────────┬───────────────────────────────────────┤
│ Menu Lateral    │ Área Principal                        │
│ (expandível)    │                                       │
│                 │ [Filtros/Busca]                       │
│ - Plano Financ. │                                       │
│ - Centro Custo  │ [Conteúdo Dinâmico]                  │
│ - Clientes      │ • Árvore (Plano Financeiro)          │
│ - Transações    │ • Tabela (Clientes/Centros)          │
│                 │ • Formulário (Novo/Editar)           │
└─────────────────┴───────────────────────────────────────┘
```

## 🎯 Componentes Visuais

### **Cards KPI:**
- **Background**: Gradiente de --selleta-primary-light para --selleta-primary
- **Sombra**: 0 4px 8px rgba(13, 71, 161, 0.15)
- **Ícones**: --selleta-white com background circular
- **Texto**: Valores em destaque (font-weight: 700)

### **Botões:**
```css
/* Primário */
.btn-primary {
  background: var(--selleta-primary);
  border: 1px solid var(--selleta-primary);
  color: var(--selleta-white);
}
.btn-primary:hover {
  background: var(--selleta-primary-dark);
}

/* Secundário */
.btn-secondary {
  background: transparent;
  border: 1px solid var(--selleta-primary);
  color: var(--selleta-primary);
}

/* Sucesso */
.btn-success {
  background: var(--selleta-success);
  color: var(--selleta-white);
}
```

### **Status e Badges:**
- **Ativo**: var(--selleta-success)
- **Inativo**: var(--selleta-gray-500)
- **Pendente**: var(--selleta-warning)
- **Erro**: var(--selleta-error)
- **Receita**: var(--selleta-success-light) com texto var(--selleta-success)
- **Despesa**: var(--selleta-error-light) com texto var(--selleta-error)

## 📱 Responsividade

### **Breakpoints:**
```css
/* Mobile First */
.container {
  max-width: 100%;
  padding: 0 16px;
}

/* Tablet */
@media (min-width: 768px) {
  .container { max-width: 750px; }
  .grid-2 { grid-template-columns: 1fr 1fr; }
}

/* Desktop */
@media (min-width: 1024px) {
  .container { max-width: 1200px; }
  .grid-4 { grid-template-columns: repeat(4, 1fr); }
  .sidebar { display: block; }
}

/* Large Desktop */
@media (min-width: 1440px) {
  .container { max-width: 1360px; }
}
```

## ✨ Animações e Transições

### **Padrões:**
```css
/* Transições suaves */
.transition-smooth {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

/* Hover effects */
.card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 16px rgba(13, 71, 161, 0.2);
}

/* Loading states */
.loading {
  background: linear-gradient(90deg, 
    var(--selleta-gray-200) 25%, 
    var(--selleta-gray-100) 50%, 
    var(--selleta-gray-200) 75%);
  animation: shimmer 1.5s infinite;
}
```

## 🔤 Tipografia

### **Fonte Principal:**
```css
@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap');

body {
  font-family: 'Poppins', -apple-system, BlinkMacSystemFont, sans-serif;
  font-size: 14px;
  line-height: 1.5;
  color: var(--selleta-gray-800);
}

/* Hierarquia */
.h1, h1 { font-size: 2rem; font-weight: 700; }
.h2, h2 { font-size: 1.5rem; font-weight: 600; }
.h3, h3 { font-size: 1.25rem; font-weight: 600; }
.h4, h4 { font-size: 1rem; font-weight: 500; }

/* Utilitários */
.text-primary { color: var(--selleta-primary); }
.text-success { color: var(--selleta-success); }
.text-error { color: var(--selleta-error); }
.text-muted { color: var(--selleta-gray-600); }
```

## 🎪 Ícones

### **Biblioteca Recomendada:**
- **Font Awesome** ou **Lucide Icons**
- **Tamanho padrão**: 16px (1rem)
- **Cor padrão**: var(--selleta-gray-600)
- **Ícones de status**: usar cores correspondentes

### **Ícones por Contexto:**
- **Financeiro**: 💰 chart-line, dollar-sign, trending-up
- **Clientes**: 👥 users, user-plus, building
- **Transações**: 📋 file-text, calendar, credit-card
- **Status**: ✅ check-circle, ❌ x-circle, ⏳ clock
- **Ações**: ✏️ edit, 🗑️ trash, 👁️ eye, ➕ plus

---

**Última atualização**: 2025-06-24  
**Versão**: 1.0.0