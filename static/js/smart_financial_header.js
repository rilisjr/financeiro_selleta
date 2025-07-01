// ====================================
// Smart Financial Header - Lógicas Especializadas
// ====================================

console.log('📊 Carregando smart_financial_header.js...');

// Variáveis globais
let dateRangeStart = null;
let dateRangeEnd = null;

// Inicialização
$(document).ready(function() {
    initializeSmartHeader();
});

function initializeSmartHeader() {
    console.log('🚀 Inicializando Smart Financial Header...');
    
    // Configurar defaults
    setDefaultFilters();
    
    // Atualizar ano no botão
    $('#ano-atual-text').text(new Date().getFullYear());
    
    // Carregar dropdowns
    loadEntityDropdowns();
    
    // Configurar date slider dinâmico
    setupDynamicDateSlider();
    
    // Carregar cards especiais
    loadSpecialCards();
    
    // Event listeners
    setupSmartHeaderEvents();
}

function setDefaultFilters() {
    console.log('⚙️ Configurando filtros padrão...');
    
    // View type padrão: Previsão
    if (typeof switchViewType === 'function') {
        switchViewType('previsao');
    }
    
    // Status negociação padrão: NEGOCIADO
    $('#smartStatusNegociacaoFilter').val('NEGOCIADO');
    
    // Trigger update
    if (typeof updateSmartSummary === 'function') {
        setTimeout(() => updateSmartSummary(), 500);
    }
}

function loadEntityDropdowns() {
    console.log('📦 Carregando dropdowns de entidades...');
    
    // Carregar Empresas
    $.get('/api/empresas', function(data) {
        const select = $('#smartEmpresaFilter');
        data.forEach(empresa => {
            select.append(`<option value="${empresa.id}">${empresa.nome}</option>`);
        });
    });
    
    // Carregar Centros de Custo
    $.get('/api/centros_custo', function(data) {
        const select = $('#smartCentroCustoFilter');
        data.forEach(cc => {
            select.append(`<option value="${cc.id}">${cc.mascara_cc}</option>`);
        });
    });
    
    // Carregar Planos Financeiros
    $.get('/api/planos_financeiros', function(data) {
        const select = $('#smartPlanoFinanceiroFilter');
        data.forEach(pf => {
            const indent = '&nbsp;&nbsp;'.repeat((pf.nivel || pf.grau || 1) - 1);
            select.append(`<option value="${pf.id}">${indent}${pf.codigo} - ${pf.nome}</option>`);
        });
    });
}

function setupDynamicDateSlider() {
    console.log('📅 Configurando date slider com range fixo...');
    
    // Range fixo de datas: 01/12/2022 até 31/12/2030
    dateRangeStart = new Date(2022, 11, 1); // 01/12/2022 (mês é 0-indexado)
    dateRangeEnd = new Date(2030, 11, 31); // 31/12/2030
    
    console.log(`Range de datas: ${dateRangeStart.toLocaleDateString('pt-BR')} até ${dateRangeEnd.toLocaleDateString('pt-BR')}`);
    
    // Atualizar labels
    updateDateLabels();
    
    // Configurar sliders
    setupSliderEvents();
    
    // Definir período padrão: últimos 2 anos até hoje
    const hoje = new Date();
    const doisAnosAtras = new Date();
    doisAnosAtras.setFullYear(hoje.getFullYear() - 2);
    
    // Calcular porcentagens para o período padrão
    const totalDays = Math.floor((dateRangeEnd - dateRangeStart) / (1000 * 60 * 60 * 24));
    const startDays = Math.floor((doisAnosAtras - dateRangeStart) / (1000 * 60 * 60 * 24));
    const endDays = Math.floor((hoje - dateRangeStart) / (1000 * 60 * 60 * 24));
    
    const startPercent = Math.max(0, Math.min(100, (startDays / totalDays) * 100));
    const endPercent = Math.max(0, Math.min(100, (endDays / totalDays) * 100));
    
    // Aplicar valores padrão
    $('#dateSliderStart').val(startPercent);
    $('#dateSliderEnd').val(endPercent);
    
    // Atualizar display
    updateDateSliderDisplay();
    updateDateSliderRange();
    
    // Forçar atualização do display principal
    setTimeout(() => {
        const currentStart = $('#dateSliderStart').val();
        const currentEnd = $('#dateSliderEnd').val();
        console.log(`Valores atuais dos sliders: start=${currentStart}%, end=${currentEnd}%`);
        
        // Verificar se elementos existem
        const displayElement = document.getElementById('dateRangeDisplay');
        const startSlider = document.getElementById('dateSliderStart');
        const endSlider = document.getElementById('dateSliderEnd');
        
        console.log(`Elementos encontrados: display=${!!displayElement}, startSlider=${!!startSlider}, endSlider=${!!endSlider}`);
        
        // Disparar atualização manual se necessário
        if (currentStart && currentEnd && displayElement) {
            updateDateSliderDisplay();
        }
    }, 200);
}

function updateDateLabels() {
    // Labels dos extremos do range (fixos)
    const rangeStartLabel = dateRangeStart.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' });
    const rangeEndLabel = dateRangeEnd.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' });
    
    console.log(`Range completo disponível: ${rangeStartLabel} até ${rangeEndLabel}`);
    
    // Inicializar labels com o range completo (será atualizado pelos sliders)
    $('.date-label-start').text(rangeStartLabel);
    $('.date-label-end').text(rangeEndLabel);
}

function setupSliderEvents() {
    const startSlider = document.getElementById('dateSliderStart');
    const endSlider = document.getElementById('dateSliderEnd');
    
    if (!startSlider || !endSlider) return;
    
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
        applyDatePreset(preset);
    });
}

function updateDateSliderDisplay() {
    const startVal = parseInt(document.getElementById('dateSliderStart').value);
    const endVal = parseInt(document.getElementById('dateSliderEnd').value);
    
    // Calcular datas baseado na porcentagem com mais precisão
    const totalDays = (dateRangeEnd - dateRangeStart) / (1000 * 60 * 60 * 24);
    const startDays = Math.round((startVal / 100) * totalDays);
    const endDays = Math.round((endVal / 100) * totalDays);
    
    const startDate = new Date(dateRangeStart.getTime() + (startDays * 24 * 60 * 60 * 1000));
    const endDate = new Date(dateRangeStart.getTime() + (endDays * 24 * 60 * 60 * 1000));
    
    // Atualizar display
    const startStr = startDate.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' });
    const endStr = endDate.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' });
    
    console.log(`📅 Atualizando dateRangeDisplay: ${startStr} - ${endStr}`);
    
    // Atualizar o display principal
    const displayElement = document.getElementById('dateRangeDisplay');
    if (displayElement) {
        displayElement.textContent = `${startStr} - ${endStr}`;
        console.log(`✅ dateRangeDisplay atualizado: ${displayElement.textContent}`);
    } else {
        console.error('❌ Elemento dateRangeDisplay não encontrado!');
    }
    
    // Atualizar labels também
    $('.date-label-start').text(startStr);
    $('.date-label-end').text(endStr);
    
    // Atualizar hidden inputs
    document.getElementById('smartDataInicio').value = startDate.toISOString().split('T')[0];
    document.getElementById('smartDataFim').value = endDate.toISOString().split('T')[0];
    
    console.log(`Hidden inputs: início=${startDate.toISOString().split('T')[0]}, fim=${endDate.toISOString().split('T')[0]}`);
}

function updateDateSliderRange() {
    const startVal = parseInt(document.getElementById('dateSliderStart').value);
    const endVal = parseInt(document.getElementById('dateSliderEnd').value);
    const range = document.getElementById('dateSliderRange');
    
    range.style.left = startVal + '%';
    range.style.width = (endVal - startVal) + '%';
    
    // Trigger update com debounce
    if (typeof updateSmartSummary === 'function') {
        clearTimeout(window.dateSliderTimeout);
        window.dateSliderTimeout = setTimeout(() => updateSmartSummary(), 300);
    }
}

function applyDatePreset(preset) {
    console.log(`📅 Aplicando preset: ${preset}`);
    
    const hoje = new Date();
    let startDate, endDate;
    let startPercent = 0, endPercent = 100;
    
    switch(preset) {
        case 'mes-atual':
            startDate = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
            endDate = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
            break;
            
        case 'trimestre':
            const quarter = Math.floor(hoje.getMonth() / 3);
            startDate = new Date(hoje.getFullYear(), quarter * 3, 1);
            endDate = new Date(hoje.getFullYear(), (quarter + 1) * 3, 0);
            break;
            
        case 'ano-atual':
            startDate = new Date(hoje.getFullYear(), 0, 1);
            endDate = new Date(hoje.getFullYear(), 11, 31);
            break;
            
        case 'tudo':
        default:
            startDate = dateRangeStart;
            endDate = dateRangeEnd;
            break;
    }
    
    // Garantir que as datas estão dentro do range permitido
    if (startDate < dateRangeStart) startDate = dateRangeStart;
    if (endDate > dateRangeEnd) endDate = dateRangeEnd;
    
    // Calcular percentuais
    const totalDays = Math.floor((dateRangeEnd - dateRangeStart) / (1000 * 60 * 60 * 24));
    const startDays = Math.floor((startDate - dateRangeStart) / (1000 * 60 * 60 * 24));
    const endDays = Math.floor((endDate - dateRangeStart) / (1000 * 60 * 60 * 24));
    
    startPercent = Math.max(0, Math.min(100, (startDays / totalDays) * 100));
    endPercent = Math.max(0, Math.min(100, (endDays / totalDays) * 100));
    
    // Aplicar valores
    document.getElementById('dateSliderStart').value = startPercent;
    document.getElementById('dateSliderEnd').value = endPercent;
    
    updateDateSliderDisplay();
    updateDateSliderRange();
    
    // Atualizar botão ativo
    $('.date-preset-btn').removeClass('active');
    $(`.date-preset-btn[data-preset="${preset}"]`).addClass('active');
}

function loadSpecialCards() {
    console.log('📊 Carregando cards especiais...');
    
    // Carregar Previsão próximos 30 dias
    loadPrevisao30Days();
    
    // Carregar Consolidado últimos 30 dias
    loadConsolidado30Days();
}

function loadPrevisao30Days() {
    const hoje = new Date();
    const fim = new Date();
    fim.setDate(fim.getDate() + 30);
    
    $.ajax({
        url: '/api/transacoes',
        method: 'GET',
        data: {
            view_type: 'previsao',
            data_vencimento_inicio: hoje.toISOString().split('T')[0],
            data_vencimento_fim: fim.toISOString().split('T')[0],
            per_page: 1000
        },
        success: function(response) {
            const transacoes = response.transacoes || [];
            // Atualizar contador no botão
            $('#previsao30Count').text(transacoes.length);
        }
    });
}

function loadConsolidado30Days() {
    const hoje = new Date();
    const inicio = new Date();
    inicio.setDate(inicio.getDate() - 30);
    
    $.ajax({
        url: '/api/transacoes',
        method: 'GET',
        data: {
            view_type: 'consolidado',
            data_vencimento_inicio: inicio.toISOString().split('T')[0],
            data_vencimento_fim: hoje.toISOString().split('T')[0],
            per_page: 1000
        },
        success: function(response) {
            const transacoes = response.transacoes || [];
            // Atualizar contador no botão
            $('#consolidado30Count').text(transacoes.length);
        }
    });
}

function setupSmartHeaderEvents() {
    // Entity filters
    $('#smartEmpresaFilter, #smartCentroCustoFilter, #smartPlanoFinanceiroFilter').on('change', function() {
        if (typeof updateSmartSummary === 'function') {
            updateSmartSummary();
        }
    });
    
    // Filtros smart (removido smartTipoFilter pois agora é botão)
    $('#smartStatusNegociacaoFilter, #smartTipologiaFilter').on('change', function() {
        if (typeof updateSmartSummary === 'function') {
            updateSmartSummary();
        }
    });
    
    // Type filter buttons
    $('.type-filter-btn').on('click', function() {
        const selectedType = $(this).data('type');
        
        // Atualizar estado visual dos botões
        $('.type-filter-btn').removeClass('active');
        $(this).addClass('active');
        
        // Atualizar o hidden select (para compatibilidade)
        if ($('#smartTipoFilter').length) {
            $('#smartTipoFilter').val(selectedType);
        }
        
        console.log(`🎯 Filtro de tipo selecionado: ${selectedType || 'Ambos'}`);
        
        // Trigger update
        if (typeof updateSmartSummary === 'function') {
            updateSmartSummary();
        }
    });
    
    // Payment Status filter buttons - Múltipla escolha
    $('.status-filter-btn').on('click', function() {
        const selectedStatus = $(this).data('status');
        
        console.log(`🔘 Clicou em status: ${selectedStatus}`);
        
        if (selectedStatus === 'todos') {
            // Se clicar em "Todos", desmarcar todos os outros e marcar apenas "Todos"
            $('.status-filter-btn').removeClass('active selected');
            $(this).addClass('active');
            console.log(`✅ "Todos" selecionado - desmarcando específicos`);
        } else {
            // Se clicar em qualquer outro, desmarcar "Todos"
            $('.status-filter-btn[data-status="todos"]').removeClass('active');
            
            // Toggle do botão clicado
            $(this).toggleClass('selected');
            
            // Verificar se algum está selecionado
            const hasSelected = $('.status-filter-btn.selected').length > 0;
            console.log(`🔍 Status específicos selecionados: ${hasSelected ? 'Sim' : 'Não'}`);
            
            if (!hasSelected) {
                // Se nenhum selecionado, marcar "Todos"
                $('.status-filter-btn[data-status="todos"]').addClass('active');
                console.log(`🔄 Nenhum específico selecionado - voltando para "Todos"`);
            }
        }
        
        // Coletar status selecionados para log
        const selectedStatuses = [];
        $('.status-filter-btn.selected').each(function() {
            selectedStatuses.push($(this).data('status'));
        });
        
        // Se "Todos" está ativo, adicionar na lista para log
        if ($('.status-filter-btn[data-status="todos"]').hasClass('active')) {
            selectedStatuses.push('todos');
        }
        
        console.log(`🎯 Status finais selecionados: ${selectedStatuses.join(', ')}`);
        console.log(`📊 Chamando updateSmartSummary...`);
        
        // Trigger update
        if (typeof updateSmartSummary === 'function') {
            updateSmartSummary();
        } else {
            console.error('❌ Função updateSmartSummary não encontrada!');
        }
    });
}

// Função global para aplicar filtro de tipo
window.applyTypeFilter = function(type) {
    console.log(`🎯 Aplicando filtro de tipo: ${type || 'Ambos'}`);
    
    // Atualizar estado visual dos botões
    $('.type-filter-btn').removeClass('active');
    $(`.type-filter-btn[data-type="${type}"]`).addClass('active');
    
    // Atualizar hidden input
    $('#smartTipoFilter').val(type);
    
    // Trigger update
    if (typeof updateSmartSummary === 'function') {
        updateSmartSummary();
    }
};

// Função global para obter status de pagamento selecionados
window.getSelectedPaymentStatuses = function() {
    const selectedStatuses = [];
    
    // Se "Todos" está ativo, retornar array vazio (significa todos)
    if ($('.status-filter-btn[data-status="todos"]').hasClass('active')) {
        return [];
    }
    
    // Coletar status específicos selecionados
    $('.status-filter-btn.selected').each(function() {
        selectedStatuses.push($(this).data('status'));
    });
    
    return selectedStatuses;
};

// Função global para aplicar filtro de status de pagamento
window.applyPaymentStatusFilter = function(statuses) {
    console.log(`🎯 Aplicando filtro de status: ${statuses.join(', ')}`);
    
    // Limpar seleções atuais
    $('.status-filter-btn').removeClass('active selected');
    
    if (statuses.length === 0 || statuses.includes('todos')) {
        // Marcar "Todos"
        $('.status-filter-btn[data-status="todos"]').addClass('active');
    } else {
        // Marcar status específicos
        statuses.forEach(status => {
            $(`.status-filter-btn[data-status="${status}"]`).addClass('selected');
        });
    }
    
    // Trigger update
    if (typeof updateSmartSummary === 'function') {
        updateSmartSummary();
    }
};

// Funções globais
window.applyPrevisao30Filter = function() {
    console.log('🎯 Aplicando filtro: Previsão próximos 30 dias');
    
    // Configurar view type
    if (typeof switchViewType === 'function') {
        switchViewType('previsao');
    }
    
    // Configurar datas
    const hoje = new Date();
    const fim = new Date();
    fim.setDate(fim.getDate() + 30);
    
    $('#smartDataInicio').val(hoje.toISOString().split('T')[0]);
    $('#smartDataFim').val(fim.toISOString().split('T')[0]);
    
    // Aplicar filtros
    if (typeof applySmartFilters === 'function') {
        applySmartFilters();
    }
};

window.applyConsolidado30Filter = function() {
    console.log('🎯 Aplicando filtro: Consolidado últimos 30 dias');
    
    // Configurar view type
    if (typeof switchViewType === 'function') {
        switchViewType('consolidado');
    }
    
    // Configurar datas
    const hoje = new Date();
    const inicio = new Date();
    inicio.setDate(inicio.getDate() - 30);
    
    $('#smartDataInicio').val(inicio.toISOString().split('T')[0]);
    $('#smartDataFim').val(hoje.toISOString().split('T')[0]);
    
    // Aplicar filtros
    if (typeof applySmartFilters === 'function') {
        applySmartFilters();
    }
};

// Date Label Functions
window.toggleDateInput = function(position) {
    console.log(`📅 Toggle date input: ${position}`);
    
    const input = position === 'start' ? 
        document.getElementById('dateStartInput') : 
        document.getElementById('dateEndInput');
    
    const button = position === 'start' ?
        document.querySelector('.date-label-wrapper.start .date-label-btn') :
        document.querySelector('.date-label-wrapper.end .date-label-btn');
    
    if (!input) {
        console.error(`Input não encontrado para posição: ${position}`);
        return;
    }
    
    // Toggle active class
    input.classList.toggle('active');
    
    if (input.classList.contains('active')) {
        // Set current value
        const currentDate = position === 'start' ? 
            document.getElementById('smartDataInicio').value :
            document.getElementById('smartDataFim').value;
        
        // Converter data para formato brasileiro
        if (currentDate) {
            const date = new Date(currentDate);
            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const year = date.getFullYear();
            input.value = `${day}/${month}/${year}`;
        }
        input.placeholder = 'DD/MM/AAAA';
        
        // Garantir que o input seja visível e focado
        input.style.opacity = '1';
        input.style.pointerEvents = 'all';
        input.style.position = 'absolute';
        input.style.zIndex = '1000';
        
        // Posicionar o input sobre o botão
        if (button) {
            const rect = button.getBoundingClientRect();
            const parentRect = input.parentElement.getBoundingClientRect();
            input.style.top = (rect.top - parentRect.top) + 'px';
            input.style.left = (rect.left - parentRect.left) + 'px';
            input.style.width = Math.max(rect.width, 140) + 'px'; // Largura mínima para o input
        }
        
        // Adicionar tooltip de ajuda
        input.title = 'Digite a data e pressione Enter ou clique fora para confirmar';
        
        setTimeout(() => {
            input.focus();
            input.select(); // Selecionar todo o texto para facilitar edição
        }, 50);
        
        // Add event listeners
        const closeInput = () => {
            input.classList.remove('active');
            input.style.opacity = '0';
            input.style.pointerEvents = 'none';
        };
        
        const handleKeydown = function(e) {
            // Apenas processar quando pressionar Enter
            if (e.key === 'Enter') {
                e.preventDefault();
                if (this.value) {
                    updateDateFromInput(position, this.value);
                }
                closeInput();
            }
            // Fechar ao pressionar Escape
            else if (e.key === 'Escape') {
                e.preventDefault();
                closeInput();
            }
        };
        
        const handleBlur = function(e) {
            // Verificar se o blur foi causado por um clique fora
            setTimeout(() => {
                // Se o valor foi alterado, atualizar
                if (this.value && this.value !== currentDate) {
                    updateDateFromInput(position, this.value);
                }
                closeInput();
            }, 200);
        };
        
        // Remover listeners antigos
        input.removeEventListener('keydown', handleKeydown);
        input.removeEventListener('blur', handleBlur);
        
        // Adicionar novos listeners
        input.addEventListener('keydown', handleKeydown);
        input.addEventListener('blur', handleBlur);
        
        // Prevenir propagação do clique e mudanças prematuras
        input.addEventListener('click', function(e) {
            e.stopPropagation();
        });
        
        // Adicionar máscara de data brasileira
        input.addEventListener('input', function(e) {
            e.stopPropagation();
            
            let value = this.value.replace(/\D/g, ''); // Remove não-dígitos
            let formattedValue = '';
            
            if (value.length > 0) {
                formattedValue = value.substring(0, 2); // DD
            }
            if (value.length > 2) {
                formattedValue += '/' + value.substring(2, 4); // MM
            }
            if (value.length > 4) {
                formattedValue += '/' + value.substring(4, 8); // YYYY
            }
            
            this.value = formattedValue;
        });
    } else {
        // Esconder input
        input.style.opacity = '0';
        input.style.pointerEvents = 'none';
    }
};

function updateDateFromInput(position, dateValue) {
    console.log(`📅 Updating date from input: ${position} = ${dateValue}`);
    
    if (!dateValue) return;
    
    let selectedDate;
    
    // Tentar converter diferentes formatos de data
    if (dateValue.includes('/')) {
        // Formato brasileiro DD/MM/YYYY
        const parts = dateValue.split('/');
        if (parts.length === 3) {
            const day = parseInt(parts[0]);
            const month = parseInt(parts[1]) - 1; // Mês é 0-indexado
            const year = parseInt(parts[2]);
            selectedDate = new Date(year, month, day);
        }
    } else if (dateValue.includes('-')) {
        // Formato ISO YYYY-MM-DD
        selectedDate = new Date(dateValue);
    } else {
        alert('Formato de data inválido. Use DD/MM/AAAA ou AAAA-MM-DD');
        return;
    }
    
    // Verificar se a data é válida
    if (isNaN(selectedDate.getTime())) {
        alert('Data inválida');
        return;
    }
    
    console.log(`Data convertida: ${selectedDate.toLocaleDateString('pt-BR')}`);
    
    // Validate date range
    if (selectedDate < dateRangeStart || selectedDate > dateRangeEnd) {
        const startStr = dateRangeStart.toLocaleDateString('pt-BR');
        const endStr = dateRangeEnd.toLocaleDateString('pt-BR');
        alert(`Data deve estar entre ${startStr} e ${endStr}`);
        return;
    }
    
    // Calculate percentage com mais precisão
    const totalDays = (dateRangeEnd - dateRangeStart) / (1000 * 60 * 60 * 24);
    const selectedDays = (selectedDate - dateRangeStart) / (1000 * 60 * 60 * 24);
    const percentage = (selectedDays / totalDays) * 100;
    
    console.log(`Porcentagem calculada: ${percentage}%`);
    
    // Update slider
    if (position === 'start') {
        document.getElementById('dateSliderStart').value = percentage;
        // Forçar atualização do input hidden com a data exata
        document.getElementById('smartDataInicio').value = selectedDate.toISOString().split('T')[0];
    } else {
        document.getElementById('dateSliderEnd').value = percentage;
        // Forçar atualização do input hidden com a data exata
        document.getElementById('smartDataFim').value = selectedDate.toISOString().split('T')[0];
    }
    
    // Update display com a data exata
    const dateStr = selectedDate.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' });
    if (position === 'start') {
        $('.date-label-start').text(dateStr);
    } else {
        $('.date-label-end').text(dateStr);
    }
    
    // Update range display
    updateDateSliderRange();
    
    // Atualizar o display geral
    const startDateStr = document.getElementById('smartDataInicio').value;
    const endDateStr = document.getElementById('smartDataFim').value;
    if (startDateStr && endDateStr) {
        const start = new Date(startDateStr);
        const end = new Date(endDateStr);
        const startStr = start.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' });
        const endStr = end.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' });
        document.getElementById('dateRangeDisplay').textContent = `${startStr} - ${endStr}`;
    }
}

// Utility
function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value);
}