// The Charmera darkroom: an approximate capture path followed by one of the
// seven film modes or a stock Pixel filter, rendered locally at 800×600.
(() => {
  const root = document.getElementById('charmera-darkroom');
  if (!root || !window.Charmera) return;
  const C = window.Charmera;

  const W = 800, H = 600, N = W * H;
  const SCENES = [
    { id: 'charmera-street', title: 'Charmera: Tokyo street', real: true, alt: 'A real Charmera photo: a cyclist blurs past a red pedestrian light under an elevated road.' },
    { id: 'charmera-park', title: 'Charmera: park', real: true, alt: 'A real Charmera photo: tall trees and a wooden footbridge in a park on an overcast day.' },
    { id: 'hakone-torii', title: 'Hakone', alt: 'A red torii at the edge of Lake Ashi below a hillside of autumn cedars.' },
    { id: 'akama-jingu', title: 'Shimonoseki', alt: 'The red and white gate of Akama Shrine under a clear blue sky.' },
    { id: 'kudanshita', title: 'Kudanshita', alt: 'A tree frames water, with late sun on pale grasses in the foreground.' },
    { id: 'otaru-window', title: 'Otaru', alt: 'Two chairs face a bright window over the sea from a dark hotel room.' },
    { id: 'kyu-nakagawa', title: 'Tokyo', alt: 'A river at dusk leads to the Tokyo skyline and Skytree under a pink sky.' },
    { id: 'hakone-night', title: 'Hakone, night', alt: 'Branches lit orange against a starry night sky.' },
    { id: 'asahikawa', title: 'Asahikawa', alt: 'Deep snow drifts under a bright winter sun.' },
  ];
  // Modes 0–6 are film modes; 7–10 are the stock Pixel filters.
  const ALL = [...C.MODES.map(mode => ({ ...mode, kind: 'film' })),
    ...C.PIXEL.map(pixel => ({ ...pixel, kind: 'pixel',
      note: 'Stock, reimplemented from the original loop: luma at or above 124 becomes the palette colour; below it, black. Look for coloured fringes on edges.' }))];

  const state = { scene: SCENES[0].id, mode: 0, engine: 'lut', capture: true, diff: false, frame: 1 };
  const isReal = () => SCENES.find(scene => scene.id === state.scene)?.real === true;
  const sources = new Map(), captures = new Map();
  let film, renderToken = 0;

  const $ = selector => root.querySelector(selector);
  const before = $('.darkroom-before'), after = $('.darkroom-after');
  const stage = $('.darkroom-stage'), split = $('.darkroom-split');
  const status = $('.darkroom-status'), note = $('.darkroom-note'), meta = $('.darkroom-meta');
  const afterLabel = $('.darkroom-label-after'), diffLabel = $('.darkroom-diff-label');

  // An illustration of the traced still path, not a calibrated sensor model:
  // optical/resampling softness, a noisy small sensor and 4:2:0 chroma.
  const simulateCapture = (rgb, seed) => {
    const soft = new Float32Array(rgb.length), out = new Float32Array(rgb.length);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const l = Math.max(x - 1, 0), r = Math.min(x + 1, W - 1), row = y * W;
      for (let c = 0; c < 3; c++) soft[(row + x) * 3 + c] = (rgb[(row + l) * 3 + c] + 2 * rgb[(row + x) * 3 + c] + rgb[(row + r) * 3 + c]) / 4;
    }
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const u = Math.max(y - 1, 0), d = Math.min(y + 1, H - 1);
      for (let c = 0; c < 3; c++) out[(y * W + x) * 3 + c] = (soft[(u * W + x) * 3 + c] + 2 * soft[(y * W + x) * 3 + c] + soft[(d * W + x) * 3 + c]) / 4;
    }
    const rand = C.random(seed);
    const Y = new Float32Array(N), cb = new Float32Array(N), cr = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      const r = out[i * 3], g = out[i * 3 + 1], b = out[i * 3 + 2];
      const luma = 0.299 * r + 0.587 * g + 0.114 * b, dark = 1 - luma / 255;
      Y[i] = luma + C.gaussian(rand) * (1.5 + 7 * dark * dark);
      cb[i] = (b - luma) / 1.772; cr[i] = (r - luma) / 1.402;
    }
    for (let y = 0; y < H; y += 2) for (let x = 0; x < W; x += 2) {
      const block = [y * W + x, y * W + x + 1, (y + 1) * W + x, (y + 1) * W + x + 1];
      const dark = 1 - Y[block[0]] / 255;
      const nb = C.gaussian(rand) * 2.5 * dark, nr = C.gaussian(rand) * 2.5 * dark;
      let sb = 0, sr = 0;
      for (const i of block) { sb += cb[i]; sr += cr[i]; }
      for (const i of block) { cb[i] = sb / 4 + nb; cr[i] = sr / 4 + nr; }
    }
    for (let i = 0; i < N; i++) {
      const r = Y[i] + 1.402 * cr[i], b = Y[i] + 1.772 * cb[i];
      out[i * 3] = C.clamp(r);
      out[i * 3 + 1] = C.clamp((Y[i] - 0.299 * r - 0.114 * b) / 0.587);
      out[i * 3 + 2] = C.clamp(b);
    }
    return out;
  };

  // Per-pixel distance between the full LUT and its hardware student, ×4.
  const difference = (a, b) => {
    const out = new Float32Array(a.length);
    let squared = 0;
    for (let i = 0; i < a.length; i += 3) {
      const dr = a[i] - b[i], dg = a[i + 1] - b[i + 1], db = a[i + 2] - b[i + 2];
      squared += dr * dr + dg * dg + db * db;
      const v = C.clamp(((Math.abs(dr) + Math.abs(dg) + Math.abs(db)) / 3) * 4);
      out[i] = v; out[i + 1] = v; out[i + 2] = v;
    }
    const rmse = Math.sqrt(squared / a.length);
    return { out, psnr: rmse === 0 ? Infinity : 20 * Math.log10(255 / rmse) };
  };

  const toCanvas = async (canvas, rgb, jpeg) => {
    const image = C.toImageData(rgb, W, H);
    if (!jpeg) return () => canvas.getContext('2d').putImageData(image, 0, 0);
    // The camera's last step is a hardware JPEG encoder, so the simulated path ends in one too.
    const scratch = document.createElement('canvas');
    scratch.width = W; scratch.height = H;
    scratch.getContext('2d').putImageData(image, 0, 0);
    const blob = await new Promise(resolve => scratch.toBlob(resolve, 'image/jpeg', 0.8));
    const bitmap = blob ? await createImageBitmap(blob) : scratch;
    return () => canvas.getContext('2d').drawImage(bitmap, 0, 0);
  };

  const sourceFor = async id => {
    if (!sources.has(id)) sources.set(id, C.readPixels(await C.loadImage(`${C.BASE}scenes/${id}.webp`), W, H));
    return sources.get(id);
  };
  // Real Charmera photos have already been through the camera, so they skip the simulation.
  const simulating = () => state.capture && !isReal();
  const captureFor = async id => {
    const key = `${id}:${simulating()}`;
    if (!captures.has(key)) {
      const src = await sourceFor(id);
      captures.set(key, simulating() ? simulateCapture(src, id.length * 131 + 17) : src);
    }
    return captures.get(key);
  };

  const sceneTitle = () => SCENES.find(scene => scene.id === state.scene)?.title ?? 'your photo';

  const describe = psnr => {
    const mode = ALL[state.mode], isFilm = mode.kind === 'film';
    afterLabel.textContent = state.diff && isFilm && state.engine === 'student' ? `${mode.id} · DIFFERENCE ×4` : mode.id;
    note.textContent = mode.note;
    let line;
    if (!isFilm) line = `Stock Pixel filter, selector ${mode.selector} · reimplemented from the original loop`;
    else if (state.engine === 'lut') line = `Full 17³ LUT · ${mode.teacher} teacher`;
    else {
      const fit = film.students[mode.key];
      line = `Curve + 3×3 matrix · ${fit.psnr} dB across the colour cube`;
      if (psnr !== undefined) line += ` · ${psnr.toFixed(1)} dB on this photo`;
    }
    if (mode.expired) line += ` · frame ${String(state.frame).padStart(2, '0')}`;
    meta.textContent = line;
    realNote.hidden = !isReal();
    captureBox.disabled = isReal();
    captureBox.checked = isReal() || state.capture;
    root.querySelector('.darkroom-reshoot').hidden = !mode.expired;
    root.querySelector('.darkroom-engine').hidden = !isFilm;
    diffLabel.hidden = !(isFilm && state.engine === 'student');
    before.setAttribute('aria-label', `${sceneTitle()} before the mode`);
    after.setAttribute('aria-label', `${sceneTitle()} rendered in ${mode.id}`);
  };

  const render = async () => {
    if (!film) return;
    const token = ++renderToken;
    describe();
    status.textContent = 'Developing…';
    stage.setAttribute('aria-busy', 'true');
    await new Promise(requestAnimationFrame);
    const input = await captureFor(state.scene);
    if (token !== renderToken) return;
    const mode = ALL[state.mode];
    let output, psnr;
    if (mode.kind === 'pixel') output = C.applyPixelFilter(input, W, mode);
    else {
      output = C.renderMode(input, W, H, film, state.mode, { engine: state.engine, frame: state.frame });
      if (state.engine === 'student') {
        const reference = C.renderMode(input, W, H, film, state.mode, { engine: 'lut', frame: state.frame });
        const diff = difference(reference, output);
        psnr = diff.psnr;
        if (state.diff) output = diff.out;
      }
    }
    const showingDiff = state.diff && mode.kind === 'film' && state.engine === 'student';
    const [drawBefore, drawAfter] = await Promise.all([toCanvas(before, input, simulating()), toCanvas(after, output, simulating() && !showingDiff)]);
    if (token !== renderToken) return;
    drawBefore(); drawAfter();
    describe(psnr);
    stage.setAttribute('aria-busy', 'false');
    status.textContent = `${sceneTitle()}, ${mode.id}${psnr !== undefined ? `, student ${psnr.toFixed(1)} dB` : ''}.`;
  };

  const press = (group, value) => group.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.value === value)));

  const makeModeButtons = (container, from, to) => ALL.slice(from, to).map((mode, k) => {
    const index = from + k, button = document.createElement('button');
    button.type = 'button';
    button.textContent = mode.kind === 'pixel' ? mode.id.replace('PIXEL ', '') : mode.id;
    if (mode.kind === 'pixel') button.setAttribute('aria-label', mode.id);
    button.dataset.value = String(index);
    button.addEventListener('click', () => { state.mode = index; press(modeButtons, String(index)); render(); });
    container.append(button);
    return button;
  });
  const modeButtons = [...makeModeButtons($('.darkroom-modes'), 0, 7), ...makeModeButtons($('.darkroom-stock'), 7, 11)];

  const sceneButtons = SCENES.map(scene => {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.value = scene.id;
    button.title = scene.title;
    if (scene.real) button.classList.add('is-real');
    button.innerHTML = `<img src="${C.BASE}scenes/${scene.id}-thumb.webp" alt="" width="80" height="60" loading="lazy">${scene.real ? '<span class="darkroom-real-badge" aria-hidden="true">Charmera</span>' : ''}<span class="visually-hidden">${scene.title}: ${scene.alt}</span>`;
    button.addEventListener('click', () => { state.scene = scene.id; press(sceneButtons, scene.id); render(); });
    $('.darkroom-scenes').append(button);
    return button;
  });

  const upload = $('.darkroom-upload input');
  upload.addEventListener('change', async () => {
    const file = upload.files?.[0];
    if (!file) return;
    try {
      const bitmap = await createImageBitmap(file);
      const id = `upload-${Date.now()}`;
      sources.set(id, C.readPixels(bitmap, W, H));
      state.scene = id;
      press(sceneButtons, id);
      render();
    } catch {
      status.textContent = 'That file could not be read as an image.';
    }
  });

  const engineButtons = [...root.querySelectorAll('.darkroom-engine button')];
  engineButtons.forEach(button => button.addEventListener('click', () => { state.engine = button.dataset.value; press(engineButtons, state.engine); render(); }));
  const captureBox = $('.darkroom-capture'), realNote = $('.darkroom-real-note');
  captureBox.addEventListener('change', event => { state.capture = event.target.checked; render(); });
  $('.darkroom-diff').addEventListener('change', event => { state.diff = event.target.checked; render(); });
  $('.darkroom-reshoot').addEventListener('click', () => { state.frame += 1; render(); });

  const setSplit = value => {
    after.style.clipPath = `inset(0 0 0 ${value}%)`;
    stage.style.setProperty('--split', `${value}%`);
  };
  split.addEventListener('input', () => setSplit(split.value));
  setSplit(split.value);

  press(modeButtons, '0');
  press(sceneButtons, state.scene);
  press(engineButtons, state.engine);

  // Load film data and develop the first frame only when the reader gets close.
  const start = () => C.loadFilm().then(data => { film = data; root.classList.add('is-ready'); render(); })
    .catch(() => { status.textContent = 'The darkroom could not load its film data.'; });
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      if (!entries.some(entry => entry.isIntersecting)) return;
      observer.disconnect();
      start();
    }, { rootMargin: '600px 0px' });
    observer.observe(root);
  } else start();
})();
