let audioCtx;
let analyser;
let mediaSource;
let dataArr;
let bufLen;
let isPlaying = false;
let rafId = null;
let vizMode = "FULL";
let history = [];
let freqAtX = [];
let lastDominantHz = 0;
let srcOpen = false;

const audioEl = document.getElementById("audioEl");
const canvas = document.getElementById("specCanvas");
const ctx = canvas.getContext("2d");

const LINE_COLOR = "#81c995";
const FILL_TOP = "rgba(129,201,149,0.22)";
const FILL_BOT = "rgba(129,201,149,0)";
const GRID_COLOR = "rgba(255,255,255,0.07)";
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agt", "Sep", "Okt", "Nov", "Des"];

audioEl.volume = 0.8;

function initAudio() {
  if (audioCtx) return;
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  analyser = audioCtx.createAnalyser();
  analyser.fftSize = 2048;
  analyser.smoothingTimeConstant = 0.85;
  bufLen = analyser.frequencyBinCount;
  dataArr = new Uint8Array(bufLen);
  mediaSource = audioCtx.createMediaElementSource(audioEl);
  mediaSource.connect(analyser);
  analyser.connect(audioCtx.destination);
}

function loadAudio(url, title, artist) {
  initAudio();
  if (audioCtx.state === "suspended") audioCtx.resume();

  audioEl.src = url;
  audioEl.load();
  updateMeta(title, artist);

  audioEl.play().then(() => {
    isPlaying = true;
    document.getElementById("playBtn").textContent = "❚❚";
    if (!rafId) drawLoop();
  }).catch(err => {
    isPlaying = false;
    document.getElementById("playBtn").textContent = "▶";
    setUrlStatus("error", `Gagal memuat audio. ${err.message}. Pastikan URL adalah file audio langsung dan server mengizinkan CORS.`);
  });
}

function onFileChange(e) {
  const f = e.target.files[0];
  if (!f) return;
  setUrlStatus("ok", `File dimuat: ${f.name}.`);
  loadAudio(URL.createObjectURL(f), f.name.replace(/\.[^.]+$/, ""), "File Lokal");
}

async function loadFromUrl() {
  const urlInput = document.getElementById("mediaUrlInput");
  const loadBtn = document.getElementById("mediaLoadBtn");
  const url = urlInput.value.trim();

  if (!url) {
    setUrlStatus("warn", "Silakan masukkan link terlebih dahulu.");
    return;
  }

  // Basic URL validation
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    setUrlStatus("error", "URL harus dimulai dengan http:// atau https://");
    return;
  }

  setUrlStatus("ok", "Menghubungkan ke server lokal dan mengunduh audio...");
  loadBtn.disabled = true;

  try {
    const response = await fetch(`http://localhost:5500/api/load-media?url=${encodeURIComponent(url)}`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Gagal mengunduh audio.");
    }

    setUrlStatus("ok", `Sukses memuat: ${data.title}`);
    loadAudio(data.streamUrl, data.title, data.artist);
    
    urlInput.value = "";
  } catch (err) {
    console.error(err);
    setUrlStatus("error", `Error: ${err.message}. Pastikan backend server Anda sudah berjalan (node server.js).`);
  } finally {
    loadBtn.disabled = false;
  }
}

function setUrlStatus(type, text) {
  const el = document.getElementById("urlStatus");
  if (!el) return;
  el.className = `url-status ${type || ""}`.trim();
  el.textContent = text;
}

function togglePlay() {
  if (!audioEl.src) {
    alert("Pilih lagu dulu.");
    return;
  }

  initAudio();
  if (audioCtx.state === "suspended") audioCtx.resume();

  if (isPlaying) {
    audioEl.pause();
    isPlaying = false;
    document.getElementById("playBtn").textContent = "▶";
    cancelAnimationFrame(rafId);
    rafId = null;
    drawIdle();
  } else {
    audioEl.play();
    isPlaying = true;
    document.getElementById("playBtn").textContent = "❚❚";
    if (!rafId) drawLoop();
  }
}

function setVolume(v) {
  audioEl.volume = v / 100;
}

function seekAudio(e) {
  if (!audioEl.duration) return;
  const t = e.currentTarget;
  audioEl.currentTime = (e.offsetX / t.clientWidth) * audioEl.duration;
}

audioEl.addEventListener("timeupdate", () => {
  const pct = audioEl.duration ? (audioEl.currentTime / audioEl.duration) * 100 : 0;
  document.getElementById("progressFill").style.width = `${pct}%`;
  document.getElementById("timeCur").textContent = fmtTime(audioEl.currentTime);
  document.getElementById("timeTot").textContent = fmtTime(audioEl.duration || 0);
});

audioEl.addEventListener("ended", () => {
  isPlaying = false;
  document.getElementById("playBtn").textContent = "▶";
  cancelAnimationFrame(rafId);
  rafId = null;
  drawIdle();
});

audioEl.addEventListener("error", () => {
  if (!audioEl.src) return;
  setUrlStatus("error", "Audio gagal dibaca. Coba direct audio URL lain atau unggah file lokal.");
});

function fmtTime(s) {
  if (!s || isNaN(s)) return "0:00";
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
}

function updateMeta(title, artist) {
  document.getElementById("subtitleText").textContent = "1 Dolar Amerika Serikat sama dengan";
  document.getElementById("liveDate").textContent = title || "Rupiah Indonesia";
  updateClock();
}

function updateClock() {
  const n = new Date();
  document.getElementById("metaDate").textContent = `${n.getDate()} ${MONTHS[n.getMonth()]}`;
  document.getElementById("metaTime").textContent = `${String(n.getHours()).padStart(2, "0")}:${String(n.getMinutes()).padStart(2, "0")}`;
}

function resize() {
  const wrap = canvas.parentElement;
  const dpr = window.devicePixelRatio || 1;
  const cw = Math.max(0, wrap.clientWidth - 62);
  const ch = Math.max(0, wrap.clientHeight - 20);
  if (!cw || !ch) return;
  canvas.width = cw * dpr;
  canvas.height = ch * dpr;
  canvas.style.width = `${cw}px`;
  canvas.style.height = `${ch}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function drawIdle() {
  resize();
  const W = canvas.clientWidth;
  const H = canvas.clientHeight;
  if (!W || !H) return;
  ctx.clearRect(0, 0, W, H);
  drawGrid(W, H);
  ctx.beginPath();
  ctx.moveTo(0, H * 0.85);
  ctx.lineTo(W, H * 0.85);
  ctx.strokeStyle = "rgba(129,201,149,0.3)";
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(6, H * 0.85, 4, 0, Math.PI * 2);
  ctx.fillStyle = LINE_COLOR;
  ctx.fill();
  freqAtX = [{ hz: lastDominantHz, pct: 0.15, band: "Frekuensi Dominan" }];
}

function drawGrid(W, H) {
  ctx.save();
  ctx.strokeStyle = GRID_COLOR;
  ctx.lineWidth = 1;
  [0.25, 0.5, 0.75].forEach(f => {
    const y = H * f;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  });
  ctx.restore();
}

function drawLoop() {
  rafId = requestAnimationFrame(drawLoop);
  analyser.getByteFrequencyData(dataArr);
  resize();
  const W = canvas.clientWidth;
  const H = canvas.clientHeight;
  if (!W || !H) return;

  ctx.clearRect(0, 0, W, H);
  drawGrid(W, H);

  if (vizMode === "WAVE") drawWave(W, H);
  else if (vizMode === "BASS") drawBass(W, H);
  else if (vizMode === "MAKS") drawMaks(W, H);
  else drawFull(W, H);

  updateHUD();
}

function drawFull(W, H) {
  const bins = vizMode === "MID" ? Math.floor(bufLen * 0.08) : Math.floor(bufLen * 0.55);
  const pts = [];
  freqAtX = [];

  for (let i = 0; i < bins; i++) {
    const x = (i / (bins - 1)) * W;
    const v = dataArr[i] / 255;
    const y = H - H * 0.08 - v * H * 0.84;
    const hz = (i / bufLen) * ((audioCtx ? audioCtx.sampleRate : 44100) / 2);
    pts.push([x, y]);
    freqAtX.push({ hz, pct: v, band: getBand(hz) });
  }

  history.push(pts.map(p => [...p]));
  if (history.length > 5) history.shift();

  const smoothPts = pts.map((p, i) => {
    let sx = 0;
    let sy = 0;
    history.forEach(h => {
      sx += h[i][0];
      sy += h[i][1];
    });
    return [sx / history.length, sy / history.length];
  });

  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, FILL_TOP);
  grad.addColorStop(1, FILL_BOT);

  ctx.beginPath();
  ctx.moveTo(0, H);
  smoothPts.forEach(([x, y], i) => {
    if (i === 0) ctx.lineTo(x, y);
    else {
      const px = smoothPts[i - 1][0];
      const py = smoothPts[i - 1][1];
      ctx.quadraticCurveTo(px, py, (px + x) / 2, (py + y) / 2);
    }
  });
  ctx.lineTo(W, H);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();

  ctx.beginPath();
  smoothPts.forEach(([x, y], i) => {
    if (i === 0) ctx.moveTo(x, y);
    else {
      const px = smoothPts[i - 1][0];
      const py = smoothPts[i - 1][1];
      ctx.quadraticCurveTo(px, py, (px + x) / 2, (py + y) / 2);
    }
  });
  ctx.strokeStyle = LINE_COLOR;
  ctx.lineWidth = 1.8;
  ctx.stroke();

  const last = smoothPts[smoothPts.length - 1];
  ctx.beginPath();
  ctx.arc(last[0], last[1], 4.5, 0, Math.PI * 2);
  ctx.fillStyle = LINE_COLOR;
  ctx.fill();
}

function drawWave(W, H) {
  const wave = new Uint8Array(bufLen);
  analyser.getByteTimeDomainData(wave);
  mapFreqForHover(W);

  ctx.beginPath();
  wave.forEach((v, i) => {
    const x = (i / (bufLen - 1)) * W;
    const y = ((v / 128) - 1) * (H * 0.42) + H / 2;
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });
  ctx.strokeStyle = LINE_COLOR;
  ctx.lineWidth = 1.6;
  ctx.stroke();

  ctx.beginPath();
  wave.forEach((v, i) => {
    const x = (i / (bufLen - 1)) * W;
    const y = H - (((v / 128) - 1) * (H * 0.42) + H / 2);
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });
  ctx.strokeStyle = "rgba(129,201,149,0.2)";
  ctx.lineWidth = 1;
  ctx.stroke();
}

function drawBass(W, H) {
  const BANDS = 40;
  const bw = W / BANDS;
  freqAtX = [];

  for (let i = 0; i < BANDS; i++) {
    const idx = Math.floor((i / BANDS) * (bufLen * 0.15));
    const v = dataArr[idx] / 255;
    const bh = v * H * 0.9;
    const x = i * bw;
    const hz = (idx / bufLen) * (audioCtx.sampleRate / 2);
    const grad = ctx.createLinearGradient(0, H - bh, 0, H);
    grad.addColorStop(0, "rgba(129,201,149,0.8)");
    grad.addColorStop(1, "rgba(52,168,83,0.3)");
    ctx.fillStyle = grad;
    ctx.fillRect(x + 1, H - bh, bw - 2, bh);
    freqAtX.push({ hz, pct: v, band: getBand(hz) });
  }
}

function drawMaks(W, H) {
  const BANDS = Math.min(bufLen, 200);
  const bw = W / BANDS;
  freqAtX = [];

  for (let i = 0; i < BANDS; i++) {
    const v = dataArr[i] / 255;
    const bh = v * H * 0.92;
    const hz = (i / bufLen) * (audioCtx.sampleRate / 2);
    ctx.fillStyle = `hsla(${130 + (i / BANDS) * 50},60%,60%,0.7)`;
    ctx.fillRect(i * bw + 0.5, H - bh, bw - 1, bh);
    freqAtX.push({ hz, pct: v, band: getBand(hz) });
  }
}

function mapFreqForHover() {
  freqAtX = [];
  const bins = Math.floor(bufLen * 0.55);
  for (let i = 0; i < bins; i++) {
    const v = dataArr[i] / 255;
    const hz = (i / bufLen) * (audioCtx.sampleRate / 2);
    freqAtX.push({ hz, pct: v, band: getBand(hz) });
  }
}

function updateHUD() {
  if (!audioCtx) return;
  const sr = audioCtx.sampleRate;
  let domIdx = 0;
  let domVal = 0;

  for (let i = 0; i < bufLen; i++) {
    if (dataArr[i] > domVal) {
      domVal = dataArr[i];
      domIdx = i;
    }
  }

  const hz = (domIdx / bufLen) * (sr / 2);
  lastDominantHz = hz;
  const hzStr = formatHz(hz);
  const bass = avg(0, Math.floor(bufLen * 0.04));
  const maxV = Math.round(avg(0, Math.floor(bufLen * 0.55)) * 100 * 4) || 100;

  document.getElementById("bigValue").textContent = `${hzStr} Rupiah Indonesia`;
  document.getElementById("inputBass").value = Math.round(bass * 100);
  document.getElementById("inputFreq").value = hzStr;
  document.getElementById("liveVal").textContent = hzStr;
  document.getElementById("yTop").textContent = maxV;
  document.getElementById("yMid1").textContent = Math.round(maxV * 0.75);
  document.getElementById("yMid2").textContent = Math.round(maxV * 0.5);
  document.getElementById("yMid3").textContent = Math.round(maxV * 0.25);
  document.getElementById("yBot").textContent = 0;
}

function avg(a, b) {
  let s = 0;
  for (let i = a; i < b; i++) s += dataArr[i];
  return s / ((b - a) * 255);
}

function formatHz(hz) {
  const num = (typeof hz === 'number' && !isNaN(hz)) ? hz : 0;
  const rate = 18000 + num;
  return new Intl.NumberFormat('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(rate);
}

function getBand(hz) {
  if (hz < 250) return "Bass";
  if (hz < 2000) return "Mid Range";
  if (hz < 6000) return "Upper Mid";
  return "Treble";
}

function onChartMove(e) {
  if (!freqAtX.length) return;

  const rect = canvas.getBoundingClientRect();
  const W = canvas.clientWidth;
  const H = canvas.clientHeight;
  const mouseX = Math.max(0, Math.min(e.clientX - rect.left, W));
  const ratio = W ? mouseX / W : 0;
  const idx = Math.min(Math.floor(ratio * freqAtX.length), freqAtX.length - 1);
  const info = freqAtX[idx] || { hz: lastDominantHz, pct: 0.15, band: "Frekuensi Dominan" };
  const dotY = H - H * 0.08 - info.pct * H * 0.84;

  const ch = document.getElementById("crosshair");
  const dot = document.getElementById("crosshairDot");
  const box = document.getElementById("crosshairBox");
  ch.style.display = "block";
  ch.style.left = `${mouseX}px`;
  dot.style.top = `${Math.max(8, Math.min(dotY, H - 8))}px`;
  document.getElementById("crosshairVal").textContent = formatHz(info.hz);
  document.getElementById("crosshairLbl").textContent = info.band;

  if (mouseX > W * 0.6) box.classList.add("flip");
  else box.classList.remove("flip");
}

function onChartLeave() {
  document.getElementById("crosshair").style.display = "none";
}

function setVizMode(m, btn) {
  vizMode = m;
  history = [];
  document.querySelectorAll(".gf-tab").forEach(t => t.classList.remove("active"));
  btn.classList.add("active");
}

function toggleSrcBody() {
  srcOpen = !srcOpen;
  document.getElementById("srcDrawer").classList.toggle("open", srcOpen);
  document.getElementById("drawerOverlay").classList.toggle("open", srcOpen);
  document.getElementById("menuBtn").classList.toggle("active", srcOpen);
}

const dz = document.getElementById("dropZone");
dz.addEventListener("dragover", e => {
  e.preventDefault();
  dz.classList.add("drag");
});
dz.addEventListener("dragleave", () => dz.classList.remove("drag"));
dz.addEventListener("drop", e => {
  e.preventDefault();
  dz.classList.remove("drag");
  const f = e.dataTransfer.files[0];
  if (f && f.type.startsWith("audio/")) {
    setUrlStatus("ok", `File dimuat: ${f.name}.`);
    loadAudio(URL.createObjectURL(f), f.name.replace(/\.[^.]+$/, ""), "File Lokal");
  }
});

updateClock();
resize();
drawIdle();
setInterval(updateClock, 30000);
window.addEventListener("resize", () => {
  resize();
  if (!isPlaying) drawIdle();
});

// Spacebar play/pause shortcut
window.addEventListener("keydown", (e) => {
  if (e.code === "Space" || e.key === " ") {
    const activeEl = document.activeElement;
    if (activeEl && (activeEl.tagName === "INPUT" || activeEl.tagName === "TEXTAREA")) {
      return;
    }
    e.preventDefault();
    togglePlay();
  }
});
