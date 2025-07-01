// Centro de Custo JavaScript - Sistema Selleta

$(document).ready(function() {
    let centrosOriginais = [];      // ✅ Dataset completo (nunca modificado)
    let centrosDados = [];          // ✅ Dataset filtrado (para visualização)
    let empresasDados = [];
    let filtrosAtivos = {};

    // Inicialização
    init();

    function init() {
        carregarEmpresas();
        carregarCentrosCusto();
        configurarEventos();
        configurarFiltros();
    }

    // ========================================
    // CARREGAMENTO DE DADOS
    // ========================================

    function carregarEmpresas() {
        $.get('/api/empresas')
            .done(function(data) {
                empresasDados = data;
                preencherSelectEmpresas();
                preencherFiltroEmpresas();
            })
            .fail(function() {
                mostrarNotificacao('Erro ao carregar empresas', 'error');
            });
    }

    function carregarCentrosCusto() {
        mostrarLoading();
        
        $.get('/api/centros_custo')
            .done(function(data) {
                centrosOriginais = data;    // ✅ Salva dataset completo
                centrosDados = [...data];   // ✅ Copia inicial para visualização
                aplicarFiltros();
                atualizarKPIs();
                ocultarLoading();
            })
            .fail(function() {
                mostrarNotificacao('Erro ao carregar centros de custo', 'error');
                ocultarLoading();
            });
    }

    // ========================================
    // CONFIGURAÇÃO DE EVENTOS
    // ========================================

    function configurarEventos() {
        // Botões principais
        $('#btn-novo-centro, #btn-novo-centro-empty').click(abrirModalNovo);
        $('#btn-relatorios-gerais').click(abrirModalRelatorios);
        
        // Modal eventos
        $('.modal-close, #btn-cancelar').click(fecharModal);
        $('#form-centro').submit(salvarCentro);
        
        // Abas de visualização
        $('.tab-button').click(function() {
            const view = $(this).data('view');
            alterarVisualizacao(view);
        });
        
        // Filtros
        $('#pesquisa-centro').on('input', debounce(aplicarFiltros, 300));
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
        $('#pesquisa-centro').on('input', function() {
            const termo = $(this).val().toLowerCase();
            if (termo.length > 0) {
                const sugestoes = centrosDados
                    .filter(c => c.mascara_cc.toLowerCase().includes(termo))
                    .slice(0, 5)
                    .map(c => c.mascara_cc);
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
        const container = $('#centros-lista');
        container.empty();
        
        if (centrosDados.length === 0) {
            mostrarEstadoVazio();
            return;
        }
        
        centrosDados.forEach(centro => {
            const card = criarCardCentro(centro);
            container.append(card);
        });
    }

    function criarCardCentro(centro) {
        const statusClass = centro.ativo ? 'ativo' : 'inativo';
        const statusText = centro.ativo ? 'Ativo' : 'Inativo';
        
        return `
            <div class="centro-card" data-id="${centro.id}">
                <div class="centro-header">
                    <span class="centro-empresa">${centro.empresa_codigo}</span>
                    <span class="centro-status ${statusClass}">${statusText}</span>
                </div>
                
                <div class="centro-mascara">${centro.mascara_cc}</div>
                
                ${centro.centro_custo_original !== centro.mascara_cc ? 
                    `<div class="centro-original">Original: ${centro.centro_custo_original}</div>` : ''}
                
                <div class="centro-badges">
                    <span class="badge-tipologia">${centro.tipologia}</span>
                    <span class="badge-categoria ${centro.categoria}">${centro.categoria}</span>
                </div>
                
                ${centro.descricao ? `<div class="centro-descricao">${centro.descricao}</div>` : ''}
                
                <div class="centro-actions">
                    <button class="btn-action btn-edit" onclick="editarCentro(${centro.id})">
                        <i class="fas fa-edit"></i> Editar
                    </button>
                    <button class="btn-action btn-report" onclick="relatorioIndividual(${centro.id})">
                        <i class="fas fa-chart-bar"></i> Relatório
                    </button>
                </div>
            </div>
        `;
    }

    function renderizarTabela() {
        const tbody = $('#centros-tabela');
        tbody.empty();
        
        if (centrosDados.length === 0) {
            tbody.append('<tr><td colspan="6" style="text-align: center; padding: 40px;">Nenhum centro de custo encontrado</td></tr>');
            return;
        }
        
        centrosDados.forEach(centro => {
            const linha = criarLinhaTabela(centro);
            tbody.append(linha);
        });
    }

    function criarLinhaTabela(centro) {
        const statusClass = centro.ativo ? 'ativo' : 'inativo';
        const statusText = centro.ativo ? 'Ativo' : 'Inativo';
        
        return `
            <tr data-id="${centro.id}">
                <td>
                    <strong>${centro.mascara_cc}</strong>
                    ${centro.centro_custo_original !== centro.mascara_cc ? 
                        `<br><small style="color: #666; font-style: italic;">${centro.centro_custo_original}</small>` : ''}
                </td>
                <td>${centro.empresa_codigo} - ${centro.empresa_nome}</td>
                <td><span class="badge-tipologia">${centro.tipologia}</span></td>
                <td><span class="badge-categoria ${centro.categoria}">${centro.categoria}</span></td>
                <td><span class="centro-status ${statusClass}">${statusText}</span></td>
                <td>
                    <button class="btn-action btn-edit" onclick="editarCentro(${centro.id})" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-action btn-report" onclick="relatorioIndividual(${centro.id})" title="Relatório">
                        <i class="fas fa-chart-bar"></i>
                    </button>
                </td>
            </tr>
        `;
    }

    function renderizarEstatisticas() {
        // Estatísticas por empresa
        const estatsPorEmpresa = centrosDados.reduce((acc, centro) => {
            const key = centro.empresa_codigo;
            acc[key] = (acc[key] || 0) + 1;
            return acc;
        }, {});
        
        $('#chart-empresas').html(criarGraficoSimples(estatsPorEmpresa, 'Centros por Empresa'));
        
        // Estatísticas por tipologia
        const estatsPorTipologia = centrosDados.reduce((acc, centro) => {
            const key = centro.tipologia;
            acc[key] = (acc[key] || 0) + 1;
            return acc;
        }, {});
        
        $('#chart-tipologias').html(criarGraficoSimples(estatsPorTipologia, 'Centros por Tipologia'));
        
        // Estatísticas por categoria
        const estatsPorCategoria = centrosDados.reduce((acc, centro) => {
            const key = centro.categoria;
            acc[key] = (acc[key] || 0) + 1;
            return acc;
        }, {});
        
        $('#chart-categorias').html(criarGraficoSimples(estatsPorCategoria, 'Centros por Categoria'));
        
        // Relacionamentos
        renderizarRelacionamentos();
    }

    function criarGraficoSimples(dados, titulo) {
        let html = `<h4 style="margin-bottom: 15px; font-size: 14px; color: #666;">${titulo}</h4>`;
        
        Object.entries(dados).forEach(([key, value]) => {
            const porcentagem = (value / centrosDados.length * 100).toFixed(1);
            html += `
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <span style="font-size: 13px;">${key}</span>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <div style="width: 60px; height: 6px; background: #f0f0f0; border-radius: 3px;">
                            <div style="width: ${porcentagem}%; height: 100%; background: #2c5aa0; border-radius: 3px;"></div>
                        </div>
                        <span style="font-size: 12px; color: #666; min-width: 35px;">${value}</span>
                    </div>
                </div>
            `;
        });
        
        return html;
    }

    function renderizarRelacionamentos() {
        const relacionamentos = {};
        
        centrosDados.forEach(centro => {
            const empresa = centro.empresa_codigo;
            if (!relacionamentos[empresa]) {
                relacionamentos[empresa] = {
                    nativo: 0,
                    dependente: 0,
                    generico: 0
                };
            }
            relacionamentos[empresa][centro.categoria]++;
        });
        
        let html = '<h4 style="margin-bottom: 15px; font-size: 14px; color: #666;">Mapa de Relacionamentos</h4>';
        
        Object.entries(relacionamentos).forEach(([empresa, stats]) => {
            html += `
                <div style="margin-bottom: 15px; padding: 10px; background: #f8f9fa; border-radius: 6px;">
                    <strong style="font-size: 13px;">${empresa}</strong>
                    <div style="display: flex; gap: 10px; margin-top: 5px; font-size: 11px;">
                        <span style="color: #4caf50;">N: ${stats.nativo}</span>
                        <span style="color: #ff9800;">D: ${stats.dependente}</span>
                        <span style="color: #9c27b0;">G: ${stats.generico}</span>
                    </div>
                </div>
            `;
        });
        
        $('#relationship-view').html(html);
    }

    // ========================================
    // FILTROS E PESQUISA
    // ========================================

    function aplicarFiltros() {
        const pesquisa = $('#pesquisa-centro').val().toLowerCase();
        const empresa = $('#filtro-empresa').val();
        const tipologia = $('#filtro-tipologia').val();
        const categoria = $('#filtro-categoria').val();
        const status = $('#filtro-status').val();
        
        // ✅ SEMPRE partir do dataset original completo
        let dadosFiltrados = [...centrosOriginais];
        
        // Filtro de pesquisa
        if (pesquisa) {
            dadosFiltrados = dadosFiltrados.filter(centro =>
                centro.mascara_cc.toLowerCase().includes(pesquisa) ||
                centro.centro_custo_original.toLowerCase().includes(pesquisa) ||
                centro.empresa_nome.toLowerCase().includes(pesquisa)
            );
        }
        
        // Filtro por empresa
        if (empresa) {
            dadosFiltrados = dadosFiltrados.filter(centro => centro.empresa_codigo === empresa);
        }
        
        // Filtro por tipologia
        if (tipologia) {
            dadosFiltrados = dadosFiltrados.filter(centro => centro.tipologia === tipologia);
        }
        
        // Filtro por categoria
        if (categoria) {
            dadosFiltrados = dadosFiltrados.filter(centro => centro.categoria === categoria);
        }
        
        // Filtro por status
        if (status !== '') {
            dadosFiltrados = dadosFiltrados.filter(centro => centro.ativo.toString() === status);
        }
        
        // ✅ Atualizar apenas dados de visualização (não sobrescreve originais)
        centrosDados = dadosFiltrados;
        
        // Re-renderizar visualização ativa
        const viewAtiva = $('.tab-button.active').data('view');
        alterarVisualizacao(viewAtiva);
        
        atualizarKPIs();
    }

    // ✅ Função utilitária para limpar todos os filtros
    function limparFiltros() {
        $('#pesquisa-centro').val('');
        $('#filtro-empresa').val('');
        $('#filtro-tipologia').val('');
        $('#filtro-categoria').val('');
        $('#filtro-status').val('');
        aplicarFiltros();
    }

    // ✅ Expor função globalmente para acesso externo
    window.limparFiltrosCentroCusto = limparFiltros;

    // ✅ Função para adicionar contador de caracteres
    function adicionarContadorCaracteres() {
        const textarea = $('#descricao');
        const maxLength = textarea.attr('maxlength') || 500;
        
        // Remover contador anterior se existir
        textarea.siblings('.char-counter').remove();
        
        // Criar contador
        const counter = $(`<div class="char-counter">0/${maxLength}</div>`);
        textarea.after(counter);
        
        // Atualizar contador
        function atualizarContador() {
            const length = textarea.val().length;
            counter.text(`${length}/${maxLength}`);
            
            // Mudar cor quando próximo do limite
            if (length > maxLength * 0.9) {
                counter.css('color', 'var(--selleta-error)');
            } else if (length > maxLength * 0.8) {
                counter.css('color', 'var(--selleta-warning)');
            } else {
                counter.css('color', 'var(--selleta-gray-500)');
            }
        }
        
        // Eventos
        textarea.on('input keyup', atualizarContador);
        atualizarContador(); // Inicial
    }

    function atualizarKPIs() {
        const stats = {
            nativos: centrosDados.filter(c => c.categoria === 'nativo').length,
            dependentes: centrosDados.filter(c => c.categoria === 'dependente').length,
            genericos: centrosDados.filter(c => c.categoria === 'genérico').length,
            total: centrosDados.length
        };
        
        $('#kpi-nativos').text(stats.nativos);
        $('#kpi-dependentes').text(stats.dependentes);
        $('#kpi-genericos').text(stats.genericos);
        $('#kpi-total').text(stats.total);
    }

    // ========================================
    // MODAL E CRUD
    // ========================================

    function abrirModalNovo() {
        $('#modal-title').text('Novo Centro de Custo');
        $('#form-centro')[0].reset();
        $('#centro_id').val('');
        $('#centro_custo_original').val('');
        $('#modal-centro').fadeIn(300);
        
        // Configurar campo original para sincronizar com máscara
        $('#mascara_cc').on('input', function() {
            if (!$('#centro_custo_original').val()) {
                $('#centro_custo_original').val($(this).val());
            }
        });
        
        // ✅ Adicionar contador de caracteres para textarea
        adicionarContadorCaracteres();
    }

    function editarCentro(id) {
        // ✅ Buscar sempre no dataset original completo
        const centro = centrosOriginais.find(c => c.id === id);
        if (!centro) return;
        
        $('#modal-title').text('Editar Centro de Custo');
        $('#centro_id').val(centro.id);
        $('#mascara_cc').val(centro.mascara_cc);
        $('#centro_custo_original').val(centro.centro_custo_original);
        $('#empresa_id').val(centro.empresa_id);
        $('#tipologia').val(centro.tipologia);
        $('#categoria').val(centro.categoria);
        $('#descricao').val(centro.descricao || '');
        $('#ativo').val(centro.ativo);
        
        $('#modal-centro').fadeIn(300);
    }

    function salvarCentro(e) {
        e.preventDefault();
        
        const id = $('#centro_id').val();
        const dados = {
            mascara_cc: $('#mascara_cc').val(),
            centro_custo_original: $('#centro_custo_original').val() || $('#mascara_cc').val(),
            empresa_id: parseInt($('#empresa_id').val()),
            tipologia: $('#tipologia').val(),
            categoria: $('#categoria').val(),
            descricao: $('#descricao').val(),
            ativo: parseInt($('#ativo').val())
        };
        
        const url = id ? `/api/centros_custo/${id}` : '/api/centros_custo';
        const method = id ? 'PUT' : 'POST';
        
        $.ajax({
            url: url,
            method: method,
            data: JSON.stringify(dados),
            contentType: 'application/json',
            success: function() {
                mostrarNotificacao(id ? 'Centro de custo atualizado!' : 'Centro de custo criado!', 'success');
                fecharModal();
                carregarCentrosCusto();
            },
            error: function(xhr) {
                const erro = xhr.responseJSON?.error || 'Erro ao salvar centro de custo';
                mostrarNotificacao(erro, 'error');
            }
        });
    }

    function fecharModal() {
        $('.modal').fadeOut(300);
    }

    // ========================================
    // RELATÓRIOS
    // ========================================

    function abrirModalRelatorios() {
        $('#modal-relatorios').fadeIn(300);
    }

    function exportarRelatorio(tipo) {
        mostrarNotificacao('Gerando relatório...', 'info');
        
        // Simular geração de relatório
        setTimeout(() => {
            const nomeArquivo = gerarNomeRelatorio(tipo);
            mostrarNotificacao(`Relatório "${nomeArquivo}" exportado com sucesso!`, 'success');
        }, 1500);
    }

    function gerarNomeRelatorio(tipo) {
        const data = new Date().toISOString().split('T')[0];
        const nomes = {
            complete: `Centros_Custo_Completo_${data}.xlsx`,
            category: `Centros_Custo_Por_Categoria_${data}.xlsx`,
            company: `Centros_Custo_Por_Empresa_${data}.xlsx`,
            relationships: `Mapa_Relacionamentos_${data}.xlsx`,
            typology: `Centros_Custo_Por_Tipologia_${data}.xlsx`,
            masks: `Comparativo_Mascaras_${data}.xlsx`
        };
        return nomes[tipo] || `Relatorio_${data}.xlsx`;
    }

    function relatorioIndividual(id) {
        // ✅ Buscar sempre no dataset original completo
        const centro = centrosOriginais.find(c => c.id === id);
        if (!centro) return;
        
        mostrarNotificacao(`Gerando relatório individual para "${centro.mascara_cc}"...`, 'info');
        
        setTimeout(() => {
            const nomeArquivo = `Centro_Custo_${centro.mascara_cc.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;
            mostrarNotificacao(`Relatório "${nomeArquivo}" exportado!`, 'success');
        }, 1000);
    }

    // ========================================
    // UTILITÁRIOS
    // ========================================

    function preencherSelectEmpresas() {
        const select = $('#empresa_id');
        select.find('option:not(:first)').remove();
        
        empresasDados.forEach(empresa => {
            select.append(`<option value="${empresa.id}">${empresa.codigo} - ${empresa.nome}</option>`);
        });
    }

    function preencherFiltroEmpresas() {
        const select = $('#filtro-empresa');
        select.find('option:not(:first)').remove();
        
        empresasDados.forEach(empresa => {
            select.append(`<option value="${empresa.codigo}">${empresa.codigo} - ${empresa.nome}</option>`);
        });
    }

    function mostrarLoading() {
        $('#loading').show();
        $('#centros-lista, #centros-tabela, #view-stats').hide();
    }

    function ocultarLoading() {
        $('#loading').hide();
        $('#centros-lista, #centros-tabela, #view-stats').show();
    }

    function mostrarEstadoVazio() {
        $('#empty-state').show();
        $('#centros-lista').hide();
    }

    function mostrarNotificacao(mensagem, tipo) {
        // Implementação simples de notificação
        const classe = {
            'success': 'alert-success',
            'error': 'alert-danger',
            'info': 'alert-info',
            'warning': 'alert-warning'
        }[tipo] || 'alert-info';
        
        const notification = $(`
            <div class="alert ${classe}" style="position: fixed; top: 20px; right: 20px; z-index: 9999; min-width: 300px;">
                ${mensagem}
                <button type="button" class="close" style="float: right; border: none; background: none; font-size: 18px;">&times;</button>
            </div>
        `);
        
        $('body').append(notification);
        
        notification.find('.close').click(function() {
            notification.fadeOut(300, function() {
                notification.remove();
            });
        });
        
        setTimeout(() => {
            notification.fadeOut(300, function() {
                notification.remove();
            });
        }, 5000);
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
    
    // ========================================
    // FUNÇÕES GLOBAIS (chamadas pelos cards)
    // ========================================
    
    window.editarCentro = editarCentro;
    window.relatorioIndividual = relatorioIndividual;
});