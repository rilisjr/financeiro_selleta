/**
 * TRANSAÇÕES v3.0 - Com TableComponent
 * ====================================
 * Sistema completo de filtros e visualização
 * Integrado com TableComponent reutilizável
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
    
    // Instâncias
    multiselects: {
        empresas: null,
        centros: null
    },
    
    // Instância do TableComponent
    tableComponent: null
};

// Variáveis globais para busca de fornecedores
let fornecedorSearchTimeout = null;
let fornecedorSelectedIndex = -1;

// ==========================================
// INICIALIZAÇÃO
// ==========================================

$(document).ready(function() {
    console.log('🚀 Inicializando Transações App v3.0...');
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
        
        // 3. Configurar event listeners dos filtros
        console.log('🎯 Configurando event listeners...');
        setupEventListeners();
        
        // 3.1. Configurar busca de fornecedores
        console.log('🔍 Configurando busca de fornecedores...');
        setupFornecedorSearch();
        
        // 3.2. Inicializar multiselects
        console.log('☑️ Inicializando multiselects...');
        initializeMultiselects();
        
        // 4. Inicializar TableComponent
        console.log('📊 Inicializando TableComponent...');
        initializeTableComponent();
        
        // 5. Carregar dados iniciais
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
    
    if (!filtros || !filtros.entidades) {
        console.error('❌ Estrutura de filtros inválida:', filtros);
        return;
    }
    
    // Centros de Custo - Tipologia
    if (filtros.entidades.centros_custo?.por_tipologia) {
        popularSelect('filtro-centro-tipologia', filtros.entidades.centros_custo.por_tipologia);
    }
    
    // Fornecedores - Tipos
    if (filtros.entidades.fornecedores?.por_tipo) {
        popularSelect('filtro-fornecedor-tipo', filtros.entidades.fornecedores.por_tipo);
    }
    
    // Planos Financeiros
    if (filtros.entidades.plano_financeiro) {
        popularPlanosFinanceiros();
    }
    
    // Filtros avançados
    if (filtros.avancados?.faixas_valor) {
        popularSelect('filtro-faixa-valor', filtros.avancados.faixas_valor);
    }
    
    if (filtros.avancados?.origens) {
        popularSelect('filtro-origem', filtros.avancados.origens);
    }
    
    console.log('✅ Filtros populados no DOM');
}

function popularSelect(selectId, opcoes) {
    const select = document.getElementById(selectId);
    if (!select) {
        console.warn(`Select #${selectId} não encontrado`);
        return;
    }
    
    select.innerHTML = '';
    
    if (!opcoes || !Array.isArray(opcoes)) {
        console.warn(`Opções inválidas para select #${selectId}:`, opcoes);
        return;
    }
    
    opcoes.forEach(opcao => {
        const option = document.createElement('option');
        option.value = opcao.value || '';
        option.textContent = opcao.label || opcao.value || '(vazio)';
        select.appendChild(option);
    });
}

function popularPlanosFinanceiros() {
    const planos = TransacoesApp.state.filtrosDisponiveis?.entidades?.plano_financeiro;
    
    if (!planos) {
        console.warn('Planos financeiros não encontrados');
        return;
    }
    
    // Popular select de planos específicos (todos os níveis)
    const selectPlano = document.getElementById('filtro-plano-especifico');
    if (selectPlano) {
        selectPlano.innerHTML = '<option value="">Todos os planos</option>';
        
        // Adicionar planos por nível
        if (planos.por_nivel) {
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
        empresa_id: '',         // Todas as empresas
        centro_custo_id: '',    // Todos os centros
        fornecedor_id: '',      // Todos os fornecedores
        plano_id: '',          // Todos os planos
        data_inicio: '',       // Data livre
        data_fim: ''           // Data livre
    };
    
    // Configurar estado de paginação
    TransacoesApp.state.page = 1;
    TransacoesApp.state.per_page = 50;
    TransacoesApp.state.view = 'table';
    
    // Aplicar ao DOM na inicialização
    setTimeout(() => aplicarFiltrosAoDOM(), 100);
    
    console.log('✅ Filtros padrão configurados');
}

// ==========================================
// EVENT LISTENERS DOS FILTROS
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
            
            // Reset página e recarregar dados
            TransacoesApp.state.page = 1;
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
        TransacoesApp.state.page = 1; // Reset página
        carregarDados();
    };
    
    // Limpar filtros
    window.limparFiltros = function() {
        console.log('🧹 Limpando todos os filtros...');
        
        // Configurar filtros padrão
        configurarFiltrosPadrao();
        aplicarFiltrosAoDOM();
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
            
            // Re-renderizar dados na nova view se não for table (TableComponent cuida automaticamente)
            if (novaView !== 'table') {
                renderizarTransacoes();
            }
        });
    });
    
    // Mudança de ordenação
    const ordenacaoSelect = document.getElementById('ordenacao');
    if (ordenacaoSelect) {
        ordenacaoSelect.addEventListener('change', function() {
            const [campo, direcao] = this.value.split(':');
            TransacoesApp.state.sortBy = campo;
            TransacoesApp.state.sortDirection = direcao;
            TransacoesApp.state.page = 1; // Reset página
            carregarDados();
        });
    }
    
    // Mudança de per_page
    const perPageSelect = document.getElementById('per-page');
    if (perPageSelect) {
        perPageSelect.addEventListener('change', function() {
            TransacoesApp.state.per_page = parseInt(this.value);
            TransacoesApp.state.page = 1; // Reset para primeira página
            carregarDados();
        });
    }
    
    console.log('✅ Event listeners configurados');
}

function coletarFiltrosAvancados() {
    // Esta função será implementada quando os filtros avançados estiverem prontos
    console.log('📋 Coletando filtros avançados...');
    
    // Por enquanto, apenas aplicar os filtros básicos
    aplicarFiltrosAoDOM();
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
    
    // Aplicar datas personalizadas aos inputs específicos
    const dataInicioInput = document.getElementById('filtro-rapido-data-inicio');
    const dataFimInput = document.getElementById('filtro-rapido-data-fim');
    
    if (dataInicioInput) dataInicioInput.value = filtros.data_inicio || '';
    if (dataFimInput) dataFimInput.value = filtros.data_fim || '';
    
    // Aplicar configurações de view
    const perPageSelect = document.getElementById('per-page');
    if (perPageSelect) perPageSelect.value = TransacoesApp.state.per_page;
    
    const ordenacaoSelect = document.getElementById('ordenacao');
    if (ordenacaoSelect) {
        const sortValue = `${TransacoesApp.state.sortBy}:${TransacoesApp.state.sortDirection}`;
        ordenacaoSelect.value = sortValue;
    }
}

// Filtros de data rápidos
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
    
    // Reset página e recarregar dados
    TransacoesApp.state.page = 1;
    carregarDados();
    
    console.log('✅ Filtros de data aplicados:', { 
        dataInicio, 
        dataFim, 
        periodo: TransacoesApp.state.filtros.periodo 
    });
};

// ==========================================
// CONFIGURAÇÃO DO TABLE COMPONENT
// ==========================================

function initializeTableComponent() {
    // Configuração das colunas na ordem solicitada
    const tableConfig = {
        id: 'transacoes_table',
        columns: [
            {
                id: 'fornecedor',
                label: 'Fornecedor',
                sortable: true,
                formatter: function(value, row) {
                    const nome = row.fornecedor_nome || 'N/A';
                    const tipo = row.fornecedor_tipo || '';
                    return `
                        <div class="fornecedor-info">
                            <strong title="${nome}">${truncateText(nome, 30)}</strong>
                            ${tipo ? `<br><small class="text-muted">${tipo}</small>` : ''}
                        </div>
                    `;
                }
            },
            {
                id: 'plano_financeiro',
                label: 'Plano Financeiro',
                sortable: true,
                formatter: function(value, row) {
                    const codigo = row.plano_codigo || '';
                    const nome = row.plano_nome || 'N/A';
                    const nivel = row.plano_nivel || '';
                    const displayText = codigo && nome ? `${codigo} - ${nome}` : nome;
                    return `
                        <div class="plano-info">
                            <span title="${displayText}">${truncateText(displayText, 35)}</span>
                            ${nivel ? `<br><small class="text-muted">Nível ${nivel}</small>` : ''}
                        </div>
                    `;
                }
            },
            {
                id: 'centro_custo',
                label: 'Centro de Custo',
                sortable: true,
                formatter: function(value, row) {
                    const nome = row.centro_custo_nome || 'N/A';
                    const tipologia = row.centro_custo_tipologia || '';
                    return `
                        <div class="centro-info">
                            <span title="${nome}">${truncateText(nome, 25)}</span>
                            ${tipologia ? `<br><small class="text-muted">${tipologia}</small>` : ''}
                        </div>
                    `;
                }
            },
            {
                id: 'valor',
                label: 'Valor',
                sortable: true,
                formatter: 'currency',
                className: 'text-right',
                sorter: (a, b) => (a || 0) - (b || 0)
            },
            {
                id: 'tipo',
                label: 'Tipo',
                sortable: true,
                formatter: function(value, row) {
                    const tipo = row.tipo || '';
                    const badgeClass = tipo.toLowerCase() === 'entrada' ? 'badge-success' : 'badge-danger';
                    const icon = tipo.toLowerCase() === 'entrada' ? 'fa-arrow-up' : 'fa-arrow-down';
                    return `<span class="badge ${badgeClass}"><i class="fas ${icon}"></i> ${tipo}</span>`;
                }
            },
            {
                id: 'status_pagamento',
                label: 'Status Pagamento',
                sortable: true,
                formatter: function(value, row) {
                    const status = row.status_pagamento || '';
                    const statusClass = getStatusClass(status);
                    return `<span class="status-badge ${statusClass}">${status}</span>`;
                }
            },
            {
                id: 'actions',
                label: 'Ações',
                formatter: 'actions',
                className: 'text-center',
                actions: [
                    {
                        icon: 'fas fa-edit',
                        title: 'Editar',
                        handler: 'editarTransacao',
                        class: 'btn-edit'
                    },
                    {
                        icon: 'fas fa-check-circle',
                        title: 'Realizar Baixa',
                        handler: 'realizarBaixa',
                        class: 'btn-baixa',
                        condition: function(row) {
                            return row.status_pagamento === 'A Realizar';
                        }
                    },
                    {
                        icon: 'fas fa-trash',
                        title: 'Excluir',
                        handler: 'excluirTransacao',
                        class: 'btn-delete'
                    }
                ],
                width: '100px'
            },
            // Colunas adicionais (ocultas por padrão)
            {
                id: 'titulo',
                label: 'Título',
                sortable: true,
                defaultVisible: false,
                formatter: function(value, row) {
                    const titulo = row.titulo || '';
                    const parcela = row.parcela_total > 1 ? 
                        ` <small>(${row.parcela_atual}/${row.parcela_total})</small>` : '';
                    return `<strong>${escapeHtml(titulo)}</strong>${parcela}`;
                }
            },
            {
                id: 'data_vencimento',
                label: 'Vencimento',
                sortable: true,
                formatter: 'date',
                defaultVisible: false
            },
            {
                id: 'data_lancamento',
                label: 'Lançamento',
                sortable: true,
                formatter: 'date',
                defaultVisible: false
            },
            {
                id: 'empresa',
                label: 'Empresa',
                sortable: true,
                defaultVisible: false,
                formatter: function(value, row) {
                    return row.empresa_nome || 'N/A';
                }
            },
            {
                id: 'observacoes',
                label: 'Observações',
                defaultVisible: false,
                formatter: 'truncate',
                maxLength: 50
            }
        ],
        options: {
            selectable: true,
            multiSelect: true,
            sortable: true,
            responsive: true,
            persistState: true,
            emptyMessage: 'Nenhuma transação encontrada',
            loadingMessage: 'Carregando transações...'
        },
        callbacks: {
            onSort: handleTableSort,
            onSelect: handleTableSelect,
            onAction: handleTableAction,
            onColumnToggle: handleColumnToggle,
            onRefresh: carregarDados,
            onSearch: handleTableSearch
        },
        columnProfiles: {
            'compact': ['fornecedor', 'valor', 'tipo', 'status_pagamento', 'actions'],
            'financial': ['fornecedor', 'plano_financeiro', 'centro_custo', 'valor', 'tipo', 'actions'],
            'complete': ['fornecedor', 'plano_financeiro', 'centro_custo', 'valor', 'tipo', 'status_pagamento', 'actions'],
            'mobile': ['fornecedor', 'valor', 'actions']
        }
    };
    
    // Criar instância do TableComponent
    TransacoesApp.tableComponent = new TableComponent('view-table', tableConfig);
    
    // Adicionar ações em lote customizadas
    addBulkActions();
}

// ==========================================
// CALLBACKS DO TABLE COMPONENT
// ==========================================

function handleTableSort(column, direction) {
    TransacoesApp.state.sortBy = column;
    TransacoesApp.state.sortDirection = direction;
    carregarDados();
}

function handleTableSelect(selectedIds) {
    console.log('Selecionados:', selectedIds);
    // Atualizar ações em lote se necessário
}

function handleTableAction(action, selectedData) {
    console.log('Ação:', action, 'Dados:', selectedData);
    
    switch(action) {
        case 'bulk-delete':
            if (confirm(`Confirma a exclusão de ${selectedData.length} transações?`)) {
                excluirMultiplasTransacoes(selectedData.map(t => t.id));
            }
            break;
        case 'bulk-export':
            exportarTransacoes(selectedData);
            break;
    }
}

function handleColumnToggle(visibleColumns) {
    console.log('Colunas visíveis:', visibleColumns);
}

function handleTableSearch(query) {
    console.log('🔍 Busca na tabela:', query);
    
    // Adicionar o filtro de busca ao estado
    TransacoesApp.state.filtros.busca = query;
    
    // Reset para primeira página ao buscar
    TransacoesApp.state.page = 1;
    
    // Recarregar dados com filtro de busca
    carregarDados();
}

// ==========================================
// AÇÕES EM LOTE
// ==========================================

function addBulkActions() {
    const bulkContainer = document.querySelector('.bulk-action-buttons');
    if (!bulkContainer) return;
    
    bulkContainer.innerHTML = `
        <button class="btn btn-sm btn-danger" data-action="bulk-delete">
            <i class="fas fa-trash"></i> Excluir
        </button>
        <button class="btn btn-sm btn-primary" data-action="bulk-export">
            <i class="fas fa-download"></i> Exportar
        </button>
    `;
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
        console.log('🔍 FILTRO DE BUSCA:', payload.filtros.busca || '(vazio)');
        
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
        console.log(`📊 Total de registros: ${dados.total} | Registros na página: ${dados.transacoes.length}`);
        
        // Atualizar estado
        TransacoesApp.state.transacoes = dados.transacoes;
        TransacoesApp.state.kpis = dados.kpis; // KPIs dos filtros aplicados
        TransacoesApp.state.total = dados.total;
        TransacoesApp.cache.ultimaConsulta = new Date();
        
        // Atualizar TableComponent
        if (TransacoesApp.tableComponent) {
            // Sincronizar estado de ordenação ANTES de setar os dados
            TransacoesApp.tableComponent.state.sortColumn = TransacoesApp.state.sortBy;
            TransacoesApp.tableComponent.state.sortDirection = TransacoesApp.state.sortDirection;
            
            // Agora setar os dados - isso vai re-renderizar com os ícones corretos
            TransacoesApp.tableComponent.setData(TransacoesApp.state.transacoes);
        }
        
        // Atualizar interface
        atualizarKPIs();
        atualizarStatusInfo();
        atualizarPaginacao();
        
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
// FUNÇÕES AUXILIARES
// ==========================================

function getStatusClass(status) {
    const statusMap = {
        'realizado': 'status-realizado',
        'previsao': 'status-previsao',
        'atrasado': 'status-atrasado',
        'cancelado': 'status-cancelado'
    };
    
    return statusMap[status.toLowerCase()] || 'status-default';
}

function truncateText(text, maxLength) {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ==========================================
// IMPORTAR FUNÇÕES EXISTENTES
// ==========================================

// Aqui você deve copiar as seguintes funções do transacoes.js original:
// - carregarFiltrosDisponiveis()
// - configurarFiltrosPadrao()
// - setupEventListeners()
// - setupFornecedorSearch()
// - initializeMultiselects()
// - atualizarKPIs()
// - atualizarStatusInfo()
// - atualizarPaginacao()
// - showLoading()
// - showError()
// - Todas as funções de filtros
// - Todas as funções de fornecedor search
// - Todas as funções auxiliares necessárias

// ==========================================
// FUNÇÕES DE FILTROS (MIGRADAS DO ORIGINAL)
// ==========================================

function popularFiltrosNoDOM() {
    const filtros = TransacoesApp.state.filtrosDisponiveis;
    
    // Verificar se filtros foram carregados
    if (!filtros || !filtros.entidades) {
        console.warn('⚠️ Filtros não carregados ainda');
        return;
    }
    
    // Empresas
    if (filtros.entidades.empresas) {
        popularSelect('filtro-empresa', filtros.entidades.empresas);
    }
    
    // Centros de Custo
    if (filtros.entidades.centros_custo && filtros.entidades.centros_custo.por_tipologia) {
        popularSelect('filtro-centro-tipologia', filtros.entidades.centros_custo.por_tipologia);
        // Centro-nome será carregado dinamicamente via filtrarCentrosPorTipologia
        filtrarCentrosPorTipologia(''); // Carregar todos inicialmente
    }
    
    // Fornecedores - Apenas tipos (busca é personalizada)
    if (filtros.entidades.fornecedores && filtros.entidades.fornecedores.por_tipo) {
        popularSelect('filtro-fornecedor-tipo', filtros.entidades.fornecedores.por_tipo);
    }
    
    // Planos Financeiros
    if (filtros.entidades.plano_financeiro) {
        popularPlanosFinanceiros();
    }
    
    // Filtros avançados
    if (filtros.avancados) {
        popularSelect('filtro-faixa-valor', filtros.avancados.faixas_valor || []);
        popularSelect('filtro-origem', filtros.avancados.origem || []);
    }
    
    console.log('✅ Filtros populados no DOM');
}

function popularSelect(selectId, opcoes) {
    const select = document.getElementById(selectId);
    if (!select) return;
    
    select.innerHTML = '<option value="">Carregando...</option>';
    
    if (!opcoes || opcoes.length === 0) return;
    
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
    
    if (!planos || !planos.por_nivel) {
        console.warn('⚠️ Planos financeiros não carregados');
        return;
    }
    
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

function filtrarCentrosPorTipologia(tipologia) {
    const centros = TransacoesApp.state.filtrosDisponiveis.entidades?.centros_custo;
    
    if (!centros) {
        console.warn('⚠️ Centros de custo não carregados');
        return;
    }
    
    let opcoes = [];
    if (tipologia === '') {
        // Mostrar todos
        opcoes = centros.todos || [];
    } else {
        opcoes = centros.por_tipologia.find(t => t.value === tipologia)?.centros || [];
    }
    
    // Popular multiselect de centros se existir
    if (TransacoesApp.multiselects.centros) {
        TransacoesApp.multiselects.centros.setData(opcoes);
    }
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
    
    // Aplicar datas personalizadas aos inputs específicos
    const dataInicioInput = document.getElementById('filtro-rapido-data-inicio');
    const dataFimInput = document.getElementById('filtro-rapido-data-fim');
    
    if (dataInicioInput) dataInicioInput.value = filtros.data_inicio || '';
    if (dataFimInput) dataFimInput.value = filtros.data_fim || '';
    
    // Aplicar configurações de view
    const perPageSelect = document.getElementById('per-page');
    if (perPageSelect) perPageSelect.value = TransacoesApp.state.per_page;
    
    const ordenacaoSelect = document.getElementById('ordenacao');
    if (ordenacaoSelect) {
        const sortValue = `${TransacoesApp.state.sortBy}:${TransacoesApp.state.sortDirection}`;
        ordenacaoSelect.value = sortValue;
    }
}

async function carregarFiltrosDisponiveis() {
    try {
        const response = await fetch('/api/transacoes/filtros', {
            method: 'GET',
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        TransacoesApp.state.filtrosDisponiveis = data;
        
        // Preencher dropdowns
        popularFiltrosNoDOM();
        
        TransacoesApp.cache.filtrosCarregados = true;
        console.log('✅ Filtros carregados:', data);
        
    } catch (error) {
        console.error('❌ Erro ao carregar filtros:', error);
        throw error;
    }
}

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
        origem: '',            // Todas as origens
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
            
            // Reset página
            TransacoesApp.state.page = 1;
            
            // Recarregar dados
            carregarDados();
        });
    });
    
    // Paginação
    const perPageSelect = document.getElementById('per-page');
    if (perPageSelect) {
        perPageSelect.addEventListener('change', function() {
            TransacoesApp.state.per_page = parseInt(this.value);
            TransacoesApp.state.page = 1;
            carregarDados();
        });
    }
    
    // Ordenação
    const ordenacaoSelect = document.getElementById('ordenacao');
    if (ordenacaoSelect) {
        ordenacaoSelect.addEventListener('change', function() {
            const [campo, direcao] = this.value.split(':');
            TransacoesApp.state.sortBy = campo;
            TransacoesApp.state.sortDirection = direcao;
            carregarDados();
        });
    }
    
    // View toggle (cards, timeline)
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.addEventListener('click', function() {
            const view = this.dataset.view;
            
            // Update UI
            document.querySelectorAll('.tab-button').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            document.querySelectorAll('.view-container').forEach(v => v.style.display = 'none');
            
            const viewContainer = document.getElementById(`view-${view}`);
            if (viewContainer) {
                viewContainer.style.display = 'block';
            }
            
            TransacoesApp.state.view = view;
            
            // Re-render if needed
            if (view !== 'table') {
                renderizarView(view);
            }
        });
    });
    
    // Filtros de data rápidos
    setupFiltrosDataRapidos();
}

function setupFiltrosDataRapidos() {
    // Aplicar filtros de data quando mudarem
    window.aplicarFiltroData = function() {
        console.log('📅 Aplicando filtros de data personalizados...');
        
        const dataInicio = document.getElementById('filtro-rapido-data-inicio').value;
        const dataFim = document.getElementById('filtro-rapido-data-fim').value;
        
        // Atualizar estado dos filtros
        TransacoesApp.state.filtros.data_inicio = dataInicio;
        TransacoesApp.state.filtros.data_fim = dataFim;
        
        // Se datas foram preenchidas, CANCELAR período predefinido
        if (dataInicio || dataFim) {
            TransacoesApp.state.filtros.periodo = '';
            
            // Remover active de todos os botões de período
            document.querySelectorAll('[data-filtro="periodo"]').forEach(btn => {
                btn.classList.remove('active');
            });
            
            // Ativar "Todos" como padrão visual
            const btnTodos = document.querySelector('[data-filtro="periodo"][data-valor="todos"]');
            if (btnTodos) {
                btnTodos.classList.add('active');
            }
            
            console.log('✅ Período cancelado para datas personalizadas');
        }
        
        // Reset página
        TransacoesApp.state.page = 1;
        
        // Recarregar dados
        carregarDados();
    };
}

function atualizarKPIs() {
    const kpis = TransacoesApp.state.kpis;
    
    // Atualizar valores dos filtros aplicados
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
    
    console.log('✅ KPIs atualizados:', kpis);
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

function calcularKPIsLocal(transacoes) {
    let total_receitas = 0;
    let total_despesas = 0;
    let count_receitas = 0;
    let count_despesas = 0;
    
    transacoes.forEach(transacao => {
        const valor = parseFloat(transacao.valor) || 0;
        
        if (transacao.tipo === 'Entrada') {
            total_receitas += valor;
            count_receitas++;
        } else if (transacao.tipo === 'Saída') {
            total_despesas += valor;
            count_despesas++;
        }
    });
    
    const saldo = total_receitas - total_despesas;
    const total_transacoes = transacoes.length;
    
    return {
        total_receitas,
        total_despesas,
        saldo,
        count_receitas,
        count_despesas,
        total_transacoes
    };
}

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
        console.warn('Erro ao formatar data:', dateString);
        return dateString;
    }
}

function escapeHtml(text) {
    if (!text) return '';
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

// ==========================================
// AÇÕES DE TRANSAÇÃO
// ==========================================

function atualizarStatusInfo() {
    const state = TransacoesApp.state;
    
    const inicio = (state.page - 1) * state.per_page + 1;
    const fim = Math.min(state.page * state.per_page, state.total);
    const totalPages = Math.ceil(state.total / state.per_page);
    
    const showingEl = document.getElementById('results-showing');
    const totalEl = document.getElementById('results-total');
    const pageEl = document.getElementById('results-page');
    const pagesEl = document.getElementById('results-pages');
    
    if (showingEl) showingEl.textContent = `${inicio}-${fim}`;
    if (totalEl) totalEl.textContent = state.total.toLocaleString();
    if (pageEl) pageEl.textContent = state.page;
    if (pagesEl) pagesEl.textContent = totalPages;
    
    // Mostrar/esconder elementos
    const loadingStatus = document.getElementById('loading-status');
    const resultsInfo = document.getElementById('results-info');
    
    if (loadingStatus) loadingStatus.style.display = 'none';
    if (resultsInfo) resultsInfo.style.display = 'block';
}

function atualizarPaginacao() {
    // Implementar paginação se necessário
    // Por enquanto, o TableComponent não tem paginação própria
    // A paginação fica no backend
}

function setupFornecedorSearch() {
    const searchInput = document.getElementById('filtro-fornecedor-busca');
    const resultsContainer = document.getElementById('fornecedor-search-results');
    
    if (!searchInput) {
        console.warn('❌ Input de busca de fornecedores não encontrado');
        return;
    }
    
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
    
    console.log('✅ Busca de fornecedores configurada');
}

async function buscarFornecedores(termo) {
    const resultsContainer = document.getElementById('fornecedor-search-results');
    const tipoFiltro = document.getElementById('filtro-fornecedor-tipo')?.value || '';
    
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
        console.error('❌ Erro na busca de fornecedores:', error);
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
                ${fornecedor.tipo_fornecedor ? `<span class="tipo">${fornecedor.tipo_fornecedor}</span>` : ''}
                ${fornecedor.cpf_cnpj ? `<span class="doc">${fornecedor.cpf_cnpj}</span>` : ''}
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
    // Atualizar estado
    TransacoesApp.state.filtros.fornecedor_id = id;
    
    // Atualizar UI
    document.getElementById('filtro-fornecedor-selected-id').value = id;
    document.getElementById('filtro-fornecedor-busca').value = nome;
    
    // Mostrar seleção
    const selectedDiv = document.getElementById('fornecedor-selected');
    if (selectedDiv) {
        selectedDiv.querySelector('.fornecedor-selected-name').textContent = nome;
        selectedDiv.style.display = 'block';
    }
    
    // Esconder resultados
    document.getElementById('fornecedor-search-results').style.display = 'none';
    
    // Recarregar dados
    TransacoesApp.state.page = 1;
    carregarDados();
}

window.limparFornecedorSelecionado = function() {
    // Limpar estado
    TransacoesApp.state.filtros.fornecedor_id = '';
    
    // Limpar UI
    document.getElementById('filtro-fornecedor-selected-id').value = '';
    document.getElementById('filtro-fornecedor-busca').value = '';
    document.getElementById('fornecedor-selected').style.display = 'none';
    
    // Recarregar dados
    carregarDados();
}

function initializeMultiselects() {
    // Configurar select de empresas
    const empresasDiv = document.getElementById('multiselect-empresas');
    const centrosDiv = document.getElementById('multiselect-centros');
    
    if (empresasDiv) {
        // Converter para select simples com classe correta
        empresasDiv.innerHTML = '<select id="filtro-empresa" class="filtro-select"><option value="">Todas as empresas</option></select>';
        
        // Popular com dados disponíveis
        if (TransacoesApp.state.filtrosDisponiveis?.entidades?.empresas) {
            popularSelect('filtro-empresa', TransacoesApp.state.filtrosDisponiveis.entidades.empresas);
        }
        
        // Adicionar event listener
        const selectEmpresa = document.getElementById('filtro-empresa');
        selectEmpresa.addEventListener('change', function() {
            TransacoesApp.state.filtros.empresa_id = this.value;
            TransacoesApp.state.page = 1; // Reset para primeira página
            carregarDados();
            console.log('🏢 Empresa selecionada:', this.value);
        });
    }
    
    if (centrosDiv) {
        // Converter para select simples com classe correta
        centrosDiv.innerHTML = '<select id="filtro-centro-nome" class="filtro-select"><option value="">Todos os centros</option></select>';
        
        // Carregar centros de custo
        carregarCentrosCusto();
        
        // Adicionar event listener
        const selectCentro = document.getElementById('filtro-centro-nome');
        selectCentro.addEventListener('change', function() {
            // Para centros de custo, usar o nome como filtro (conforme implementação do backend)
            TransacoesApp.state.filtros.centro_custo_id = this.value;
            TransacoesApp.state.page = 1; // Reset para primeira página
            carregarDados();
            console.log('🏢 Centro selecionado:', this.value, this.options[this.selectedIndex].text);
        });
    }
    
    console.log('✅ Multiselects funcionais inicializados');
}

function carregarCentrosCusto() {
    // Usar dados dos filtros já carregados
    const filtros = TransacoesApp.state.filtrosDisponiveis;
    
    if (filtros?.entidades?.centros_custo?.por_mascara) {
        // Usar dados das máscaras de centro de custo
        popularSelect('filtro-centro-nome', filtros.entidades.centros_custo.por_mascara);
        console.log('✅ Centros de custo carregados dos filtros disponíveis');
    } else {
        console.warn('❌ Dados de centros de custo não encontrados nos filtros');
        
        // Fallback básico
        const selectCentro = document.getElementById('filtro-centro-nome');
        if (selectCentro) {
            selectCentro.innerHTML = '<option value="">Todos os centros</option><option value="sem-dados">Dados não disponíveis</option>';
        }
    }
}

function mostrarEstadoVazio() {
    const emptyState = document.getElementById('empty-state');
    const contentArea = document.querySelector('.content-area');
    
    if (emptyState) emptyState.style.display = 'block';
    if (contentArea) contentArea.style.display = 'none';
}

function esconderEstadoVazio() {
    const emptyState = document.getElementById('empty-state');
    const contentArea = document.querySelector('.content-area');
    
    if (emptyState) emptyState.style.display = 'none';
    if (contentArea) contentArea.style.display = 'block';
}

function renderizarTransacoes() {
    // Esta função será chamada apenas para views que não sejam 'table'
    // O TableComponent cuida da renderização da view 'table'
    const view = TransacoesApp.state.view;
    
    if (view === 'cards') {
        console.log('📋 Renderizando cards view (implementar se necessário)');
    } else if (view === 'timeline') {
        console.log('📅 Renderizando timeline view (implementar se necessário)');
    }
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
    
    return 'Todos os períodos';
}

// Função para renderizar views que não são table
function renderizarView(view) {
    if (view === 'cards') {
        renderizarCardsView();
    } else if (view === 'timeline') {
        renderizarTimelineView();
    }
}

function renderizarCardsView() {
    // Implementação básica de cards
    const container = document.getElementById('transacoes-cards');
    if (!container) return;
    
    const transacoes = TransacoesApp.state.transacoes;
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
            </div>
        `;
        
        container.appendChild(card);
    });
}

function renderizarTimelineView() {
    // Implementação básica de timeline
    const container = document.getElementById('transacoes-timeline');
    if (!container) return;
    
    container.innerHTML = '<p>Timeline será implementada</p>';
}

window.editarTransacao = function(id) {
    console.log('Editar transação:', id);
    // Implementar edição
};

window.excluirTransacao = async function(id) {
    if (!confirm('Confirma a exclusão desta transação?')) return;
    
    try {
        const response = await fetch(`/api/transacoes/${id}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error('Erro ao excluir transação');
        }
        
        // Recarregar dados
        await carregarDados();
        
    } catch (error) {
        showError('Erro ao excluir: ' + error.message);
    }
};

// ==========================================
// FUNÇÕES AUXILIARES - STUB FUNCTIONS
// ==========================================

function excluirMultiplasTransacoes(ids) {
    console.log('🗑️ Excluir múltiplas transações:', ids);
    alert('Funcionalidade será implementada');
}

function exportarTransacoes(transacoes) {
    console.log('📤 Exportar transações:', transacoes);
    alert('Funcionalidade será implementada');
}

function atualizarPaginacao() {
    // Implementar se necessário
    console.log('📄 Paginação atualizada');
}

// ==========================================
// EXPOSIÇÃO GLOBAL
// ==========================================

window.TransacoesApp = TransacoesApp;
window.recarregarDados = carregarDados;

console.log('📚 TransacoesApp v3.0 com TableComponent carregado!');