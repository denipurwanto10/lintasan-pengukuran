<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
    <title>Sistem Pengukuran Lintasan</title>
    <link rel="icon" type="image/png" href="assets/img/gambar.png">
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link rel="stylesheet" href="assets/css/style.css">
</head>
<body>
    <div id="notificationContainer" class="notification-container"></div>

    <div class="dashboard">
        <div class="header">
            <h1>
                <i class="fas fa-draw-polygon"></i> 
                Sistem Pengukuran Lintasan
            </h1>
            <p>Pengukuran Lintasan + Hitung Luas</p>
        </div>

        <div class="two-columns">
            <!-- Panel Kiri -->
            <div class="input-panel">
                <!-- Mode Selector -->
                <div class="card">
                    <div class="card-header">
                        <i class="fas fa-tachometer-alt"></i> Mode Input
                    </div>
                    <div class="mode-selector">
                        <div class="mode-buttons">
                            <button id="modeKoordinatBtn" class="mode-btn active">
                                <i class="fas fa-map-pin"></i> Koordinat (X,Y)
                            </button>
                            <button id="modeJarakArahBtn" class="mode-btn">
                                <i class="fas fa-compass"></i> Jarak + Azimuth
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Form Koordinat -->
                <div id="formKoordinat" class="card input-form">
                    <div class="card-header">
                        <i class="fas fa-vector-square"></i> Input Koordinat
                    </div>
                    <div class="coord-row">
                        <div class="coord-field">
                            <label><i class="fas fa-arrow-right"></i> X (meter)</label>
                            <input type="number" id="inputX" placeholder="0.00" step="any">
                        </div>
                        <div class="coord-field">
                            <label><i class="fas fa-arrow-up"></i> Y (meter)</label>
                            <input type="number" id="inputY" placeholder="0.00" step="any">
                        </div>
                    </div>
                    <button id="btnTambahKoordinat" class="btn btn-primary btn-block">
                        <i class="fas fa-plus-circle"></i> Tambah Titik Koordinat
                    </button>
                </div>

                <!-- Form Jarak + Arah -->
                <div id="formJarakArah" class="card input-form" style="display:none;">
                    <div class="card-header">
                        <i class="fas fa-route"></i> Input Jarak & Azimuth
                    </div>
                    <div class="coord-row">
                        <div class="coord-field">
                            <label><i class="fas fa-ruler"></i> Jarak (meter)</label>
                            <input type="number" id="inputJarak" placeholder="0.00" step="any">
                        </div>
                        <div class="coord-field">
                            <label><i class="fas fa-angle-up"></i> Azimuth (°)</label>
                            <input type="number" id="inputAzimuth" placeholder="0 - 360" step="any" min="0" max="360">
                        </div>
                    </div>
                    <div class="info-azimuth">
                        <i class="fas fa-info-circle"></i> 0° = Utara | 90° = Timur | 180° = Selatan | 270° = Barat
                    </div>
                    <div class="form-actions">
                        <button id="btnTambahJarakArah" class="btn btn-primary">
                            <i class="fas fa-plus-circle"></i> Tambah dari Titik Terakhir
                        </button>
                        <button id="btnTitikAwal" class="btn btn-secondary">
                            <i class="fas fa-flag-checkered"></i> Set Titik Awal (0,0)
                        </button>
                    </div>
                </div>

                <!-- Action Buttons -->
                <div class="btn-group-full">
                    <button id="btnTutupLintasan" class="btn btn-warning">
                        <i class="fas fa-link"></i> Tutup Lintasan
                    </button>
                    <button id="btnResetSemua" class="btn btn-reset">
                        <i class="fas fa-trash-alt"></i> Reset Semua
                    </button>
                </div>

                <div class="btn-group-full">
                    <button id="btnContohPoligon" class="btn btn-outline">
                        <i class="fas fa-draw-polygon"></i> Contoh Poligon
                    </button>
                    <button id="btnContohTerbuka" class="btn btn-outline">
                        <i class="fas fa-chart-line"></i> Contoh Terbuka
                    </button>
                </div>

                <!-- Daftar Titik -->
                <div class="card points-list">
                    <div class="card-header">
                        <i class="fas fa-list-ul"></i> Daftar Titik Lintasan
                        <span id="titikCount" class="badge-count">0</span>
                    </div>
                    <div id="listContainer" class="list-container">
                        <div class="empty-msg">
                            <i class="fas fa-map-marker-alt"></i><br>
                            Belum ada titik<br>
                            <small>Mulai survei dengan menambahkan titik</small>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Panel Kanan -->
            <div class="canvas-panel">
                <div class="canvas-wrapper">
                    <canvas id="surveyCanvas" width="800" height="500"></canvas>
                    <div class="canvas-tools">
                        <button id="resetZoomBtn" class="tool-btn" title="Reset Tampilan">
                            <i class="fas fa-expand-alt"></i> Reset Zoom
                        </button>
                    </div>
                </div>

                <!-- Hasil Survey -->
                <div class="info-survei">
                    <div class="info-grid">
                        <div class="info-card">
                            <div class="info-icon"><i class="fas fa-route"></i></div>
                            <div class="info-content">
                                <span class="info-label">Total Jarak Lintasan</span>
                                <span id="totalJarakDisplay" class="info-value">0.00 m</span>
                            </div>
                        </div>
                        <div class="info-card">
                            <div class="info-icon"><i class="fas fa-draw-polygon"></i></div>
                            <div class="info-content">
                                <span class="info-label">Luas Area</span>
                                <span id="luasAreaDisplay" class="info-value">0 m²</span>
                                <span class="info-sub">0.000 ha</span>
                            </div>
                        </div>
                        <div class="info-card">
                            <div class="info-icon"><i class="fas fa-crosshairs"></i></div>
                            <div class="info-content">
                                <span class="info-label">Closing Error</span>
                                <span id="closingErrorDisplay" class="info-value warning">--</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="segment-wrapper">
                        <div class="segment-header">
                            <i class="fas fa-chart-simple"></i> Detail Segmen
                            <span id="segmentCount" class="badge-count">0</span>
                        </div>
                        <div id="segmentDetail" class="segment-list"></div>
                    </div>

                    <!-- Tabel Sudut / Bearing -->
                    <div class="segment-wrapper">
                        <div class="segment-header">
                            <i class="fas fa-angle-double-right"></i> Sudut & Bearing Tiap Segmen
                            <span id="bearingCount" class="badge-count">0</span>
                        </div>
                        <div id="bearingDetail" class="bearing-list"></div>
                    </div>

                    <div class="catatan">
                        <i class="fas fa-lightbulb"></i> Tips: Klik kanan pada canvas untuk reset zoom | Scroll untuk zoom in/out
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Modal Edit Titik -->
    <div id="editModal" class="modal">
        <div class="modal-content">
            <div class="modal-header">
                <h3><i class="fas fa-pen"></i> Edit Titik</h3>
                <button class="modal-close" id="closeModalBtn">&times;</button>
            </div>
            <div class="modal-body">
                <div class="coord-field">
                    <label><i class="fas fa-arrow-right"></i> Koordinat X (meter)</label>
                    <input type="number" id="editX" step="any" placeholder="X meter">
                </div>
                <div class="coord-field">
                    <label><i class="fas fa-arrow-up"></i> Koordinat Y (meter)</label>
                    <input type="number" id="editY" step="any" placeholder="Y meter">
                </div>
            </div>
            <div class="modal-footer">
                <button id="saveEditBtn" class="btn btn-primary">Simpan</button>
                <button id="cancelEditBtn" class="btn btn-outline">Batal</button>
            </div>
        </div>
    </div>

    <script src="assets/js/script.js"></script>
</body>
</html>
