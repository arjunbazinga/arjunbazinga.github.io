// The style compiler, playable: pick a teacher, choose what the fit is scored
// on, and watch the camera-sized student converge on it in the browser.
(() => {
  const root = document.getElementById('charmera-compiler');
  if (!root || !window.Charmera) return;
  const C = window.Charmera;

  const W = 400, H = 300, PW = 160, PH = 120; // shown photo; photo-colour samples
  const SCENES = [
    { id: 'akama-jingu', title: 'Shimonoseki' },
    { id: 'hakone-torii', title: 'Hakone' },
    { id: 'charmera-street', title: 'Charmera: Tokyo street', real: true },
    { id: 'charmera-park', title: 'Charmera: park', real: true },
    { id: 'kudanshita', title: 'Kudanshita' },
    { id: 'otaru-window', title: 'Otaru' },
    { id: 'kyu-nakagawa', title: 'Tokyo at dusk' },
    { id: 'hakone-night', title: 'Hakone, night' },
    { id: 'asahikawa', title: 'Asahikawa' },
  ];
  const REFERENCE = -1; // teacher index for "match a photo"
  const STUDENT_BYTES = 256 + 9 * 2;

  const state = { teacher: 5, scene: 'akama-jingu', reference: 'kudanshita', weighting: 'cube', clip: false, neutral: true, diff: false };
  const shown = new Map(), pooled = new Map(), uploads = new Map();
  let film, cube, run = 0, last;

  const $ = selector => root.querySelector(selector);
  const teacherCanvas = $('.compiler-teacher'), studentCanvas = $('.compiler-student');
  const chart = $('.compiler-plot'), status = $('.compiler-status'), note = $('.compiler-note');
  const cubeScore = $('.compiler-score-cube b'), photoScore = $('.compiler-score-photo b'), photoLabel = $('.compiler-score-photo span');
  const progress = $('.compiler-progress'), matrixCells = [...root.querySelectorAll('.compiler-matrix td')];
  const studentTag = $('.compiler-tag-student');
  const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  const load = async (cache, id, w, h) => {
    if (!cache.has(id)) cache.set(id, uploads.has(id) ? C.readPixels(uploads.get(id), w, h)
      : C.readPixels(await C.loadImage(`${C.BASE}scenes/${id}.webp`), w, h));
    return cache.get(id);
  };
  const luma = (rgb, i) => (0.299 * rgb[i] + 0.587 * rgb[i + 1] + 0.114 * rgb[i + 2]) / 255;

  // "Match a photo": a classic statistics transfer, baked into a 17³ LUT so it
  // is compiled exactly like the film teachers. Tone comes from matching the
  // reference's brightness distribution to that of ordinary photos; colour from
  // matching chroma mean and covariance in shadows, mid-tones and highlights.
  const bandWeights = y => [(1 - y) * (1 - y), 2 * y * (1 - y), y * y];
  const chromaStats = pixels => {
    const stats = [0, 1, 2].map(() => ({ w: 0, mu: [0, 0], cov: [0, 0, 0] }));
    for (const rgb of pixels) for (let i = 0; i < rgb.length; i += 3) {
      const y = luma(rgb, i), u = (rgb[i + 2] / 255 - y) / 1.772, v = (rgb[i] / 255 - y) / 1.402;
      bandWeights(y).forEach((w, b) => { const s = stats[b]; s.w += w; s.mu[0] += w * u; s.mu[1] += w * v; s.cov[0] += w * u * u; s.cov[1] += w * u * v; s.cov[2] += w * v * v; });
    }
    for (const s of stats) {
      const w = Math.max(s.w, 1e-9);
      s.mu = s.mu.map(m => m / w);
      const uv = s.cov[1] / w - s.mu[0] * s.mu[1];
      s.cov = [s.cov[0] / w - s.mu[0] ** 2 + 1e-6, uv, uv, s.cov[2] / w - s.mu[1] ** 2 + 1e-6];
    }
    return stats;
  };
  // 2×2 matrices as [a, b, c, d], row-major.
  const mul2 = (p, q) => [p[0] * q[0] + p[1] * q[2], p[0] * q[1] + p[1] * q[3], p[2] * q[0] + p[3] * q[2], p[2] * q[1] + p[3] * q[3]];
  const sqrt2 = ([a, b, c, d]) => { const s = Math.sqrt(Math.max(a * d - b * c, 0)), t = Math.sqrt(a + d + 2 * s); return [(a + s) / t, b / t, c / t, (d + s) / t]; };
  const inv2 = ([a, b, c, d]) => { const k = a * d - b * c; return [d / k, -b / k, -c / k, a / k]; };
  // Monge–Kantorovich linear map from covariance S to covariance R (Pitié and Kokaram, 2007).
  const mkMap = (S, R) => { const s = sqrt2(S), si = inv2(s); return mul2(mul2(si, sqrt2(mul2(mul2(s, R), s))), si); };
  const histogramCdf = pixels => {
    const hist = new Float64Array(256);
    let n = 0;
    for (const rgb of pixels) for (let i = 0; i < rgb.length; i += 3) { hist[Math.round(luma(rgb, i) * 255)]++; n++; }
    let sum = 0;
    return Array.from(hist, h => (sum += h) / n);
  };
  const referenceLut = (reference, pool, neutral) => {
    const source = histogramCdf(pool), target = histogramCdf([reference]);
    const tone = source.map(p => { let k = 0; while (k < 255 && target[k] < p) k++; return k / 255; });
    const smooth = tone.map((_, k) => { let s = 0, n = 0; for (let j = Math.max(0, k - 4); j <= Math.min(255, k + 4); j++) { s += tone[j]; n++; } return s / n; });
    const from = chromaStats(pool), to = chromaStats([reference]);
    if (neutral) { // remove the reference's overall cast, keep how its tints move with brightness
      const mean = stats => [0, 1].map(c => stats.reduce((s, b) => s + b.w * b.mu[c], 0) / stats.reduce((s, b) => s + b.w, 0));
      const cast = mean(to).map((m, c) => m - mean(from)[c]);
      to.forEach(b => { b.mu = b.mu.map((m, c) => m - cast[c]); });
    }
    const maps = from.map((s, b) => mkMap(s.cov, to[b].cov));
    const lut = new Float32Array(C.LUT_BYTES), grid = cube;
    for (let i = 0; i < grid.length; i += 3) {
      const y = luma(grid, i), u = (grid[i + 2] / 255 - y) / 1.772, v = (grid[i] / 255 - y) / 1.402;
      let U = 0, V = 0;
      bandWeights(y).forEach((w, b) => {
        const m = maps[b], du = u - from[b].mu[0], dv = v - from[b].mu[1];
        U += w * (to[b].mu[0] + m[0] * du + m[1] * dv);
        V += w * (to[b].mu[1] + m[2] * du + m[3] * dv);
      });
      const Y = smooth[Math.round(y * 255)], R = Y + 1.402 * V, B = Y + 1.772 * U;
      lut[i] = C.clamp(Math.round(R * 255));
      lut[i + 1] = C.clamp(Math.round(((Y - 0.299 * R - 0.114 * B) / 0.587) * 255));
      lut[i + 2] = C.clamp(Math.round(B * 255));
    }
    return lut;
  };

  const teacherLut = async () => {
    if (state.teacher !== REFERENCE) return film.luts.subarray(state.teacher * C.LUT_BYTES, (state.teacher + 1) * C.LUT_BYTES);
    const pool = await Promise.all(SCENES.map(scene => load(pooled, scene.id, PW, PH)));
    return referenceLut(await load(pooled, state.reference, PW, PH), pool, state.neutral);
  };

  // Tone response on greys: the teacher's, the student's, and no change.
  const SVG = 'http://www.w3.org/2000/svg';
  const el = (name, attrs, parent) => {
    const node = document.createElementNS(SVG, name);
    for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
    parent?.append(node);
    return node;
  };
  const greys = Float32Array.from({ length: 256 * 3 }, (_, i) => Math.floor(i / 3));
  const greyLuma = rgb => Array.from({ length: 256 }, (_, k) => luma(rgb, k * 3) * 255);
  let plot;
  const drawChart = (teacherCurve, studentCurve, histogram) => {
    const width = Math.round(Math.min(Math.max(chart.parentElement.clientWidth, 260), 680)), height = width < 480 ? 200 : 220;
    const pad = { top: 10, right: 12, bottom: 34, left: 44 }, pw = width - pad.left - pad.right, ph = height - pad.top - pad.bottom;
    const x = v => pad.left + (v / 255) * pw, y = v => pad.top + ph - (v / 255) * ph;
    const path = values => 'M' + values.map((v, k) => `${x(k).toFixed(1)},${y(Math.min(Math.max(v, 0), 255)).toFixed(1)}`).join(' L');
    if (!plot || plot.width !== width) {
      chart.replaceChildren();
      chart.setAttribute('viewBox', `0 0 ${width} ${height}`);
      const grid = el('g', { class: 'exposure-grid' }, chart);
      for (let v = 0; v <= 255; v += 64) {
        el('line', { x1: pad.left, x2: pad.left + pw, y1: y(v), y2: y(v) }, grid);
        el('text', { x: pad.left - 6, y: y(v) + 4, 'text-anchor': 'end' }, grid).textContent = v;
        el('text', { x: x(v), y: pad.top + ph + 16, 'text-anchor': 'middle' }, grid).textContent = v;
      }
      el('text', { x: pad.left + pw / 2, y: height - 3, 'text-anchor': 'middle', class: 'exposure-axis-title' }, grid).textContent = 'Grey in';
      el('text', { x: 12, y: pad.top + ph / 2, transform: `rotate(-90 12 ${pad.top + ph / 2})`, 'text-anchor': 'middle', class: 'exposure-axis-title' }, grid).textContent = 'Brightness out';
      plot = {
        width,
        histogram: el('path', { class: 'compiler-histogram' }, chart),
        identity: el('path', { d: `M${x(0)},${y(0)} L${x(255)},${y(255)}`, class: 'meter-identity' }, chart),
        teacher: el('path', { class: 'compiler-line-teacher' }, chart),
        student: el('path', { class: 'compiler-line-student' }, chart),
      };
    }
    const peak = Math.max(...histogram, 1e-9);
    plot.histogram.setAttribute('d', `M${x(0)},${y(0)} ` + histogram.map((h, k) => `L${x(k * 8 + 4).toFixed(1)},${(pad.top + ph - (h / peak) * ph * 0.35).toFixed(1)}`).join(' ') + ` L${x(255)},${y(0)} Z`);
    plot.teacher.setAttribute('d', path(teacherCurve));
    plot.student.setAttribute('d', path(studentCurve));
  };

  const draw = (canvas, rgb) => canvas.getContext('2d').putImageData(C.toImageData(rgb, W, H), 0, 0);
  const differenceOf = (a, b) => {
    const out = new Float32Array(a.length);
    for (let i = 0; i < a.length; i += 3) {
      const v = C.clamp(((Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2])) / 3) * 4);
      out[i] = v; out[i + 1] = v; out[i + 2] = v;
    }
    return out;
  };
  const drawStudent = () => {
    if (!last) return;
    draw(studentCanvas, state.diff ? differenceOf(last.teacherPhoto, last.rendered) : last.rendered);
    studentTag.textContent = state.diff ? 'STUDENT · DIFFERENCE ×4' : `STUDENT · ${STUDENT_BYTES} BYTES`;
    studentCanvas.setAttribute('aria-label', `${sceneTitle(state.scene)} through the compiled student${state.diff ? ', shown as its difference from the teacher' : ''}`);
  };
  const sceneTitle = id => SCENES.find(scene => scene.id === id)?.title ?? 'your photo';
  const teacherName = () => (state.teacher === REFERENCE ? `a match for ${sceneTitle(state.reference)}` : C.MODES[state.teacher].id);

  const NOTES = {
    'cube:false': 'Every colour in the cube counts the same, and the fitter does not know the camera clips. This is how I fitted the first students.',
    'cube:true': 'Every colour still counts the same, but now the fitter knows the camera clips. Where the teacher’s colour is already at the edge, overshooting it costs nothing, so the budget goes to contrast.',
    'photos:false': 'Scored only on colours that occur in photographs, without clipping. The photo shown is held out: the fit sees the other eight.',
    'photos:true': 'Scored on colours that occur in photographs, with clipping simulated. The photo shown is held out, so its score is a fair test.',
  };

  const compile = async () => {
    if (!film) return;
    const token = ++run;
    status.textContent = 'Compiling…';
    root.querySelector('.compiler-stage').setAttribute('aria-busy', 'true');
    const lut = await teacherLut();
    const photo = await load(shown, state.scene, W, H);
    let x = cube, t = Float32Array.from(lut);
    if (state.weighting === 'photos') {
      const pool = await Promise.all(SCENES.filter(scene => scene.id !== state.scene).map(scene => load(pooled, scene.id, PW, PH)));
      x = new Float32Array(pool.reduce((n, p) => n + p.length, 0));
      let offset = 0;
      for (const p of pool) { x.set(p, offset); offset += p.length; }
      t = C.applyLut(x, lut, 0);
    }
    if (token !== run) return;

    const teacherPhoto = C.applyLut(photo, lut, 0), teacherCube = Float32Array.from(lut);
    const teacherCurve = greyLuma(C.applyLut(greys, lut, 0));
    const histogram = new Array(32).fill(0);
    for (let i = 0; i < photo.length; i += 3) histogram[Math.min(31, Math.floor(luma(photo, i) * 32))]++;
    draw(teacherCanvas, teacherPhoto);
    teacherCanvas.setAttribute('aria-label', `${sceneTitle(state.scene)} through the teacher, ${teacherName()}`);
    note.textContent = NOTES[`${state.weighting}:${state.clip}`];
    photoLabel.textContent = state.weighting === 'photos' ? 'This photo, held out' : 'This photo';

    const fit = C.createFit(x, t, { clip: state.clip });
    let student, cubeDb, photoDb;
    const show = () => {
      student = fit.student();
      const rendered = C.applyStudent(photo, student);
      cubeDb = C.psnr(C.applyStudent(cube, student), teacherCube);
      photoDb = C.psnr(rendered, teacherPhoto);
      last = { teacherPhoto, rendered, chart: [teacherCurve, greyLuma(C.applyStudent(greys, student)), histogram] };
      drawStudent();
      drawChart(...last.chart);
      cubeScore.textContent = `${cubeDb.toFixed(1)} dB`;
      photoScore.textContent = `${photoDb.toFixed(1)} dB`;
      progress.textContent = fit.steps ? `Step ${fit.steps} of ${C.FIT_STEPS}` : 'Before fitting: no change';
      student.matrix.flat().forEach((v, k) => { matrixCells[k].textContent = v; });
    };
    show();
    for (let k = 0; k < C.FIT_STEPS; k++) {
      fit.step();
      // Early steps change the most, so they get a frame each; later ones are batched.
      if (!reduceMotion && (k < 12 || k % 4 === 3 || k === C.FIT_STEPS - 1)) {
        await new Promise(requestAnimationFrame);
        if (token !== run) return;
        show();
      }
    }
    if (reduceMotion) show();
    root.querySelector('.compiler-stage').setAttribute('aria-busy', 'false');
    status.textContent = `${teacherName()} compiled: ${cubeDb.toFixed(1)} dB across every colour, ${photoDb.toFixed(1)} dB on ${sceneTitle(state.scene)}.`;
  };

  const press = (buttons, value) => buttons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.value === value)));
  const group = (selector, items, label, onPick) => {
    const container = $(selector);
    return items.map(item => {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.value = item.value;
      if (item.thumb) {
        button.title = item.label;
        button.innerHTML = `<img src="${C.BASE}scenes/${item.value}-thumb.webp" alt="" width="80" height="60" loading="lazy"><span class="visually-hidden">${label}: ${item.label}</span>`;
      } else button.textContent = item.label;
      button.addEventListener('click', () => onPick(item.value));
      container.append(button);
      return button;
    });
  };

  const referenceRow = $('.compiler-reference-wrap'), neutralBox = $('.compiler-neutral');
  const teacherButtons = group('.compiler-teachers', [...C.MODES.map((mode, k) => ({ value: String(k), label: mode.id })), { value: String(REFERENCE), label: 'MATCH A PHOTO' }], 'Teacher', value => {
    state.teacher = Number(value);
    press(teacherButtons, value);
    referenceRow.hidden = state.teacher !== REFERENCE;
    compile();
  });
  const referenceButtons = group('.compiler-references', SCENES.map(scene => ({ value: scene.id, label: scene.title, thumb: true })), 'Reference', value => {
    state.reference = value;
    press(referenceButtons, value);
    compile();
  });
  const upload = $('.compiler-upload input');
  upload.addEventListener('change', async () => {
    const file = upload.files?.[0];
    if (!file) return;
    try {
      const id = `upload-${Date.now()}`;
      uploads.set(id, await createImageBitmap(file));
      state.reference = id;
      press(referenceButtons, id);
      compile();
    } catch {
      status.textContent = 'That file could not be read as an image.';
    }
  });
  const weightButtons = [...root.querySelectorAll('.compiler-weighting button')];
  weightButtons.forEach(button => button.addEventListener('click', () => { state.weighting = button.dataset.value; press(weightButtons, state.weighting); compile(); }));
  const sceneButtons = group('.compiler-scenes', SCENES.map(scene => ({ value: scene.id, label: scene.title, thumb: true })), 'Test photo', value => {
    state.scene = value;
    press(sceneButtons, value);
    compile();
  });
  $('.compiler-clip').addEventListener('change', event => { state.clip = event.target.checked; compile(); });
  neutralBox.addEventListener('change', event => { state.neutral = event.target.checked; compile(); });
  $('.compiler-diff').addEventListener('change', event => { state.diff = event.target.checked; drawStudent(); });
  $('.compiler-again').addEventListener('click', compile);

  press(teacherButtons, String(state.teacher));
  press(referenceButtons, state.reference);
  press(weightButtons, state.weighting);
  press(sceneButtons, state.scene);
  let resizeTimer;
  window.addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(() => { plot = undefined; if (last) drawChart(...last.chart); }, 200); });

  const start = () => C.loadFilm().then(data => { film = data; cube = C.cubeInputs(); root.classList.add('is-ready'); compile(); })
    .catch(() => { status.textContent = 'The compiler could not load its film data.'; });
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      if (!entries.some(entry => entry.isIntersecting)) return;
      observer.disconnect();
      start();
    }, { rootMargin: '600px 0px' });
    observer.observe(root);
  } else start();
})();
