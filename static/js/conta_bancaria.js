// Conta Bancária JavaScript - Sistema Selleta

$(document).ready(function() {
    let contasOriginais = [];      // Dataset completo (nunca modificado)
    let contasDados = [];          // Dataset filtrado (para visualização)
    let empresasDados = [];
    let bancosUnicos = [];
    let filtrosAtivos = {};

    // Inicialização
    init();

    function init() {
        carregarEmpresas();
        carregarContasBancarias();
        configurarEventos();
        configurarFiltros();
        
        // Aplicar filtro padrão "Ativa"
        $('#filtro-status').val('Ativa');
        filtrosAtivos.status = 'Ativa';
    }

    // ========================================
    // CARREGAMENTO DE DADOS
    // ========================================

    function carregarEmpresas() {
        $.get('/api/empresas')
            .done(function(data) {
                empresasDados = data;
                preencherFiltroEmpresas();
            })
            .fail(function() {
                mostrarNotificacao('Erro ao carregar empresas', 'error');
            });
    }

    function carregarContasBancarias() {
        mostrarLoading();
        
        $.get('/api/contas_bancarias')
            .done(function(data) {
                contasOriginais = data;
                contasDados = [...data];
                extrairBancosUnicos();
                aplicarFiltros();
                atualizarKPIs();
                ocultarLoading();
            })
            .fail(function() {
                mostrarNotificacao('Erro ao carregar contas bancárias', 'error');
                ocultarLoading();
            });
    }

    function extrairBancosUnicos() {
        const bancos = new Set();
        contasOriginais.forEach(conta => {
            if (conta.banco && conta.banco !== 'NULL') {
                bancos.add(conta.banco);
            }
        });
        bancosUnicos = Array.from(bancos).sort();
        preencherFiltroBancos();
    }

    // ========================================
    // CONFIGURAÇÃO DE EVENTOS
    // ========================================

    function configurarEventos() {
        // Botões principais
        $('#btn-nova-conta, #btn-nova-conta-empty').click(abrirModalNova);
        $('#btn-relatorios-gerais').click(abrirModalRelatorios);
        
        // Modal eventos
        $('.modal-close, #btn-cancelar').click(fecharModal);
        $('#form-conta').submit(salvarConta);
        
        // Abas de visualização
        $('.tab-button').click(function() {
            const view = $(this).data('view');
            alterarVisualizacao(view);
        });
        
        // Filtros
        $('#pesquisa-conta').on('input', debounce(aplicarFiltros, 300));
        $('.filter-select').change(aplicarFiltros);
        
        // Relatórios
        $('.btn-export').click(function() {
            const tipo = $(this).data('type');
            exportarRelatorio(tipo);
        });
        
        // Fechar modal clicando fora
        $('.modal').click(function(e) {
            if (e.target === this) {
                fecharModal();
            }
        });
    }

    function configurarFiltros() {
        // Auto-complete para pesquisa
        $('#pesquisa-conta').on('input', function() {
            const termo = $(this).val().toLowerCase();
            if (termo.length > 0) {
                const sugestoes = contasDados
                    .filter(c => 
                        c.conta_corrente.toLowerCase().includes(termo) ||
                        (c.banco && c.banco.toLowerCase().includes(termo)) ||
                        c.empresa.toLowerCase().includes(termo)
                    )
                    .slice(0, 5);
                // Implementar autocomplete se necessário
            }
        });
    }

    // ========================================
    // VISUALIZAÇÃO E RENDERIZAÇÃO
    // ========================================

    function alterarVisualizacao(view) {
        $('.tab-button').removeClass('active');
        $(`.tab-button[data-view="${view}"]`).addClass('active');
        
        $('.view-content').removeClass('active');
        $(`#view-${view}`).addClass('active');
        
        switch(view) {
            case 'cards':
                renderizarCards();
                break;
            case 'table':
                renderizarTabela();
                break;
            case 'stats':
                renderizarEstatisticas();
                break;
        }
    }

    function renderizarCards() {
        const container = $('#contas-lista');
        container.empty();
        
        if (contasDados.length === 0) {
            mostrarEstadoVazio();
            return;
        }
        
        contasDados.forEach(conta => {
            const card = criarCardConta(conta);
            container.append(card);
        });
    }

    function criarCardConta(conta) {
        const statusClass = conta.status_conta ? conta.status_conta.toLowerCase() : 'ativa';
        const statusText = conta.status_conta || 'Ativa';
        const bancoNome = conta.banco || 'Banco não informado';
        const saldoFormatado = formatarMoeda(conta.saldo_inicial || 0);
        const saldoClass = (conta.saldo_inicial || 0) >= 0 ? 'positivo' : 'negativo';
        
        return `
            <div class="conta-card" data-id="${conta.id}">
                <div class="conta-header">
                    <span class="conta-banco">${bancoNome}</span>
                    <span class="conta-status ${statusClass}">${statusText}</span>
                </div>
                
                <div class="conta-info">
                    <h4>${conta.conta_corrente}</h4>
                    <p class="conta-agencia">Agência: ${conta.agencia}</p>
                </div>
                
                <div class="conta-detalhes">
                    <div class="detalhe-item">
                        <span class="detalhe-label">Empresa</span>
                        <span class="detalhe-valor">${conta.empresa}</span>
                    </div>
                    <div class="detalhe-item">
                        <span class="detalhe-label">Tipo</span>
                        <span class="detalhe-valor">${conta.tipo_conta || 'Bancária'}</span>
                    </div>
                    <div class="detalhe-item">
                        <span class="detalhe-label">Saldo</span>
                        <span class="detalhe-valor saldo-${saldoClass}">${saldoFormatado}</span>
                    </div>
                </div>
                
                <div class="conta-acoes">
                    <button class="btn-acao" onclick="editarConta(${conta.id})" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-acao btn-danger" onclick="excluirConta(${conta.id})" title="Excluir">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    }

    function renderizarTabela() {
        const tbody = $('#contas-tabela');
        tbody.empty();
        
        if (contasDados.length === 0) {
            tbody.append(`
                <tr>
                    <td colspan="8" class="text-center">Nenhuma conta encontrada</td>
                </tr>
            `);
            return;
        }
        
        contasDados.forEach(conta => {
            const statusClass = conta.status_conta ? conta.status_conta.toLowerCase() : 'ativa';
            const saldoFormatado = formatarMoeda(conta.saldo_inicial || 0);
            const saldoClass = (conta.saldo_inicial || 0) >= 0 ? 'positivo' : 'negativo';
            
            const row = `
                <tr>
                    <td>${conta.banco || '-'}</td>
                    <td>${conta.agencia}</td>
                    <td>${conta.conta_corrente}</td>
                    <td>${conta.empresa}</td>
                    <td>${conta.tipo_conta || 'Bancária'}</td>
                    <td class="saldo-${saldoClass}">${saldoFormatado}</td>
                    <td><span class="status-badge ${statusClass}">${conta.status_conta || 'Ativa'}</span></td>
                    <td class="acoes">
                        <button class="btn-acao" onclick="editarConta(${conta.id})" title="Editar">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-acao btn-danger" onclick="excluirConta(${conta.id})" title="Excluir">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
            tbody.append(row);
        });
    }

    function renderizarEstatisticas() {
        // Implementar gráficos e estatísticas
        console.log('Renderizando estatísticas...');
    }

    // ========================================
    // FILTROS E PESQUISA
    // ========================================

    function aplicarFiltros() {
        const pesquisa = $('#pesquisa-conta').val().toLowerCase();
        const filtroBanco = $('#filtro-banco').val();
        const filtroEmpresa = $('#filtro-empresa').val();
        const filtroTipo = $('#filtro-tipo').val();
        const filtroStatus = $('#filtro-status').val();
        
        contasDados = contasOriginais.filter(conta => {
            // Filtro de pesquisa
            if (pesquisa) {
                const contemPesquisa = 
                    conta.conta_corrente.toLowerCase().includes(pesquisa) ||
                    conta.agencia.toLowerCase().includes(pesquisa) ||
                    (conta.banco && conta.banco.toLowerCase().includes(pesquisa)) ||
                    conta.empresa.toLowerCase().includes(pesquisa) ||
                    (conta.mascara && conta.mascara.toLowerCase().includes(pesquisa));
                
                if (!contemPesquisa) return false;
            }
            
            // Filtro de banco
            if (filtroBanco && conta.banco !== filtroBanco) return false;
            
            // Filtro de empresa
            if (filtroEmpresa && conta.empresa !== filtroEmpresa) return false;
            
            // Filtro de tipo
            if (filtroTipo && conta.tipo_conta !== filtroTipo) return false;
            
            // Filtro de status
            if (filtroStatus && conta.status_conta !== filtroStatus) return false;
            
            return true;
        });
        
        atualizarVisualizacao();
        atualizarKPIs();
    }

    function atualizarVisualizacao() {
        const viewAtiva = $('.tab-button.active').data('view');
        
        switch(viewAtiva) {
            case 'cards':
                renderizarCards();
                break;
            case 'table':
                renderizarTabela();
                break;
            case 'stats':
                renderizarEstatisticas();
                break;
        }
    }

    // ========================================
    // KPIs
    // ========================================

    function atualizarKPIs() {
        // 1. Contas Ativas - apenas com status "Ativa"
        const contasAtivas = contasOriginais.filter(c => c.status_conta === 'Ativa');
        
        // 2. Somatória de Saldo - somatória total dos saldos das contas ativas (positivos + negativos)
        const somatoriaSaldo = contasAtivas.reduce((sum, c) => sum + (parseFloat(c.saldo_inicial) || 0), 0);
        
        // 3. Total de Contas - contas com status "Ativa" e "Aberta"
        const totalContas = contasOriginais.filter(c => 
            c.status_conta === 'Ativa' || c.status_conta === 'Aberta'
        ).length;
        
        // 4. Total de Bancos - bancos únicos das contas "Ativa" e "Aberta"
        const contasAtivasEAbertas = contasOriginais.filter(c => 
            c.status_conta === 'Ativa' || c.status_conta === 'Aberta'
        );
        const bancosUnicos = new Set();
        contasAtivasEAbertas.forEach(conta => {
            if (conta.banco && conta.banco !== 'NULL' && conta.banco.trim() !== '') {
                bancosUnicos.add(conta.banco);
            }
        });
        
        // Atualizar os elementos HTML
        $('#kpi-contas-ativas').text(contasAtivas.length);
        $('#kpi-somatoria-saldo').text(formatarMoeda(somatoriaSaldo));
        $('#kpi-total-contas').text(totalContas);
        $('#kpi-total-bancos').text(bancosUnicos.size);
    }

    // ========================================
    // CRUD OPERATIONS
    // ========================================

    function abrirModalNova() {
        $('#modal-title').text('Nova Conta Bancária');
        $('#form-conta')[0].reset();
        $('#conta_id').val('');
        $('#modal-conta').fadeIn();
    }

    function abrirModalRelatorios() {
        $('#modal-relatorios').fadeIn();
    }

    window.editarConta = function(id) {
        const conta = contasOriginais.find(c => c.id === id);
        if (!conta) return;
        
        $('#modal-title').text('Editar Conta Bancária');
        $('#conta_id').val(conta.id);
        $('#conta_corrente').val(conta.conta_corrente);
        $('#agencia').val(conta.agencia);
        $('#banco').val(conta.banco || '');
        $('#empresa').val(conta.empresa);
        $('#tipo_conta').val(conta.tipo_conta || '');
        $('#saldo_inicial').val(conta.saldo_inicial || 0);
        $('#status_conta').val(conta.status_conta || 'Ativa');
        $('#mascara').val(conta.mascara || '');
        
        $('#modal-conta').fadeIn();
    };

    window.excluirConta = function(id) {
        if (!confirm('Tem certeza que deseja excluir esta conta?')) return;
        
        $.ajax({
            url: `/api/contas_bancarias/${id}`,
            method: 'DELETE',
            success: function() {
                mostrarNotificacao('Conta excluída com sucesso!', 'success');
                carregarContasBancarias();
            },
            error: function() {
                mostrarNotificacao('Erro ao excluir conta', 'error');
            }
        });
    };

    function salvarConta(e) {
        e.preventDefault();
        
        const formData = {
            conta_corrente: $('#conta_corrente').val(),
            agencia: $('#agencia').val(),
            banco: $('#banco').val() || null,
            empresa: $('#empresa').val(),
            tipo_conta: $('#tipo_conta').val() || 'Bancária',
            saldo_inicial: parseFloat($('#saldo_inicial').val()) || 0,
            status_conta: $('#status_conta').val(),
            mascara: $('#mascara').val() || null
        };
        
        const id = $('#conta_id').val();
        const url = id ? `/api/contas_bancarias/${id}` : '/api/contas_bancarias';
        const method = id ? 'PUT' : 'POST';
        
        $.ajax({
            url: url,
            method: method,
            contentType: 'application/json',
            data: JSON.stringify(formData),
            success: function() {
                mostrarNotificacao(id ? 'Conta atualizada com sucesso!' : 'Conta criada com sucesso!', 'success');
                fecharModal();
                carregarContasBancarias();
            },
            error: function(xhr) {
                const erro = xhr.responseJSON?.erro || 'Erro ao salvar conta';
                mostrarNotificacao(erro, 'error');
            }
        });
    }

    // ========================================
    // RELATÓRIOS
    // ========================================

    function exportarRelatorio(tipo) {
        mostrarNotificacao(`Exportando relatório: ${tipo}`, 'info');
        // Implementar exportação
    }

    // ========================================
    // HELPERS
    // ========================================

    function fecharModal() {
        $('.modal').fadeOut();
    }

    function mostrarLoading() {
        $('#loading').show();
        $('#empty-state').hide();
    }

    function ocultarLoading() {
        $('#loading').hide();
    }

    function mostrarEstadoVazio() {
        $('#empty-state').show();
    }

    function preencherFiltroBancos() {
        const select = $('#filtro-banco');
        select.find('option:not(:first)').remove();
        
        bancosUnicos.forEach(banco => {
            select.append(`<option value="${banco}">${banco}</option>`);
        });
    }

    function preencherFiltroEmpresas() {
        const select = $('#filtro-empresa');
        select.find('option:not(:first)').remove();
        
        empresasDados.forEach(empresa => {
            select.append(`<option value="${empresa.razao_social}">${empresa.nome}</option>`);
        });
    }

    function formatarMoeda(valor) {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(valor);
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

    function mostrarNotificacao(mensagem, tipo) {
        // Implementar sistema de notificações
        console.log(`[${tipo.toUpperCase()}] ${mensagem}`);
        
        // Temporário: usar alert
        if (tipo === 'error') {
            alert('Erro: ' + mensagem);
        }
    }
});