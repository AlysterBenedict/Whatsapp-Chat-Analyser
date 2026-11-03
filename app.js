const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);
const C = i => `var(--c${i % 4})`;
const nf = n => (n == null ? '0' : Math.round(n).toLocaleString());
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
}[c]));
const sh = n => (n >= 1e4 ? Math.round(n / 1e3) + 'k' : n >= 1e3 ? (n / 1e3).toFixed(1) + 'k' : Math.round(n) + '');
const dur = s => (s == null ? 'n/a' : s < 60 ? Math.round(s) + 's' : s < 3600 ? (s / 60).toFixed(1) + ' min' : (s / 3600).toFixed(1) + ' h');
const hh = h => String(h).padStart(2, '0');
const MN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const mlab = k => (!k || k.length < 7 ? (k || '') : MN[+k.slice(5, 7) - 1] + ' ' + k.slice(2, 4));
const WD = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const BK = ['Same minute', '1-5 min', '5-15 min', '15-60 min', '1 h or more'];
const sum = a => (Array.isArray(a) ? a.reduce((x, y) => x + y, 0) : 0);

// WhatsApp Icon as Base64 for fully self-contained HTML export
const WA_ICON_B64 = "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";

// Global data cache for export
let cachedSummary = null;
let cachedDailyCSV = null;

// ===== THEME TOGGLE =====
function initTheme() {
  const html = document.documentElement;
  const saved = localStorage.getItem('theme');
  // Default to light mode until explicitly changed by the user toggle
  const isDark = saved === 'dark';
  html.dataset.theme = isDark ? 'dark' : 'light';
  updateThemeIcons(isDark);
}

function toggleTheme() {
  const html = document.documentElement;
  const isDark = html.dataset.theme === 'dark';
  const newTheme = isDark ? 'light' : 'dark';
  html.dataset.theme = newTheme;
  localStorage.setItem('theme', newTheme);
  updateThemeIcons(newTheme === 'dark');
}

function updateThemeIcons(isDark) {
  const sun = $('.icon-sun');
  const moon = $('.icon-moon');
  if (sun && moon) {
    sun.style.display = isDark ? 'block' : 'none';
    moon.style.display = isDark ? 'none' : 'block';
  }
}

function note(htmlContent, isError = false) {
  const s = $('#state');
  if (!s) return;
  s.innerHTML = `
    <div class="note-box ${isError ? 'note-error' : ''}">
      ${htmlContent}
    </div>`;
  s.hidden = false;
  s.style.display = 'flex';
}

// ===== SVG CHARTS =====
function bars(labels, series, o = {}) {
  const W = 640, H = o.h || 210, m = { l: 42, r: 12, t: 12, b: 24 };
  const w = W - m.l - m.r, ih = H - m.t - m.b;
  const n = labels.length, k = o.stack ? 1 : series.length;
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
      g += `<rect class="bar" x="${x}" y="${y}" width="${o.stack ? st * 0.8 : bw}" height="${bh}" rx="3" fill="${s.color}">` +
           `<title>${esc(l)}, ${esc(s.name)}: ${nf(v)}${o.u || ''}</title></rect>`;
      base += v;
    });
    if (i % (o.every || 1) === 0) {
      g += `<text class="ax" x="${m.l + i * st + st / 2}" y="${H - 6}" text-anchor="middle">${esc(l)}</text>`;
    }
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

  g += `<polygon points="${m.l},${m.t + ih} ${pts(vals)} ${X(n - 1)},${m.t + ih}" fill="var(--c1)" opacity=".2"/>` +
       `<polyline points="${pts(avg)}" fill="none" stroke="var(--c0)" stroke-width="2.4" stroke-linejoin="round"/>`;

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
      g += `<rect class="heat-cell" x="${l + x * cw + 1}" y="${4 + d * ch + 1}" width="${cw - 2}" height="${ch - 2}" rx="4" fill="var(--c0)" fill-opacity="${0.08 + 0.92 * Math.sqrt(v / mx)}">` +
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

  const U = d => {
    const [a, b, c] = d.split('-').map(Number);
    return Date.UTC(a, b - 1, c);
  };
  const days = [], vals = [];
  for (let t = U(ds[0]); t <= U(ds[ds.length - 1]); t += 864e5) {
    const k = new Date(t).toISOString().slice(0, 10);
    days.push(k);
    vals.push(m.get(k) || 0);
  }
  return { days, vals };
}

// ===== RENDER DASHBOARD =====
function render(d, daily) {
  if (!d) return;
  const S = d.senders || [];
  const P = d.per_sender || {};
  const O = d.overview || {};
  const N = S.length;
  const TM = O.total_messages || 1;
  const F = s => (s ? s.split(' ')[0] : '');

  // Formulate title text dynamically from chat participants
  let titleText = 'Whatsapp Chat analyzer';
  if (N === 2) {
    titleText = `${F(S[0])} & ${F(S[1])}`;
  } else if (N > 2) {
    titleText = S.map(F).slice(0, 3).join(', ') + (N > 3 ? ` +${N - 3}` : '');
  } else if (N === 1) {
    titleText = F(S[0]);
  }

  const titleEl = $('#title');
  if (titleEl) titleEl.textContent = 'Whatsapp Chat Analyzer';
  document.title = titleText ? `${titleText} — Whatsapp Chat Analyzer` : 'Whatsapp Chat Analyzer';

  const heroTitle = N === 2 
    ? `${esc(F(S[0]))} &amp; ${esc(F(S[1]))}` 
    : (N > 2 ? esc(S.map(F).join(', ')) : (N === 1 ? esc(F(S[0])) : 'Your chat'));

  const sec = (id, t, s, b) => `
    <section class="s" id="${id}">
      <div class="sh">
        <h2>${t}</h2>
        <p>${s}</p>
      </div>
      ${b}
    </section>`;

  const card = (t, s, b, c = '') => `
    <div class="card glass ${c}">
      <h2>${t}</h2>
      ${s ? `<p>${s}</p>` : ''}
      ${b}
    </div>`;

  const legend = `
    <div class="legend">
      ${S.map((s, i) => `<span style="--k:${C(i)}">${esc(s)}</span>`).join('')}
    </div>`;

  const ser = f => S.map((s, i) => ({ name: s, color: C(i), vals: f(s) }));

  const vs = (l, f, fmt = nf) => {
    const v = S.map(s => f(P[s]) || 0);
    const t = sum(v) || 1;
    return `
      <div class="vs">
        <div class="vl">${l}</div>
        <div class="vb">
          ${v.map((x, i) => `<i style="width:${(x / t) * 100}%;background:${C(i)}" title="${esc(S[i])}: ${fmt(x)}"></i>`).join('')}
        </div>
        <div class="vn">
          ${v.map((x, i) => `<b style="color:${C(i)}">${fmt(x)} <small>${Math.round((x / t) * 100)}%</small></b>`).join('')}
        </div>
      </div>`;
  };

  const lead = f => S.map(s => [s, f(P[s]) || 0]).sort((a, b) => b[1] - a[1])[0] || [S[0] || '', 0];
  const med = r => (r ? (r.after_pause_median ?? r.median) : null);
  const tw = sum(S.map(s => P[s]?.words || 0));
  const late = sum(S.map(s => P[s]?.late_night || 0));
  const months = Object.keys(d.monthly_total || {});
  const wk = sum(S.map(s => P[s]?.starts || 0));
  const lw = lead(p => p?.words);
  const ls = lead(p => p?.starts);
  const la = lead(p => p?.avg_words_per_msg);
  const rp = S.filter(s => P[s]?.reply && med(P[s].reply) != null)
              .sort((a, b) => med(P[a].reply) - med(P[b].reply));

  const story = [];
  if (lw && tw) story.push(`<strong>${esc(F(lw[0]))}</strong> wrote ${Math.round((lw[1] / tw) * 100)}% of all the words.`);
  if (N > 1 && la && la[1]) story.push(`<strong>${esc(F(la[0]))}</strong> sends the longer messages, ${la[1].toFixed(1)} words on average.`);
  if (wk && ls) story.push(`<strong>${esc(F(ls[0]))}</strong> starts ${Math.round((ls[1] / wk) * 100)}% of conversations after a quiet spell.`);
  if (rp.length > 1 && P[rp[0]]?.reply) story.push(`After a pause, <strong>${esc(F(rp[0]))}</strong> replies first, usually within ${dur(med(P[rp[0]].reply))}.`);
  story.push(`${Math.round((late / TM) * 100)}% of messages were sent between midnight and 5 am.`);
  story.push(`Busiest hour: <strong>${hh(O.peak_hour)}:00</strong>. Busiest day of the week: <strong>${O.peak_weekday}</strong>.`);

  const words = S.map((s, i) => {
    const t = P[s]?.top_words || [];
    const m = t[0] ? t[0][1] : 1;
    const topEmojis = P[s]?.top_emojis || [];
    return `
      <div>
        <b style="color:${C(i)}">${esc(s)}</b>
        ${t.slice(0, 12).map(([w, c]) => `
          <div class="w">
            <span>${esc(w)}</span>
            <u style="width:${(c / m) * 100}%;background:${C(i)}"></u>
            <em>${sh(c)}</em>
          </div>`).join('')}
        <div class="chips">
          ${topEmojis.slice(0, 10).map(([e, c]) => `<span>${e}<small>${sh(c)}</small></span>`).join('')}
        </div>
      </div>`;
  }).join('');

  const rr = (l, f) => `
    <tr>
      <td>${l}</td>
      ${S.map(s => `<td>${f(P[s]?.reply || {})}</td>`).join('')}
    </tr>`;

  const kp = [
    [nf(TM), 'messages'],
    [nf(O.total_words), 'words'],
    [nf(O.messages_per_day), 'messages a day'],
    [(O.active_days || 0) + ' of ' + (O.span_days || 0), 'days with messages'],
    [(O.longest_daily_streak || 0) + ' days', 'longest streak'],
    [hh(O.peak_hour) + ':00', 'peak hour']
  ];

  const out = $('#out');
  if (!out) return;

  out.innerHTML = `
    <section id="overview">
      <div class="hero glass">
        <h1>${heroTitle}</h1>
        <p class="lede">${O.span_days || 0} days of talking, ${O.first_message ? O.first_message.slice(0, 10) : ''} to ${O.last_message ? O.last_message.slice(0, 10) : ''}.</p>
        <div class="split">
          ${S.map((s, i) => `<i style="width:${(P[s].messages / TM) * 100}%;background:${C(i)}"></i>`).join('')}
        </div>
        <div class="row2">
          ${S.map((s, i) => `<span style="color:${C(i)}">${esc(F(s))}: ${nf(P[s].messages)} messages (${Math.round((P[s].messages / TM) * 100)}%)</span>`).join('')}
        </div>
      </div>

      <div class="kpis">
        ${kp.map(([a, b]) => `<div class="kpi glass"><div class="big">${a}</div><small>${b}</small></div>`).join('')}
      </div>

      <div class="grid">
        ${card('The short version', 'What stands out', `<ul>${story.map(x => `<li>${x}</li>`).join('')}</ul>`, 'story')}
        ${card('Side by side', 'Share of each total', legend +
          vs('Messages', p => p.messages) +
          vs('Words', p => p.words) +
          vs('Words per message', p => p.avg_words_per_msg, x => x.toFixed(1)) +
          vs('Emojis', p => p.emojis_total) +
          vs('Questions asked', p => p.questions) +
          vs('Media sent', p => p.media) +
          vs('Messages between midnight and 5 am', p => p.late_night))}
      </div>
    </section>

    ${sec('rhythm', 'When you talk', 'The hours, days and months your chat lives in', `
      <div class="grid">
        ${card('Hour by hour', 'Messages by hour of day', legend + bars([...Array(24).keys()].map(hh), ser(s => d.hourly[s] || []), { every: 3 }), 'wide')}
        ${d.heatmap ? card('Weekly pattern', 'Darker means busier', heat(d.heatmap), 'wide') : ''}
        ${daily ? card('Every day', 'Daily messages with 7-day rolling average', timeline(daily.days, daily.vals), 'wide') : ''}
        ${card('Month by month', 'Messages per month', legend + bars(months.map(mlab), ser(s => months.map(m => (d.monthly && d.monthly[s] && d.monthly[s][m]) || 0)), { stack: 1, every: Math.max(1, Math.ceil(months.length / 12)) }))}
        ${card('Day of the week', 'Messages per weekday', legend + bars(WD, ser(s => d.weekday[s] || [])))}
      </div>`)}

    ${sec('replies', 'Replies and flow', 'How quickly you answer each other, and who keeps things going', `
      <div class="grid">
        ${card('How fast you reply', 'Share of replies by delay, within ' + (O.reply_cap_hours || 6) + ' hours',
          legend +
          ((P[S[0]]?.reply?.buckets) ? bars(BK, ser(s => P[s].reply.buckets), { u: '%' }) : '') +
          `<table>
            <tr>
              <th></th>
              ${S.map((s, i) => `<th style="color:${C(i)}">${esc(F(s))}</th>`).join('')}
            </tr>
            ${rr('Typical delay after a pause', r => dur(med(r)))}
            ${rr('Average delay after a pause', r => dur(r.after_pause_mean ?? r.mean))}
            ${rr('Slowest 10% take over', r => dur(r.after_pause_p90 ?? r.p90))}
            ${rr('Replied in the same minute', r => r.same_minute == null ? 'n/a' : Math.round(r.same_minute) + '%')}
          </table>`)}
        ${card('Who keeps it going', 'A new conversation starts after ' + (O.session_gap_hours || 6) + ' hours of silence',
          legend +
          vs('Conversations started', p => p.starts) +
          vs('Had the last word', p => p.ends) +
          vs('Messages in a row, on average', p => p.avg_burst, x => x.toFixed(2)) +
          vs('Longest run without a reply', p => p.longest_burst))}
      </div>`)}

    ${sec('words', 'Words and records', 'Favourite words, emojis and the biggest days', `
      <div class="grid">
        ${card('Favourite words and emojis', 'Most used, common stop words removed', `<div class="cols">${words}</div>`, 'wide')}
        ${card('Records', '', `
          <table>
            ${(d.top_days || []).map(([x, c], i) => `<tr><td>Busiest day${i ? ' #' + (i + 1) : ''}: ${x}</td><td>${nf(c)} messages</td></tr>`).join('')}
            <tr><td>Busiest month</td><td>${O.busiest_month ? mlab(O.busiest_month[0]) + ', ' + nf(O.busiest_month[1]) : 'n/a'}</td></tr>
            <tr><td>Longest daily streak</td><td>${O.longest_daily_streak || 0} days, ending ${O.streak_ended || 'n/a'}</td></tr>
            <tr><td>Longest silence</td><td>${O.longest_silence_days || 0} days</td></tr>
          </table>`)}
      </div>`)}
  `;

  const stateEl = $('#state');
  if (stateEl) {
    stateEl.hidden = true;
    stateEl.style.display = 'none';
  }
}

// ===== EXPORT FUNCTIONALITY =====
async function exportHTML() {
  const btn = $('#export');
  if (!btn) return;
  const originalHTML = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = `
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="spin">
      <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
    </svg> Preparing…`;

  try {
    let cssText = '';
    try {
      const cssResp = await fetch('style.css', { cache: 'no-store' });
      if (cssResp.ok) cssText = await cssResp.text();
    } catch (_) {}

    if (!cssText) {
      const styleSheets = Array.from(document.styleSheets);
      for (const sheet of styleSheets) {
        try {
          const rules = Array.from(sheet.cssRules || []).map(r => r.cssText).join('\n');
          cssText += rules + '\n';
        } catch (_) {}
      }
    }

    let summaryData = cachedSummary;
    let dailyCSVText = cachedDailyCSV;

    if (!summaryData) {
      const sResp = await fetchFirst(['chat_analysis_output/summary.json', '../chat_analysis_output/summary.json'], { cache: 'no-store' });
      if (sResp) summaryData = await sResp.json();
    }
    if (!dailyCSVText) {
      try {
        const dResp = await fetchFirst(['chat_analysis_output/daily.csv', '../chat_analysis_output/daily.csv'], { cache: 'no-store' });
        if (dResp) dailyCSVText = await dResp.text();
      } catch (_) {}
    }

    if (!summaryData) {
      throw new Error('No data available to export');
    }

    let jsCode = '';
    try {
      const jsResp = await fetch('app.js', { cache: 'no-store' });
      if (jsResp.ok) jsCode = await jsResp.text();
    } catch (_) {}

    const title = document.title || 'Whatsapp Chat Analyzer';

    const standaloneHTML = `<!doctype html>
<html lang="en" data-theme="${document.documentElement.dataset.theme || 'light'}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<link rel="icon" type="image/png" href="data:image/png;base64,${WA_ICON_B64}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap">
<style>
${cssText}
</style>
</head>
<body>
<!-- Solid Ribbon Block Navbar -->
<header class="navbar" role="banner">
  <div class="navbar-inner">
    <div class="navbar-brand" aria-label="Whatsapp Chat Analyzer">
      <img src="data:image/png;base64,${WA_ICON_B64}" alt="WhatsApp" class="brand-icon" width="28" height="28">
      <span id="title">Whatsapp Chat Analyzer</span>
    </div>
    <nav class="navbar-center" aria-label="Main navigation">
      <a href="#overview" class="nav-link">Overview</a>
      <a href="#rhythm" class="nav-link">Rhythm</a>
      <a href="#replies" class="nav-link">Replies</a>
      <a href="#words" class="nav-link">Words</a>
    </nav>
    <div class="navbar-actions">
      <input type="file" id="file-input" accept=".txt" style="display:none">
      <button id="upload-btn" class="btn btn-secondary" type="button" title="Upload WhatsApp chat .txt file">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
          <polyline points="17 8 12 3 7 8"></polyline>
          <line x1="12" y1="3" x2="12" y2="15"></line>
        </svg>
        Upload Chat
      </button>
      <button id="theme-toggle" class="btn btn-icon btn-ghost" aria-label="Toggle theme" title="Toggle theme">
        <svg class="icon-sun" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="display:none">
          <circle cx="12" cy="12" r="5"></circle>
          <line x1="12" y1="1" x2="12" y2="3"></line>
          <line x1="12" y1="21" x2="12" y2="23"></line>
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
          <line x1="1" y1="12" x2="3" y2="12"></line>
          <line x1="21" y1="12" x2="23" y2="12"></line>
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
        </svg>
        <svg class="icon-moon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
        </svg>
      </button>
    </div>
  </div>
</header>
<main class="main-container" role="main">
  <div id="state" class="loading-state glass" style="display:none"></div>
  <div id="out"></div>
  <footer class="footer">
    <p>Everything runs on your computer. Your chat never leaves it. Exported ${new Date().toLocaleDateString()}</p>
  </footer>
</main>
<script>
window.__EMBEDDED_DATA__ = {
  summary: ${JSON.stringify(summaryData)},
  dailyCSV: ${JSON.stringify(dailyCSVText || '')}
};
<\/script>
<script>
${jsCode}
<\/script>
</body>
</html>`;

    const blob = new Blob([standaloneHTML], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `whatsapp-chat-analysis-${new Date().toISOString().slice(0, 10)}.html`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);

    btn.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="20 6 9 17 4 12"></polyline>
      </svg> Exported!`;
    setTimeout(() => {
      btn.disabled = false;
      btn.innerHTML = originalHTML;
    }, 2000);
  } catch (err) {
    console.error('Export failed:', err);
    btn.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="15" y1="9" x2="9" y2="15"></line>
        <line x1="9" y1="9" x2="15" y2="15"></line>
      </svg> Failed`;
    setTimeout(() => {
      btn.disabled = false;
      btn.innerHTML = originalHTML;
    }, 2500);
  }
}

// Helper to try multiple candidate URLs (e.g. server path vs parent folder)
async function fetchFirst(urls, options) {
  for (const u of urls) {
    try {
      const res = await fetch(u, options);
      if (res && res.ok) return res;
    } catch (_) {}
  }
  return null;
}

// ===== CLIENT-SIDE WHATSAPP CHAT PARSER (OFFLINE / FALLBACK) =====
function parseClientWhatsApp(text) {
  const clean = text.replace(/[\u200e\u200f\u202a\u202b\u202c\u202d\u202e\ufeff]/g, '')
                    .replace(/[\u202f\u00a0\u1680\u2000-\u200a\u2028\u2029\u205f\u3000]/g, ' ')
                    .replace(/(\d{1,2}[:.]\d{2}(?:[:.]\d{2})?)\s*[\?\uFFFD]\s*([ap]\.?m\.?)/gi, '$1 $2');
  const lines = clean.split(/\r?\n/);
  const headerRe = /^\[?(\d{1,4}[/.\-]\d{1,2}[/.\-]\d{1,4}),?\s+(\d{1,2}[:.]\d{2}(?:[:.]\d{2})?)\s*([APap]\.?\s?[Mm]\.?)?(?:\]\s*|\s*-\s+)(.*)$/;

  const raw = [];
  let cur = null;
  for (const line of lines) {
    const m = line.match(headerRe);
    if (m) {
      const rest = m[4];
      if (/end-to-end encrypted/i.test(rest)) {
        cur = null;
        continue;
      }
      let sender = null;
      let body = rest;
      const idx = rest.indexOf(': ');
      if (idx !== -1 && idx <= 60) {
        sender = rest.slice(0, idx).trim();
        body = rest.slice(idx + 2);
      }
      if (sender) {
        cur = { d: m[1], t: m[2], ap: m[3], sender, text: body };
        raw.push(cur);
      } else {
        cur = null;
      }
    } else if (cur) {
      cur.text += '\n' + line;
    }
  }

  if (!raw.length) {
    throw new Error('No WhatsApp messages could be parsed from this file.');
  }

  // Detect date order
  let order = 'dmy';
  let firstGt12 = false, secondGt12 = false;
  for (const r of raw) {
    const p = r.d.split(/[/.\-]/);
    if (p[0].length === 4) { order = 'ymd'; break; }
    if (+p[0] > 12) firstGt12 = true;
    if (+p[1] > 12) secondGt12 = true;
  }
  if (order !== 'ymd') {
    if (secondGt12) order = 'mdy';
    else order = 'dmy';
  }

  // Parse timestamps
  const msgs = [];
  for (const r of raw) {
    try {
      const p = r.d.split(/[/.\-]/).map(Number);
      let y, mo, d;
      if (order === 'ymd') [y, mo, d] = p;
      else if (order === 'dmy') [d, mo, y] = p;
      else [mo, d, y] = p;
      if (y < 100) y += 2000;

      const tp = r.t.split(/[:.]/).map(Number);
      let h = tp[0], mi = tp[1], s = tp[2] || 0;
      if (r.ap) {
        const ap = r.ap.replace(/[.\s?]/g, '').toLowerCase();
        if (ap === 'pm' && h < 12) h += 12;
        else if (ap === 'am' && h === 12) h = 0;
      }
      const dt = new Date(y, mo - 1, d, h, mi, s);
      const isMedia = /<media omitted>|<attached:.*>|omitted/i.test(r.text);
      const isDeleted = /this message was deleted|you deleted this message/i.test(r.text);
      const kind = isMedia ? 'media' : (isDeleted ? 'deleted' : 'text');
      const words = kind === 'text' ? r.text.trim().split(/\s+/).filter(Boolean).length : 0;
      msgs.push({ dt, sender: r.sender, text: r.text, kind, words });
    } catch (_) {}
  }

  msgs.sort((a, b) => a.dt - b.dt);

  // Analyze
  const counts = {};
  msgs.forEach(m => { counts[m.sender] = (counts[m.sender] || 0) + 1; });
  const senders = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);

  const per = {};
  const hourly = {};
  const weekday = {};
  const monthly = {};
  const daily = {};
  const heatMap = Array.from({ length: 7 }, () => Array(24).fill(0));

  senders.forEach(s => {
    per[s] = {
      messages: 0, text_messages: 0, media: 0, deleted: 0, words: 0, chars: 0,
      links: 0, questions: 0, emojis_total: 0, late_night: 0, longest_msg_words: 0,
      starts: 0, ends: 0, reply: {}, top_words: [], top_emojis: []
    };
    hourly[s] = Array(24).fill(0);
    weekday[s] = Array(7).fill(0);
    monthly[s] = {};
    daily[s] = {};
  });

  const stopWords = new Set("a about above after again all also am an and any are as at be because been before being below between both but by can could did do does doing don't down during each few for from further get got had has have having he her here hers him his how i i'd i'll i'm i've if in into is it it's its just let like me more most my no nor not now of off on once only or other our ours out over own same she should so some such than that the their theirs them then there these they this those through to too under until up very was we were what when where which while who whom why will with won't would you your yeah yes ok okay oh one go going want".split(' '));

  const wordCounts = {};
  const emojiCounts = {};
  senders.forEach(s => { wordCounts[s] = {}; emojiCounts[s] = {}; });

  for (const m of msgs) {
    const s = m.sender;
    const p = per[s];
    p.messages++;
    const hr = m.dt.getHours();
    const wd = (m.dt.getDay() + 6) % 7; // Mon = 0
    const mStr = `${m.dt.getFullYear()}-${String(m.dt.getMonth() + 1).padStart(2, '0')}`;
    const dStr = m.dt.toISOString().slice(0, 10);

    hourly[s][hr]++;
    weekday[s][wd]++;
    monthly[s][mStr] = (monthly[s][mStr] || 0) + 1;
    daily[s][dStr] = (daily[s][dStr] || 0) + 1;
    heatMap[wd][hr]++;

    if (hr < 5) p.late_night++;
    if (m.kind === 'media') { p.media++; continue; }
    if (m.kind === 'deleted') { p.deleted++; continue; }

    p.text_messages++;
    p.words += m.words;
    p.chars += m.text.length;
    p.longest_msg_words = Math.max(p.longest_msg_words, m.words);
    p.links += (m.text.match(/https?:\/\/\S+/gi) || []).length;
    p.questions += (m.text.includes('?') ? 1 : 0);

    const emojis = m.text.match(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu) || [];
    p.emojis_total += emojis.length;
    emojis.forEach(e => { emojiCounts[s][e] = (emojiCounts[s][e] || 0) + 1; });

    const words = m.text.toLowerCase().replace(/https?:\/\/\S+/g, ' ').match(/[a-z']+/g) || [];
    words.forEach(w => {
      const cleanW = w.replace(/^'+|'+$/g, '');
      if (cleanW.length >= 3 && !stopWords.has(cleanW)) {
        wordCounts[s][cleanW] = (wordCounts[s][cleanW] || 0) + 1;
      }
    });
  }

  // Conversation dynamics
  const replies = {};
  senders.forEach(s => { replies[s] = []; });
  let prev = null;
  for (const m of msgs) {
    if (!prev) {
      per[m.sender].starts++;
    } else {
      const gapSec = (m.dt - prev.dt) / 1000;
      if (gapSec > 6 * 3600) {
        per[m.sender].starts++;
        per[prev.sender].ends++;
      } else if (m.sender !== prev.sender && gapSec <= 6 * 3600 && gapSec >= 0) {
        replies[m.sender].push(gapSec);
      }
    }
    prev = m;
  }
  if (prev) per[prev.sender].ends++;

  // Reply statistics
  senders.forEach(s => {
    const v = replies[s].sort((a, b) => a - b);
    const n = v.length;
    const slow = v.filter(x => x >= 60);
    const bk = [0, 0, 0, 0, 0];
    v.forEach(x => {
      if (x < 60) bk[0]++;
      else if (x < 300) bk[1]++;
      else if (x < 900) bk[2]++;
      else if (x < 3600) bk[3]++;
      else bk[4]++;
    });
    per[s].reply = {
      count: n,
      median: n ? v[Math.floor(n / 2)] : 0,
      mean: n ? sum(v) / n : 0,
      p90: n ? v[Math.floor(n * 0.9)] : 0,
      after_pause_median: slow.length ? slow[Math.floor(slow.length / 2)] : null,
      after_pause_mean: slow.length ? sum(slow) / slow.length : null,
      after_pause_p90: slow.length ? slow[Math.floor(slow.length * 0.9)] : null,
      same_minute: n ? (v.filter(x => x < 60).length / n) * 100 : 0,
      buckets: n ? bk.map(b => (b / n) * 100) : [0, 0, 0, 0, 0]
    };
    per[s].avg_words_per_msg = per[s].text_messages ? per[s].words / per[s].text_messages : 0;
    per[s].avg_chars_per_msg = per[s].text_messages ? per[s].chars / per[s].text_messages : 0;
    per[s].top_words = Object.entries(wordCounts[s]).sort((a, b) => b[1] - a[1]).slice(0, 15);
    per[s].top_emojis = Object.entries(emojiCounts[s]).sort((a, b) => b[1] - a[1]).slice(0, 15);
  });

  // Daily totals
  const dailyTotals = {};
  senders.forEach(s => {
    Object.entries(daily[s]).forEach(([d, c]) => {
      dailyTotals[d] = (dailyTotals[d] || 0) + c;
    });
  });
  const sortedDates = Object.keys(dailyTotals).sort();
  const firstD = new Date(sortedDates[0]);
  const lastD = new Date(sortedDates[sortedDates.length - 1]);
  const spanDays = Math.max(1, Math.round((lastD - firstD) / 864e5) + 1);

  // Streaks
  let streak = 1, maxStreak = 1;
  for (let i = 1; i < sortedDates.length; i++) {
    const diff = Math.round((new Date(sortedDates[i]) - new Date(sortedDates[i - 1])) / 864e5);
    if (diff === 1) {
      streak++;
      if (streak > maxStreak) maxStreak = streak;
    } else {
      streak = 1;
    }
  }

  // Monthly totals
  const monthlyTotal = {};
  senders.forEach(s => {
    Object.entries(monthly[s]).forEach(([m, c]) => {
      monthlyTotal[m] = (monthlyTotal[m] || 0) + c;
    });
  });

  // Peak hour & weekday
  const overallHour = Array(24).fill(0);
  senders.forEach(s => hourly[s].forEach((c, h) => { overallHour[h] += c; }));
  const peakHour = overallHour.indexOf(Math.max(...overallHour));

  const overallWd = Array(7).fill(0);
  senders.forEach(s => weekday[s].forEach((c, w) => { overallWd[w] += c; }));
  const peakWd = WD[overallWd.indexOf(Math.max(...overallWd))];

  const topDays = Object.entries(dailyTotals).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const busiestMonth = Object.entries(monthlyTotal).sort((a, b) => b[1] - a[1])[0] || ['n/a', 0];

  const summary = {
    senders,
    overview: {
      first_message: msgs[0].dt.toISOString().replace('T', ' ').slice(0, 19),
      last_message: msgs[msgs.length - 1].dt.toISOString().replace('T', ' ').slice(0, 19),
      span_days: spanDays,
      active_days: sortedDates.length,
      silent_days: spanDays - sortedDates.length,
      total_messages: msgs.length,
      total_words: sum(senders.map(s => per[s].words)),
      messages_per_day: msgs.length / spanDays,
      words_per_day: sum(senders.map(s => per[s].words)) / spanDays,
      longest_daily_streak: maxStreak,
      streak_ended: sortedDates[sortedDates.length - 1],
      longest_silence_days: 0,
      peak_hour: peakHour,
      peak_weekday: peakWd,
      busiest_month: busiestMonth,
      reply_cap_hours: 6,
      session_gap_hours: 6
    },
    per_sender: per,
    hourly,
    weekday,
    monthly,
    monthly_total: monthlyTotal,
    top_days: topDays,
    heatmap: heatMap
  };

  const dailyCSV = 'date,messages\n' + sortedDates.map(d => `${d},${dailyTotals[d]}`).join('\n');
  return { summary, dailyCSV };
}

// ===== HANDLE FILE / TEXT UPLOAD (ONLINE OR OFFLINE) =====
async function handleChatTextData(text, name = 'chat.txt') {
  const state = $('#state');
  if (state) {
    state.hidden = false;
    state.style.display = 'flex';
    state.innerHTML = `
      <div class="spinner" aria-busy="true" aria-label="Analyzing chat"></div>
      <p class="text-muted">Analyzing <strong>${esc(name)}</strong>… Reading participants and statistics.</p>`;
  }

  // 1. Try server upload endpoint if running through run.py server
  if (location.protocol !== 'file:') {
    try {
      const formData = new FormData();
      const blob = new Blob([text], { type: 'text/plain' });
      formData.append('file', blob, name);
      const resp = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });
      if (resp.ok) {
        const result = await resp.json();
        if (result.ok && result.summary) {
          cachedSummary = result.summary;
          cachedDailyCSV = result.daily || '';
          render(result.summary, csvDaily(cachedDailyCSV));
          return;
        }
      }
    } catch (e) {
      console.warn('Server upload failed, falling back to browser parser:', e);
    }
  }

  // 2. Client-side fallback parser (works 100% offline and with file://)
  try {
    const { summary, dailyCSV } = parseClientWhatsApp(text);
    cachedSummary = summary;
    cachedDailyCSV = dailyCSV;
    render(summary, csvDaily(dailyCSV));
  } catch (err) {
    console.error('File parse failed:', err);
    note(`
      <h3>Could Not Parse WhatsApp Chat</h3>
      <p>Error: ${esc(err.message)}</p>
      <p style="margin-top:0.75rem">Please make sure this is an exported WhatsApp chat <code>.txt</code> file.</p>
      <button class="btn btn-primary" onclick="$('#file-input').click()" style="margin-top:1rem">Try Another Chat File</button>
    `, true);
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

// ===== DATA LOADING =====
async function load() {
  const state = $('#state');
  if (state) {
    state.hidden = false;
    state.style.display = 'flex';
    state.innerHTML = `
      <div class="spinner" aria-busy="true" aria-label="Loading chat analysis"></div>
      <p class="text-muted">Loading your chat analysis…</p>`;
  }

  // 1. Check embedded data first (offline / standalone export)
  if (window.__EMBEDDED_DATA__ && window.__EMBEDDED_DATA__.summary) {
    try {
      cachedSummary = window.__EMBEDDED_DATA__.summary;
      let dl = null;
      if (window.__EMBEDDED_DATA__.dailyCSV) {
        cachedDailyCSV = window.__EMBEDDED_DATA__.dailyCSV;
        dl = csvDaily(cachedDailyCSV);
      }
      render(cachedSummary, dl);
      return;
    } catch (e) {
      console.error('Embedded render error:', e);
    }
  }

  // 2. Fetch from local server or relative directory
  try {
    const summaryResp = await fetchFirst(['chat_analysis_output/summary.json', '../chat_analysis_output/summary.json'], { cache: 'no-store' });
    if (!summaryResp) throw new Error('Could not fetch summary.json');
    const summaryData = await summaryResp.json();
    cachedSummary = summaryData;

    let dl = null;
    try {
      const dailyResp = await fetchFirst(['chat_analysis_output/daily.csv', '../chat_analysis_output/daily.csv'], { cache: 'no-store' });
      if (dailyResp) {
        const dailyText = await dailyResp.text();
        cachedDailyCSV = dailyText;
        dl = csvDaily(dailyText);
      }
    } catch (_) {}

    render(summaryData, dl);
  } catch (err) {
    console.error('Load failed:', err);
    const out = $('#out');
    if (out) out.innerHTML = '';
    note(`
      <h3>Ready to Analyze Your WhatsApp Chat</h3>
      <p>Upload any WhatsApp chat export (<code>.txt</code>) to discover your conversation statistics, rhythm, response times, and favourite words.</p>
      <div style="margin-top:1rem;display:flex;gap:0.75rem;justify-content:center;flex-wrap:wrap;">
        <button class="btn btn-primary" onclick="$('#file-input').click()">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="17 8 12 3 7 8"></polyline>
            <line x1="12" y1="3" x2="12" y2="15"></line>
          </svg>
          Upload Chat (.txt)
        </button>
        <button class="btn btn-secondary" onclick="location.reload()">Refresh</button>
      </div>
      <p class="text-muted" style="margin-top:0.75rem;font-size:0.875rem">You can also drag and drop any exported .txt chat file directly onto this window.</p>
    `, false);
  }
}

// ===== EVENT LISTENERS & INITIALIZATION =====
initTheme();

const themeBtn = $('#theme-toggle');
if (themeBtn) themeBtn.onclick = toggleTheme;

const exportBtn = $('#export');
if (exportBtn) exportBtn.onclick = exportHTML;

const uploadBtn = $('#upload-btn');
const fileInput = $('#file-input');
if (uploadBtn && fileInput) {
  uploadBtn.onclick = () => fileInput.click();
  fileInput.onchange = e => {
    const file = e.target.files && e.target.files[0];
    if (file) handleChatFileUpload(file);
    fileInput.value = '';
  };
}

// Drag & Drop listeners
const dropOverlay = $('#drop-overlay');
window.addEventListener('dragover', e => {
  e.preventDefault();
  if (dropOverlay) dropOverlay.classList.add('active');
});
window.addEventListener('dragleave', e => {
  if (e.relatedTarget === null && dropOverlay) {
    dropOverlay.classList.remove('active');
  }
});
window.addEventListener('drop', e => {
  e.preventDefault();
  if (dropOverlay) dropOverlay.classList.remove('active');
  const files = e.dataTransfer && e.dataTransfer.files;
  if (files && files.length > 0) {
    handleChatFileUpload(files[0]);
  }
});

// Paste (Ctrl+V) listener - handles both copied chat files and pasted chat text
window.addEventListener('paste', e => {
  const clipboardFiles = e.clipboardData && e.clipboardData.files;
  if (clipboardFiles && clipboardFiles.length > 0) {
    handleChatFileUpload(clipboardFiles[0]);
    return;
  }
  const pastedText = e.clipboardData && e.clipboardData.getData('text');
  if (pastedText && pastedText.trim().length > 20) {
    handleChatTextData(pastedText, 'pasted_chat.txt');
  }
});

const refreshBtn = $('#refresh');
if (refreshBtn) {
  refreshBtn.onclick = async () => {
    const originalText = refreshBtn.textContent;
    refreshBtn.disabled = true;
    refreshBtn.textContent = 'Analysing…';
    try {
      const r = await fetch('api/refresh');
      if (!r.ok) throw new Error('Refresh failed');
      await load();
    } catch (e) {
      note(`Could not refresh chat analysis.<br><small>${esc(e.message)}</small>`, true);
    } finally {
      refreshBtn.disabled = false;
      refreshBtn.textContent = originalText;
    }
  };
}

// Initial load
load();
