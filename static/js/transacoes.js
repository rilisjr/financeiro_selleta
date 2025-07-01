// ====================================
// Selleta Financeiro - Transações JS
// Híbrido: Cards + Tabela + Timeline + Parcelas
// ====================================

console.log('📄 Carregando transacoes.js v1.9...');

let currentView = 'table';
let currentPage = 1;
let currentFilters = {};
let allTransacoes = [];
let currentViewType = 'previsao'; // Estado do view toggle

$(document).ready(function() {
    initializeTransacoes();
});

function initializeTransacoes() {
    console.log('🚀 Inicializando módulo de transações...');
    
    try {
        // Carregar dados iniciais
        loadInitialData();
        
        // Configurar event listeners
        setupEventListeners();
        
        // Carregar KPIs primeiro
        loadFinancialKPIs();
        
        // Carregar transações
        loadTransacoes();
        
        // Inicializar Smart Financial Header
        initializeSmartFilters();
        
        console.log('✅ Módulo de transações inicializado com sucesso');
    } catch (error) {
        console.error('❌ Erro na inicialização:', error);
    }
}

function loadInitialData() {
    console.log('📦 Carregando dados iniciais...');
    
    // Carregar dropdowns
    loadEmpresas();
    loadCentrosCusto();
    loadPlanosFinanceiros();
    loadFornecedores();
    loadContasBancarias();
    
    // Configurar datas padrão
    const hoje = new Date();
    const primeiroDiaMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    const ultimoDiaMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
    
    $('#dataVencimentoInicio').val(formatDate(primeiroDiaMes));
    $('#dataVencimentoFim').val(formatDate(ultimoDiaMes));
    $('#data_vencimento').val(formatDate(hoje));
    $('#data_pagamento').val(formatDate(hoje));
}

function setupEventListeners() {
    console.log('🔧 Configurando event listeners...');
    
    // View toggle
    $('.tab-button').click(function() {
        switchView($(this).data('view'));
    });
    
    // View Type Toggle (Previsão/Consolidado/Atrasado)
    $('.view-toggle-btn').click(function() {
        const viewType = $(this).data('view');
        switchViewType(viewType);
    });
    
    // Date Slider
    setupDateSlider();
    
    // Filtros
    $('#searchInput').on('input', debounce(applyFilters, 300));
    $('.filter-select').change(applyFilters);
    $('.date-input').change(applyFilters);
    
    // Quick filters
    $('.quick-filter-btn').click(function() {
        const filter = $(this).data('filter');
        applyQuickFilter(filter);
    });
    
    // Parcelamento toggle
    $('#parcelamento_ativo').change(function() {
        toggleParcelamento($(this).is(':checked'));
    });
    
    // Preview parcelas
    $('#parcela_total, #intervalo_dias, #valor, #data_vencimento').change(function() {
        if ($('#parcelamento_ativo').is(':checked')) {
            updatePreviewParcelas();
        }
    });
    
    // Modal events
    setupModalEvents();
    
    // Ordenação
    $('#sortBy').change(function() {
        currentFilters.sort = $(this).val();
        loadTransacoes();
    });
}

function setupModalEvents() {
    // Modal transação
    $('#modal-transacao .modal-close, #btn-cancelar').click(function() {
        closeModal('#modal-transacao');
    });
    
    // Modal baixa
    $('#modal-baixa .modal-close, #btn-cancelar-baixa').click(function() {
        closeModal('#modal-baixa');
    });
    
    // Submit forms
    $('#form-transacao').submit(function(e) {
        e.preventDefault();
        saveTransacao();
    });
    
    $('#form-baixa').submit(function(e) {
        e.preventDefault();
        efetuarBaixa();
    });
    
    // Preview button
    $('#btn-preview').click(function() {
        showPreviewParcelas();
    });
}

function switchView(view) {
    console.log(`🔄 Mudando para view: ${view}`);
    
    currentView = view;
    
    // Update buttons
    $('.tab-button').removeClass('active');
    $(`[data-view="${view}"]`).addClass('active');
    
    // Hide all views
    $('.view-content').removeClass('active').hide();
    
    // Show selected view
    $(`#view-${view}`).addClass('active').show();
    
    // Render content based on view
    renderCurrentView();
}

function renderCurrentView() {
    switch(currentView) {
        case 'table':
            renderTableView();
            break;
        case 'cards':
            renderCardsView();
            break;
        case 'timeline':
            renderTimelineView();
            break;
        case 'parcelas':
            renderParcelasView();
            break;
    }
}

// ==================================
// CARREGAR DADOS
// ==================================

function loadFinancialKPIs() {
    console.log('📊 Carregando KPIs financeiros...');
    
    $.ajax({
        url: '/api/dashboard/kpis',
        method: 'GET',
        success: function(data) {
            console.log('✅ KPIs carregados:', data);
            updateFinancialHeader(data);
        },
        error: function(xhr, status, error) {
            console.error('❌ Erro ao carregar KPIs:', error);
            console.log('⚠️ Usando dados de fallback...');
            
            // Dados de fallback baseados nos valores reais da API
            const fallbackData = {
                receitas_mes: 161720.08,
                despesas_mes: 1072697.25,
                total_transacoes: 27353,
                contas_vencer: 19,
                saldo_total: -910977.17
            };
            
            updateFinancialHeader(fallbackData);
            showNotification('Dados carregados em modo offline', 'warning');
        }
    });
}

function updateFinancialHeader(data) {
    console.log('🔄 Atualizando Smart Financial Header com dados:', data);
    
    // Atualizar Smart Financial Header KPIs
    const entradas = data.receitas_mes || 0;
    const saidas = data.despesas_mes || 0;
    const totalTransacoes = data.total_transacoes || 0;
    
    $('#filteredEntradas').text(formatCurrency(entradas));
    $('#filteredSaidas').text(formatCurrency(saidas));
    
    // Calcular proporção aproximada (sem dados específicos, usar estimativa)
    const estimatedReceitas = Math.round(totalTransacoes * 0.3); // 30% receitas
    const estimatedDespesas = Math.round(totalTransacoes * 0.7); // 70% despesas
    
    $('#countEntradas').text(`${estimatedReceitas} receitas`);
    $('#countSaidas').text(`${estimatedDespesas} despesas`);
    
    const saldo = entradas - saidas;
    $('#filteredSaldo').text(formatCurrency(saldo));
    
    // Calcular valor médio simples
    const valorMedio = totalTransacoes > 0 ? (entradas + saidas) / totalTransacoes : 0;
    $('#filteredMedia').text(formatCurrency(valorMedio));
    $('#totalFiltered').text(`${totalTransacoes} transações`);
    
    // Atualizar período
    $('#filteredPeriod').text('Período: Todos os dados');
    
    // Aplicar cores dinâmicas
    const saldoElement = $('#filteredSaldo');
    saldoElement.removeClass('text-success text-danger text-warning')
        .addClass(saldo > 0 ? 'text-success' : saldo < 0 ? 'text-danger' : 'text-warning');
        
    console.log('✅ Smart Financial Header atualizado');
}


function loadTransacoes() {
    console.log('📋 Carregando transações...');
    
    showLoading();
    
    const params = new URLSearchParams({
        page: currentPage,
        per_page: 20,
        view_type: currentViewType,
        ...currentFilters
    });
    
    $.ajax({
        url: `/api/transacoes?${params}`,
        method: 'GET',
        success: function(response) {
            console.log('✅ Transações carregadas:', response);
            allTransacoes = response.transacoes || [];
            updateResultInfo(response);
            renderCurrentView();
            updatePagination(response);
            hideLoading();
        },
        error: function(xhr, status, error) {
            console.error('❌ Erro ao carregar transações:', error);
            showNotification('Erro ao carregar transações', 'error');
            hideLoading();
        }
    });
}

function loadEmpresas() {
    $.get('/api/empresas', function(data) {
        const select = $('#empresaFilter, #empresa_id');
        select.find('option:not(:first)').remove();
        
        data.forEach(empresa => {
            select.append(`<option value="${empresa.id}">${empresa.nome}</option>`);
        });
    });
}

function loadCentrosCusto() {
    $.get('/api/centros_custo', function(data) {
        const select = $('#centroCustoFilter, #centro_custo_id');
        select.find('option:not(:first)').remove();
        
        data.forEach(centro => {
            select.append(`<option value="${centro.id}">${centro.mascara_cc}</option>`);
        });
    });
}

function loadPlanosFinanceiros() {
    $.get('/api/planos_financeiros', function(data) {
        const select = $('#planoFinanceiroFilter, #plano_financeiro_id');
        select.find('option:not(:first)').remove();
        
        data.forEach(plano => {
            const nivel = '&nbsp;'.repeat((plano.grau - 1) * 4);
            select.append(`<option value="${plano.id}">${nivel}${plano.codigo} - ${plano.nome}</option>`);
        });
    });
}

function loadFornecedores() {
    $.get('/api/fornecedores?per_page=1000', function(response) {
        const select = $('#cliente_fornecedor_id');
        select.find('option:not(:first)').remove();
        
        response.fornecedores.forEach(fornecedor => {
            select.append(`<option value="${fornecedor.id}">${fornecedor.nome}</option>`);
        });
    });
}

function loadContasBancarias() {
    $.get('/api/contas_bancarias', function(response) {
        const select = $('#conta_bancaria_id');
        select.find('option:not(:first)').remove();
        
        response.contas.forEach(conta => {
            const label = `${conta.banco} - Ag: ${conta.agencia} - Conta: ${conta.conta}`;
            select.append(`<option value="${conta.id}">${label}</option>`);
        });
    });
}

// ==================================
// RENDERIZAÇÃO DE VIEWS
// ==================================

function renderTableView() {
    console.log('🗂️ Renderizando view tabela...');
    
    const tbody = $('#transacoesTableBody');
    tbody.empty();
    
    if (allTransacoes.length === 0) {
        showEmptyState();
        return;
    }
    
    allTransacoes.forEach(transacao => {
        const row = createTableRow(transacao);
        tbody.append(row);
    });
    
    hideEmptyState();
}

function createTableRow(transacao) {
    const statusClass = getStatusClass(transacao);
    const tipoClass = transacao.tipo.toLowerCase();
    const valorClass = transacao.tipo === 'Receita' ? 'receita' : 'despesa';
    
    return $(`
        <tr data-id="${transacao.id}">
            <td>
                <div class="status-badges">
                    <span class="status-badge ${statusClass}">${transacao.status_dinamico}</span>
                    <span class="status-badge ${transacao.status_negociacao.toLowerCase().replace(/[^a-z]/g, '-').replace(/--+/g, '-')}">${transacao.status_negociacao}</span>
                </div>
            </td>
            <td>
                <div class="titulo-info">
                    <strong>${transacao.titulo}</strong>
                    ${transacao.numero_documento ? `<br><small>Doc: ${transacao.numero_documento}</small>` : ''}
                </div>
            </td>
            <td>
                <span class="tipo-badge ${tipoClass}">${transacao.tipo}</span>
            </td>
            <td class="valor-cell ${valorClass}">
                ${formatCurrency(transacao.valor)}
            </td>
            <td class="text-center">
                ${transacao.parcela}/${transacao.parcela_total}
            </td>
            <td>
                ${formatDate(transacao.data_vencimento, true)}
                ${isVencida(transacao.data_vencimento) ? '<br><small class="text-danger">Vencida</small>' : ''}
            </td>
            <td>
                <small>${transacao.fornecedor_nome || 'N/A'}</small>
            </td>
            <td>
                <small>${transacao.centro_custo_nome || 'N/A'}</small>
            </td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-sm btn-primary" onclick="editTransacao(${transacao.id})" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    ${transacao.status_pagamento === 'Á realizar' ? 
                        `<button class="btn btn-sm btn-success" onclick="showBaixaModal(${transacao.id})" title="Efetuar Baixa">
                            <i class="fas fa-check"></i>
                        </button>` : ''
                    }
                    <button class="btn btn-sm btn-danger" onclick="deleteTransacao(${transacao.id})" title="Excluir">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `);
}

function renderCardsView() {
    console.log('🃏 Renderizando view cards...');
    
    const container = $('#transacoesCards');
    container.empty();
    
    if (allTransacoes.length === 0) {
        showEmptyState();
        return;
    }
    
    allTransacoes.forEach(transacao => {
        const card = createTransacaoCard(transacao);
        container.append(card);
    });
    
    hideEmptyState();
}

function createTransacaoCard(transacao) {
    const statusClass = getStatusClass(transacao);
    const tipoClass = transacao.tipo.toLowerCase();
    const isVencidaFlag = isVencida(transacao.data_vencimento);
    
    return $(`
        <div class="transacao-card ${tipoClass} ${isVencidaFlag ? 'vencida' : ''}" data-id="${transacao.id}">
            <div class="card-header">
                <h3 class="card-title">${transacao.titulo}</h3>
                <div class="card-badges">
                    <span class="status-badge ${statusClass}">${transacao.status_dinamico}</span>
                    <span class="tipo-badge ${tipoClass}">${transacao.tipo}</span>
                </div>
            </div>
            
            <div class="card-content">
                <div class="card-field">
                    <div class="card-field-label">Vencimento</div>
                    <div class="card-field-value">${formatDate(transacao.data_vencimento, true)}</div>
                </div>
                
                <div class="card-field">
                    <div class="card-field-label">Parcela</div>
                    <div class="card-field-value">${transacao.parcela}/${transacao.parcela_total}</div>
                </div>
                
                <div class="card-field">
                    <div class="card-field-label">Fornecedor</div>
                    <div class="card-field-value">${truncateText(transacao.fornecedor_nome || 'N/A', 25)}</div>
                </div>
                
                <div class="card-field">
                    <div class="card-field-label">Centro Custo</div>
                    <div class="card-field-value">${truncateText(transacao.centro_custo_nome || 'N/A', 25)}</div>
                </div>
                
                <div class="card-valor ${tipoClass}">
                    <div class="card-valor-label">Valor</div>
                    <div class="card-valor-value">${formatCurrency(transacao.valor)}</div>
                </div>
            </div>
            
            <div class="card-actions">
                <button class="card-action-btn secondary" onclick="editTransacao(${transacao.id})">
                    <i class="fas fa-edit"></i> Editar
                </button>
                
                ${transacao.status_pagamento === 'Á realizar' ? 
                    `<button class="card-action-btn success" onclick="showBaixaModal(${transacao.id})">
                        <i class="fas fa-check"></i> Baixa
                    </button>` : 
                    `<button class="card-action-btn primary" onclick="viewTransacao(${transacao.id})">
                        <i class="fas fa-eye"></i> Ver
                    </button>`
                }
            </div>
        </div>
    `);
}

function renderTimelineView() {
    console.log('📅 Renderizando view timeline...');
    
    const container = $('#timelineContainer');
    container.empty();
    
    if (allTransacoes.length === 0) {
        showEmptyState();
        return;
    }
    
    // Agrupar por data
    const grouped = groupByDate(allTransacoes);
    
    Object.keys(grouped).sort().forEach(date => {
        const group = createTimelineGroup(date, grouped[date]);
        container.append(group);
    });
    
    hideEmptyState();
}

function createTimelineGroup(date, transacoes) {
    const dateFormatted = formatDate(date, true);
    const totalValue = transacoes.reduce((sum, t) => sum + (t.tipo === 'Receita' ? t.valor : -t.valor), 0);
    
    const items = transacoes.map(transacao => createTimelineItem(transacao)).join('');
    
    return $(`
        <div class="timeline-group">
            <div class="timeline-date">
                ${dateFormatted}
                <span class="timeline-total ${totalValue >= 0 ? 'receita' : 'despesa'}">
                    ${formatCurrency(Math.abs(totalValue))}
                </span>
            </div>
            <div class="timeline-items">
                ${items}
            </div>
        </div>
    `);
}

function createTimelineItem(transacao) {
    const tipoClass = transacao.tipo.toLowerCase();
    
    return `
        <div class="timeline-item ${tipoClass}" data-id="${transacao.id}">
            <div class="timeline-content">
                <div class="timeline-info">
                    <h4>${transacao.titulo}</h4>
                    <p>${transacao.fornecedor_nome || 'N/A'} • Parcela ${transacao.parcela}/${transacao.parcela_total}</p>
                </div>
                <div class="timeline-value ${tipoClass}">
                    ${formatCurrency(transacao.valor)}
                </div>
            </div>
        </div>
    `;
}

function renderParcelasView() {
    console.log('📦 Renderizando view parcelas...');
    
    const container = $('#parcelasContainer');
    container.empty();
    
    if (allTransacoes.length === 0) {
        showEmptyState();
        return;
    }
    
    // Agrupar por número do documento ou título base
    const grouped = groupByDocument(allTransacoes);
    
    Object.keys(grouped).forEach(docKey => {
        const group = createParcelaGroup(docKey, grouped[docKey]);
        container.append(group);
    });
    
    hideEmptyState();
}

function createParcelaGroup(docKey, transacoes) {
    const totalValue = transacoes.reduce((sum, t) => sum + t.valor, 0);
    const pagas = transacoes.filter(t => t.status_pagamento === 'Realizado').length;
    
    const parcelas = transacoes.map(transacao => createParcelaItem(transacao)).join('');
    
    return $(`
        <div class="parcela-group">
            <div class="parcela-group-header" onclick="toggleParcelaGroup(this)">
                <h3 class="parcela-group-title">${docKey}</h3>
                <div class="parcela-group-info">
                    <span>${transacoes.length} parcelas</span>
                    <span>${pagas}/${transacoes.length} pagas</span>
                    <span>${formatCurrency(totalValue)}</span>
                    <i class="fas fa-chevron-down"></i>
                </div>
            </div>
            <div class="parcela-group-content">
                <div class="parcelas-list">
                    ${parcelas}
                </div>
            </div>
        </div>
    `);
}

function createParcelaItem(transacao) {
    const statusClass = getStatusClass(transacao);
    
    return `
        <div class="parcela-item" data-id="${transacao.id}">
            <div class="parcela-header">
                <span class="parcela-numero">${transacao.parcela}/${transacao.parcela_total}</span>
                <span class="parcela-valor">${formatCurrency(transacao.valor)}</span>
            </div>
            <div class="parcela-info">
                <span>${formatDate(transacao.data_vencimento, true)}</span>
                <span class="status-badge ${statusClass}">${transacao.status_dinamico}</span>
            </div>
        </div>
    `;
}

// ==================================
// FILTROS E BUSCA
// ==================================

function applyFilters() {
    console.log('🔍 Aplicando filtros...');
    
    currentFilters = {
        search: $('#searchInput').val(),
        tipo: $('#tipoFilter').val(),
        status_pagamento: $('#statusPagamentoFilter').val(),
        status_negociacao: $('#statusNegociacaoFilter').val(),
        empresa_id: $('#empresaFilter').val(),
        centro_custo_id: $('#centroCustoFilter').val(),
        plano_financeiro_id: $('#planoFinanceiroFilter').val(),
        data_vencimento_inicio: $('#dataVencimentoInicio').val(),
        data_vencimento_fim: $('#dataVencimentoFim').val(),
        sort: $('#sortBy').val()
    };
    
    // Remover valores vazios
    Object.keys(currentFilters).forEach(key => {
        if (!currentFilters[key]) {
            delete currentFilters[key];
        }
    });
    
    currentPage = 1;
    loadTransacoes();
}

function applyQuickFilter(filter) {
    console.log(`⚡ Aplicando filtro rápido: ${filter}`);
    
    // Remove active class from all quick filter buttons
    $('.quick-filter-btn').removeClass('active');
    
    const hoje = new Date();
    let dataInicio, dataFim;
    
    switch(filter) {
        case 'vencidas':
            dataFim = formatDate(hoje);
            $('#statusPagamentoFilter').val('Á realizar');
            break;
            
        case 'vencer-hoje':
            dataInicio = dataFim = formatDate(hoje);
            $('#statusPagamentoFilter').val('Á realizar');
            break;
            
        case 'vencer-semana':
            dataInicio = formatDate(hoje);
            const fimSemana = new Date(hoje);
            fimSemana.setDate(hoje.getDate() + 7);
            dataFim = formatDate(fimSemana);
            $('#statusPagamentoFilter').val('Á realizar');
            break;
            
        case 'mes-atual':
            const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
            const fimMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
            dataInicio = formatDate(inicioMes);
            dataFim = formatDate(fimMes);
            break;
    }
    
    if (dataInicio) $('#dataVencimentoInicio').val(dataInicio);
    if (dataFim) $('#dataVencimentoFim').val(dataFim);
    
    // Mark button as active
    $(`.quick-filter-btn[data-filter="${filter}"]`).addClass('active');
    
    applyFilters();
}

function clearFilters() {
    console.log('🧹 Limpando filtros...');
    
    $('#searchInput').val('');
    $('.filter-select').val('');
    $('.date-input').val('');
    $('.quick-filter-btn').removeClass('active');
    
    const hoje = new Date();
    const primeiroDiaMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    const ultimoDiaMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
    
    $('#dataVencimentoInicio').val(formatDate(primeiroDiaMes));
    $('#dataVencimentoFim').val(formatDate(ultimoDiaMes));
    
    currentFilters = {};
    currentPage = 1;
    loadTransacoes();
}

// ==================================
// CRUD OPERATIONS
// ==================================

function novaTransacao(tipo = null, parcelada = false) {
    console.log(`➕ Nova transação: tipo=${tipo}, parcelada=${parcelada}`);
    
    resetForm('#form-transacao');
    $('#transacao_id').val('');
    $('#modal-title').text('Nova Transação');
    
    if (tipo) {
        $('#tipo').val(tipo);
    }
    
    if (parcelada) {
        $('#parcelamento_ativo').prop('checked', true);
        toggleParcelamento(true);
    }
    
    showModal('#modal-transacao');
}

function editTransacao(id) {
    console.log(`✏️ Editando transação: ${id}`);
    
    const transacao = allTransacoes.find(t => t.id === id);
    if (!transacao) {
        showNotification('Transação não encontrada', 'error');
        return;
    }
    
    // Preencher formulário
    $('#transacao_id').val(transacao.id);
    $('#titulo').val(transacao.titulo);
    $('#tipo').val(transacao.tipo);
    $('#valor').val(transacao.valor);
    $('#data_vencimento').val(transacao.data_vencimento);
    $('#cliente_fornecedor_id').val(transacao.cliente_fornecedor_id);
    $('#empresa_id').val(transacao.empresa_id);
    $('#centro_custo_id').val(transacao.centro_custo_id);
    $('#plano_financeiro_id').val(transacao.plano_financeiro_id);
    $('#status_negociacao').val(transacao.status_negociacao);
    $('#status_pagamento').val(transacao.status_pagamento);
    $('#observacao').val(transacao.observacao);
    
    // Configurar parcelamento se necessário
    if (transacao.parcela_total > 1) {
        $('#parcelamento_ativo').prop('checked', true);
        $('#parcela_total').val(transacao.parcela_total);
        toggleParcelamento(true);
    }
    
    $('#modal-title').text('Editar Transação');
    showModal('#modal-transacao');
}

function saveTransacao() {
    console.log('💾 Salvando transação...');
    
    const formData = getFormData('#form-transacao');
    const isEdit = !!formData.transacao_id;
    
    // Validar dados
    if (!validateTransacaoForm(formData)) {
        return;
    }
    
    const url = isEdit ? `/api/transacoes/${formData.transacao_id}` : '/api/transacoes';
    const method = isEdit ? 'PUT' : 'POST';
    
    $.ajax({
        url: url,
        method: method,
        data: JSON.stringify(formData),
        contentType: 'application/json',
        success: function(response) {
            console.log('✅ Transação salva:', response);
            showNotification(response.message || 'Transação salva com sucesso!', 'success');
            closeModal('#modal-transacao');
            loadTransacoes();
            loadFinancialKPIs();
        },
        error: function(xhr, status, error) {
            console.error('❌ Erro ao salvar transação:', xhr.responseJSON);
            const message = xhr.responseJSON?.error || 'Erro ao salvar transação';
            showNotification(message, 'error');
        }
    });
}

function deleteTransacao(id) {
    if (!confirm('Tem certeza que deseja excluir esta transação?')) {
        return;
    }
    
    console.log(`🗑️ Excluindo transação: ${id}`);
    
    $.ajax({
        url: `/api/transacoes/${id}`,
        method: 'DELETE',
        success: function(response) {
            console.log('✅ Transação excluída:', response);
            showNotification('Transação excluída com sucesso!', 'success');
            loadTransacoes();
            loadFinancialKPIs();
        },
        error: function(xhr, status, error) {
            console.error('❌ Erro ao excluir transação:', error);
            showNotification('Erro ao excluir transação', 'error');
        }
    });
}

// ==================================
// BAIXA/LIQUIDAÇÃO
// ==================================

function showBaixaModal(id) {
    console.log(`💰 Abrindo modal de baixa: ${id}`);
    
    const transacao = allTransacoes.find(t => t.id === id);
    if (!transacao) {
        showNotification('Transação não encontrada', 'error');
        return;
    }
    
    // Preencher informações da transação
    $('#baixa_transacao_id').val(id);
    $('#valor_pago').val(transacao.valor);
    
    const transacaoInfo = `
        <h4>${transacao.titulo}</h4>
        <div class="info-grid">
            <div class="info-item">
                <div class="info-label">Tipo</div>
                <div class="info-value">${transacao.tipo}</div>
            </div>
            <div class="info-item">
                <div class="info-label">Valor Original</div>
                <div class="info-value">${formatCurrency(transacao.valor)}</div>
            </div>
            <div class="info-item">
                <div class="info-label">Vencimento</div>
                <div class="info-value">${formatDate(transacao.data_vencimento, true)}</div>
            </div>
            <div class="info-item">
                <div class="info-label">Fornecedor</div>
                <div class="info-value">${transacao.fornecedor_nome || 'N/A'}</div>
            </div>
        </div>
    `;
    
    $('#transacao-info').html(transacaoInfo);
    showModal('#modal-baixa');
}

function efetuarBaixa() {
    console.log('💳 Efetuando baixa...');
    
    const formData = getFormData('#form-baixa');
    
    // Validar dados
    if (!validateBaixaForm(formData)) {
        return;
    }
    
    $.ajax({
        url: `/api/transacoes/${formData.transacao_id}/baixa`,
        method: 'POST',
        data: JSON.stringify(formData),
        contentType: 'application/json',
        success: function(response) {
            console.log('✅ Baixa efetuada:', response);
            showNotification('Baixa efetuada com sucesso!', 'success');
            closeModal('#modal-baixa');
            loadTransacoes();
            loadFinancialKPIs();
        },
        error: function(xhr, status, error) {
            console.error('❌ Erro ao efetuar baixa:', xhr.responseJSON);
            const message = xhr.responseJSON?.error || 'Erro ao efetuar baixa';
            showNotification(message, 'error');
        }
    });
}

// ==================================
// PARCELAMENTO
// ==================================

function toggleParcelamento(ativo) {
    console.log(`🔄 Toggle parcelamento: ${ativo}`);
    
    if (ativo) {
        $('#parcelas-config').slideDown();
        $('#btn-preview').show();
        updatePreviewParcelas();
    } else {
        $('#parcelas-config').slideUp();
        $('#btn-preview').hide();
        $('#preview-parcelas').empty();
    }
}

function updatePreviewParcelas() {
    const valor = parseFloat($('#valor').val()) || 0;
    const parcelas = parseInt($('#parcela_total').val()) || 1;
    const intervalo = parseInt($('#intervalo_dias').val()) || 30;
    const dataInicial = $('#data_vencimento').val();
    
    if (!valor || !dataInicial) {
        $('#preview-parcelas').empty();
        return;
    }
    
    console.log('🔍 Atualizando preview de parcelas...');
    
    $.ajax({
        url: '/api/transacoes/parcelas/preview',
        method: 'POST',
        data: JSON.stringify({
            valor: valor,
            parcela_total: parcelas,
            data_vencimento: dataInicial,
            intervalo_dias: intervalo
        }),
        contentType: 'application/json',
        success: function(response) {
            renderPreviewParcelas(response);
        },
        error: function(xhr, status, error) {
            console.error('❌ Erro no preview:', error);
        }
    });
}

function renderPreviewParcelas(data) {
    const container = $('#preview-parcelas');
    
    let html = `
        <div class="preview-title">
            Preview: ${data.quantidade} parcelas de ${formatCurrency(data.valor_total / data.quantidade)}
        </div>
        <div class="preview-list">
    `;
    
    data.parcelas.forEach(parcela => {
        html += `
            <div class="preview-item">
                <strong>${parcela.parcela}/${data.quantidade}</strong>
                ${formatCurrency(parcela.valor)}
                <small>${formatDate(parcela.data_vencimento, true)}</small>
            </div>
        `;
    });
    
    html += '</div>';
    container.html(html);
}

function showPreviewParcelas() {
    updatePreviewParcelas();
    // Scroll para o preview
    $('#preview-parcelas')[0].scrollIntoView({ behavior: 'smooth' });
}

// ==================================
// HELPERS E UTILITÁRIOS
// ==================================

function getStatusClass(transacao) {
    if (transacao.status_pagamento === 'Realizado') {
        return 'realizado';
    }
    
    if (isVencida(transacao.data_vencimento)) {
        return 'vencida';
    }
    
    return 'a-realizar';
}

function isVencida(dataVencimento) {
    const hoje = new Date();
    const vencimento = new Date(dataVencimento);
    return vencimento < hoje;
}

function groupByDate(transacoes) {
    const grouped = {};
    
    transacoes.forEach(transacao => {
        const date = transacao.data_vencimento;
        if (!grouped[date]) {
            grouped[date] = [];
        }
        grouped[date].push(transacao);
    });
    
    return grouped;
}

function groupByDocument(transacoes) {
    const grouped = {};
    
    transacoes.forEach(transacao => {
        const key = transacao.numero_documento || transacao.titulo;
        if (!grouped[key]) {
            grouped[key] = [];
        }
        grouped[key].push(transacao);
    });
    
    return grouped;
}

function toggleParcelaGroup(header) {
    const group = $(header).closest('.parcela-group');
    group.toggleClass('open');
    
    const icon = group.find('.fa-chevron-down');
    icon.toggleClass('fa-chevron-up fa-chevron-down');
}

function validateTransacaoForm(data) {
    if (!data.titulo) {
        showNotification('Título é obrigatório', 'error');
        return false;
    }
    
    if (!data.valor || data.valor <= 0) {
        showNotification('Valor deve ser maior que zero', 'error');
        return false;
    }
    
    if (!data.tipo) {
        showNotification('Tipo é obrigatório', 'error');
        return false;
    }
    
    if (!data.data_vencimento) {
        showNotification('Data de vencimento é obrigatória', 'error');
        return false;
    }
    
    return true;
}

function validateBaixaForm(data) {
    if (!data.conta_bancaria_id) {
        showNotification('Conta bancária é obrigatória', 'error');
        return false;
    }
    
    if (!data.data_pagamento) {
        showNotification('Data do pagamento é obrigatória', 'error');
        return false;
    }
    
    if (!data.valor_pago || data.valor_pago <= 0) {
        showNotification('Valor pago deve ser maior que zero', 'error');
        return false;
    }
    
    return true;
}

function updateResultInfo(response) {
    $('#resultCount').text(response.total || 0);
    
    const totalValue = allTransacoes.reduce((sum, t) => {
        return sum + (t.tipo === 'Receita' ? t.valor : -t.valor);
    }, 0);
    
    $('#totalValue').text(formatCurrency(Math.abs(totalValue)));
    $('#totalValue').removeClass('text-success text-danger')
        .addClass(totalValue >= 0 ? 'text-success' : 'text-danger');
}

function updatePagination(response) {
    const container = $('#pagination');
    container.empty();
    
    if (response.total_pages <= 1) return;
    
    const currentPage = response.page;
    const totalPages = response.total_pages;
    
    // Previous button
    if (currentPage > 1) {
        container.append(`<button onclick="changePage(${currentPage - 1})">← Anterior</button>`);
    }
    
    // Page numbers
    for (let i = Math.max(1, currentPage - 2); i <= Math.min(totalPages, currentPage + 2); i++) {
        const active = i === currentPage ? 'active' : '';
        container.append(`<button class="${active}" onclick="changePage(${i})">${i}</button>`);
    }
    
    // Next button
    if (currentPage < totalPages) {
        container.append(`<button onclick="changePage(${currentPage + 1})">Próxima →</button>`);
    }
}

function changePage(page) {
    currentPage = page;
    loadTransacoes();
}

function exportData() {
    console.log('📤 Exportando dados...');
    
    const params = new URLSearchParams(currentFilters);
    window.open(`/api/transacoes/export?${params}`, '_blank');
}

// Utility functions
function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value);
}

function formatDate(dateString, showDayName = false) {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    const options = { 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit' 
    };
    
    if (showDayName) {
        options.weekday = 'short';
    }
    
    return date.toLocaleDateString('pt-BR', options);
}

function truncateText(text, maxLength) {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function getFormData(formSelector) {
    const formData = {};
    $(formSelector).find('input, select, textarea').each(function() {
        const field = $(this);
        const name = field.attr('name');
        const value = field.val();
        
        if (name && value !== '') {
            if (field.attr('type') === 'checkbox') {
                formData[name] = field.is(':checked');
            } else {
                formData[name] = value;
            }
        }
    });
    return formData;
}

function resetForm(formSelector) {
    $(formSelector)[0].reset();
    $(formSelector).find('.is-invalid').removeClass('is-invalid');
    $('#parcelas-config').hide();
    $('#btn-preview').hide();
    $('#preview-parcelas').empty();
}

function showModal(modalSelector) {
    $(modalSelector).fadeIn(300);
}

function closeModal(modalSelector) {
    $(modalSelector).fadeOut(300);
}

function showLoading() {
    $('#loading').show();
    $('.view-content').hide();
}

function hideLoading() {
    $('#loading').hide();
    $('.view-content.active').show();
}

function showEmptyState() {
    $('#empty-state').show();
}

function hideEmptyState() {
    $('#empty-state').hide();
}

function showNotification(message, type = 'info') {
    const notification = $(`
        <div class="notification ${type}">
            <i class="fas fa-${type === 'success' ? 'check' : type === 'error' ? 'exclamation-triangle' : 'info'}-circle"></i>
            <span>${message}</span>
        </div>
    `);
    
    $('body').append(notification);
    
    setTimeout(() => {
        notification.fadeOut(300, () => notification.remove());
    }, 4000);
}
// ====================================
// Smart Financial Header Functions
// ====================================

function initializeSmartFilters() {
    console.log('🎯 Inicializando Smart Financial Header...');
    
    // Configurar datas padrão no Smart Header
    const hoje = new Date();
    $('#smartDataInicio').val('2023-01-01');
    $('#smartDataFim').val('2024-12-31');
    
    // Event listeners para filtros inteligentes
    setupSmartFilterEvents();
    
    // Carregar dados iniciais
    updateSmartSummary();
    
    // Carregar contadores do view toggle
    loadViewCounts();
    
    console.log('✅ Smart Financial Header inicializado');
}

function setupSmartFilterEvents() {
    // Filtros de seleção
    $('#smartTipoFilter, #smartStatusNegociacaoFilter, #smartStatusPagamentoFilter, #smartTipologiaFilter').on('change', function() {
        updateSmartSummary();
    });
    
    // Filtros de data
    $('#smartDataInicio, #smartDataFim').on('change', function() {
        updateSmartSummary();
    });
    
    // Filtros de valor
    $('#smartValorMin, #smartValorMax').on('input', debounce(function() {
        updateSmartSummary();
    }, 500));
    
    // Quick selectors de data
    $('.date-preset-btn').on('click', function() {
        const preset = $(this).data('preset');
        setDatePreset(preset);
        $('.date-preset-btn').removeClass('active');
        $(this).addClass('active');
    });
}

function setDatePeriod(period) {
    const hoje = new Date();
    let inicio, fim;
    
    switch(period) {
        case 'mes-atual':
            inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
            fim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
            break;
        case 'trimestre-atual':
            const quarter = Math.floor(hoje.getMonth() / 3);
            inicio = new Date(hoje.getFullYear(), quarter * 3, 1);
            fim = new Date(hoje.getFullYear(), (quarter + 1) * 3, 0);
            break;
        case 'ano-atual':
            inicio = new Date(hoje.getFullYear(), 0, 1);
            fim = new Date(hoje.getFullYear(), 11, 31);
            break;
        case 'tudo':
        default:
            inicio = new Date('2023-01-01');
            fim = new Date('2030-12-31');
            break;
    }
    
    $('#smartDataInicio').val(formatDate(inicio));
    $('#smartDataFim').val(formatDate(fim));
    updateSmartSummary();
}

function setValueRange(range) {
    let min = '', max = '';
    
    switch(range) {
        case 'pequeno':
            min = '0';
            max = '1000';
            break;
        case 'medio':
            min = '1000';
            max = '10000';
            break;
        case 'grande':
            min = '10000';
            max = '100000';
            break;
        case 'muito-grande':
            min = '100000';
            max = '';
            break;
        default:
            min = '';
            max = '';
            break;
    }
    
    $('#smartValorMin').val(min);
    $('#smartValorMax').val(max);
    updateSmartSummary();
}

function updateSmartSummary() {
    console.log('📊 Atualizando resumo inteligente...');
    
    // Coletar filtros ativos
    const filters = getSmartFilters();
    
    // Fazer chamada para API com filtros
    $.ajax({
        url: '/api/transacoes',
        method: 'GET',
        data: filters,
        success: function(response) {
            displaySmartSummary(response.data || response.transacoes || []);
        },
        error: function(xhr, status, error) {
            console.error('❌ Erro ao carregar resumo:', error);
            displaySmartSummary([]);
        }
    });
}

function getSmartFilters() {
    // Obter status de pagamento selecionados dos botões
    const selectedPaymentStatuses = typeof getSelectedPaymentStatuses === 'function' 
        ? getSelectedPaymentStatuses() 
        : [];
    
    const filters = {
        // Filtros de tipo
        tipo: $('#smartTipoFilter').val(),
        status_negociacao: $('#smartStatusNegociacaoFilter').val(),
        
        // Filtros de data
        data_vencimento_inicio: $('#smartDataInicio').val(),
        data_vencimento_fim: $('#smartDataFim').val(),
        
        // Filtros de valor
        valor_min: $('#smartValorMin').val(),
        valor_max: $('#smartValorMax').val(),
        
        // Filtro de tipologia (via join com centros_custo)
        tipologia: $('#smartTipologiaFilter').val(),
        
        // Filtros de entidades
        empresa_id: $('#smartEmpresaFilter').val(),
        centro_custo_id: $('#smartCentroCustoFilter').val(),
        plano_financeiro_id: $('#smartPlanoFinanceiroFilter').val(),
        
        // Parâmetros para API
        page: 1,
        per_page: 10000 // Pegar todos para o resumo
    };
    
    // Adicionar filtros de status de pagamento
    if (selectedPaymentStatuses.length > 0) {
        // Se apenas um status selecionado, usar view_type correspondente (mais eficiente)
        if (selectedPaymentStatuses.length === 1) {
            const status = selectedPaymentStatuses[0];
            switch(status) {
                case 'realizado':
                    filters.view_type = 'consolidado';
                    break;
                case 'a-realizar':
                    filters.view_type = 'previsao';
                    break;
                case 'atrasado':
                    filters.view_type = 'atrasado';
                    break;
            }
            console.log(`🔍 Filtro único de status aplicado: view_type=${filters.view_type}`);
        } else {
            // Para múltiplos status, NÃO aplicar view_type para pegar todas as transações
            // A filtragem será feita no frontend na função displaySmartSummary
            console.log(`🔍 Múltiplos status selecionados: ${selectedPaymentStatuses.join(', ')} - filtragem no frontend`);
        }
    }
    
    // Remover filtros vazios
    Object.keys(filters).forEach(key => {
        if (filters[key] === '' || filters[key] === null || filters[key] === undefined) {
            delete filters[key];
        }
    });
    
    console.log('📋 Filtros coletados:', filters);
    
    return filters;
}

function displaySmartSummary(transacoes) {
    console.log(`📊 Exibindo resumo de ${transacoes.length} transações`);
    
    // Filtrar no frontend baseado nos status selecionados
    let filteredTransacoes = transacoes;
    const selectedPaymentStatuses = typeof getSelectedPaymentStatuses === 'function' 
        ? getSelectedPaymentStatuses() 
        : [];
    
    // Se status específicos estão selecionados (não "todos"), aplicar filtro
    if (selectedPaymentStatuses.length > 0) {
        const hoje = new Date();
        
        filteredTransacoes = transacoes.filter(t => {
            // Calcular status dinâmico da transação
            let statusCalculado = '';
            
            if (t.status_pagamento === 'Realizado') {
                statusCalculado = 'realizado';
            } else {
                const vencimento = new Date(t.data_vencimento);
                if (vencimento < hoje) {
                    statusCalculado = 'atrasado';
                } else {
                    statusCalculado = 'a-realizar';
                }
            }
            
            // Incluir se o status calculado está na lista selecionada
            const isIncluded = selectedPaymentStatuses.includes(statusCalculado);
            
            // Log apenas alguns exemplos para não poluir o console
            if (isIncluded && Math.random() < 0.05) { // 5% das transações incluídas
                console.log(`✅ Exemplo incluído: ${t.titulo?.substring(0, 30)}... - Status: ${statusCalculado} - Vencimento: ${t.data_vencimento}`);
            }
            
            return isIncluded;
        });
        
        console.log(`🔍 Filtro aplicado no frontend:`);
        console.log(`   Status selecionados: ${selectedPaymentStatuses.join(', ')}`);
        console.log(`   Resultado: ${filteredTransacoes.length} de ${transacoes.length} transações`);
        
        // Breakdown por status
        const breakdown = {};
        selectedPaymentStatuses.forEach(status => {
            breakdown[status] = filteredTransacoes.filter(t => {
                if (t.status_pagamento === 'Realizado') return status === 'realizado';
                const vencimento = new Date(t.data_vencimento);
                const hoje = new Date();
                if (vencimento < hoje) return status === 'atrasado';
                return status === 'a-realizar';
            }).length;
        });
        console.log(`   Breakdown:`, breakdown);
    }
    
    // Calcular métricas
    const metrics = calculateMetrics(filteredTransacoes);
    
    // Atualizar elementos no DOM
    $('#filteredEntradas').text(formatCurrency(metrics.entradas));
    $('#filteredSaidas').text(formatCurrency(metrics.saidas));
    $('#filteredSaldo').text(formatCurrency(metrics.saldo));
    $('#filteredMedia').text(formatCurrency(metrics.media));
    
    // Atualizar contadores
    $('#countEntradas').text(`${metrics.countEntradas} transações`);
    $('#countSaidas').text(`${metrics.countSaidas} transações`);
    $('#totalFiltered').text(`${metrics.total} transações`);
    
    // Atualizar período
    const periodo = getPeriodDisplay();
    $('#filteredPeriod').text(periodo);
    
    // Atualizar cores baseado no saldo
    const saldoElement = $('#filteredSaldo');
    saldoElement.removeClass('text-success text-danger');
    if (metrics.saldo > 0) {
        saldoElement.addClass('text-success');
    } else if (metrics.saldo < 0) {
        saldoElement.addClass('text-danger');
    }
}

function calculateMetrics(transacoes) {
    let entradas = 0, saidas = 0;
    let countEntradas = 0, countSaidas = 0;
    
    transacoes.forEach(transacao => {
        const valor = parseFloat(transacao.valor) || 0;
        
        if (transacao.tipo === 'Receita') {
            entradas += valor;
            countEntradas++;
        } else if (transacao.tipo === 'Despesa') {
            saidas += valor;
            countSaidas++;
        }
    });
    
    const saldo = entradas - saidas;
    const total = transacoes.length;
    const media = total > 0 ? (entradas + saidas) / total : 0;
    
    return {
        entradas,
        saidas,
        saldo,
        media,
        countEntradas,
        countSaidas,
        total
    };
}

function getPeriodDisplay() {
    const inicio = $('#smartDataInicio').val();
    const fim = $('#smartDataFim').val();
    
    if (!inicio && !fim) {
        return 'Período: Todos';
    }
    
    const inicioFormatado = inicio ? formatDateBR(inicio) : 'Início';
    const fimFormatado = fim ? formatDateBR(fim) : 'Fim';
    
    return `${inicioFormatado} a ${fimFormatado}`;
}

function clearSmartFilters() {
    console.log('🧹 Limpando filtros inteligentes...');
    
    // Limpar todos os selects
    $('#smartTipoFilter, #smartStatusNegociacaoFilter, #smartStatusPagamentoFilter, #smartTipologiaFilter').val('');
    
    // Resetar datas para padrão
    $('#smartDataInicio').val('2023-01-01');
    $('#smartDataFim').val('2024-12-31');
    
    // Limpar valores
    $('#smartValorMin, #smartValorMax').val('');
    
    // Remover estados ativos
    $('.date-quick-btn, .value-quick-btn').removeClass('active');
    $('.date-quick-btn[data-period="tudo"]').addClass('active');
    
    // Atualizar resumo
    updateSmartSummary();
    
    showNotification('Filtros inteligentes limpos', 'success');
}

function applySmartFilters() {
    console.log('🎯 Aplicando filtros inteligentes à tabela principal...');
    
    try {
        // Copiar filtros do Smart Header para os filtros principais
        $('#tipoFilter').val($('#smartTipoFilter').val());
        $('#statusNegociacaoFilter').val($('#smartStatusNegociacaoFilter').val());
        $('#statusPagamentoFilter').val($('#smartStatusPagamentoFilter').val());
        $('#dataVencimentoInicio').val($('#smartDataInicio').val());
        $('#dataVencimentoFim').val($('#smartDataFim').val());
        
        // Aplicar filtros à listagem principal
        if (typeof applyFilters === 'function') {
            applyFilters();
        } else {
            loadTransacoes(); // Fallback
        }
        
        showNotification('Filtros aplicados à listagem principal', 'success');
    } catch (error) {
        console.error('Erro ao aplicar filtros:', error);
        showNotification('Erro ao aplicar filtros', 'error');
    }
}

// ====================================
// VIEW TOGGLE FUNCTIONS (Previsão/Consolidado/Atrasado)
// ====================================

function switchViewType(viewType) {
    console.log(`🔄 Mudando para view type: ${viewType}`);
    
    currentViewType = viewType;
    
    // Update buttons
    $('.view-toggle-btn').removeClass('active');
    $(`.view-toggle-btn[data-view="${viewType}"]`).addClass('active');
    
    // Update current filters with view type
    currentFilters.view_type = viewType;
    
    // Reload data with new view type
    loadTransacoes();
    
    // Update metrics for this view
    loadViewMetrics(viewType);
    
    showNotification(`Visualização alterada para: ${getViewTypeLabel(viewType)}`, 'info');
}

function getViewTypeLabel(viewType) {
    switch(viewType) {
        case 'previsao': return 'Previsão';
        case 'consolidado': return 'Consolidado';
        case 'atrasado': return 'Atrasado';
        default: return 'Previsão';
    }
}

function loadViewCounts() {
    console.log('📊 Carregando contadores do view toggle...');
    
    $.ajax({
        url: '/api/transacoes/view-counts',
        method: 'GET',
        success: function(data) {
            console.log('✅ Contadores carregados:', data);
            updateViewCounts(data);
        },
        error: function(xhr, status, error) {
            console.error('❌ Erro ao carregar contadores:', error);
            // Fallback counts
            updateViewCounts({
                previsao: 0,
                consolidado: 0,
                atrasado: 0
            });
        }
    });
}

function updateViewCounts(counts) {
    $('#previsaoCount').text(counts.previsao || 0);
    $('#consolidadoCount').text(counts.consolidado || 0);
    $('#atrasadoCount').text(counts.atrasado || 0);
}

function loadViewMetrics(viewType) {
    console.log(`📊 Carregando métricas para view: ${viewType}`);
    
    $.ajax({
        url: `/api/transacoes/view-metrics/${viewType}`,
        method: 'GET',
        success: function(data) {
            console.log('✅ Métricas carregadas:', data);
            updateFinancialHeaderByView(data, viewType);
        },
        error: function(xhr, status, error) {
            console.error('❌ Erro ao carregar métricas:', error);
        }
    });
}

function updateFinancialHeaderByView(data, viewType) {
    // Update KPIs based on view type
    $('#filteredEntradas').text(formatCurrency(data.receitas || 0));
    $('#filteredSaidas').text(formatCurrency(data.despesas || 0));
    $('#filteredSaldo').text(formatCurrency(data.saldo || 0));
    $('#filteredMedia').text(formatCurrency(data.valor_medio || 0));
    
    // Update counts
    $('#countEntradas').text(`${data.count_receitas || 0} transações`);
    $('#countSaidas').text(`${data.count_despesas || 0} transações`);
    $('#totalFiltered').text(`${data.total_transacoes || 0} transações`);
    
    // Update period display
    $('#filteredPeriod').text(`${getViewTypeLabel(viewType)} - Período filtrado`);
    
    // Update saldo color
    const saldoElement = $('#filteredSaldo');
    saldoElement.removeClass('text-success text-danger');
    if (data.saldo > 0) {
        saldoElement.addClass('text-success');
    } else if (data.saldo < 0) {
        saldoElement.addClass('text-danger');
    }
}

// ====================================
// DATE SLIDER FUNCTIONS
// ====================================

function setupDateSlider() {
    console.log('📅 Configurando date slider...');
    
    const startSlider = document.getElementById('dateSliderStart');
    const endSlider = document.getElementById('dateSliderEnd');
    const rangeDisplay = document.getElementById('dateSliderRange');
    const dateDisplay = document.getElementById('dateRangeDisplay');
    
    if (!startSlider || !endSlider) {
        console.warn('⚠️ Date slider elements not found');
        return;
    }
    
    // Initialize slider values
    updateDateSliderDisplay();
    
    // Event listeners
    startSlider.addEventListener('input', function() {
        if (parseInt(this.value) >= parseInt(endSlider.value)) {
            this.value = parseInt(endSlider.value) - 1;
        }
        updateDateSliderDisplay();
        updateDateSliderRange();
    });
    
    endSlider.addEventListener('input', function() {
        if (parseInt(this.value) <= parseInt(startSlider.value)) {
            this.value = parseInt(startSlider.value) + 1;
        }
        updateDateSliderDisplay();
        updateDateSliderRange();
    });
    
    // Preset buttons
    $('.date-preset-btn').on('click', function() {
        const preset = $(this).data('preset');
        setDatePreset(preset);
    });
}

function updateDateSliderDisplay() {
    const startVal = parseInt(document.getElementById('dateSliderStart').value);
    const endVal = parseInt(document.getElementById('dateSliderEnd').value);
    
    // Convert slider values to dates (0 = Jan 2023, 730 = Dec 2024)
    const startDate = new Date(2023, 0, 1);
    startDate.setDate(startDate.getDate() + startVal);
    
    const endDate = new Date(2023, 0, 1);
    endDate.setDate(endDate.getDate() + endVal);
    
    // Update display
    const startStr = startDate.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
    const endStr = endDate.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
    
    document.getElementById('dateRangeDisplay').textContent = `${startStr} - ${endStr}`;
    
    // Update hidden inputs for compatibility
    document.getElementById('smartDataInicio').value = startDate.toISOString().split('T')[0];
    document.getElementById('smartDataFim').value = endDate.toISOString().split('T')[0];
}

function updateDateSliderRange() {
    const startVal = parseInt(document.getElementById('dateSliderStart').value);
    const endVal = parseInt(document.getElementById('dateSliderEnd').value);
    const range = document.getElementById('dateSliderRange');
    
    const percentStart = (startVal / 730) * 100;
    const percentEnd = (endVal / 730) * 100;
    
    range.style.left = percentStart + '%';
    range.style.width = (percentEnd - percentStart) + '%';
    
    // Trigger filter update
    debounce(updateSmartSummary, 300)();
}

function setDatePreset(preset) {
    console.log(`📅 Aplicando preset de data: ${preset}`);
    
    const startSlider = document.getElementById('dateSliderStart');
    const endSlider = document.getElementById('dateSliderEnd');
    
    let startVal, endVal;
    
    switch(preset) {
        case 'mes-atual':
            // Current month
            const hoje = new Date();
            const mesAtual = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
            const diffMesAtual = Math.floor((mesAtual - new Date(2023, 0, 1)) / (1000 * 60 * 60 * 24));
            startVal = Math.max(0, diffMesAtual);
            endVal = Math.min(730, diffMesAtual + 30);
            break;
            
        case 'trimestre':
            // Current quarter
            const trimestre = new Date();
            const quarter = Math.floor(trimestre.getMonth() / 3);
            const trimestreInicio = new Date(trimestre.getFullYear(), quarter * 3, 1);
            const diffTrimestre = Math.floor((trimestreInicio - new Date(2023, 0, 1)) / (1000 * 60 * 60 * 24));
            startVal = Math.max(0, diffTrimestre);
            endVal = Math.min(730, diffTrimestre + 90);
            break;
            
        case 'ano-atual':
            // 2024
            const ano2024 = new Date(2024, 0, 1);
            const diffAno = Math.floor((ano2024 - new Date(2023, 0, 1)) / (1000 * 60 * 60 * 24));
            startVal = diffAno;
            endVal = 730;
            break;
            
        case 'tudo':
        default:
            startVal = 0;
            endVal = 730;
            break;
    }
    
    startSlider.value = startVal;
    endSlider.value = endVal;
    
    updateDateSliderDisplay();
    updateDateSliderRange();
    
    // Update preset button active state
    $('.date-preset-btn').removeClass('active');
    $(`.date-preset-btn[data-preset="${preset}"]`).addClass('active');
}

// Tornar as funções globalmente disponíveis
window.applySmartFilters = applySmartFilters;
window.clearSmartFilters = clearSmartFilters;
window.switchViewType = switchViewType;

function saveFilterPreset() {
    const filters = getSmartFilters();
    const presetName = prompt('Nome do preset de filtros:');
    
    if (presetName) {
        // Salvar no localStorage
        const presets = JSON.parse(localStorage.getItem('transacoes_filter_presets') || '{}');
        presets[presetName] = filters;
        localStorage.setItem('transacoes_filter_presets', JSON.stringify(presets));
        
        showNotification(`Preset "${presetName}" salvo com sucesso`, 'success');
    }
}

// Utility functions
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function formatDateBR(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('pt-BR');
}
