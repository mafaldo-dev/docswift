
const API_URL = "https://backend-docswift.onrender.com";

// Função para fazer login
async function fazerLogin() {
    const email = document.getElementById('loginEmail').value;
    const senha = document.getElementById('loginPassword').value;
    const errorDiv = document.getElementById('loginError');
    const loginBtn = document.querySelector('.login-btn');

    if (!email || !senha) {
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
            body: JSON.stringify({ email, senha })
        });

        const data = await response.json();

        if (response.ok && data.token) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('admin_logged_in', 'true');
            mostrarPainelAdmin();
            errorDiv.style.display = 'none';

            // Carregar todos os dados
            await loadStats();
            await loadUsers();
            await loadJobs();
        } else {
            errorDiv.textContent = data.message || '❌ Email ou senha incorretos!';
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
    localStorage.removeItem('token');
    localStorage.removeItem('admin_logged_in');
    mostrarTelaLogin();
}

// Mostrar painel admin
function mostrarPainelAdmin() {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('adminPanel').style.display = 'block';
}

// Mostrar tela de login
function mostrarTelaLogin() {
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('adminPanel').style.display = 'none';
    document.getElementById('loginEmail').value = '';
    document.getElementById('loginPassword').value = '';
}

// Carregar estatísticas
async function loadStats() {
    const token = localStorage.getItem("token");

    if (!token) {
        console.error('Token não encontrado');
        return;
    }

    try {
        const res = await fetch(`${API_URL}/admin/stats`, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        if (res.status === 401) {
            logoutAdmin();
            return;
        }

        const data = await res.json();

        document.getElementById("usuariosTotal").textContent = data.usuarios_total || 0;
        document.getElementById("usuariosPro").textContent = data.usuarios_pro || 0;

        // Calcular usuários free
        const freeUsers = (data.usuarios_total || 0) - (data.usuarios_pro || 0);
        document.getElementById("usuariosFree").textContent = freeUsers;

        document.getElementById("conversoesTotal").textContent = data.conversoes_total || 0;
        document.getElementById("conversoesHoje").textContent = data.conversoes_hoje || 0;
    } catch (error) {
        console.error('Erro ao carregar stats:', error);
    }
}

// Carregar usuários
async function loadUsers() {
    const token = localStorage.getItem("token");

    if (!token) {
        console.error('Token não encontrado');
        return;
    }

    const tbody = document.querySelector("#usersTable tbody");
    tbody.innerHTML = '<tr><td colspan="3" class="loading">Carregando usuários...</td></tr>';

    try {
        const res = await fetch(`${API_URL}/admin/users`, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        if (res.status === 401) {
            logoutAdmin();
            return;
        }

        const users = await res.json();
        console.log('Usuários carregados:', users);
        console.log('Status:', res.status);

        tbody.innerHTML = '';

        if (!users || users.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" style="text-align: center;">Nenhum usuário encontrado</td></tr>';
            return;
        }

        users.forEach(user => {
            const row = tbody.insertRow();
            const planoColor = user.plano === 'Pro' ? '#48bb78' : '#ed8936';
            row.innerHTML = `
                        <td>${user.email || 'N/A'}</td>
                        <td><span style="color: ${planoColor}; font-weight: bold;">${user.plano || 'Free'}</span></td>
                        <td>${user.criado_em ? new Date(user.criado_em).toLocaleString() : 'N/A'}</td>
                    `;
        });
    } catch (error) {
        console.error('Erro ao carregar usuários:', error);
        tbody.innerHTML = '<tr><td colspan="3" style="text-align: center; color: #f56565;">Erro ao carregar usuários</td></tr>';
    }
}

// Carregar jobs/conversões
async function loadJobs() {
    const token = localStorage.getItem("token");

    if (!token) {
        console.error('Token não encontrado');
        return;
    }

    const tbody = document.querySelector("#jobsTable tbody");
    tbody.innerHTML = '<tr><td colspan="7" class="loading">Carregando conversões...</td></tr>';

    try {
        const res = await fetch(`${API_URL}/admin/jobs`, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        if (res.status === 401) {
            logoutAdmin();
            return;
        }

        const jobs = await res.json();
        console.log('Jobs carregados:', jobs);
        console.log('Status:', res.status);

        tbody.innerHTML = '';

        if (!jobs || jobs.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align: center;">Nenhuma conversão encontrada</td></tr>';
            return;
        }

        jobs.forEach(job => {
            const row = tbody.insertRow();
            const tamanhoFormatado = job.tamanho_original ?
                `${(job.tamanho_original / 1024 / 1024).toFixed(2)} MB` : 'N/A';

            let statusClass = '';
            if (job.status === 'Concluído') statusClass = 'status-success';
            else if (job.status === 'Processando') statusClass = 'status-pending';
            else if (job.status === 'Falha') statusClass = 'status-failed';

            row.innerHTML = `
                        <td>${job.usuario || 'N/A'}</td>
                        <td>${job.arquivo || 'N/A'}</td>
                        <td>${job.entrada || 'N/A'}</td>
                        <td>${job.saida || 'N/A'}</td>
                        <td>${tamanhoFormatado}</td>
                        <td>${job.data ? new Date(job.data).toLocaleString() : 'N/A'}</td>
                        <td class="${statusClass}">${job.status || 'Pendente'}</td>
                    `;
        });
    } catch (error) {
        console.error('Erro ao carregar jobs:', error);
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: #f56565;">Erro ao carregar conversões</td></tr>';
    }
}

// Verificar se já está logado
async function verificarSessao() {
    const isLoggedIn = localStorage.getItem('admin_logged_in');
    const token = localStorage.getItem('token');

    if (isLoggedIn === 'true' && token) {
        // Verificar se o token ainda é válido
        try {
            const res = await fetch(`${API_URL}/admin/stats`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            if (res.ok) {
                mostrarPainelAdmin();
                await loadStats();
                await loadUsers();
                await loadJobs();
            } else {
                logoutAdmin();
            }
        } catch (error) {
            console.error('Erro ao verificar sessão:', error);
            logoutAdmin();
        }
    }
}

// Adicionar evento de tecla Enter para login
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

// Atualizar dados a cada 30 segundos se estiver logado
setInterval(() => {
    const token = localStorage.getItem('token');
    if (token && document.getElementById('adminPanel').style.display === 'block') {
        loadStats();
        loadUsers();
        loadJobs();
    }
}, 30000);
