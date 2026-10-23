// The Charmera darkroom: an approximate capture path followed by one of seven
// film modes, rendered locally on an 800×600 working surface.
(() => {
  const root = document.getElementById('charmera-darkroom');
  if (!root) return;

  const W = 800, H = 600, N = W * H, SIZE = 17, LUT_BYTES = SIZE ** 3 * 3;
  const BASE = '/static/charmera/';

  const MODES = [
    { id: 'FILM', key: '01_GOLD_200', teacher: 'Kodak Gold 200',
      note: 'Leave it here. Warm, friendly and forgiving with daylight and direct flash.' },
    { id: 'PEOPLE', key: '02_PORTRA', teacher: 'Portra',
      note: 'Gentler skin and highlights. The first mode to cut if FILM flatters people just as well.' },
    { id: 'TOKYO', key: '03_SUPERIA_400_PROXY', teacher: 'a Superia-like proxy',
      note: 'The cooler, greener counterpoint to FILM for stations, signs and cloudy streets.' },
    { id: 'NIGHT', key: '04_800T', teacher: 'CineStill 800T', halation: true,
      note: 'Tungsten colour plus a red-biased glow around bright points. The LUT can hold the colour but not the glow.' },
    { id: 'B&W', key: '05_TRI_X', teacher: 'Kodak Tri-X',
      note: 'For hard sun and direct flash. Weak white balance and chroma noise stop mattering.' },
    { id: 'VIVID', key: '06_VELVIA', teacher: 'Fuji Velvia',
      note: 'Colour as the subject. Unsafe for skin, on purpose.' },
    { id: 'EXPIRED', key: '07_EXPIRED_PROXY', teacher: 'an expired-film proxy', expired: true,
      note: 'Every frame drifts a little differently in white balance, shadow tint and contrast.' },
  ];

  const SCENES = [
    { id: 'hakone-torii', title: 'Hakone', alt: 'A red torii at the edge of Lake Ashi below a hillside of autumn cedars.' },
    { id: 'akama-jingu', title: 'Shimonoseki', alt: 'The red and white gate of Akama Shrine under a clear blue sky.' },
    { id: 'kudanshita', title: 'Kudanshita', alt: 'A tree frames water, with late sun on pale grasses in the foreground.' },
    { id: 'otaru-window', title: 'Otaru', alt: 'Two chairs face a bright window over the sea from a dark hotel room.' },
    { id: 'kyu-nakagawa', title: 'Tokyo', alt: 'A river at dusk leads to the Tokyo skyline and Skytree under a pink sky.' },
    { id: 'hakone-night', title: 'Hakone, night', alt: 'Branches lit orange against a starry night sky.' },
    { id: 'asahikawa', title: 'Asahikawa', alt: 'Deep snow drifts under a bright winter sun.' },
  ];

  const state = { scene: SCENES[0].id, mode: 0, engine: 'lut', capture: true, frame: 1 };
  const sources = new Map();
  const captures = new Map();
  let luts, students, renderToken = 0;

  const $ = selector => root.querySelector(selector);
  const before = $('.darkroom-before'), after = $('.darkroom-after');
  const stage = $('.darkroom-stage'), split = $('.darkroom-split');
  const status = $('.darkroom-status'), note = $('.darkroom-note'), meta = $('.darkroom-meta');
  const afterLabel = $('.darkroom-label-after');

  // Small deterministic random source so a scene's sensor noise and an
  // EXPIRED frame look the same every time they are rendered.
  const random = seed => () => {
    seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const gaussian = rand => {
    const u = rand() || 1e-9, v = rand();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };
  const clamp = v => (v < 0 ? 0 : v > 255 ? 255 : v);

  // Crop any picture to the camera's 4:3 frame and read it as float RGB.
  const readPixels = image => {
    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const iw = image.width, ih = image.height;
    const scale = Math.max(W / iw, H / ih);
    const sw = W / scale, sh = H / scale;
    ctx.drawImage(image, (iw - sw) / 2, (ih - sh) / 2, sw, sh, 0, 0, W, H);
    const data = ctx.getImageData(0, 0, W, H).data;
    const rgb = new Float32Array(N * 3);
    for (let i = 0, p = 0; i < N; i++, p += 4) {
      rgb[i * 3] = data[p]; rgb[i * 3 + 1] = data[p + 1]; rgb[i * 3 + 2] = data[p + 2];
    }
    return rgb;
  };

  // An illustration of the traced still path, not a calibrated sensor model:
  // optical/resampling softness, a noisy small sensor and 4:2:0 chroma.
  const simulateCapture = (rgb, seed) => {
    const soft = new Float32Array(rgb.length), out = new Float32Array(rgb.length);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const l = Math.max(x - 1, 0), r = Math.min(x + 1, W - 1);
      for (let c = 0; c < 3; c++) {
        const row = y * W;
        soft[(row + x) * 3 + c] = (rgb[(row + l) * 3 + c] + 2 * rgb[(row + x) * 3 + c] + rgb[(row + r) * 3 + c]) / 4;
      }
    }
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const u = Math.max(y - 1, 0), d = Math.min(y + 1, H - 1);
      for (let c = 0; c < 3; c++) {
        out[(y * W + x) * 3 + c] = (soft[(u * W + x) * 3 + c] + 2 * soft[(y * W + x) * 3 + c] + soft[(d * W + x) * 3 + c]) / 4;
      }
    }
    const rand = random(seed);
    const Y = new Float32Array(N), cb = new Float32Array(N), cr = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      const r = out[i * 3], g = out[i * 3 + 1], b = out[i * 3 + 2];
      const luma = 0.299 * r + 0.587 * g + 0.114 * b;
      const dark = 1 - luma / 255;
      Y[i] = luma + gaussian(rand) * (1.5 + 7 * dark * dark);
      cb[i] = (b - luma) / 1.772; cr[i] = (r - luma) / 1.402;
    }
    for (let y = 0; y < H; y += 2) for (let x = 0; x < W; x += 2) {
      const block = [y * W + x, y * W + x + 1, (y + 1) * W + x, (y + 1) * W + x + 1];
      const dark = 1 - Y[block[0]] / 255;
      const nb = gaussian(rand) * 2.5 * dark, nr = gaussian(rand) * 2.5 * dark;
      let sb = 0, sr = 0;
      for (const i of block) { sb += cb[i]; sr += cr[i]; }
      for (const i of block) { cb[i] = sb / 4 + nb; cr[i] = sr / 4 + nr; }
    }
    for (let i = 0; i < N; i++) {
      const r = Y[i] + 1.402 * cr[i], b = Y[i] + 1.772 * cb[i];
      out[i * 3] = clamp(r);
      out[i * 3 + 1] = clamp((Y[i] - 0.299 * r - 0.114 * b) / 0.587);
      out[i * 3 + 2] = clamp(b);
    }
    return out;
  };

  // Trilinear lookup in a 17³ RGB8 table, the representation the camera could store.
  const applyLut = (src, mode) => {
    const lut = luts, base = mode * LUT_BYTES, out = new Float32Array(src.length);
    const s = (SIZE - 1) / 255, dg = SIZE * 3, db = SIZE * SIZE * 3;
    for (let i = 0; i < src.length; i += 3) {
      const r = src[i] * s, g = src[i + 1] * s, b = src[i + 2] * s;
      const r0 = Math.min(r | 0, SIZE - 2), g0 = Math.min(g | 0, SIZE - 2), b0 = Math.min(b | 0, SIZE - 2);
      const fr = r - r0, fg = g - g0, fb = b - b0;
      const origin = base + ((b0 * SIZE + g0) * SIZE + r0) * 3;
      for (let c = 0; c < 3; c++) {
        const k = origin + c;
        const c00 = lut[k] + (lut[k + 3] - lut[k]) * fr;
        const c10 = lut[k + dg] + (lut[k + dg + 3] - lut[k + dg]) * fr;
        const c01 = lut[k + db] + (lut[k + db + 3] - lut[k + db]) * fr;
        const c11 = lut[k + db + dg] + (lut[k + db + dg + 3] - lut[k + db + dg]) * fr;
        const c0 = c00 + (c10 - c00) * fg, c1 = c01 + (c11 - c01) * fg;
        out[i + c] = c0 + (c1 - c0) * fb;
      }
    }
    return out;
  };

  // The hardware-shaped student: a 256-entry luma curve and a 3×3 YUV matrix
  // fitted offline to each LUT (Q8.8 coefficients, as the scaler would take them).
  const applyStudent = (src, mode) => {
    const fit = students[MODES[mode].key];
    const m = fit.matrix.map(row => row.map(v => v / 256)), curve = fit.curve;
    const out = new Float32Array(src.length);
    for (let i = 0; i < src.length; i += 3) {
      const r = src[i] / 255, g = src[i + 1] / 255, b = src[i + 2] / 255;
      const y = 0.299 * r + 0.587 * g + 0.114 * b;
      const u = (b - y) / 1.772, v = (r - y) / 1.402;
      const yc = curve[Math.round(Math.min(Math.max(y, 0), 1) * 255)] / 255;
      const Y = m[0][0] * yc + m[0][1] * u + m[0][2] * v;
      const U = m[1][0] * yc + m[1][1] * u + m[1][2] * v;
      const V = m[2][0] * yc + m[2][1] * u + m[2][2] * v;
      const R = Y + 1.402 * V, B = Y + 1.772 * U;
      out[i] = clamp(R * 255);
      out[i + 1] = clamp(((Y - 0.299 * R - 0.114 * B) / 0.587) * 255);
      out[i + 2] = clamp(B * 255);
    }
    return out;
  };

  // NIGHT's spatial residual: threshold highlights at quarter resolution,
  // blur them, and add the glow back with a red bias.
  const addHalation = rgb => {
    const q = 4, w = W / q, h = H / q;
    let mask = new Float32Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      let sum = 0;
      for (let dy = 0; dy < q; dy++) for (let dx = 0; dx < q; dx++) {
        const i = ((y * q + dy) * W + x * q + dx) * 3;
        const luma = (0.299 * rgb[i] + 0.587 * rgb[i + 1] + 0.114 * rgb[i + 2]) / 255;
        const over = Math.max(0, (luma - 0.6) / 0.4);
        sum += over * over;
      }
      mask[y * w + x] = sum / (q * q);
    }
    const radius = 4;
    for (let pass = 0; pass < 3; pass++) {
      const tmp = new Float32Array(w * h);
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        let sum = 0;
        for (let k = -radius; k <= radius; k++) sum += mask[y * w + Math.min(Math.max(x + k, 0), w - 1)];
        tmp[y * w + x] = sum / (2 * radius + 1);
      }
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        let sum = 0;
        for (let k = -radius; k <= radius; k++) sum += tmp[Math.min(Math.max(y + k, 0), h - 1) * w + x];
        mask[y * w + x] = sum / (2 * radius + 1);
      }
    }
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const fx = Math.min(Math.max((x + 0.5) / q - 0.5, 0), w - 1.001), fy = Math.min(Math.max((y + 0.5) / q - 0.5, 0), h - 1.001);
      const x0 = fx | 0, y0 = fy | 0, ax = fx - x0, ay = fy - y0;
      const top = mask[y0 * w + x0] * (1 - ax) + mask[y0 * w + x0 + 1] * ax;
      const bottom = mask[(y0 + 1) * w + x0] * (1 - ax) + mask[(y0 + 1) * w + x0 + 1] * ax;
      const glow = (top * (1 - ay) + bottom * ay) * 255;
      const i = (y * W + x) * 3;
      rgb[i] = clamp(rgb[i] + 2.4 * glow);
      rgb[i + 1] = clamp(rgb[i + 1] + 0.75 * glow);
      rgb[i + 2] = clamp(rgb[i + 2] + 0.2 * glow);
    }
  };

  // EXPIRED's identity is uncertainty: each frame gets its own seeded drift.
  const addExpiredDrift = (rgb, frame) => {
    const rand = random(frame * 7919);
    const gainR = 1 + (rand() - 0.5) * 0.16, gainB = 1 + (rand() - 0.5) * 0.16;
    const angle = rand() * Math.PI * 2, strength = 10 + rand() * 16;
    const tint = [Math.cos(angle), Math.cos(angle - 2.094), Math.cos(angle + 2.094)].map(v => v * strength);
    const contrast = 0.84 + rand() * 0.24, lift = 4 + rand() * 18;
    for (let i = 0; i < rgb.length; i += 3) {
      const luma = (0.299 * rgb[i] + 0.587 * rgb[i + 1] + 0.114 * rgb[i + 2]) / 255;
      const shadow = (1 - luma) * (1 - luma);
      const gains = [gainR, 1, gainB];
      for (let c = 0; c < 3; c++) {
        let v = (rgb[i + c] * gains[c] - 128) * contrast + 128 + tint[c] * shadow;
        rgb[i + c] = clamp(lift + v * (1 - lift / 255));
      }
    }
  };

  const toCanvas = async (canvas, rgb, jpeg) => {
    const image = new ImageData(W, H);
    for (let i = 0, p = 0; i < N; i++, p += 4) {
      image.data[p] = rgb[i * 3]; image.data[p + 1] = rgb[i * 3 + 1]; image.data[p + 2] = rgb[i * 3 + 2]; image.data[p + 3] = 255;
    }
    if (!jpeg) return () => canvas.getContext('2d').putImageData(image, 0, 0);
    // The camera's last step is a hardware JPEG encoder, so the simulated path ends in one too.
    const scratch = document.createElement('canvas');
    scratch.width = W; scratch.height = H;
    scratch.getContext('2d').putImageData(image, 0, 0);
    const blob = await new Promise(resolve => scratch.toBlob(resolve, 'image/jpeg', 0.8));
    const bitmap = blob ? await createImageBitmap(blob) : scratch;
    return () => canvas.getContext('2d').drawImage(bitmap, 0, 0);
  };

  const loadImage = src => new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });

  const sourceFor = async id => {
    if (!sources.has(id)) sources.set(id, readPixels(await loadImage(`${BASE}scenes/${id}.webp`)));
    return sources.get(id);
  };

  const captureFor = async id => {
    const key = `${id}:${state.capture}`;
    if (!captures.has(key)) {
      const src = await sourceFor(id);
      captures.set(key, state.capture ? simulateCapture(src, id.length * 131 + 17) : src);
    }
    return captures.get(key);
  };

  const sceneTitle = () => SCENES.find(scene => scene.id === state.scene)?.title ?? 'your photo';

  const describe = () => {
    const mode = MODES[state.mode];
    afterLabel.textContent = mode.id;
    note.textContent = mode.note;
    const fit = students[mode.key];
    const engine = state.engine === 'lut'
      ? `Full 17³ LUT · ${mode.teacher} teacher`
      : `Curve + 3×3 matrix · ${fit.psnr} dB against the full LUT`;
    meta.textContent = mode.expired ? `${engine} · frame ${String(state.frame).padStart(2, '0')}` : engine;
    root.querySelector('.darkroom-reshoot').hidden = !mode.expired;
    before.setAttribute('aria-label', `${sceneTitle()} before the film mode`);
    after.setAttribute('aria-label', `${sceneTitle()} rendered in ${mode.id} mode`);
  };

  const render = async () => {
    if (!luts) return;
    const token = ++renderToken;
    describe();
    status.textContent = 'Developing…';
    stage.setAttribute('aria-busy', 'true');
    await new Promise(requestAnimationFrame);
    const input = await captureFor(state.scene);
    if (token !== renderToken) return;
    const mode = MODES[state.mode];
    const output = state.engine === 'lut' ? applyLut(input, state.mode) : applyStudent(input, state.mode);
    if (mode.halation) addHalation(output);
    if (mode.expired) addExpiredDrift(output, state.frame);
    const [drawBefore, drawAfter] = await Promise.all([toCanvas(before, input, state.capture), toCanvas(after, output, state.capture)]);
    if (token !== renderToken) return;
    drawBefore(); drawAfter();
    stage.setAttribute('aria-busy', 'false');
    status.textContent = `${sceneTitle()}, ${mode.id}.`;
  };

  const press = (group, value) => group.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.value === value)));

  // Build controls.
  const modeButtons = MODES.map((mode, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = mode.id;
    button.dataset.value = String(index);
    button.addEventListener('click', () => { state.mode = index; press(modeButtons, String(index)); render(); });
    $('.darkroom-modes').append(button);
    return button;
  });

  const sceneList = $('.darkroom-scenes');
  const sceneButtons = SCENES.map(scene => {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.value = scene.id;
    button.title = scene.title;
    button.innerHTML = `<img src="${BASE}scenes/${scene.id}-thumb.webp" alt="" width="80" height="60" loading="lazy"><span class="visually-hidden">${scene.title}: ${scene.alt}</span>`;
    button.addEventListener('click', () => { state.scene = scene.id; press(sceneButtons, scene.id); render(); });
    sceneList.append(button);
    return button;
  });

  const upload = $('.darkroom-upload input');
  upload.addEventListener('change', async () => {
    const file = upload.files?.[0];
    if (!file) return;
    try {
      const bitmap = await createImageBitmap(file);
      const id = `upload-${Date.now()}`;
      sources.set(id, readPixels(bitmap));
      state.scene = id;
      press(sceneButtons, id);
      render();
    } catch {
      status.textContent = 'That file could not be read as an image.';
    }
  });

  root.querySelectorAll('.darkroom-engine button').forEach((button, _, all) => {
    button.addEventListener('click', () => { state.engine = button.dataset.value; press([...all], state.engine); render(); });
  });
  $('.darkroom-capture').addEventListener('change', event => { state.capture = event.target.checked; render(); });
  $('.darkroom-reshoot').addEventListener('click', () => { state.frame += 1; render(); });

  const setSplit = value => {
    after.style.clipPath = `inset(0 0 0 ${value}%)`;
    stage.style.setProperty('--split', `${value}%`);
  };
  split.addEventListener('input', () => setSplit(split.value));
  setSplit(split.value);

  press(modeButtons, '0');
  press(sceneButtons, state.scene);
  press([...root.querySelectorAll('.darkroom-engine button')], state.engine);

  Promise.all([
    fetch(`${BASE}luts.bin`).then(response => response.arrayBuffer()),
    fetch(`${BASE}students.json`).then(response => response.json()),
  ]).then(([buffer, fits]) => {
    luts = new Uint8Array(buffer);
    students = fits;
    root.classList.add('is-ready');
    render();
  }).catch(() => { status.textContent = 'The darkroom could not load its film data.'; });
})();
