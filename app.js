const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);
const C = i => `var(--c${i % 5})`;
const nf = n => (n == null ? '0' : Math.round(n).toLocaleString());
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[c]));
const sh = n => (n >= 1e4 ? Math.round(n / 1e3) + 'k' : n >= 1e3 ? (n / 1e3).toFixed(1) + 'k' : Math.round(n) + '');
const dur = s => (s == null ? 'n/a' : s < 60 ? Math.round(s) + 's' : s < 3600 ? (s / 60).toFixed(1) + ' min' : (s / 3600).toFixed(1) + ' h');
const hh = h => String(h).padStart(2, '0');
const MN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const mlab = k => (!k || k.length < 7 ? (k || '') : MN[+k.slice(5, 7) - 1] + ' ' + k.slice(2, 4));
const WD = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const BK = ['Same minute', '1-5 min', '5-15 min', '15-60 min', '1 h or more'];
const sum = a => (Array.isArray(a) ? a.reduce((x, y) => x + y, 0) : 0);
const initials = name => {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  return parts.slice(0, 2).map(p => p[0].toUpperCase()).join('');
};

const WA_ICON_B64 = "iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAACXBIWXMAAAsTAAALEwEAmpwYAAAHKUlEQVR4nO1ZeWwUZRRfPKIx8T4SNWr806gx0T+M/lWvaIwaQUIQr6hBRFQ8IMjlhaggCgohiuCBNx6J0KC0YsEWtHa7c3R3Z75v5pvZbo89elJ2d/Z+5k3odqa77R4dNCZ9yZdsZmfee7/vnd/7XK5pmqZpmjIBwAk8Idd7CFvRoWgNAtWCPFHjnKxmceFvfCZSbT8nqas8knLjLoATXf81cYRczFO2nidswMcCsa5wNDM0chQSyRRksznI5/Pmwt/4bGgkBl3hvqyfdcYEwoZ4wja5vezSf11xrzd4jkC0HTxRDVTaSKagWjJSaeiO9GUFwgyBsp0eSs//V5TnZGUOT9gRVDyTzcJUKZvLoVUyPGFHOYk9cNwUb2pqOkkg2navqifiRrKkMr1GGPaGf4NN6jZY5l0DTwvLYZGw3Py9Uf0I9oQaoNvoLfltIpkEn6on0Bput/tkZ5XX9VMFojUowR4Dd8xKecjDb9E/YCG/DOqaZ1a0nuCWQH2oEdK5tI1XLpcD1tWbFCk76Hb3nObkzjdo3aEUBqSV3EMCzOderFjx8Wtu2wJo6W+1b0g+D4GecEog7IAjluCp9jHuvFX5HORhm/5FzYqPXxuUrZCyWANloSXQnaakvEdis72qHre6jZE1YIXvTceUrzu2nhNXQzwbt7mTVw0YNQe2KHaeLRA2bA1Y3PmV/rccV77u2FosrrJZAgObJ2zELcvnVQ+Asm3BUDRj9U8n3WYyd7ISpliBss+rUt7tD1yIRcqa51sHPUXCbm65Dz7r/BakEQp/9P8Fdx6e5wiIFktgYxXHYtehKJdUDECQ1TexUI0yyeSz8EDbU0WCdnXvtu3Wh/rnjgCY27bAlmKxYvOEbaxIeQCYIRAtir3LKO2LNBUJedC9yKwB4wvZTc2zHAFRH2q0tR3YO1XUAAp+5VqfGohZFVvEv1QkAOOhFGHVdQLAAm6Jja+fBWLtfuWGsgA4SV0aDEcL9osk+0ru6u7QvpIADg387VhA9xphWzBzkrKyLIAOqtUPHjla+PDXyO8lmX8Z/KEkgIN9hx0DUG9xI2zTRUVrLAtApBqz5v4tbEdJ5q9I64uUH0gNwZy/5zsG4H314wJvjEmBskD5GCBsOJ0ZS58TFa7bDs2B4fQRG4A18nuOKV/XPBNe8r1R4I0pXSAsVj4GZJbEMj5KWOInEvAB217U3DmVheqaZ8Izwgpbf8TJaqYsAF5WbS3zix2vTCgAC5l0VLGBwL7fKQDPCisLfHOVAhAo60+lxzqIV6UNkwp52P202eAVTJ3PwFLva44AWO5ba3MhPLWVB6BoqjWIt2qflhW02r/OVtSwIZsoHtBCX3X9CLNbHy/LdzPbYQniJIiU6WUBiIr2ff/wWHA29bVUtFvbA18VZSU8Qt7950OFd16V3ikAxVZhT6gB5rUtnJDnL+H9BV6Y2kWq/1oWgEdSFwdDkUIh608NVByYpWpDLBM3d3wt2WRztTHfzpln6PG8UCYW0VHC3oyT1WVlAfB+9aoORR87WQDAC5MEcikXyearm1b82FNfxAcHAlbyqXqsXVKvKwvAdCPKuq1xsD/aXFXwPckthUA8WDGA1+V3i3g0RA7Y/F+gDM0xoyIAPGVrOi1uhCexxz3PVwXi1pbZsI5uga5Ez6TKtw3xcEvL7KLMZrViMBzNCIS95apm8sYTNWFNpyio1nSII5cfevaYVhkNYoytbfoXJtDxvo8FcZQyGUyfaqJdki6qGMAxK3wdHhgqMAoZEUdy+x2H74e7/nxwwv8/CXxtsxB6gkC0ra5qSaQ6PxIbi2Vsn50AMNla5X/bdNdRiiUM8yDjZuzMqpSXJOl0jrBULjfGDLvP46n8av86W5rFdqZD0ROcrNxb9e63S8o9NNAVs+Zqa0Fyct3UPAs+0nfadh4bNxrsNniibXHVQjjEDfcPFjj6RkhB4O2H5sKSjtfgm66foDF6EB5tX1yz8o+0PwOeIdHm86g8jjFFyvbWfAkiUNZrPdTjKQuDix/2Fg9kIW+2G8+Lqyuq2PjOs+JKcyCcy9sHxThCoZ3dBipPKT2lJuV5Wb5cpCwBNVB/ahB+72sxxyvY92AFx4XBiU3hvsgB851SFEsYps+LVNsypesnTlIXBHrCpS8ALGZGgdaTW62UzmShszeS5gkbxNhzTZVEhe0bPDJSJAivkaKDw6AEe+O8zHByrOPhp7M3kprowmMywm+CoWgai5RAtc1/UXqGI3cBeKOI1Q+r8MDwCGg9IfRJvDkJ4YwSr5hGh62tfv+5vKy+jDHToWhx7GKxFUfl8HtMhbjSmYz5DPnhOzjxFogWxpaFV9ULXE4Rp+tnYf73KjreIg6LlP3MS+yxdp92Wblv2wm5AltxgbLvRKpRPNmhhXBhMRKppoiKtpuXlRc8RLum4sasWhIkdjXnU66s+sNpmibX/5L+AahqYyCllOFHAAAAAElFTkSuQmCC";

const ICONS = {
  calendar: '<rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
  message: '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>',
  clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
  flame: '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>',
  heart: '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>',
  moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
  camera: '<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/>',
  smile: '<circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/>',
  feather: '<path d="M12.67 19a2 2 0 0 0 1.416-.588l6.154-6.172a6 6 0 0 0-8.49-8.49L5.586 9.914A2 2 0 0 0 5 11.328V18a1 1 0 0 0 1 1z"/><path d="M16 8 2 22"/><path d="M17.5 15H9"/>',
  award: '<circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/>',
  sparkle: '<path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/>',
  zap: '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>',
  sliders: '<line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="2" y1="14" x2="6" y2="14"/><line x1="10" y1="8" x2="14" y2="8"/><line x1="18" y1="16" x2="22" y2="16"/>',
  repeat: '<path d="m17 2 4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14"/><path d="m7 22-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/>',
  timer: '<line x1="10" y1="2" x2="14" y2="2"/><line x1="12" y1="14" x2="15" y2="11"/><circle cx="12" cy="14" r="8"/>',
  book: '<path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20"/>',
  'git-merge': '<circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><path d="M6 21V9a9 9 0 0 0 9 9"/>',
  play: '<polygon points="6 3 20 12 6 21 6 3"/>',
  shield: '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>',
  upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
  x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  'chevron-left': '<path d="m15 18-6-6 6-6"/>',
  'chevron-right': '<path d="m9 18 6-6-6-6"/>',
  check: '<polyline points="20 6 9 17 4 12"/>',
  lock: '<rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  eye: '<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>'
};

const icon = (name, cls = '') =>
  `<svg${cls ? ` class="${cls}"` : ''} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ICONS.award}</svg>`;

const TROPHY_ICON = {
  RIZZ: 'flame',
  CHARM: 'heart',
  PEACE: 'feather',
  COMEDY: 'smile',
  YEARNING: 'moon',
  PHOTO: 'camera'
};

let cachedSummary = null;
let cachedDailyCSV = null;
let useNeuralAI = true;
let blurSensitive = true;
let exportPolicy = (window.__EMBEDDED_DATA__ && window.__EMBEDDED_DATA__.exportPolicy) || 'live';
let unlockedCache = new Map();
let revealObserver = null;
let navObserver = null;
let scrollBound = false;

// ===== THEME & SESSION CONTROLS =====
function initTheme() {
  const html = document.documentElement;
  const saved = localStorage.getItem('theme');
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const isDark = saved ? saved === 'dark' : prefersDark;
  html.dataset.theme = isDark ? 'dark' : 'light';
  updateThemeIcons(isDark);
}

function toggleTheme() {
  const html = document.documentElement;
  const newTheme = html.dataset.theme === 'dark' ? 'light' : 'dark';
  html.dataset.theme = newTheme;
  localStorage.setItem('theme', newTheme);
  updateThemeIcons(newTheme === 'dark');
}

function updateThemeIcons(isDark) {
  const sun = $('.icon-sun'), moon = $('.icon-moon');
  if (sun && moon) {
    sun.style.display = isDark ? 'block' : 'none';
    moon.style.display = isDark ? 'none' : 'block';
  }
}

function applyBlurState() {
  if (exportPolicy === 'redacted_always_blurred') blurSensitive = true;
  document.body.classList.toggle('blur-sensitive', blurSensitive);
  const btn = $('#blur-toggle');
  if (btn) {
    btn.classList.toggle('active', blurSensitive);
    btn.setAttribute('aria-pressed', String(blurSensitive));
    btn.textContent = blurSensitive ? 'Blur On' : 'Blur Off';
  }
}

function note(htmlContent, isError = false) {
  const s = $('#state');
  if (!s) return;
  s.innerHTML = `<div class="note-box ${isError ? 'note-error' : ''}">${htmlContent}</div>`;
  s.hidden = false;
  s.style.display = 'flex';
}

function showProgress(pct, label) {
  const state = $('#state');
  if (!state) return;
  state.hidden = false;
  state.style.display = 'flex';
  state.innerHTML = `
    <div class="spinner" aria-busy="true"></div>
    <p class="text-muted">${esc(label || 'Analyzing...')}</p>
    <div class="prog-bar"><div class="prog-fill" style="width:${Math.min(100, Math.max(4, pct || 5))}%"></div></div>`;
}

// ===== WEB CRYPTO AES-256-GCM HELPERS =====
const b64encode = buf => {
  const bytes = new Uint8Array(buf);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
};
const b64decode = str => {
  const bin = atob(str);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
};

async function deriveAesKey(passphrase, saltBytes, iterations = 310000) {
  const enc = new TextEncoder();
  const keyMat = await crypto.subtle.importKey('raw', enc.encode(passphrase), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: saltBytes, iterations, hash: 'SHA-256' },
    keyMat,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

async function encryptString(key, plaintext) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(String(plaintext)));
  return { __enc: true, iv: b64encode(iv), ct: b64encode(ct) };
}

async function decryptString(key, obj) {
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64decode(obj.iv) }, key, b64decode(obj.ct));
  return new TextDecoder().decode(pt);
}

function resolveBlurValue(val, placeholder) {
  if (val && typeof val === 'object' && val.__enc) {
    const cacheKey = val.ct.slice(0, 24);
    if (unlockedCache.has(cacheKey) && !blurSensitive) {
      return { text: unlockedCache.get(cacheKey), encrypted: false, locked: false };
    }
    return { text: placeholder, encrypted: true, locked: true, cacheKey };
  }
  if (exportPolicy === 'redacted_always_blurred') {
    return { text: String(val ?? ''), encrypted: false, locked: true };
  }
  return { text: String(val ?? ''), encrypted: false, locked: false };
}

function renderSensitiveText(val, isSensitive, tag = 'div') {
  if (val && typeof val === 'object' && val.__enc) {
    const cacheKey = val.ct.slice(0, 24);
    if (unlockedCache.has(cacheKey) && !blurSensitive) {
      return `<${tag} class="sensitive-quote revealed">${esc(unlockedCache.get(cacheKey))}</${tag}>`;
    }
    return `<${tag} class="sensitive-quote locked-blur clickable" data-enc-key="${esc(cacheKey)}">Encrypted sensitive message content blurred for privacy</${tag}>` +
           `<span class="sensitive-hint" data-unlock-trigger="1">${icon('lock')} Encrypted · Click to unlock with passphrase</span>`;
  }
  if (isSensitive || exportPolicy !== 'live') {
    const masked = isSensitive;
    if (masked) {
      const locked = exportPolicy === 'redacted_always_blurred';
      return `<${tag} class="sensitive-quote ${locked ? 'locked-blur' : 'clickable'}">${esc(val)}</${tag}>` +
             (locked
               ? `<span class="sensitive-locked-tag">Permanently blurred on export</span>`
               : `<span class="sensitive-hint" data-reveal-toggle="1">${icon('eye')} Sensitive quote · Click to reveal/hide</span>`);
    }
  }
  return `<${tag}>${esc(val)}</${tag}>`;
}

// ===== SVG CHARTS =====
function bars(labels, series, o = {}) {
  const W = 640, H = o.h || 210, m = { l: 42, r: 12, t: 12, b: 24 };
  const w = W - m.l - m.r, ih = H - m.t - m.b;
  const n = Math.max(1, labels.length), k = o.stack ? 1 : Math.max(1, series.length);
  const tot = labels.map((_, i) => o.stack ? sum(series.map(s => s.vals[i] || 0)) : Math.max(...series.map(s => s.vals[i] || 0)));
  const mx = Math.max(...tot, 1);
  const st = w / n, bw = (st * 0.8) / k;
  let g = '';
  for (let t = 0; t <= 4; t++) {
    const y = m.t + ih - (ih * t) / 4;
    g += `<line class="gl" x1="${m.l}" x2="${W - m.r}" y1="${y}" y2="${y}"/>` +
         `<text class="ax" x="${m.l - 6}" y="${y + 3}" text-anchor="end">${sh((mx * t) / 4)}${o.u || ''}</text>`;
  }
  labels.forEach((l, i) => {
    let base = 0;
    series.forEach((s, j) => {
      const v = s.vals[i] || 0;
      const bh = (ih * v) / mx;
      const x = m.l + i * st + st * 0.1 + (o.stack ? 0 : j * bw);
      const y = m.t + ih - bh - (o.stack ? (ih * base) / mx : 0);
      g += `<rect class="bar" x="${x}" y="${y}" width="${o.stack ? st * 0.8 : bw}" height="${bh}" rx="4" fill="${s.color}">` +
           `<title>${esc(l)}, ${esc(s.name)}: ${nf(v)}${o.u || ''}</title></rect>`;
      base += v;
    });
    if (i % (o.every || 1) === 0) {
      g += `<text class="ax" x="${m.l + i * st + st / 2}" y="${H - 6}" text-anchor="middle">${esc(l)}</text>`;
    }
  });
  return `<svg viewBox="0 0 ${W} ${H}" role="img" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
}

function lineChart(labels, vals, color = 'var(--c3)', u = '') {
  if (!labels || !labels.length) return '<p class="text-muted">Not enough data yet.</p>';
  const W = 640, H = 190, m = { l: 42, r: 14, t: 14, b: 26 };
  const w = W - m.l - m.r, ih = H - m.t - m.b;
  const n = vals.length, mx = Math.max(...vals, 1);
  const X = i => m.l + (w * i) / Math.max(n - 1, 1);
  const Y = v => m.t + ih - (ih * v) / mx;
  const pts = vals.map((v, i) => `${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join(' ');
  let g = '';
  for (let t = 0; t <= 4; t++) {
    const y = m.t + ih - (ih * t) / 4;
    g += `<line class="gl" x1="${m.l}" x2="${W - m.r}" y1="${y}" y2="${y}"/>` +
         `<text class="ax" x="${m.l - 6}" y="${y + 3}" text-anchor="end">${Math.round((mx * t) / 4)}${u}</text>`;
  }
  const step = Math.max(1, Math.ceil(n / 6));
  labels.forEach((l, i) => {
    if (i % step === 0 || i === n - 1) g += `<text class="ax" x="${X(i)}" y="${H - 6}" text-anchor="middle">${esc(l)}</text>`;
  });
  g += `<polygon points="${m.l},${m.t + ih} ${pts} ${X(n - 1)},${m.t + ih}" fill="${color}" opacity="0.12"/>` +
       `<polyline class="draw" pathLength="1" points="${pts}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>`;
  vals.forEach((v, i) => {
    g += `<circle cx="${X(i)}" cy="${Y(v)}" r="3" fill="${color}" stroke="var(--surface)" stroke-width="1.5"><title>${esc(labels[i])}: ${v}${u}</title></circle>`;
  });
  return `<svg viewBox="0 0 ${W} ${H}" role="img" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
}

function timeline(days, vals) {
  if (!days || !days.length || !vals || !vals.length) return '';
  const W = 640, H = 210, m = { l: 42, r: 12, t: 12, b: 24 };
  const w = W - m.l - m.r, ih = H - m.t - m.b;
  const n = vals.length, mx = Math.max(...vals, 1);
  const X = i => m.l + (w * i) / Math.max(n - 1, 1);
  const Y = v => m.t + ih - (ih * v) / mx;
  const avg = vals.map((_, i) => {
    const a = vals.slice(Math.max(0, i - 6), i + 1);
    return sum(a) / a.length;
  });
  const pts = a => a.map((v, i) => `${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join(' ');
  let g = '';
  for (let t = 0; t <= 4; t++) {
    const y = m.t + ih - (ih * t) / 4;
    g += `<line class="gl" x1="${m.l}" x2="${W - m.r}" y1="${y}" y2="${y}"/>` +
         `<text class="ax" x="${m.l - 6}" y="${y + 3}" text-anchor="end">${sh((mx * t) / 4)}</text>`;
  }
  for (let t = 0; t < 6; t++) {
    const i = Math.round(((n - 1) * t) / 5);
    g += `<text class="ax" x="${X(i)}" y="${H - 6}" text-anchor="${t === 0 ? 'start' : t === 5 ? 'end' : 'middle'}">${days[i] ? days[i].slice(5) : ''}</text>`;
  }
  g += `<polygon points="${m.l},${m.t + ih} ${pts(vals)} ${X(n - 1)},${m.t + ih}" fill="var(--c1)" opacity="0.12"/>` +
       `<polyline class="draw" pathLength="1" points="${pts(avg)}" fill="none" stroke="var(--c0)" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"/>`;
  return `<svg viewBox="0 0 ${W} ${H}" role="img" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
}

function heat(h) {
  if (!h || !h.length) return '';
  const W = 640, l = 34, cw = (W - l - 4) / 24, ch = 21;
  const mx = Math.max(...h.flat(), 1);
  let g = '';
  h.forEach((r, d) => {
    g += `<text class="ax" x="${l - 6}" y="${4 + d * ch + 14}" text-anchor="end">${WD[d]}</text>`;
    r.forEach((v, x) => {
      g += `<rect class="heat-cell" x="${l + x * cw + 1}" y="${4 + d * ch + 1}" width="${cw - 2}" height="${ch - 2}" rx="3" fill="var(--c0)" fill-opacity="${0.08 + 0.92 * Math.sqrt(v / mx)}">` +
           `<title>${WD[d]} ${hh(x)}:00, ${nf(v)} messages</title></rect>`;
    });
  });
  for (let x = 0; x < 24; x += 3) {
    g += `<text class="ax" x="${l + x * cw + cw / 2}" y="${4 + 7 * ch + 14}" text-anchor="middle">${hh(x)}</text>`;
  }
  return `<svg viewBox="0 0 ${W} ${7 * ch + 22}" role="img" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
}

function csvDaily(t) {
  if (!t) return null;
  const r = t.replace(/^\uFEFF/, '').trim().split(/\r?\n/).slice(1).map(l => l.split(','));
  const m = new Map(r.map(([d, c]) => [d ? d.trim() : '', +(c || 0)]));
  const ds = [...m.keys()].filter(Boolean).sort();
  if (!ds.length) return null;
  const U = d => { const [a, b, c] = d.split('-').map(Number); return Date.UTC(a, b - 1, c); };
  const days = [], vals = [];
  for (let t0 = U(ds[0]); t0 <= U(ds[ds.length - 1]); t0 += 864e5) {
    const k = new Date(t0).toISOString().slice(0, 10);
    days.push(k);
    vals.push(m.get(k) || 0);
  }
  return { days, vals };
}

// ===== SCROLL MOTION, COUNT-UP & NAV =====
function animateCount(el) {
  const target = Number(el.dataset.count);
  if (el.dataset.counted === '1' || !Number.isFinite(target)) return;
  el.dataset.counted = '1';
  const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced || target <= 0) {
    el.textContent = Math.round(target).toLocaleString();
    return;
  }
  const start = performance.now();
  const duration = 900;
  const step = now => {
    const t = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - t, 3);
    el.textContent = Math.round(target * eased).toLocaleString();
    if (t < 1) requestAnimationFrame(step);
    else el.textContent = Math.round(target).toLocaleString();
  };
  requestAnimationFrame(step);
}

function revealElement(el) {
  if (!el || el.classList.contains('in')) return;
  el.classList.add('in');
  if (el.hasAttribute('data-count')) animateCount(el);
  el.querySelectorAll('[data-count]').forEach(animateCount);
}

function sweepVisibleReveals() {
  const vh = window.innerHeight || document.documentElement.clientHeight;
  $$('#out .reveal:not(.in)').forEach(el => {
    const rect = el.getBoundingClientRect();
    if (rect.top < vh * 0.96) revealElement(el);
  });
}

function initMotion() {
  if (revealObserver) { revealObserver.disconnect(); revealObserver = null; }
  if (navObserver) { navObserver.disconnect(); navObserver = null; }

  const targets = Array.from(new Set($$('#out .card, #out .tile, #out .sh, #out .kpi')));
  const siblingsMap = new Map();
  targets.forEach(el => {
    el.classList.add('reveal');
    const parent = el.parentElement || document.body;
    const idx = siblingsMap.get(parent) || 0;
    siblingsMap.set(parent, idx + 1);
    el.style.setProperty('--d', `${(idx % 8) * 55}ms`);
  });

  const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced || !('IntersectionObserver' in window)) {
    targets.forEach(revealElement);
  } else {
    revealObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          revealElement(entry.target);
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });

    targets.forEach(el => revealObserver.observe(el));
    requestAnimationFrame(sweepVisibleReveals);
  }

  // Active nav link observer
  const sections = $$('#out section[id]');
  const navLinks = $$('.nav-link');
  if ('IntersectionObserver' in window && sections.length && navLinks.length) {
    navObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const id = entry.target.id;
          navLinks.forEach(a => a.classList.toggle('active', a.getAttribute('href') === `#${id}`));
        }
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    sections.forEach(sec => navObserver.observe(sec));
  }

  // Scroll listener for navbar border & tall-card viewport sweep
  const navbar = $('header.navbar');
  const onScroll = () => {
    if (navbar) navbar.classList.toggle('scrolled', window.scrollY > 8);
    sweepVisibleReveals();
  };
  onScroll();
  if (!scrollBound) {
    scrollBound = true;
    window.addEventListener('scroll', onScroll, { passive: true });
  }
}

// ===== MAIN DASHBOARD RENDER =====
function render(d, daily) {
  if (!d) return;
  const S = d.senders || [];
  const P = d.per_sender || {};
  const O = d.overview || {};
  const N = S.length;
  const TM = Math.max(1, O.total_messages || 1);
  const rawTM = O.total_messages || 0;
  const span = Math.max(1, O.span_days || 1);
  const F = s => (s ? s.split(' ')[0] : '');

  const wrappedBtn = $('#wrapped-btn');
  if (wrappedBtn) wrappedBtn.disabled = false;

  let titleText = 'WhatsApp Chat Analyzer';
  if (N === 2) titleText = `${F(S[0])} & ${F(S[1])}`;
  else if (N > 2) titleText = S.map(F).slice(0, 3).join(', ') + (N > 3 ? ` +${N - 3}` : '');
  else if (N === 1) titleText = F(S[0]);
  document.title = titleText ? `${titleText} — WhatsApp Chat Analyzer` : 'WhatsApp Chat Analyzer';

  const heroTitle = N === 2
    ? `${esc(F(S[0]))} <span class="amp">&amp;</span> ${esc(F(S[1]))}`
    : (N > 2 ? esc(S.map(F).join(', ')) : (N === 1 ? esc(F(S[0])) : 'Your chat'));

  const sec = (id, bandClass, eyebrow, t, s, meta, b) => `
    <section class="s band ${bandClass}" id="${id}">
      <div class="band-inner">
        <div class="sh">
          <div class="sh-left">
            <span class="eyebrow">${eyebrow}</span>
            <h2>${t}</h2>
            <p>${s}</p>
          </div>
          ${meta ? `<div class="sh-meta">${meta}</div>` : ''}
        </div>
        ${b}
      </div>
    </section>`;

  const card = (t, s, b, c = '', iconName = '') => `
    <div class="card ${c}">
      <div class="card-head">
        <div class="card-title-row">
          ${iconName ? `<span class="card-icon">${icon(iconName)}</span>` : ''}
          <h3>${t}</h3>
        </div>
        ${s ? `<p class="card-sub">${s}</p>` : ''}
      </div>
      ${b}
    </div>`;

  const legend = `<div class="legend">${S.map((s, i) => `<span><i class="dot" style="--k:${C(i)}"></i>${esc(s)}</span>`).join('')}</div>`;
  const ser = f => S.map((s, i) => ({ name: s, color: C(i), vals: f(s) }));
  const senderColor = name => { const i = S.indexOf(name); return C(i >= 0 ? i : 0); };

  const vsCustom = (l, getter, fmt = nf) => {
    const v = S.map(s => getter(s) || 0);
    const t = sum(v) || 1;
    const valsHTML = v.map((x, i) => `<strong style="color:${C(i)}">${fmt(x)}</strong>`).join(' <span class="text-muted">vs</span> ');
    return `
      <div class="vs">
        <div class="vs-top">
          <span class="vl">${l}</span>
          <span class="vn">${valsHTML}</span>
        </div>
        <div class="vb">${v.map((x, i) => x > 0 ? `<i style="width:${(x / t) * 100}%;background:${C(i)}" title="${esc(S[i])}: ${fmt(x)} (${Math.round((x / t) * 100)}%)"></i>` : '').join('')}</div>
      </div>`;
  };
  const vs = (l, f, fmt = nf) => vsCustom(l, s => f(P[s]), fmt);

  const med = r => (r ? (r.after_pause_median ?? r.median) : null);
  const tw = sum(S.map(s => P[s]?.words || 0));
  const late = sum(S.map(s => P[s]?.late_night || 0));
  const months = Object.keys(d.monthly_total || {});
  const wk = sum(S.map(s => P[s]?.starts || 0));
  const convTotal = O.total_conversations || wk;
  const lead = f => S.map(s => [s, f(P[s]) || 0]).sort((a, b) => b[1] - a[1])[0] || [S[0] || '', 0];
  const lw = lead(p => p?.words), ls = lead(p => p?.starts), la = lead(p => p?.avg_words_per_msg);
  const rp = S.filter(s => P[s]?.reply && med(P[s].reply) != null).sort((a, b) => med(P[a].reply) - med(P[b].reply));

  const disc = d.discourse || {};
  const fa = disc.flirt_analysis || {};
  const apol = d.apologies || {};
  const lmAll = d.longest_messages || {};
  const intim = d.intimacy || {};
  const photoReq = d.photo_requests || {};
  const longMeet = d.longing_and_meeting || {};
  const fun = d.fun || {};
  const em = d.engine_meta || {};

  const story = [];
  if (lw && tw) story.push({ html: `<strong>${esc(F(lw[0]))}</strong> wrote ${Math.round((lw[1] / tw) * 100)}% of all the words.`, k: senderColor(lw[0]) });
  if (N > 1 && la && la[1]) story.push({ html: `<strong>${esc(F(la[0]))}</strong> sends longer messages (${la[1].toFixed(1)} words/msg).`, k: senderColor(la[0]) });
  if (wk && ls) story.push({ html: `<strong>${esc(F(ls[0]))}</strong> starts ${Math.round((ls[1] / wk) * 100)}% of conversations after a <em>"Bye / Byee+"</em> sign-off.`, k: senderColor(ls[0]) });
  if (fa.best_flirt_winner) story.push({ html: `<strong>${esc(F(fa.best_flirt_winner))}</strong> is the Best Flirt (${fa.per_sender?.[fa.best_flirt_winner]?.best_score || 0}/100 Rizz Score); <strong>${esc(F(fa.most_flirt_winner))}</strong> flirts the most.`, k: senderColor(fa.best_flirt_winner) });
  if (apol.sorry_first_leader) story.push({ html: `<strong>${esc(F(apol.sorry_first_leader))}</strong> says <em>"Sorry"</em> first most often (${apol.per_sender?.[apol.sorry_first_leader]?.said_sorry_first || 0} times).`, k: 'var(--c2)' });
  if (rp.length > 1 && P[rp[0]]?.reply) story.push({ html: `After a pause, <strong>${esc(F(rp[0]))}</strong> replies faster, typically in ${dur(med(P[rp[0]].reply))}.`, k: senderColor(rp[0]) });
  story.push({ html: `${Math.round((late / TM) * 100)}% of messages happened between midnight and 5 am (Peak: <strong>${hh(O.peak_hour)}:00</strong> on <strong>${esc(O.peak_weekday || '')}s</strong>).`, k: 'var(--c2)' });

  const totalWords = O.total_words || 0;
  const activeDays = O.active_days || 0;
  const consistencyPct = Math.round((activeDays / span) * 100);
  const kp = [
    { label: 'Messages', value: `<span data-count="${Math.round(rawTM)}">${nf(rawTM)}</span>`, hint: `~${nf(rawTM / span)} / day`, accent: true },
    { label: 'Total Words', value: `<span data-count="${Math.round(totalWords)}">${nf(totalWords)}</span>`, hint: `${(totalWords / TM).toFixed(1)} words/msg`, accent: false },
    { label: 'Conversations', value: `<span data-count="${Math.round(convTotal)}">${nf(convTotal)}</span>`, hint: `${(convTotal / span).toFixed(1)} / day`, accent: false },
    { label: 'Active Days', value: `<span data-count="${Math.round(activeDays)}">${nf(activeDays)}</span><span class="kpi-sub"> / ${O.span_days || 0}</span>`, hint: `${consistencyPct}% consistency`, accent: true },
    { label: 'Daily Streak', value: `<span data-count="${Math.round(O.longest_daily_streak || 0)}">${O.longest_daily_streak || 0}</span><span class="kpi-sub"> d</span>`, hint: `current ${O.current_streak || 0} d`, accent: false },
    { label: 'Chat Hours', value: O.total_chat_hours != null ? `<span data-count="${Math.round(O.total_chat_hours)}">${Math.round(O.total_chat_hours).toLocaleString()}</span><span class="kpi-sub"> h</span>` : 'n/a', hint: O.total_chat_hours != null ? `~${(O.total_chat_hours / span).toFixed(1)} h / day` : 'estimated', accent: false },
    { label: 'Style Sync', value: fun.lsm_score_pct != null ? `${fun.lsm_score_pct}%` : 'n/a', hint: 'LSM synchrony', accent: true },
  ];

  // --- Discourse 5-Way HTML ---
  const discMeta = [
    ['flirting', 'Flirting & Romance', 'var(--c3)', 'Affection, romance, tension'],
    ['teasing', 'Teasing & Wit', 'var(--c2)', 'Playful ribbing, inside jokes'],
    ['arguments', 'Disagreements', 'var(--c4)', 'Friction & clarifications'],
    ['facts_info', 'Life & Info', 'var(--c1)', 'Updates, plans, information'],
    ['normal', 'Everyday Routine', 'var(--c0)', 'Daily routine & logistics'],
  ];
  const ovDisc = disc.overall_pct || {};
  const discHTML = `
    <div class="spectrum-bar">
      ${discMeta.filter(([k]) => (ovDisc[k] || 0) > 0).map(([k, lbl, col]) => `<div class="spectrum-seg" style="width:${ovDisc[k]}%;background:${col}" title="${lbl}: ${ovDisc[k]}%"></div>`).join('')}
    </div>
    <div class="cat-grid">
      ${discMeta.map(([k, lbl, col, desc]) => `
        <div class="tile cat-tile">
          <div>
            <div class="cat-head">
              <span class="cat-name"><i class="cat-swatch" style="background:${col}"></i>${lbl}</span>
              <span class="cat-pct">${ovDisc[k] || 0}%</span>
            </div>
            <p class="cat-desc">${desc}</p>
          </div>
          <div class="cat-bars">
            ${S.map((s, i) => {
              const pct = disc.per_sender_pct?.[s]?.[k] ?? 0;
              return `
                <div>
                  <div class="mini-row-head"><span style="color:${C(i)}">${esc(F(s))}</span><span>${pct}%</span></div>
                  <div class="mini-bar"><i style="width:${pct}%;background:${C(i)}"></i></div>
                </div>`;
            }).join('')}
          </div>
        </div>`).join('')}
    </div>`;

  // --- Flirt Championship HTML ---
  const fp = fa.per_sender || {};
  const flirtHTML = `
    <div class="champ-row">
      <div class="tile champ-box" style="--k:${senderColor(fa.most_flirt_winner)}">
        <small>Flirts the Most</small>
        <strong style="color:${senderColor(fa.most_flirt_winner)}">${esc(fa.most_flirt_winner || 'n/a')}</strong>
        <span>${nf(fp[fa.most_flirt_winner]?.count)} proactive flirting msgs (${fp[fa.most_flirt_winner]?.pct_of_messages || 0}% of their texts)</span>
      </div>
      <div class="tile champ-box" style="--k:${senderColor(fa.best_flirt_winner)}">
        <small>Flirts the Best (Rizz Score)</small>
        <strong style="color:${senderColor(fa.best_flirt_winner)}">${esc(fa.best_flirt_winner || 'n/a')}</strong>
        <span>${fp[fa.best_flirt_winner]?.best_score || 0} / 100 composite craft &amp; partner reaction</span>
      </div>
    </div>
    ${legend}
    ${vsCustom('Proactive flirting messages', s => fp[s]?.count || 0)}
    ${vsCustom('Partner flustered reactions induced', s => fp[s]?.flusters_induced || 0)}
    ${vsCustom('Unprompted flirt initiations', s => fp[s]?.initiations || 0)}
    ${vsCustom('Partner "Butterflies" reaction score (40%)', s => fp[s]?.components?.partner_reaction || 0, x => x + '/100')}
    ${vsCustom('Lexical creativity & originality (25%)', s => fp[s]?.components?.creativity || 0, x => x + '/100')}
    ${vsCustom('Smooth segue from normal talk (20%)', s => fp[s]?.components?.smooth_segue || 0, x => x + '/100')}
    ${vsCustom('Personalized compliment depth (15%)', s => fp[s]?.components?.specificity || 0, x => x + '/100')}`;

  // --- Photo Requests & Longing / Meet HTML ---
  const photoHTML = `
    ${legend}
    ${vsCustom('Direct picture asks ("send pic", "send ur photo", etc.)', s => photoReq[s]?.total || 0)}
    ${vsCustom('Fulfilled with photo/media within 15m', s => photoReq[s]?.fulfilled_with_media || 0)}
    <div class="table-wrap"><table>
      <tr><th>Photo Ask Metric</th>${S.map((s, i) => `<th style="color:${C(i)}">${esc(F(s))}</th>`).join('')}</tr>
      <tr><td>Fulfillment rate (&lt;Media&gt; reply)</td>${S.map(s => `<td>${photoReq[s]?.fulfillment_pct || 0}%</td>`).join('')}</tr>
    </table></div>`;

  const meetHTML = `
    ${legend}
    ${vsCustom('Combined Yearning ("Miss You" + Desire to See / Meet)', s => longMeet[s]?.combined_total || 0)}
    ${vsCustom('"Missing You" total', s => longMeet[s]?.miss_you_total || 0)}
    ${vsCustom('Unprompted "I Miss You" initiations', s => longMeet[s]?.miss_you_initiated || 0)}
    ${vsCustom('Reciprocal "Miss You Too"', s => longMeet[s]?.miss_you_reciprocal || 0)}
    ${vsCustom('Desire to meet / see each other', s => longMeet[s]?.desire_to_meet || 0)}`;

  // --- Apologies / Sorry HTML ---
  const apPer = apol.per_sender || {};
  const apolMonths = Object.keys(d.monthly_total || {});
  const apolHTML = `
    <div class="champ-row">
      <div class="tile champ-box" style="--k:${senderColor(apol.sorry_first_leader)}">
        <small>Who Says "Sorry" First</small>
        <strong style="color:${senderColor(apol.sorry_first_leader)}">${esc(apol.sorry_first_leader || 'n/a')}</strong>
        <span>Initiated ${nf(apPer[apol.sorry_first_leader]?.said_sorry_first)} of ${nf(apol.total_episodes)} episodes</span>
      </div>
      <div class="tile champ-box" style="--k:var(--accent)">
        <small>Post-Conflict Make-Up Speed</small>
        <strong>${apol.median_makeup_minutes != null ? apol.median_makeup_minutes + ' min' : 'n/a'}</strong>
        <span>Median minutes until first apology</span>
      </div>
    </div>
    ${legend}
    ${vsCustom('Total "Sorry" messages sent', s => apPer[s]?.sorry_count || 0)}
    ${vsCustom('Said "Sorry" first in an episode', s => apPer[s]?.said_sorry_first || 0)}
    ${vsCustom('Post-argument peacekeeper apologies', s => apPer[s]?.post_argument_sorry_first || 0)}`;

  const apolChartHTML = legend + bars(
    apolMonths.map(mlab),
    ser(s => apolMonths.map(m => apPer[s]?.monthly?.[m] || 0)),
    { every: Math.max(1, Math.ceil(apolMonths.length / 10)) }
  );

  // --- Intimacy, Nicknames, Sensory Motifs ---
  const nicks = intim.nicknames || [];
  const nicksHTML = nicks.length
    ? `<div class="nick-grid">${nicks.slice(0, 12).map((nk, idx) => {
        const termRes = resolveBlurValue(nk.term, 'Hidden pet name');
        const quoteRes = resolveBlurValue(nk.first_quote, 'Encrypted quote blurred for privacy');
        const isEncrypted = termRes.encrypted || quoteRes.encrypted;
        const isLocked = termRes.locked || quoteRes.locked;
        const cardAttrs = isEncrypted ? ' data-unlock-trigger="1"' : (!isLocked ? ' data-reveal-card="1"' : '');
        const hintMarkup = isEncrypted
          ? `${icon('lock')} Encrypted · Click to unlock`
          : isLocked
            ? `${icon('lock')} Permanently blurred`
            : `<span class="hint-hidden">${icon('eye')} Click to reveal</span><span class="hint-shown">${icon('eye')} Click to hide</span>`;
        return `
          <div class="tile nick-card blur-card${isLocked ? ' locked-blur' : ''}"${cardAttrs}>
            <div>
              <div class="nick-head">
                <span class="nick-rank">#${idx + 1}</span>
                <span class="nick-cnt">${nf(nk.total_count)}</span>
              </div>
              <div class="nick-term blur-field">${esc(termRes.text)}</div>
              <div class="nick-meta">Coined by <strong style="color:${senderColor(nk.coined_by)}">${esc(F(nk.coined_by))}</strong> · ${esc(nk.date_display)}</div>
            </div>
            <div class="nick-quote blur-field">${esc(quoteRes.text)}</div>
            <div class="blur-hint">${hintMarkup}</div>
          </div>`;
      }).join('')}</div>`
    : '<p class="text-muted">No recurring pet names detected yet.</p>';

  const sensCues = Object.entries(intim.sensory_and_physical_cues || {});
  const sensoryHTML = sensCues.length
    ? legend + `<div class="sensory-list">${sensCues.map(([, info]) => {
        const vals = S.map(s => info.per_sender?.[s] || 0);
        const tot = sum(vals);
        const denom = tot || 1;
        return `
          <div class="tile sensory-item">
            <div class="sensory-top">
              <span class="sensory-label">${esc(info.label)}${info.first_unlock ? `<span class="sensory-unlock">first ${esc(info.first_unlock.date_display)}</span>` : ''}</span>
              <span class="sensory-total">${nf(tot)} total</span>
            </div>
            <div class="vb">${vals.map((x, i) => x > 0 ? `<i style="width:${(x / denom) * 100}%;background:${C(i)}" title="${esc(S[i])}: ${nf(x)}"></i>` : '').join('')}</div>
          </div>`;
      }).join('')}</div>`
    : '<p class="text-muted">No sensory motif frequencies found.</p>';

  const trajLabels = Object.keys(intim.monthly_trajectory || {});
  const trajVals = trajLabels.map(k => intim.monthly_trajectory[k]);

  // --- Monumental Longest Messages ---
  const ovLong = lmAll.overall;
  const perLong = lmAll.per_sender || {};
  const longestCards = S.map(s => perLong[s]).filter(Boolean).map(item => ({
    ...item,
    isOverall: Boolean(ovLong && item.sender === ovLong.sender && item.dt === ovLong.dt),
  }));

  const longestHTML = `<div class="wa-bubbles">${longestCards.map((item, idx) => {
    const textRes = resolveBlurValue(item.text, 'Encrypted message blurred for privacy');
    const isEncrypted = textRes.encrypted;
    const isLocked = textRes.locked;
    const textAttrs = isEncrypted ? ' data-unlock-trigger="1"' : (!isLocked ? ' data-reveal-card="1"' : '');
    return `
      <div class="tile wa-bubble blur-card${item.isOverall ? ' is-overall' : ''}${isLocked ? ' locked-blur' : ''}" style="--bc:${senderColor(item.sender)}">
        <div class="wa-bubble-head">
          <div class="wa-author">
            <div class="wa-avatar">${esc(initials(item.sender))}</div>
            <div>
              <div style="font-weight:600;font-size:14px;color:${senderColor(item.sender)}">${esc(item.sender)}</div>
              <div class="wa-meta">${esc(item.date_display)} · ${esc(item.time_display)} · ${nf(item.words)} words</div>
            </div>
          </div>
          <span class="chip ${item.isOverall ? 'chip-accent' : ''}">${item.isOverall ? 'Longest in chat' : 'Personal record'}</span>
        </div>
        <div class="wa-text blur-field${!isLocked ? ' clickable-blur' : ''}" id="lmsg-${idx}"${textAttrs}>${esc(textRes.text)}</div>
        <div class="wa-actions">
          ${isEncrypted
            ? `<button type="button" class="btn btn-pill blur-action" data-unlock-trigger="1">${icon('lock')} Unlock message</button>`
            : isLocked
              ? `<span class="sensitive-locked-tag">Permanently blurred on export</span>`
              : `<button type="button" class="btn btn-pill blur-action" data-reveal-card="1"><span class="hint-hidden">${icon('eye')} Reveal message</span><span class="hint-shown">${icon('eye')} Hide message</span></button>`}
          ${!isLocked && item.words > 80 ? `<button type="button" class="btn btn-pill" data-expand-msg="lmsg-${idx}">Expand full message</button>` : ''}
        </div>
      </div>`;
  }).join('')}</div>`;

  // --- Words & Emojis ---
  const wordsHTML = S.map((s, i) => {
    const t = P[s]?.top_words || [];
    const m = t[0] ? t[0][1] : 1;
    const vars = P[s]?.top_words_variants || {};
    const topEmojis = P[s]?.top_emojis || [];
    const emMax = topEmojis[0] ? topEmojis[0][1] : 1;
    return `
      <div>
        <div class="cols-head"><i class="dot" style="--k:${C(i)}"></i><span>${esc(s)}</span></div>
        <div class="lb-list">
          ${t.slice(0, 12).map(([w, c], idx) => {
            const tip = vars[w] ? vars[w].map(([vw, vc]) => `${vw}: ${vc}`).join(', ') : w;
            return `
              <div class="w">
                <span class="w-rank">${String(idx + 1).padStart(2, '0')}</span>
                <span class="w-word" title="Variants: ${esc(tip)}">${esc(w)}</span>
                <div class="lb-bar"><u style="width:${(c / m) * 100}%;background:${C(i)}"></u></div>
                <em>${sh(c)}</em>
              </div>`;
          }).join('')}
        </div>
        <div class="emoji-section">
          <div class="emoji-head">Top Emojis</div>
          ${topEmojis.length
            ? `<div class="lb-list">
                ${topEmojis.slice(0, 10).map(([e, c], idx) => `
                  <div class="e-row" title="${nf(c)} uses">
                    <span class="w-rank">${String(idx + 1).padStart(2, '0')}</span>
                    <span class="e-glyph">${e}</span>
                    <div class="lb-bar"><u style="width:${(c / emMax) * 100}%;background:${C(i)}"></u></div>
                    <em>${nf(c)}</em>
                  </div>`).join('')}
              </div>`
            : '<p class="text-muted" style="font-size:12.5px">No emojis found.</p>'}
        </div>
      </div>`;
  }).join('');

  // --- Records Grid ---
  const recordsList = [
    ...(d.top_days || []).map(([x, c], i) => ({
      label: `Busiest day${i ? ' #' + (i + 1) : ''}`,
      val: `${nf(c)} msgs`,
      meta: esc(x)
    })),
    {
      label: 'Busiest month',
      val: O.busiest_month ? `${nf(O.busiest_month[1])} msgs` : 'n/a',
      meta: O.busiest_month ? mlab(O.busiest_month[0]) : 'n/a'
    },
    {
      label: 'Longest daily streak',
      val: `${O.longest_daily_streak || 0} days`,
      meta: `${O.streak_started || '?'} → ${O.streak_ended || '?'}`
    },
    {
      label: 'Current streak',
      val: `${O.current_streak || 0} days`,
      meta: 'Ongoing run'
    },
    {
      label: 'Longest silence',
      val: `${O.longest_silence_days || 0} days`,
      meta: 'Max quiet gap'
    }
  ];
  const recordsHTML = `<div class="records-grid">${recordsList.map(r => `
    <div class="tile record-tile">
      <div class="record-label">${r.label}</div>
      <div class="record-val">${r.val}</div>
      <div class="record-meta">${r.meta}</div>
    </div>`).join('')}</div>`;

  // --- Fun: Contagion, Humor, Trophies ---
  const contagionHTML = (fun.contagion && fun.contagion.length)
    ? `<div class="contagion-list">${fun.contagion.map(it => `
        <div class="tile cont-item">
          <div class="cont-tok">${esc(it.token)} <small class="text-muted">(${nf(it.total)}×)</small></div>
          <div class="cont-sub"><strong style="color:${senderColor(it.originator)}">${esc(F(it.originator))}</strong> started it <strong>${it.lead_days}d</strong> earlier; ${esc(F(it.adopter))} caught on (${nf(it.adopter_count)}×)</div>
        </div>`).join('')}</div>`
    : '<p class="text-muted">Not enough multi-week shared slang trends to rank contagion.</p>';

  const trophiesHTML = `<div class="trophy-grid">${(fun.trophies || []).map(tr => `
    <div class="tile trophy-card">
      <div class="trophy-icon">${icon(TROPHY_ICON[tr.icon] || 'award')}</div>
      <div class="trophy-title">${esc(tr.title)}</div>
      <div class="trophy-winner" style="color:${senderColor(tr.winner)}">${esc(tr.winner)}</div>
      <div class="trophy-stat">${esc(tr.stat)}</div>
    </div>`).join('')}</div>`;

  const rr = (l, f) => `<tr><td>${l}</td>${S.map(s => `<td>${f(P[s]?.reply || {})}</td>`).join('')}</tr>`;
  const ns = fun.night_shift || {}, ch = fun.chaser || {}, hu = fun.humor || {};

  const out = $('#out');
  if (!out) return;

  out.innerHTML = `
    <section id="overview" class="band band-mint band-hero">
      <div class="band-inner">
        <div class="hero card">
          <div class="hero-top">
            <div class="hero-intro">
              <div class="hero-chips">
                <span class="chip">${icon('calendar')}${O.span_days || 0} days · ${O.first_message ? O.first_message.slice(0, 10) : ''} → ${O.last_message ? O.last_message.slice(0, 10) : ''}</span>
                <span class="chip ${em.neural_used ? 'chip-accent' : ''}">${icon('sparkle')}${em.neural_used ? `Verified with Neural AI (${esc((em.neural_device || '').toUpperCase())}) · ${nf(em.ambiguous_verified)} ambiguous turns` : '100% Client-Side Pragmatic Engine'}</span>
              </div>
              <h1>${heroTitle}</h1>
              <p class="lede">${nf(convTotal)} conversations analyzed across your shared message history.</p>
            </div>

            <div class="people">
              ${S.map((s, i) => `
                <div class="person">
                  <i class="dot" style="--k:${C(i)}"></i>
                  <div>
                    <div class="person-name">${esc(s)}</div>
                    <div class="person-stat">${Math.round(((P[s]?.messages || 0) / TM) * 100)}% · ${nf(P[s]?.messages)} msgs</div>
                  </div>
                </div>`).join('')}
            </div>
          </div>

          <div class="hero-split">
            <div class="split-labels">
              ${S.map((s, i) => `<span style="color:${C(i)}">${esc(F(s))}: ${Math.round(((P[s]?.messages || 0) / TM) * 100)}% (${nf(P[s]?.messages)})</span>`).join('')}
            </div>
            <div class="split">
              ${S.map((s, i) => `<i style="width:${((P[s]?.messages || 0) / TM) * 100}%;background:${C(i)}"></i>`).join('')}
            </div>
          </div>

          <div class="kpis">
            ${kp.map(k => `
              <div class="kpi tile">
                <div class="kpi-label">${k.label}</div>
                <div class="big">${k.value}</div>
                <div class="kpi-hint ${k.accent ? 'accent' : ''}">${k.hint}</div>
              </div>`).join('')}
          </div>
        </div>

        <div class="grid">
          ${card('The short version', 'Highlights across dynamics, flirting, and apologies',
            `<div class="story-list">${story.map(x => `<div class="tile story-item"><i class="dot" style="--k:${x.k}"></i><span>${x.html}</span></div>`).join('')}</div>`, '', 'zap')}
          ${card('Side by side', 'Share of each total across participants', legend +
            vs('Messages', p => p.messages) +
            vs('Words', p => p.words) +
            vs('Words per message', p => p.avg_words_per_msg, x => x.toFixed(1)) +
            vs('Emojis (grapheme clusters)', p => p.emojis_total) +
            vs('Questions asked (URL-clean)', p => p.questions) +
            vs('Media sent', p => p.media) +
            vs('Late-night (12 am – 5 am)', p => p.late_night), '', 'sliders')}
        </div>
      </div>
    </section>

    ${sec('vibes', 'band-cream', 'Communication spectrum', 'Vibes, Flirting & Intentions', '5-way conversational mix, who flirts the most & best, picture asks, and longing', legend, `
      <div class="grid">
        ${card('5-Way Conversation Breakdown', 'Normalized proportions across Flirting, Teasing, Arguments, Info & Normal Talk', discHTML, 'wide')}
        ${card('Flirt Championship: Most vs. Best', 'Volume vs. partner reaction, creativity, smooth segues, and specificity', flirtHTML, 'wide', 'flame')}
        ${card('Asking for a Picture', 'Direct picture asks ("send pic", "send ur photo", etc., excluding notes & screenshots)', photoHTML, '', 'camera')}
        ${card('Missing You & Desire to Meet', 'Unprompted vs. reciprocal "Miss You", wanting to see each other, and plans to meet', meetHTML, '', 'heart')}
      </div>`)}

    ${sec('apologies', 'band-white', 'Conflict resolution', 'Apologies & Peacekeeping', 'How often each person says "Sorry" and who breaks the ice first',
      `${nf(apol.total_episodes)} episodes · median make-up ${apol.median_makeup_minutes != null ? apol.median_makeup_minutes + ' min' : 'n/a'}`, `
      <div class="grid-12">
        ${card('Sorry & Peacekeeper Tracker', 'Includes typo/elongated variants (sory, sry, sorryyy); excludes third-party sympathy', apolHTML, 'col-5', 'feather')}
        ${card('Apologies Month by Month', 'Monthly frequency of personal apologies', apolChartHTML, 'col-7')}
      </div>`)}

    ${sec('intimacy', 'band-mint', 'Emotional intimacy', 'Intimacy, Pet Names & Sensory Motifs', 'Unlocked nicknames, tender sensory motifs, and intimacy trajectory over time',
      `${nicks.length} pet names`, `
      <div class="grid-12">
        ${card('Unlocked Pet Names & Endearments', 'Includes multi-word regional terms (kutti ponnu, cutee, lussuuu) + strict vocative mining', nicksHTML, 'wide', 'heart')}
        ${card('Sensory & Tender Affection Motifs', 'Hugs, lifting/carrying, looking into eyes, voice admiration, and cute compliments', sensoryHTML, 'col-7')}
        ${card('Monthly Intimacy Trajectory', 'Average warmth & intimacy intensity score across months', lineChart(trajLabels.map(mlab), trajVals, 'var(--c3)'), 'col-5')}
      </div>`)}

    ${sec('rhythm', 'band-cream', 'Temporal dynamics', 'Rhythm, Replies & Night Shift', 'Activity patterns, reply speeds, and Bye/Byee+ conversation boundaries',
      `Peak ${hh(O.peak_hour)}:00 · ${esc(O.peak_weekday || '')}s`, `
      <div class="grid">
        ${card('Hour by hour', 'Messages by hour of day', legend + bars([...Array(24).keys()].map(hh), ser(s => d.hourly[s] || []), { every: 3 }), 'wide')}
        ${d.heatmap ? card('Weekly pattern', 'Darker means busier across the 7 × 24 matrix', heat(d.heatmap), 'wide') : ''}
        ${daily ? card('Every day', 'Daily messages with 7-day rolling average', timeline(daily.days, daily.vals), 'wide') : ''}
        ${card('Month by month', 'Messages per month', legend + bars(months.map(mlab), ser(s => months.map(m2 => (d.monthly && d.monthly[s] && d.monthly[s][m2]) || 0)), { stack: 1, every: Math.max(1, Math.ceil(months.length / 12)) }))}
        ${card('Day of the week', 'Messages per weekday', legend + bars(WD, ser(s => d.weekday[s] || [])))}
        ${card('How fast you reply', 'Share of replies within ' + (O.reply_cap_hours || 6) + ' hours',
          legend + ((P[S[0]]?.reply?.buckets) ? bars(BK, ser(s => P[s].reply.buckets), { u: '%' }) : '') +
          `<div class="table-wrap"><table>
            <tr><th></th>${S.map((s, i) => `<th style="color:${C(i)}">${esc(F(s))}</th>`).join('')}</tr>
            ${rr('Typical delay after a pause', r => dur(med(r)))}
            ${rr('Geometric mean reply latency', r => dur(r.geom_mean))}
            ${rr('Slowest 10% take over', r => dur(r.after_pause_p90 ?? r.p90))}
            ${rr('Replied in the same minute', r => r.same_minute == null ? 'n/a' : Math.round(r.same_minute) + '%')}
          </table></div>`, '', 'timer')}
        ${card('Who keeps it going', "A new conversation starts after 'Bye / Byee / Byeee...' (5-min mutual sign-off window)",
          legend +
          vs('Conversations started', p => p.starts) +
          vs('Had the last word (final Bye)', p => p.ends) +
          vs('Messages in a row, on average', p => p.avg_burst, x => x.toFixed(2)) +
          vs('Longest run without a reply', p => p.longest_burst), '', 'repeat')}
        ${card('2 AM Persona Shift & Chaser Index', 'How behavior transforms after midnight, plus double-texting & dry replies', `
          <div class="table-wrap"><table>
            <tr><th>Behavioral Metric</th>${S.map((s, i) => `<th style="color:${C(i)}">${esc(F(s))}</th>`).join('')}</tr>
            <tr><td>Double-texts (after 30m+ silence)</td>${S.map(s => `<td>${nf(ch[s]?.double_texts_30m)}</td>`).join('')}</tr>
            <tr><td>Vanished mid-chat (&gt;6h without Bye)</td>${S.map(s => `<td>${nf(ch[s]?.unannounced_vanishes_6h)}</td>`).join('')}</tr>
            <tr><td>Dry 1-word replies %</td>${S.map(s => `<td>${ch[s]?.dry_reply_pct ?? 0}%</td>`).join('')}</tr>
            <tr><td>Flirting % (Daytime vs. 12–5 AM)</td>${S.map(s => `<td>${ns[s]?.day_flirt_pct ?? 0}% → <strong>${ns[s]?.night_flirt_pct ?? 0}%</strong></td>`).join('')}</tr>
            <tr><td>Intimacy % (Daytime vs. 12–5 AM)</td>${S.map(s => `<td>${ns[s]?.day_intimacy_pct ?? 0}% → <strong>${ns[s]?.night_intimacy_pct ?? 0}%</strong></td>`).join('')}</tr>
          </table></div>`, 'wide', 'moon')}
      </div>`)}

    ${sec('words', 'band-mint', 'Lexical records', 'Words & Monumental Messages', 'Expressive-normalized vocabulary, emojis, longest texts, and records', '', `
      <div class="grid">
        ${card('Monumental Longest Messages', 'Longest substantive message per participant (full text, date & time)', longestHTML, 'wide', 'book')}
        ${card('Favourite words and emojis', 'Exaggerated repetitions merged; generalized participant names + abbooo kept; screenshot filler words excluded', `<div class="cols">${wordsHTML}</div>`, 'wide')}
        ${card('Records & Streaks', 'Milestones, peak days, and uninterrupted daily runs', recordsHTML, 'wide')}
      </div>`)}

    ${sec('fun', 'band-white band-last', 'Hall of fame', 'Linguistic Contagion, Trophies & Quiz', 'Unique insights, comedy metrics, and the "Guess Who Said It?" mini-game',
      `LSM ${fun.lsm_score_pct ?? 'n/a'}%`, `
      <div class="grid">
        ${card('Superlative Trophy Cabinet', 'Data-backed relationship & chat awards', trophiesHTML, 'wide', 'award')}
        ${card('Linguistic & Emoji Contagion', 'Statistically who used a word or emoji first and infected the other', contagionHTML, '', 'git-merge')}
        ${card('Comedy, Laugh-O-Meter & Style Sync', `Language Style Matching (LSM): <strong>${fun.lsm_score_pct ?? 'n/a'}%</strong> cognitive synchrony`,
          legend +
          vsCustom('Total comedy points (laughs + tease reactions)', s => hu[s]?.comedy_points ?? (hu[s]?.laughs_triggered || 0)) +
          vsCustom('Made the other person laugh', s => hu[s]?.laughs_triggered || 0) +
          vsCustom('Landed a playful tease (huff / reaction)', s => hu[s]?.tease_reactions_triggered || 0) +
          vsCustom('Total laugh messages sent', s => hu[s]?.laughs_sent || 0), '', 'smile')}
        ${card('Guess Who Said It?', '10-round interactive quiz sampled from clean memorable lines in this chat', `<div id="quiz-mount"></div>`, 'wide')}
      </div>`)}
  `;

  // Wire up Longest Message Expanders
  $$('[data-expand-msg]').forEach(btn => {
    btn.onclick = () => {
      const box = $('#' + btn.dataset.expandMsg);
      if (!box) return;
      const expanded = box.classList.toggle('expanded');
      btn.textContent = expanded ? 'Collapse message' : 'Expand full message';
    };
  });

  // Initialize Interactive Quiz & Wrapped
  initQuiz(fun.quiz_pool || [], S, senderColor);
  initWrapped(d, S, F);

  const stateEl = $('#state');
  if (stateEl) { stateEl.hidden = true; stateEl.style.display = 'none'; }
  applyBlurState();
  initMotion();
}

// ===== INTERACTIVE QUIZ =====
function initQuiz(pool, senders, senderColor) {
  const mount = $('#quiz-mount');
  if (!mount) return;
  if (!pool || pool.length < 4 || senders.length < 2) {
    mount.innerHTML = '<p class="text-muted">Not enough distinct multi-word quotes to build a quiz for this chat.</p>';
    return;
  }

  const shufflePool = arr => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = a[i]; a[i] = a[j]; a[j] = tmp;
    }
    return a;
  };
  const usedTexts = new Set();
  let rounds = [], idx = 0, score = 0, answered = false;
  const startQuiz = () => {
    const targetCount = Math.min(10, pool.length);
    let avail = pool.filter(q => !usedTexts.has(q.text));
    if (avail.length < targetCount) {
      usedTexts.clear();
      avail = pool;
    }
    rounds = shufflePool(avail).slice(0, targetCount);
    rounds.forEach(q => usedTexts.add(q.text));
    idx = 0; score = 0; answered = false;
    draw();
  };

  const draw = () => {
    if (idx >= rounds.length) {
      mount.innerHTML = `
        <div class="quiz-box" style="text-align:center">
          <h3>Quiz Complete</h3>
          <p class="wrapped-big" style="margin:8px 0">${score} / ${rounds.length}</p>
          <p class="text-muted" style="margin-bottom:16px">${score >= 8 ? 'Telepathic connection. You know their voice cold.' : score >= 5 ? 'Solid instincts.' : 'Time for another late-night chat.'}</p>
          <button type="button" class="btn btn-primary" id="quiz-restart">Play Again</button>
        </div>`;
      $('#quiz-restart').onclick = startQuiz;
      return;
    }
    const q = rounds[idx];
    mount.innerHTML = `
      <div class="quiz-box">
        <div class="quiz-head"><span>Round ${idx + 1} of ${rounds.length} · ${esc(q.date_display)}</span><span>Score: <strong>${score}</strong></span></div>
        <div class="quiz-quote">“${esc(q.text)}”</div>
        <div class="quiz-choices">
          ${senders.slice(0, 2).map((s, i) => `<button type="button" class="btn btn-secondary quiz-pick" data-s="${esc(s)}"><i class="dot" style="--k:${C(i)}"></i>${esc(s)}</button>`).join('')}
        </div>
        <div class="quiz-feedback" id="quiz-fb"></div>
      </div>`;
    $$('.quiz-pick').forEach(btn => {
      btn.onclick = () => {
        if (answered) return;
        answered = true;
        const ok = btn.dataset.s === q.sender;
        if (ok) score++;
        const fb = $('#quiz-fb');
        const nextLbl = idx + 1 === rounds.length ? 'Finish' : 'Next';
        fb.innerHTML = (ok
          ? `<span style="color:var(--c0)">Correct.</span>`
          : `<span style="color:var(--c3)">Incorrect — it was <strong style="color:${senderColor(q.sender)}">${esc(q.sender)}</strong>.</span>`) +
          `<button type="button" class="btn btn-primary" id="quiz-next">${nextLbl}${icon('chevron-right')}</button>`;
        $('#quiz-next').onclick = () => { idx++; answered = false; draw(); };
      };
    });
  };
  startQuiz();
}

// ===== WRAPPED STORY REEL =====
function initWrapped(d, S, F) {
  const modal = $('#wrapped-modal'), stage = $('#wrapped-stage'), dots = $('#wrapped-dots'), counter = $('#wrapped-counter');
  if (!modal || !stage) return;
  const O = d.overview || {}, fa = d.discourse?.flirt_analysis || {}, ap = d.apologies || {}, fun = d.fun || {}, lm = d.longest_messages?.overall;
  const ovD = d.discourse?.overall_pct || {};

  const slides = [
    {
      kicker: 'Your Story Together',
      title: S.length >= 2 ? `${esc(F(S[0]))} & ${esc(F(S[1]))}` : esc(S[0] || 'Your Chat'),
      big: `${nf(O.total_messages)} Messages`,
      sub: `Across ${O.active_days || 0} active days · ${nf(O.total_conversations)} conversations ended with "Bye+"`,
    },
    {
      kicker: 'Your Vibe Formula',
      title: `${ovD.flirting || 0}% Flirting · ${ovD.teasing || 0}% Teasing`,
      big: `${fun.lsm_score_pct ?? '—'}% Style Sync`,
      sub: `${ovD.normal || 0}% Normal Talk · ${ovD.facts_info || 0}% Facts/Info · ${ovD.arguments || 0}% Arguments`,
    },
    {
      kicker: 'The Flirt Championship',
      title: `Best Flirt: ${esc(fa.best_flirt_winner || 'n/a')}`,
      big: `${fa.per_sender?.[fa.best_flirt_winner]?.best_score || 0} / 100 Rizz`,
      sub: `Most Flirtatious: ${esc(fa.most_flirt_winner || 'n/a')} (${nf(fa.per_sender?.[fa.most_flirt_winner]?.count)} flirting lines)`,
    },
    {
      kicker: 'Chief Peacekeeper',
      title: `Who Says "Sorry" First`,
      big: esc(F(ap.sorry_first_leader || 'n/a')),
      sub: `Broke the ice ${nf(ap.per_sender?.[ap.sorry_first_leader]?.said_sorry_first)} times across ${nf(ap.total_episodes)} apology episodes`,
    },
    {
      kicker: 'Word Contagion & Longest Text',
      title: fun.contagion?.[0] ? `"${esc(fun.contagion[0].token)}" came from ${esc(F(fun.contagion[0].originator))}` : 'Monumental Essay Record',
      big: lm ? `${nf(lm.words)} Words` : `${O.longest_daily_streak || 0} Days`,
      sub: lm ? `${esc(F(lm.sender))} wrote the longest text on ${esc(lm.date_display)}` : 'Longest daily streak',
    },
    {
      kicker: 'Peak Rhythm',
      title: `${hh(O.peak_hour)}:00 on ${O.peak_weekday || ''}s`,
      big: `${Math.round(O.total_chat_hours || 0).toLocaleString()} Hours`,
      sub: `Of live active chatting together · ${O.longest_daily_streak || 0}-day best streak`,
    },
  ];

  let cur = 0;
  const renderSlide = () => {
    const sl = slides[cur];
    dots.innerHTML = slides.map((_, i) => `<span class="${i <= cur ? 'active' : ''}"></span>`).join('');
    stage.innerHTML = `<div class="slide-in"><span class="eyebrow">${sl.kicker}</span><h2>${sl.title}</h2><div class="wrapped-big">${sl.big}</div><p class="text-muted">${sl.sub}</p></div>`;
    counter.textContent = `${cur + 1} / ${slides.length}`;
    $('#wrapped-prev').disabled = cur === 0;
    $('#wrapped-next').textContent = cur === slides.length - 1 ? 'Done' : 'Next';
  };

  $('#wrapped-btn').onclick = () => { cur = 0; modal.hidden = false; renderSlide(); };
  $('#wrapped-close').onclick = () => { modal.hidden = true; };
  $('#wrapped-prev').onclick = () => { if (cur > 0) { cur--; renderSlide(); } };
  $('#wrapped-next').onclick = () => { if (cur < slides.length - 1) { cur++; renderSlide(); } else modal.hidden = true; };
}

// ===== MANDATORY ALWAYS-BLURRED SECURE HTML EXPORT =====
async function sanitizeAndProtectSummary(rawSummary, mode, key, alsoBlurIntimacy) {
  const clone = JSON.parse(JSON.stringify(rawSummary));
  const REDACTED = '████████ ██████ ████ [Sensitive content blurred on export]';

  const protectObjField = async (obj, field, forceSensitive = false) => {
    if (!obj || obj[field] == null) return;
    const isSens = Boolean(obj.sensitive) || forceSensitive;
    if (!isSens) return;
    obj.sensitive = true;
    if (mode === 'redacted') {
      obj[field] = REDACTED;
    } else if (mode === 'encrypted' && key) {
      obj[field] = await encryptString(key, obj[field]);
    }
  };

  if (clone.longest_messages?.overall) await protectObjField(clone.longest_messages.overall, 'text', alsoBlurIntimacy);
  if (clone.longest_messages?.meaningful_overall) await protectObjField(clone.longest_messages.meaningful_overall, 'text', alsoBlurIntimacy);
  for (const s of Object.keys(clone.longest_messages?.per_sender || {})) {
    await protectObjField(clone.longest_messages.per_sender[s], 'text', alsoBlurIntimacy);
  }
  for (const nk of clone.intimacy?.nicknames || []) {
    await protectObjField(nk, 'term', alsoBlurIntimacy);
    await protectObjField(nk, 'first_quote', alsoBlurIntimacy);
  }
  for (const sc of Object.values(clone.intimacy?.sensory_and_physical_cues || {})) {
    if (sc?.first_unlock) await protectObjField(sc.first_unlock, 'quote', alsoBlurIntimacy);
  }
  for (const ev of clone.intimacy?.escalations || []) {
    await protectObjField(ev, 'quote', alsoBlurIntimacy || ev.tier >= 3);
  }
  for (const fp of Object.values(clone.discourse?.flirt_analysis?.per_sender || {})) {
    for (const hl of fp?.highlights || []) await protectObjField(hl, 'text', alsoBlurIntimacy);
  }
  for (const pr of Object.values(clone.photo_requests || {})) {
    for (const smp of pr?.samples || []) await protectObjField(smp, 'text', alsoBlurIntimacy);
  }
  return clone;
}

async function performSecureExport(mode, passphrase, alsoBlurIntimacy) {
  const btn = $('#export-confirm');
  const origTxt = btn.textContent;
  btn.disabled = true;
  btn.textContent = 'Securing & bundling...';

  try {
    const summaryData = cachedSummary;
    const dailyCSVText = cachedDailyCSV || '';
    if (!summaryData) throw new Error('No analysis loaded yet.');

    let key = null, saltB64 = null;
    if (mode === 'encrypted') {
      const salt = crypto.getRandomValues(new Uint8Array(16));
      saltB64 = b64encode(salt);
      key = await deriveAesKey(passphrase, salt, 310000);
    }

    const protectedSummary = await sanitizeAndProtectSummary(summaryData, mode, key, alsoBlurIntimacy);
    const policy = mode === 'encrypted' ? 'encrypted_always_blurred' : 'redacted_always_blurred';

    let cssText = '';
    try { const r = await fetch('style.css', { cache: 'no-store' }); if (r.ok) cssText = await r.text(); } catch (_) {}
    if (!cssText) {
      for (const sheet of document.styleSheets) {
        try { cssText += Array.from(sheet.cssRules || []).map(r => r.cssText).join('\n') + '\n'; } catch (_) {}
      }
    }

    let workerJs = '', appJs = '';
    try { const r = await fetch('analyzer.worker.js', { cache: 'no-store' }); if (r.ok) workerJs = await r.text(); } catch (_) {}
    try { const r = await fetch('app.js', { cache: 'no-store' }); if (r.ok) appJs = await r.text(); } catch (_) {}

    const safeJson = obj => JSON.stringify(obj).replace(/</g, '\\u003c');
    const embeddedObj = {
      summary: protectedSummary,
      dailyCSV: dailyCSVText,
      exportPolicy: policy,
      cryptoMeta: saltB64 ? { salt: saltB64, iter: 310000 } : null,
    };

    const headerHTML = document.querySelector('header.navbar').outerHTML
      .replace('src="whatsapp icon.png"', `src="data:image/png;base64,${WA_ICON_B64}"`)
      .replace('class="navbar scrolled"', 'class="navbar"');

    const ensureHiddenModal = sel => {
      const el = document.querySelector(sel);
      if (!el) return '';
      const clone = el.cloneNode(true);
      clone.hidden = true;
      return clone.outerHTML;
    };

    const standaloneHTML = `<!doctype html>
<html lang="en" data-theme="${esc(document.documentElement.dataset.theme || 'light')}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(document.title || 'WhatsApp Chat Analyzer')}</title>
<link rel="icon" type="image/png" href="data:image/png;base64,${WA_ICON_B64}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=DM+Mono:wght@400;500&display=swap">
<style>${cssText}</style>
</head>
<body class="blur-sensitive">
${headerHTML}
${document.querySelector('#drop-overlay').outerHTML}
${ensureHiddenModal('#wrapped-modal')}
${ensureHiddenModal('#export-modal')}
${ensureHiddenModal('#unlock-modal')}
<main class="main-container" role="main">
  <div id="state" class="card state-card" style="display:none"></div>
  <div id="out"></div>
  <footer class="footer">
    <div class="footer-inner">
      <div class="footer-left">
        <span class="footer-icon">${icon('shield')}</span>
        <div>
          <strong>Privacy assured · standalone always-blurred report</strong>
          <p>Sensitive lines are ${mode === 'encrypted' ? 'AES-256-GCM encrypted' : 'permanently redacted'} inside this file.</p>
        </div>
      </div>
      <div class="footer-meta">Generated in your browser</div>
    </div>
  </footer>
</main>
<script>window.__EMBEDDED_DATA__ = ${safeJson(embeddedObj)};<\/script>
<script>${workerJs.replace(/<\/script>/gi, '<\\/script>')}<\/script>
<script>${appJs.replace(/<\/script>/gi, '<\\/script>')}<\/script>
</body>
</html>`;

    const blob = new Blob([standaloneHTML], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `whatsapp-chat-analysis-blurred-${new Date().toISOString().slice(0, 10)}.html`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    $('#export-modal').hidden = true;
  } finally {
    btn.disabled = false;
    btn.textContent = origTxt;
  }
}

// ===== WEB WORKER + FILE HANDLING =====
function runClientAnalyzer(text) {
  return new Promise((resolve, reject) => {
    if (typeof Worker !== 'undefined' && location.protocol !== 'file:' && !window.__EMBEDDED_DATA__) {
      try {
        const w = new Worker('analyzer.worker.js');
        w.onmessage = ev => {
          const msg = ev.data || {};
          if (msg.type === 'progress') showProgress(msg.pct, msg.label);
          else if (msg.type === 'result') { w.terminate(); resolve(msg); }
          else if (msg.type === 'error') { w.terminate(); reject(new Error(msg.error)); }
        };
        w.onerror = () => {
          w.terminate();
          if (window.WhatsAppAnalyzerEngine) {
            window.WhatsAppAnalyzerEngine.analyzeChatText(text, { useNeuralAI }, showProgress).then(resolve, reject);
          } else reject(new Error('Analyzer worker failed.'));
        };
        w.postMessage({ type: 'analyze', text, opts: { useNeuralAI } });
        return;
      } catch (_) {}
    }
    if (window.WhatsAppAnalyzerEngine) {
      window.WhatsAppAnalyzerEngine.analyzeChatText(text, { useNeuralAI }, showProgress).then(resolve, reject);
    } else {
      reject(new Error('Client analyzer engine not loaded.'));
    }
  });
}

async function handleChatTextData(text, name = 'chat.txt') {
  showProgress(5, `Preparing ${name}...`);
  try {
    const result = await runClientAnalyzer(text);
    cachedSummary = result.summary;
    cachedDailyCSV = result.dailyCSV || '';
    exportPolicy = 'live';
    unlockedCache.clear();
    render(cachedSummary, csvDaily(cachedDailyCSV));
  } catch (err) {
    console.error('Analysis failed:', err);
    note(`<h3>Could Not Analyze Chat</h3><p>${esc(err.message)}</p><button class="btn btn-primary" onclick="$('#file-input').click()" style="margin-top:8px">Try Another File</button>`, true);
  }
}

async function handleChatFileUpload(file) {
  if (!file) return;
  try {
    const text = await file.text();
    await handleChatTextData(text, file.name);
  } catch (err) {
    note(`Could not read file: ${esc(err.message)}`, true);
  }
}

async function load() {
  showProgress(15, 'Loading chat analysis...');
  if (window.__EMBEDDED_DATA__ && window.__EMBEDDED_DATA__.summary) {
    cachedSummary = window.__EMBEDDED_DATA__.summary;
    cachedDailyCSV = window.__EMBEDDED_DATA__.dailyCSV || '';
    exportPolicy = window.__EMBEDDED_DATA__.exportPolicy || 'encrypted_always_blurred';
    blurSensitive = true;
    render(cachedSummary, csvDaily(cachedDailyCSV));
    return;
  }
  const fetchFirst = async (urls, opts) => {
    for (const u of urls) {
      try { const r = await fetch(u, opts); if (r && r.ok) return r; } catch (_) {}
    }
    return null;
  };
  try {
    const sResp = await fetchFirst(['chat_analysis_output/summary.json', '../chat_analysis_output/summary.json'], { cache: 'no-store' });
    if (!sResp) throw new Error('No pre-computed summary');
    cachedSummary = await sResp.json();
    const dResp = await fetchFirst(['chat_analysis_output/daily.csv', '../chat_analysis_output/daily.csv'], { cache: 'no-store' });
    let dl = null;
    if (dResp) { cachedDailyCSV = await dResp.text(); dl = csvDaily(cachedDailyCSV); }
    render(cachedSummary, dl);
  } catch (_) {
    const out = $('#out');
    if (out) out.innerHTML = '';
    note(`
      <div class="note-icon">${icon('upload')}</div>
      <h3>Ready to Analyze Your WhatsApp Chat</h3>
      <p>Upload or drag &amp; drop any WhatsApp <code>.txt</code> export. Everything runs 100% inside your browser.</p>
      <button type="button" class="btn btn-primary" onclick="$('#file-input').click()">Upload Chat (.txt)</button>
      <span class="note-hint">or drop a .txt anywhere · or paste chat text</span>`, false);
  }
}

// ===== EVENT LISTENERS =====
initTheme();
applyBlurState();

if ($('#theme-toggle')) $('#theme-toggle').onclick = toggleTheme;

const aiBtn = $('#ai-toggle');
if (aiBtn) {
  aiBtn.onclick = () => {
    useNeuralAI = !useNeuralAI;
    aiBtn.classList.toggle('active', useNeuralAI);
    aiBtn.setAttribute('aria-pressed', String(useNeuralAI));
    aiBtn.textContent = useNeuralAI ? 'AI Boost' : 'Fast Mode';
  };
}

const blurBtn = $('#blur-toggle');
if (blurBtn) {
  blurBtn.onclick = () => {
    if (exportPolicy === 'redacted_always_blurred') return;
    if (exportPolicy === 'encrypted_always_blurred' && blurSensitive && unlockedCache.size === 0) {
      $('#unlock-modal').hidden = false;
      return;
    }
    blurSensitive = !blurSensitive;
    if (blurSensitive) $$('.sensitive-quote.revealed, .blur-card.revealed').forEach(el => el.classList.remove('revealed'));
    applyBlurState();
    if (exportPolicy === 'encrypted_always_blurred' && unlockedCache.size > 0) render(cachedSummary, csvDaily(cachedDailyCSV));
  };
}

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    if ($('#wrapped-modal')) $('#wrapped-modal').hidden = true;
    if ($('#export-modal')) $('#export-modal').hidden = true;
    if ($('#unlock-modal')) $('#unlock-modal').hidden = true;
  }
});

// Click-to-reveal / unlock sensitive quotes inside #out
document.addEventListener('click', e => {
  const unlockTrig = e.target.closest('[data-unlock-trigger], [data-enc-key]');
  if (unlockTrig && exportPolicy === 'encrypted_always_blurred') {
    $('#unlock-modal').hidden = false;
    return;
  }
  if (e.target.closest('[data-expand-msg]')) return;
  const cardTrig = e.target.closest('[data-reveal-card]');
  if (cardTrig && exportPolicy === 'live' && blurSensitive) {
    const blurCard = cardTrig.closest('.blur-card');
    if (blurCard && !blurCard.classList.contains('locked-blur')) {
      blurCard.classList.toggle('revealed');
      return;
    }
  }
  const revTrig = e.target.closest('[data-reveal-toggle], .sensitive-quote.clickable');
  if (revTrig && exportPolicy === 'live') {
    const cardWrap = revTrig.classList.contains('sensitive-quote') ? revTrig : revTrig.previousElementSibling;
    if (cardWrap && cardWrap.classList.contains('sensitive-quote')) cardWrap.classList.toggle('revealed');
  }
});

// Export Modal Controls
if ($('#export')) {
  $('#export').onclick = () => {
    if (!cachedSummary) return;
    $('#export-error').hidden = true;
    $('#export-passphrase').value = '';
    $('#export-modal').hidden = false;
  };
}
if ($('#export-close')) $('#export-close').onclick = () => { $('#export-modal').hidden = true; };
if ($('#export-cancel')) $('#export-cancel').onclick = () => { $('#export-modal').hidden = true; };
$$('input[name="export-mode"]').forEach(r => {
  r.onchange = () => {
    $$('.export-opt').forEach(o => o.classList.remove('selected'));
    r.closest('.export-opt').classList.add('selected');
    $('#export-pass-wrap').hidden = r.value !== 'encrypted';
  };
});
if ($('#export-confirm')) {
  $('#export-confirm').onclick = async () => {
    const mode = $('input[name="export-mode"]:checked').value;
    const pass = $('#export-passphrase').value;
    const errEl = $('#export-error');
    if (mode === 'encrypted' && pass.length < 4) {
      errEl.textContent = 'Please enter a passphrase of at least 4 characters.';
      errEl.hidden = false;
      return;
    }
    errEl.hidden = true;
    await performSecureExport(mode, pass, $('#export-blur-intimacy').checked);
  };
}

// Unlock Modal Controls (for AES-256-GCM exported reports)
if ($('#unlock-close')) $('#unlock-close').onclick = () => { $('#unlock-modal').hidden = true; };
if ($('#unlock-cancel')) $('#unlock-cancel').onclick = () => { $('#unlock-modal').hidden = true; };
if ($('#unlock-confirm')) {
  $('#unlock-confirm').onclick = async () => {
    const pass = $('#unlock-passphrase').value;
    const errEl = $('#unlock-error');
    const meta = window.__EMBEDDED_DATA__?.cryptoMeta;
    if (!meta || !pass) return;
    try {
      const key = await deriveAesKey(pass, b64decode(meta.salt), meta.iter || 310000);
      const walkDecrypt = async node => {
        if (!node || typeof node !== 'object') return;
        if (Array.isArray(node)) { for (const x of node) await walkDecrypt(x); return; }
        for (const [, v] of Object.entries(node)) {
          if (v && typeof v === 'object' && v.__enc) {
            const pt = await decryptString(key, v);
            unlockedCache.set(v.ct.slice(0, 24), pt);
          } else if (v && typeof v === 'object') {
            await walkDecrypt(v);
          }
        }
      };
      await walkDecrypt(cachedSummary);
      errEl.hidden = true;
      $('#unlock-modal').hidden = true;
      blurSensitive = false;
      render(cachedSummary, csvDaily(cachedDailyCSV));
    } catch (_) {
      errEl.textContent = 'Incorrect passphrase. Unable to decrypt.';
      errEl.hidden = false;
    }
  };
}

const uploadBtn = $('#upload-btn'), fileInput = $('#file-input');
if (uploadBtn && fileInput) {
  uploadBtn.onclick = () => fileInput.click();
  fileInput.onchange = e => {
    const file = e.target.files?.[0];
    if (file) handleChatFileUpload(file);
    fileInput.value = '';
  };
}

const dropOverlay = $('#drop-overlay');
window.addEventListener('dragover', e => { e.preventDefault(); if (dropOverlay) dropOverlay.classList.add('active'); });
window.addEventListener('dragleave', e => { if (e.relatedTarget === null && dropOverlay) dropOverlay.classList.remove('active'); });
window.addEventListener('drop', e => {
  e.preventDefault();
  if (dropOverlay) dropOverlay.classList.remove('active');
  const files = e.dataTransfer?.files;
  if (files?.length) handleChatFileUpload(files[0]);
});
window.addEventListener('paste', e => {
  if (document.activeElement && document.activeElement.tagName === 'INPUT') return;
  const cf = e.clipboardData?.files;
  if (cf?.length) { handleChatFileUpload(cf[0]); return; }
  const pt = e.clipboardData?.getData('text');
  if (pt && pt.trim().length > 20) handleChatTextData(pt, 'pasted_chat.txt');
});

load();
