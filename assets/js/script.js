// ======================== DATA & STATE ========================
let titikLintasan = [];
let modeInput = "koordinat";
let notificationCounter = 0;

// Referensi DOM
const canvas = document.getElementById('surveyCanvas');
const ctx = canvas.getContext('2d');
canvas.width = 700;
canvas.height = 450;

// Elemen UI
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
const listContainer = document.getElementById('listContainer');
const totalJarakSpan = document.getElementById('totalJarakDisplay');
const luasAreaSpan = document.getElementById('luasAreaDisplay');
const closingErrorSpan = document.getElementById('closingErrorDisplay');
const segmentDetailDiv = document.getElementById('segmentDetail');

const inputX = document.getElementById('inputX');
const inputY = document.getElementById('inputY');
const inputJarak = document.getElementById('inputJarak');
const inputAzimuth = document.getElementById('inputAzimuth');

// ======================== SISTEM NOTIFIKASI ========================
function showNotification(message, type = 'success', title = '') {
    const container = document.getElementById('notificationContainer');
    if (!container) {
        // Buat container jika belum ada
        const newContainer = document.createElement('div');
        newContainer.id = 'notificationContainer';
        newContainer.className = 'notification-container';
        document.body.appendChild(newContainer);
    }
    
    const notifContainer = document.getElementById('notificationContainer');
    const id = Date.now() + notificationCounter++;
    
    const titles = {
        success: '✅ Berhasil',
        error: '❌ Gagal',
        warning: '⚠️ Peringatan',
        info: 'ℹ️ Info'
    };
    
    const finalTitle = title || titles[type] || 'Info';
    const icon = {
        success: '✓',
        error: '✗',
        warning: '!',
        info: 'i'
    };
    
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.id = `notif-${id}`;
    notification.innerHTML = `
        <div class="notification-icon">${icon[type] || 'ℹ️'}</div>
        <div class="notification-content">
            <div class="notification-title">${finalTitle}</div>
            <div class="notification-message">${message}</div>
        </div>
        <button class="notification-close" onclick="this.parentElement.remove()">✕</button>
    `;
    
    notifContainer.appendChild(notification);
    
    // Auto remove setelah 3 detik
    setTimeout(() => {
        const el = document.getElementById(`notif-${id}`);
        if (el) {
            el.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                if (el && el.parentElement) el.remove();
            }, 300);
        }
    }, 3000);
}

// ======================== FUNGSI GEOMETRI ========================
function hitungJarak(p1, p2) {
    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;
    return Math.sqrt(dx * dx + dy * dy);
}

function azimuthToDelta(jarak, azimuthDeg) {
    const rad = azimuthDeg * Math.PI / 180;
    const dx = jarak * Math.sin(rad);
    const dy = jarak * Math.cos(rad);
    return { dx, dy };
}

function hitungTotalDanSegmen(points) {
    if (points.length < 2) return { total: 0, segments: [] };
    let total = 0;
    const segments = [];
    for (let i = 0; i < points.length - 1; i++) {
        const jarak = hitungJarak(points[i], points[i + 1]);
        total += jarak;
        segments.push({ from: i, to: i + 1, distance: jarak });
    }
    return { total, segments };
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

function updateInfoDanGambar() {
    const { total, segments } = hitungTotalDanSegmen(titikLintasan);
    
    if (titikLintasan.length < 2) {
        totalJarakSpan.innerHTML = `📏 Total Jarak Lintasan: <strong>0.00 m</strong> (minimal 2 titik)`;
        luasAreaSpan.innerHTML = `📐 Luas Area: 0.00 m² | 0.000 ha`;
        closingErrorSpan.innerHTML = `⚠️ Belum cukup titik untuk analisis penutupan`;
        segmentDetailDiv.innerHTML = '';
    } else {
        totalJarakSpan.innerHTML = `📏 Total Jarak Lintasan: <strong>${total.toFixed(2)} m</strong>`;
        
        let segHtml = '';
        segments.forEach((seg, idx) => {
            segHtml += `<div class="segment-badge">📏 S${idx+1}: ${seg.distance.toFixed(2)} m</div>`;
        });
        segmentDetailDiv.innerHTML = segHtml;
        
        let luas = 0;
        if (titikLintasan.length >= 3) {
            luas = hitungLuasPoligon(titikLintasan);
        }
        luasAreaSpan.innerHTML = `📐 Luas Area (Poligon): <strong>${luas.toFixed(2)} m²</strong> | ${(luas / 10000).toFixed(4)} ha`;
        
        const error = hitungClosingError(titikLintasan);
        if (error && titikLintasan.length >= 2) {
            if (Math.abs(error.errorDistance) < 0.001) {
                closingErrorSpan.innerHTML = `✅ Lintasan TERTUTUP sempurna (error: 0.00 m)`;
            } else {
                closingErrorSpan.innerHTML = `⚠️ Error penutupan: ΔX = ${error.errorX.toFixed(3)} m, ΔY = ${error.errorY.toFixed(3)} m | Jarak error: ${error.errorDistance.toFixed(3)} m`;
            }
        } else {
            closingErrorSpan.innerHTML = `📌 Lintasan TERBUKA (belum kembali ke titik awal)`;
        }
    }
    gambarLintasan();
}

function tutupLintasan() {
    if (titikLintasan.length < 2) {
        showNotification("Minimal 2 titik untuk menutup lintasan!", "warning", "Tidak Bisa Tutup");
        return;
    }
    const titikAwal = titikLintasan[0];
    titikLintasan.push({ x: titikAwal.x, y: titikAwal.y });
    renderDaftarTitik();
    updateInfoDanGambar();
    showNotification(`Lintasan ditutup ke titik awal (${titikAwal.x.toFixed(2)}, ${titikAwal.y.toFixed(2)})`, "success", "Lintasan Tertutup");
}

function tambahKoordinat() {
    let x = parseFloat(inputX.value);
    let y = parseFloat(inputY.value);
    if (isNaN(x) || isNaN(y)) {
        showNotification("Masukkan angka yang valid untuk X dan Y!", "error", "Input Tidak Valid");
        return;
    }
    titikLintasan.push({ x, y });
    renderDaftarTitik();
    updateInfoDanGambar();
    inputX.focus();
    showNotification(`Titik #${titikLintasan.length} ditambahkan di (${x.toFixed(2)}, ${y.toFixed(2)})`, "success", "Titik Ditambahkan");
}

function tambahJarakArah() {
    if (titikLintasan.length === 0) {
        showNotification("Tentukan titik awal terlebih dahulu! Klik 'Set Titik Awal (0,0)'", "warning", "Titik Awal Belum Ada");
        return;
    }
    let jarak = parseFloat(inputJarak.value);
    let azimuth = parseFloat(inputAzimuth.value);
    if (isNaN(jarak) || isNaN(azimuth)) {
        showNotification("Masukkan jarak (meter) dan azimuth (derajat) yang valid!", "error", "Input Tidak Valid");
        return;
    }
    if (azimuth < 0 || azimuth > 360) {
        showNotification("Azimuth harus antara 0° - 360°", "error", "Nilai Azimuth Invalid");
        return;
    }
    const titikTerakhir = titikLintasan[titikLintasan.length - 1];
    const { dx, dy } = azimuthToDelta(jarak, azimuth);
    const titikBaru = {
        x: titikTerakhir.x + dx,
        y: titikTerakhir.y + dy
    };
    titikLintasan.push(titikBaru);
    renderDaftarTitik();
    updateInfoDanGambar();
    inputJarak.value = '';
    inputAzimuth.value = '';
    inputJarak.focus();
    showNotification(`Titik #${titikLintasan.length} dari jarak ${jarak.toFixed(2)} m, azimuth ${azimuth}° → (${titikBaru.x.toFixed(2)}, ${titikBaru.y.toFixed(2)})`, "success", "Titik Ditambahkan");
}

function setTitikAwal() {
    const resetMsg = titikLintasan.length > 0 ? "Reset titik yang ada dan " : "";
    if (titikLintasan.length > 0 && !confirm(`⚠️ ${resetMsg}mulai dari (0,0)?`)) {
        showNotification("Dibatalkan", "info", "Batal");
        return;
    }
    titikLintasan = [{ x: 0, y: 0 }];
    renderDaftarTitik();
    updateInfoDanGambar();
    showNotification("Titik awal ditetapkan di (0, 0)", "success", "Titik Awal Diset");
}

function resetSemua() {
    if (titikLintasan.length > 0 && !confirm("⚠️ Hapus SEMUA titik lintasan?")) {
        showNotification("Penghapusan dibatalkan", "info", "Batal");
        return;
    }
    titikLintasan = [];
    renderDaftarTitik();
    updateInfoDanGambar();
    showNotification("Semua titik lintasan telah dihapus", "warning", "Reset Selesai");
}

function contohPoligonTertutup() {
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
    showNotification("Contoh poligon tertutup dimuat. Luas tanah akan dihitung otomatis!", "success", "Contoh Dimuat");
}

function contohTerbuka() {
    titikLintasan = [
        { x: 50, y: 80 },
        { x: 150, y: 40 },
        { x: 250, y: 130 },
        { x: 380, y: 70 },
        { x: 480, y: 160 }
    ];
    renderDaftarTitik();
    updateInfoDanGambar();
    showNotification("Contoh lintasan terbuka dimuat. Gunakan 'Tutup Lintasan' untuk menghitung luas.", "success", "Contoh Dimuat");
}

function renderDaftarTitik() {
    if (!listContainer) return;
    if (titikLintasan.length === 0) {
        listContainer.innerHTML = '<div class="empty-msg">✨ Belum ada titik. Mulai survei dengan mode Koordinat atau Jarak+Arah</div>';
        return;
    }
    let html = '';
    titikLintasan.forEach((titik, idx) => {
        html += `
            <div class="point-item">
                <span><strong>#${idx + 1}</strong> &nbsp; (${titik.x.toFixed(2)}, ${titik.y.toFixed(2)})</span>
                <div>
                    <button class="delete-point" data-index="${idx}" title="Hapus titik">✖</button>
                </div>
            </div>
        `;
    });
    listContainer.innerHTML = html;
    document.querySelectorAll('.delete-point').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const index = parseInt(btn.getAttribute('data-index'), 10);
            if (index >= 0 && index < titikLintasan.length) {
                const deletedPoint = titikLintasan[index];
                titikLintasan.splice(index, 1);
                renderDaftarTitik();
                updateInfoDanGambar();
                showNotification(`Titik #${index + 1} (${deletedPoint.x.toFixed(2)}, ${deletedPoint.y.toFixed(2)}) dihapus`, "warning", "Titik Dihapus");
            }
        });
    });
}

function gambarLintasan() {
    if (!ctx) return;
    const w = canvas.width, h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    if (titikLintasan.length === 0) {
        ctx.font = "500 14px 'Inter'";
        ctx.fillStyle = "#8aaec0";
        ctx.textAlign = "center";
        ctx.fillText("🗺️ Tambahkan titik survei", w/2, h/2);
        return;
    }
    
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    titikLintasan.forEach(p => {
        minX = Math.min(minX, p.x);
        maxX = Math.max(maxX, p.x);
        minY = Math.min(minY, p.y);
        maxY = Math.max(maxY, p.y);
    });
    if (minX === maxX) { minX -= 20; maxX += 20; }
    if (minY === maxY) { minY -= 20; maxY += 20; }
    const padding = 50;
    const rangeX = maxX - minX;
    const rangeY = maxY - minY;
    const mapX = (x) => padding + ((x - minX) / rangeX) * (w - 2 * padding);
    const mapY = (y) => padding + ((maxY - y) / rangeY) * (h - 2 * padding);
    
    if (titikLintasan.length >= 2) {
        ctx.beginPath();
        ctx.lineWidth = 3;
        ctx.strokeStyle = "#2c7da0";
        ctx.moveTo(mapX(titikLintasan[0].x), mapY(titikLintasan[0].y));
        for (let i = 1; i < titikLintasan.length; i++) {
            ctx.lineTo(mapX(titikLintasan[i].x), mapY(titikLintasan[i].y));
        }
        ctx.stroke();
        
        for (let i = 0; i < titikLintasan.length; i++) {
            const p = titikLintasan[i];
            const cx = mapX(p.x), cy = mapY(p.y);
            ctx.beginPath();
            ctx.arc(cx, cy, 7, 0, 2*Math.PI);
            ctx.fillStyle = "#fff";
            ctx.fill();
            ctx.strokeStyle = "#1f5e7a";
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(cx, cy, 3, 0, 2*Math.PI);
            ctx.fillStyle = "#2c7da0";
            ctx.fill();
            ctx.font = "bold 12px 'Inter'";
            ctx.fillStyle = "#1a4a5f";
            ctx.fillText(`${i+1}`, cx-6, cy-8);
        }
        
        for (let i = 0; i < titikLintasan.length - 1; i++) {
            const p1 = titikLintasan[i], p2 = titikLintasan[i+1];
            const x1 = mapX(p1.x), y1 = mapY(p1.y);
            const x2 = mapX(p2.x), y2 = mapY(p2.y);
            const midX = (x1+x2)/2, midY = (y1+y2)/2;
            const jarak = hitungJarak(p1, p2);
            ctx.font = "10px monospace";
            ctx.fillStyle = "#ffffffcc";
            ctx.fillRect(midX-20, midY-9, 40, 15);
            ctx.fillStyle = "#2c6e8f";
            ctx.fillText(`${jarak.toFixed(1)} m`, midX-16, midY-2);
        }
    }
    
    ctx.save();
    ctx.globalAlpha = 0.15;
    ctx.strokeStyle = "#5a8eaa";
    ctx.lineWidth = 0.6;
    for (let i=0; i<=4; i++) {
        const xVal = minX + (rangeX * i/4);
        const px = mapX(xVal);
        ctx.beginPath(); ctx.moveTo(px, padding); ctx.lineTo(px, h-padding); ctx.stroke();
        const yVal = minY + (rangeY * i/4);
        const py = mapY(yVal);
        ctx.beginPath(); ctx.moveTo(padding, py); ctx.lineTo(w-padding, py); ctx.stroke();
    }
    ctx.restore();
    ctx.font = "8px monospace";
    ctx.fillStyle = "#6f95ab";
    ctx.fillText(`min X: ${minX.toFixed(1)} m`, padding-5, h-padding+15);
    ctx.fillText(`max X: ${maxX.toFixed(1)} m`, w-padding-60, h-padding+15);
    ctx.fillText(`max Y: ${maxY.toFixed(1)} m`, padding-5, padding-3);
}

// ======================== EVENT LISTENER ========================
function setMode(mode) {
    modeInput = mode;
    if (mode === "koordinat") {
        formKoordinat.style.display = "block";
        formJarakArah.style.display = "none";
        modeKoordinatBtn.classList.add("active");
        modeJarakArahBtn.classList.remove("active");
        showNotification("Mode Koordinat aktif. Masukkan nilai X dan Y langsung.", "info", "Mode Berubah");
    } else {
        formKoordinat.style.display = "none";
        formJarakArah.style.display = "block";
        modeKoordinatBtn.classList.remove("active");
        modeJarakArahBtn.classList.add("active");
        showNotification("Mode Jarak + Arah aktif. Masukkan jarak dan azimuth dari titik terakhir.", "info", "Mode Berubah");
    }
}

modeKoordinatBtn.addEventListener('click', () => setMode("koordinat"));
modeJarakArahBtn.addEventListener('click', () => setMode("jarakArah"));
btnTambahKoordinat.addEventListener('click', tambahKoordinat);
btnTambahJarakArah.addEventListener('click', tambahJarakArah);
btnTitikAwal.addEventListener('click', setTitikAwal);
btnTutupLintasan.addEventListener('click', tutupLintasan);
btnResetSemua.addEventListener('click', resetSemua);
btnContohPoligon.addEventListener('click', contohPoligonTertutup);
btnContohTerbuka.addEventListener('click', contohTerbuka);

canvas.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    gambarLintasan();
});

// Buat container notifikasi
const notifContainer = document.createElement('div');
notifContainer.id = 'notificationContainer';
notifContainer.className = 'notification-container';
document.body.appendChild(notifContainer);

window.addEventListener('DOMContentLoaded', () => {
    renderDaftarTitik();
    updateInfoDanGambar();
});