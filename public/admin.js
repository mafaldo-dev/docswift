const API_URL = "https://backend-docswift.onrender.com";

const token = localStorage.getItem("token");

async function loadStats() {

    const res = await fetch(`${API_URL}/admin/stats`, {
        headers: {
            Authorization: `Bearer ${token}`
        }
    });

    const data = await res.json();

    document.getElementById("usuariosTotal").textContent = data.usuarios_total;
    document.getElementById("usuariosPro").textContent = data.usuarios_pro;
    document.getElementById("conversoesTotal").textContent = data.conversoes_total;
    document.getElementById("conversoesHoje").textContent = data.conversoes_hoje;
}

async function loadUsers() {

    const res = await fetch(`${API_URL}/admin/users`, {
        headers: {
            Authorization: `Bearer ${token}`
        }
    });

    const users = await res.json();

    const tbody = document.querySelector("#usersTable tbody");

    users.forEach(user => {

        tbody.innerHTML += `
            <tr>
                <td>${user.email}</td>
                <td>${user.plano}</td>
                <td>${new Date(user.criado_em).toLocaleString()}</td>
            </tr>
        `;
    });
}

async function loadJobs() {

    const res = await fetch(`${API_URL}/admin/jobs`, {
        headers: {
            Authorization: `Bearer ${token}`
        }
    });

    const jobs = await res.json();

    const tbody = document.querySelector("#jobsTable tbody");

    jobs.forEach(job => {

        tbody.innerHTML += `
            <tr>
                <td>${job.usuario}</td>
                <td>${job.arquivo}</td>
                <td>${job.entrada}</td>
                <td>${job.saida}</td>
                <td>${(job.tamanho_original / 1024 / 1024).toFixed(2)} MB</td>
                <td>${new Date(job.data).toLocaleString()}</td>
            </tr>
        `;
    });
}

loadStats();
loadUsers();
loadJobs();