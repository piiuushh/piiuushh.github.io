(() => {
  'use strict';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const NS = 'http://www.w3.org/2000/svg';

  requestAnimationFrame(() => requestAnimationFrame(() => document.documentElement.classList.add('loaded')));

  /* ---------- clock (IST) ---------- */
  const clock = $('#clock');
  const fmt = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  const tickClock = () => { clock.textContent = fmt.format(new Date()); };
  tickClock(); setInterval(tickClock, 1000);

  /* ---------- scroll progress, timeline fill ---------- */
  const bar = $('.progress span');
  const tl = $('#timeline');
  let ticking = false;
  const onScroll = () => {
    const h = document.documentElement;
    const p = h.scrollTop / Math.max(1, h.scrollHeight - h.clientHeight);
    bar.style.transform = `scaleX(${p})`;
    if (tl) {
      const r = tl.getBoundingClientRect();
      const f = (innerHeight * 0.6 - r.top) / r.height;
      tl.style.setProperty('--tl', Math.min(1, Math.max(0, f)).toFixed(3));
    }
    ticking = false;
  };
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  onScroll();

  /* ---------- nav active section ---------- */
  const navLinks = $$('.nav nav a[href^="#"]');
  const secIO = new IntersectionObserver((ents) => {
    ents.forEach((e) => {
      if (!e.isIntersecting) return;
      navLinks.forEach((a) => a.classList.toggle('on', a.getAttribute('href') === '#' + e.target.id));
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  ['work', 'analysis', 'experience'].forEach((id) => { const el = document.getElementById(id); if (el) secIO.observe(el); });

  /* ---------- counters ---------- */
  const fmtNum = (v, dec) => v.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec });
  const runCount = (el) => {
    if (el.dataset.done) return; el.dataset.done = 1;
    const to = parseFloat(el.dataset.count), dec = +(el.dataset.dec || 0);
    const pre = el.dataset.prefix || '', suf = el.dataset.suffix || '';
    if (reduce || to === 0) { el.textContent = pre + fmtNum(to, dec) + suf; return; }
    const t0 = performance.now(), dur = 1500;
    const step = (now) => {
      const k = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - k, 3);
      el.textContent = pre + fmtNum(to * e, dec) + suf;
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  /* ---------- reveal ---------- */
  const revIO = new IntersectionObserver((ents) => {
    ents.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.classList.add('in');
      $$('[data-count]', e.target).forEach(runCount);
      if (e.target.matches('[data-count]')) runCount(e.target);
      revIO.unobserve(e.target);
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  $$('.rv').forEach((el) => revIO.observe(el));

  /* ---------- DAG ---------- */
  const svg = $('#dag');
  const coords = $('#coords');
  const NODES = [
    { id: 'sheets', c: 0, l: 'Google Sheets', s: 'Sheets', t: 'hand-maintained' },
    { id: 'aws', c: 0, l: 'AWS', s: 'AWS', t: 'renewals · bookings' },
    { id: 'users', c: 0, l: 'Users', s: 'Users', t: 'orders · forms' },
    { id: 'spark', c: 1, l: 'Spark SQL', s: 'Spark', t: 'batch pulls' },
    { id: 'py', c: 1, l: 'Python', s: 'Python', t: 'clean · validate' },
    { id: 'duck', c: 1, l: 'DuckDB', s: 'DuckDB', t: 'one KPI config' },
    { id: 'pg', c: 1, l: 'Postgres + RLS', s: 'Postgres', t: 'rules in the DB' },
    { id: 'dash', c: 2, l: 'Dashboards', s: 'Dashbrd', t: 'Power BI · Streamlit' },
    { id: 'mail', c: 2, l: 'Scheduled emails', s: 'Emails', t: 'send themselves' },
    { id: 'xls', c: 2, l: 'Excel / PPT packs', s: 'Excel', t: 'live formulas' },
    { id: 'app', c: 2, l: 'Live apps', s: 'Apps', t: 'rehaul · tailortex' },
  ];
  const EDGES = [
    ['sheets', 'py'], ['sheets', 'duck'], ['aws', 'spark'], ['aws', 'py'], ['users', 'pg'],
    ['spark', 'dash'], ['spark', 'mail'], ['py', 'mail'], ['py', 'xls'],
    ['duck', 'dash'], ['duck', 'xls'], ['pg', 'dash'], ['pg', 'app'],
  ];
  const COLS = ['SOURCES', 'TRANSFORM', 'SERVE'];
  let pkts = [], mode = '', dagVisible = true;

  const el = (tag, attrs, parent) => {
    const n = document.createElementNS(NS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  };

  function buildDag() {
    const w = svg.parentElement.clientWidth;
    const m = w < 720 ? 'v' : 'h';
    if (m === mode) return;
    mode = m;
    svg.innerHTML = '';
    pkts = [];
    const pos = {};
    let W, H;
    if (m === 'h') {
      W = 1200; H = 420;
      const xs = [130, 600, 1070], nw = 210, nh = 54;
      COLS.forEach((c, i) => { const t = el('text', { x: xs[i] - nw / 2, y: 34, class: 'colh' }, svg); t.textContent = c; });
      [0, 1, 2].forEach((c) => {
        const col = NODES.filter((n) => n.c === c);
        const top = 64, bottom = H - 26, step = (bottom - top) / col.length;
        col.forEach((n, i) => { pos[n.id] = { x: xs[c], y: top + step * (i + 0.5), w: nw, h: nh }; });
      });
    } else {
      W = 360; H = 568;
      const ys = [80, 300, 520], nh = 40;
      COLS.forEach((c, i) => { const t = el('text', { x: 12, y: ys[i] - 32, class: 'colh' }, svg); t.textContent = c; });
      [0, 1, 2].forEach((c) => {
        const row = NODES.filter((n) => n.c === c);
        const gap = 8, nw = (W - 24 - gap * (row.length - 1)) / row.length;
        row.forEach((n, i) => { pos[n.id] = { x: 12 + nw / 2 + i * (nw + gap), y: ys[c], w: nw, h: nh }; });
      });
    }
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);

    const gE = el('g', {}, svg), gP = el('g', {}, svg), gN = el('g', {}, svg);
    EDGES.forEach(([a, b], i) => {
      const A = pos[a], B = pos[b];
      let d;
      if (m === 'h') {
        const x1 = A.x + A.w / 2, x2 = B.x - B.w / 2, mx = (x1 + x2) / 2;
        d = `M${x1},${A.y} C${mx},${A.y} ${mx},${B.y} ${x2},${B.y}`;
      } else {
        const y1 = A.y + A.h / 2, y2 = B.y - B.h / 2, my = (y1 + y2) / 2;
        d = `M${A.x},${y1} C${A.x},${my} ${B.x},${my} ${B.x},${y2}`;
      }
      const p = el('path', { d, class: 'edge', 'data-a': a, 'data-b': b }, gE);
      const len = p.getTotalLength();
      for (let k = 0; k < 2; k++) {
        const c = el('circle', { r: m === 'h' ? 3 : 2.4, class: 'pkt', 'data-a': a, 'data-b': b }, gP);
        pkts.push({ c, p, len, t: (k * 0.5 + i * 0.137) % 1, v: 0.9 + ((i * 7) % 5) * 0.08 });
      }
    });
    NODES.forEach((n) => {
      const P = pos[n.id];
      const g = el('g', { class: 'node', 'data-id': n.id, tabindex: 0 }, gN);
      el('rect', { x: P.x - P.w / 2, y: P.y - P.h / 2, width: P.w, height: P.h, rx: 2 }, g);
      if (m === 'h') {
        const t = el('text', { x: P.x - P.w / 2 + 14, y: P.y - 3 }, g); t.textContent = n.l;
        const s = el('text', { x: P.x - P.w / 2 + 14, y: P.y + 15, class: 'tag' }, g); s.textContent = n.t;
      } else {
        const t = el('text', { x: P.x, y: P.y + 4, 'text-anchor': 'middle', style: 'font-size:10.5px' }, g); t.textContent = n.s;
      }
      const on = () => focusNode(n.id), off = () => focusNode(null);
      g.addEventListener('mouseenter', on); g.addEventListener('mouseleave', off);
      g.addEventListener('focus', on); g.addEventListener('blur', off);
    });
    $$('.colh', svg).forEach((t) => svg.appendChild(t));
    if (reduce) pkts.forEach((k) => k.c.remove());
  }

  function focusNode(id) {
    svg.classList.toggle('focus', !!id);
    $$('.hot', svg).forEach((x) => x.classList.remove('hot'));
    if (!id) return;
    const linked = new Set([id]);
    $$('.edge, .pkt', svg).forEach((e) => {
      if (e.dataset.a === id || e.dataset.b === id) { e.classList.add('hot'); linked.add(e.dataset.a); linked.add(e.dataset.b); }
    });
    $$('.node', svg).forEach((n) => { if (linked.has(n.dataset.id)) n.classList.add('hot'); });
  }

  if (svg) {
    buildDag();
    let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(buildDag, 150); });
    new IntersectionObserver(([e]) => { dagVisible = e.isIntersecting; }).observe(svg);
    let last = performance.now();
    const SPEED = 120;
    const frame = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      if (dagVisible && !document.hidden && !reduce) {
        for (const k of pkts) {
          k.t = (k.t + (dt * SPEED * k.v) / k.len) % 1;
          const pt = k.p.getPointAtLength(k.t * k.len);
          k.c.setAttribute('cx', pt.x.toFixed(1)); k.c.setAttribute('cy', pt.y.toFixed(1));
          k.c.setAttribute('opacity', Math.sin(Math.PI * k.t).toFixed(2));
        }
      }
      requestAnimationFrame(frame);
    };
    if (!reduce) requestAnimationFrame(frame);
    svg.addEventListener('mousemove', (e) => {
      const r = svg.getBoundingClientRect(), vb = svg.viewBox.baseVal;
      const x = ((e.clientX - r.left) / r.width) * vb.width, y = ((e.clientY - r.top) / r.height) * vb.height;
      coords.textContent = `X ${String(Math.round(x)).padStart(4, '0')} · Y ${String(Math.round(y)).padStart(4, '0')}`;
    });
  }

  /* ---------- panel runner: plays only while on screen ---------- */
  function runner(root, seq, final) {
    if (!root) return;
    if (reduce) { final(); return; }
    let vis = false;
    new IntersectionObserver(([e]) => { vis = e.isIntersecting; }, { threshold: 0.2 }).observe(root);
    const sleep = (ms) => new Promise((res) => {
      let left = ms, last = performance.now();
      const t = (now) => { if (vis && !document.hidden) left -= now - last; last = now; left <= 0 ? res() : requestAnimationFrame(t); };
      requestAnimationFrame(t);
    });
    (async () => { for (;;) { await sleep(250); await seq(sleep); } })();
  }

  const logger = (pre, max = 8) => {
    const lines = [];
    const render = (cursor) => { pre.innerHTML = lines.join('\n') + (cursor ? '\n<span class="cur"></span>' : ''); };
    return {
      clear() { lines.length = 0; render(true); },
      add(cls, txt) { lines.push(`<span class="${cls}">${txt}</span>`); while (lines.length > max) lines.shift(); render(true); },
    };
  };

  /* Rehaul state machine */
  (() => {
    const root = $('#sm'); if (!root) return;
    const nodes = $$('.sm-node', root);
    const log = logger($('#smlog'), 9);
    const set = (i) => nodes.forEach((n, j) => { n.classList.toggle('done', j < i); n.classList.toggle('cur', j === i); });
    const bad = (i) => { nodes[i].classList.remove('bad'); void nodes[i].offsetWidth; nodes[i].classList.add('bad'); setTimeout(() => nodes[i].classList.remove('bad'), 700); };
    runner(root, async (sleep) => {
      set(-1); log.clear(); await sleep(500);
      log.add('cmd', "› place_order(listing => 'RH-118')"); await sleep(600);
      log.add('ok', '  ok   order #1042 → requested'); set(0); await sleep(1300);
      log.add('cmd', '› admin: confirm #1042'); await sleep(500);
      log.add('ok', '  ok   → reserved · listing held'); set(1); await sleep(1300);
      log.add('cmd', "› place_order(listing => 'RH-118')   <span class=\"muted\">-- second buyer</span>"); await sleep(600);
      log.add('er', '  ERR  listing_not_available'); bad(1); await sleep(1500);
      log.add('cmd', '› admin: mark paid #1042'); await sleep(500);
      log.add('ok', '  ok   → paid · listing sold'); set(2); await sleep(1100);
      log.add('cmd', '› admin: ship #1042'); await sleep(500);
      log.add('ok', '  ok   → shipped'); set(3); await sleep(1300);
      log.add('cmd', "› update orders set status = 'paid' …"); await sleep(600);
      log.add('er', '  ERR  rejected by trigger: shipped ↛ paid'); bad(3); await sleep(1500);
      log.add('cmd', '› admin: mark delivered #1042'); await sleep(500);
      log.add('ok', '  ok   → delivered · payout = price − fee% (snapshotted)'); set(4);
      await sleep(3800);
    }, () => { set(4); log.add('ok', 'requested → reserved → paid → shipped → delivered'); log.add('er', 'second order on same listing: listing_not_available'); });
  })();

  /* EIOS pipeline */
  (() => {
    const root = $('#eiosp'); if (!root) return;
    const rows = $$('#cells tr', root), outs = $$('#outs li', root);
    const ck = $('#checks', root), cb = $('#checkbar', root);
    const final = () => { rows.forEach((r) => r.classList.add('on')); outs.forEach((o) => o.classList.add('on')); ck.textContent = '176/176'; cb.style.width = '100%'; };
    runner(root, async (sleep) => {
      rows.forEach((r) => r.classList.remove('on')); outs.forEach((o) => o.classList.remove('on'));
      ck.textContent = '0/176'; cb.style.width = '0%';
      await sleep(600);
      for (const r of rows) { r.classList.add('on'); await sleep(520); }
      await sleep(300);
      for (let i = 0; i <= 176; i += 4) { const v = Math.min(176, i); ck.textContent = `${v}/176`; cb.style.width = (v / 176 * 100) + '%'; await sleep(28); }
      ck.textContent = '176/176'; cb.style.width = '100%';
      await sleep(400);
      for (const o of outs) { o.classList.add('on'); await sleep(380); }
      await sleep(3600);
    }, final);
  })();

  /* tailortex */
  (() => {
    const root = $('#tt'); if (!root) return;
    const before = $('#ttb', root), after = $('#tta', root);
    const log = logger($('#ttlog', root), 7);
    const SEG = [
      { t: 'Lending Dashboards:', b: 1, m: 1 }, { t: ' Built ' }, { t: 'self-serve', m: 1 },
      { t: ' Power BI dashboards on loan disbursal and collections for 12 regional ' },
      { t: 'business stakeholders', m: 1 }, { t: ', replacing a manual Excel process.' },
    ];
    const total = SEG.reduce((s, x) => s + x.t.length, 0);
    const render = (n) => {
      let out = '', left = n;
      for (const s of SEG) {
        if (left <= 0) break;
        const part = s.t.slice(0, left); left -= s.t.length;
        let h = part.replace(/&/g, '&amp;').replace(/</g, '&lt;');
        if (s.b) h = `<b>${h}</b>`;
        if (s.m) h = `<mark>${h}</mark>`;
        out += h;
      }
      after.innerHTML = out;
    };
    runner(root, async (sleep) => {
      before.classList.remove('struck'); after.innerHTML = ''; log.clear();
      await sleep(500);
      log.add('cmd', '› parse      bullets cut by exact char span'); await sleep(700);
      log.add('cmd', '› gemini     plan.json  (schema-validated)'); await sleep(900);
      before.classList.add('struck');
      for (let i = 0; i <= total; i += 2) { render(i); await sleep(18); }
      render(total); await sleep(500);
      log.add('ok', '  guard  numbers   12 → 12            ok'); await sleep(550);
      log.add('ok', '  guard  tools     Power BI, Excel     ok'); await sleep(750);
      log.add('er', "  guard  edit adds 'dbt', not on resume  BLOCKED"); await sleep(900);
      log.add('ok', '› compile    1 page                     ok');
      await sleep(4200);
    }, () => { before.classList.add('struck'); render(total); log.add('er', "guard: edit adds 'dbt', not on resume  BLOCKED"); log.add('ok', 'compile: 1 page  ok'); });
  })();

  /* recruiter sheet */
  (() => {
    const root = $('#re'); if (!root) return;
    const rows = $$('#sheet tr', root), day = $('#day', root);
    const set = (i, cls, txt) => {
      const r = rows[i]; r.className = cls; r.querySelector('.st').textContent = txt;
      if (!reduce) { r.classList.add('flash'); setTimeout(() => r.classList.remove('flash'), 650); }
    };
    const EVENTS = {
      3: [[1, 'rep', 'Replied']],
      7: [[0, 'fol', 'Followed up'], [2, 'fol', 'Followed up'], [3, 'fol', 'Followed up'], [4, 'fol', 'Followed up']],
      9: [[3, 'rep', 'Replied']],
      11: [[2, 'rep', 'Replied']],
      14: [[0, 'no', 'No reply'], [4, 'no', 'No reply']],
    };
    const final = () => { day.textContent = '14'; Object.values(EVENTS).flat().forEach(([i, c, t]) => { const r = rows[i]; r.className = c; r.querySelector('.st').textContent = t; }); };
    runner(root, async (sleep) => {
      rows.forEach((r) => { r.className = ''; r.querySelector('.st').textContent = 'Sent'; });
      day.textContent = '00'; await sleep(900);
      for (let d = 1; d <= 14; d++) {
        day.textContent = String(d).padStart(2, '0');
        (EVENTS[d] || []).forEach(([i, c, t]) => set(i, c, t));
        await sleep(EVENTS[d] ? 900 : 380);
      }
      await sleep(3800);
    }, final);
  })();
})();
