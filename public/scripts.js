let currentFile = null;
let convertedBlob = null;
let convertedFileName = '';
let currentJobId = null;
let pollingInterval = null;

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

// =======================
// BACKEND URL
// =======================
const API_URL = "https://backend-docswift.onrender.com";

// =======================
// UPLOAD EVENTS
// =======================
uploadArea.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', handleFileSelect);

uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('drag-over');
});

uploadArea.addEventListener('dragleave', () => {
    uploadArea.classList.remove('drag-over');
});

uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('drag-over');
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        handleFile(files[0]);
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
    const file = e.target.files[0];
    if (file) handleFile(file);
}

function handleFile(file) {
    currentFile = file;
    const nameSpan = fileName.querySelector('span') || fileName;
    if (nameSpan.tagName === 'SPAN') {
        nameSpan.textContent = file.name;
    } else {
        fileName.innerHTML = `<i class="fas fa-file-alt"></i> <span>${file.name}</span>`;
    }
    fileSize.textContent = `${(file.size / 1024).toFixed(2)} KB`;
    fileInfo.classList.add('active');
    
    // Limpa resultados anteriores
    resultSection.classList.remove('active');
    previewArea.style.display = 'none';
    
    showConversionOptions(file);
}

// =======================
// FORMATOS DISPONÍVEIS
// =======================
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
        btn.innerHTML = format.toUpperCase();
        btn.onclick = () => convertFile(format);
        formatButtons.appendChild(btn);
    });

    conversionOptions.classList.add('active');
}

// =======================
// CONVERSÃO
// =======================
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
            body: formData
        });

        const data = await res.json();

        if (!data.id) {
            throw new Error(data.error || "Erro ao iniciar conversão");
        }

        currentJobId = data.id;
        
        // Aguarda processamento
        await waitForProcessing(currentJobId, targetFormat);

    } catch (error) {
        alert('Erro na conversão: ' + error.message);
        console.error(error);
    } finally {
        loading.classList.remove('active');
    }
}

// =======================
// WAIT FOR PROCESSING
// =======================
async function waitForProcessing(id, format) {
    let attempts = 0;
    const maxAttempts = 40;

    while (attempts < maxAttempts) {
        try {
            const res = await fetch(`${API_URL}/status/${id}?_=${Date.now()}`, {
                method: 'GET',
                cache: 'no-store',
                headers: {
                    'Cache-Control': 'no-cache, no-store, must-revalidate'
                }
            });
            
            const data = await res.json();
            
            console.log(`Status check (${attempts + 1}/${maxAttempts}):`, data);

            if (data.status === 'error') {
                throw new Error(data.error || 'Erro na conversão');
            }

            if (data.status === 'done') {
                if (!data.download || data.download === '/download/null') {
                    throw new Error('Arquivo convertido não disponível para download');
                }
                
                const downloadUrl = `${API_URL}${data.download}`;
                const fileRes = await fetch(downloadUrl, {
                    cache: 'no-store'
                });
                
                if (!fileRes.ok) {
                    throw new Error(`Falha no download: ${fileRes.status}`);
                }
                
                convertedBlob = await fileRes.blob();
                convertedFileName = `arquivo_convertido.${format}`;
                
                showResult(format);
                return;
            }

            await new Promise(r => setTimeout(r, 2000));
            attempts++;
            
        } catch (error) {
            console.error('Erro no polling:', error);
            throw error;
        }
    }

    throw new Error('Tempo limite excedido - arquivo não ficou pronto a tempo');
}

// =======================
// RESULTADO
// =======================
function showResult(format) {
    resultSection.classList.add('active');
    previewArea.style.display = 'none';
    
    // Configura os botões com o formato atual
    viewBtn.onclick = () => previewFile(format);
    downloadBtn.onclick = () => downloadFile();
}

// =======================
// PREVIEW DO ARQUIVO
// =======================
async function previewFile(format) {
    previewArea.style.display = 'block';
    previewArea.innerHTML = '<div class="loading-preview"><i class="fas fa-spinner fa-spin"></i> Carregando preview...</div>';
    
    try {
        if (format === 'txt' || format === 'html') {
            // Para TXT e HTML, mostra o texto diretamente
            const text = await convertedBlob.text();
            previewArea.innerHTML = `<pre class="preview-text">${escapeHtml(text.substring(0, 10000))}${text.length > 10000 ? '\n\n... (preview limitado)' : ''}</pre>`;
            
        } else if (format === 'pdf') {
            // Para PDF, usa PDF.js ou mostra mensagem
            previewArea.innerHTML = `
                <div style="text-align: center; padding: 2rem;">
                    <i class="fas fa-file-pdf" style="font-size: 3rem; color: #e53e3e;"></i>
                    <p style="margin-top: 1rem;">Arquivo PDF gerado com sucesso!</p>
                    <p style="font-size: 0.875rem; color: #666;">Clique em "Baixar" para visualizar o arquivo completo.</p>
                    <button class="btn btn-primary" style="margin-top: 1rem;" onclick="document.getElementById('downloadBtn').click()">
                        <i class="fas fa-download"></i> Baixar PDF
                    </button>
                </div>
            `;
            
        } else if (format === 'docx') {
            // Para DOCX, mostra mensagem informativa
            previewArea.innerHTML = `
                <div style="text-align: center; padding: 2rem;">
                    <i class="fas fa-file-word" style="font-size: 3rem; color: #2b5797;"></i>
                    <p style="margin-top: 1rem;">Arquivo DOCX gerado com sucesso!</p>
                    <p style="font-size: 0.875rem; color: #666;">Para visualizar a formatação completa, baixe o arquivo e abra no Microsoft Word ou LibreOffice.</p>
                    <button class="btn btn-primary" style="margin-top: 1rem;" onclick="document.getElementById('downloadBtn').click()">
                        <i class="fas fa-download"></i> Baixar DOCX
                    </button>
                </div>
            `;
            
        } else if (format === 'json') {
            // Para JSON, formata bonito
            const text = await convertedBlob.text();
            try {
                const json = JSON.parse(text);
                previewArea.innerHTML = `<pre class="preview-json">${JSON.stringify(json, null, 2).substring(0, 10000)}</pre>`;
            } catch {
                previewArea.innerHTML = `<pre class="preview-text">${escapeHtml(text.substring(0, 10000))}</pre>`;
            }
            
        } else if (format === 'csv' || format === 'xlsx') {
            // Para CSV e XLSX
            previewArea.innerHTML = `
                <div style="text-align: center; padding: 2rem;">
                    <i class="fas fa-table" style="font-size: 3rem; color: #10b981;"></i>
                    <p style="margin-top: 1rem;">Arquivo ${format.toUpperCase()} gerado com sucesso!</p>
                    <p style="font-size: 0.875rem; color: #666;">Clique em "Baixar" para visualizar o arquivo completo.</p>
                    <button class="btn btn-primary" style="margin-top: 1rem;" onclick="document.getElementById('downloadBtn').click()">
                        <i class="fas fa-download"></i> Baixar ${format.toUpperCase()}
                    </button>
                </div>
            `;
            
        } else {
            // Fallback genérico
            previewArea.innerHTML = `
                <div style="text-align: center; padding: 2rem;">
                    <i class="fas fa-file" style="font-size: 3rem;"></i>
                    <p style="margin-top: 1rem;">Arquivo convertido para ${format.toUpperCase()}</p>
                    <button class="btn btn-primary" style="margin-top: 1rem;" onclick="document.getElementById('downloadBtn').click()">
                        <i class="fas fa-download"></i> Baixar Arquivo
                    </button>
                </div>
            `;
        }
        
    } catch (error) {
        console.error('Erro ao carregar preview:', error);
        previewArea.innerHTML = `
            <div style="text-align: center; padding: 2rem; color: #e53e3e;">
                <i class="fas fa-exclamation-triangle" style="font-size: 3rem;"></i>
                <p style="margin-top: 1rem;">Não foi possível carregar o preview.</p>
                <p style="font-size: 0.875rem;">Clique em "Baixar" para visualizar o arquivo.</p>
            </div>
        `;
    }
}

// =======================
// DOWNLOAD
// =======================
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

// =======================
// UTILITÁRIOS
// =======================
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Scroll para o conversor
const scrollToConverter = document.getElementById('scrollToConverter');
if (scrollToConverter) {
    scrollToConverter.addEventListener('click', () => {
        document.getElementById('converter').scrollIntoView({ behavior: 'smooth' });
    });
}

// FAQ Accordion
document.querySelectorAll('.faq-item').forEach(item => {
    const question = item.querySelector('.faq-question');
    question.addEventListener('click', () => {
        item.classList.toggle('active');
    });
});

// Mobile Menu
const navToggle = document.querySelector('.nav-toggle');
const navMenu = document.querySelector('.nav-menu');

if (navToggle && navMenu) {
    navToggle.addEventListener('click', () => {
        navMenu.classList.toggle('active');
    });
}

// Fecha menu ao clicar em um link
document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => {
        navMenu.classList.remove('active');
    });
});

// Ativa link ativo no scroll
window.addEventListener('scroll', () => {
    const sections = document.querySelectorAll('section');
    const scrollPos = window.scrollY + 100;
    
    sections.forEach(section => {
        const top = section.offsetTop;
        const bottom = top + section.offsetHeight;
        const id = section.getAttribute('id');
        
        if (scrollPos >= top && scrollPos < bottom && id) {
            document.querySelectorAll('.nav-link').forEach(link => {
                link.classList.remove('active');
                if (link.getAttribute('href') === `#${id}`) {
                    link.classList.add('active');
                }
            });
        }
    });
});