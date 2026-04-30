// ======================== PRODUCTION-READY CANVAS FIX ========================
// State Management
let titikLintasan = [];
let modeInput = "koordinat";
let zoomLevel = 1;
let panX = 0, panY = 0;
let isPanning = false;
let panStart = { x: 0, y: 0 };
let renderAttempts = 0;
const MAX_RENDER_ATTEMPTS = 5;

// DOM Elements
const canvas = document.getElementById('surveyCanvas');
const ctx = canvas.getContext('2d');

// Set canvas size dengan fixed dimension
canvas.width = 800;
canvas.height = 500;

// UI Elements (your existing code...)
const modeKoordinatBtn = document.getElementById('modeKoordinatBtn');
const modeJarakArahBtn = document.getElementById('modeJarakArahBtn');
const formKoordinat = document.getElementById('formKoordinat');
const formJarakArah = document.getElementById('formJarakArah');
const btnTambahKoordinat = document.getElementById('btnTambahKoordinat');
const btnTambahJarakArah = document.getElementById('btnTambahJarakArah');
const btnTitikAwal = document.getElementById('btnTitikAwal');
const btnTutupLintasan = document.getElementById('btnTutupLintasan');
const btnResetSemua = document.getElementById('btnResetSemua');
const btnContohPoligon = document.getElementById('btnContohPoligon');
const btnContohTerbuka = document.getElementById('btnContohTerbuka');
const resetZoomBtn = document.getElementById('resetZoomBtn');
const listContainer = document.getElementById('listContainer');
const totalJarakSpan = document.getElementById('totalJarakDisplay');
const luasAreaSpan = document.getElementById('luasAreaDisplay');
const closingErrorSpan = document.getElementById('closingErrorDisplay');
const segmentDetailDiv = document.getElementById('segmentDetail');
const bearingDetailDiv = document.getElementById('bearingDetail');
const titikCountSpan = document.getElementById('titikCount');
const segmentCountSpan = document.getElementById('segmentCount');
const bearingCountSpan = document.getElementById('bearingCount');

const inputX = document.getElementById('inputX');
const inputY = document.getElementById('inputY');
const inputJarak = document.getElementById('inputJarak');
const inputAzimuth = document.getElementById('inputAzimuth');

// Modal Elements
const editModal = document.getElementById('editModal');
let editIndex = null;

// ======================== NOTIFICATION SYSTEM ========================
function showNotification(message, type = 'success', title = '') {
    const container = document.getElementById('notificationContainer');
    const id = Date.now();
    
    const titles = {
        success: 'Berhasil',
        error: 'Gagal',
        warning: 'Peringatan',
        info: 'Info'
    };
    
    const icons = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️'
    };
    
    const finalTitle = title || titles[type] || 'Info';
    
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.id = `notif-${id}`;
    notification.innerHTML = `
        <div class="notification-icon">${icons[type] || 'ℹ️'}</div>
        <div class="notification-content">
            <div class="notification-title">${finalTitle}</div>
            <div class="notification-message">${message}</div>
        </div>
    `;
    
    container.appendChild(notification);
    
    setTimeout(() => {
        const el = document.getElementById(`notif-${id}`);
        if (el) {
            el.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => el.remove(), 300);
        }
    }, 3000);
}

// ======================== GEOMETRY FUNCTIONS ========================
function hitungJarak(p1, p2) {
    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;
    return Math.sqrt(dx * dx + dy * dy);
}

function hitungAzimuth(p1, p2) {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    let azimuth = Math.atan2(dx, dy) * 180 / Math.PI;
    if (azimuth < 0) azimuth += 360;
    return azimuth;
}

function azimuthToDelta(jarak, azimuthDeg) {
    const rad = azimuthDeg * Math.PI / 180;
    const dx = jarak * Math.sin(rad);
    const dy = jarak * Math.cos(rad);
    return { dx, dy };
}

function hitungTotalDanSegmen(points) {
    if (points.length < 2) return { total: 0, segments: [], bearings: [] };
    let total = 0;
    const segments = [];
    const bearings = [];
    for (let i = 0; i < points.length - 1; i++) {
        const jarak = hitungJarak(points[i], points[i + 1]);
        const azimuth = hitungAzimuth(points[i], points[i + 1]);
        total += jarak;
        segments.push({ from: i, to: i + 1, distance: jarak });
        bearings.push({ from: i, to: i + 1, azimuth: azimuth, distance: jarak });
    }
    return { total, segments, bearings };
}

function hitungLuasPoligon(points) {
    if (points.length < 3) return 0;
    let sum1 = 0, sum2 = 0;
    for (let i = 0; i < points.length; i++) {
        const p1 = points[i];
        const p2 = points[(i + 1) % points.length];
        sum1 += p1.x * p2.y;
        sum2 += p1.y * p2.x;
    }
    return Math.abs(sum1 - sum2) / 2;
}

function hitungClosingError(points) {
    if (points.length < 2) return null;
    const first = points[0];
    const last = points[points.length - 1];
    const errorX = last.x - first.x;
    const errorY = last.y - first.y;
    const errorDistance = Math.sqrt(errorX * errorX + errorY * errorY);
    return { errorX, errorY, errorDistance };
}

// ======================== UPDATE UI ========================
function updateInfoDanGambar() {
    const { total, segments, bearings } = hitungTotalDanSegmen(titikLintasan);
    
    totalJarakSpan.innerHTML = `${total.toFixed(2)} m`;
    
    if (titikLintasan.length < 2) {
        segmentDetailDiv.innerHTML = '<div style="text-align:center; opacity:0.5;">-</div>';
        bearingDetailDiv.innerHTML = '<div style="text-align:center; opacity:0.5;">-</div>';
        if (segmentCountSpan) segmentCountSpan.innerText = '0';
        if (bearingCountSpan) bearingCountSpan.innerText = '0';
    } else {
        let segHtml = '';
        segments.forEach((seg, idx) => {
            segHtml += `<div class="segment-badge">S${idx + 1}: ${seg.distance.toFixed(2)} m</div>`;
        });
        segmentDetailDiv.innerHTML = segHtml;
        if (segmentCountSpan) segmentCountSpan.innerText = segments.length;
        
        let bearingHtml = '';
        bearings.forEach((bear, idx) => {
            let direction = '';
            const az = bear.azimuth;
            if (az >= 0 && az < 90) direction = `U${az.toFixed(1)}°T`;
            else if (az >= 90 && az < 180) direction = `T${(90 - (az - 90)).toFixed(1)}°S`;
            else if (az >= 180 && az < 270) direction = `S${(az - 180).toFixed(1)}°B`;
            else direction = `B${(360 - az).toFixed(1)}°U`;
            
            bearingHtml += `<div class="bearing-badge" title="Azimuth: ${az.toFixed(2)}°">
                S${idx + 1}: ${bear.distance.toFixed(1)}m @ ${az.toFixed(1)}° (${direction})
            </div>`;
        });
        bearingDetailDiv.innerHTML = bearingHtml;
        if (bearingCountSpan) bearingCountSpan.innerText = bearings.length;
    }
    
    let luas = 0;
    if (titikLintasan.length >= 3) {
        luas = hitungLuasPoligon(titikLintasan);
    }
    luasAreaSpan.innerHTML = `${luas.toFixed(2)} m² <span style="font-size:0.7rem;">(${(luas / 10000).toFixed(4)} ha)</span>`;
    
    const error = hitungClosingError(titikLintasan);
    if (error && titikLintasan.length >= 2) {
        if (Math.abs(error.errorDistance) < 0.001) {
            closingErrorSpan.innerHTML = `0.000 m (Tertutup Sempurna)`;
            closingErrorSpan.style.color = '#10b981';
        } else {
            closingErrorSpan.innerHTML = `${error.errorDistance.toFixed(3)} m`;
            closingErrorSpan.style.color = '#fbbf24';
        }
    } else {
        closingErrorSpan.innerHTML = `--`;
    }
    
    if (titikCountSpan) titikCountSpan.innerText = titikLintasan.length;
    
    // FORCE DRAW dengan multiple strategy
    forceCanvasDraw();
}

// ======================== PRODUCTION CANVAS DRAW FIX ========================
function forceCanvasDraw() {
    // Strategy 1: Immediate draw
    if (ctx && canvas) {
        gambarLintasan();
    }
    
    // Strategy 2: Next frame (bypass layout blocking)
    requestAnimationFrame(() => {
        gambarLintasan();
    });
    
    // Strategy 3: Slight delay for CSS/fonts
    setTimeout(() => {
        gambarLintasan();
    }, 50);
    
    // Strategy 4: Double RAF for complex layouts
    requestAnimationFrame(() => {
        setTimeout(() => {
            gambarLintasan();
        }, 0);
    });
}

// ======================== CANVAS DRAWING ========================
function gambarLintasan() {
    if (!ctx || !canvas) {
        console.warn('Canvas not ready');
        return;
    }
    
    // Pastikan canvas size valid
    if (canvas.width === 0 || canvas.height === 0) {
        canvas.width = 800;
        canvas.height = 500;
    }
    
    const w = canvas.width, h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    
    // Always draw background grid first
    ctx.save();
    ctx.strokeStyle = "#e2e8f0";
    ctx.lineWidth = 0.5;
    for (let i = 0; i < w; i += 50) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, h);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(w, i);
        ctx.stroke();
    }
    ctx.restore();
    
    if (titikLintasan.length === 0) {
        ctx.font = "500 14px 'Plus Jakarta Sans'";
        ctx.fillStyle = "#94a3b8";
        ctx.textAlign = "center";
        ctx.fillText("🗺️ Tambahkan titik untuk memulai survei", w/2, h/2);
        return;
    }
    
    // Calculate bounds
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    titikLintasan.forEach(p => {
        minX = Math.min(minX, p.x);
        maxX = Math.max(maxX, p.x);
        minY = Math.min(minY, p.y);
        maxY = Math.max(maxY, p.y);
    });
    
    const padding = 60;
    let rangeX = maxX - minX;
    let rangeY = maxY - minY;
    
    if (rangeX === 0) rangeX = 100;
    if (rangeY === 0) rangeY = 100;
    
    let scaleX = (w - 2 * padding) / rangeX;
    let scaleY = (h - 2 * padding) / rangeY;
    let scale = Math.min(scaleX, scaleY) * zoomLevel;
    scale = Math.min(Math.max(scale, 0.5), 5);
    
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    
    const offsetX = w/2 - centerX * scale + panX;
    const offsetY = h/2 - centerY * scale + panY;
    
    const mapX = (x) => offsetX + x * scale;
    const mapY = (y) => offsetY + y * scale;
    
    // Draw lines
    if (titikLintasan.length >= 2) {
        ctx.beginPath();
        ctx.lineWidth = 3;
        ctx.strokeStyle = "#3b82f6";
        ctx.shadowBlur = 2;
        ctx.shadowColor = "rgba(0,0,0,0.1)";
        ctx.moveTo(mapX(titikLintasan[0].x), mapY(titikLintasan[0].y));
        for (let i = 1; i < titikLintasan.length; i++) {
            ctx.lineTo(mapX(titikLintasan[i].x), mapY(titikLintasan[i].y));
        }
        ctx.stroke();
        ctx.shadowBlur = 0;
        
        // Segment labels
        ctx.font = "bold 10px 'Plus Jakarta Sans'";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        
        for (let i = 0; i < titikLintasan.length - 1; i++) {
            const p1 = titikLintasan[i], p2 = titikLintasan[i+1];
            const x1 = mapX(p1.x), y1 = mapY(p1.y);
            const x2 = mapX(p2.x), y2 = mapY(p2.y);
            const midX = (x1 + x2) / 2;
            const midY = (y1 + y2) / 2;
            const jarak = hitungJarak(p1, p2);
            const azimuth = hitungAzimuth(p1, p2);
            
            const jarakText = `${jarak.toFixed(1)}m`;
            const azimuthText = `${azimuth.toFixed(0)}°`;
            
            ctx.font = "bold 10px 'Plus Jakarta Sans'";
            const jarakWidth = ctx.measureText(jarakText).width;
            const azimuthWidth = ctx.measureText(azimuthText).width;
            const maxWidth = Math.max(jarakWidth, azimuthWidth) + 16;
            const boxHeight = 28;
            
            const boxX = midX - maxWidth / 2;
            const boxY = midY - boxHeight / 2;
            
            if (boxX > 0 && boxX + maxWidth < w && boxY > 0 && boxY + boxHeight < h) {
                ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
                roundedRect(ctx, boxX, boxY, maxWidth, boxHeight, 6);
                ctx.fill();
                
                ctx.fillStyle = "#ffffff";
                roundedRect(ctx, boxX + 1, boxY + 1, maxWidth - 2, boxHeight - 2, 5);
                ctx.fill();
                
                ctx.font = "bold 10px 'Plus Jakarta Sans'";
                ctx.fillStyle = "#1e40af";
                ctx.fillText(jarakText, midX, midY - 5);
                
                ctx.font = "600 10px 'Plus Jakarta Sans'";
                ctx.fillStyle = "#059669";
                ctx.fillText(azimuthText, midX, midY + 7);
            }
        }
    }
    
    // Draw points
    for (let i = 0; i < titikLintasan.length; i++) {
        const p = titikLintasan[i];
        const cx = mapX(p.x), cy = mapY(p.y);
        
        if (cx < -20 || cx > w + 20 || cy < -20 || cy > h + 20) continue;
        
        ctx.beginPath();
        ctx.arc(cx, cy, 8, 0, 2 * Math.PI);
        ctx.fillStyle = "#ffffff";
        ctx.fill();
        ctx.strokeStyle = "#3b82f6";
        ctx.lineWidth = 2.5;
        ctx.stroke();
        
        ctx.beginPath();
        ctx.arc(cx, cy, 3.5, 0, 2 * Math.PI);
        ctx.fillStyle = "#3b82f6";
        ctx.fill();
        
        ctx.font = "bold 11px 'Plus Jakarta Sans'";
        ctx.fillStyle = "#1e293b";
        ctx.fillText(`${i + 1}`, cx, cy - 12);
    }
}

function roundedRect(ctx, x, y, width, height, radius) {
    if (width < 2 * radius) radius = width / 2;
    if (height < 2 * radius) radius = height / 2;
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
}

// ======================== RENDER DAFTAR TITIK ========================
function renderDaftarTitik() {
    if (!listContainer) return;
    
    if (titikLintasan.length === 0) {
        listContainer.innerHTML = `
            <div class="empty-msg">
                <i class="fas fa-map-marker-alt"></i><br>
                Belum ada titik<br>
                <small>Mulai survei dengan menambahkan titik</small>
            </div>
        `;
        return;
    }
    
    let html = '';
    titikLintasan.forEach((titik, idx) => {
        html += `
            <div class="point-item">
                <span>
                    <strong>#${idx + 1}</strong>
                    (${titik.x.toFixed(2)}, ${titik.y.toFixed(2)})
                </span>
                <div class="point-actions">
                    <button class="edit-point" data-index="${idx}" title="Edit Titik">
                        <i class="fas fa-pen"></i>
                    </button>
                    <button class="delete-point" data-index="${idx}" title="Hapus Titik">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    });
    listContainer.innerHTML = html;
    
    document.querySelectorAll('.edit-point').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const index = parseInt(btn.dataset.index, 10);
            if (index >= 0 && index < titikLintasan.length) {
                showEditModal(index);
            }
        });
    });
    
    document.querySelectorAll('.delete-point').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const index = parseInt(btn.dataset.index, 10);
            if (index >= 0 && index < titikLintasan.length) {
                const deleted = titikLintasan[index];
                if (confirm(`Hapus titik #${index + 1} (${deleted.x.toFixed(2)}, ${deleted.y.toFixed(2)})?`)) {
                    titikLintasan.splice(index, 1);
                    renderDaftarTitik();
                    updateInfoDanGambar();
                    showNotification(`Titik #${index + 1} dihapus`, 'warning');
                }
            }
        });
    });
}

// ======================== MODAL EDIT ========================
function showEditModal(index) {
    editIndex = index;
    const titik = titikLintasan[index];
    document.getElementById('editX').value = titik.x;
    document.getElementById('editY').value = titik.y;
    editModal.style.display = 'flex';
}

function closeEditModal() {
    editModal.style.display = 'none';
    editIndex = null;
}

function saveEdit() {
    if (editIndex === null) return;
    const newX = parseFloat(document.getElementById('editX').value);
    const newY = parseFloat(document.getElementById('editY').value);
    
    if (isNaN(newX) || isNaN(newY)) {
        showNotification('Masukkan koordinat yang valid!', 'error');
        return;
    }
    
    titikLintasan[editIndex] = { x: newX, y: newY };
    renderDaftarTitik();
    updateInfoDanGambar();
    showNotification(`Titik #${editIndex + 1} berhasil diupdate`, 'success');
    closeEditModal();
}

// ======================== ACTIONS ========================
function tambahKoordinat() {
    let x = parseFloat(inputX.value);
    let y = parseFloat(inputY.value);
    if (isNaN(x) || isNaN(y)) {
        showNotification('Masukkan nilai X dan Y yang valid!', 'error');
        return;
    }
    titikLintasan.push({ x, y });
    renderDaftarTitik();
    updateInfoDanGambar();
    inputX.value = '';
    inputY.value = '';
    showNotification(`Titik #${titikLintasan.length} ditambahkan di (${x.toFixed(2)}, ${y.toFixed(2)})`, 'success');
}

function tambahJarakArah() {
    if (titikLintasan.length === 0) {
        showNotification('Set titik awal terlebih dahulu!', 'warning');
        return;
    }
    let jarak = parseFloat(inputJarak.value);
    let azimuth = parseFloat(inputAzimuth.value);
    if (isNaN(jarak) || isNaN(azimuth)) {
        showNotification('Masukkan jarak dan azimuth yang valid!', 'error');
        return;
    }
    if (azimuth < 0 || azimuth > 360) {
        showNotification('Azimuth harus antara 0° - 360°', 'error');
        return;
    }
    const last = titikLintasan[titikLintasan.length - 1];
    const { dx, dy } = azimuthToDelta(jarak, azimuth);
    titikLintasan.push({ x: last.x + dx, y: last.y + dy });
    renderDaftarTitik();
    updateInfoDanGambar();
    inputJarak.value = '';
    inputAzimuth.value = '';
    showNotification(`Titik #${titikLintasan.length} ditambahkan`, 'success');
}

function setTitikAwal() {
    if (titikLintasan.length > 0 && !confirm('Reset titik yang ada dan mulai dari (0,0)?')) return;
    titikLintasan = [{ x: 0, y: 0 }];
    renderDaftarTitik();
    updateInfoDanGambar();
    showNotification('Titik awal ditetapkan di (0, 0)', 'success');
}

function tutupLintasan() {
    if (titikLintasan.length < 2) {
        showNotification('Minimal 2 titik untuk menutup lintasan!', 'warning');
        return;
    }
    const first = titikLintasan[0];
    titikLintasan.push({ x: first.x, y: first.y });
    renderDaftarTitik();
    updateInfoDanGambar();
    showNotification('Lintasan ditutup ke titik awal', 'success');
}

function resetSemua() {
    if (titikLintasan.length > 0 && !confirm('Hapus semua titik lintasan?')) return;
    titikLintasan = [];
    renderDaftarTitik();
    updateInfoDanGambar();
    showNotification('Semua titik telah dihapus', 'info');
}

function contohPoligon() {
    titikLintasan = [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 100, y: 80 },
        { x: 50, y: 120 },
        { x: 0, y: 80 },
        { x: 0, y: 0 }
    ];
    renderDaftarTitik();
    updateInfoDanGambar();
    showNotification('Contoh poligon tertutup dimuat', 'success');
}

function contohTerbuka() {
    titikLintasan = [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 150, y: 80 },
        { x: 250, y: 50 },
        { x: 350, y: 120 }
    ];
    renderDaftarTitik();
    updateInfoDanGambar();
    showNotification('Contoh lintasan terbuka dimuat', 'success');
}

function resetZoom() {
    zoomLevel = 1;
    panX = 0;
    panY = 0;
    gambarLintasan();
}

// ======================== MODE SWITCH ========================
function setMode(mode) {
    modeInput = mode;
    if (mode === "koordinat") {
        formKoordinat.style.display = "block";
        formJarakArah.style.display = "none";
        modeKoordinatBtn.classList.add("active");
        modeJarakArahBtn.classList.remove("active");
    } else {
        formKoordinat.style.display = "none";
        formJarakArah.style.display = "block";
        modeKoordinatBtn.classList.remove("active");
        modeJarakArahBtn.classList.add("active");
    }
}

// ======================== CANVAS INTERACTIONS ========================
let startX, startY;

canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    zoomLevel = Math.min(Math.max(zoomLevel * delta, 0.5), 3);
    gambarLintasan();
});

canvas.addEventListener('mousedown', (e) => {
    if (e.button === 0) {
        isPanning = true;
        startX = e.clientX - panX;
        startY = e.clientY - panY;
        canvas.style.cursor = 'grabbing';
    }
});

window.addEventListener('mousemove', (e) => {
    if (!isPanning) return;
    panX = e.clientX - startX;
    panY = e.clientY - startY;
    gambarLintasan();
});

window.addEventListener('mouseup', () => {
    isPanning = false;
    canvas.style.cursor = 'crosshair';
});

canvas.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    resetZoom();
});

// ======================== PRODUCTION INITIALIZATION (THE FIX) ========================
function initializeApp() {
    renderDaftarTitik();
    updateInfoDanGambar();
    
    // Multiple strategies untuk production
    requestAnimationFrame(() => {
        gambarLintasan();
    });
    
    setTimeout(() => {
        gambarLintasan();
    }, 100);
    
    setTimeout(() => {
        gambarLintasan();
    }, 300);
    
    // Observer untuk font loading
    if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(() => {
            gambarLintasan();
        });
    }
}

// Use MULTIPLE event listeners untuk production safety
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}

window.addEventListener('load', () => {
    initializeApp();
    // Extra redraw after load
    setTimeout(() => gambarLintasan(), 50);
});

// MutationObserver untuk detect layout changes
const observer = new ResizeObserver(() => {
    gambarLintasan();
});
observer.observe(canvas);

// ======================== EVENT LISTENERS ========================
modeKoordinatBtn.addEventListener('click', () => setMode('koordinat'));
modeJarakArahBtn.addEventListener('click', () => setMode('jarakArah'));
btnTambahKoordinat.addEventListener('click', tambahKoordinat);
btnTambahJarakArah.addEventListener('click', tambahJarakArah);
btnTitikAwal.addEventListener('click', setTitikAwal);
btnTutupLintasan.addEventListener('click', tutupLintasan);
btnResetSemua.addEventListener('click', resetSemua);
btnContohPoligon.addEventListener('click', contohPoligon);
btnContohTerbuka.addEventListener('click', contohTerbuka);
resetZoomBtn.addEventListener('click', resetZoom);

document.getElementById('saveEditBtn').addEventListener('click', saveEdit);
document.getElementById('cancelEditBtn').addEventListener('click', closeEditModal);
document.getElementById('closeModalBtn').addEventListener('click', closeEditModal);
window.addEventListener('click', (e) => {
    if (e.target === editModal) closeEditModal();
});

inputX.addEventListener('keypress', (e) => { if (e.key === 'Enter') tambahKoordinat(); });
inputY.addEventListener('keypress', (e) => { if (e.key === 'Enter') tambahKoordinat(); });
inputJarak.addEventListener('keypress', (e) => { if (e.key === 'Enter') tambahJarakArah(); });
inputAzimuth.addEventListener('keypress', (e) => { if (e.key === 'Enter') tambahJarakArah(); });
