// The spectre thread figures. Adapted from the standalone art page
// (scripts/spectre/art/tmpl.html, built by scripts/spectre/15_art_page.py), so
// the drawing, the build-up timeline and the marked-tile palette are the same code.
// Each <figure class="spectre-fig" data-spectre="..."> on the page is mounted
// from one shared copy of the data. Controls are optional: a figure only gets
// the behaviour whose elements it contains ([data-role=...]).
(() => {
  const figs = [...document.querySelectorAll('.spectre-fig[data-spectre]')];
  if (!figs.length) return;
  const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  fetch('/static/spectre/thread-data.json').then(r => r.json()).then(D => {
    const G = geometry(D);
    figs.forEach(f => { f.classList.add('is-live'); mount(f, G); });
  }).catch(() => figs.forEach(f => f.classList.add('is-failed')));

  const PAL = {
    dusk: ['#1d2a5c','#3b5ba9','#5fb3b3','#f2d16b','#ef8354','#b23a6f'],
    kelp: ['#0f3d3e','#1f7a6d','#8ac6a0','#f1e9c9','#e8a15c','#9b3d2e'],
    ember:['#2b1b3d','#7a2e5d','#d1495b','#f2a65a','#f7e3a1']
  };
  function rgb(h){ return [parseInt(h.slice(1,3),16), parseInt(h.slice(3,5),16), parseInt(h.slice(5,7),16)]; }
  function colorAt(stops, t){
    const n = stops.length - 1, x = Math.min(n - 1e-9, Math.max(0, t * n)), i = Math.floor(x), f = x - i, a = rgb(stops[i]), b = rgb(stops[i+1]);
    return 'rgb(' + Math.round(a[0]+(b[0]-a[0])*f) + ',' + Math.round(a[1]+(b[1]-a[1])*f) + ',' + Math.round(a[2]+(b[2]-a[2])*f) + ')';
  }
  const num = n => n.toLocaleString('en-US');

  // world geometry of every tile, in curve order, plus the thread's spline points
  function geometry(D){
    const SHAPE = D.shape, R = D.rows, ENDS = D.ends, N4 = R.length / 5;
    const P = new Float32Array(N4 * 28), C = new Float32Array(N4 * 2), M = new Float32Array(N4 * 2);
    for (let i = 0; i < N4; i++){
      const x = R[5*i] / 100, y = R[5*i+1] / 100, a = (R[5*i+2] % 12) * Math.PI / 6, c = Math.cos(a), s = Math.sin(a);
      let cx = 0, cy = 0;
      for (let j = 0; j < 14; j++){
        const px = c*SHAPE[j][0] - s*SHAPE[j][1] + x, py = s*SHAPE[j][0] + c*SHAPE[j][1] + y;
        P[28*i + 2*j] = px; P[28*i + 2*j + 1] = py; cx += px; cy += py;
      }
      C[2*i] = cx / 14; C[2*i+1] = cy / 14; M[2*i] = R[5*i+3] / 100; M[2*i+1] = R[5*i+4] / 100;
    }
    // the thread: one smooth spline through each tile centre and the middle of each shared border.
    const NP = 2 * N4 - 1, PT = new Float32Array(2 * NP);
    for (let i = 0; i < N4; i++){ PT[4*i] = C[2*i]; PT[4*i+1] = C[2*i+1]; if (i < N4 - 1){ PT[4*i+2] = M[2*i]; PT[4*i+3] = M[2*i+1]; } }
    const boxes = {};
    function box(n){
      if (!boxes[n]){
        let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
        for (let i = 0; i < n * 14; i++){ const x = P[2*i], y = P[2*i+1]; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
        boxes[n] = { x0, x1, y0, y1 };
      }
      return boxes[n];
    }
    return { SHAPE, ENDS, N4, P, C, PT, NP, box, MK: D.marks, PALETTE: D.palette,
             SIZES: [1, ENDS[1][7], ENDS[2][7], ENDS[3][7], ENDS[4][7]] };
  }

  function mount(root, G){
    const { SHAPE, ENDS, N4, P, C, PT, NP, box, MK, PALETTE, SIZES } = G;
    const q = r => root.querySelector('[data-role="' + r + '"]');
    const cv = q('canvas'), ctx = cv.getContext('2d'), playB = q('play'), buildB = q('build'), pos = q('pos'), read = q('read'), thr = q('thread'), cap = q('cap'), grid = q('grid');
    const S = { mode: 'thread', n: N4, k: N4, t: 0, playing: false, pal: 'dusk', tok: {}, cols: [], pc: [], dpr: 1, hi: -1 };
    const threadOn = () => !thr || thr.checked;

    function view(n, min){ const b = box(n); return { cx: (b.x0+b.x1)/2, cy: (b.y0+b.y1)/2, w: Math.max(b.x1-b.x0, min || 0), h: Math.max(b.y1-b.y0, min || 0) }; }
    function mix(a, b, e){ return { cx: a.cx+(b.cx-a.cx)*e, cy: a.cy+(b.cy-a.cy)*e, w: a.w*Math.pow(b.w/a.w, e), h: a.h*Math.pow(b.h/a.h, e) }; }
    function setCam(v){
      const pad = 8 * S.dpr, W = cv.width, H = cv.height, sc = Math.min((W - 2*pad) / v.w, (H - 2*pad) / v.h);
      ctx.setTransform(sc, 0, 0, -sc, W/2 - v.cx*sc, H/2 + v.cy*sc); return sc;
    }
    function clear(){ ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height); ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.globalAlpha = 1; }
    function layout(){
      const b = S.mode === 'build' ? box(N4) : box(S.n), w = cv.parentElement.clientWidth;
      S.dpr = Math.min(3, window.devicePixelRatio || 1);
      const bw = b.x1 - b.x0, bh = b.y1 - b.y0, maxH = Math.max(340, Math.min(window.innerHeight * 0.72, 820)), sc = Math.min((w - 16) / bw, (maxH - 16) / bh);
      const cw = Math.round(bw*sc + 16), ch = Math.round(bh*sc + 16);
      cv.style.width = cw + 'px'; cv.style.height = ch + 'px'; cv.width = Math.round(cw * S.dpr); cv.height = Math.round(ch * S.dpr);
    }
    function colours(){
      const st = PAL[S.pal], n = S.n; S.cols = new Array(n);
      for (let i = 0; i < n; i++) S.cols[i] = colorAt(st, i / (n - 1));
      S.pc = []; for (let j = 0; j < 8; j++) S.pc.push(colorAt(st, j / 7));
    }
    function tokens(){ const cs = getComputedStyle(root); ['bg','ghost','thread','casing','accent'].forEach(n => S.tok[n] = cs.getPropertyValue('--st-' + n).trim()); }

    function poly(i){ const o = 28 * i; ctx.moveTo(P[o], P[o+1]); for (let j = 1; j < 14; j++) ctx.lineTo(P[o + 2*j], P[o + 2*j + 1]); ctx.closePath(); }
    function range(a, b){ ctx.beginPath(); for (let i = a; i < b; i++) poly(i); }
    function fillRange(a, b, col, alpha){ if (b <= a) return; ctx.globalAlpha = alpha == null ? 1 : alpha; range(a, b); ctx.fillStyle = col; ctx.fill(); ctx.globalAlpha = 1; }
    function grout(a, b, sc){ if (b <= a) return; range(a, b); ctx.strokeStyle = S.tok.bg; ctx.lineWidth = Math.max(0.5 * S.dpr / sc, 0.07); ctx.stroke(); }
    function ghost(a, b, sc, alpha){ if (b <= a) return; ctx.globalAlpha = alpha; range(a, b); ctx.strokeStyle = S.tok.ghost; ctx.lineWidth = Math.max(0.6 * S.dpr / sc, 0.04); ctx.stroke(); ctx.globalAlpha = 1; }
    function dot(x, y, r, sc){
      ctx.beginPath(); ctx.arc(x, y, r, 0, 6.2832); ctx.fillStyle = S.tok.accent; ctx.fill();
      ctx.lineWidth = Math.max(S.dpr / sc, r * 0.3); ctx.strokeStyle = S.tok.thread; ctx.stroke();
    }
    function span(i){
      const a = Math.max(i - 1, 0), d = Math.min(i + 2, NP - 1);
      return [PT[2*i] + (PT[2*i+2] - PT[2*a]) / 6, PT[2*i+1] + (PT[2*i+3] - PT[2*a+1]) / 6, PT[2*i+2] - (PT[2*d] - PT[2*i]) / 6, PT[2*i+3] - (PT[2*d+1] - PT[2*i+1]) / 6];
    }
    function thread(k, sc, joins){
      if (!threadOn() || k < 1) return;
      const tw = Math.min(Math.max(1.1 * S.dpr / sc, 0.3), 9 * S.dpr / sc), r = Math.max(3 * S.dpr / sc, tw * 1.5);
      ctx.beginPath(); ctx.moveTo(C[0], C[1]);
      for (let i = 0; i < 2 * (k - 1); i++){ const b = span(i); ctx.bezierCurveTo(b[0], b[1], b[2], b[3], PT[2*i+2], PT[2*i+3]); }
      ctx.strokeStyle = S.tok.casing; ctx.lineWidth = tw + Math.max(1.2 * S.dpr / sc, tw * 0.7); ctx.globalAlpha = 0.55; ctx.stroke();
      ctx.globalAlpha = 1; ctx.strokeStyle = S.tok.thread; ctx.lineWidth = tw; ctx.stroke();
      if (joins) for (const e of joins) if (k > e) dot(PT[4*e - 2], PT[4*e - 1], r * 0.85, sc);
      ctx.beginPath(); ctx.arc(C[0], C[1], r * 0.8, 0, 6.2832); ctx.fillStyle = S.tok.thread; ctx.fill();
      if (k > 1) dot(C[2*(k-1)], C[2*(k-1)+1], r, sc);
    }
    function say(label, text){ if (!cap) return; const h = '<b>' + label + '</b>' + text; if (cap.innerHTML !== h) cap.innerHTML = h; }

    function drawThread(){
      const n = S.n, k = S.k; clear(); const sc = setCam(view(n));
      ghost(k, n, sc, 1);
      for (let i = 0; i < k; i++){ ctx.globalAlpha = S.hi < 0 || MK[i] === S.hi ? 1 : 0.13; ctx.beginPath(); poly(i); ctx.fillStyle = S.cols[i]; ctx.fill(); }
      ctx.globalAlpha = 1; grout(0, k, sc); if (S.hi < 0) thread(k, sc);
      if (read) read.textContent = num(k) + ' / ' + num(n) + ' tiles';
      if (pos){ pos.max = n; pos.value = k; }
      if (S.hi >= 0) say('Marked tile ' + (S.hi + 1) + ' of ' + PALETTE.length, num(PALETTE[S.hi][2]) + ' of the ' + num(N4) + ' tiles carry this stroke. They are the ones left in colour.');
      else if (grid) say('All ' + num(N4) + ' tiles', 'Pick a marked tile below to see where it is used.');
      else say('The whole thread', num(n) + ' tiles, one line. Press Draw it to trace it in order.');
    }

    // build-up timeline: one tile, then four rounds of "treat it as one piece, join eight"
    const ZOOM = 1.4, HOLD = 1.4, START = 1.2, PIECE = [0, 0.5, 0.55, 0.6, 0.7], DUR = [START], MINV = 9;
    for (let m = 1; m <= 4; m++) DUR[m] = ZOOM + 7 * PIECE[m] + HOLD;
    const TOTAL = DUR.reduce((a, b) => a + b, 0);
    const CAPS = [
      ['Start', 'One tile.'],
      ['Round 1 of 4', 'Join 8 pieces into a cluster of 9 tiles. One of the pieces is a pair.'],
      ['Round 2 of 4', 'Treat that cluster as one piece. Join 8 of them: 71 tiles.'],
      ['Round 3 of 4', 'Do it again. 8 clusters, 559 tiles.'],
      ['Round 4 of 4', 'And again: 4,401 tiles. Thirty route patterns keep this going forever.']
    ];
    const ease = x => x < 0.5 ? 2*x*x : 1 - Math.pow(-2*x + 2, 2) / 2;
    function drawBuild(){
      const t = Math.min(S.t, TOTAL), pc = S.pc; let m = 0, u = t, K = 1;
      if (t >= START){ u = t - START; m = 1; while (m < 4 && u >= DUR[m]){ u -= DUR[m]; m++; } }
      clear();
      if (m === 0){
        const sc = setCam(view(1, MINV)); fillRange(0, 1, pc[0]); grout(0, 1, sc); thread(1, sc);
      } else {
        const E = ENDS[m], n0 = SIZES[m-1], n1 = SIZES[m], e = ease(Math.min(1, u / ZOOM));
        const sc = setCam(mix(view(n0, MINV), view(n1, MINV), e));
        if (m >= 2){ const E0 = ENDS[m-1]; for (let j = 0; j < 8; j++) fillRange(j ? E0[j-1] : 0, E0[j], pc[j]); }
        fillRange(0, n0, pc[0], m >= 2 ? Math.min(1, u / 0.7) : 1);
        ghost(n0, n1, sc, e);
        let shown = n0; K = n0;
        for (let j = 1; j < 8; j++){
          const s = ZOOM + (j - 1) * PIECE[m]; if (u <= s) break;
          const f = Math.min(1, (u - s) / PIECE[m]), a = E[j-1], b = E[j];
          fillRange(a, b, pc[j], Math.min(1, f * 2.5)); shown = b; K = a + Math.max(1, Math.round(f * (b - a)));
        }
        grout(0, shown, sc); thread(K, sc, E.slice(0, 7));
      }
      say(CAPS[m][0], CAPS[m][1]);
      if (read) read.textContent = num(K) + (K === 1 ? ' tile' : ' tiles');
      if (pos){ pos.max = 1000; pos.value = Math.round(1000 * t / TOTAL); }
    }
    function draw(){
      if (S.mode === 'build') drawBuild(); else drawThread();
      const th = S.mode === 'thread', bu = !th;
      if (playB) playB.textContent = th && S.playing ? 'Pause' : (th && S.k > 0 && S.k < S.n ? 'Resume' : 'Draw it');
      if (buildB) buildB.textContent = bu && S.playing ? 'Pause' : (bu && S.t > 0 && S.t < TOTAL ? 'Resume' : 'Build it up');
      root.querySelectorAll('[data-level]').forEach(b => b.setAttribute('aria-pressed', String(th && SIZES[+b.dataset.level] === S.n)));
    }
    function setMode(mode){ if (S.mode !== mode){ S.mode = mode; S.playing = false; layout(); } }

    let last = 0, acc = 0;
    function tick(ts){
      if (!S.playing) return;
      const dt = Math.min(0.1, (ts - last) / 1000); last = ts;
      if (S.mode === 'build'){ S.t += dt; if (S.t >= TOTAL){ S.t = TOTAL; S.playing = false; } draw(); }
      else {
        acc += dt * S.n / (S.n > 1000 ? 24 : 14); const step = Math.floor(acc);
        if (step > 0){ acc -= step; S.k = Math.min(S.n, S.k + step); if (S.k >= S.n) S.playing = false; draw(); }
      }
      if (S.playing) requestAnimationFrame(tick);
    }
    // With reduced motion, a press jumps to the end instead of animating; the slider still scrubs.
    function go(){
      if (reduceMotion){ if (S.mode === 'build') S.t = TOTAL; else S.k = S.n; S.playing = false; draw(); return; }
      S.playing = true; acc = 0; last = performance.now(); draw(); requestAnimationFrame(tick);
    }
    buildB?.addEventListener('click', () => {
      setHi(-1); if (S.mode !== 'build'){ setMode('build'); S.t = 0; }
      else if (S.playing){ S.playing = false; draw(); return; }
      if (S.t >= TOTAL) S.t = 0;
      go();
    });
    playB?.addEventListener('click', () => {
      setHi(-1); if (S.mode !== 'thread'){ setMode('thread'); S.k = 0; }
      else if (S.playing){ S.playing = false; draw(); return; }
      if (S.k >= S.n) S.k = 0;
      go();
    });
    pos?.addEventListener('input', () => {
      S.playing = false;
      if (S.mode === 'build') S.t = (+pos.value / 1000) * TOTAL; else S.k = Math.round(+pos.value);
      draw();
    });
    thr?.addEventListener('change', draw);
    root.querySelectorAll('[data-level]').forEach(b => b.addEventListener('click', () => {
      setHi(-1); S.mode = 'thread'; S.playing = false; S.n = SIZES[+b.dataset.level]; S.k = S.n; colours(); layout(); draw();
    }));
    root.querySelectorAll('[data-pal]').forEach(b => {
      b.style.background = 'linear-gradient(90deg,' + PAL[b.dataset.pal].join(',') + ')';
      b.addEventListener('click', () => {
        S.pal = b.dataset.pal; root.querySelectorAll('[data-pal]').forEach(c => c.setAttribute('aria-pressed', String(c === b)));
        colours(); draw(); drawPalette();
      });
    });

    // the palette of marked tiles
    root.querySelectorAll('[data-role="npal"]').forEach(e => e.textContent = PALETTE.length);
    const pcv = !grid ? [] : PALETTE.map((p, i) => {
      const b = document.createElement('button'), c = document.createElement('canvas'), s = document.createElement('span');
      b.type = 'button'; b.setAttribute('aria-pressed', 'false'); b.setAttribute('aria-label', 'Marked tile ' + (i + 1) + ', used by ' + p[2] + ' tiles');
      s.textContent = p[2] < 3 ? p[2] + (p[2] === 1 ? ' tile' : ' tiles') : (100 * p[2] / N4).toFixed(1) + '%'; b.appendChild(c); b.appendChild(s); grid.appendChild(b);
      b.addEventListener('click', () => { setHi(S.hi === i ? -1 : i); S.mode = 'thread'; S.playing = false; S.n = N4; S.k = N4; colours(); layout(); draw(); });
      return c;
    });
    function setHi(i){ S.hi = i; pcv.forEach((c, j) => c.parentElement.setAttribute('aria-pressed', String(j === i))); }
    function drawPalette(){
      if (!pcv.length) return;
      const dpr = Math.min(3, window.devicePixelRatio || 1), px = Math.round(64 * dpr);
      let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9, sx = 0, sy = 0;
      SHAPE.forEach(p => { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); sx += p[0] / 14; sy += p[1] / 14; });
      const sc = (px - 10 * dpr) / Math.max(x1 - x0, y1 - y0), mid = j => [(SHAPE[j][0] + SHAPE[(j+1) % 14][0]) / 2, (SHAPE[j][1] + SHAPE[(j+1) % 14][1]) / 2];
      pcv.forEach((c, i) => {
        c.width = c.height = px; const g = c.getContext('2d'), a = mid(PALETTE[i][0]), b = mid(PALETTE[i][1]);
        g.setTransform(sc, 0, 0, -sc, px/2 - (x0+x1)/2*sc, px/2 + (y0+y1)/2*sc); g.lineJoin = g.lineCap = 'round';
        g.beginPath(); SHAPE.forEach((p, j) => j ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.closePath();
        g.fillStyle = colorAt(PAL[S.pal], i / (PALETTE.length - 1)); g.fill();
        const ux = (b[0] - a[0]) / 6, uy = (b[1] - a[1]) / 6;      // same spline as the thread: edge, centre, edge
        g.beginPath(); g.moveTo(a[0], a[1]);
        g.bezierCurveTo(a[0] + (sx - a[0]) / 6, a[1] + (sy - a[1]) / 6, sx - ux, sy - uy, sx, sy);
        g.bezierCurveTo(sx + ux, sy + uy, b[0] - (b[0] - sx) / 6, b[1] - (b[1] - sy) / 6, b[0], b[1]);
        g.globalAlpha = 0.55; g.strokeStyle = S.tok.casing; g.lineWidth = 0.52; g.stroke();
        g.globalAlpha = 1; g.strokeStyle = S.tok.thread; g.lineWidth = 0.3; g.stroke();
        [a, b].forEach(q => { g.beginPath(); g.arc(q[0], q[1], 0.2, 0, 6.2832); g.fillStyle = S.tok.accent; g.fill(); });
      });
    }
    // The site switches themes with a class on <body>; redraw with the new colours.
    const retheme = () => { tokens(); draw(); drawPalette(); };
    new MutationObserver(retheme).observe(document.body, { attributes: true, attributeFilter: ['class'] });
    let rw = cv.parentElement.clientWidth;
    new ResizeObserver(() => { const w = cv.parentElement.clientWidth; if (w !== rw){ rw = w; layout(); draw(); } }).observe(cv.parentElement);
    const kind = root.dataset.spectre, start = kind === 'marks' ? 4 : 3;
    if (kind === 'build'){ S.mode = 'build'; S.t = 0; }
    tokens(); S.n = SIZES[start]; S.k = S.n; colours(); layout(); draw(); drawPalette();
  }
})();
