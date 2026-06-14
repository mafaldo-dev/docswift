
const API_URL = "https://backend-docswift.onrender.com";
let adminEmail = null;
let adminPassword = null;
let conversionChart = null;
let userDistributionChart = null;

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

    if (response.status === 403 || response.status === 401) {
        logoutAdmin();
        throw new Error('Session expired');
    }

    return response;
}

async function fazerLogin() {
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const errorDiv = document.getElementById('loginError');
    const loginBtn = document.querySelector('.login-btn');

    if (!email || !password) {
        errorDiv.textContent = '❌ Please fill in all fields!';
        errorDiv.style.display = 'block';
        return;
    }

    loginBtn.disabled = true;
    loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing In...';

    try {
        const response = await fetch(`${API_URL}/admin/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (response.ok && data.success === true) {
            adminEmail = email;
            adminPassword = password;

            localStorage.setItem('admin_logged_in', 'true');
            localStorage.setItem('admin_email', email);
            localStorage.setItem('admin_password', btoa(password));

            document.getElementById('loginScreen').style.display = 'none';
            document.getElementById('dashboard').style.display = 'block';
            errorDiv.style.display = 'none';

            await loadAllData();
            initCharts();
        } else {
            errorDiv.textContent = data.error || '❌ Invalid credentials!';
            errorDiv.style.display = 'block';
        }
    } catch (error) {
        console.error('Login error:', error);
        errorDiv.textContent = '❌ Connection error. Please try again.';
        errorDiv.style.display = 'block';
    } finally {
        loginBtn.disabled = false;
        loginBtn.innerHTML = '<i class="fas fa-arrow-right"></i> Sign In';
    }
}

function logoutAdmin() {
    adminEmail = null;
    adminPassword = null;
    localStorage.removeItem('admin_logged_in');
    localStorage.removeItem('admin_email');
    localStorage.removeItem('admin_password');
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('dashboard').style.display = 'none';
}

async function loadAllData() {
    await Promise.all([
        loadStats(),
        loadUsers(),
        loadJobs()
    ]);
}

async function loadStats() {
    try {
        const response = await fetchAdmin('/admin/stats');
        const data = await response.json();

        document.getElementById("usuariosTotal").textContent = (data.usuarios_total || 0).toLocaleString();
        document.getElementById("usuariosPro").textContent = (data.usuarios_pro || 0).toLocaleString();
        document.getElementById("conversoesTotal").textContent = (data.conversoes_total || 0).toLocaleString();
        document.getElementById("conversoesHoje").textContent = (data.conversoes_hoje || 0).toLocaleString();
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

async function loadUsers() {
    const tbody = document.querySelector("#usersTable tbody");
    tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 60px;"><div class="skeleton" style="width: 100%; height: 20px;"></div></td></tr>';

    try {
        const response = await fetchAdmin('/admin/users');
        const users = await response.json();

        tbody.innerHTML = '';

        if (!users || users.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 60px;">No users found</td></tr>';
            return;
        }

        users.forEach(user => {
            const row = tbody.insertRow();
            row.innerHTML = `
                        <td>${user.id || 'N/A'}</td>
                        <td>${user.email || 'N/A'}</td>
                        <td><span class="badge ${user.plano === 'pro' ? 'badge-pro' : 'badge-free'}">${user.plano === 'pro' ? 'PRO' : 'FREE'}</span></td>
                        <td>${user.criado_em ? new Date(user.criado_em).toLocaleString() : 'N/A'}</td>
                    `;
        });
    } catch (error) {
        console.error('Error loading users:', error);
        tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 60px; color: #dc2626;">Error loading users</td></tr>';
    }
}

async function loadJobs() {
    const tbody = document.querySelector("#jobsTable tbody");
    tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 60px;"><div class="skeleton" style="width: 100%; height: 20px;"></div></td></tr>';

    try {
        const response = await fetchAdmin('/admin/jobs');
        const jobs = await response.json();

        tbody.innerHTML = '';

        if (!jobs || jobs.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 60px;">No conversions found</td></tr>';
            return;
        }

        jobs.forEach(job => {
            const row = tbody.insertRow();
            const tamanhoFormatado = job.tamanho_original ?
                `${(job.tamanho_original / 1024 / 1024).toFixed(2)} MB` : 'N/A';

            let statusClass = '';
            let statusText = '';

            if (job.status === 'done') {
                statusClass = 'badge-success';
                statusText = 'Completed';
            } else if (job.status === 'processing') {
                statusClass = 'badge-warning';
                statusText = 'Processing';
            } else {
                statusClass = 'badge-error';
                statusText = 'Failed';
            }

            row.innerHTML = `
                        <td>${job.usuario || 'N/A'}</td>
                        <td>${job.arquivo || 'N/A'}</td>
                        <td>${job.entrada?.toUpperCase() || 'N/A'}</td>
                        <td>${job.saida?.toUpperCase() || 'N/A'}</td>
                        <td>${tamanhoFormatado}</td>
                        <td><span class="badge ${statusClass}">${statusText}</span></td>
                        <td>${job.ip || 'N/A'}</td>
                        <td>${job.data ? new Date(job.data).toLocaleString() : 'N/A'}</td>
                    `;
        });
    } catch (error) {
        console.error('Error loading jobs:', error);
        tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 60px; color: #dc2626;">Error loading conversions</td></tr>';
    }
}

function initCharts() {
    const ctx1 = document.getElementById('conversionChart').getContext('2d');
    const ctx2 = document.getElementById('userDistributionChart').getContext('2d');

    conversionChart = new Chart(ctx1, {
        type: 'line',
        data: {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
            datasets: [{
                label: 'Conversions',
                data: [65, 78, 82, 91, 105, 120],
                borderColor: '#667eea',
                backgroundColor: 'rgba(102, 126, 234, 0.1)',
                borderWidth: 3,
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });

    userDistributionChart = new Chart(ctx2, {
        type: 'doughnut',
        data: {
            labels: ['Pro Plan', 'Free Plan'],
            datasets: [{
                data: [30, 70],
                backgroundColor: ['#667eea', '#e5e7eb'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

function showSection(section) {
    document.getElementById('overviewSection').style.display = 'none';
    document.getElementById('usersSection').style.display = 'none';
    document.getElementById('conversionsSection').style.display = 'none';

    if (section === 'overview') {
        document.getElementById('overviewSection').style.display = 'block';
    } else if (section === 'users') {
        document.getElementById('usersSection').style.display = 'block';
    } else if (section === 'conversions') {
        document.getElementById('conversionsSection').style.display = 'block';
    }

    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    event.currentTarget.classList.add('active');
}

async function verificarSessao() {
    const isLoggedIn = localStorage.getItem('admin_logged_in');
    const storedEmail = localStorage.getItem('admin_email');
    const storedPassword = localStorage.getItem('admin_password');

    if (isLoggedIn === 'true' && storedEmail && storedPassword) {
        adminEmail = storedEmail;
        adminPassword = atob(storedPassword);

        try {
            await fetchAdmin('/admin/stats');
            document.getElementById('loginScreen').style.display = 'none';
            document.getElementById('dashboard').style.display = 'block';
            await loadAllData();
            initCharts();
        } catch (error) {
            logoutAdmin();
        }
    }
}

document.addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
        if (document.getElementById('loginScreen').style.display !== 'none') {
            fazerLogin();
        }
    }
});

verificarSessao();

setInterval(() => {
    if (adminEmail && adminPassword && document.getElementById('dashboard').style.display === 'block') {
        loadStats();
    }
}, 30000);