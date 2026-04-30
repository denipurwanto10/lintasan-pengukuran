// ======================== STATE ========================
let titikLintasan = [];
let modeInput = "koordinat";
let zoomLevel = 1;
let panX = 0, panY = 0;
let isPanning = false;

// ======================== CANVAS ========================
const canvas = document.getElementById('surveyCanvas');
const ctx = canvas.getContext('2d');

canvas.width = 800;
canvas.height = 500;

// ======================== GEOMETRY ========================
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
    return {
        dx: jarak * Math.sin(rad),
        dy: jarak * Math.cos(rad)
    };
}

// ======================== PERHITUNGAN ========================
function hitungTotalDanSegmen(points) {
    if (points.length < 2) return { total: 0 };

    let total = 0;
    for (let i = 0; i < points.length - 1; i++) {
        total += hitungJarak(points[i], points[i + 1]);
    }
    return { total };
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

    const dx = last.x - first.x;
    const dy = last.y - first.y;

    return Math.sqrt(dx * dx + dy * dy);
}

// ======================== DRAW ========================
function gambarLintasan() {
    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);

    if (titikLintasan.length === 0) return;

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;

    titikLintasan.forEach(p => {
        minX = Math.min(minX, p.x);
        maxX = Math.max(maxX, p.x);
        minY = Math.min(minY, p.y);
        maxY = Math.max(maxY, p.y);
    });

    const padding = 50;
    const scale = Math.min(
        (w - padding * 2) / (maxX - minX || 1),
        (h - padding * 2) / (maxY - minY || 1)
    ) * zoomLevel;

    const offsetX = padding + panX;
    const offsetY = padding + panY;

    const mapX = (x) => offsetX + (x - minX) * scale;
    const mapY = (y) => offsetY + (maxY - y) * scale;

    // Draw line
    ctx.beginPath();
    ctx.strokeStyle = "#3b82f6";
    ctx.lineWidth = 3;

    ctx.moveTo(mapX(titikLintasan[0].x), mapY(titikLintasan[0].y));

    for (let i = 1; i < titikLintasan.length; i++) {
        ctx.lineTo(mapX(titikLintasan[i].x), mapY(titikLintasan[i].y));
    }

    ctx.stroke();

    // Draw points
    titikLintasan.forEach((p, i) => {
        const x = mapX(p.x);
        const y = mapY(p.y);

        ctx.beginPath();
        ctx.arc(x, y, 6, 0, 2 * Math.PI);
        ctx.fillStyle = "#fff";
        ctx.fill();
        ctx.strokeStyle = "#3b82f6";
        ctx.stroke();

        ctx.fillStyle = "#000";
        ctx.fillText(i + 1, x, y - 10);
    });
}

// ======================== UPDATE ========================
function updateInfoDanGambar() {
    gambarLintasan();

    // 🔥 FIX render delay di hosting
    requestAnimationFrame(() => {
        gambarLintasan();
    });
}

// ======================== ACTION ========================
function tambahKoordinat(x, y) {
    titikLintasan.push({ x, y });
    updateInfoDanGambar();
}

function setTitikAwal() {
    titikLintasan = [{ x: 0, y: 0 }];
    updateInfoDanGambar();
}

// ======================== ZOOM ========================
canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    zoomLevel *= e.deltaY > 0 ? 0.9 : 1.1;
    updateInfoDanGambar();
});

// ======================== DRAG ========================
let startX, startY;

canvas.addEventListener('mousedown', (e) => {
    isPanning = true;
    startX = e.clientX - panX;
    startY = e.clientY - panY;
});

window.addEventListener('mousemove', (e) => {
    if (!isPanning) return;
    panX = e.clientX - startX;
    panY = e.clientY - startY;
    updateInfoDanGambar();
});

window.addEventListener('mouseup', () => {
    isPanning = false;
});

// ======================== RESIZE FIX ========================
const resizeObserver = new ResizeObserver(() => {
    gambarLintasan();
});
resizeObserver.observe(canvas);

// ======================== VISIBILITY FIX ========================
document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
        gambarLintasan();
    }
});

// ======================== INIT (FIX UTAMA) ========================
window.addEventListener('load', () => {
    setTitikAwal();

    // contoh data biar langsung muncul
    tambahKoordinat(100, 0);
    tambahKoordinat(100, 80);
    tambahKoordinat(50, 120);
    tambahKoordinat(0, 80);
    tambahKoordinat(0, 0);

    // render aman
    requestAnimationFrame(() => {
        gambarLintasan();
    });

    setTimeout(() => {
        gambarLintasan();
    }, 150);
});
