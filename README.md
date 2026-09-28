# 📏 Sistem Pengukuran Lintasan

Aplikasi web modern (Vite **+** React) untuk menghitung **jarak lintasan**, **luas bidang tertutup**, dan **closing error** dari deretan titik koordinat — lengkap dengan **kanvas gaya peta survey profesional** (grid adaptif, label dimensi tiap segmen, arsir luas area, busur sudut, dan vektor closing error).

Berguna untuk survei lapangan sederhana, perencanaan area, maupun pembelajaran geodesi & geometri koordinat.
 
## ✨ Fitur

- **Input fleksibel**: mode *Koordinat X,Y* atau *Jarak + Azimuth* (ketik manual / kebutuhan lapangan).
- **Perhitungan otomatis** (pure functions di `src/lib/survey.js`):
  - Panjang lintasan & panjang tiap segmen.
  - Azimuth & kuadran surveyor (U/T/S/B), delta X / delta Y.
  - Luas bidang & hektar (hanya saat poligon tertutup).
  - Closing error (ΔX, ΔY, jarak), centroid, dan keliling.
  - Sudut interior setiap titik.
- **Kanvas profesional**: grid adaptif, arsir fill + hatch, chevron arah segmen, pill dimensi (jarak + azimuth), label koordinat, kompas & skala bar, crosshair kursor, vektor closing error bila lintasan terbuka.
- **Interaksi**: zoom (wheel / pinch), pan (drag / dua jari), klik titik untuk seleksi & edit/hapus, toggle layer (Grid / Dim / Fill / Angle / Label).
- **Responsive**: desktop = sidebar + peta berdampingan; mobile = tab Input / Peta / Hasil (≤600px), toolbar kanvas pecah jadi dua baris, tidak menutupi peta.
- **Penyimpanan lokal**: `localStorage` untuk daftar titik; riwayat *Undo* (*tingkat surveying*) dan ekspor **CSV** (titik + segmen + sudut) serta ekspor **PNG** dari kanvas.
- **Tema "buku lapangan"** — kertas milimeter, tinta navy, aksen sienna/kuningan, panggung kanvas bergaya *blueprint*.

## 🧑‍💻 Teknologi

- **Build**: [Vite](https://vitejs.dev) 6, `@vitejs/plugin-react`.
- **UI**: [React](https://react.dev) 18 + JSX — [`src/App.jsx`](src/App.jsx) sebagai shell layout, [`src/components/ProCanvas.jsx`](src/components/ProCanvas.jsx) sebagai viewer kanvas 2D (`ResizeObserver` + drawing).
- **Logika**: `src/lib/survey.js` — fungsi murni geodesi (jarak, azimuth, sudut, centroid, luas, analisis lintasan).
- **Gaya**: [`src/index.css`](src/index.css) — *design system* custom, tanpa runtime library.
- **Runtime storage**: `localStorage` (```lintasan-points```).

## 📂 Struktur

```
.
├── assets/img/gambar.png      # ikon kecil dipakai editor / favicon
├── src/
│   ├── App.jsx                # layout + input / operasional / daftar titik / stats
│   ├── main.jsx               # mount React
│   ├── index.css              # styling global + media queries
│   ├── components/ProCanvas.jsx
│   └── lib/survey.js          # perhitungan murni
├── index.html                 # shell Vite (root = #root, script -> /src/main.jsx)
├── vite.config.js             # plugin React, base='./' untuk preview statis
└── package.json               # deps React 18 + @vitejs/plugin-react, scripts dev/build
```

## 🚀 Menjalankan

```bash
npm install          # install deps
npm run dev          # server dev Vite (http://localhost:5173)
npm run build        # build produksi → dist/ (di-.gitignore, generate ulang)
npm run preview      # serve dist/ secara lokal
```

## 📦 Versi

v2.0.0 — migrasi penuh dari HTML/CSS/JS statis (`assets/...`) ke Vite + React.

## 📄 Catatan dev

- Direktori `.npm-cache` dipakai sebagai cache NPM sementara di sekitar sandbox; tidak di-commit (masuk `.gitignore`).
- File `.dist/` (hasil build) tidak di-commit; cukup jalankan `npm run build` ulang saat diperlukan.
