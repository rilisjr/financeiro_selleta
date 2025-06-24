// Gestão de Plano Financeiro - Nova versão com identidade visual atualizada
let planosData = [];
let planoSelecionado = null;
let modoEdicao = false;

$(document).ready(function() {
    initializePlanoFinanceiro();
    carregarPlanos();
    configurarEventos();
});

function initializePlanoFinanceiro() {
    // Aplicar efeitos visuais iniciais
    $('.tree-panel, .form-panel').css({
        'opacity': '0',
        'transform': 'translateY(20px)'
    });
    
    setTimeout(() => {
        $('.tree-panel, .form-panel').css({
            'opacity': '1',
            'transform': 'translateY(0)',
            'transition': 'all 0.6s ease-out'
        });
    }, 100);
    
    // Configurar sidebar
    $('.nav-section-title').off('click').on('click', function() {
        const section = $(this).closest('.nav-section');
        section.toggleClass('open');
        
        const subsection = section.find('.nav-subsection');
        subsection.slideToggle(300);
    });
}

function configurarEventos() {
    // Busca com debounce
    let searchTimeout;
    $('#busca_plano').on('input', function() {
        clearTimeout(searchTimeout);
        const termo = $(this).val().toLowerCase();
        
        searchTimeout = setTimeout(() => {
            filtrarPlanos(termo);
        }, 300);
    });

    // Botões principais
    $('#btn_novo_principal, #btn_novo_empty').click(novoPlanoRaiz);
    $('#btn_novo').click(novoPlanoFilho);
    $('#btn_cancelar').click(cancelarEdicao);
    $('#form_plano').submit(salvarPlano);
    $('#btn_expandir_todos').click(expandirTodos);

    // Mudança de status em tempo real
    $('#status').change(function() {
        if (planoSelecionado && !modoEdicao) {
            atualizarPlano(planoSelecionado.id, {
                ativo: $(this).val() === '1'
            });
        }
    });

    // Prevenção de navegação para itens "Em breve"
    $('.nav-item').click(function(e) {
        const badge = $(this).find('.badge.warning');
        if (badge.length > 0) {
            e.preventDefault();
            showComingSoonNotification($(this).find('span').first().text());
        }
    });
}

function carregarPlanos() {
    // Mostrar estado de carregamento
    $('.tree-container').html(`
        <div class="loading-state">
            <i class="fas fa-spinner fa-spin"></i>
            <p>Carregando planos financeiros...</p>
        </div>
    `);

    $.ajax({
        url: '/api/planos_financeiros',
        method: 'GET',
        success: function(planos) {
            planosData = planos;
            renderizarArvore();
            showSuccessNotification('Planos carregados com sucesso!');
        },
        error: function(xhr) {
            console.error('Erro ao carregar planos:', xhr);
            $('.tree-container').html(`
                <div class="loading-state">
                    <i class="fas fa-exclamation-triangle" style="color: var(--selleta-error);"></i>
                    <p>Erro ao carregar planos: ${xhr.responseJSON?.error || 'Erro desconhecido'}</p>
                    <button onclick="carregarPlanos()" class="btn btn-primary" style="margin-top: 15px;">
                        <i class="fas fa-redo"></i> Tentar Novamente
                    </button>
                </div>
            `);
        }
    });
}

function renderizarArvore() {
    const arvoreContainer = $('#arvore_planos');
    arvoreContainer.empty();
    
    if (planosData.length === 0) {
        arvoreContainer.html(`
            <div class="empty-state" style="height: 200px;">
                <div class="empty-icon">
                    <i class="fas fa-sitemap"></i>
                </div>
                <h4>Nenhum plano financeiro</h4>
                <p>Comece criando seu primeiro plano financeiro</p>
                <button onclick="novoPlanoRaiz()" class="btn btn-primary">
                    <i class="fas fa-plus"></i> Criar Primeiro Plano
                </button>
            </div>
        `);
        return;
    }
    
    // Organizar planos por hierarquia
    const planosPorPai = {};
    planosData.forEach(plano => {
        const paiId = plano.plano_pai_id || 0;
        if (!planosPorPai[paiId]) {
            planosPorPai[paiId] = [];
        }
        planosPorPai[paiId].push(plano);
    });
    
    // Renderizar recursivamente começando pelo nível 1
    const planosNivel1 = planosPorPai[0] || [];
    planosNivel1.forEach(plano => {
        arvoreContainer.append(criarNodePlano(plano, planosPorPai));
    });
    
    // Expandir apenas níveis 1 e 2 por padrão (clean/limpo)
    setTimeout(() => {
        // Expandir nível 1 (sempre visível)
        $('.plano_item[data-nivel="1"] .toggle_icon').each(function() {
            if ($(this).text() === '▶') {
                toggleExpansao($(this));
            }
        });
        
        // Manter níveis 3 e 4 recolhidos para experiência clean
        $('.plano_item[data-nivel="3"], .plano_item[data-nivel="4"]').hide();
        $('.plano_item[data-nivel="2"] .toggle_icon').text('▶');
        $('.plano_item[data-nivel="2"] .plano_filhos').removeClass('expandido');
    }, 300);
}

function criarNodePlano(plano, planosPorPai) {
    const temFilhos = planosPorPai[plano.id] && planosPorPai[plano.id].length > 0;
    const tipoClass = plano.tipo === 'Receita' ? 'tipo_receita' : 
                     plano.tipo === 'Despesa' ? 'tipo_despesa' : 'tipo_ambos';
    
    const node = $(`
        <div class="plano_item" data-id="${plano.id}" data-nivel="${plano.nivel}">
            <div class="plano_header ${!plano.ativo ? 'inativo' : ''}">
                <span class="toggle_icon">${temFilhos ? '▶' : ''}</span>
                <span class="plano_codigo">${plano.codigo}</span>
                <span class="plano_nome">${plano.nome}</span>
                <span class="tipo_badge ${tipoClass}">${plano.tipo}</span>
            </div>
            ${temFilhos ? '<div class="plano_filhos"></div>' : ''}
        </div>
    `);
    
    // Eventos
    node.find('.plano_header').click(function(e) {
        e.stopPropagation();
        selecionarPlano(plano);
    });
    
    if (temFilhos) {
        node.find('.toggle_icon').click(function(e) {
            e.stopPropagation();
            toggleExpansao($(this));
        });
        
        // Adicionar filhos
        const filhosContainer = node.find('.plano_filhos');
        planosPorPai[plano.id].forEach(filho => {
            filhosContainer.append(criarNodePlano(filho, planosPorPai));
        });
    }
    
    return node;
}

function toggleExpansao(toggleIcon) {
    const planoItem = toggleIcon.closest('.plano_item');
    const filhos = planoItem.find('> .plano_filhos');
    const nivel = parseInt(planoItem.attr('data-nivel'));
    
    if (filhos.hasClass('expandido')) {
        // Recolher: experiência clean
        filhos.removeClass('expandido').slideUp(300, () => {
            // Ocultar níveis mais profundos para manter limpo
            if (nivel <= 2) {
                filhos.find('.plano_item').hide();
            }
        });
        toggleIcon.text('▶');
    } else {
        // Expandir: experiência dinâmica
        filhos.addClass('expandido');
        
        // Mostrar filhos com animação progressiva
        const filhosItems = filhos.find('> .plano_item');
        filhosItems.each(function(index) {
            const item = $(this);
            setTimeout(() => {
                item.fadeIn(200);
            }, index * 50); // Animação escalonada para dinamismo
        });
        
        filhos.slideDown(300);
        toggleIcon.text('▼');
    }
}

function expandirTodos() {
    // Expandir todos de forma progressiva para dinamismo
    const niveis = [1, 2, 3, 4];
    
    niveis.forEach((nivel, index) => {
        setTimeout(() => {
            $(`.plano_item[data-nivel="${nivel}"] .plano_filhos`).each(function() {
                const container = $(this);
                container.addClass('expandido').slideDown(300);
                
                // Mostrar itens filhos com animação escalonada
                container.find('.plano_item').each(function(itemIndex) {
                    const item = $(this);
                    setTimeout(() => {
                        item.fadeIn(150);
                    }, itemIndex * 30);
                });
            });
            
            $(`.plano_item[data-nivel="${nivel}"] .toggle_icon`).text('▼');
            
            // Feedback final
            if (nivel === 4) {
                setTimeout(() => {
                    showInfoNotification('Todos os níveis expandidos - Experiência completa ativada');
                }, 300);
            }
        }, index * 200); // Expansão progressiva por nível
    });
}

function selecionarPlano(plano) {
    planoSelecionado = plano;
    modoEdicao = false;
    
    // Atualizar visual da seleção
    $('.plano_header').removeClass('selecionado');
    $(`.plano_item[data-id="${plano.id}"] > .plano_header`).addClass('selecionado');
    
    // Mostrar formulário com animação
    $('#sem_selecao').fadeOut(200, () => {
        preencherFormulario(plano);
        $('#formulario_plano').fadeIn(300);
    });
    
    // Scroll suave para o item selecionado
    const selectedItem = $(`.plano_item[data-id="${plano.id}"]`);
    selectedItem[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function preencherFormulario(plano) {
    // Preencher campos
    $('#plano_id').val(plano.id);
    $('#plano_pai_id').val(plano.plano_pai_id || '');
    $('#codigo').val(plano.codigo);
    $('#nome').val(plano.nome).prop('readonly', true);
    $('#nivel').val(`Nível ${plano.nivel}`);
    $('#tipo').val(plano.tipo).prop('disabled', true);
    $('#status').val(plano.ativo ? '1' : '0');
    
    // Atualizar breadcrumb com animação
    atualizarCaminho(plano);
    
    // Configurar botões
    $('#btn_novo').show();
    $('#btn_salvar').hide();
    $('#btn_cancelar').hide();
    
    // Habilitar criação de filhos apenas se não for nível 4
    if (plano.nivel >= 4) {
        $('#btn_novo').prop('disabled', true).attr('title', 'Nível máximo atingido');
    } else {
        $('#btn_novo').prop('disabled', false).removeAttr('title');
    }
}

function atualizarCaminho(plano) {
    const caminho = [];
    let planoAtual = plano;
    
    while (planoAtual) {
        caminho.unshift(`${planoAtual.codigo} - ${planoAtual.nome}`);
        planoAtual = planosData.find(p => p.id === planoAtual.plano_pai_id);
    }
    
    const caminhoElement = $('#caminho_plano');
    caminhoElement.fadeOut(200, () => {
        caminhoElement.html(`
            <i class="fas fa-sitemap"></i>
            ${caminho.join(' <i class="fas fa-chevron-right" style="margin: 0 8px; opacity: 0.5;"></i> ')}
        `).fadeIn(300);
    });
}

function novoPlanoRaiz() {
    iniciarModoEdicao(null, 1);
}

function novoPlanoFilho() {
    if (!planoSelecionado) {
        showErrorNotification('Selecione um plano pai primeiro');
        return;
    }
    
    const novoNivel = planoSelecionado.nivel + 1;
    if (novoNivel > 4) {
        showErrorNotification('Não é possível criar planos além do nível 4');
        return;
    }
    
    iniciarModoEdicao(planoSelecionado, novoNivel);
}

function iniciarModoEdicao(planoPai, nivel) {
    modoEdicao = true;
    
    // Mostrar formulário se estiver oculto
    if ($('#formulario_plano').is(':hidden')) {
        $('#sem_selecao').fadeOut(200, () => {
            $('#formulario_plano').fadeIn(300);
        });
    }
    
    // Limpar e configurar formulário
    $('#plano_id').val('');
    $('#plano_pai_id').val(planoPai ? planoPai.id : '');
    $('#codigo').val('(Gerado automaticamente)');
    $('#nome').val('').prop('readonly', false).focus();
    $('#nivel').val(`Nível ${nivel}`);
    $('#status').val('1').prop('disabled', true);
    
    // Configurar tipo
    if (planoPai) {
        $('#tipo').val(planoPai.tipo).prop('disabled', true);
        atualizarCaminhoNovo(planoPai);
    } else {
        $('#tipo').val('Ambos').prop('disabled', false);
        $('#caminho_plano').html(`
            <i class="fas fa-plus"></i>
            Novo Plano de Nível 1
        `);
    }
    
    // Configurar botões
    $('#btn_novo').hide();
    $('#btn_salvar').show();
    $('#btn_cancelar').show();
}

function atualizarCaminhoNovo(planoPai) {
    const caminho = [];
    let planoAtual = planoPai;
    
    while (planoAtual) {
        caminho.unshift(`${planoAtual.codigo} - ${planoAtual.nome}`);
        planoAtual = planosData.find(p => p.id === planoAtual.plano_pai_id);
    }
    
    $('#caminho_plano').html(`
        <i class="fas fa-plus"></i>
        ${caminho.join(' <i class="fas fa-chevron-right" style="margin: 0 8px; opacity: 0.5;"></i> ')}
        <i class="fas fa-chevron-right" style="margin: 0 8px; opacity: 0.5;"></i>
        <strong>Novo Plano</strong>
    `);
}

function cancelarEdicao() {
    modoEdicao = false;
    
    if (planoSelecionado) {
        selecionarPlano(planoSelecionado);
    } else {
        $('#formulario_plano').fadeOut(300, () => {
            $('#sem_selecao').fadeIn(200);
        });
    }
}

function salvarPlano(e) {
    e.preventDefault();
    
    const nome = $('#nome').val().trim();
    if (!nome) {
        showErrorNotification('Nome do plano é obrigatório');
        $('#nome').focus();
        return;
    }
    
    const dados = {
        nome: nome,
        plano_pai_id: $('#plano_pai_id').val() || null
    };
    
    if (!planoSelecionado) {
        dados.tipo = $('#tipo').val();
    }
    
    // Desabilitar botão durante salvamento
    const btnSalvar = $('#btn_salvar');
    const textoOriginal = btnSalvar.html();
    btnSalvar.prop('disabled', true).html('<i class="fas fa-spinner fa-spin"></i> Salvando...');
    
    $.ajax({
        url: '/api/planos_financeiros',
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify(dados),
        success: function(novoPlano) {
            showSuccessNotification('Plano criado com sucesso!');
            carregarPlanos();
            
            // Selecionar o novo plano após recarregar
            setTimeout(() => {
                const plano = planosData.find(p => p.id === novoPlano.id);
                if (plano) {
                    selecionarPlano(plano);
                    // Expandir até o novo plano
                    expandirAteNivel(plano);
                }
            }, 500);
        },
        error: function(xhr) {
            showErrorNotification('Erro ao criar plano: ' + (xhr.responseJSON?.error || 'Erro desconhecido'));
        },
        complete: function() {
            btnSalvar.prop('disabled', false).html(textoOriginal);
        }
    });
}

function expandirAteNivel(plano) {
    // Expandir todos os níveis até chegar ao plano
    let planoAtual = plano;
    const planosParaExpandir = [];
    
    while (planoAtual && planoAtual.plano_pai_id) {
        const planoPai = planosData.find(p => p.id === planoAtual.plano_pai_id);
        if (planoPai) {
            planosParaExpandir.unshift(planoPai);
            planoAtual = planoPai;
        } else {
            break;
        }
    }
    
    planosParaExpandir.forEach((plano, index) => {
        setTimeout(() => {
            const toggleIcon = $(`.plano_item[data-id="${plano.id}"] .toggle_icon`);
            if (toggleIcon.text() === '▶') {
                toggleIcon.click();
            }
        }, index * 100);
    });
}

function atualizarPlano(id, dados) {
    $.ajax({
        url: `/api/planos_financeiros/${id}`,
        method: 'PUT',
        contentType: 'application/json',
        data: JSON.stringify(dados),
        success: function() {
            showSuccessNotification('Plano atualizado com sucesso!');
            carregarPlanos();
        },
        error: function(xhr) {
            showErrorNotification('Erro ao atualizar plano: ' + (xhr.responseJSON?.error || 'Erro desconhecido'));
            // Reverter mudança visual
            if (planoSelecionado) {
                $('#status').val(planoSelecionado.ativo ? '1' : '0');
            }
        }
    });
}

function filtrarPlanos(termo) {
    if (!termo) {
        // Restaurar estado clean inicial
        $('.plano_item').show();
        $('.plano_item[data-nivel="3"], .plano_item[data-nivel="4"]').hide();
        $('.plano_item[data-nivel="2"] .plano_filhos').removeClass('expandido');
        $('.plano_item[data-nivel="2"] .toggle_icon').text('▶');
        return;
    }
    
    let encontrados = 0;
    $('.plano_item').each(function() {
        const item = $(this);
        const codigo = item.find('.plano_codigo').text().toLowerCase();
        const nome = item.find('.plano_nome').text().toLowerCase();
        
        if (codigo.includes(termo) || nome.includes(termo)) {
            item.show();
            encontrados++;
            
            // Expandir dinamicamente até o resultado encontrado
            let parent = item.parent('.plano_filhos');
            while (parent.length) {
                parent.addClass('expandido').show();
                const parentItem = parent.closest('.plano_item');
                parentItem.show();
                parentItem.find('> .plano_header .toggle_icon').text('▼');
                parent = parentItem.parent('.plano_filhos');
            }
        } else {
            item.hide();
        }
    });
    
    // Feedback da busca com dinamismo
    if (termo && encontrados === 0) {
        showInfoNotification(`Nenhum resultado encontrado para "${termo}"`);
    } else if (termo && encontrados > 0) {
        showInfoNotification(`${encontrados} plano(s) encontrado(s) - Navegação expandida`);
    }
}

// Funções de notificação
function showSuccessNotification(message) {
    showNotification(message, 'success', 'fa-check-circle');
}

function showErrorNotification(message) {
    showNotification(message, 'error', 'fa-exclamation-triangle');
}

function showInfoNotification(message) {
    showNotification(message, 'info', 'fa-info-circle');
}

function showComingSoonNotification(featureName) {
    showNotification(`${featureName} - Em desenvolvimento`, 'warning', 'fa-wrench');
}

function showNotification(message, type, icon) {
    const colors = {
        success: 'var(--selleta-success)',
        error: 'var(--selleta-error)',
        info: 'var(--selleta-info)',
        warning: 'var(--selleta-warning)'
    };
    
    const notification = $(`
        <div class="notification notification-${type}" style="
            position: fixed;
            top: 90px;
            right: 20px;
            background: white;
            padding: 15px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            border-left: 4px solid ${colors[type]};
            z-index: 10000;
            max-width: 350px;
            animation: slideInRight 0.3s ease-out;
        ">
            <div style="display: flex; align-items: center; gap: 10px;">
                <i class="fas ${icon}" style="color: ${colors[type]};"></i>
                <span style="flex: 1;">${message}</span>
                <i class="fas fa-times" style="cursor: pointer; opacity: 0.5;" onclick="$(this).closest('.notification').remove()"></i>
            </div>
        </div>
    `);
    
    $('body').append(notification);
    
    setTimeout(() => {
        notification.fadeOut(300, () => notification.remove());
    }, 4000);
}

// CSS para animação
$('<style>')
    .prop('type', 'text/css')
    .html(`
        @keyframes slideInRight {
            from {
                opacity: 0;
                transform: translateX(100%);
            }
            to {
                opacity: 1;
                transform: translateX(0);
            }
        }
    `)
    .appendTo('head');