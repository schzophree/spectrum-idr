# 🎵 Spectrum IDR — Audio Spectrum Visualizer

<p align="center">
  <strong>Real-time audio spectrum visualizer dengan tampilan kurs Rupiah Indonesia.</strong><br>
  Dibangun murni menggunakan Web Audio API & HTML5 Canvas — tanpa library eksternal.
</p>

<p align="center">
  <a href="https://spectrum-idr.vercel.app">🌐 Live Demo</a>
</p>

---

## ✨ Fitur Utama

- 🎨 **4 Mode Visualisasi** — Full Spectrum, Waveform, Bass, dan Maksimum
- 🎧 **Putar dari YouTube** — Masukkan link YouTube dan langsung putar dengan visualisasi real-time
- 📂 **Upload File Lokal** — Drag & drop atau pilih file audio (MP3, WAV, FLAC, OGG, AAC)
- 📊 **60 FPS Animasi** — Rendering mulus menggunakan `requestAnimationFrame`
- 💱 **Tampilan Kurs IDR** — Menampilkan data frekuensi dalam format kurs Rupiah Indonesia yang unik
- 📱 **Responsive Design** — Tampilan menyesuaikan di desktop maupun mobile
- ⌨️ **Keyboard Shortcut** — Tekan `Spasi` untuk play/pause

---

## 🛠️ Tech Stack

| Layer | Teknologi |
|---|---|
| Frontend | HTML5, Vanilla CSS, Vanilla JavaScript |
| Audio Engine | [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API) (`AudioContext`, `AnalyserNode`) |
| Rendering | [HTML5 Canvas](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API) |
| Backend | [Node.js](https://nodejs.org/) + [Express](https://expressjs.com/) |
| YouTube Streaming | [yt-dlp](https://github.com/yt-dlp/yt-dlp) (streaming langsung tanpa download) |
| Deployment | [Vercel](https://vercel.com/) (Frontend) · [Hugging Face Spaces](https://huggingface.co/spaces) (Backend) |

> **Catatan:** Tidak menggunakan library audio spectrum eksternal. Semua visualisasi digambar langsung di Canvas menggunakan data frekuensi dari Web Audio API.

---

## 🚀 Cara Menjalankan Secara Lokal

### Prasyarat

- [Node.js](https://nodejs.org/) v18+
- [Python](https://python.org/) 3.8+
- [yt-dlp](https://github.com/yt-dlp/yt-dlp) (`pip install yt-dlp`)

### Langkah-langkah

1. **Clone repositori**
   ```bash
   git clone https://github.com/schzophree/spectrum-idr.git
   cd spectrum-idr
   ```

2. **Install dependensi**
   ```bash
   npm install
   ```

3. **Jalankan server backend**
   ```bash
   npm start
   ```
   Server akan berjalan di `http://localhost:5500`

4. **Buka di browser**
   
   Buka `index.html` langsung di browser, atau gunakan Live Server extension di VS Code.

---

## 📁 Struktur Proyek

```
spectrum-idr/
├── index.html       # Halaman utama
├── style.css        # Styling & animasi
├── app.js           # Logika audio, visualisasi canvas, dan UI
├── server.js        # Backend Express (proxy YouTube & SoundCloud stream)
├── package.json     # Dependensi Node.js
├── vercel.json      # Konfigurasi deployment Vercel
├── Dockerfile       # Docker image untuk Hugging Face Spaces
└── icon.ico         # Favicon
```

---

## 🎨 Mode Visualisasi

| Mode | Deskripsi |
|---|---|
| **FULL** | Spektrum frekuensi lengkap dengan kurva halus dan area gradasi |
| **WAVE** | Gelombang suara (waveform) dengan cerminan |
| **BASS** | Fokus pada frekuensi bass rendah dalam bentuk bar |
| **MAKS** | Semua bin frekuensi ditampilkan sebagai bar warna-warni |

---

## 🔄 Cara Kerja Fallback Server

Ketika user memasukkan link YouTube:

```
Klik "Muat" → Coba Server Lokal (7 detik)
                    │
                    ├── ✅ Berhasil → Putar 🎵
                    │
                    └── ❌ Gagal/Timeout
                            │
                      Coba Server Cloud (20 detik)
                            │
                            ├── ✅ Berhasil → Putar 🎵
                            │
                            └── ❌ Gagal → Tampilkan Error
```

---

## 📄 Lisensi

Proyek ini bersifat open-source dan tersedia di bawah [MIT License](LICENSE).

---

<p align="center">
  Dibuat dengan ❤️ menggunakan Vanilla JavaScript
</p>
