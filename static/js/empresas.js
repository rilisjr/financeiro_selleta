// Gestão de Empresas - JavaScript
$(document).ready(function() {
    let empresas = [];
    let empresasFiltradas = [];
    
    // Carregar empresas ao iniciar
    carregarEmpresas();
    
    // Definir filtro padrão para empresas ativas
    $('#filtro-status').val('1');
    
    // Event listeners
    $('#btn-nova-empresa, #btn-nova-empresa-empty').click(function() {
        abrirModalEmpresa();
    });
    
    $('#btn-cancelar, .modal-close').click(function() {
        fecharModal();
    });
    
    // Fechar modal clicando fora
    $(window).click(function(event) {
        if (event.target.classList.contains('modal')) {
            fecharModal();
        }
    });
    
    // Submissão do formulário
    $('#form-empresa').submit(function(e) {
        e.preventDefault();
        salvarEmpresa();
    });
    
    // Filtros em tempo real
    $('#pesquisa-empresa').on('input', function() {
        aplicarFiltros();
    });
    
    $('#filtro-municipio, #filtro-status').change(function() {
        aplicarFiltros();
    });
    
    // Formatação automática de campos
    $('#cnpj').on('input', function() {
        formatarCNPJ(this);
    });
    
    $('#cep').on('input', function() {
        formatarCEP(this);
    });
    
    $('#telefone').on('input', function() {
        formatarTelefone(this);
    });
    
    function carregarEmpresas() {
        $('#loading').show();
        $('#empresas-lista').hide();
        $('#empty-state').hide();
        
        $.get('/api/empresas')
            .done(function(data) {
                empresas = data;
                empresasFiltradas = [...empresas];
                
                // Carregar opções de filtro
                carregarFiltros();
                
                // Aplicar filtro padrão (empresas ativas) e renderizar
                aplicarFiltros();
            })
            .fail(function(xhr) {
                console.error('Erro ao carregar empresas:', xhr.responseJSON);
                mostrarMensagem('Erro ao carregar empresas: ' + (xhr.responseJSON?.error || 'Erro desconhecido'), 'error');
            })
            .always(function() {
                $('#loading').hide();
            });
    }
    
    function carregarFiltros() {
        // Carregar municípios únicos
        const municipios = [...new Set(empresas.map(e => e.municipio).filter(m => m))].sort();
        const $filtroMunicipio = $('#filtro-municipio');
        $filtroMunicipio.find('option:not(:first)').remove();
        
        municipios.forEach(municipio => {
            $filtroMunicipio.append(`<option value="${municipio}">${municipio}</option>`);
        });
    }
    
    function renderizarEmpresas() {
        const $lista = $('#empresas-lista');
        
        if (empresasFiltradas.length === 0) {
            $lista.hide();
            $('#empty-state').show();
            return;
        }
        
        $('#empty-state').hide();
        $lista.show();
        
        const html = empresasFiltradas.map(empresa => `
            <div class="empresa-card" data-id="${empresa.id}">
                <div class="empresa-header">
                    <span class="empresa-codigo">${empresa.codigo}</span>
                    <span class="empresa-status ${empresa.ativo ? 'ativa' : 'inativa'}">
                        ${empresa.ativo ? 'Ativa' : 'Inativa'}
                    </span>
                </div>
                
                <div class="empresa-nome">${empresa.nome}</div>
                
                <div class="empresa-info">
                    ${empresa.cnpj ? `
                        <div class="empresa-info-item">
                            <i class="fas fa-id-card"></i>
                            <span><strong>CNPJ:</strong> ${empresa.cnpj}</span>
                        </div>
                    ` : ''}
                    
                    ${empresa.municipio ? `
                        <div class="empresa-info-item">
                            <i class="fas fa-map-marker-alt"></i>
                            <span><strong>Município:</strong> ${empresa.municipio}</span>
                        </div>
                    ` : ''}
                    
                    ${empresa.telefone ? `
                        <div class="empresa-info-item">
                            <i class="fas fa-phone"></i>
                            <span><strong>Telefone:</strong> ${empresa.telefone}</span>
                        </div>
                    ` : ''}
                    
                    <div class="empresa-info-item">
                        <i class="fas fa-layer-group"></i>
                        <span><strong>Grupo:</strong> ${empresa.grupo || 'Grupo Selleta'}</span>
                    </div>
                </div>
                
                <div class="empresa-actions">
                    <button class="btn-action btn-report" onclick="gerarRelatorioEmpresa(${empresa.id})">
                        <i class="fas fa-chart-line"></i> Relatório
                    </button>
                    <button class="btn-action btn-edit" onclick="editarEmpresa(${empresa.id})">
                        <i class="fas fa-edit"></i> Editar
                    </button>
                </div>
            </div>
        `).join('');
        
        $lista.html(html);
    }
    
    function aplicarFiltros() {
        const pesquisa = $('#pesquisa-empresa').val().toLowerCase();
        const municipio = $('#filtro-municipio').val();
        const status = $('#filtro-status').val();
        
        empresasFiltradas = empresas.filter(empresa => {
            // Filtro de pesquisa
            const matchPesquisa = !pesquisa || 
                empresa.nome.toLowerCase().includes(pesquisa) ||
                empresa.codigo.toLowerCase().includes(pesquisa) ||
                (empresa.cnpj && empresa.cnpj.toLowerCase().includes(pesquisa));
            
            // Filtro de município
            const matchMunicipio = !municipio || empresa.municipio === municipio;
            
            // Filtro de status
            const matchStatus = status === '' || empresa.ativo.toString() === status;
            
            return matchPesquisa && matchMunicipio && matchStatus;
        });
        
        renderizarEmpresas();
    }
    
    function abrirModalEmpresa(empresa = null) {
        const isEdicao = empresa !== null;
        
        $('#modal-title').text(isEdicao ? 'Editar Empresa' : 'Nova Empresa');
        $('#btn-salvar').html(`<i class="fas fa-save"></i> ${isEdicao ? 'Atualizar' : 'Salvar'}`);
        
        if (isEdicao) {
            $('#empresa_id').val(empresa.id);
            $('#codigo').val(empresa.codigo);
            $('#nome').val(empresa.nome);
            $('#grupo').val(empresa.grupo);
            $('#cnpj').val(empresa.cnpj);
            $('#endereco').val(empresa.endereco);
            $('#municipio').val(empresa.municipio);
            $('#cep').val(empresa.cep);
            $('#telefone').val(empresa.telefone);
            $('#ativo').val(empresa.ativo.toString());
        } else {
            $('#form-empresa')[0].reset();
            $('#empresa_id').val('');
            $('#grupo').val('Grupo Selleta');
            $('#ativo').val('1');
            
            // Gerar próximo código
            const proximoCodigo = gerarProximoCodigo();
            $('#codigo').val(proximoCodigo);
        }
        
        $('#modal-empresa').show();
        $('#codigo').focus();
    }
    
    function gerarProximoCodigo() {
        if (empresas.length === 0) return '0001';
        
        const codigos = empresas.map(e => parseInt(e.codigo)).filter(c => !isNaN(c));
        const maiorCodigo = Math.max(...codigos);
        
        return (maiorCodigo + 1).toString().padStart(4, '0');
    }
    
    function fecharModal() {
        $('#modal-empresa').hide();
        $('#form-empresa')[0].reset();
    }
    
    function salvarEmpresa() {
        const formData = {
            codigo: $('#codigo').val().trim(),
            nome: $('#nome').val().trim(),
            grupo: $('#grupo').val().trim(),
            cnpj: $('#cnpj').val().trim(),
            endereco: $('#endereco').val().trim(),
            municipio: $('#municipio').val().trim(),
            cep: $('#cep').val().trim(),
            telefone: $('#telefone').val().trim(),
            ativo: parseInt($('#ativo').val())
        };
        
        // Validações
        if (!formData.codigo || !formData.nome) {
            mostrarMensagem('Código e nome são obrigatórios', 'error');
            return;
        }
        
        const empresaId = $('#empresa_id').val();
        const isEdicao = empresaId !== '';
        
        const url = isEdicao ? `/api/empresas/${empresaId}` : '/api/empresas';
        const method = isEdicao ? 'PUT' : 'POST';
        
        $.ajax({
            url: url,
            method: method,
            contentType: 'application/json',
            data: JSON.stringify(formData)
        })
        .done(function(response) {
            mostrarMensagem(
                isEdicao ? 'Empresa atualizada com sucesso!' : 'Empresa criada com sucesso!',
                'success'
            );
            fecharModal();
            carregarEmpresas();
        })
        .fail(function(xhr) {
            console.error('Erro ao salvar empresa:', xhr.responseJSON);
            mostrarMensagem('Erro ao salvar empresa: ' + (xhr.responseJSON?.error || 'Erro desconhecido'), 'error');
        });
    }
    
    // Função global para editar empresa (chamada pelos cards)
    window.editarEmpresa = function(empresaId) {
        const empresa = empresas.find(e => e.id === empresaId);
        if (empresa) {
            abrirModalEmpresa(empresa);
        }
    };
    
    // Função global para gerar relatório da empresa (chamada pelos cards)
    window.gerarRelatorioEmpresa = function(empresaId) {
        const empresa = empresas.find(e => e.id === empresaId);
        if (empresa) {
            mostrarMensagem(`Relatório da empresa ${empresa.nome} em desenvolvimento`, 'info');
            // TODO: Implementar geração de relatório específico da empresa
        }
    };
    
    function formatarCNPJ(input) {
        let value = input.value.replace(/\D/g, '');
        
        if (value.length <= 11) {
            // CPF
            value = value.replace(/(\d{3})(\d)/, '$1.$2');
            value = value.replace(/(\d{3})(\d)/, '$1.$2');
            value = value.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
        } else {
            // CNPJ
            value = value.replace(/(\d{2})(\d)/, '$1.$2');
            value = value.replace(/(\d{3})(\d)/, '$1.$2');
            value = value.replace(/(\d{3})(\d)/, '$1/$2');
            value = value.replace(/(\d{4})(\d{1,2})$/, '$1-$2');
        }
        
        input.value = value;
    }
    
    function formatarCEP(input) {
        let value = input.value.replace(/\D/g, '');
        value = value.replace(/(\d{5})(\d)/, '$1-$2');
        input.value = value;
    }
    
    function formatarTelefone(input) {
        let value = input.value.replace(/\D/g, '');
        
        if (value.length <= 10) {
            value = value.replace(/(\d{2})(\d)/, '($1) $2');
            value = value.replace(/(\d{4})(\d)/, '$1-$2');
        } else {
            value = value.replace(/(\d{2})(\d)/, '($1) $2');
            value = value.replace(/(\d{5})(\d)/, '$1-$2');
        }
        
        input.value = value;
    }
    
    function mostrarMensagem(mensagem, tipo) {
        // Implementar notificação toast ou usar alert por enquanto
        if (tipo === 'success') {
            console.log('✅ ' + mensagem);
        } else if (tipo === 'info') {
            console.log('ℹ️ ' + mensagem);
            alert(mensagem);
        } else {
            console.error('❌ ' + mensagem);
            alert(mensagem);
        }
    }
});