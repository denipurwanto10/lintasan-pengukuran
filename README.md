# 📏 Sistem Pengukuran Lintasan

Aplikasi web interaktif untuk menghitung jarak lintasan, luas area tertutup, dan akurasi penutupan (closing error) berdasarkan input koordinat titik-titik.

Proyek ini sangat berguna untuk survei lapangan sederhana, perencanaan area, atau pembelajaran geometri koordinat.

## ✨ Fitur Utama

- **Input Koordinat Fleksibel**: Tambahkan titik lintasan secara manual
- **Perhitungan Otomatis**:
  - Total Jarak Lintasan (meter)
  - Luas Area Tertutup (meter persegi dan hektar)
  - **Closing Error**: Menghitung kesalahan penutupan poligon, penting untuk validasi survei
  - Detail Segmen, Sudut, dan Bearing tiap sisi lintasan
- **Visualisasi Interaktif**: Canvas dengan kemampuan zoom dan pan
  - *Tips: Klik kanan untuk reset zoom, scroll untuk zoom in/out*
- **Mode Input**: Pilihan metode input koordinat
- **Penyimpanan Lokal**: Data titik tersimpan secara lokal

## 🧑‍💻 Teknologi yang Digunakan

- **HTML5**: Struktur halaman
- **CSS3**: Styling dan layout (Flexbox/Grid)
- **JavaScript (ES6+)**: Logika perhitungan dan interaktivitas
- **Canvas API**: Visualisasi lintasan dan area
- **LocalStorage**: Penyimpanan data titik
