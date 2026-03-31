let currentFile = null;
let convertedBlob = null;
let convertedFileName = '';

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

function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) handleFile(file);
}

function handleFile(file) {
    currentFile = file;
    fileName.textContent = `📄 ${file.name}`;
    fileSize.textContent = `Tamanho: ${(file.size / 1024).toFixed(2)} KB`;
    fileInfo.classList.add('active');

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
        btn.textContent = format.toUpperCase();
        btn.onclick = () => convertFile(format);
        formatButtons.appendChild(btn);
    });

    conversionOptions.classList.add('active');
}

// =======================
// CHAMADA PRO BACKEND
// =======================
async function sendToBackend(file, format) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("format", format);

    // 1. envia pra conversão
    const res = await fetch("https://backend-docswift.onrender.com/convert", {
        method: "POST",
        body: formData
    });

    const data = await res.json();

    if (!res.ok) {
        throw new Error(data.error || "Erro no servidor");
    }

    // 2. tenta baixar o arquivo (com retry porque pode demorar)
    const downloadUrl = "https://backend-docswift.onrender.com" + data.download;

    let attempts = 0;
    let blob = null;

    while (attempts < 40) {
        const downloadRes = await fetch(downloadUrl);

        if (downloadRes.ok) {
            blob = await downloadRes.blob();
            break;
        }

        // espera 1 segundo antes de tentar de novo
        await new Promise(r => setTimeout(r, 3000));
        attempts++;
    }

    if (!blob) {
        throw new Error("Arquivo não ficou pronto a tempo");
    }

    return blob;
}

// =======================
// CONVERSÃO
// =======================
async function convertFile(targetFormat) {
    if (!currentFile) return;

    loading.classList.add('active');
    resultSection.classList.remove('active');

    try {
        const baseName = currentFile.name.replace(/\.[^/.]+$/, '');

        // chama backend
        convertedBlob = await sendToBackend(currentFile, targetFormat);

        convertedFileName = `${baseName}.${targetFormat}`;

        showResult();
    } catch (error) {
        alert('Erro na conversão: ' + error.message);
    } finally {
        loading.classList.remove('active');
    }
}

// =======================
// RESULTADO
// =======================
function showResult() {
    resultSection.classList.add('active');
    previewArea.style.display = 'none';
}

// =======================
// VISUALIZAR
// =======================
viewBtn.addEventListener('click', async () => {
    const text = await convertedBlob.text();
    previewArea.textContent = text.substring(0, 5000) + (text.length > 5000 ? '\n\n... (preview limitado)' : '');
    previewArea.style.display = 'block';
});

// =======================
// DOWNLOAD
// =======================
downloadBtn.addEventListener('click', () => {
    const url = URL.createObjectURL(convertedBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = convertedFileName;
    a.click();
    URL.revokeObjectURL(url);
});
