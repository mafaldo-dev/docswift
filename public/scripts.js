let currentFile = null;
let convertedBlob = null;
let convertedFileName = '';
let currentJobId = null;

const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const fileInfo = document.getElementById('fileInfo');
const fileName = document.getElementById('fileName');
const fileSize = document.getElementById('fileSize');
const conversionOptions = document.getElementById('conversionOptions');
const formatButtons = document.getElementById('formatButtons');
const loading = document.getElementById('loading');
const resultSection = document.getElementById('resultSection');
const viewBtn = document.getElementById('viewBtn');
const downloadBtn = document.getElementById('downloadBtn');
const previewArea = document.getElementById('previewArea');
const clearFile = document.getElementById('clearFile');

const API_URL = "https://backend-docswift.onrender.com";

// ─────────────────────────────────────────────
// AUTH — TOKEN
// ─────────────────────────────────────────────
function getToken() {
  return localStorage.getItem('docswift_token');
}

function setToken(token) {
  localStorage.setItem('docswift_token', token);
}

function removeToken() {
  localStorage.removeItem('docswift_token');
  localStorage.removeItem('docswift_user');
}

function getUser() {
  try {
    return JSON.parse(localStorage.getItem('docswift_user'));
  } catch {
    return null;
  }
}

function setUser(user) {
  localStorage.setItem('docswift_user', JSON.stringify(user));
}

function authHeaders() {
  const token = getToken();
  return token ? { 'Authorization': `Bearer ${token}` } : {};
}

// ─────────────────────────────────────────────
// AUTH — UI
// ─────────────────────────────────────────────
function renderUserArea() {
  const user = getUser();
  const area = document.getElementById('userArea');
  if (!area) return;

  if (user) {
    const isPro = user.plano === 'pro';
    area.innerHTML = `
      <span class="user-badge ${isPro ? 'pro' : 'free'}">${isPro ? '⚡ Pro' : 'Free'}</span>
      <span class="user-email">${user.email}</span>
      ${!isPro ? `<button class="btn btn-upgrade" onclick="openUpgradeModal()">Upgrade Pro — R$ 14,90/mês</button>` : ''}
      <button class="btn btn-outline btn-sm" onclick="logout()">Sair</button>
    `;
  } else {
    area.innerHTML = `
      <button class="btn btn-outline btn-sm" onclick="openAuthModal('login')">Entrar</button>
      <button class="btn btn-primary btn-sm" onclick="openAuthModal('register')">Criar conta</button>
    `;
  }
}

async function refreshUser() {
  const token = getToken();
  if (!token) return;
  try {
    const res = await fetch(`${API_URL}/auth/me`, { headers: authHeaders() });
    if (res.ok) {
      const user = await res.json();
      setUser(user);
      renderUserArea();
    } else {
      removeToken();
      renderUserArea();
    }
  } catch (e) {
    console.error('Erro ao atualizar usuário:', e);
  }
}

function logout() {
  removeToken();
  renderUserArea();
}

// ─────────────────────────────────────────────
// MODAL AUTH
// ─────────────────────────────────────────────
function openAuthModal(tab = 'login') {
  let modal = document.getElementById('authModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'authModal';
    modal.className = 'modal-overlay';
    document.body.appendChild(modal);
  }

  modal.innerHTML = `
    <div class="modal-box">
      <button class="modal-close" onclick="closeModal('authModal')">✕</button>
      <div class="modal-tabs">
        <button class="tab-btn ${tab === 'login' ? 'active' : ''}" onclick="switchTab('login')">Entrar</button>
        <button class="tab-btn ${tab === 'register' ? 'active' : ''}" onclick="switchTab('register')">Criar conta</button>
      </div>

      <div id="tabLogin" class="tab-content" style="${tab === 'login' ? '' : 'display:none'}">
        <p class="modal-subtitle">Acesse sua conta para mais conversões e arquivos maiores.</p>
        <input type="email" id="loginEmail" class="modal-input" placeholder="Seu e-mail">
        <input type="password" id="loginPassword" class="modal-input" placeholder="Senha">
        <div id="loginError" class="modal-error"></div>
        <button class="btn btn-primary btn-full" onclick="doLogin()">Entrar</button>
      </div>

      <div id="tabRegister" class="tab-content" style="${tab === 'register' ? '' : 'display:none'}">
        <p class="modal-subtitle">Crie sua conta grátis e converta arquivos de até 10MB.</p>
        <input type="email" id="regEmail" class="modal-input" placeholder="Seu e-mail">
        <input type="password" id="regPassword" class="modal-input" placeholder="Senha (mín. 6 caracteres)">
        <div id="regError" class="modal-error"></div>
        <button class="btn btn-primary btn-full" onclick="doRegister()">Criar conta grátis</button>
      </div>
    </div>
  `;

  modal.style.display = 'flex';
}

function switchTab(tab) {
  document.getElementById('tabLogin').style.display = tab === 'login' ? '' : 'none';
  document.getElementById('tabRegister').style.display = tab === 'register' ? '' : 'none';
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => {
    if (b.textContent.toLowerCase().includes(tab === 'login' ? 'entrar' : 'criar')) b.classList.add('active');
  });
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.style.display = 'none';
}

async function doLogin() {
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  const errEl = document.getElementById('loginError');
  errEl.textContent = '';

  if (!email || !password) { errEl.textContent = 'Preencha todos os campos.'; return; }

  try {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();

    if (!res.ok) { errEl.textContent = data.error || 'Erro ao entrar.'; return; }
    setToken(data.token);
    setUser(data.user);
    closeModal('authModal');
    renderUserArea();
    window.location.href = 'dashboard.html';
  } catch (e) {
    errEl.textContent = 'Erro de conexão.';
  }
}

async function doRegister() {
  const email = document.getElementById('regEmail').value.trim();
  const password = document.getElementById('regPassword').value;
  const errEl = document.getElementById('regError');
  errEl.textContent = '';

  if (!email || !password) { errEl.textContent = 'Preencha todos os campos.'; return; }

  try {
    const res = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok) { errEl.textContent = data.error || 'Erro ao criar conta.'; return; }
    setToken(data.token);
    setUser(data.user);
    closeModal('authModal');
    renderUserArea();
    window.location.href = 'dashboard.html';
  } catch (e) {
    errEl.textContent = 'Erro de conexão.';
  }
}

// ─────────────────────────────────────────────
// MODAL UPGRADE
// ─────────────────────────────────────────────
async function openUpgradeModal() {
  if (!getToken()) { openAuthModal('register'); return; }

  let modal = document.getElementById('upgradeModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'upgradeModal';
    modal.className = 'modal-overlay';
    document.body.appendChild(modal);
  }

  modal.innerHTML = `
    <div class="modal-box">
      <button class="modal-close" onclick="closeModal('upgradeModal')">✕</button>
      <h2 class="modal-title">⚡ DocSwift Pro</h2>
      <p class="modal-subtitle">Apenas <strong>R$ 14,90/mês</strong></p>
      <ul class="upgrade-list">
        <li>✅ Arquivos até <strong>200 MB</strong> (vs 10 MB no free)</li>
        <li>✅ Conversões <strong>ilimitadas</strong> por dia</li>
        <li>✅ Fila prioritária — sem espera</li>
        <li>✅ Histórico de conversões</li>
      </ul>
      <div id="upgradeError" class="modal-error"></div>
      <button class="btn btn-primary btn-full" onclick="iniciarPagamento()">
        <i class="fas fa-bolt"></i> Assinar Pro — R$ 14,90/mês
      </button>
      <p class="modal-hint">Pagamento seguro via Mercado Pago. Cancele quando quiser.</p>
    </div>
  `;

  modal.style.display = 'flex';
}

async function iniciarPagamento() {
  const errEl = document.getElementById('upgradeError');
  errEl.textContent = '';
  try {
    const res = await fetch(`${API_URL}/pagamento/criar`, {
      method: 'POST',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' }
    });
    const data = await res.json();
    if (!res.ok) { errEl.textContent = data.error || 'Erro ao iniciar pagamento.'; return; }
    window.location.href = data.checkout_url;
  } catch (e) {
    errEl.textContent = 'Erro de conexão.';
  }
}

// ─────────────────────────────────────────────
// UPLOAD
// ─────────────────────────────────────────────
uploadArea.addEventListener('click', () => {
  const token = getToken();

  if (!token) {
    openAuthModal('login');
    return;
  }

  fileInput.click();
});
fileInput.addEventListener('change', handleFileSelect);

uploadArea.addEventListener('dragover', (e) => {
  e.preventDefault();
  uploadArea.classList.add('drag-over');
});
uploadArea.addEventListener('dragleave', () => uploadArea.classList.remove('drag-over'));
uploadArea.addEventListener('drop', (e) => {
  e.preventDefault();
  uploadArea.classList.remove('drag-over');

  if (!getToken()) {
    openAuthModal('login');
    return;
  }

  if (e.dataTransfer.files.length > 0) {
    handleFile(e.dataTransfer.files[0]);
  }
});

if (clearFile) {
  clearFile.addEventListener('click', () => {
    currentFile = null;
    fileInfo.classList.remove('active');
    conversionOptions.classList.remove('active');
    resultSection.classList.remove('active');
    fileInput.value = '';
  });
}

function handleFileSelect(e) {
  if (e.target.files[0]) handleFile(e.target.files[0]);
}

function handleFile(file) {
  currentFile = file;
  fileName.innerHTML = `<i class="fas fa-file-alt"></i> <span>${file.name}</span>`;
  fileSize.textContent = `${(file.size / 1024).toFixed(2)} KB`;
  fileInfo.classList.add('active');
  resultSection.classList.remove('active');
  previewArea.style.display = 'none';
  showConversionOptions(file);
}

// ─────────────────────────────────────────────
// FORMATOS
// ─────────────────────────────────────────────
function showConversionOptions(file) {
  const ext = file.name.split('.').pop().toLowerCase();
  const formats = {
    'pdf': ['txt', 'docx', 'html'],
    'docx': ['pdf', 'txt', 'html'],
    'csv': ['json', 'txt', 'xlsx', 'html'],
    'txt': ['pdf', 'docx', 'html'],
    'json': ['csv', 'txt', 'html'],
    'html': ['pdf', 'txt'],
    'xlsx': ['csv', 'json', 'txt', 'html'],
    'xls': ['csv', 'json', 'txt', 'html']
  };
  const available = formats[ext] || ['txt', 'html'];
  formatButtons.innerHTML = '';
  available.forEach(format => {
    const btn = document.createElement('button');
    btn.className = 'format-btn';
    btn.textContent = format.toUpperCase();
    btn.onclick = () => convertFile(format);
    formatButtons.appendChild(btn);
  });
  conversionOptions.classList.add('active');
}

// ─────────────────────────────────────────────
// CONVERSÃO
// ─────────────────────────────────────────────
async function convertFile(targetFormat) {
  loading.classList.add('active');
  resultSection.classList.remove('active');
  previewArea.style.display = 'none';

  try {
    const formData = new FormData();
    formData.append("file", currentFile);
    formData.append("format", targetFormat);

    const res = await fetch(`${API_URL}/convert`, {
      method: "POST",
      headers: authHeaders(),   // envia token se logado
      body: formData
    });

    const data = await res.json();

    // Bateu no limite — mostra upgrade
    if (res.status === 403 && data.upgrade) {
      loading.classList.remove('active');
      if (getToken()) {
        openUpgradeModal();
      } else {
        showLimiteBanner(data.error);
      }
      return;
    }

    if (!data.id) throw new Error(data.error || "Erro ao iniciar conversão");

    currentJobId = data.id;
    await waitForProcessing(currentJobId, targetFormat);

  } catch (error) {
    alert('Erro na conversão: ' + error.message);
    console.error(error);
  } finally {
    loading.classList.remove('active');
  }
}

function showLimiteBanner(msg) {
  let banner = document.getElementById('limiteBanner');
  if (!banner) {
    banner = document.createElement('div');
    banner.id = 'limiteBanner';
    banner.className = 'limite-banner';
    document.querySelector('.converter-card').prepend(banner);
  }
  banner.innerHTML = `
    <i class="fas fa-exclamation-circle"></i>
    <span>${msg || 'Limite atingido.'}</span>
    <button class="btn btn-primary btn-sm" onclick="openAuthModal('register')">Criar conta grátis</button>
    <button class="btn btn-upgrade btn-sm" onclick="openUpgradeModal()">Ver Plano Pro</button>
  `;
  banner.style.display = 'flex';
}

// ─────────────────────────────────────────────
// POLLING
// ─────────────────────────────────────────────
async function waitForProcessing(id, format) {
  const maxAttempts = 40;
  for (let i = 0; i < maxAttempts; i++) {
    const res = await fetch(`${API_URL}/status/${id}?_=${Date.now()}`, {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache' }
    });
    const data = await res.json();

    if (data.status === 'error') throw new Error(data.error || 'Erro na conversão');

    if (data.status === 'done') {
      const fileRes = await fetch(`${API_URL}${data.download}`, { cache: 'no-store' });
      if (!fileRes.ok) throw new Error(`Falha no download: ${fileRes.status}`);
      convertedBlob = await fileRes.blob();
      convertedFileName = `arquivo_convertido.${format}`;
      showResult(format);
      return;
    }

    await new Promise(r => setTimeout(r, 2000));
  }
  throw new Error('Tempo limite excedido');
}

// ─────────────────────────────────────────────
// RESULTADO
// ─────────────────────────────────────────────
function showResult(format) {
  resultSection.classList.add('active');
  previewArea.style.display = 'none';
  viewBtn.onclick = () => previewFile(format);
  downloadBtn.onclick = () => downloadFile();
}

async function previewFile(format) {
  previewArea.style.display = 'block';
  previewArea.innerHTML = '<div class="loading-preview"><i class="fas fa-spinner fa-spin"></i> Carregando preview...</div>';

  try {
    if (['txt', 'html'].includes(format)) {
      const text = await convertedBlob.text();
      previewArea.innerHTML = `<pre class="preview-text">${escapeHtml(text.substring(0, 10000))}${text.length > 10000 ? '\n\n... (preview limitado)' : ''}</pre>`;
    } else if (format === 'json') {
      const text = await convertedBlob.text();
      try {
        previewArea.innerHTML = `<pre class="preview-json">${JSON.stringify(JSON.parse(text), null, 2).substring(0, 10000)}</pre>`;
      } catch {
        previewArea.innerHTML = `<pre class="preview-text">${escapeHtml(text.substring(0, 10000))}</pre>`;
      }
    } else {
      const icons = { pdf: 'fa-file-pdf', docx: 'fa-file-word', xlsx: 'fa-file-excel', csv: 'fa-table' };
      const colors = { pdf: '#e53e3e', docx: '#2b5797', xlsx: '#1e6c31', csv: '#10b981' };
      previewArea.innerHTML = `
        <div style="text-align:center;padding:2rem">
          <i class="fas ${icons[format] || 'fa-file'}" style="font-size:3rem;color:${colors[format] || '#667eea'}"></i>
          <p style="margin-top:1rem">Arquivo ${format.toUpperCase()} gerado com sucesso!</p>
          <button class="btn btn-primary" style="margin-top:1rem" onclick="downloadFile()">
            <i class="fas fa-download"></i> Baixar ${format.toUpperCase()}
          </button>
        </div>`;
    }
  } catch {
    previewArea.innerHTML = `<div style="text-align:center;padding:2rem;color:#e53e3e">
      <i class="fas fa-exclamation-triangle" style="font-size:3rem"></i>
      <p>Não foi possível carregar o preview. Clique em "Baixar".</p></div>`;
  }
}

function downloadFile() {
  if (!convertedBlob) return;
  const url = URL.createObjectURL(convertedBlob);
  const a = document.createElement('a');
  a.href = url;
  a.download = convertedFileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─────────────────────────────────────────────
// UTILITÁRIOS
// ─────────────────────────────────────────────
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

document.getElementById('scrollToConverter')?.addEventListener('click', () => {
  document.getElementById('converter').scrollIntoView({ behavior: 'smooth' });
});

document.querySelectorAll('.faq-item').forEach(item => {
  item.querySelector('.faq-question').addEventListener('click', () => item.classList.toggle('active'));
});

const navToggle = document.querySelector('.nav-toggle');
const navMenu = document.querySelector('.nav-menu');
navToggle?.addEventListener('click', () => navMenu.classList.toggle('active'));
document.querySelectorAll('.nav-link').forEach(l => l.addEventListener('click', () => navMenu.classList.remove('active')));

window.addEventListener('scroll', () => {
  const scrollPos = window.scrollY + 100;
  document.querySelectorAll('section').forEach(section => {
    const id = section.getAttribute('id');
    if (scrollPos >= section.offsetTop && scrollPos < section.offsetTop + section.offsetHeight && id) {
      document.querySelectorAll('.nav-link').forEach(l => {
        l.classList.toggle('active', l.getAttribute('href') === `#${id}`);
      });
    }
  });
});

// Fecha modal clicando fora
document.addEventListener('click', (e) => {
  ['authModal', 'upgradeModal'].forEach(id => {
    const modal = document.getElementById(id);
    if (modal && e.target === modal) closeModal(id);
  });
});

// Verifica retorno do pagamento
if (new URLSearchParams(window.location.search).get('upgrade') === 'ok') {
  refreshUser().then(() => {
    const banner = document.createElement('div');
    banner.className = 'sucesso-banner';
    banner.innerHTML = '⚡ Plano Pro ativado com sucesso! Bem-vindo ao DocSwift Pro.';
    document.body.prepend(banner);
    setTimeout(() => banner.remove(), 5000);
    window.history.replaceState({}, '', '/');
  });
}

// ─────────────────────────────────────────────
// INIT
// ─────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  renderUserArea();
  refreshUser();
});