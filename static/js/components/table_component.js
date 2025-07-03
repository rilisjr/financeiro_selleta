/**
 * TableComponent v1.0
 * ===================
 * Componente reutilizável de tabela com funcionalidades avançadas
 * 
 * Features:
 * - Renderização otimizada com Document Fragment
 * - Sistema de formatação extensível
 * - Ordenação com feedback visual
 * - Seleção múltipla com ações em lote
 * - Column Visibility Manager
 * - Responsive System com breakpoints
 * - Persistência no localStorage
 * - Column Profiles (presets)
 * - Smart Priority System
 */

class TableComponent {
    constructor(containerId, config = {}) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            throw new Error(`Container #${containerId} não encontrado`);
        }
        
        // Configuração padrão
        this.config = {
            id: config.id || 'table_' + Date.now(),
            columns: config.columns || [],
            data: config.data || [],
            options: {
                selectable: config.options?.selectable !== false,
                multiSelect: config.options?.multiSelect !== false,
                sortable: config.options?.sortable !== false,
                responsive: config.options?.responsive !== false,
                persistState: config.options?.persistState !== false,
                emptyMessage: config.options?.emptyMessage || 'Nenhum registro encontrado',
                loadingMessage: config.options?.loadingMessage || 'Carregando...',
                ...config.options
            },
            callbacks: {
                onSort: config.callbacks?.onSort || null,
                onSelect: config.callbacks?.onSelect || null,
                onAction: config.callbacks?.onAction || null,
                onColumnToggle: config.callbacks?.onColumnToggle || null,
                ...config.callbacks
            },
            columnProfiles: config.columnProfiles || {
                'compact': [],
                'complete': [],
                'mobile': []
            },
            responsiveBreakpoints: config.responsiveBreakpoints || {
                mobile: 576,
                tablet: 768,
                desktop: 1024
            }
        };
        
        // Estado interno
        this.state = {
            sortColumn: null,
            sortDirection: 'asc',
            selectedRows: new Set(),
            visibleColumns: new Set(),
            columnWidths: new Map(),
            currentProfile: 'complete',
            isLoading: false
        };
        
        // Formatadores
        this.formatters = new TableFormatters();
        
        // Gerenciador de colunas
        this.columnManager = new ColumnManager(this);
        
        // Inicializar
        this.init();
    }
    
    init() {
        // Carregar estado persistido
        if (this.config.options.persistState) {
            this.loadPersistedState();
        }
        
        // Configurar colunas visíveis iniciais
        this.setupInitialColumns();
        
        // Criar estrutura HTML
        this.createStructure();
        
        // Configurar event listeners
        this.setupEventListeners();
        
        // Renderizar dados iniciais
        if (this.config.data.length > 0) {
            this.render();
        }
    }
    
    setupInitialColumns() {
        // Se não há colunas visíveis salvas, usar configuração padrão
        if (this.state.visibleColumns.size === 0) {
            this.config.columns.forEach(col => {
                if (col.defaultVisible !== false) {
                    this.state.visibleColumns.add(col.id);
                }
            });
        }
    }
    
    createStructure() {
        this.container.innerHTML = `
            <div class="table-component" id="${this.config.id}">
                <!-- Header Tools -->
                <div class="table-header-tools">
                    <div class="table-search">
                        <input type="text" class="table-search-input" placeholder="Buscar...">
                        <i class="fas fa-search"></i>
                    </div>
                    
                    <div class="table-actions">
                        ${this.config.options.multiSelect ? `
                        <div class="bulk-actions" style="display: none;">
                            <span class="selected-count">0 selecionados</span>
                            <button class="btn btn-sm btn-secondary" data-action="deselect-all">
                                <i class="fas fa-times"></i> Limpar
                            </button>
                            <div class="bulk-action-buttons"></div>
                        </div>
                        ` : ''}
                        
                        <div class="table-tools">
                            <button class="btn-icon" title="Configurar colunas" data-action="column-settings">
                                <i class="fas fa-cog"></i>
                            </button>
                            <button class="btn-icon" title="Exportar" data-action="export">
                                <i class="fas fa-download"></i>
                            </button>
                            <button class="btn-icon" title="Atualizar" data-action="refresh">
                                <i class="fas fa-sync-alt"></i>
                            </button>
                        </div>
                    </div>
                </div>
                
                <!-- Column Toggle Bar -->
                <div class="column-toggle-bar" style="display: none;">
                    <div class="column-profiles">
                        <label>Perfis:</label>
                        <select class="profile-selector">
                            <option value="custom">Personalizado</option>
                            <option value="compact">Compacto</option>
                            <option value="complete">Completo</option>
                            <option value="mobile">Mobile</option>
                        </select>
                    </div>
                    <div class="column-chips"></div>
                </div>
                
                <!-- Table Container -->
                <div class="table-container">
                    <table class="data-table">
                        <thead></thead>
                        <tbody></tbody>
                    </table>
                </div>
                
                <!-- Loading Overlay -->
                <div class="table-loading" style="display: none;">
                    <div class="loading-spinner">
                        <i class="fas fa-spinner fa-spin"></i>
                        <p>${this.config.options.loadingMessage}</p>
                    </div>
                </div>
                
                <!-- Empty State -->
                <div class="table-empty" style="display: none;">
                    <i class="fas fa-inbox"></i>
                    <p>${this.config.options.emptyMessage}</p>
                </div>
                
                <!-- Column Settings Modal -->
                <div class="column-settings-modal" style="display: none;">
                    <div class="modal-backdrop"></div>
                    <div class="modal-content">
                        <div class="modal-header">
                            <h3>Configurar Colunas</h3>
                            <button class="modal-close">&times;</button>
                        </div>
                        <div class="modal-body">
                            <div class="column-list"></div>
                        </div>
                        <div class="modal-footer">
                            <button class="btn btn-secondary" data-action="reset-columns">Restaurar Padrão</button>
                            <button class="btn btn-primary" data-action="apply-columns">Aplicar</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Guardar referências
        this.elements = {
            table: this.container.querySelector('.data-table'),
            thead: this.container.querySelector('thead'),
            tbody: this.container.querySelector('tbody'),
            searchInput: this.container.querySelector('.table-search-input'),
            bulkActions: this.container.querySelector('.bulk-actions'),
            selectedCount: this.container.querySelector('.selected-count'),
            columnToggleBar: this.container.querySelector('.column-toggle-bar'),
            columnChips: this.container.querySelector('.column-chips'),
            profileSelector: this.container.querySelector('.profile-selector'),
            loadingOverlay: this.container.querySelector('.table-loading'),
            emptyState: this.container.querySelector('.table-empty'),
            columnModal: this.container.querySelector('.column-settings-modal'),
            columnList: this.container.querySelector('.column-list')
        };
    }
    
    setupEventListeners() {
        // Delegação de eventos
        this.container.addEventListener('click', (e) => {
            // Ordenação
            if (e.target.closest('.sortable')) {
                const th = e.target.closest('th');
                console.log('🎯 Click em header sortable:', th.dataset.column);
                this.handleSort(th.dataset.column);
            }
            
            // Seleção de linha
            if (e.target.closest('.row-checkbox')) {
                const checkbox = e.target.closest('.row-checkbox');
                this.handleRowSelect(checkbox.value, checkbox.checked);
            }
            
            // Select all
            if (e.target.closest('.select-all-checkbox')) {
                const checkbox = e.target.closest('.select-all-checkbox');
                this.handleSelectAll(checkbox.checked);
            }
            
            // Ações
            if (e.target.closest('[data-action]')) {
                const action = e.target.closest('[data-action]').dataset.action;
                this.handleAction(action, e);
            }
            
            // Column chip toggle
            if (e.target.closest('.column-chip')) {
                const chip = e.target.closest('.column-chip');
                this.columnManager.toggleColumn(chip.dataset.column);
            }
        });
        
        // Busca
        let searchTimeout;
        this.elements.searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                this.handleSearch(e.target.value);
            }, 300);
        });
        
        // Profile selector
        this.elements.profileSelector.addEventListener('change', (e) => {
            this.columnManager.applyProfile(e.target.value);
        });
        
        // Resize de colunas
        this.setupColumnResize();
        
        // Responsive
        if (this.config.options.responsive) {
            this.setupResponsive();
        }
    }
    
    render() {
        this.showLoading(true);
        
        try {
            // Limpar tbody
            this.elements.tbody.innerHTML = '';
            
            // Renderizar header
            this.renderHeader();
            
            // Renderizar dados
            if (this.config.data.length === 0) {
                this.showEmpty(true);
                return;
            }
            
            this.showEmpty(false);
            
            // Usar Document Fragment para performance
            const fragment = document.createDocumentFragment();
            
            this.config.data.forEach((row, index) => {
                const tr = this.renderRow(row, index);
                fragment.appendChild(tr);
            });
            
            this.elements.tbody.appendChild(fragment);
            
            // Atualizar UI
            this.updateBulkActions();
            this.columnManager.updateColumnChips();
            
        } finally {
            this.showLoading(false);
        }
    }
    
    renderHeader() {
        const visibleColumns = this.getVisibleColumns();
        
        const headerHTML = `
            <tr>
                ${this.config.options.multiSelect ? `
                <th class="checkbox-column">
                    <input type="checkbox" class="select-all-checkbox">
                </th>
                ` : ''}
                ${visibleColumns.map(col => `
                <th class="${col.sortable ? 'sortable' : ''} ${col.className || ''}" 
                    data-column="${col.id}"
                    ${col.width ? `style="width: ${col.width}"` : ''}>
                    <div class="th-content">
                        <span>${col.label}</span>
                        ${col.sortable ? `
                        <div class="sort-icons">
                            <i class="fas fa-sort${this.state.sortColumn === col.id ? 
                                (this.state.sortDirection === 'asc' ? '-up active' : '-down active') : 
                                ''}"></i>
                        </div>
                        ` : ''}
                    </div>
                    ${col.resizable !== false ? '<div class="column-resize-handle"></div>' : ''}
                </th>
                `).join('')}
            </tr>
        `;
        
        this.elements.thead.innerHTML = headerHTML;
    }
    
    renderRow(rowData, index) {
        const tr = document.createElement('tr');
        tr.dataset.index = index;
        tr.dataset.id = rowData.id || index;
        
        // Adicionar classes baseadas no tipo da transação
        if (rowData.tipo) {
            if (rowData.tipo === 'Entrada') {
                tr.classList.add('tipo-entrada');
            } else if (rowData.tipo === 'Saída') {
                tr.classList.add('tipo-saida');
            }
        }
        
        const visibleColumns = this.getVisibleColumns();
        
        // Checkbox column
        if (this.config.options.multiSelect) {
            const td = document.createElement('td');
            td.className = 'checkbox-column';
            td.innerHTML = `<input type="checkbox" class="row-checkbox" value="${rowData.id || index}">`;
            tr.appendChild(td);
        }
        
        // Data columns
        visibleColumns.forEach(col => {
            const td = document.createElement('td');
            td.className = col.className || '';
            
            // Obter valor
            let value = this.getNestedValue(rowData, col.id);
            
            // Aplicar formatador
            if (col.formatter) {
                if (typeof col.formatter === 'function') {
                    value = col.formatter(value, rowData, col);
                } else if (this.formatters[col.formatter]) {
                    value = this.formatters[col.formatter](value, rowData, col);
                }
            }
            
            td.innerHTML = value || '-';
            tr.appendChild(td);
        });
        
        // Aplicar classe se selecionada
        if (this.state.selectedRows.has(String(rowData.id || index))) {
            tr.classList.add('selected');
            tr.querySelector('.row-checkbox').checked = true;
        }
        
        return tr;
    }
    
    getVisibleColumns() {
        return this.config.columns.filter(col => 
            this.state.visibleColumns.has(col.id) && 
            col.alwaysHidden !== true
        );
    }
    
    getNestedValue(obj, path) {
        return path.split('.').reduce((curr, prop) => curr?.[prop], obj);
    }
    
    handleSort(columnId) {
        console.log('🔄 handleSort chamado para:', columnId);
        
        if (!this.config.options.sortable) {
            console.log('❌ Ordenação desabilitada');
            return;
        }
        
        const column = this.config.columns.find(col => col.id === columnId);
        if (!column || !column.sortable) {
            console.log('❌ Coluna não encontrada ou não ordenável:', columnId);
            return;
        }
        
        // Alternar direção
        if (this.state.sortColumn === columnId) {
            this.state.sortDirection = this.state.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            this.state.sortColumn = columnId;
            this.state.sortDirection = 'asc';
        }
        
        // Callback ou sort interno
        if (this.config.callbacks.onSort) {
            console.log('📊 Chamando callback onSort com:', columnId, this.state.sortDirection);
            this.config.callbacks.onSort(columnId, this.state.sortDirection);
            // NÃO renderizar aqui - deixar o callback fazer isso após receber dados da API
        } else {
            this.sortDataInternal();
            this.render();
        }
        
        this.saveState();
    }
    
    sortDataInternal() {
        const column = this.config.columns.find(col => col.id === this.state.sortColumn);
        if (!column) return;
        
        this.config.data.sort((a, b) => {
            let valA = this.getNestedValue(a, column.id);
            let valB = this.getNestedValue(b, column.id);
            
            // Aplicar comparador customizado
            if (column.sorter) {
                return column.sorter(valA, valB, a, b) * (this.state.sortDirection === 'asc' ? 1 : -1);
            }
            
            // Comparação padrão
            if (valA === valB) return 0;
            if (valA === null || valA === undefined) return 1;
            if (valB === null || valB === undefined) return -1;
            
            // Números
            if (typeof valA === 'number' && typeof valB === 'number') {
                return (valA - valB) * (this.state.sortDirection === 'asc' ? 1 : -1);
            }
            
            // Strings
            return String(valA).localeCompare(String(valB)) * (this.state.sortDirection === 'asc' ? 1 : -1);
        });
    }
    
    handleRowSelect(rowId, selected) {
        if (selected) {
            this.state.selectedRows.add(String(rowId));
        } else {
            this.state.selectedRows.delete(String(rowId));
        }
        
        // Atualizar visual
        const tr = this.elements.tbody.querySelector(`tr[data-id="${rowId}"]`);
        if (tr) {
            tr.classList.toggle('selected', selected);
        }
        
        this.updateBulkActions();
        
        // Callback
        if (this.config.callbacks.onSelect) {
            this.config.callbacks.onSelect(Array.from(this.state.selectedRows));
        }
    }
    
    handleSelectAll(selected) {
        const checkboxes = this.elements.tbody.querySelectorAll('.row-checkbox');
        
        checkboxes.forEach(checkbox => {
            checkbox.checked = selected;
            this.handleRowSelect(checkbox.value, selected);
        });
    }
    
    handleSearch(query) {
        console.log('🔍 handleSearch chamado com:', query);
        
        // Delegar para o callback
        if (this.config.callbacks.onSearch) {
            this.config.callbacks.onSearch(query);
        } else {
            console.log('⚠️ Callback onSearch não configurado');
        }
    }
    
    handleAction(action, event) {
        switch (action) {
            case 'column-settings':
                this.columnManager.showSettings();
                break;
                
            case 'export':
                this.exportData();
                break;
                
            case 'refresh':
                if (this.config.callbacks.onRefresh) {
                    this.config.callbacks.onRefresh();
                }
                break;
                
            case 'deselect-all':
                this.handleSelectAll(false);
                break;
                
            default:
                if (this.config.callbacks.onAction) {
                    this.config.callbacks.onAction(action, this.getSelectedData());
                }
        }
    }
    
    updateBulkActions() {
        if (!this.config.options.multiSelect) return;
        
        const count = this.state.selectedRows.size;
        this.elements.selectedCount.textContent = `${count} selecionado${count !== 1 ? 's' : ''}`;
        this.elements.bulkActions.style.display = count > 0 ? 'flex' : 'none';
        
        // Atualizar checkbox do header
        const selectAll = this.elements.thead.querySelector('.select-all-checkbox');
        if (selectAll) {
            const totalRows = this.elements.tbody.querySelectorAll('tr').length;
            selectAll.checked = count === totalRows && totalRows > 0;
            selectAll.indeterminate = count > 0 && count < totalRows;
        }
    }
    
    getSelectedData() {
        return this.config.data.filter(row => 
            this.state.selectedRows.has(String(row.id))
        );
    }
    
    showLoading(show) {
        this.state.isLoading = show;
        this.elements.loadingOverlay.style.display = show ? 'flex' : 'none';
    }
    
    showEmpty(show) {
        this.elements.emptyState.style.display = show ? 'flex' : 'none';
        this.elements.table.style.display = show ? 'none' : 'table';
    }
    
    setupColumnResize() {
        let resizing = false;
        let startX = 0;
        let startWidth = 0;
        let resizeColumn = null;
        
        this.elements.thead.addEventListener('mousedown', (e) => {
            if (e.target.classList.contains('column-resize-handle')) {
                resizing = true;
                resizeColumn = e.target.closest('th');
                startX = e.pageX;
                startWidth = resizeColumn.offsetWidth;
                
                document.body.style.cursor = 'col-resize';
                e.preventDefault();
            }
        });
        
        document.addEventListener('mousemove', (e) => {
            if (!resizing) return;
            
            const width = startWidth + (e.pageX - startX);
            if (width > 50) {
                resizeColumn.style.width = width + 'px';
                this.state.columnWidths.set(resizeColumn.dataset.column, width);
            }
        });
        
        document.addEventListener('mouseup', () => {
            if (resizing) {
                resizing = false;
                document.body.style.cursor = '';
                this.saveState();
            }
        });
    }
    
    setupResponsive() {
        const checkBreakpoint = () => {
            const width = window.innerWidth;
            let newProfile = 'desktop';
            
            if (width <= this.config.responsiveBreakpoints.mobile) {
                newProfile = 'mobile';
            } else if (width <= this.config.responsiveBreakpoints.tablet) {
                newProfile = 'tablet';
            }
            
            // Aplicar perfil responsivo se mudou
            if (newProfile !== this.state.currentResponsive) {
                this.state.currentResponsive = newProfile;
                
                if (this.config.columnProfiles[newProfile]) {
                    this.columnManager.applyProfile(newProfile);
                }
            }
        };
        
        // Check inicial
        checkBreakpoint();
        
        // Debounce resize
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(checkBreakpoint, 150);
        });
    }
    
    exportData() {
        const visibleColumns = this.getVisibleColumns();
        const selectedData = this.state.selectedRows.size > 0 ? 
            this.getSelectedData() : this.config.data;
        
        // Preparar dados para export
        const exportData = selectedData.map(row => {
            const exportRow = {};
            visibleColumns.forEach(col => {
                let value = this.getNestedValue(row, col.id);
                
                // Remover HTML se houver
                if (typeof value === 'string' && value.includes('<')) {
                    const temp = document.createElement('div');
                    temp.innerHTML = value;
                    value = temp.textContent || temp.innerText;
                }
                
                exportRow[col.label] = value;
            });
            return exportRow;
        });
        
        // Converter para CSV
        const csv = this.convertToCSV(exportData);
        
        // Download
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.setAttribute('href', url);
        link.setAttribute('download', `export_${this.config.id}_${new Date().getTime()}.csv`);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
    
    convertToCSV(data) {
        if (data.length === 0) return '';
        
        const headers = Object.keys(data[0]);
        const csvHeaders = headers.map(h => `"${h}"`).join(',');
        
        const csvRows = data.map(row => {
            return headers.map(header => {
                const value = row[header];
                return `"${String(value || '').replace(/"/g, '""')}"`;
            }).join(',');
        });
        
        return [csvHeaders, ...csvRows].join('\n');
    }
    
    saveState() {
        if (!this.config.options.persistState) return;
        
        const state = {
            visibleColumns: Array.from(this.state.visibleColumns),
            columnWidths: Array.from(this.state.columnWidths),
            sortColumn: this.state.sortColumn,
            sortDirection: this.state.sortDirection,
            currentProfile: this.state.currentProfile
        };
        
        localStorage.setItem(`table_state_${this.config.id}`, JSON.stringify(state));
    }
    
    loadPersistedState() {
        const saved = localStorage.getItem(`table_state_${this.config.id}`);
        if (!saved) return;
        
        try {
            const state = JSON.parse(saved);
            
            if (state.visibleColumns) {
                this.state.visibleColumns = new Set(state.visibleColumns);
            }
            
            if (state.columnWidths) {
                this.state.columnWidths = new Map(state.columnWidths);
            }
            
            if (state.sortColumn) {
                this.state.sortColumn = state.sortColumn;
                this.state.sortDirection = state.sortDirection || 'asc';
            }
            
            if (state.currentProfile) {
                this.state.currentProfile = state.currentProfile;
            }
            
        } catch (e) {
            console.error('Erro ao carregar estado da tabela:', e);
        }
    }
    
    // API Pública
    setData(data) {
        this.config.data = data;
        this.render();
    }
    
    addRow(rowData) {
        this.config.data.push(rowData);
        this.render();
    }
    
    updateRow(id, rowData) {
        const index = this.config.data.findIndex(row => row.id === id);
        if (index !== -1) {
            this.config.data[index] = { ...this.config.data[index], ...rowData };
            this.render();
        }
    }
    
    deleteRow(id) {
        this.config.data = this.config.data.filter(row => row.id !== id);
        this.state.selectedRows.delete(String(id));
        this.render();
    }
    
    refresh() {
        this.render();
    }
    
    destroy() {
        this.container.innerHTML = '';
        // Limpar event listeners se necessário
    }
}

/**
 * ColumnManager - Gerenciador de Colunas
 */
class ColumnManager {
    constructor(table) {
        this.table = table;
    }
    
    showSettings() {
        const modal = this.table.elements.columnModal;
        const columnList = this.table.elements.columnList;
        
        // Renderizar lista de colunas
        const columnsHTML = this.table.config.columns
            .filter(col => !col.alwaysHidden)
            .map(col => `
                <div class="column-item ${col.alwaysVisible ? 'always-visible' : ''}" draggable="${!col.alwaysVisible}">
                    <div class="column-drag-handle">
                        <i class="fas fa-grip-vertical"></i>
                    </div>
                    <label class="column-checkbox">
                        <input type="checkbox" 
                               value="${col.id}" 
                               ${this.table.state.visibleColumns.has(col.id) ? 'checked' : ''}
                               ${col.alwaysVisible ? 'disabled' : ''}>
                        <span>${col.label}</span>
                    </label>
                    ${col.description ? `<small>${col.description}</small>` : ''}
                </div>
            `).join('');
        
        columnList.innerHTML = columnsHTML;
        
        // Mostrar modal
        modal.style.display = 'block';
        
        // Setup drag and drop
        this.setupColumnDragDrop();
        
        // Event listeners do modal
        const closeBtn = modal.querySelector('.modal-close');
        const applyBtn = modal.querySelector('[data-action="apply-columns"]');
        const resetBtn = modal.querySelector('[data-action="reset-columns"]');
        
        const closeModal = () => {
            modal.style.display = 'none';
        };
        
        closeBtn.onclick = closeModal;
        
        applyBtn.onclick = () => {
            this.applyColumnChanges();
            closeModal();
        };
        
        resetBtn.onclick = () => {
            this.resetColumns();
            this.table.render();
            closeModal();
        };
        
        // Fechar ao clicar no backdrop
        modal.querySelector('.modal-backdrop').onclick = closeModal;
    }
    
    setupColumnDragDrop() {
        const columnList = this.table.elements.columnList;
        let draggedElement = null;
        
        columnList.addEventListener('dragstart', (e) => {
            if (e.target.classList.contains('column-item')) {
                draggedElement = e.target;
                e.target.classList.add('dragging');
            }
        });
        
        columnList.addEventListener('dragend', (e) => {
            if (e.target.classList.contains('column-item')) {
                e.target.classList.remove('dragging');
            }
        });
        
        columnList.addEventListener('dragover', (e) => {
            e.preventDefault();
            const afterElement = getDragAfterElement(columnList, e.clientY);
            
            if (afterElement == null) {
                columnList.appendChild(draggedElement);
            } else {
                columnList.insertBefore(draggedElement, afterElement);
            }
        });
        
        function getDragAfterElement(container, y) {
            const draggableElements = [...container.querySelectorAll('.column-item:not(.dragging)')];
            
            return draggableElements.reduce((closest, child) => {
                const box = child.getBoundingClientRect();
                const offset = y - box.top - box.height / 2;
                
                if (offset < 0 && offset > closest.offset) {
                    return { offset: offset, element: child };
                } else {
                    return closest;
                }
            }, { offset: Number.NEGATIVE_INFINITY }).element;
        }
    }
    
    applyColumnChanges() {
        // Obter nova ordem e visibilidade
        const columnItems = this.table.elements.columnList.querySelectorAll('.column-item');
        const newColumns = [];
        const newVisible = new Set();
        
        columnItems.forEach(item => {
            const checkbox = item.querySelector('input[type="checkbox"]');
            const columnId = checkbox.value;
            
            if (checkbox.checked) {
                newVisible.add(columnId);
            }
            
            const column = this.table.config.columns.find(col => col.id === columnId);
            if (column) {
                newColumns.push(column);
            }
        });
        
        // Adicionar colunas não mostradas no modal (alwaysHidden)
        this.table.config.columns.forEach(col => {
            if (col.alwaysHidden && !newColumns.find(c => c.id === col.id)) {
                newColumns.push(col);
            }
        });
        
        // Aplicar mudanças
        this.table.config.columns = newColumns;
        this.table.state.visibleColumns = newVisible;
        this.table.state.currentProfile = 'custom';
        
        // Atualizar UI
        this.table.render();
        this.updateColumnChips();
        this.table.saveState();
        
        // Callback
        if (this.table.config.callbacks.onColumnToggle) {
            this.table.config.callbacks.onColumnToggle(Array.from(newVisible));
        }
    }
    
    resetColumns() {
        // Restaurar ordem original e visibilidade padrão
        this.table.state.visibleColumns.clear();
        this.table.setupInitialColumns();
        this.table.state.currentProfile = 'complete';
        this.table.saveState();
    }
    
    toggleColumn(columnId) {
        if (this.table.state.visibleColumns.has(columnId)) {
            // Verificar se pode ocultar
            const column = this.table.config.columns.find(col => col.id === columnId);
            if (!column.alwaysVisible) {
                this.table.state.visibleColumns.delete(columnId);
            }
        } else {
            this.table.state.visibleColumns.add(columnId);
        }
        
        this.table.state.currentProfile = 'custom';
        this.table.render();
        this.updateColumnChips();
        this.table.saveState();
    }
    
    applyProfile(profileName) {
        if (!this.table.config.columnProfiles[profileName]) return;
        
        const profileColumns = this.table.config.columnProfiles[profileName];
        
        if (profileName === 'custom') return;
        
        // Limpar e aplicar novo perfil
        this.table.state.visibleColumns.clear();
        
        if (profileName === 'complete') {
            // Mostrar todas as colunas não ocultas
            this.table.config.columns.forEach(col => {
                if (!col.alwaysHidden && col.defaultVisible !== false) {
                    this.table.state.visibleColumns.add(col.id);
                }
            });
        } else {
            // Aplicar colunas do perfil
            profileColumns.forEach(colId => {
                this.table.state.visibleColumns.add(colId);
            });
            
            // Adicionar colunas sempre visíveis
            this.table.config.columns.forEach(col => {
                if (col.alwaysVisible) {
                    this.table.state.visibleColumns.add(col.id);
                }
            });
        }
        
        this.table.state.currentProfile = profileName;
        this.table.render();
        this.updateColumnChips();
        this.table.saveState();
    }
    
    updateColumnChips() {
        const container = this.table.elements.columnChips;
        const visibleColumns = this.table.getVisibleColumns();
        
        // Mostrar/ocultar toggle bar baseado no número de colunas
        const hasHiddenColumns = this.table.config.columns.some(col => 
            !col.alwaysHidden && !this.table.state.visibleColumns.has(col.id)
        );
        
        this.table.elements.columnToggleBar.style.display = hasHiddenColumns ? 'flex' : 'none';
        
        // Renderizar chips
        const chipsHTML = visibleColumns.map(col => `
            <div class="column-chip ${col.alwaysVisible ? 'always-visible' : ''}" data-column="${col.id}">
                <span>${col.label}</span>
                ${!col.alwaysVisible ? '<i class="fas fa-times"></i>' : ''}
            </div>
        `).join('');
        
        container.innerHTML = chipsHTML;
        
        // Atualizar selector de perfil
        this.table.elements.profileSelector.value = this.table.state.currentProfile;
    }
}

/**
 * TableFormatters - Formatadores de Dados
 */
class TableFormatters {
    constructor() {
        // Formatadores padrão
    }
    
    // Formatador de moeda
    currency(value, row, column) {
        if (value === null || value === undefined) return '-';
        
        const options = {
            style: 'currency',
            currency: column.currency || 'BRL',
            minimumFractionDigits: 2
        };
        
        try {
            const formatted = new Intl.NumberFormat('pt-BR', options).format(value);
            const isNegative = value < 0;
            
            return `<span class="currency-value ${isNegative ? 'negative' : 'positive'}">${formatted}</span>`;
        } catch (e) {
            return value;
        }
    }
    
    // Formatador de data
    date(value, row, column) {
        if (!value) return '-';
        
        try {
            // Aceitar diferentes formatos
            let date;
            
            if (value instanceof Date) {
                date = value;
            } else if (typeof value === 'string') {
                // Formato ISO date (YYYY-MM-DD) - adicionar tempo para evitar timezone issues
                if (value.match(/^\d{4}-\d{2}-\d{2}$/)) {
                    date = new Date(value + 'T00:00:00');
                } else {
                    // Tentar parse ISO normal
                    date = new Date(value);
                    
                    // Se falhou, tentar formato BR (DD/MM/YYYY)
                    if (isNaN(date.getTime()) && value.includes('/')) {
                        const [day, month, year] = value.split('/');
                        date = new Date(year, month - 1, day);
                    }
                }
            } else if (typeof value === 'number') {
                date = new Date(value);
            }
            
            if (isNaN(date.getTime())) {
                console.warn('Erro ao parsear data:', value);
                return value; // Retornar valor original se não conseguir parsear
            }
            
            // Formatar
            const options = column.dateFormat || { 
                day: '2-digit', 
                month: '2-digit', 
                year: 'numeric' 
            };
            
            return date.toLocaleDateString('pt-BR', options);
            
        } catch (e) {
            console.warn('Erro no formatador de data:', e, value);
            return value;
        }
    }
    
    // Formatador de badge/status
    badge(value, row, column) {
        if (!value) return '-';
        
        const badgeClass = column.badgeClass || this.getBadgeClass(value);
        const icon = column.badgeIcon?.[value] || '';
        
        return `<span class="badge ${badgeClass}">${icon} ${value}</span>`;
    }
    
    getBadgeClass(value) {
        // Mapear valores comuns para classes
        const lowerValue = String(value).toLowerCase();
        
        if (['ativo', 'active', 'realizado', 'pago', 'aprovado'].includes(lowerValue)) {
            return 'badge-success';
        }
        
        if (['inativo', 'inactive', 'cancelado', 'rejeitado'].includes(lowerValue)) {
            return 'badge-danger';
        }
        
        if (['pendente', 'aguardando', 'em análise'].includes(lowerValue)) {
            return 'badge-warning';
        }
        
        return 'badge-default';
    }
    
    // Formatador de status
    status(value, row, column) {
        if (!value) return '-';
        
        const statusConfig = column.statusConfig || {};
        const config = statusConfig[value] || { class: 'default', label: value };
        
        return `<span class="status-indicator ${config.class}">${config.label}</span>`;
    }
    
    // Formatador de texto truncado
    truncate(value, row, column) {
        if (!value) return '-';
        
        const maxLength = column.maxLength || 50;
        const text = String(value);
        
        if (text.length <= maxLength) {
            return text;
        }
        
        return `<span title="${this.escapeHtml(text)}">${this.escapeHtml(text.substring(0, maxLength))}...</span>`;
    }
    
    // Formatador hierárquico (para plano financeiro)
    hierarchical(value, row, column) {
        if (!value) return '-';
        
        const level = column.levelField ? row[column.levelField] : null;
        const indent = level ? `<span class="indent" style="width: ${(level - 1) * 20}px"></span>` : '';
        
        return `${indent}${this.escapeHtml(value)}`;
    }
    
    // Formatador de ações
    actions(value, row, column) {
        const actions = column.actions || [];
        
        return actions.map(action => {
            // Verificar se ação deve ser mostrada (compatibilidade)
            if (action.show && !action.show(row)) {
                return '';
            }
            
            // Verificar condição (nova forma)
            if (action.condition && !action.condition(row)) {
                return '';
            }
            
            const disabled = action.disabled && action.disabled(row);
            
            return `
                <button class="btn-icon ${action.class || ''}" 
                        onclick="${action.handler}(${row.id})"
                        title="${action.title}"
                        ${disabled ? 'disabled' : ''}>
                    <i class="${action.icon}"></i>
                </button>
            `;
        }).join('');
    }
    
    // Formatador de porcentagem
    percentage(value, row, column) {
        if (value === null || value === undefined) return '-';
        
        const formatted = Number(value).toFixed(column.decimals || 2);
        return `${formatted}%`;
    }
    
    // Formatador de boolean
    boolean(value, row, column) {
        const trueIcon = column.trueIcon || '<i class="fas fa-check text-success"></i>';
        const falseIcon = column.falseIcon || '<i class="fas fa-times text-danger"></i>';
        
        return value ? trueIcon : falseIcon;
    }
    
    // Utilitário para escape HTML
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Exportar para uso global
window.TableComponent = TableComponent;
window.TableFormatters = TableFormatters;