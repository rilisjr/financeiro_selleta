// Dashboard JavaScript
$(document).ready(function() {
    initializeDashboard();
    
    // Só inicializar gráficos se Chart.js estiver disponível
    if (typeof Chart !== 'undefined') {
        initializeCharts();
    } else {
        console.log('Chart.js não carregado - gráficos desabilitados');
    }
    
    setupEventListeners();
});

function initializeDashboard() {
    // Expandir seções do menu por padrão
    $('.nav-section').addClass('open');
    
    // Mostrar mensagem de boas-vindas
    showWelcomeMessage();
    
    // Animar entrada dos cards
    animateCards();
}

function showWelcomeMessage() {
    // Simular carregamento de dados do usuário
    setTimeout(() => {
        const welcomeText = $('.welcome-text h2');
        const currentText = welcomeText.text();
        welcomeText.text('Olá, bem-vindo ao Sistema Financeiro!');
    }, 100);
}

function animateCards() {
    $('.kpi-card, .chart-card, .activity-card, .notifications-card').each(function(index) {
        $(this).css({
            'opacity': '0',
            'transform': 'translateY(20px)'
        });
        
        setTimeout(() => {
            $(this).css({
                'opacity': '1',
                'transform': 'translateY(0)',
                'transition': 'all 0.6s ease-out'
            });
        }, index * 100);
    });
}

function setupEventListeners() {
    // Toggle seções do menu
    $('.nav-section-title').click(function() {
        const section = $(this).closest('.nav-section');
        section.toggleClass('open');
        
        const subsection = section.find('.nav-subsection');
        subsection.slideToggle(300);
    });
    
    // Hover effects nos cards KPI
    $('.kpi-card').hover(
        function() {
            $(this).css('transform', 'translateY(-8px)');
        },
        function() {
            $(this).css('transform', 'translateY(0)');
        }
    );
    
    // Click nos itens de navegação com "Em breve"
    $('.nav-item').click(function(e) {
        const badge = $(this).find('.badge.warning');
        if (badge.length > 0) {
            e.preventDefault();
            showComingSoonMessage($(this).find('span').first().text());
        }
    });
    
    // Pesquisa no header
    $('.search-box input').on('input', function() {
        const searchTerm = $(this).val().toLowerCase();
        if (searchTerm.length > 2) {
            performSearch(searchTerm);
        }
    });
}

function showComingSoonMessage(featureName) {
    // Criar modal simples
    const modal = $(`
        <div class="coming-soon-modal" style="
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
        ">
            <div style="
                background: white;
                padding: 30px;
                border-radius: 12px;
                text-align: center;
                max-width: 400px;
                box-shadow: 0 8px 32px rgba(0,0,0,0.3);
            ">
                <i class="fas fa-rocket" style="font-size: 48px; color: var(--selleta-primary); margin-bottom: 20px;"></i>
                <h3 style="margin-bottom: 15px; color: var(--selleta-gray-800);">${featureName}</h3>
                <p style="color: var(--selleta-gray-600); margin-bottom: 20px;">
                    Esta funcionalidade está em desenvolvimento e estará disponível em breve!
                </p>
                <button onclick="$('.coming-soon-modal').remove()" style="
                    background: var(--selleta-primary);
                    color: white;
                    border: none;
                    padding: 10px 20px;
                    border-radius: 6px;
                    cursor: pointer;
                ">Entendi</button>
            </div>
        </div>
    `);
    
    $('body').append(modal);
    
    // Auto-remover após 3 segundos
    setTimeout(() => {
        modal.fadeOut(300, () => modal.remove());
    }, 3000);
}

function performSearch(searchTerm) {
    // Simular busca por funcionalidades
    const features = [
        'Plano Financeiro',
        'Centro de Custo',
        'Clientes',
        'Fornecedores',
        'Transações',
        'Contas Bancárias',
        'Relatórios',
        'Usuários'
    ];
    
    const results = features.filter(feature => 
        feature.toLowerCase().includes(searchTerm)
    );
    
    // Mostrar resultados (implementação simples)
    console.log('Resultados da busca:', results);
}

function initializeCharts() {
    // Verificar se Chart.js está disponível
    if (typeof Chart === 'undefined') {
        console.warn('Chart.js não está carregado. Gráficos não serão exibidos.');
        return;
    }
    
    // Dados de exemplo para os gráficos
    const chartColors = {
        primary: getComputedStyle(document.documentElement).getPropertyValue('--selleta-primary').trim() || '#1a73e8',
        success: getComputedStyle(document.documentElement).getPropertyValue('--selleta-success').trim() || '#34a853',
        error: getComputedStyle(document.documentElement).getPropertyValue('--selleta-error').trim() || '#ea4335',
        warning: getComputedStyle(document.documentElement).getPropertyValue('--selleta-warning').trim() || '#fbbc04',
        info: getComputedStyle(document.documentElement).getPropertyValue('--selleta-info').trim() || '#4285f4'
    };
    
    // Fluxo de Caixa
    const fluxoCaixaCtx = document.getElementById('fluxoCaixaChart');
    if (fluxoCaixaCtx) {
        new Chart(fluxoCaixaCtx, {
            type: 'line',
            data: {
                labels: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'],
                datasets: [{
                    label: 'Fluxo de Caixa',
                    data: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                    borderColor: chartColors.primary,
                    backgroundColor: chartColors.primary + '20',
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: '#E0E0E0'
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        }
                    }
                }
            }
        });
    }
    
    // Receitas vs Despesas
    const receitasDespesasCtx = document.getElementById('receitasDespesasChart');
    if (receitasDespesasCtx) {
        new Chart(receitasDespesasCtx, {
            type: 'bar',
            data: {
                labels: ['Receitas', 'Despesas'],
                datasets: [{
                    data: [0, 0],
                    backgroundColor: [chartColors.success, chartColors.error],
                    borderRadius: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: '#E0E0E0'
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        }
                    }
                }
            }
        });
    }
    
    // Centro de Custo
    const centroCustoCtx = document.getElementById('centroCustoChart');
    if (centroCustoCtx) {
        new Chart(centroCustoCtx, {
            type: 'doughnut',
            data: {
                labels: ['Administrativo', 'Obras', 'Vendas'],
                datasets: [{
                    data: [0, 0, 0],
                    backgroundColor: [chartColors.primary, chartColors.info, chartColors.warning]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }
    
    // Evolução Mensal
    const evolucaoCtx = document.getElementById('evolucaoChart');
    if (evolucaoCtx) {
        new Chart(evolucaoCtx, {
            type: 'line',
            data: {
                labels: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'],
                datasets: [
                    {
                        label: 'Receitas',
                        data: [0, 0, 0, 0, 0, 0],
                        borderColor: chartColors.success,
                        backgroundColor: chartColors.success + '20',
                        tension: 0.4
                    },
                    {
                        label: 'Despesas',
                        data: [0, 0, 0, 0, 0, 0],
                        borderColor: chartColors.error,
                        backgroundColor: chartColors.error + '20',
                        tension: 0.4
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: '#E0E0E0'
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        }
                    }
                }
            }
        });
    }
}

// Função para atualizar dados em tempo real (futuro)
function updateRealTimeData() {
    // Esta função será implementada quando tivermos dados reais
    console.log('Atualizando dados em tempo real...');
}

// Função para mostrar notificações
function showNotification(message, type = 'info') {
    const notification = $(`
        <div class="notification ${type}" style="
            position: fixed;
            top: 90px;
            right: 20px;
            background: white;
            padding: 15px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            border-left: 4px solid var(--selleta-${type});
            z-index: 1000;
            max-width: 300px;
        ">
            <div style="display: flex; align-items: center; gap: 10px;">
                <i class="fas fa-info-circle" style="color: var(--selleta-${type});"></i>
                <span>${message}</span>
            </div>
        </div>
    `);
    
    $('body').append(notification);
    
    setTimeout(() => {
        notification.fadeOut(300, () => notification.remove());
    }, 4000);
}

// Verificar status do sistema
function checkSystemStatus() {
    // Simular verificação de status
    const status = {
        database: 'online',
        planoFinanceiro: 'ready',
        centrosCusto: 'pending',
        clientes: 'pending',
        transacoes: 'pending'
    };
    
    return status;
}

// Inicializar verificações periódicas
setInterval(() => {
    // Verificações em background
    const status = checkSystemStatus();
    console.log('Status do sistema:', status);
}, 30000); // A cada 30 segundos