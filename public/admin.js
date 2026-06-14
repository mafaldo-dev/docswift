
const API_URL = "https://backend-docswift.onrender.com";

// Guarda as credenciais após o login
let adminEmail = null;
let adminPassword = null;

// Função para fazer requisições autenticadas
async function fetchAdmin(endpoint, options = {}) {
    const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            'X-Admin-Email': adminEmail,
            'X-Admin-Password': adminPassword,
            ...options.headers
        }
    });

    // Se não autorizado, fazer logout
    if (response.status === 403 || response.status === 401) {
        logoutAdmin();
        throw new Error('Sessão expirada');
    }

    return response;
}

// Login
async function fazerLogin() {
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const errorDiv = document.getElementById('loginError');
    const loginBtn = document.querySelector('.login-btn');

    if (!email || !password) {
        errorDiv.textContent = '❌ Por favor, preencha todos os campos!';
        errorDiv.style.display = 'block';
        return;
    }

    loginBtn.disabled = true;
    loginBtn.textContent = 'Entrando...';

    try {
        const response = await fetch(`${API_URL}/admin/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: email,
                password: password
            })
        });

        const data = await response.json();

        if (response.ok && data.success === true) {
            // Salvar credenciais para próximas requisições
            adminEmail = email;
            adminPassword = password;

            localStorage.setItem('admin_logged_in', 'true');
            localStorage.setItem('admin_email', email);
            localStorage.setItem('admin_password', btoa(password)); // Armazena em base64

            mostrarPainelAdmin();
            errorDiv.style.display = 'none';

            await Promise.all([
                loadStats(),
                loadUsers(),
                loadJobs()
            ]);
        } else {
            errorDiv.textContent = data.error || '❌ Email ou senha incorretos!';
            errorDiv.style.display = 'block';
        }
    } catch (error) {
        console.error('Erro no login:', error);
        errorDiv.textContent = '❌ Erro ao conectar com o servidor. Tente novamente.';
        errorDiv.style.display = 'block';
    } finally {
        loginBtn.disabled = false;
        loginBtn.textContent = 'Entrar no Painel';
    }
}

// Logout
function logoutAdmin() {
    adminEmail = null;
    adminPassword = null;
    localStorage.removeItem('admin_logged_in');
    localStorage.removeItem('admin_email');
    localStorage.removeItem('admin_password');
    mostrarTelaLogin();
}

function mostrarPainelAdmin() {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('adminPanel').style.display = 'block';
}

function mostrarTelaLogin() {
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('adminPanel').style.display = 'none';
    document.getElementById('loginEmail').value = '';
    document.getElementById('loginPassword').value = '';
}

// Carregar estatísticas
async function loadStats() {
    try {
        const response = await fetchAdmin('/admin/stats');
        const data = await response.json();

        document.getElementById("usuariosTotal").textContent = data.usuarios_total || 0;
        document.getElementById("usuariosPro").textContent = data.usuarios_pro || 0;
        document.getElementById("usuariosFree").textContent = data.usuarios_free || 0;
        document.getElementById("conversoesTotal").textContent = data.conversoes_total || 0;
        document.getElementById("conversoesHoje").textContent = data.conversoes_hoje || 0;
    } catch (error) {
        console.error('Erro ao carregar stats:', error);
    }
}

// Carregar usuários
async function loadUsers() {
    const tbody = document.querySelector("#usersTable tbody");
    tbody.innerHTML = '<tr><td colspan="4" class="loading">Carregando usuários...</td></tr>';

    try {
        const response = await fetchAdmin('/admin/users');
        const users = await response.json();

        tbody.innerHTML = '';

        if (!users || users.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align: center;">Nenhum usuário encontrado</td></tr>';
            return;
        }

        users.forEach(user => {
            const row = tbody.insertRow();
            const planoColor = user.plano === 'pro' ? '#48bb78' : '#ed8936';
            const planoTexto = user.plano === 'pro' ? 'Pro' : 'Free';
            row.innerHTML = `
                        <td>${user.id || 'N/A'}</td>
                        <td>${user.email || 'N/A'}</td>
                        <td><span style="color: ${planoColor}; font-weight: bold;">${planoTexto}</span></td>
                        <td>${user.criado_em ? new Date(user.criado_em).toLocaleString() : 'N/A'}</td>
                    `;
        });
    } catch (error) {
        console.error('Erro ao carregar usuários:', error);
        tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: #f56565;">Erro ao carregar usuários</td></tr>';
    }
}

// Carregar jobs
async function loadJobs() {
    const tbody = document.querySelector("#jobsTable tbody");
    tbody.innerHTML = '<tr><td colspan="9" class="loading">Carregando conversões...</td></tr>';

    try {
        const response = await fetchAdmin('/admin/jobs');
        const jobs = await response.json();

        tbody.innerHTML = '';

        if (!jobs || jobs.length === 0) {
            tbody.innerHTML = '<tr><td colspan="9" style="text-align: center;">Nenhuma conversão encontrada</td></tr>';
            return;
        }

        jobs.forEach(job => {
            const row = tbody.insertRow();
            const tamanhoFormatado = job.tamanho_original ?
                `${(job.tamanho_original / 1024 / 1024).toFixed(2)} MB` : 'N/A';

            let statusClass = '';
            let statusTexto = job.status || 'pending';

            if (statusTexto === 'done') {
                statusClass = 'status-success';
                statusTexto = 'Concluído';
            } else if (statusTexto === 'processing') {
                statusClass = 'status-pending';
                statusTexto = 'Processando';
            } else if (statusTexto === 'error') {
                statusClass = 'status-failed';
                statusTexto = 'Erro';
            } else {
                statusTexto = statusTexto;
            }

            row.innerHTML = `
                        <td>${job.id || 'N/A'}</td>
                        <td>${job.usuario || 'N/A'}</td>
                        <td>${job.arquivo || 'N/A'}</td>
                        <td>${job.entrada || 'N/A'}</td>
                        <td>${job.saida || 'N/A'}</td>
                        <td>${tamanhoFormatado}</td>
                        <td class="${statusClass}">${statusTexto}</td>
                        <td>${job.ip || 'N/A'}</td>
                        <td>${job.data ? new Date(job.data).toLocaleString() : 'N/A'}</td>
                    `;
        });
    } catch (error) {
        console.error('Erro ao carregar jobs:', error);
        tbody.innerHTML = '<tr><td colspan="9" style="text-align: center; color: #f56565;">Erro ao carregar conversões</td></tr>';
    }
}

// Verificar sessão ao carregar
async function verificarSessao() {
    const isLoggedIn = localStorage.getItem('admin_logged_in');
    const storedEmail = localStorage.getItem('admin_email');
    const storedPassword = localStorage.getItem('admin_password');

    if (isLoggedIn === 'true' && storedEmail && storedPassword) {
        adminEmail = storedEmail;
        adminPassword = atob(storedPassword);

        try {
            await fetchAdmin('/admin/stats');
            mostrarPainelAdmin();
            await Promise.all([
                loadStats(),
                loadUsers(),
                loadJobs()
            ]);
        } catch (error) {
            logoutAdmin();
        }
    }
}

// Evento de tecla Enter
document.addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
        const loginScreen = document.getElementById('loginScreen');
        if (loginScreen.style.display !== 'none') {
            fazerLogin();
        }
    }
});

// Inicializar
verificarSessao();

// Auto-refresh a cada 30 segundos
setInterval(() => {
    if (adminEmail && adminPassword && document.getElementById('adminPanel').style.display === 'block') {
        loadStats();
        loadUsers();
        loadJobs();
    }
}, 30000);
