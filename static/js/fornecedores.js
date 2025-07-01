// Variáveis globais
let fornecedores = [];
let fornecedoresFiltrados = [];
let paginaAtual = 1;
let itensPorPagina = 12;
let visualizacaoAtual = 'table'; // 'cards' ou 'table' - Padrão alterado para tabela

// Carregar dados ao inicializar
document.addEventListener('DOMContentLoaded', function() {
    carregarFornecedores();
    configurarEventListeners();
});

function configurarEventListeners() {
    // Eventos de filtro
    document.getElementById('searchInput').addEventListener('input', aplicarFiltros);
    document.getElementById('metodoFilter').addEventListener('change', aplicarFiltros);
    document.getElementById('tipoFilter').addEventListener('change', aplicarFiltros);
    document.getElementById('flagFilter').addEventListener('change', aplicarFiltros);
    
    // Configurar modal
    document.getElementById('modal-fornecedor').addEventListener('click', function(e) {
        if (e.target === this || e.target.classList.contains('modal-close')) {
            fecharModal();
        }
    });
    
    // Configurar botão de cancelar
    document.getElementById('btn-cancelar').addEventListener('click', fecharModal);
    
    // Configurar formulário
    document.getElementById('form-fornecedor').addEventListener('submit', function(e) {
        e.preventDefault();
        salvarFornecedor();
    });
    
    // Configurar botões de view
    document.getElementById('view-table-btn').addEventListener('click', () => setView('table'));
    document.getElementById('view-cards-btn').addEventListener('click', () => setView('cards'));
    
    // Configurar botão de relatórios
    const btnRelatorios = document.getElementById('btn-relatorios-fornecedores');
    if (btnRelatorios) {
        btnRelatorios.addEventListener('click', () => {
            mostrarAlerta('Relatórios em desenvolvimento...', 'info');
        });
    }
    
    // Configurar view inicial como tabela
    setView('table');
}

async function carregarFornecedores() {
    try {
        const response = await fetch('/api/fornecedores');
        if (!response.ok) throw new Error('Erro ao carregar fornecedores');
        
        fornecedores = await response.json();
        // Ordenar por valor total (maior para menor) - Requisito do usuário
        fornecedores.sort((a, b) => (b.valor_total_movimentado || 0) - (a.valor_total_movimentado || 0));
        fornecedoresFiltrados = [...fornecedores];
        
        atualizarKPIs();
        renderizarFornecedores();
        
    } catch (error) {
        console.error('Erro ao carregar fornecedores:', error);
        mostrarAlerta('Erro ao carregar fornecedores', 'danger');
    }
}

function atualizarKPIs() {
    const total = fornecedores.length;
    const sistemaOriginal = fornecedores.filter(f => f.metodo_deteccao === 'exato' || f.metodo_deteccao === 'palavras_chave' || f.metodo_deteccao === 'fuzzy_nome' || f.metodo_deteccao === 'cpf_cnpj').length;
    const forcadas = fornecedores.filter(f => f.deteccao_forcada).length;
    const corrigidas = fornecedores.filter(f => f.deteccao_corrigida).length;
    const genericas = fornecedores.filter(f => f.metodo_deteccao === 'categoria_generica').length;
    const valorTotal = fornecedores.reduce((sum, f) => sum + (f.valor_total_movimentado || 0), 0);
    
    document.getElementById('totalFornecedores').textContent = total.toLocaleString();
    document.getElementById('sistemaOriginal').textContent = sistemaOriginal.toLocaleString();
    document.getElementById('deteccoesForcadas').textContent = forcadas.toLocaleString();
    document.getElementById('deteccoesCorrigidas').textContent = corrigidas.toLocaleString();
    document.getElementById('categoriasGenericas').textContent = genericas.toLocaleString();
    document.getElementById('valorTotal').textContent = formatarMoeda(valorTotal);
}

function aplicarFiltros() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const metodoFilter = document.getElementById('metodoFilter').value;
    const tipoFilter = document.getElementById('tipoFilter').value;
    const flagFilter = document.getElementById('flagFilter').value;
    
    fornecedoresFiltrados = fornecedores.filter(fornecedor => {
        // Filtro de busca
        const matchSearch = !searchTerm || 
            fornecedor.nome.toLowerCase().includes(searchTerm) ||
            (fornecedor.cnpj_cpf && fornecedor.cnpj_cpf.includes(searchTerm)) ||
            (fornecedor.observacoes && fornecedor.observacoes.toLowerCase().includes(searchTerm)) ||
            (fornecedor.nome_original && fornecedor.nome_original.toLowerCase().includes(searchTerm));
        
        // Filtro de método
        const matchMetodo = !metodoFilter || fornecedor.metodo_deteccao === metodoFilter;
        
        // Filtro de tipo
        const matchTipo = !tipoFilter || fornecedor.tipo_fornecedor === tipoFilter;
        
        // Filtro de flags
        let matchFlag = true;
        if (flagFilter === 'forcada') {
            matchFlag = fornecedor.deteccao_forcada;
        } else if (flagFilter === 'corrigida') {
            matchFlag = fornecedor.deteccao_corrigida;
        } else if (flagFilter === 'normal') {
            matchFlag = !fornecedor.deteccao_forcada && !fornecedor.deteccao_corrigida;
        }
        
        return matchSearch && matchMetodo && matchTipo && matchFlag;
    });
    
    // Ordenar resultado filtrado por valor total (maior para menor)
    fornecedoresFiltrados.sort((a, b) => (b.valor_total_movimentado || 0) - (a.valor_total_movimentado || 0));
    
    // Reset página
    paginaAtual = 1;
    
    // Atualizar contador
    document.getElementById('resultCount').textContent = fornecedoresFiltrados.length.toLocaleString();
    
    renderizarFornecedores();
}

function renderizarFornecedores() {
    if (visualizacaoAtual === 'cards') {
        renderizarCards();
    } else {
        renderizarTabela();
    }
    renderizarPaginacao();
}

function renderizarCards() {
    const container = document.getElementById('fornecedoresCards');
    const inicio = (paginaAtual - 1) * itensPorPagina;
    const fim = inicio + itensPorPagina;
    const fornecedoresPagina = fornecedoresFiltrados.slice(inicio, fim);
    
    container.innerHTML = '';
    
    if (fornecedoresPagina.length === 0) {
        document.getElementById('empty-state').style.display = 'block';
        return;
    }
    
    document.getElementById('empty-state').style.display = 'none';
    
    fornecedoresPagina.forEach(fornecedor => {
        const card = criarCardFornecedor(fornecedor);
        container.appendChild(card);
    });
}

function criarCardFornecedor(fornecedor) {
    const card = document.createElement('div');
    card.className = 'fornecedor-card';
    
    // Determinar badge do método
    const badgeClass = getBadgeClass(fornecedor.metodo_deteccao);
    
    card.innerHTML = `
        <div class="fornecedor-header">
            <div class="fornecedor-nome">${truncarTexto(fornecedor.nome, 40)}</div>
            <div class="fornecedor-tipo ${getBadgeTipoClass(fornecedor.tipo_fornecedor)}">${getTipoTexto(fornecedor.tipo_fornecedor)}</div>
        </div>
        
        <div class="fornecedor-cnpj">${formatarDocumento(fornecedor.cnpj_cpf || '')}</div>
        
        <div class="fornecedor-badges">
            ${fornecedor.deteccao_forcada ? '<span class="badge-metodo badge-deteccao-forcada">Detecção Forçada</span>' : ''}
            ${fornecedor.deteccao_corrigida ? '<span class="badge-metodo badge-deteccao-corrigida">Detecção Corrigida</span>' : ''}
            ${fornecedor.metodo_deteccao === 'categoria_generica' ? '<span class="badge-metodo badge-categoria-generica">Categoria Genérica</span>' : ''}
        </div>
        
        <div class="fornecedor-valor">${formatarMoeda(fornecedor.valor_total_movimentado || 0)}</div>
        <div class="fornecedor-transacoes">${(fornecedor.total_transacoes || 0).toLocaleString()} transações realizadas</div>
        
        <div class="fornecedor-actions">
            <button class="btn-action btn-view" onclick="visualizarFornecedor(${fornecedor.id})" title="Visualizar">
                <i class="fas fa-eye"></i>
            </button>
            <button class="btn-action btn-edit" onclick="editarFornecedor(${fornecedor.id})" title="Editar">
                <i class="fas fa-edit"></i>
            </button>
            <button class="btn-action btn-delete" onclick="confirmarExclusao(${fornecedor.id})" title="Excluir">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `;
    
    return card;
}

function renderizarTabela() {
    const tbody = document.getElementById('fornecedoresTableBody');
    const inicio = (paginaAtual - 1) * itensPorPagina;
    const fim = inicio + itensPorPagina;
    const fornecedoresPagina = fornecedoresFiltrados.slice(inicio, fim);
    
    tbody.innerHTML = '';
    
    if (fornecedoresPagina.length === 0) {
        document.getElementById('empty-state').style.display = 'block';
        document.getElementById('view-table').style.display = 'none';
        return;
    }
    
    document.getElementById('empty-state').style.display = 'none';
    document.getElementById('view-table').style.display = 'block';
    
    fornecedoresPagina.forEach(fornecedor => {
        const tr = document.createElement('tr');
        
        const badgeClass = getBadgeClass(fornecedor.metodo_deteccao);
        const similaridadePorcentagem = Math.round((fornecedor.similaridade || 0) * 100);
        const similaridadeClass = similaridadePorcentagem >= 95 ? 'high' : similaridadePorcentagem >= 80 ? 'medium' : 'low';
        
        tr.innerHTML = `
            <td>
                <div style="display: flex; align-items: center; gap: 8px;">
                    <div>
                        <div style="font-weight: 600; margin-bottom: 4px;">${truncarTexto(fornecedor.nome, 40)}</div>
                        <small style="color: var(--selleta-gray-500);">${getTipoTexto(fornecedor.tipo_fornecedor)}</small>
                    </div>
                    <div>
                        ${fornecedor.deteccao_forcada ? '<i class="fas fa-plus-circle flag-icon flag-forcada" title="Detecção Forçada"></i>' : ''}
                        ${fornecedor.deteccao_corrigida ? '<i class="fas fa-wrench flag-icon flag-corrigida" title="Detecção Corrigida"></i>' : ''}
                    </div>
                </div>
            </td>
            <td class="col-cnpj-cpf">${formatarDocumento(fornecedor.cnpj_cpf || '')}</td>
            <td><span class="badge-tipo ${getBadgeTipoClass(fornecedor.tipo_fornecedor)}">${getTipoTexto(fornecedor.tipo_fornecedor)}</span></td>
            <td>
                <div class="valor-container">
                    <div class="valor-principal">${formatarMoeda(fornecedor.valor_total_movimentado || 0)}</div>
                </div>
            </td>
            <td class="text-center">${(fornecedor.total_transacoes || 0).toLocaleString()}</td>
            <td>
                <div class="actions-container">
                    <button class="btn-action btn-view" onclick="visualizarFornecedor(${fornecedor.id})" title="Visualizar">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn-action btn-edit" onclick="editarFornecedor(${fornecedor.id})" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-action btn-delete" onclick="confirmarExclusao(${fornecedor.id})" title="Excluir">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        `;
        
        tbody.appendChild(tr);
    });
}

function renderizarPaginacao() {
    const totalPaginas = Math.ceil(fornecedoresFiltrados.length / itensPorPagina);
    const pagination = document.getElementById('pagination');
    
    pagination.innerHTML = '';
    
    if (totalPaginas <= 1) return;
    
    // Anterior
    if (paginaAtual > 1) {
        pagination.appendChild(criarBotaoPaginacao(paginaAtual - 1, '‹', false));
    }
    
    // Páginas
    for (let i = Math.max(1, paginaAtual - 2); i <= Math.min(totalPaginas, paginaAtual + 2); i++) {
        pagination.appendChild(criarBotaoPaginacao(i, i, i === paginaAtual));
    }
    
    // Próximo
    if (paginaAtual < totalPaginas) {
        pagination.appendChild(criarBotaoPaginacao(paginaAtual + 1, '›', false));
    }
}

function criarBotaoPaginacao(pagina, texto, ativo) {
    const button = document.createElement('button');
    button.className = `page-btn ${ativo ? 'active' : ''}`;
    button.textContent = texto;
    button.disabled = ativo;
    button.onclick = () => {
        if (!ativo) {
            paginaAtual = pagina;
            renderizarFornecedores();
        }
    };
    
    return button;
}

function toggleView() {
    visualizacaoAtual = visualizacaoAtual === 'cards' ? 'table' : 'cards';
    setView(visualizacaoAtual);
}

function setView(viewType) {
    visualizacaoAtual = viewType;
    
    const cardsView = document.getElementById('view-cards');
    const tableView = document.getElementById('view-table');
    const tableBtn = document.getElementById('view-table-btn');
    const cardsBtn = document.getElementById('view-cards-btn');
    
    // Reset classes
    tableBtn.classList.remove('active');
    cardsBtn.classList.remove('active');
    
    // Remove active class from all view-content
    document.querySelectorAll('.view-content').forEach(v => v.classList.remove('active'));
    
    if (visualizacaoAtual === 'cards') {
        cardsView.style.display = 'block';
        cardsView.classList.add('active');
        tableView.style.display = 'none';
        cardsBtn.classList.add('active');
        itensPorPagina = 12;
    } else {
        cardsView.style.display = 'none';
        tableView.style.display = 'block';
        tableView.classList.add('active');
        tableBtn.classList.add('active');
        itensPorPagina = 20;
    }
    
    paginaAtual = 1;
    renderizarFornecedores();
}

function clearFilters() {
    document.getElementById('searchInput').value = '';
    document.getElementById('metodoFilter').value = '';
    document.getElementById('tipoFilter').value = '';
    document.getElementById('flagFilter').value = '';
    aplicarFiltros();
}

async function visualizarFornecedor(id) {
    const fornecedor = fornecedores.find(f => f.id === id);
    if (!fornecedor) return;
    
    preencherFormulario(fornecedor, true);
    document.getElementById('modal-title').innerHTML = 'Visualizar Fornecedor';
    abrirModal();
}

async function editarFornecedor(id) {
    const fornecedor = fornecedores.find(f => f.id === id);
    if (!fornecedor) return;
    
    preencherFormulario(fornecedor, false);
    document.getElementById('modal-title').innerHTML = 'Editar Fornecedor';
    abrirModal();
}

function novoFornecedor() {
    limparFormulario();
    document.getElementById('modal-title').innerHTML = 'Novo Fornecedor';
    document.getElementById('origem').value = 'MANUAL';
    document.getElementById('metodo_deteccao').value = 'manual';
    document.getElementById('similaridade').value = '100';
    abrirModal();
}

function preencherFormulario(fornecedor, readonly = false) {
    document.getElementById('fornecedor_id').value = fornecedor.id || '';
    document.getElementById('nome').value = fornecedor.nome || '';
    document.getElementById('cnpj_cpf').value = fornecedor.cnpj_cpf || '';
    document.getElementById('origem').value = fornecedor.origem || '';
    document.getElementById('tipo_fornecedor').value = fornecedor.tipo_fornecedor || 'empresa';
    document.getElementById('agencia').value = fornecedor.agencia || '';
    document.getElementById('banco').value = fornecedor.banco || '';
    document.getElementById('conta').value = fornecedor.conta || '';
    document.getElementById('chave_pix').value = fornecedor.chave_pix || '';
    document.getElementById('tipo_conta').value = fornecedor.tipo_conta || '';
    document.getElementById('descricao').value = fornecedor.descricao || '';
    document.getElementById('metodo_deteccao').value = fornecedor.metodo_deteccao || '';
    document.getElementById('similaridade').value = (fornecedor.similaridade || 0) * 100;
    document.getElementById('observacoes').value = fornecedor.observacoes || '';
    document.getElementById('valor_total_movimentado').value = fornecedor.valor_total_movimentado || 0;
    document.getElementById('total_transacoes').value = fornecedor.total_transacoes || 0;
    
    // Configurar readonly
    const campos = ['nome', 'cnpj_cpf', 'tipo_fornecedor', 'agencia', 'banco', 'conta', 'chave_pix', 'tipo_conta', 'descricao'];
    campos.forEach(campo => {
        const element = document.getElementById(campo);
        if (element) {
            element.readOnly = readonly;
            if (readonly) {
                element.classList.add('readonly');
            } else {
                element.classList.remove('readonly');
            }
        }
    });
}

function limparFormulario() {
    document.getElementById('form-fornecedor').reset();
    document.getElementById('fornecedor_id').value = '';
    
    // Remover readonly
    const campos = ['nome', 'cnpj_cpf', 'tipo_fornecedor', 'agencia', 'banco', 'conta', 'chave_pix', 'tipo_conta', 'descricao'];
    campos.forEach(campo => {
        const element = document.getElementById(campo);
        if (element) {
            element.readOnly = false;
            element.classList.remove('readonly');
        }
    });
}

function abrirModal() {
    document.getElementById('modal-fornecedor').style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function fecharModal() {
    document.getElementById('modal-fornecedor').style.display = 'none';
    document.body.style.overflow = 'auto';
    limparFormulario();
}

async function salvarFornecedor() {
    const id = document.getElementById('fornecedor_id').value;
    const isEdicao = !!id;
    
    const fornecedor = {
        nome: document.getElementById('nome').value,
        cnpj_cpf: document.getElementById('cnpj_cpf').value,
        origem: document.getElementById('origem').value,
        tipo_fornecedor: document.getElementById('tipo_fornecedor').value,
        agencia: document.getElementById('agencia').value,
        banco: document.getElementById('banco').value,
        conta: document.getElementById('conta').value,
        chave_pix: document.getElementById('chave_pix').value,
        tipo_conta: document.getElementById('tipo_conta').value,
        descricao: document.getElementById('descricao').value,
        metodo_deteccao: document.getElementById('metodo_deteccao').value,
        similaridade: parseFloat(document.getElementById('similaridade').value) / 100,
        ativo: true
    };
    
    if (!fornecedor.nome.trim()) {
        mostrarAlerta('Nome do fornecedor é obrigatório', 'warning');
        return;
    }
    
    try {
        const url = isEdicao ? `/api/fornecedores/${id}` : '/api/fornecedores';
        const method = isEdicao ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(fornecedor)
        });
        
        if (!response.ok) throw new Error('Erro ao salvar fornecedor');
        
        mostrarAlerta(`Fornecedor ${isEdicao ? 'atualizado' : 'criado'} com sucesso!`, 'success');
        fecharModal();
        carregarFornecedores();
        
    } catch (error) {
        console.error('Erro ao salvar fornecedor:', error);
        mostrarAlerta('Erro ao salvar fornecedor', 'error');
    }
}

async function confirmarExclusao(id) {
    const fornecedor = fornecedores.find(f => f.id === id);
    if (!fornecedor) return;
    
    if (confirm(`Tem certeza que deseja excluir o fornecedor "${fornecedor.nome}"?`)) {
        try {
            const response = await fetch(`/api/fornecedores/${id}`, {
                method: 'DELETE'
            });
            
            if (!response.ok) throw new Error('Erro ao excluir fornecedor');
            
            mostrarAlerta('Fornecedor excluído com sucesso!', 'success');
            carregarFornecedores();
            
        } catch (error) {
            console.error('Erro ao excluir fornecedor:', error);
            mostrarAlerta('Erro ao excluir fornecedor', 'danger');
        }
    }
}

function exportData() {
    const dados = fornecedoresFiltrados.map(f => ({
        'Nome': f.nome,
        'CNPJ/CPF': f.cnpj_cpf || '',
        'Tipo': getTipoTexto(f.tipo_fornecedor),
        'Origem': f.origem,
        'Método Detecção': getMetodoTexto(f.metodo_deteccao),
        'Similaridade': `${Math.round((f.similaridade || 0) * 100)}%`,
        'Detecção Forçada': f.deteccao_forcada ? 'Sim' : 'Não',
        'Detecção Corrigida': f.deteccao_corrigida ? 'Sim' : 'Não',
        'Valor Total': formatarMoeda(f.valor_total_movimentado || 0),
        'Total Transações': f.total_transacoes || 0,
        'Banco': f.banco || '',
        'Agência': f.agencia || '',
        'Conta': f.conta || '',
        'Observações': f.observacoes || ''
    }));
    
    exportarCSV(dados, 'fornecedores_selleta.csv');
}

// Funções utilitárias
function getBadgeClass(metodo) {
    const classes = {
        'exato': 'badge-sistema-original',
        'forcado_empresa': 'badge-deteccao-forcada',
        'corrigido_cpf_parcial': 'badge-deteccao-corrigida',
        'palavras_chave': 'badge-sistema-original',
        'fuzzy_nome': 'badge-sistema-original',
        'cpf_cnpj': 'badge-sistema-original',
        'categoria_generica': 'badge-categoria-generica'
    };
    return classes[metodo] || 'bg-secondary';
}

function getMetodoTexto(metodo) {
    const textos = {
        'exato': 'Sistema Original',
        'forcado_empresa': 'Detecção Forçada',
        'corrigido_cpf_parcial': 'Correção Aplicada',
        'palavras_chave': 'Palavras-chave',
        'fuzzy_nome': 'Fuzzy Nome',
        'cpf_cnpj': 'CPF/CNPJ',
        'categoria_generica': 'Categoria Genérica',
        'manual': 'Manual'
    };
    return textos[metodo] || metodo;
}

function getTipoTexto(tipo) {
    const textos = {
        'empresa': 'Empresa',
        'pessoa_fisica': 'Pessoa Física',
        'generico': 'Categoria Genérica'
    };
    return textos[tipo] || tipo;
}

function getBadgeTipoClass(tipo) {
    const classes = {
        'empresa': 'empresa',
        'pessoa_fisica': 'pessoa-fisica',
        'generico': 'categoria-generica'
    };
    return classes[tipo] || '';
}

function formatarMoeda(valor) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(valor);
}

function formatarDocumento(doc) {
    if (!doc) return '';
    
    const numeros = doc.replace(/\D/g, '');
    
    if (numeros.length === 11) {
        // CPF
        return numeros.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    } else if (numeros.length === 14) {
        // CNPJ
        return numeros.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    }
    
    return doc;
}

function truncarTexto(texto, tamanho) {
    if (!texto) return '';
    return texto.length > tamanho ? texto.substring(0, tamanho) + '...' : texto;
}

function mostrarAlerta(mensagem, tipo) {
    // Criar alerta seguindo padrão Selleta
    const alertDiv = document.createElement('div');
    const iconMap = {
        'success': 'fas fa-check-circle',
        'error': 'fas fa-exclamation-circle', 
        'warning': 'fas fa-exclamation-triangle',
        'info': 'fas fa-info-circle'
    };
    
    alertDiv.className = `alerta alerta-${tipo}`;
    alertDiv.style.cssText = 'position: fixed; top: 20px; right: 20px; z-index: 9999; min-width: 300px; padding: 15px 20px; border-radius: 8px; color: white; font-weight: 500; box-shadow: 0 4px 12px rgba(0,0,0,0.15);';
    
    // Definir cores baseadas no tipo
    const colors = {
        'success': 'var(--selleta-success)',
        'error': 'var(--selleta-error)',
        'warning': 'var(--selleta-warning)',
        'info': 'var(--selleta-info)'
    };
    
    alertDiv.style.backgroundColor = colors[tipo] || colors.info;
    
    alertDiv.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px;">
            <i class="${iconMap[tipo] || iconMap.info}"></i>
            <span>${mensagem}</span>
            <button onclick="this.parentElement.parentElement.remove()" style="background: none; border: none; color: white; font-size: 18px; cursor: pointer; margin-left: auto;">&times;</button>
        </div>
    `;
    
    document.body.appendChild(alertDiv);
    
    // Remover automaticamente após 5 segundos
    setTimeout(() => {
        if (alertDiv.parentNode) {
            alertDiv.parentNode.removeChild(alertDiv);
        }
    }, 5000);
}

function exportarCSV(dados, nomeArquivo) {
    if (dados.length === 0) return;
    
    const headers = Object.keys(dados[0]);
    const csvContent = [
        headers.join(','),
        ...dados.map(row => headers.map(header => `"${row[header]}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', nomeArquivo);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}