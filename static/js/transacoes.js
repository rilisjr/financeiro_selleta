/**
 * TRANSAÇÕES NOVO - JavaScript v2.0
 * ===================================
 * Sistema completo de filtros e visualização
 * Arquitetura testada: Backend → API → Frontend
 */

// ==========================================
// ESTADO GLOBAL
// ==========================================

const TransacoesApp = {
    // Estado da aplicação
    state: {
        filtros: {},
        filtrosDisponiveis: {},
        transacoes: [],
        kpis: {},
        page: 1,
        per_page: 50,
        total: 0,
        loading: false,
        view: 'table',
        sortBy: 'data_vencimento',
        sortDirection: 'desc'
    },
    
    // Cache para otimização
    cache: {
        filtrosCarregados: false,
        ultimaConsulta: null
    },
    
    // Instâncias de multiselect
    multiselects: {
        empresas: null,
        centros: null
    }
};

// ==========================================
// INICIALIZAÇÃO
// ==========================================

$(document).ready(function() {
    console.log('🚀 Inicializando Transações App v2.0...');
    initializeApp();
});

async function initializeApp() {
    try {
        showLoading(true);
        
        // 1. Carregar filtros disponíveis
        console.log('📋 Carregando filtros disponíveis...');
        await carregarFiltrosDisponiveis();
        
        // 2. Configurar filtros padrão
        console.log('⚙️ Configurando filtros padrão...');
        configurarFiltrosPadrao();
        
        // 3. Configurar event listeners
        console.log('🎯 Configurando event listeners...');
        setupEventListeners();
        
        // 3.1. Configurar busca de fornecedores
        console.log('🔍 Configurando busca de fornecedores...');
        setupFornecedorSearch();
        
        // 3.2. Inicializar multiselects
        console.log('☑️ Inicializando multiselects...');
        initializeMultiselects();
        
        // 4. Carregar dados iniciais
        console.log('📊 Carregando dados iniciais...');
        await carregarDados();
        
        showLoading(false);
        console.log('✅ App inicializado com sucesso!');
        
    } catch (error) {
        console.error('❌ Erro na inicialização:', error);
        showError('Erro ao inicializar aplicação: ' + error.message);
        showLoading(false);
    }
}

// ==========================================
// CARREGAMENTO DE FILTROS
// ==========================================

async function carregarFiltrosDisponiveis() {
    try {
        const response = await fetch('/api/transacoes/filtros', {
            method: 'GET',
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        TransacoesApp.state.filtrosDisponiveis = await response.json();
        TransacoesApp.cache.filtrosCarregados = true;
        
        console.log('✅ Filtros carregados:', TransacoesApp.state.filtrosDisponiveis);
        
        // Popular selects
        popularFiltrosNoDOM();
        
    } catch (error) {
        console.error('❌ Erro ao carregar filtros:', error);
        throw error;
    }
}

function popularFiltrosNoDOM() {
    const filtros = TransacoesApp.state.filtrosDisponiveis;
    
    // Empresas
    popularSelect('filtro-empresa', filtros.entidades.empresas);
    
    // Centros de Custo
    popularSelect('filtro-centro-tipologia', filtros.entidades.centros_custo.por_tipologia);
    // Centro-nome será carregado dinamicamente via filtrarCentrosPorTipologia
    filtrarCentrosPorTipologia(''); // Carregar todos inicialmente
    
    // Fornecedores - Apenas tipos (busca é personalizada)
    popularSelect('filtro-fornecedor-tipo', filtros.entidades.fornecedores.por_tipo);
    
    // Planos Financeiros
    popularPlanosFinanceiros();
    
    // Filtros avançados
    popularSelect('filtro-faixa-valor', filtros.avancados.faixas_valor);
    popularSelect('filtro-tipo-parcela', filtros.avancados.tipos_parcela);
    
    console.log('✅ Filtros populados no DOM');
}

function popularSelect(selectId, opcoes) {
    const select = document.getElementById(selectId);
    if (!select) return;
    
    select.innerHTML = '';
    
    opcoes.forEach(opcao => {
        const option = document.createElement('option');
        option.value = opcao.value;
        option.textContent = opcao.label;
        select.appendChild(option);
    });
}

function popularPlanosFinanceiros() {
    const planos = TransacoesApp.state.filtrosDisponiveis.entidades.plano_financeiro;
    
    // Popular select de planos específicos (todos os níveis)
    const selectPlano = document.getElementById('filtro-plano-especifico');
    if (selectPlano) {
        selectPlano.innerHTML = '<option value="">Todos os planos</option>';
        
        // Adicionar planos por nível
        for (let nivel = 1; nivel <= 4; nivel++) {
            const planosNivel = planos.por_nivel[nivel.toString()];
            if (planosNivel && planosNivel.length > 1) { // >1 porque primeiro é "Todos"
                planosNivel.slice(1).forEach(plano => {
                    const option = document.createElement('option');
                    option.value = plano.value;
                    option.textContent = plano.label;
                    option.dataset.nivel = nivel;
                    selectPlano.appendChild(option);
                });
            }
        }
    }
}

// ==========================================
// CONFIGURAÇÃO PADRÃO
// ==========================================

function configurarFiltrosPadrao() {
    // Filtros padrão conforme especificado
    TransacoesApp.state.filtros = {
        tipo: '',               // Todos os tipos
        status_pagamento: '',   // Todos os status
        status_negociacao: '',  // Todos os status
        periodo: 'todos',       // Todos os períodos
        empresa_id: '',         // Todas as empresas (filtro único)
        empresas_ids: [],       // Empresas selecionadas (filtro múltiplo)
        centro_custo_tipologia: '', // Todas as tipologias
        centro_custo_id: '',    // Todos os centros (filtro único)
        centros_nomes: [],      // Centros selecionados (filtro múltiplo)
        fornecedor_tipo: '',    // Todos os tipos
        fornecedor_id: '',      // Todos os fornecedores
        plano_nivel: '',        // Todos os níveis
        plano_id: '',          // Todos os planos
        faixa_valor: '',       // Todos os valores
        tipo_parcela: '',      // Todas as parcelas
        data_inicio: '',       // Data livre
        data_fim: ''           // Data livre
    };
    
    // Configurar estado de paginação
    TransacoesApp.state.page = 1;
    TransacoesApp.state.per_page = 50;
    TransacoesApp.state.view = 'table';
    
    // Aplicar ao DOM
    aplicarFiltrosAoDOM();
    
    console.log('✅ Filtros padrão configurados');
}

function aplicarFiltrosAoDOM() {
    const filtros = TransacoesApp.state.filtros;
    
    // Aplicar filtros rápidos
    document.querySelectorAll('.filtro-btn').forEach(btn => {
        const filtro = btn.dataset.filtro;
        const valor = btn.dataset.valor;
        
        if (filtros[filtro] === valor) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    
    // SINCRONIZAÇÃO ESPECIAL: Datas personalizadas vs Períodos predefinidos
    const temDatasPersonalizadas = filtros.data_inicio || filtros.data_fim;
    if (temDatasPersonalizadas) {
        // Se tem datas personalizadas, garantir que período está vazio e "Todos" ativo
        document.querySelectorAll('[data-filtro="periodo"]').forEach(btn => {
            btn.classList.remove('active');
        });
        const btnTodos = document.querySelector('[data-filtro="periodo"][data-valor="todos"]');
        if (btnTodos) {
            btnTodos.classList.add('active');
        }
    }
    
    // Aplicar filtros avançados aos selects
    Object.keys(filtros).forEach(key => {
        const elemento = document.getElementById(`filtro-${key.replace('_', '-')}`);
        if (elemento && elemento.tagName === 'SELECT') {
            elemento.value = filtros[key];
        } else if (elemento && elemento.type === 'date') {
            elemento.value = filtros[key];
        }
    });
    
    // Aplicar datas personalizadas aos inputs específicos
    const dataInicioInput = document.getElementById('filtro-rapido-data-inicio');
    const dataFimInput = document.getElementById('filtro-rapido-data-fim');
    
    if (dataInicioInput) dataInicioInput.value = filtros.data_inicio || '';
    if (dataFimInput) dataFimInput.value = filtros.data_fim || '';
    
    // Aplicar configurações de view
    document.getElementById('per-page').value = TransacoesApp.state.per_page;
    
    const sortValue = `${TransacoesApp.state.sortBy}:${TransacoesApp.state.sortDirection}`;
    document.getElementById('ordenacao').value = sortValue;
}

// ==========================================
// EVENT LISTENERS
// ==========================================

function setupEventListeners() {
    // Filtros rápidos
    document.querySelectorAll('.filtro-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const filtro = this.dataset.filtro;
            const valor = this.dataset.valor;
            
            // Remove active de outros botões do mesmo grupo
            document.querySelectorAll(`[data-filtro="${filtro}"]`).forEach(b => {
                b.classList.remove('active');
            });
            
            // Adiciona active ao botão clicado
            this.classList.add('active');
            
            // Atualiza estado
            TransacoesApp.state.filtros[filtro] = valor;
            
            // LÓGICA ESPECIAL: Se for filtro de período, limpar datas personalizadas
            if (filtro === 'periodo' && valor !== '') {
                console.log('🔄 Período predefinido selecionado - limpando datas personalizadas');
                
                // Limpar datas personalizadas
                TransacoesApp.state.filtros.data_inicio = '';
                TransacoesApp.state.filtros.data_fim = '';
                
                // Limpar campos de data no DOM
                const dataInicioInput = document.getElementById('filtro-rapido-data-inicio');
                const dataFimInput = document.getElementById('filtro-rapido-data-fim');
                
                if (dataInicioInput) dataInicioInput.value = '';
                if (dataFimInput) dataFimInput.value = '';
                
                console.log('✅ Datas personalizadas limpas para período:', valor);
            }
            
            // Recarregar dados
            carregarDados();
        });
    });
    
    // Toggle filtros avançados
    window.toggleFiltrosAvancados = function() {
        const filtros = document.getElementById('filtros-avancados');
        filtros.classList.toggle('collapsed');
    };
    
    // Aplicar filtros avançados
    window.aplicarFiltros = function() {
        coletarFiltrosAvancados();
        carregarDados();
    };
    
    // Limpar filtros
    window.limparFiltros = function() {
        console.log('🧹 Limpando todos os filtros...');
        
        // Limpar multiselects
        if (TransacoesApp.multiselects.empresas) {
            TransacoesApp.multiselects.empresas.clearSelection();
        }
        if (TransacoesApp.multiselects.centros) {
            TransacoesApp.multiselects.centros.clearSelection();
        }
        
        // Limpar fornecedor selecionado
        if (document.getElementById('filtro-fornecedor-selected-id').value) {
            limparFornecedorSelecionado();
        }
        
        // Configurar filtros padrão
        configurarFiltrosPadrao();
        carregarDados();
        
        console.log('✅ Filtros limpos');
    };
    
    // Mudança de view
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.addEventListener('click', function() {
            const novaView = this.dataset.view;
            
            // Atualizar botões
            document.querySelectorAll('.tab-button').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            // Atualizar views
            document.querySelectorAll('.view-container').forEach(v => v.style.display = 'none');
            document.getElementById(`view-${novaView}`).style.display = 'block';
            
            TransacoesApp.state.view = novaView;
            
            // Re-renderizar dados na nova view
            renderizarTransacoes();
        });
    });
    
    // Mudança de ordenação
    document.getElementById('ordenacao').addEventListener('change', function() {
        const [campo, direcao] = this.value.split(':');
        TransacoesApp.state.sortBy = campo;
        TransacoesApp.state.sortDirection = direcao;
        carregarDados();
    });
    
    // Mudança de per_page
    document.getElementById('per-page').addEventListener('change', function() {
        TransacoesApp.state.per_page = parseInt(this.value);
        TransacoesApp.state.page = 1; // Reset para primeira página
        carregarDados();
    });
    
    // Filtros avançados - mudança em tempo real
    setupFiltrosAvancadosListeners();
    
    console.log('✅ Event listeners configurados');
}

function coletarFiltrosAvancados() {
    // Coleta todos os valores dos filtros avançados
    const filtros = TransacoesApp.state.filtros;
    
    filtros.empresa_id = document.getElementById('filtro-empresa').value;
    filtros.centro_custo_tipologia = document.getElementById('filtro-centro-tipologia').value;
    filtros.centro_custo_id = document.getElementById('filtro-centro-nome').value;
    filtros.fornecedor_tipo = document.getElementById('filtro-fornecedor-tipo').value;
    filtros.fornecedor_id = document.getElementById('filtro-fornecedor-selected-id').value; // BUSCA PERSONALIZADA
    filtros.plano_nivel = document.getElementById('filtro-plano-nivel').value;
    filtros.plano_id = document.getElementById('filtro-plano-especifico').value;
    filtros.faixa_valor = document.getElementById('filtro-faixa-valor').value;
    filtros.tipo_parcela = document.getElementById('filtro-tipo-parcela').value;
    filtros.data_inicio = document.getElementById('filtro-data-inicio').value;
    filtros.data_fim = document.getElementById('filtro-data-fim').value;
    
    console.log('📋 Filtros coletados:', filtros);
}

function setupFiltrosAvancadosListeners() {
    // Centro de custo - tipologia afeta lista de nomes
    document.getElementById('filtro-centro-tipologia').addEventListener('change', function() {
        filtrarCentrosPorTipologia(this.value);
    });
    
    // Fornecedor - tipo afeta busca (aplicar filtro na busca personalizada)
    document.getElementById('filtro-fornecedor-tipo').addEventListener('change', function() {
        // Limpar fornecedor selecionado quando mudar o tipo
        if (document.getElementById('filtro-fornecedor-selected-id').value) {
            limparFornecedorSelecionado();
        }
    });
    
    // Plano - nível afeta planos específicos
    document.getElementById('filtro-plano-nivel').addEventListener('change', function() {
        filtrarPlanosPorNivel(this.value);
    });
}

async function filtrarCentrosPorTipologia(tipologia) {
    const select = document.getElementById('filtro-centro-nome');
    
    try {
        // Buscar detalhes dos centros de custo
        const response = await fetch('/api/centros-custo/detalhes', {
            method: 'GET',
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        
        select.innerHTML = '<option value="">Todos os centros</option>';
        
        // Filtrar por tipologia se especificada
        const centrosFiltrados = tipologia 
            ? data.centros.filter(c => c.tipologia === tipologia)
            : data.centros;
        
        centrosFiltrados.forEach(centro => {
            const option = document.createElement('option');
            option.value = centro.nome; // Usar nome como value
            option.textContent = centro.label; // Label com informações extras
            option.title = `Empresas: ${centro.empresas.join(', ')}`;
            select.appendChild(option);
        });
        
        console.log(`✅ Centros filtrados por tipologia "${tipologia}": ${centrosFiltrados.length} centros`);
        
    } catch (error) {
        console.error('Erro ao filtrar centros por tipologia:', error);
        // Fallback para método anterior
        const centros = TransacoesApp.state.filtrosDisponiveis.entidades.centros_custo.por_mascara;
        
        select.innerHTML = '<option value="">Todos os centros</option>';
        
        centros.slice(1).forEach(centro => {
            if (!tipologia || centro.tipologia === tipologia) {
                const option = document.createElement('option');
                option.value = centro.value;
                option.textContent = centro.label;
                select.appendChild(option);
            }
        });
    }
}

// FUNÇÃO REMOVIDA: filtrarFornecedoresPorTipo - agora usa busca personalizada

function filtrarPlanosPorNivel(nivel) {
    const select = document.getElementById('filtro-plano-especifico');
    
    if (!nivel) {
        // Mostrar todos os planos
        popularPlanosFinanceiros();
        return;
    }
    
    const planos = TransacoesApp.state.filtrosDisponiveis.entidades.plano_financeiro.por_nivel[nivel];
    
    select.innerHTML = '<option value="">Todos os planos</option>';
    
    if (planos && planos.length > 1) {
        planos.slice(1).forEach(plano => { // Pula o primeiro "Todos"
            const option = document.createElement('option');
            option.value = plano.value;
            option.textContent = plano.label;
            select.appendChild(option);
        });
    }
}

// ==========================================
// CARREGAMENTO DE DADOS
// ==========================================

async function carregarDados() {
    if (TransacoesApp.state.loading) {
        console.log('⏳ Carregamento já em andamento...');
        return;
    }
    
    try {
        TransacoesApp.state.loading = true;
        showLoading(true);
        
        const payload = {
            filtros: TransacoesApp.state.filtros,
            page: TransacoesApp.state.page,
            per_page: TransacoesApp.state.per_page,
            sort_by: TransacoesApp.state.sortBy,
            sort_direction: TransacoesApp.state.sortDirection
        };
        
        console.log('📤 ENVIANDO REQUISIÇÃO COMPLETA:', payload);
        console.log('🔍 FILTROS DE DATA ESPECÍFICOS:', {
            data_inicio: payload.filtros.data_inicio,
            data_fim: payload.filtros.data_fim,
            periodo: payload.filtros.periodo
        });
        
        const response = await fetch('/api/transacoes/buscar', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify(payload)
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const dados = await response.json();
        
        console.log('📥 Dados recebidos:', dados);
        
        // Atualizar estado
        TransacoesApp.state.transacoes = dados.transacoes;
        TransacoesApp.state.kpis = dados.kpis;
        TransacoesApp.state.total = dados.total;
        TransacoesApp.cache.ultimaConsulta = new Date();
        
        // Atualizar interface
        atualizarKPIs();
        atualizarStatusInfo();
        renderizarTransacoes();
        renderizarPaginacao();
        
        // Verificar se não há dados
        if (dados.transacoes.length === 0) {
            mostrarEstadoVazio();
        } else {
            esconderEstadoVazio();
        }
        
    } catch (error) {
        console.error('❌ Erro ao carregar dados:', error);
        showError('Erro ao carregar transações: ' + error.message);
    } finally {
        TransacoesApp.state.loading = false;
        showLoading(false);
    }
}

// ==========================================
// ATUALIZAÇÃO DE INTERFACE
// ==========================================

function atualizarKPIs() {
    const kpis = TransacoesApp.state.kpis;
    
    // Atualizar valores
    document.getElementById('kpiReceitas').textContent = formatCurrency(kpis.receitas || 0);
    document.getElementById('kpiDespesas').textContent = formatCurrency(kpis.despesas || 0);
    document.getElementById('kpiSaldo').textContent = formatCurrency(kpis.saldo || 0);
    document.getElementById('kpiTotal').textContent = (kpis.total_transacoes || 0).toLocaleString();
    
    // Atualizar contadores
    document.getElementById('countReceitas').textContent = `${kpis.count_receitas || 0} transações`;
    document.getElementById('countDespesas').textContent = `${kpis.count_despesas || 0} transações`;
    document.getElementById('kpiMedia').textContent = `Média: ${formatCurrency(kpis.valor_medio || 0)}`;
    
    // Atualizar período
    const periodoTexto = obterTextoPeriodo();
    document.getElementById('kpiPeriodo').textContent = periodoTexto;
    
    // Colorir saldo
    const saldoElement = document.getElementById('kpiSaldo');
    saldoElement.style.color = (kpis.saldo || 0) >= 0 ? '#2e7d32' : '#d32f2f';
    
    console.log('✅ KPIs atualizados');
}

function obterTextoPeriodo() {
    const filtros = TransacoesApp.state.filtros;
    const kpis = TransacoesApp.state.kpis;
    
    // PRIORIDADE 1: Período personalizado via datas
    if (filtros.data_inicio && filtros.data_fim) {
        return `📅 ${formatDate(filtros.data_inicio)} - ${formatDate(filtros.data_fim)}`;
    }
    if (filtros.data_inicio && !filtros.data_fim) {
        return `📅 A partir de ${formatDate(filtros.data_inicio)}`;
    }
    if (!filtros.data_inicio && filtros.data_fim) {
        return `📅 Até ${formatDate(filtros.data_fim)}`;
    }
    
    // PRIORIDADE 2: Períodos predefinidos
    if (filtros.periodo === 'mes_atual') return 'Este mês';
    if (filtros.periodo === 'ano_atual') return 'Este ano';
    if (filtros.periodo === 'ultimos_3_meses') return 'Últimos 3 meses';
    
    // PRIORIDADE 3: Dados do backend (quando disponível)
    if (kpis.periodo_dados && kpis.periodo_dados.inicio && kpis.periodo_dados.fim) {
        return `${formatDate(kpis.periodo_dados.inicio)} - ${formatDate(kpis.periodo_dados.fim)}`;
    }
    
    return 'Todos os períodos';
}

function atualizarStatusInfo() {
    const state = TransacoesApp.state;
    
    const inicio = (state.page - 1) * state.per_page + 1;
    const fim = Math.min(state.page * state.per_page, state.total);
    const totalPages = Math.ceil(state.total / state.per_page);
    
    document.getElementById('results-showing').textContent = `${inicio}-${fim}`;
    document.getElementById('results-total').textContent = state.total.toLocaleString();
    document.getElementById('results-page').textContent = state.page;
    document.getElementById('results-pages').textContent = totalPages;
    
    // Mostrar/esconder elementos
    document.getElementById('loading-status').style.display = 'none';
    document.getElementById('results-info').style.display = 'block';
}

// ==========================================
// RENDERIZAÇÃO DE TRANSAÇÕES
// ==========================================

function renderizarTransacoes() {
    const view = TransacoesApp.state.view;
    
    switch (view) {
        case 'table':
            renderizarTabelaView();
            break;
        case 'cards':
            renderizarCardsView();
            break;
        case 'timeline':
            renderizarTimelineView();
            break;
        default:
            renderizarTabelaView();
    }
}

function renderizarTabelaView() {
    const tbody = document.getElementById('transacoes-table-body');
    const transacoes = TransacoesApp.state.transacoes;
    
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    transacoes.forEach(transacao => {
        const row = document.createElement('tr');
        
        row.innerHTML = `
            <td>
                <input type="checkbox" class="transacao-checkbox" value="${transacao.id}">
            </td>
            <td>
                <strong>${escapeHtml(transacao.titulo || '')}</strong>
                ${transacao.parcela_total > 1 ? `<br><small>Parcela ${transacao.parcela_atual}/${transacao.parcela_total}</small>` : ''}
            </td>
            <td>
                <span class="tipo-badge tipo-${transacao.tipo.toLowerCase()}">${transacao.tipo}</span>
            </td>
            <td class="valor-${transacao.tipo.toLowerCase()}">
                ${formatCurrency(transacao.valor)}
            </td>
            <td>
                ${formatDate(transacao.data_vencimento)}
                ${transacao.data_vencimento !== transacao.data_lancamento ? `<br><small>Lanç: ${formatDate(transacao.data_lancamento)}</small>` : ''}
            </td>
            <td>
                <span class="status-badge status-${transacao.status_pagamento.toLowerCase().replace('ç', 'c')}">${transacao.status_pagamento}</span>
            </td>
            <td>
                <span title="${escapeHtml(transacao.fornecedor_nome || 'N/A')}">${truncateText(transacao.fornecedor_nome || 'N/A', 25)}</span>
                ${transacao.fornecedor_tipo ? `<br><small>${transacao.fornecedor_tipo}</small>` : ''}
            </td>
            <td>
                <span title="${escapeHtml(transacao.centro_custo_nome || 'N/A')}">${truncateText(transacao.centro_custo_nome || 'N/A', 20)}</span>
                ${transacao.centro_custo_tipologia ? `<br><small>${transacao.centro_custo_tipologia}</small>` : ''}
            </td>
            <td>
                <div class="action-buttons">
                    <button class="btn-icon" onclick="editarTransacao(${transacao.id})" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-icon" onclick="excluirTransacao(${transacao.id})" title="Excluir">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        `;
        
        tbody.appendChild(row);
    });
    
    console.log(`✅ Tabela renderizada: ${transacoes.length} transações`);
}

function renderizarCardsView() {
    const container = document.getElementById('transacoes-cards');
    const transacoes = TransacoesApp.state.transacoes;
    
    if (!container) return;
    
    container.innerHTML = '';
    
    transacoes.forEach(transacao => {
        const card = document.createElement('div');
        card.className = 'transacao-card';
        
        card.innerHTML = `
            <div class="card-header">
                <h4>${escapeHtml(transacao.titulo || '')}</h4>
                <span class="tipo-badge tipo-${transacao.tipo.toLowerCase()}">${transacao.tipo}</span>
            </div>
            <div class="card-body">
                <div class="card-row">
                    <span class="label">Valor:</span>
                    <span class="valor-${transacao.tipo.toLowerCase()}">${formatCurrency(transacao.valor)}</span>
                </div>
                <div class="card-row">
                    <span class="label">Vencimento:</span>
                    <span>${formatDate(transacao.data_vencimento)}</span>
                </div>
                <div class="card-row">
                    <span class="label">Status:</span>
                    <span class="status-badge status-${transacao.status_pagamento.toLowerCase().replace('ç', 'c')}">${transacao.status_pagamento}</span>
                </div>
                <div class="card-row">
                    <span class="label">Fornecedor:</span>
                    <span>${escapeHtml(transacao.fornecedor_nome || 'N/A')}</span>
                </div>
                ${transacao.parcela_total > 1 ? `
                <div class="card-row">
                    <span class="label">Parcela:</span>
                    <span>${transacao.parcela_atual}/${transacao.parcela_total}</span>
                </div>
                ` : ''}
            </div>
            <div class="card-actions">
                <button class="btn btn-secondary" onclick="editarTransacao(${transacao.id})">
                    <i class="fas fa-edit"></i> Editar
                </button>
                <button class="btn btn-secondary" onclick="excluirTransacao(${transacao.id})">
                    <i class="fas fa-trash"></i> Excluir
                </button>
            </div>
        `;
        
        container.appendChild(card);
    });
    
    console.log(`✅ Cards renderizados: ${transacoes.length} transações`);
}

function renderizarTimelineView() {
    const container = document.getElementById('transacoes-timeline');
    const transacoes = TransacoesApp.state.transacoes;
    
    if (!container) return;
    
    container.innerHTML = '';
    
    // Agrupar por data
    const transacoesPorData = {};
    transacoes.forEach(transacao => {
        const data = transacao.data_vencimento;
        if (!transacoesPorData[data]) {
            transacoesPorData[data] = [];
        }
        transacoesPorData[data].push(transacao);
    });
    
    // Renderizar por data
    Object.keys(transacoesPorData).sort().forEach(data => {
        const timelineItem = document.createElement('div');
        timelineItem.className = 'timeline-item';
        
        const transacoesData = transacoesPorData[data];
        const totalData = transacoesData.reduce((acc, t) => acc + t.valor, 0);
        
        timelineItem.innerHTML = `
            <div class="timeline-date">
                <strong>${formatDate(data)}</strong>
                <br><small>${transacoesData.length} transações</small>
                <br><small>${formatCurrency(totalData)}</small>
            </div>
            <div class="timeline-content">
                ${transacoesData.map(t => `
                    <div class="timeline-transacao">
                        <span class="tipo-badge tipo-${t.tipo.toLowerCase()}">${t.tipo}</span>
                        <strong>${escapeHtml(t.titulo || '')}</strong>
                        <span class="valor-${t.tipo.toLowerCase()}">${formatCurrency(t.valor)}</span>
                        <br><small>${escapeHtml(t.fornecedor_nome || 'N/A')}</small>
                    </div>
                `).join('')}
            </div>
        `;
        
        container.appendChild(timelineItem);
    });
    
    console.log(`✅ Timeline renderizada: ${Object.keys(transacoesPorData).length} datas`);
}

// ==========================================
// PAGINAÇÃO
// ==========================================

function renderizarPaginacao() {
    const container = document.getElementById('pagination');
    const totalPages = Math.ceil(TransacoesApp.state.total / TransacoesApp.state.per_page);
    const currentPage = TransacoesApp.state.page;
    
    if (!container || totalPages <= 1) {
        container.innerHTML = '';
        return;
    }
    
    let html = '';
    
    // Botão anterior
    html += `<button class="page-btn" ${currentPage === 1 ? 'disabled' : ''} onclick="irParaPagina(${currentPage - 1})">
        <i class="fas fa-chevron-left"></i> Anterior
    </button>`;
    
    // Páginas numeradas
    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, startPage + 4);
    
    if (startPage > 1) {
        html += `<button class="page-btn" onclick="irParaPagina(1)">1</button>`;
        if (startPage > 2) {
            html += `<span class="page-ellipsis">...</span>`;
        }
    }
    
    for (let i = startPage; i <= endPage; i++) {
        html += `<button class="page-btn ${i === currentPage ? 'active' : ''}" onclick="irParaPagina(${i})">${i}</button>`;
    }
    
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            html += `<span class="page-ellipsis">...</span>`;
        }
        html += `<button class="page-btn" onclick="irParaPagina(${totalPages})">${totalPages}</button>`;
    }
    
    // Botão próximo
    html += `<button class="page-btn" ${currentPage === totalPages ? 'disabled' : ''} onclick="irParaPagina(${currentPage + 1})">
        Próximo <i class="fas fa-chevron-right"></i>
    </button>`;
    
    container.innerHTML = html;
}

window.irParaPagina = function(page) {
    if (page >= 1 && page <= Math.ceil(TransacoesApp.state.total / TransacoesApp.state.per_page)) {
        TransacoesApp.state.page = page;
        carregarDados();
    }
};

// ==========================================
// UTILITÁRIOS
// ==========================================

function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value || 0);
}

function formatDate(dateString) {
    if (!dateString) return '-';
    
    try {
        const date = new Date(dateString + 'T00:00:00');
        return date.toLocaleDateString('pt-BR');
    } catch (error) {
        return dateString;
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function truncateText(text, maxLength) {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

function showLoading(show) {
    const overlay = document.getElementById('loading-overlay');
    const status = document.getElementById('loading-status');
    
    if (show) {
        if (overlay) overlay.style.display = 'flex';
        if (status) status.style.display = 'block';
    } else {
        if (overlay) overlay.style.display = 'none';
        if (status) status.style.display = 'none';
    }
}

function showError(message) {
    console.error('Erro:', message);
    // Implementar notificação de erro visual
    alert('Erro: ' + message);
}

function mostrarEstadoVazio() {
    document.getElementById('empty-state').style.display = 'block';
    document.querySelector('.content-area').style.display = 'none';
}

function esconderEstadoVazio() {
    document.getElementById('empty-state').style.display = 'none';
    document.querySelector('.content-area').style.display = 'block';
}

// ==========================================
// AÇÕES DE TRANSAÇÕES
// ==========================================

window.novaTransacao = function() {
    console.log('🆕 Nova transação');
    // Implementar modal de nova transação
    alert('Funcionalidade de nova transação será implementada');
};

window.editarTransacao = function(id) {
    console.log('✏️ Editar transação:', id);
    // Implementar edição de transação
    alert(`Editar transação ${id} - será implementado`);
};

window.excluirTransacao = function(id) {
    console.log('🗑️ Excluir transação:', id);
    if (confirm('Tem certeza que deseja excluir esta transação?')) {
        // Implementar exclusão
        alert(`Excluir transação ${id} - será implementado`);
    }
};

// ==========================================
// FILTROS DE DATA RÁPIDOS
// ==========================================

window.aplicarFiltroData = function() {
    console.log('📅 Aplicando filtros de data personalizados...');
    
    const dataInicio = document.getElementById('filtro-rapido-data-inicio').value;
    const dataFim = document.getElementById('filtro-rapido-data-fim').value;
    
    // Atualizar estado dos filtros
    TransacoesApp.state.filtros.data_inicio = dataInicio;
    TransacoesApp.state.filtros.data_fim = dataFim;
    
    // Se datas foram preenchidas, CANCELAR período predefinido
    if (dataInicio || dataFim) {
        console.log('🔄 Período personalizado ativado - cancelando períodos predefinidos');
        
        // Limpar período predefinido
        TransacoesApp.state.filtros.periodo = '';
        
        // Remover active de TODOS os botões de período predefinido
        document.querySelectorAll('[data-filtro="periodo"]').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Ativar apenas o botão "Todos" para indicar período personalizado
        const btnTodos = document.querySelector('[data-filtro="periodo"][data-valor="todos"]');
        if (btnTodos) {
            btnTodos.classList.add('active');
        }
    } else {
        // Se nenhuma data foi preenchida, voltar ao período "todos"
        console.log('🔄 Datas vazias - voltando ao período padrão');
        TransacoesApp.state.filtros.periodo = 'todos';
    }
    
    // Recarregar dados
    carregarDados();
    
    console.log('✅ Filtros de data aplicados:', { 
        dataInicio, 
        dataFim, 
        periodo: TransacoesApp.state.filtros.periodo 
    });
};

// ==========================================
// BUSCA DE FORNECEDORES
// ==========================================

let fornecedorSearchTimeout = null;
let fornecedorSelectedIndex = -1;

window.limparFornecedorSelecionado = function() {
    document.getElementById('filtro-fornecedor-busca').value = '';
    document.getElementById('filtro-fornecedor-selected-id').value = '';
    document.getElementById('fornecedor-selected').style.display = 'none';
    document.getElementById('filtro-fornecedor-busca').style.display = 'block';
    document.getElementById('fornecedor-search-results').style.display = 'none';
    
    // Atualizar filtros
    TransacoesApp.state.filtros.fornecedor_id = '';
    carregarDados();
};

function setupFornecedorSearch() {
    const searchInput = document.getElementById('filtro-fornecedor-busca');
    const resultsContainer = document.getElementById('fornecedor-search-results');
    
    if (!searchInput) return;
    
    // Event listeners
    searchInput.addEventListener('input', function() {
        const termo = this.value.trim();
        
        // Debounce
        clearTimeout(fornecedorSearchTimeout);
        fornecedorSearchTimeout = setTimeout(() => {
            buscarFornecedores(termo);
        }, 300);
    });
    
    searchInput.addEventListener('keydown', function(e) {
        const items = resultsContainer.querySelectorAll('.fornecedor-search-item');
        
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            fornecedorSelectedIndex = Math.min(fornecedorSelectedIndex + 1, items.length - 1);
            highlightFornecedorItem(items);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            fornecedorSelectedIndex = Math.max(fornecedorSelectedIndex - 1, -1);
            highlightFornecedorItem(items);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (fornecedorSelectedIndex >= 0 && items[fornecedorSelectedIndex]) {
                items[fornecedorSelectedIndex].click();
            }
        } else if (e.key === 'Escape') {
            resultsContainer.style.display = 'none';
            fornecedorSelectedIndex = -1;
        }
    });
    
    // Fechar resultados ao clicar fora
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.fornecedor-search-container')) {
            resultsContainer.style.display = 'none';
            fornecedorSelectedIndex = -1;
        }
    });
}

async function buscarFornecedores(termo) {
    const resultsContainer = document.getElementById('fornecedor-search-results');
    const tipoFiltro = document.getElementById('filtro-fornecedor-tipo').value;
    
    if (!termo || termo.length < 2) {
        resultsContainer.style.display = 'none';
        return;
    }
    
    try {
        // Mostrar loading
        resultsContainer.innerHTML = '<div class="fornecedor-search-loading">🔍 Buscando...</div>';
        resultsContainer.style.display = 'block';
        
        const response = await fetch('/api/fornecedores/buscar', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
                termo: termo,
                tipo: tipoFiltro,
                limite: 20
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        renderizarResultadosFornecedores(data.fornecedores);
        
    } catch (error) {
        console.error('Erro na busca de fornecedores:', error);
        resultsContainer.innerHTML = '<div class="fornecedor-search-empty">❌ Erro na busca</div>';
    }
}

function renderizarResultadosFornecedores(fornecedores) {
    const resultsContainer = document.getElementById('fornecedor-search-results');
    
    if (fornecedores.length === 0) {
        resultsContainer.innerHTML = '<div class="fornecedor-search-empty">🔍 Nenhum fornecedor encontrado</div>';
        return;
    }
    
    const html = fornecedores.map(fornecedor => `
        <div class="fornecedor-search-item" onclick="selecionarFornecedor(${fornecedor.id}, '${fornecedor.nome.replace(/'/g, "\\'")}')">
            <div class="fornecedor-item-name">${escapeHtml(fornecedor.nome)}</div>
            <div class="fornecedor-item-details">
                <span class="fornecedor-item-tipo">${fornecedor.tipo}</span>
                <span class="fornecedor-item-stats">
                    ${fornecedor.total_transacoes} transações | ${formatCurrency(fornecedor.valor_movimentado)}
                </span>
            </div>
        </div>
    `).join('');
    
    resultsContainer.innerHTML = html;
    fornecedorSelectedIndex = -1;
}

function highlightFornecedorItem(items) {
    items.forEach((item, index) => {
        if (index === fornecedorSelectedIndex) {
            item.classList.add('highlighted');
        } else {
            item.classList.remove('highlighted');
        }
    });
}

window.selecionarFornecedor = function(id, nome) {
    // Atualizar interface
    document.getElementById('filtro-fornecedor-busca').style.display = 'none';
    document.getElementById('fornecedor-search-results').style.display = 'none';
    
    const selectedContainer = document.getElementById('fornecedor-selected');
    const selectedName = selectedContainer.querySelector('.fornecedor-selected-name');
    
    selectedName.textContent = nome;
    selectedContainer.style.display = 'flex';
    
    // Atualizar estado
    document.getElementById('filtro-fornecedor-selected-id').value = id;
    TransacoesApp.state.filtros.fornecedor_id = id;
    
    // Recarregar dados
    carregarDados();
    
    console.log('✅ Fornecedor selecionado:', { id, nome });
};

// ==========================================
// INICIALIZAÇÃO DOS MULTISELECTS
// ==========================================

function initializeMultiselects() {
    // Multiselect de Empresas
    TransacoesApp.multiselects.empresas = new MultiSelect('multiselect-empresas', {
        placeholder: 'Selecione empresas...',
        searchPlaceholder: 'Buscar empresa...',
        maxTags: 3,
        onSelectionChange: (selectedValues) => {
            console.log('📊 Empresas selecionadas:', selectedValues);
            TransacoesApp.state.filtros.empresas_ids = selectedValues;
            carregarDados();
        }
    });
    
    // Multiselect de Centros de Custo
    TransacoesApp.multiselects.centros = new MultiSelect('multiselect-centros', {
        placeholder: 'Selecione centros de custo...',
        searchPlaceholder: 'Buscar centro...',
        maxTags: 3,
        onSelectionChange: (selectedValues) => {
            console.log('🏢 Centros selecionados:', selectedValues);
            TransacoesApp.state.filtros.centros_nomes = selectedValues;
            carregarDados();
        }
    });
    
    // Carregar dados iniciais dos multiselects
    carregarDadosMultiselects();
}

async function carregarDadosMultiselects() {
    try {
        // Carregar empresas
        if (TransacoesApp.state.filtrosDisponiveis.entidades?.empresas) {
            const empresasData = TransacoesApp.state.filtrosDisponiveis.entidades.empresas
                .filter(e => e.value !== '') // Remove "Todas as empresas"
                .map(e => ({
                    value: String(e.value), // Garantir que value seja string
                    label: e.label,
                    count: null
                }));
            
            console.log('🏢 DEBUG: Dados das empresas para multiselect:', empresasData);
            TransacoesApp.multiselects.empresas.setData(empresasData);
        }
        
        // Carregar centros de custo
        const response = await fetch('/api/centros-custo/detalhes', {
            method: 'GET',
            credentials: 'include'
        });
        
        if (response.ok) {
            const data = await response.json();
            const centrosData = data.centros.map(c => ({
                value: c.nome,
                label: c.label,
                count: c.total_transacoes,
                tipologia: c.tipologia,
                empresas: c.empresas
            }));
            
            TransacoesApp.multiselects.centros.setData(centrosData);
        }
        
        console.log('✅ Dados dos multiselects carregados');
        
    } catch (error) {
        console.error('❌ Erro ao carregar dados dos multiselects:', error);
    }
}

// ==========================================
// CLASSE MULTISELECT REUTILIZÁVEL
// ==========================================

class MultiSelect {
    constructor(container, options = {}) {
        this.container = typeof container === 'string' ? document.getElementById(container) : container;
        this.options = {
            placeholder: 'Selecione opções...',
            searchPlaceholder: 'Buscar...',
            allowSearch: true,
            maxTags: 5,
            maxHeight: 300,
            onSelectionChange: null,
            ...options
        };
        
        this.data = [];
        this.selectedValues = new Set();
        this.isOpen = false;
        this.searchTerm = '';
        
        this.init();
    }
    
    init() {
        this.container.innerHTML = this.createHTML();
        this.bindEvents();
    }
    
    createHTML() {
        return `
            <div class="multiselect-container" tabindex="0">
                <div class="multiselect-toggle">
                    <div class="multiselect-selected">
                        <span class="multiselect-placeholder">${this.options.placeholder}</span>
                    </div>
                    <span class="multiselect-arrow">▼</span>
                </div>
                <div class="multiselect-dropdown">
                    ${this.options.allowSearch ? `
                        <div class="multiselect-search">
                            <input type="text" placeholder="${this.options.searchPlaceholder}">
                        </div>
                    ` : ''}
                    <div class="multiselect-options"></div>
                    <div class="multiselect-actions">
                        <button type="button" class="multiselect-action-btn" data-action="select-all">Todos</button>
                        <button type="button" class="multiselect-action-btn" data-action="clear-all">Limpar</button>
                    </div>
                </div>
            </div>
        `;
    }
    
    bindEvents() {
        const toggle = this.container.querySelector('.multiselect-toggle');
        const dropdown = this.container.querySelector('.multiselect-dropdown');
        const searchInput = this.container.querySelector('.multiselect-search input');
        const actionsContainer = this.container.querySelector('.multiselect-actions');
        
        // Toggle dropdown
        toggle.addEventListener('click', (e) => {
            e.preventDefault();
            this.toggle();
        });
        
        // Search
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchTerm = e.target.value;
                this.renderOptions();
            });
        }
        
        // Actions
        actionsContainer.addEventListener('click', (e) => {
            if (e.target.dataset.action === 'select-all') {
                this.selectAll();
            } else if (e.target.dataset.action === 'clear-all') {
                this.clearAll();
            }
        });
        
        // Close on outside click
        document.addEventListener('click', (e) => {
            if (!this.container.contains(e.target)) {
                this.close();
            }
        });
        
        // Keyboard navigation
        this.container.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.close();
            }
        });
    }
    
    setData(data) {
        console.log('📊 SetData recebido:', data);
        this.data = data.map(item => ({
            value: String(item.value || item.id), // Garantir string
            label: item.label || item.name,
            count: item.count || null,
            ...item
        }));
        console.log('📊 Data processado:', this.data);
        this.renderOptions();
    }
    
    toggle() {
        this.isOpen ? this.close() : this.open();
    }
    
    open() {
        this.isOpen = true;
        this.container.querySelector('.multiselect-container').classList.add('open');
        
        // Focus search if available
        const searchInput = this.container.querySelector('.multiselect-search input');
        if (searchInput) {
            setTimeout(() => searchInput.focus(), 100);
        }
    }
    
    close() {
        this.isOpen = false;
        this.container.querySelector('.multiselect-container').classList.remove('open');
    }
    
    renderOptions() {
        const optionsContainer = this.container.querySelector('.multiselect-options');
        
        // Filter data based on search
        const filteredData = this.data.filter(item =>
            item.label.toLowerCase().includes(this.searchTerm.toLowerCase())
        );
        
        if (filteredData.length === 0) {
            optionsContainer.innerHTML = '<div class="multiselect-empty">Nenhum item encontrado</div>';
            return;
        }
        
        const html = filteredData.map(item => {
            const isSelected = this.selectedValues.has(item.value);
            return `
                <div class="multiselect-option ${isSelected ? 'selected' : ''}" data-value="${item.value}">
                    <div class="multiselect-checkbox ${isSelected ? 'checked' : ''}"></div>
                    <span class="multiselect-option-text" title="${item.label}">${item.label}</span>
                    ${item.count !== null ? `<span class="multiselect-option-count">${item.count}</span>` : ''}
                </div>
            `;
        }).join('');
        
        optionsContainer.innerHTML = html;
        
        // Remove event listeners anteriores para evitar duplicação
        const existingHandler = optionsContainer.onclick;
        if (existingHandler) {
            optionsContainer.removeEventListener('click', existingHandler);
        }
        
        // Bind option clicks - usar arrow function para manter contexto
        const handleOptionClick = (e) => {
            const option = e.target.closest('.multiselect-option');
            if (option) {
                const value = option.dataset.value;
                console.log('🎯 Clicou na opção:', value, option.textContent.trim());
                this.toggleOption(value);
            }
        };
        
        optionsContainer.addEventListener('click', handleOptionClick);
        optionsContainer.onclick = handleOptionClick; // Guardar referência para remoção
    }
    
    toggleOption(value) {
        console.log('🔄 Toggle option:', value, 'Current selected:', Array.from(this.selectedValues));
        
        if (this.selectedValues.has(value)) {
            console.log('❌ Removendo:', value);
            this.selectedValues.delete(value);
        } else {
            console.log('✅ Adicionando:', value);
            this.selectedValues.add(value);
        }
        
        console.log('📋 Após toggle:', Array.from(this.selectedValues));
        
        this.updateDisplay();
        this.renderOptions(); // Re-render to update checkboxes
        
        if (this.options.onSelectionChange) {
            this.options.onSelectionChange(this.getSelectedValues());
        }
    }
    
    selectAll() {
        const filteredData = this.data.filter(item =>
            item.label.toLowerCase().includes(this.searchTerm.toLowerCase())
        );
        
        filteredData.forEach(item => {
            this.selectedValues.add(item.value);
        });
        
        this.updateDisplay();
        this.renderOptions();
        
        if (this.options.onSelectionChange) {
            this.options.onSelectionChange(this.getSelectedValues());
        }
    }
    
    clearAll() {
        this.selectedValues.clear();
        this.updateDisplay();
        this.renderOptions();
        
        if (this.options.onSelectionChange) {
            this.options.onSelectionChange(this.getSelectedValues());
        }
    }
    
    updateDisplay() {
        const selectedContainer = this.container.querySelector('.multiselect-selected');
        
        if (this.selectedValues.size === 0) {
            selectedContainer.innerHTML = `<span class="multiselect-placeholder">${this.options.placeholder}</span>`;
            return;
        }
        
        const selectedItems = Array.from(this.selectedValues).map(value => {
            const item = this.data.find(d => d.value === value);
            return item ? item.label : value;
        });
        
        // Show tags or count
        if (selectedItems.length <= this.options.maxTags) {
            const tagsHTML = Array.from(this.selectedValues).map(value => {
                const item = this.data.find(d => d.value === value);
                const label = item ? item.label : value;
                return `
                    <span class="multiselect-tag">
                        <span class="multiselect-tag-text" title="${label}">${label}</span>
                        <button type="button" class="multiselect-tag-remove" data-value="${value}">×</button>
                    </span>
                `;
            }).join('');
            
            selectedContainer.innerHTML = tagsHTML;
            
            // Remove event listeners anteriores
            const existingHandler = selectedContainer.onclick;
            if (existingHandler) {
                selectedContainer.removeEventListener('click', existingHandler);
            }
            
            // Bind remove buttons
            const handleRemoveClick = (e) => {
                if (e.target.classList.contains('multiselect-tag-remove')) {
                    e.stopPropagation();
                    const value = e.target.dataset.value;
                    console.log('🗑️ Removendo tag:', value);
                    this.toggleOption(value);
                }
            };
            
            selectedContainer.addEventListener('click', handleRemoveClick);
            selectedContainer.onclick = handleRemoveClick;
        } else {
            selectedContainer.innerHTML = `<span class="multiselect-count">${selectedItems.length} itens selecionados</span>`;
        }
    }
    
    getSelectedValues() {
        return Array.from(this.selectedValues);
    }
    
    getSelectedItems() {
        return Array.from(this.selectedValues).map(value => {
            return this.data.find(item => item.value === value);
        }).filter(Boolean);
    }
    
    setSelectedValues(values) {
        this.selectedValues = new Set(values);
        this.updateDisplay();
        this.renderOptions();
    }
    
    clearSelection() {
        this.clearAll();
    }
    
    destroy() {
        // Clean up event listeners if needed
        this.container.innerHTML = '';
    }
}

// ==========================================
// EXPOSIÇÃO GLOBAL PARA DEBUG
// ==========================================

window.TransacoesApp = TransacoesApp;
window.recarregarDados = carregarDados;

console.log('📚 TransacoesApp v2.0 carregado!');