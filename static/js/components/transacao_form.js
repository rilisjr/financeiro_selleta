/**
 * TRANSAÇÃO FORM COMPONENT
 * Componente para criar, editar e realizar baixa de transações
 * Suporta múltiplos modos: create, edit, search, baixa
 * Versão: 1.0
 */

class TransacaoForm {
    constructor(options = {}) {
        this.options = {
            containerId: 'modal-transacao-form',
            mode: 'create', // 'create', 'edit', 'search', 'baixa'
            transacaoId: null,
            onSave: null,
            onCancel: null,
            onSearch: null,
            ...options
        };
        
        this.state = {
            mode: this.options.mode,
            transacaoId: this.options.transacaoId,
            originalData: null,
            currentData: {},
            isLoading: false,
            errors: {},
            searchResults: [],
            selectedTransaction: null,
            isBaixaParcial: false
        };
        
        this.elements = {};
        this.validationRules = {};
        
        this.init();
    }
    
    /**
     * Inicialização do componente
     */
    init() {
        this.createModal();
        this.setupEventListeners();
        this.loadInitialData();
    }
    
    /**
     * Cria a estrutura HTML do modal
     */
    createModal() {
        const modalHTML = `
            <div id="${this.options.containerId}" class="modal modal-transacao" style="display: none;">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3 id="modal-title">
                            <i class="fas fa-edit"></i>
                            <span id="modal-title-text">Editar Transação</span>
                            <span id="modal-status-badge" class="status-badge" style="display: none;"></span>
                        </h3>
                        <button class="modal-close" type="button" id="modal-close-btn">&times;</button>
                    </div>
                    
                    <div class="modal-body">
                        <!-- Alertas -->
                        <div id="form-alerts"></div>
                        
                        <!-- Status Indicator -->
                        <div id="status-indicator" class="form-status-indicator" style="display: none;">
                            <div class="status-indicator-icon">
                                <i class="fas fa-check"></i>
                            </div>
                            <span id="status-text">Status da transação</span>
                        </div>
                        
                        <!-- Seção de Pesquisa (modo search) -->
                        <div id="search-section" class="form-section search-mode" style="display: none;">
                            <div class="form-section-header">
                                <i class="fas fa-search"></i>
                                Localizar Transação
                            </div>
                            
                            <div class="form-grid-2">
                                <div class="form-group">
                                    <label for="search-id">ID da Transação:</label>
                                    <input type="number" id="search-id" class="form-input" placeholder="Digite o ID...">
                                </div>
                                <div class="form-group">
                                    <label for="search-titulo">Título:</label>
                                    <input type="text" id="search-titulo" class="form-input" placeholder="Digite parte do título...">
                                </div>
                            </div>
                            
                            <div class="form-grid-2">
                                <div class="form-group">
                                    <label for="search-fornecedor">Fornecedor:</label>
                                    <input type="text" id="search-fornecedor" class="form-input" placeholder="Nome do fornecedor...">
                                </div>
                                <div class="form-group">
                                    <label for="search-valor">Valor:</label>
                                    <input type="number" id="search-valor" class="form-input valor-input" placeholder="0,00" step="0.01">
                                </div>
                            </div>
                            
                            <div style="text-align: center; margin-top: 15px;">
                                <button type="button" id="btn-executar-busca" class="btn-form btn-form-primary">
                                    <i class="fas fa-search"></i> Buscar Transações
                                </button>
                            </div>
                            
                            <!-- Resultados da Busca -->
                            <div id="search-results" class="search-results" style="display: none;">
                                <div id="search-results-content"></div>
                            </div>
                        </div>
                        
                        <!-- Seção Principal - Dados da Transação -->
                        <div id="main-section" class="form-section">
                            <div class="form-section-header">
                                <i class="fas fa-file-alt"></i>
                                Dados da Transação
                            </div>
                            
                            <!-- Linha 1: Identificação -->
                            <div class="form-grid-3">
                                <div class="form-group">
                                    <label for="transacao-id">ID:</label>
                                    <input type="text" id="transacao-id" class="form-input" readonly>
                                </div>
                                <div class="form-group">
                                    <label for="transacao-titulo">
                                        Título <span class="required">*</span>
                                    </label>
                                    <input type="text" id="transacao-titulo" class="form-input" readonly 
                                           placeholder="Será gerado automaticamente..." 
                                           style="background-color: #f8f9fa; cursor: not-allowed;" 
                                           title="Título gerado automaticamente baseado no ID">
                                </div>
                                <div class="form-group">
                                    <label for="transacao-numero-documento">Número do Documento:</label>
                                    <input type="text" id="transacao-numero-documento" class="form-input">
                                </div>
                            </div>
                            
                            <!-- Linha 2: Fornecedor e Empresa -->
                            <div class="form-grid-2">
                                <div class="form-group">
                                    <label for="transacao-fornecedor">
                                        Fornecedor <span class="required">*</span>
                                    </label>
                                    <div class="search-container">
                                        <input type="text" 
                                               id="transacao-fornecedor" 
                                               class="form-input search-input" 
                                               placeholder="Digite para buscar fornecedor..." 
                                               autocomplete="off" 
                                               required>
                                        <div class="search-results" id="fornecedor-search-results" style="display: none;">
                                            <!-- Resultados da busca aparecerão aqui -->
                                        </div>
                                        <input type="hidden" id="transacao-fornecedor-id" name="fornecedor_id" value="">
                                        <div class="search-selected" id="fornecedor-selected" style="display: none;">
                                            <span class="search-selected-name"></span>
                                            <button type="button" class="search-clear" onclick="clearFornecedorSelection()">×</button>
                                        </div>
                                    </div>
                                </div>
                                <div class="form-group">
                                    <label for="transacao-empresa">
                                        Empresa <span class="required">*</span>
                                    </label>
                                    <select id="transacao-empresa" class="form-select" required>
                                        <option value="">Carregando...</option>
                                    </select>
                                </div>
                            </div>
                            
                            <!-- Linha 3: Plano e Centro -->
                            <div class="form-grid-2">
                                <div class="form-group">
                                    <label for="transacao-plano">
                                        Plano Financeiro <span class="required">*</span>
                                    </label>
                                    <div class="search-container">
                                        <input type="text" 
                                               id="transacao-plano" 
                                               class="form-input search-input" 
                                               placeholder="Digite para buscar plano financeiro..." 
                                               autocomplete="off" 
                                               required>
                                        <div class="search-results" id="plano-search-results" style="display: none;">
                                            <!-- Resultados da busca aparecerão aqui -->
                                        </div>
                                        <input type="hidden" id="transacao-plano-id" name="plano_id" value="">
                                        <div class="search-selected" id="plano-selected" style="display: none;">
                                            <span class="search-selected-name"></span>
                                            <button type="button" class="search-clear" onclick="clearPlanoSelection()">×</button>
                                        </div>
                                    </div>
                                </div>
                                <div class="form-group">
                                    <label for="transacao-centro">
                                        Centro de Custo <span class="required">*</span>
                                    </label>
                                    <div class="search-container">
                                        <input type="text" 
                                               id="transacao-centro" 
                                               class="form-input search-input" 
                                               placeholder="Digite para buscar centro de custo..." 
                                               autocomplete="off" 
                                               required>
                                        <div class="search-results" id="centro-search-results" style="display: none;">
                                            <!-- Resultados da busca aparecerão aqui -->
                                        </div>
                                        <input type="hidden" id="transacao-centro-id" name="centro_id" value="">
                                        <div class="search-selected" id="centro-selected" style="display: none;">
                                            <span class="search-selected-name"></span>
                                            <button type="button" class="search-clear" onclick="clearCentroSelection()">×</button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Linha 4: Valores e Datas -->
                            <div class="form-grid-3">
                                <div class="form-group">
                                    <label for="transacao-tipo">
                                        Tipo <span class="required">*</span>
                                    </label>
                                    <select id="transacao-tipo" class="form-select" required>
                                        <option value="">Selecione...</option>
                                        <option value="Entrada">Entrada (Receita)</option>
                                        <option value="Saída">Saída (Despesa)</option>
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label for="transacao-valor">
                                        Valor <span class="required">*</span>
                                    </label>
                                    <div class="form-input-with-icon">
                                        <i class="icon fas fa-dollar-sign"></i>
                                        <input type="number" id="transacao-valor" class="form-input valor-input" 
                                               required step="0.01" min="0.01">
                                    </div>
                                </div>
                                <div class="form-group">
                                    <label for="transacao-data-vencimento">
                                        Data Vencimento <span class="required">*</span>
                                    </label>
                                    <input type="date" id="transacao-data-vencimento" class="form-input" required>
                                </div>
                            </div>
                            
                            <!-- Status campos removidos - serão definidos automaticamente no backend -->
                            
                            <!-- Observações -->
                            <div class="form-group">
                                <label for="transacao-observacoes">Observações:</label>
                                <textarea id="transacao-observacoes" class="form-textarea" rows="3" 
                                          placeholder="Observações adicionais sobre a transação..."></textarea>
                            </div>
                        </div>
                        
                        <!-- Seção de Baixa (modo baixa) -->
                        <div id="baixa-section" class="form-section baixa-mode" style="display: none;">
                            <div class="form-section-header">
                                <i class="fas fa-check-circle"></i>
                                Realizar Baixa
                            </div>
                            
                            <!-- Destaque da Baixa -->
                            <div class="baixa-highlight">
                                <div class="baixa-highlight-title">
                                    <i class="fas fa-info-circle"></i>
                                    Confirmar Pagamento/Recebimento
                                </div>
                                <div class="baixa-highlight-info">
                                    Você está prestes a confirmar o pagamento/recebimento desta transação. 
                                    Após confirmar, o status será alterado para "Realizado".
                                </div>
                            </div>
                            
                            <!-- Baixa Parcial -->
                            <div class="baixa-parcial-section">
                                <div class="baixa-parcial-toggle">
                                    <input type="checkbox" id="baixa-parcial-check">
                                    <label for="baixa-parcial-check">Realizar baixa parcial</label>
                                </div>
                                <div id="baixa-parcial-info" class="baixa-parcial-info" style="display: none;">
                                    Uma nova transação será criada com o valor pago, e esta transação 
                                    terá seu valor ajustado para o <span class="valor-restante">valor restante</span>.
                                </div>
                            </div>
                            
                            <!-- Campos de Baixa -->
                            <div class="form-grid-2">
                                <div class="form-group">
                                    <label for="baixa-data-pagamento">
                                        Data do Pagamento <span class="required">*</span>
                                    </label>
                                    <input type="date" id="baixa-data-pagamento" class="form-input" required>
                                </div>
                                <div class="form-group">
                                    <label for="baixa-valor-pago">
                                        Valor Pago <span class="required">*</span>
                                    </label>
                                    <div class="form-input-with-icon">
                                        <i class="icon fas fa-dollar-sign"></i>
                                        <input type="number" id="baixa-valor-pago" class="form-input valor-input" 
                                               required step="0.01" min="0.01">
                                    </div>
                                </div>
                            </div>
                            
                            <div class="form-group">
                                <label for="baixa-conta-bancaria">Conta Bancária:</label>
                                <select id="baixa-conta-bancaria" class="form-select">
                                    <option value="">Carregando...</option>
                                </select>
                            </div>
                            
                            <div class="form-group">
                                <label for="baixa-observacoes">Observações da Baixa:</label>
                                <textarea id="baixa-observacoes" class="form-textarea" rows="2" 
                                          placeholder="Informações adicionais sobre o pagamento..."></textarea>
                            </div>
                        </div>
                        
                        <!-- Histórico de Alterações -->
                        <div id="historico-section" class="historico-section" style="display: none;">
                            <h4>Histórico de Alterações</h4>
                            <div id="historico-content"></div>
                        </div>
                    </div>
                    
                    <div class="modal-footer">
                        <div class="modal-footer-info">
                            <i class="fas fa-info-circle"></i>
                            <span id="footer-info">Preencha os campos obrigatórios</span>
                        </div>
                        
                        <div class="modal-footer-actions">
                            <button type="button" id="btn-cancelar" class="btn-form btn-form-secondary">
                                <i class="fas fa-times"></i> Cancelar
                            </button>
                            
                            <button type="button" id="btn-salvar" class="btn-form btn-form-primary">
                                <i class="fas fa-save"></i> Salvar
                            </button>
                            
                            <button type="button" id="btn-baixa" class="btn-form btn-form-success" style="display: none;">
                                <i class="fas fa-check"></i> Confirmar Baixa
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Remove modal existente
        const existingModal = document.getElementById(this.options.containerId);
        if (existingModal) {
            existingModal.remove();
        }
        
        // Adiciona o novo modal ao body
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        // Salva referências dos elementos
        this.elements = {
            modal: document.getElementById(this.options.containerId),
            modalTitle: document.getElementById('modal-title-text'),
            modalStatusBadge: document.getElementById('modal-status-badge'),
            closeBtn: document.getElementById('modal-close-btn'),
            alerts: document.getElementById('form-alerts'),
            statusIndicator: document.getElementById('status-indicator'),
            statusText: document.getElementById('status-text'),
            
            // Seções
            searchSection: document.getElementById('search-section'),
            mainSection: document.getElementById('main-section'),
            baixaSection: document.getElementById('baixa-section'),
            historicoSection: document.getElementById('historico-section'),
            
            // Campos principais
            id: document.getElementById('transacao-id'),
            titulo: document.getElementById('transacao-titulo'),
            numeroDocumento: document.getElementById('transacao-numero-documento'),
            fornecedor: document.getElementById('transacao-fornecedor'),
            empresa: document.getElementById('transacao-empresa'),
            plano: document.getElementById('transacao-plano'),
            centro: document.getElementById('transacao-centro'),
            tipo: document.getElementById('transacao-tipo'),
            valor: document.getElementById('transacao-valor'),
            dataVencimento: document.getElementById('transacao-data-vencimento'),
            statusNegociacao: document.getElementById('transacao-status-negociacao'),
            statusPagamento: document.getElementById('transacao-status-pagamento'),
            observacoes: document.getElementById('transacao-observacoes'),
            
            // Campos de busca
            searchId: document.getElementById('search-id'),
            searchTitulo: document.getElementById('search-titulo'),
            searchFornecedor: document.getElementById('search-fornecedor'),
            searchValor: document.getElementById('search-valor'),
            btnExecutarBusca: document.getElementById('btn-executar-busca'),
            searchResults: document.getElementById('search-results'),
            searchResultsContent: document.getElementById('search-results-content'),
            
            // Campos de baixa
            baixaDataPagamento: document.getElementById('baixa-data-pagamento'),
            baixaValorPago: document.getElementById('baixa-valor-pago'),
            baixaContaBancaria: document.getElementById('baixa-conta-bancaria'),
            baixaObservacoes: document.getElementById('baixa-observacoes'),
            baixaParcialCheck: document.getElementById('baixa-parcial-check'),
            baixaParcialInfo: document.getElementById('baixa-parcial-info'),
            
            // Botões
            btnCancelar: document.getElementById('btn-cancelar'),
            btnSalvar: document.getElementById('btn-salvar'),
            btnBaixa: document.getElementById('btn-baixa'),
            
            // Info
            footerInfo: document.getElementById('footer-info'),
            historicoContent: document.getElementById('historico-content')
        };
    }
    
    /**
     * Configura os event listeners
     */
    setupEventListeners() {
        // Fechar modal
        this.elements.closeBtn.addEventListener('click', () => this.close());
        this.elements.btnCancelar.addEventListener('click', () => this.close());
        
        // Clique fora do modal
        this.elements.modal.addEventListener('click', (e) => {
            if (e.target === this.elements.modal) {
                this.close();
            }
        });
        
        // ESC para fechar
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.elements.modal.style.display === 'block') {
                this.close();
            }
        });
        
        // Busca
        this.elements.btnExecutarBusca.addEventListener('click', () => this.executarBusca());
        
        // Enter na busca
        [this.elements.searchId, this.elements.searchTitulo, this.elements.searchFornecedor, this.elements.searchValor]
            .forEach(input => {
                input.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        this.executarBusca();
                    }
                });
            });
        
        // Mudança de tipo (entrada/saída)
        this.elements.tipo.addEventListener('change', () => this.onTipoChange());
        
        // Inicializar sistema de busca autocomplete
        this.initSearchAutocomplete();
        
        // Baixa parcial
        this.elements.baixaParcialCheck.addEventListener('change', () => this.onBaixaParcialChange());
        
        // Validação em tempo real
        this.setupRealTimeValidation();
        
        // Botões de ação
        this.elements.btnSalvar.addEventListener('click', () => this.salvar());
        this.elements.btnBaixa.addEventListener('click', () => this.handleBaixaButtonClick());
    }
    
    /**
     * Carrega dados iniciais
     */
    async loadInitialData() {
        try {
            this.setLoading(true);
            
            // Carrega dados para os selects
            await this.loadSelectOptions();
            
            // Se modo edit, carrega dados da transação
            if ((this.state.mode === 'edit' || this.state.mode === 'baixa') && this.state.transacaoId) {
                await this.loadTransacaoData();
            }
            
            // Configura interface baseada no modo
            this.setupModeInterface();
            
        } catch (error) {
            console.error('Erro ao carregar dados iniciais:', error);
            this.showAlert('Erro ao carregar dados iniciais', 'error');
        } finally {
            this.setLoading(false);
        }
    }
    
    /**
     * Carrega opções para os selects
     */
    async loadSelectOptions() {
        try {
            console.log('📡 Carregando opções dos selects...');
            
            // Carregar em paralelo
            const [empresas, fornecedores, planos, centros, contas] = await Promise.all([
                fetch('/api/empresas').then(r => r.json()),
                fetch('/api/fornecedores/buscar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }).then(r => r.json()),
                fetch('/api/plano-financeiro').then(r => r.json()),
                fetch('/api/centros-custo').then(r => r.json()),
                fetch('/api/contas-bancarias').then(async r => {
                    console.log('🏦 Status da API contas-bancarias:', r.status);
                    if (!r.ok) {
                        const errorText = await r.text();
                        console.error('❌ Erro na API contas-bancarias:', r.status, errorText);
                        return { data: [], error: `${r.status}: ${errorText}` };
                    }
                    const data = await r.json();
                    console.log('✅ API contas-bancarias OK:', data);
                    return data;
                }).catch(err => {
                    console.error('❌ Erro de rede na API contas-bancarias:', err);
                    return { data: [], error: err.message };
                })
            ]);
            
            console.log('📊 Dados recebidos das APIs:');
            console.log('   - Empresas:', empresas.data?.length || empresas.length);
            console.log('   - Fornecedores:', fornecedores.data?.length || fornecedores.length);
            console.log('   - Planos:', planos.data?.length || planos.length);
            console.log('   - Centros:', centros.data?.length || centros.length);
            console.log('   - Contas:', contas.data?.length || contas.length);
            console.log('🏦 Contas bancárias detalhadas:', contas.data || contas);
            
            // Preencher selects
            console.log('🔧 Populando selects...');
            this.populateSelect(this.elements.empresa, empresas.data || empresas, 'id', 'nome');
            this.populateSelect(this.elements.fornecedor, fornecedores.data || fornecedores, 'id', 'nome');
            this.populateSelect(this.elements.plano, planos.data || planos, 'id', item => `${item.codigo} - ${item.nome}`);
            this.populateSelect(this.elements.centro, centros.data || centros, 'id', item => `${item.mascara_cc} - ${item.centro_custo_original || item.nome || 'N/A'}`);
            // Carregar contas bancárias
            const contasData = contas.data || contas;
            if (contasData.length > 0) {
                console.log('🏦 Populando contas bancárias:', contasData.length, 'contas');
                this.populateSelect(this.elements.baixaContaBancaria, contasData, 'id', item => {
                    const banco = (item.banco || 'N/A').substring(0, 25);
                    const agencia = item.agencia || 'N/A';
                    const conta = item.conta || 'N/A';
                    const empresa = item.empresa ? ` (${item.empresa.substring(0, 15)})` : '';
                    return `${banco} - Ag: ${agencia} - CC: ${conta}${empresa}`;
                });
            } else {
                console.warn('⚠️ Nenhuma conta bancária disponível');
                if (this.elements.baixaContaBancaria) {
                    this.elements.baixaContaBancaria.innerHTML = '<option value="">Nenhuma conta ativa encontrada</option>';
                }
                if (contas.error) {
                    console.error('🚨 Erro nas contas bancárias:', contas.error);
                }
            }
            
            console.log('✅ Selects populados com sucesso');
            
        } catch (error) {
            console.error('❌ Erro ao carregar opções dos selects:', error);
            this.showAlert('Erro ao carregar dados dos formulários', 'error');
        }
    }
    
    /**
     * Popula um select com dados
     */
    populateSelect(selectElement, data, valueField, textField) {
        if (!selectElement) {
            console.warn('⚠️ Elemento select não encontrado');
            return;
        }
        
        if (!data || !Array.isArray(data) || data.length === 0) {
            console.warn('⚠️ Dados do select vazios ou inválidos:', data);
            selectElement.innerHTML = '<option value="">Nenhum dado disponível</option>';
            return;
        }
        
        console.log(`🔧 Populando select com ${data.length} itens`);
        
        // Limpar select
        selectElement.innerHTML = '<option value="">Selecione...</option>';
        
        // Adicionar opções
        data.forEach((item, index) => {
            try {
                const option = document.createElement('option');
                option.value = item[valueField];
                option.textContent = typeof textField === 'function' ? textField(item) : item[textField];
                selectElement.appendChild(option);
                
                // Log apenas dos primeiros 3 itens para não poluir o console
                if (index < 3) {
                    console.log(`   • Item ${index + 1}: ${option.value} - ${option.textContent}`);
                }
            } catch (error) {
                console.error(`❌ Erro ao processar item ${index}:`, item, error);
            }
        });
        
        console.log(`✅ Select populado com ${data.length} opções`);
    }
    
    /**
     * Inicializa sistema de busca autocomplete para os campos
     */
    initSearchAutocomplete() {
        console.log('🔍 Inicializando sistemas de busca autocomplete...');
        
        // Fornecedor
        const fornecedorInput = document.getElementById('transacao-fornecedor');
        if (fornecedorInput) {
            fornecedorInput.addEventListener('input', (e) => this.handleSearchInput(e, 'fornecedor'));
            fornecedorInput.addEventListener('focus', (e) => this.handleSearchFocus(e, 'fornecedor'));
            fornecedorInput.addEventListener('blur', (e) => this.handleSearchBlur(e, 'fornecedor'));
        }
        
        // Plano Financeiro
        const planoInput = document.getElementById('transacao-plano');
        if (planoInput) {
            planoInput.addEventListener('input', (e) => this.handleSearchInput(e, 'plano'));
            planoInput.addEventListener('focus', (e) => this.handleSearchFocus(e, 'plano'));
            planoInput.addEventListener('blur', (e) => this.handleSearchBlur(e, 'plano'));
        }
        
        // Centro de Custo
        const centroInput = document.getElementById('transacao-centro');
        if (centroInput) {
            centroInput.addEventListener('input', (e) => this.handleSearchInput(e, 'centro'));
            centroInput.addEventListener('focus', (e) => this.handleSearchFocus(e, 'centro'));
            centroInput.addEventListener('blur', (e) => this.handleSearchBlur(e, 'centro'));
        }
        
        console.log('✅ Sistemas de busca autocomplete inicializados');
    }
    
    /**
     * Manipula entrada de texto na busca
     */
    handleSearchInput(event, type) {
        const query = event.target.value.trim();
        
        // Limpar timeout anterior
        if (this.searchTimeouts && this.searchTimeouts[type]) {
            clearTimeout(this.searchTimeouts[type]);
        }
        
        // Inicializar searchTimeouts se não existir
        if (!this.searchTimeouts) {
            this.searchTimeouts = {};
        }
        
        // Se query muito pequena, esconder resultados
        if (query.length < 2) {
            this.hideSearchResults(type);
            return;
        }
        
        // Delay para evitar muitas requisições
        this.searchTimeouts[type] = setTimeout(() => {
            this.performSearch(query, type);
        }, 300);
    }
    
    /**
     * Manipula foco no campo de busca
     */
    handleSearchFocus(event, type) {
        const query = event.target.value.trim();
        if (query.length >= 2) {
            this.showSearchResults(type);
        }
    }
    
    /**
     * Manipula perda de foco no campo de busca
     */
    handleSearchBlur(event, type) {
        // Delay para permitir clique nos resultados
        setTimeout(() => {
            this.hideSearchResults(type);
        }, 200);
    }
    
    /**
     * Executa a busca na API
     */
    async performSearch(query, type) {
        try {
            console.log(`🔍 Buscando ${type}:`, query);
            
            // URLs das APIs
            const apiUrls = {
                fornecedor: '/api/fornecedores',
                plano: '/api/plano-financeiro',
                centro: '/api/centros-custo'
            };
            
            // Verificar cache primeiro
            if (!this.searchCaches) {
                this.searchCaches = {};
            }
            
            if (!this.searchCaches[type + 's']) {
                const response = await fetch(apiUrls[type]);
                if (!response.ok) throw new Error(`Erro na API: ${response.status}`);
                
                const data = await response.json();
                this.searchCaches[type + 's'] = data.success ? data.data : (data.data || data);
            }
            
            // Filtrar resultados localmente
            const allItems = this.searchCaches[type + 's'];
            const filteredItems = this.filterItems(allItems, query, type);
            
            // Exibir resultados
            this.displaySearchResults(filteredItems, type);
            
        } catch (error) {
            console.error(`❌ Erro na busca de ${type}:`, error);
            this.showSearchError(type);
        }
    }
    
    /**
     * Filtra itens baseado na query
     */
    filterItems(items, query, type) {
        const queryLower = query.toLowerCase();
        
        return items.filter(item => {
            switch (type) {
                case 'fornecedor':
                    return item.nome && item.nome.toLowerCase().includes(queryLower);
                case 'plano':
                    return (item.codigo && item.codigo.toLowerCase().includes(queryLower)) ||
                           (item.descricao && item.descricao.toLowerCase().includes(queryLower));
                case 'centro':
                    return (item.nome && item.nome.toLowerCase().includes(queryLower)) ||
                           (item.codigo && item.codigo.toLowerCase().includes(queryLower));
                default:
                    return false;
            }
        }).slice(0, 10); // Limitar a 10 resultados
    }
    
    /**
     * Exibe resultados da busca
     */
    displaySearchResults(items, type) {
        const resultsContainer = document.getElementById(`${type}-search-results`);
        if (!resultsContainer) return;
        
        if (items.length === 0) {
            resultsContainer.innerHTML = '<div class="search-no-results">Nenhum resultado encontrado</div>';
        } else {
            const resultsHTML = items.map(item => this.createSearchResultItem(item, type)).join('');
            resultsContainer.innerHTML = resultsHTML;
        }
        
        this.showSearchResults(type);
    }
    
    /**
     * Cria HTML de um item de resultado
     */
    createSearchResultItem(item, type) {
        let displayText = '';
        let secondaryText = '';
        
        switch (type) {
            case 'fornecedor':
                displayText = item.nome || 'Nome não informado';
                secondaryText = item.cpf_cnpj ? ` - ${item.cpf_cnpj}` : '';
                break;
            case 'plano':
                displayText = item.codigo || 'Código não informado';
                secondaryText = item.descricao ? ` - ${item.descricao}` : '';
                break;
            case 'centro':
                displayText = item.nome || 'Nome não informado';
                secondaryText = item.tipologia ? ` (${item.tipologia})` : '';
                break;
        }
        
        return `
            <div class="search-result-item" onclick="window.currentTransacaoForm.selectSearchItem(${item.id}, '${type}', '${displayText.replace(/'/g, "\\'")}')">
                <div class="search-result-main">${displayText}</div>
                <div class="search-result-secondary">${secondaryText}</div>
            </div>
        `;
    }
    
    /**
     * Seleciona um item da busca
     */
    selectSearchItem(id, type, displayText) {
        console.log(`✅ Item selecionado - ${type}:`, id, displayText);
        
        // Preencher campos
        const input = document.getElementById(`transacao-${type}`);
        const hiddenInput = document.getElementById(`transacao-${type}-id`);
        const selectedDiv = document.getElementById(`${type}-selected`);
        const selectedName = selectedDiv?.querySelector('.search-selected-name');
        
        if (input) input.value = displayText;
        if (hiddenInput) hiddenInput.value = id;
        
        if (selectedDiv && selectedName) {
            selectedName.textContent = displayText;
            selectedDiv.style.display = 'block';
            input.style.display = 'none';
        }
        
        // Esconder resultados
        this.hideSearchResults(type);
    }
    
    /**
     * Limpa seleção do campo de busca
     */
    clearSearchSelection(type) {
        const input = document.getElementById(`transacao-${type}`);
        const hiddenInput = document.getElementById(`transacao-${type}-id`);
        const selectedDiv = document.getElementById(`${type}-selected`);
        
        if (input) {
            input.value = '';
            input.style.display = 'block';
        }
        if (hiddenInput) hiddenInput.value = '';
        if (selectedDiv) selectedDiv.style.display = 'none';
        
        this.hideSearchResults(type);
    }
    
    /**
     * Mostra resultados da busca
     */
    showSearchResults(type) {
        const resultsContainer = document.getElementById(`${type}-search-results`);
        if (resultsContainer) {
            resultsContainer.style.display = 'block';
        }
    }
    
    /**
     * Esconde resultados da busca
     */
    hideSearchResults(type) {
        const resultsContainer = document.getElementById(`${type}-search-results`);
        if (resultsContainer) {
            resultsContainer.style.display = 'none';
        }
    }
    
    /**
     * Mostra erro na busca
     */
    showSearchError(type) {
        const resultsContainer = document.getElementById(`${type}-search-results`);
        if (resultsContainer) {
            resultsContainer.innerHTML = '<div class="search-error">Erro ao carregar dados</div>';
            this.showSearchResults(type);
        }
    }
    
    /**
     * Carrega dados de uma transação específica
     */
    async loadTransacaoData() {
        try {
            console.log(`🔍 Carregando dados da transação ID: ${this.state.transacaoId}`);
            
            const response = await fetch(`/api/transacao/${this.state.transacaoId}`);
            console.log('📡 Response status:', response.status);
            
            const result = await response.json();
            console.log('📋 Dados recebidos da API:', result);
            
            if (result.success) {
                this.state.originalData = result.data;
                console.log('✅ Dados salvos no state. Preenchendo formulário...');
                this.preencherFormulario(result.data);
                console.log('✅ Formulário preenchido com sucesso');
            } else {
                console.error('❌ API retornou erro:', result.message);
                throw new Error(result.message || 'Erro ao carregar transação');
            }
            
        } catch (error) {
            console.error('❌ Erro ao carregar dados da transação:', error);
            this.showAlert('Erro ao carregar dados da transação', 'error');
        }
    }
    
    /**
     * Preenche o formulário com dados
     */
    preencherFormulario(data) {
        console.log('🎯 Iniciando preenchimento do formulário com:', data);
        
        // Campos principais
        console.log('📝 Preenchendo campos básicos...');
        this.elements.id.value = data.id || '';
        this.elements.titulo.value = data.titulo || '';
        this.elements.numeroDocumento.value = data.numero_documento || '';
        
        console.log('🏢 Preenchendo selects de relacionamento...');
        console.log(`   - Fornecedor ID: ${data.cliente_fornecedor_id}`);
        console.log(`   - Empresa ID: ${data.empresa_id}`);
        console.log(`   - Plano ID: ${data.plano_financeiro_id}`);
        console.log(`   - Centro ID: ${data.centro_custo_id}`);
        
        // Verificar se os selects têm as opções antes de tentar preencher
        if (this.elements.fornecedor) {
            console.log(`   - Fornecedor SELECT tem ${this.elements.fornecedor.options.length} opções`);
            this.elements.fornecedor.value = data.cliente_fornecedor_id || '';
            console.log(`   - Fornecedor VALUE definido como: ${this.elements.fornecedor.value}`);
        }
        
        if (this.elements.empresa) {
            console.log(`   - Empresa SELECT tem ${this.elements.empresa.options.length} opções`);
            this.elements.empresa.value = data.empresa_id || '';
            console.log(`   - Empresa VALUE definido como: ${this.elements.empresa.value}`);
        }
        
        if (this.elements.plano) {
            console.log(`   - Plano SELECT tem ${this.elements.plano.options.length} opções`);
            this.elements.plano.value = data.plano_financeiro_id || '';
            console.log(`   - Plano VALUE definido como: ${this.elements.plano.value}`);
        }
        
        if (this.elements.centro) {
            console.log(`   - Centro SELECT tem ${this.elements.centro.options.length} opções`);
            this.elements.centro.value = data.centro_custo_id || '';
            console.log(`   - Centro VALUE definido como: ${this.elements.centro.value}`);
        }
        
        console.log('💰 Preenchendo valores e datas...');
        this.elements.tipo.value = data.tipo || '';
        this.elements.valor.value = data.valor || '';
        this.elements.dataVencimento.value = data.data_vencimento || '';
        
        console.log('📊 Preenchendo status...');
        this.elements.statusNegociacao.value = data.status_negociacao || 'Aprovado';
        this.elements.statusPagamento.value = data.status_pagamento || 'A Realizar';
        this.elements.observacoes.value = data.observacao || '';
        
        console.log('✅ Todos os campos básicos preenchidos');
        
        // Atualizar interface
        this.onTipoChange();
        this.updateStatusIndicator();
        
        // Campos de baixa se disponíveis
        if (data.data_pagamento) {
            this.elements.baixaDataPagamento.value = data.data_pagamento;
        }
        if (data.valor_pago) {
            this.elements.baixaValorPago.value = data.valor_pago;
        }
        if (data.observacao_baixa) {
            this.elements.baixaObservacoes.value = data.observacao_baixa;
        }
        
        // Salvar dados atuais
        this.state.currentData = { ...data };
    }
    
    /**
     * Configura interface baseada no modo
     */
    setupModeInterface() {
        const { mode } = this.state;
        
        // Reset visibility
        this.elements.searchSection.style.display = 'none';
        this.elements.baixaSection.style.display = 'none';
        this.elements.btnBaixa.style.display = 'none';
        
        switch (mode) {
            case 'create':
                this.elements.modalTitle.textContent = 'Nova Transação';
                this.elements.id.parentElement.style.display = 'none';
                this.elements.btnSalvar.innerHTML = '<i class="fas fa-plus"></i> Criar Transação';
                this.elements.footerInfo.textContent = 'Preencha os campos obrigatórios para criar a transação';
                
                // Gerar título automático
                this.gerarTituloAutomatico();
                
                // Verificar e recarregar selects se necessário
                this.verificarSelectsCarregados();
                break;
                
            case 'search':
                this.elements.modalTitle.textContent = 'Localizar Transação';
                this.elements.searchSection.style.display = 'block';
                this.elements.mainSection.style.display = 'none';
                this.elements.btnSalvar.style.display = 'none';
                this.elements.footerInfo.textContent = 'Use os filtros para localizar a transação desejada';
                break;
                
            case 'edit':
                this.elements.modalTitle.textContent = 'Editar Transação';
                this.elements.btnSalvar.innerHTML = '<i class="fas fa-save"></i> Salvar Alterações';
                this.elements.footerInfo.textContent = 'Campos principais são somente leitura. Use "Efetuar Baixa" para alterar status de pagamento';
                this.elements.historicoSection.style.display = 'block';
                this.elements.btnBaixa.style.display = 'inline-flex';
                this.elements.btnBaixa.innerHTML = '<i class="fas fa-credit-card"></i> Efetuar Baixa';
                
                // Congelar campos específicos conforme solicitado
                this.freezeEditFields();
                this.loadHistorico();
                break;
                
            case 'baixa':
                this.elements.modalTitle.textContent = 'Realizar Baixa';
                this.elements.baixaSection.style.display = 'block';
                this.elements.btnSalvar.style.display = 'none';
                this.elements.btnBaixa.style.display = 'inline-flex';
                this.elements.footerInfo.textContent = 'Confirme os dados do pagamento/recebimento';
                
                // Preencher data atual e valor original
                this.elements.baixaDataPagamento.value = new Date().toISOString().split('T')[0];
                this.elements.baixaValorPago.value = this.elements.valor.value;
                
                // Desabilitar campos principais
                this.disableMainFields();
                break;
        }
        
        this.updateStatusIndicator();
    }
    
    /**
     * Desabilita campos principais no modo baixa
     */
    disableMainFields() {
        const fields = [
            this.elements.titulo, this.elements.numeroDocumento, this.elements.fornecedor,
            this.elements.empresa, this.elements.plano, this.elements.centro, this.elements.tipo,
            this.elements.valor, this.elements.dataVencimento, this.elements.statusNegociacao
        ];
        
        fields.forEach(field => {
            if (field) field.disabled = true;
        });
    }
    
    /**
     * Congela campos específicos no modo edição conforme solicitado
     * Campos congelados: ID, Título, Número Documento, Fornecedor, Empresa, 
     * Plano Financeiro, Centro Custo, Tipo, Data Vencimento, Status Pagamento
     */
    freezeEditFields() {
        console.log('🔒 Congelando campos específicos para edição...');
        
        const fieldsToFreeze = [
            this.elements.id,              // ID
            this.elements.titulo,          // Título  
            this.elements.numeroDocumento, // Número do Documento
            this.elements.fornecedor,      // Fornecedor
            this.elements.empresa,         // Empresa
            this.elements.plano,           // Plano Financeiro
            this.elements.centro,          // Centro de Custo
            this.elements.tipo,            // Tipo
            this.elements.dataVencimento,  // Data Vencimento
            this.elements.statusPagamento  // Status Pagamento
        ];
        
        fieldsToFreeze.forEach(field => {
            if (field) {
                field.disabled = true;
                field.style.backgroundColor = '#f8f9fa';
                field.style.color = '#6c757d';
                field.style.cursor = 'not-allowed';
                
                // Adicionar tooltip explicativo
                field.title = 'Campo congelado para edição. Use "Efetuar Baixa" para alterar status.';
            }
        });
        
        // Manter apenas Observações como editável
        if (this.elements.observacoes) {
            this.elements.observacoes.disabled = false;
            this.elements.observacoes.style.backgroundColor = '#ffffff';
            this.elements.observacoes.style.color = '#495057';
            this.elements.observacoes.style.cursor = 'text';
            this.elements.observacoes.title = 'Campo editável';
        }
        
        console.log('✅ Campos congelados aplicados');
    }
    
    /**
     * Atualiza indicador de status
     */
    updateStatusIndicator() {
        const status = this.elements.statusPagamento.value;
        const indicator = this.elements.statusIndicator;
        const text = this.elements.statusText;
        
        if (status) {
            indicator.style.display = 'flex';
            indicator.className = `form-status-indicator status-${status.toLowerCase().replace(' ', '-')}`;
            text.textContent = `Status: ${status}`;
        } else {
            indicator.style.display = 'none';
        }
    }
    
    /**
     * Handler para mudança de tipo
     */
    onTipoChange() {
        const tipo = this.elements.tipo.value;
        const valorInput = this.elements.valor;
        
        // Remove classes antigas
        valorInput.classList.remove('valor-entrada', 'valor-saida');
        
        // Adiciona classe baseada no tipo
        if (tipo === 'Entrada') {
            valorInput.classList.add('valor-entrada');
        } else if (tipo === 'Saída') {
            valorInput.classList.add('valor-saida');
        }
    }
    
    /**
     * Handler para baixa parcial
     */
    onBaixaParcialChange() {
        const checked = this.elements.baixaParcialCheck.checked;
        this.elements.baixaParcialInfo.style.display = checked ? 'block' : 'none';
        this.state.isBaixaParcial = checked;
        
        if (checked) {
            // Calcular valor restante quando valor pago muda
            this.elements.baixaValorPago.addEventListener('input', this.updateValorRestante.bind(this));
        }
    }
    
    /**
     * Atualiza valor restante na baixa parcial
     */
    updateValorRestante() {
        if (!this.state.isBaixaParcial) return;
        
        const valorOriginal = parseFloat(this.elements.valor.value) || 0;
        const valorPago = parseFloat(this.elements.baixaValorPago.value) || 0;
        const valorRestante = valorOriginal - valorPago;
        
        const span = this.elements.baixaParcialInfo.querySelector('.valor-restante');
        if (span) {
            span.textContent = `R$ ${valorRestante.toFixed(2).replace('.', ',')}`;
        }
    }
    
    /**
     * Configura validação em tempo real
     */
    setupRealTimeValidation() {
        const requiredFields = [
            this.elements.titulo, this.elements.fornecedor, this.elements.empresa,
            this.elements.plano, this.elements.centro, this.elements.tipo,
            this.elements.valor, this.elements.dataVencimento
        ];
        
        requiredFields.forEach(field => {
            if (field) {
                field.addEventListener('blur', () => this.validateField(field));
                field.addEventListener('input', () => this.clearFieldError(field));
            }
        });
    }
    
    /**
     * Valida um campo específico
     */
    validateField(field) {
        const group = field.closest('.form-group');
        const fieldName = field.id;
        let isValid = true;
        let message = '';
        
        // Validação de campo obrigatório
        if (field.hasAttribute('required') && !field.value.trim()) {
            isValid = false;
            message = 'Este campo é obrigatório';
        }
        
        // Validações específicas
        if (field === this.elements.valor) {
            const valor = parseFloat(field.value);
            if (isNaN(valor) || valor <= 0) {
                isValid = false;
                message = 'Valor deve ser maior que zero';
            }
        }
        
        if (field === this.elements.dataVencimento) {
            const data = new Date(field.value);
            if (isNaN(data.getTime())) {
                isValid = false;
                message = 'Data inválida';
            }
        }
        
        // Aplicar estilo de validação
        if (isValid) {
            group.classList.remove('has-error');
            group.classList.add('has-success');
            this.removeFieldError(fieldName);
        } else {
            group.classList.remove('has-success');
            group.classList.add('has-error');
            this.setFieldError(fieldName, message);
        }
        
        return isValid;
    }
    
    /**
     * Limpa erro de um campo
     */
    clearFieldError(field) {
        const group = field.closest('.form-group');
        group.classList.remove('has-error');
        this.removeFieldError(field.id);
    }
    
    /**
     * Define erro para um campo
     */
    setFieldError(fieldName, message) {
        this.state.errors[fieldName] = message;
        this.showFieldError(fieldName, message);
    }
    
    /**
     * Remove erro de um campo
     */
    removeFieldError(fieldName) {
        delete this.state.errors[fieldName];
        this.hideFieldError(fieldName);
    }
    
    /**
     * Mostra mensagem de erro em um campo
     */
    showFieldError(fieldName, message) {
        const field = document.getElementById(fieldName);
        if (!field) return;
        
        const group = field.closest('.form-group');
        let errorDiv = group.querySelector('.form-error-message');
        
        if (!errorDiv) {
            errorDiv = document.createElement('div');
            errorDiv.className = 'form-error-message';
            group.appendChild(errorDiv);
        }
        
        errorDiv.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;
    }
    
    /**
     * Oculta mensagem de erro de um campo
     */
    hideFieldError(fieldName) {
        const field = document.getElementById(fieldName);
        if (!field) return;
        
        const group = field.closest('.form-group');
        const errorDiv = group.querySelector('.form-error-message');
        if (errorDiv) {
            errorDiv.remove();
        }
    }
    
    /**
     * Executa busca de transações
     */
    async executarBusca() {
        try {
            this.setLoading(true);
            
            const filtros = {
                id: this.elements.searchId.value,
                titulo: this.elements.searchTitulo.value,
                fornecedor: this.elements.searchFornecedor.value,
                valor: this.elements.searchValor.value
            };
            
            // Remove campos vazios
            Object.keys(filtros).forEach(key => {
                if (!filtros[key]) delete filtros[key];
            });
            
            if (Object.keys(filtros).length === 0) {
                this.showAlert('Preencha pelo menos um campo de busca', 'warning');
                return;
            }
            
            const response = await fetch('/api/transacoes/buscar-edicao', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(filtros)
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.state.searchResults = result.data;
                this.renderSearchResults();
            } else {
                throw new Error(result.message || 'Erro na busca');
            }
            
        } catch (error) {
            console.error('Erro na busca:', error);
            this.showAlert('Erro ao buscar transações', 'error');
        } finally {
            this.setLoading(false);
        }
    }
    
    /**
     * Renderiza resultados da busca
     */
    renderSearchResults() {
        const container = this.elements.searchResultsContent;
        const results = this.state.searchResults;
        
        if (!results || results.length === 0) {
            container.innerHTML = '<div class="search-result-item">Nenhuma transação encontrada</div>';
            this.elements.searchResults.style.display = 'block';
            return;
        }
        
        container.innerHTML = results.map(item => `
            <div class="search-result-item" data-id="${item.id}">
                <div class="search-result-title">${item.titulo}</div>
                <div class="search-result-details">
                    <span>ID: ${item.id}</span>
                    <span>Fornecedor: ${item.fornecedor_nome || 'N/A'}</span>
                    <span class="search-result-value">R$ ${parseFloat(item.valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    <span class="search-result-status status-${(item.status_pagamento || '').toLowerCase().replace(' ', '-')}">${item.status_pagamento}</span>
                </div>
            </div>
        `).join('');
        
        // Adicionar event listeners
        container.querySelectorAll('.search-result-item').forEach(item => {
            item.addEventListener('click', () => this.selectSearchResult(item.dataset.id));
        });
        
        this.elements.searchResults.style.display = 'block';
    }
    
    /**
     * Seleciona resultado da busca
     */
    async selectSearchResult(id) {
        try {
            this.state.transacaoId = parseInt(id);
            this.state.mode = 'edit';
            
            await this.loadTransacaoData();
            this.setupModeInterface();
            
            this.elements.searchSection.style.display = 'none';
            this.elements.mainSection.style.display = 'block';
            
        } catch (error) {
            console.error('Erro ao selecionar transação:', error);
            this.showAlert('Erro ao carregar dados da transação', 'error');
        }
    }
    
    /**
     * Carrega histórico de alterações
     */
    async loadHistorico() {
        try {
            const response = await fetch(`/api/transacao/${this.state.transacaoId}/historico`);
            const result = await response.json();
            
            if (result.success && result.data.length > 0) {
                this.renderHistorico(result.data);
            } else {
                this.elements.historicoContent.innerHTML = '<div class="historico-item">Nenhuma alteração registrada</div>';
            }
            
        } catch (error) {
            console.error('Erro ao carregar histórico:', error);
            this.elements.historicoContent.innerHTML = '<div class="historico-item">Erro ao carregar histórico</div>';
        }
    }
    
    /**
     * Renderiza histórico de alterações
     */
    renderHistorico(historico) {
        this.elements.historicoContent.innerHTML = historico.map(item => `
            <div class="historico-item">
                <span class="historico-data">${this.formatDate(item.data_acao)}</span> - 
                <span class="historico-usuario">${item.usuario_nome}</span> 
                <span class="historico-acao">${item.acao}</span>
                ${item.observacoes ? `<br><small>${item.observacoes}</small>` : ''}
            </div>
        `).join('');
    }
    
    /**
     * Gerencia o clique do botão de baixa baseado no modo atual
     */
    handleBaixaButtonClick() {
        console.log('🎯 Botão baixa clicado - Modo atual:', this.state.mode);
        
        if (this.state.mode === 'baixa') {
            // Se já está no modo baixa, executa a baixa
            console.log('💰 Executando baixa da transação...');
            this.realizarBaixa();
        } else {
            // Se está em outro modo, abre o modal de baixa
            console.log('📋 Abrindo modal de baixa...');
            this.abrirModalBaixa();
        }
    }
    
    /**
     * Abre modal de baixa a partir do modo edição
     */
    async abrirModalBaixa() {
        console.log('💳 Abrindo modal de baixa...');
        
        // Verificar se transação já foi paga
        const statusPagamento = this.elements.statusPagamento.value;
        if (statusPagamento && statusPagamento.toLowerCase() === 'realizado') {
            this.showAlert('Esta transação já foi realizada', 'warning');
            return;
        }
        
        // Mudar para modo baixa
        this.state.mode = 'baixa';
        
        // Reconfigurar interface
        this.setupModeInterface();
        
        // Carregar contas bancárias se ainda não foram carregadas
        await this.loadContasBancarias();
        
        // Focar no primeiro campo de baixa
        setTimeout(() => {
            if (this.elements.baixaDataPagamento) {
                this.elements.baixaDataPagamento.focus();
            }
        }, 100);
    }
    
    /**
     * Verifica se os selects estão carregados e recarrega se necessário
     */
    async verificarSelectsCarregados() {
        console.log('🔍 Verificando se selects estão carregados...');
        
        const selects = [
            { element: this.elements.empresa, name: 'Empresa' },
            { element: this.elements.fornecedor, name: 'Fornecedor' },
            { element: this.elements.plano, name: 'Plano Financeiro' },
            { element: this.elements.centro, name: 'Centro de Custo' }
        ];
        
        let precisaRecarregar = false;
        
        selects.forEach(select => {
            const optionsCount = select.element?.options?.length || 0;
            const temCarregando = select.element?.innerHTML?.includes('Carregando') || false;
            const temSelecione = select.element?.innerHTML?.includes('Selecione') || false;
            
            console.log(`   • ${select.name}: ${optionsCount} opções, carregando: ${temCarregando}, selecione: ${temSelecione}`);
            
            if (optionsCount <= 1 || temCarregando) {
                console.warn(`   ⚠️ ${select.name} precisa ser recarregado`);
                precisaRecarregar = true;
            }
        });
        
        if (precisaRecarregar) {
            console.log('🔄 Recarregando dados dos selects...');
            await this.loadSelectOptions();
        } else {
            console.log('✅ Todos os selects estão carregados');
        }
    }
    
    /**
     * Gera título automático para nova transação
     */
    async gerarTituloAutomatico() {
        try {
            console.log('🔤 Gerando título automático...');
            
            // Buscar próximo ID
            const response = await fetch('/api/transacao/proximo-id');
            if (response.ok) {
                const data = await response.json();
                const proximoId = data.proximo_id || 'NOVO';
                const titulo = `ID-${proximoId}`;
                
                console.log(`✅ Título gerado: ${titulo}`);
                this.elements.titulo.value = titulo;
            } else {
                // Fallback se API não existir
                const titulo = `ID-${Date.now()}`;
                console.log(`⚠️  Usando fallback: ${titulo}`);
                this.elements.titulo.value = titulo;
            }
            
        } catch (error) {
            console.error('❌ Erro ao gerar título:', error);
            // Fallback com timestamp
            const titulo = `ID-${Date.now()}`;
            this.elements.titulo.value = titulo;
        }
    }
    
    /**
     * Carrega contas bancárias especificamente para o modo baixa
     */
    async loadContasBancarias() {
        try {
            console.log('🏦 Carregando contas bancárias para baixa...');
            
            if (!this.elements.baixaContaBancaria) {
                console.warn('⚠️ Elemento baixaContaBancaria não encontrado');
                return;
            }
            
            // Mostrar loading
            this.elements.baixaContaBancaria.innerHTML = '<option value="">Carregando contas...</option>';
            
            const response = await fetch('/api/contas-bancarias');
            console.log('📡 Status da API contas-bancarias:', response.status);
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ Erro na API contas-bancarias:', response.status, errorText);
                this.elements.baixaContaBancaria.innerHTML = '<option value="">Erro ao carregar contas</option>';
                return;
            }
            
            const data = await response.json();
            console.log('📋 Dados das contas recebidos:', data);
            
            const contas = data.data || data;
            
            if (contas && contas.length > 0) {
                console.log(`✅ ${contas.length} contas ativas encontradas`);
                
                // Limpar e preencher select
                this.elements.baixaContaBancaria.innerHTML = '<option value="">Selecione uma conta...</option>';
                
                contas.forEach(conta => {
                    const option = document.createElement('option');
                    option.value = conta.id;
                    
                    const banco = (conta.banco || 'N/A').substring(0, 30);
                    const agencia = conta.agencia || 'N/A';
                    const contaNum = conta.conta || 'N/A';
                    const empresa = conta.empresa ? ` (${conta.empresa.substring(0, 15)})` : '';
                    
                    option.textContent = `${banco} - Ag: ${agencia} - CC: ${contaNum}${empresa}`;
                    this.elements.baixaContaBancaria.appendChild(option);
                    
                    console.log(`   • Conta ${conta.id}: ${option.textContent}`);
                });
                
            } else {
                console.warn('⚠️ Nenhuma conta ativa encontrada');
                this.elements.baixaContaBancaria.innerHTML = '<option value="">Nenhuma conta ativa encontrada</option>';
            }
            
        } catch (error) {
            console.error('❌ Erro ao carregar contas bancárias:', error);
            if (this.elements.baixaContaBancaria) {
                this.elements.baixaContaBancaria.innerHTML = '<option value="">Erro ao carregar contas</option>';
            }
        }
    }
    
    /**
     * Valida formulário completo
     */
    validateForm() {
        const requiredFields = [
            this.elements.titulo, this.elements.fornecedor, this.elements.empresa,
            this.elements.plano, this.elements.centro, this.elements.tipo,
            this.elements.valor, this.elements.dataVencimento
        ];
        
        let isValid = true;
        
        requiredFields.forEach(field => {
            if (field && !this.validateField(field)) {
                isValid = false;
            }
        });
        
        return isValid;
    }
    
    /**
     * Salva transação
     */
    async salvar() {
        try {
            if (!this.validateForm()) {
                this.showAlert('Corrija os erros antes de salvar', 'error');
                return;
            }
            
            this.setLoading(true);
            
            const data = this.getFormData();
            const url = this.state.mode === 'create' ? '/api/transacao' : `/api/transacao/${this.state.transacaoId}`;
            const method = this.state.mode === 'create' ? 'POST' : 'PUT';
            
            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.showAlert('Transação salva com sucesso!', 'success');
                
                if (this.options.onSave) {
                    this.options.onSave(result.data);
                }
                
                setTimeout(() => this.close(), 1500);
            } else {
                throw new Error(result.message || 'Erro ao salvar transação');
            }
            
        } catch (error) {
            console.error('Erro ao salvar:', error);
            this.showAlert('Erro ao salvar transação', 'error');
        } finally {
            this.setLoading(false);
        }
    }
    
    /**
     * Realiza baixa da transação
     */
    async realizarBaixa() {
        try {
            console.log('💰 Iniciando processo de baixa...');
            
            console.log('🔍 Validando formulário de baixa...');
            if (!this.validateBaixaForm()) {
                console.error('❌ Validação do formulário falhou');
                this.showAlert('Corrija os erros antes de confirmar a baixa', 'error');
                return;
            }
            console.log('✅ Formulário de baixa validado');
            
            this.setLoading(true);
            
            const data = this.getBaixaFormData();
            console.log('📋 Dados da baixa coletados:', data);
            
            const url = `/api/transacao/${this.state.transacaoId}/baixa`;
            console.log('📡 Fazendo requisição para:', url);
            
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            
            console.log('📈 Status da resposta:', response.status);
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ Erro HTTP:', response.status, errorText);
                throw new Error(`Erro ${response.status}: ${errorText}`);
            }
            
            const result = await response.json();
            console.log('📋 Resultado da API:', result);
            
            if (result.success) {
                console.log('✅ Baixa realizada com sucesso!');
                this.showAlert('Baixa realizada com sucesso!', 'success');
                
                if (this.options.onSave) {
                    console.log('🔄 Chamando callback onSave...');
                    this.options.onSave(result.data);
                }
                
                console.log('⏰ Fechando modal em 1.5 segundos...');
                setTimeout(() => this.close(), 1500);
            } else {
                console.error('❌ API retornou erro:', result.message);
                throw new Error(result.message || 'Erro ao realizar baixa');
            }
            
        } catch (error) {
            console.error('❌ Erro ao realizar baixa:', error);
            this.showAlert(`Erro ao realizar baixa: ${error.message}`, 'error');
        } finally {
            this.setLoading(false);
        }
    }
    
    /**
     * Valida formulário de baixa
     */
    validateBaixaForm() {
        console.log('🔍 Iniciando validação do formulário de baixa...');
        
        const requiredFields = [
            { element: this.elements.baixaDataPagamento, name: 'Data de Pagamento' },
            { element: this.elements.baixaValorPago, name: 'Valor Pago' }
        ];
        
        let isValid = true;
        
        // Verificar campos obrigatórios
        requiredFields.forEach(field => {
            console.log(`   • Validando ${field.name}:`, field.element?.value);
            if (!field.element || !field.element.value.trim()) {
                console.error(`   ❌ ${field.name} está vazio`);
                if (field.element) {
                    this.setFieldError(field.element.id, 'Campo obrigatório');
                }
                isValid = false;
            } else {
                console.log(`   ✅ ${field.name} OK`);
            }
        });
        
        // Validar valor pago
        const valorOriginal = parseFloat(this.elements.valor.value) || 0;
        const valorPago = parseFloat(this.elements.baixaValorPago.value) || 0;
        
        console.log(`   • Valor original: R$ ${valorOriginal}`);
        console.log(`   • Valor pago: R$ ${valorPago}`);
        console.log(`   • Baixa parcial: ${this.state.isBaixaParcial}`);
        
        if (valorPago <= 0) {
            console.error('   ❌ Valor pago deve ser maior que zero');
            this.setFieldError('baixa-valor-pago', 'Valor deve ser maior que zero');
            isValid = false;
        }
        
        if (!this.state.isBaixaParcial && valorPago > valorOriginal) {
            console.error('   ❌ Valor pago maior que o original');
            this.setFieldError('baixa-valor-pago', 'Valor pago não pode ser maior que o valor original');
            isValid = false;
        }
        
        console.log(`🎯 Validação concluída: ${isValid ? 'PASSOU' : 'FALHOU'}`);
        return isValid;
    }
    
    /**
     * Coleta dados do formulário principal
     */
    getFormData() {
        const baseData = {
            titulo: this.elements.titulo.value.trim(),
            numero_documento: this.elements.numeroDocumento.value.trim(),
            cliente_fornecedor_id: parseInt(this.elements.fornecedor.value) || null,
            empresa_id: parseInt(this.elements.empresa.value) || null,
            plano_financeiro_id: parseInt(this.elements.plano.value) || null,
            centro_custo_id: parseInt(this.elements.centro.value) || null,
            tipo: this.elements.tipo.value,
            valor: parseFloat(this.elements.valor.value) || 0,
            data_vencimento: this.elements.dataVencimento.value,
            observacao: this.elements.observacoes.value.trim()
        };
        
        // Para modo create, definir status padrão
        if (this.state.mode === 'create') {
            baseData.status_negociacao = 'NÃO NEGOCIADO';
            
            // Definir status_pagamento baseado na data de vencimento
            const hoje = new Date().toISOString().split('T')[0];
            const dataVencimento = this.elements.dataVencimento.value;
            
            if (dataVencimento && dataVencimento < hoje) {
                baseData.status_pagamento = 'Atrasado';
            } else {
                baseData.status_pagamento = 'Previsao';
            }
            
            console.log('📋 Status definidos automaticamente:', {
                status_negociacao: baseData.status_negociacao,
                status_pagamento: baseData.status_pagamento
            });
        } else {
            // Para modo edit, usar valores dos campos (se existirem)
            baseData.status_negociacao = this.elements.statusNegociacao?.value || 'NÃO NEGOCIADO';
            baseData.status_pagamento = this.elements.statusPagamento?.value || 'Previsao';
        }
        
        return baseData;
    }
    
    /**
     * Coleta dados do formulário de baixa
     */
    getBaixaFormData() {
        return {
            data_pagamento: this.elements.baixaDataPagamento.value,
            valor_pago: parseFloat(this.elements.baixaValorPago.value) || 0,
            conta_bancaria_id: parseInt(this.elements.baixaContaBancaria.value) || null,
            observacao_baixa: this.elements.baixaObservacoes.value.trim(),
            baixa_parcial: this.state.isBaixaParcial
        };
    }
    
    /**
     * Mostra alerta
     */
    showAlert(message, type = 'info') {
        const alertHTML = `
            <div class="form-alert form-alert-${type}">
                <i class="fas fa-${this.getAlertIcon(type)}"></i>
                ${message}
            </div>
        `;
        
        this.elements.alerts.innerHTML = alertHTML;
        
        // Auto-remove após 5 segundos
        setTimeout(() => {
            if (this.elements.alerts) {
                this.elements.alerts.innerHTML = '';
            }
        }, 5000);
    }
    
    /**
     * Retorna ícone do alerta
     */
    getAlertIcon(type) {
        const icons = {
            success: 'check-circle',
            error: 'exclamation-triangle',
            warning: 'exclamation-circle',
            info: 'info-circle'
        };
        return icons[type] || 'info-circle';
    }
    
    /**
     * Define estado de loading
     */
    setLoading(loading) {
        this.state.isLoading = loading;
        
        const buttons = [this.elements.btnSalvar, this.elements.btnBaixa, this.elements.btnExecutarBusca];
        
        buttons.forEach(btn => {
            if (btn) {
                if (loading) {
                    btn.disabled = true;
                    btn.classList.add('btn-form-loading');
                } else {
                    btn.disabled = false;
                    btn.classList.remove('btn-form-loading');
                }
            }
        });
        
        if (loading) {
            this.elements.modal.classList.add('form-loading');
        } else {
            this.elements.modal.classList.remove('form-loading');
        }
    }
    
    /**
     * Formata data para exibição
     */
    formatDate(dateString) {
        if (!dateString) return '';
        
        const date = new Date(dateString);
        return date.toLocaleString('pt-BR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
    
    /**
     * Abre o modal
     */
    open() {
        this.elements.modal.style.display = 'block';
        document.body.style.overflow = 'hidden'; // Previne scroll da página
    }
    
    /**
     * Fecha o modal
     */
    close() {
        this.elements.modal.style.display = 'none';
        document.body.style.overflow = ''; // Restaura scroll da página
        
        if (this.options.onCancel) {
            this.options.onCancel();
        }
        
        // Cleanup
        this.elements.modal.remove();
    }
    
    /**
     * Destroi o componente
     */
    destroy() {
        if (this.elements.modal) {
            this.elements.modal.remove();
        }
        document.body.style.overflow = '';
    }
}

// Export para uso global
window.TransacaoForm = TransacaoForm;