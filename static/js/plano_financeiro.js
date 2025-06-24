// Gestão de Plano Financeiro
let planosData = [];
let planoSelecionado = null;
let modoEdicao = false;

$(document).ready(function() {
    carregarPlanos();
    configurarEventos();
});

function configurarEventos() {
    // Busca
    $('#busca_plano').on('input', function() {
        const termo = $(this).val().toLowerCase();
        filtrarPlanos(termo);
    });

    // Botões
    $('#btn_novo').click(novoPlano);
    $('#btn_cancelar').click(cancelarEdicao);
    $('#form_plano').submit(salvarPlano);

    // Atualizar tipo quando mudar status
    $('#status').change(function() {
        if (planoSelecionado && !modoEdicao) {
            atualizarPlano(planoSelecionado.id, {
                ativo: $(this).val() === '1'
            });
        }
    });
}

function carregarPlanos() {
    $.ajax({
        url: '/api/planos_financeiros',
        method: 'GET',
        success: function(planos) {
            planosData = planos;
            renderizarArvore();
        },
        error: function(xhr) {
            alert('Erro ao carregar planos: ' + xhr.responseJSON.error);
        }
    });
}

function renderizarArvore() {
    const arvoreContainer = $('#arvore_planos');
    arvoreContainer.empty();
    
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
}

function criarNodePlano(plano, planosPorPai) {
    const temFilhos = planosPorPai[plano.id] && planosPorPai[plano.id].length > 0;
    const tipoClass = plano.tipo === 'Receita' ? 'tipo_receita' : 
                     plano.tipo === 'Despesa' ? 'tipo_despesa' : '';
    
    const node = $(`
        <div class="plano_item" data-id="${plano.id}">
            <div class="plano_header ${!plano.ativo ? 'inativo' : ''}">
                <span class="toggle_icon">${temFilhos ? '▶' : '&nbsp;'}</span>
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
    const filhos = toggleIcon.closest('.plano_item').find('> .plano_filhos');
    if (filhos.hasClass('expandido')) {
        filhos.removeClass('expandido');
        toggleIcon.text('▶');
    } else {
        filhos.addClass('expandido');
        toggleIcon.text('▼');
    }
}

function selecionarPlano(plano) {
    planoSelecionado = plano;
    modoEdicao = false;
    
    // Atualizar visual
    $('.plano_header').removeClass('selecionado');
    $(`.plano_item[data-id="${plano.id}"] > .plano_header`).addClass('selecionado');
    
    // Mostrar formulário
    $('#sem_selecao').hide();
    $('#formulario_plano').show();
    
    // Preencher formulário
    $('#plano_id').val(plano.id);
    $('#plano_pai_id').val(plano.plano_pai_id || '');
    $('#codigo').val(plano.codigo);
    $('#nome').val(plano.nome).prop('readonly', true);
    $('#nivel').val(`Nível ${plano.nivel}`);
    $('#tipo').val(plano.tipo);
    $('#status').val(plano.ativo ? '1' : '0');
    
    // Atualizar breadcrumb
    atualizarCaminho(plano);
    
    // Configurar botões
    $('#btn_novo').show();
    $('#btn_salvar').hide();
    $('#btn_cancelar').hide();
}

function atualizarCaminho(plano) {
    const caminho = [];
    let planoAtual = plano;
    
    while (planoAtual) {
        caminho.unshift(`${planoAtual.codigo} - ${planoAtual.nome}`);
        planoAtual = planosData.find(p => p.id === planoAtual.plano_pai_id);
    }
    
    $('#caminho_plano').text(caminho.join(' > '));
}

function novoPlano() {
    modoEdicao = true;
    
    const paiId = planoSelecionado ? planoSelecionado.id : null;
    const nivel = planoSelecionado ? planoSelecionado.nivel + 1 : 1;
    
    if (nivel > 4) {
        alert('Não é possível criar planos além do nível 4');
        return;
    }
    
    // Limpar formulário
    $('#plano_id').val('');
    $('#plano_pai_id').val(paiId || '');
    $('#codigo').val('(Será gerado automaticamente)');
    $('#nome').val('').prop('readonly', false).focus();
    $('#nivel').val(`Nível ${nivel}`);
    
    if (planoSelecionado) {
        $('#tipo').val(planoSelecionado.tipo);
        atualizarCaminho(planoSelecionado);
        $('#caminho_plano').append(' > Novo Plano');
    } else {
        $('#tipo').val('Ambos').prop('disabled', false);
        $('#caminho_plano').text('Novo Plano de Nível 1');
    }
    
    $('#status').val('1').prop('disabled', true);
    
    // Configurar botões
    $('#btn_novo').hide();
    $('#btn_salvar').show();
    $('#btn_cancelar').show();
}

function cancelarEdicao() {
    if (planoSelecionado) {
        selecionarPlano(planoSelecionado);
    } else {
        $('#formulario_plano').hide();
        $('#sem_selecao').show();
    }
}

function salvarPlano(e) {
    e.preventDefault();
    
    const dados = {
        nome: $('#nome').val(),
        plano_pai_id: $('#plano_pai_id').val() || null
    };
    
    if (!planoSelecionado) {
        dados.tipo = $('#tipo').val();
    }
    
    $.ajax({
        url: '/api/planos_financeiros',
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify(dados),
        success: function(novoPlano) {
            alert('Plano criado com sucesso!');
            carregarPlanos();
            
            // Selecionar o novo plano após recarregar
            setTimeout(() => {
                const plano = planosData.find(p => p.id === novoPlano.id);
                if (plano) selecionarPlano(plano);
            }, 100);
        },
        error: function(xhr) {
            alert('Erro ao criar plano: ' + xhr.responseJSON.error);
        }
    });
}

function atualizarPlano(id, dados) {
    $.ajax({
        url: `/api/planos_financeiros/${id}`,
        method: 'PUT',
        contentType: 'application/json',
        data: JSON.stringify(dados),
        success: function() {
            carregarPlanos();
        },
        error: function(xhr) {
            alert('Erro ao atualizar plano: ' + xhr.responseJSON.error);
            // Reverter mudança visual
            if (planoSelecionado) {
                $('#status').val(planoSelecionado.ativo ? '1' : '0');
            }
        }
    });
}

function filtrarPlanos(termo) {
    if (!termo) {
        $('.plano_item').show();
        return;
    }
    
    $('.plano_item').each(function() {
        const item = $(this);
        const codigo = item.find('.plano_codigo').text().toLowerCase();
        const nome = item.find('.plano_nome').text().toLowerCase();
        
        if (codigo.includes(termo) || nome.includes(termo)) {
            item.show();
            // Mostrar pais também
            let parent = item.parent('.plano_filhos');
            while (parent.length) {
                parent.addClass('expandido');
                parent.siblings('.plano_header').find('.toggle_icon').text('▼');
                parent = parent.closest('.plano_item').parent('.plano_filhos');
            }
        } else {
            item.hide();
        }
    });
}