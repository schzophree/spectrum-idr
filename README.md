# 🎵 Spectrum IDR Audio Spectrum Visualizer

<p align="center">
  <strong>Real-time audio spectrum visualizer dengan tampilan kurs Rupiah Indonesia.</strong><br>
  Dibangun murni menggunakan Web Audio API & HTML5 Canvas — tanpa library eksternal.
</p>

<p align="center">
  <a href="https://spectrum-idr.vercel.app">🌐 Live Demo</a>
</p>

---

| Layer             | Teknologi                                                                                                        |
| ----------------- | ---------------------------------------------------------------------------------------------------------------- |
| Frontend          | HTML5, Vanilla CSS, Vanilla JavaScript                                                                           |
| Audio Engine      | [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API) (`AudioContext`, `AnalyserNode`) |
| Rendering         | [HTML5 Canvas](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API)                                      |
| Backend           | [Node.js](https://nodejs.org/) + [Express](https://expressjs.com/)                                               |
| YouTube Streaming | [yt-dlp](https://github.com/yt-dlp/yt-dlp) (streaming langsung tanpa download)                                   |

> **Catatan:** Tidak menggunakan library audio spectrum eksternal. Semua visualisasi digambar langsung di Canvas menggunakan data frekuensi dari Web Audio API.
> Sementara yang menggunakan Link YouTube hanya bisa digunakan di Desktop/PC.
