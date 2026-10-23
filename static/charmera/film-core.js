// Shared rendering for the Charmera essay: film LUTs, their hardware-shaped
// students, and an exact reimplementation of the stock Pixel filters.
(() => {
  const SIZE = 17, LUT_BYTES = SIZE ** 3 * 3;
  const BASE = '/static/charmera/';

  const MODES = [
    { id: 'FILM', key: '01_GOLD_200', teacher: 'Kodak Gold 200',
      note: 'Leave it here. Warm, friendly and forgiving with daylight and direct flash.' },
    { id: 'PEOPLE', key: '02_PORTRA', teacher: 'Portra',
      note: 'Gentler skin and highlights. The first mode to cut if FILM flatters people just as well.' },
    { id: 'TOKYO', key: '03_SUPERIA_400_PROXY', teacher: 'a Superia-like proxy',
      note: 'The cooler, greener counterpoint to FILM for stations, signs and cloudy streets.' },
    { id: 'NIGHT', key: '04_800T', teacher: 'CineStill 800T', halation: true,
      note: 'Tungsten colour plus a red-biased glow around bright points. The LUT holds the colour; the glow is a separate spatial step.' },
    { id: 'B&W', key: '05_TRI_X', teacher: 'Kodak Tri-X',
      note: 'For hard sun and direct flash. Weak white balance and chroma noise stop mattering.' },
    { id: 'VIVID', key: '06_VELVIA', teacher: 'Fuji Velvia',
      note: 'Colour as the subject. Unsafe for skin, on purpose.' },
    { id: 'EXPIRED', key: '07_EXPIRED_PROXY', teacher: 'an expired-film proxy', expired: true,
      note: 'Every frame drifts a little differently in white balance, shadow tint and contrast.' },
  ];

  // Stock Pixel filters, selectors 8–11: palette bytes (Y, U, V) and luma threshold
  // from the original loop at file 0x6E4DC.
  const PIXEL = [
    { id: 'PIXEL RED', selector: 8, y: 76, u: 85, v: 255 },
    { id: 'PIXEL BLUE', selector: 9, y: 27, u: 255, v: 108 },
    { id: 'PIXEL YELLOW', selector: 10, y: 207, u: 55, v: 158 },
    { id: 'PIXEL GRAY', selector: 11, y: 206, u: 118, v: 128 },
  ];
  const PIXEL_THRESHOLD = 124;

  const clamp = v => (v < 0 ? 0 : v > 255 ? 255 : v);

  // Small deterministic random source, so noise and EXPIRED frames repeat exactly.
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

  let filmData;
  const loadFilm = () => filmData ??= Promise.all([
    fetch(`${BASE}luts.bin`).then(response => { if (!response.ok) throw new Error('luts'); return response.arrayBuffer(); }),
    fetch(`${BASE}students.json`).then(response => { if (!response.ok) throw new Error('students'); return response.json(); }),
  ]).then(([buffer, students]) => ({ luts: new Uint8Array(buffer), students }));

  const loadImage = src => new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });

  // Cover-crop any picture to w×h and read it as float RGB (0–255).
  const readPixels = (image, w, h) => {
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.imageSmoothingQuality = 'high';
    const iw = image.width, ih = image.height, scale = Math.max(w / iw, h / ih);
    const sw = w / scale, sh = h / scale;
    ctx.drawImage(image, (iw - sw) / 2, (ih - sh) / 2, sw, sh, 0, 0, w, h);
    const data = ctx.getImageData(0, 0, w, h).data;
    const rgb = new Float32Array(w * h * 3);
    for (let i = 0, p = 0; p < data.length; i += 3, p += 4) {
      rgb[i] = data[p]; rgb[i + 1] = data[p + 1]; rgb[i + 2] = data[p + 2];
    }
    return rgb;
  };

  const toImageData = (rgb, w, h) => {
    const image = new ImageData(w, h);
    for (let i = 0, p = 0; i < rgb.length; i += 3, p += 4) {
      image.data[p] = rgb[i]; image.data[p + 1] = rgb[i + 1]; image.data[p + 2] = rgb[i + 2]; image.data[p + 3] = 255;
    }
    return image;
  };

  // Trilinear lookup in a 17³ RGB8 table, the representation the camera could store.
  const applyLut = (src, luts, mode) => {
    const base = mode * LUT_BYTES, out = new Float32Array(src.length);
    const s = (SIZE - 1) / 255, dg = SIZE * 3, db = SIZE * SIZE * 3;
    for (let i = 0; i < src.length; i += 3) {
      const r = src[i] * s, g = src[i + 1] * s, b = src[i + 2] * s;
      const r0 = Math.min(r | 0, SIZE - 2), g0 = Math.min(g | 0, SIZE - 2), b0 = Math.min(b | 0, SIZE - 2);
      const fr = r - r0, fg = g - g0, fb = b - b0;
      const origin = base + ((b0 * SIZE + g0) * SIZE + r0) * 3;
      for (let c = 0; c < 3; c++) {
        const k = origin + c;
        const c00 = luts[k] + (luts[k + 3] - luts[k]) * fr;
        const c10 = luts[k + dg] + (luts[k + dg + 3] - luts[k + dg]) * fr;
        const c01 = luts[k + db] + (luts[k + db + 3] - luts[k + db]) * fr;
        const c11 = luts[k + db + dg] + (luts[k + db + dg + 3] - luts[k + db + dg]) * fr;
        const c0 = c00 + (c10 - c00) * fg, c1 = c01 + (c11 - c01) * fg;
        out[i + c] = c0 + (c1 - c0) * fb;
      }
    }
    return out;
  };

  // The hardware-shaped student: a 256-entry luma curve, then a 3×3 matrix on
  // (Y, U, V), with Q8.8 coefficients fitted offline to each LUT.
  const applyStudent = (src, fit) => {
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

  // The stock Pixel loop walks VYUY pairs. Each pixel tests its own luma against
  // 124: bright pixels take the palette luma and write *their* chroma byte (V for
  // the first pixel, U for the second); dark pixels become Y=0 with neutral chroma.
  // A bright/dark pair therefore shares half a palette colour, which fringes edges.
  const applyPixelFilter = (src, w, pixel) => {
    const out = new Float32Array(src.length);
    const luma = i => Math.round(0.299 * src[i] + 0.587 * src[i + 1] + 0.114 * src[i + 2]);
    for (let i = 0; i < src.length; i += 6) {
      const first = luma(i) >= PIXEL_THRESHOLD, second = luma(i + 3) >= PIXEL_THRESHOLD;
      const V = (first ? pixel.v : 128) - 128, U = (second ? pixel.u : 128) - 128;
      const ys = [first ? pixel.y : 0, second ? pixel.y : 0];
      for (let k = 0; k < 2; k++) {
        const Y = ys[k], j = i + k * 3;
        out[j] = clamp(Y + 1.402 * V);
        out[j + 1] = clamp(Y - 0.344136 * U - 0.714136 * V);
        out[j + 2] = clamp(Y + 1.772 * U);
      }
    }
    return out;
  };

  // NIGHT's spatial residual: threshold strong highlights in any colour at
  // quarter resolution, blur them, and keep only the part that spills beyond
  // each highlight. That halo is screened back with a red bias, as light
  // scattered back from the film base re-exposes the red layer.
  const addHalation = (rgb, w, h) => {
    const q = 4, mw = w / q, mh = h / q;
    const mask = new Float32Array(mw * mh);
    const source = new Float32Array(mw * mh);
    for (let y = 0; y < mh; y++) for (let x = 0; x < mw; x++) {
      let sum = 0;
      for (let dy = 0; dy < q; dy++) for (let dx = 0; dx < q; dx++) {
        const i = ((y * q + dy) * w + x * q + dx) * 3;
        const over = Math.max(0, (Math.max(rgb[i], rgb[i + 1], rgb[i + 2]) / 255 - 0.72) / 0.28);
        sum += over * over;
      }
      mask[y * mw + x] = sum / (q * q);
    }
    source.set(mask);
    const radius = 4, tmp = new Float32Array(mw * mh);
    for (let pass = 0; pass < 3; pass++) {
      for (let y = 0; y < mh; y++) for (let x = 0; x < mw; x++) {
        let sum = 0;
        for (let k = -radius; k <= radius; k++) sum += mask[y * mw + Math.min(Math.max(x + k, 0), mw - 1)];
        tmp[y * mw + x] = sum / (2 * radius + 1);
      }
      for (let y = 0; y < mh; y++) for (let x = 0; x < mw; x++) {
        let sum = 0;
        for (let k = -radius; k <= radius; k++) sum += tmp[Math.min(Math.max(y + k, 0), mh - 1) * mw + x];
        mask[y * mw + x] = sum / (2 * radius + 1);
      }
    }
    for (let k = 0; k < mask.length; k++) mask[k] = Math.max(0, mask[k] - source[k]);
    const weights = [1, 0.32, 0.08];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const fx = Math.min(Math.max((x + 0.5) / q - 0.5, 0), mw - 1.001), fy = Math.min(Math.max((y + 0.5) / q - 0.5, 0), mh - 1.001);
      const x0 = fx | 0, y0 = fy | 0, ax = fx - x0, ay = fy - y0;
      const top = mask[y0 * mw + x0] * (1 - ax) + mask[y0 * mw + x0 + 1] * ax;
      const bottom = mask[(y0 + 1) * mw + x0] * (1 - ax) + mask[(y0 + 1) * mw + x0 + 1] * ax;
      const glow = Math.min(1, 2.2 * (top * (1 - ay) + bottom * ay)), i = (y * w + x) * 3;
      for (let c = 0; c < 3; c++) {
        const g = glow * weights[c];
        rgb[i + c] = 255 - (255 - rgb[i + c]) * (1 - g);
      }
    }
  };

  // EXPIRED's identity is uncertainty: each frame gets its own seeded drift.
  const addExpiredDrift = (rgb, frame) => {
    const rand = random(frame * 7919);
    const gains = [1 + (rand() - 0.5) * 0.16, 1, 1 + (rand() - 0.5) * 0.16];
    const angle = rand() * Math.PI * 2, strength = 10 + rand() * 16;
    const tint = [Math.cos(angle), Math.cos(angle - 2.094), Math.cos(angle + 2.094)].map(v => v * strength);
    const contrast = 0.84 + rand() * 0.24, lift = 4 + rand() * 18;
    for (let i = 0; i < rgb.length; i += 3) {
      const luma = (0.299 * rgb[i] + 0.587 * rgb[i + 1] + 0.114 * rgb[i + 2]) / 255;
      const shadow = (1 - luma) * (1 - luma);
      for (let c = 0; c < 3; c++) {
        const v = (rgb[i + c] * gains[c] - 128) * contrast + 128 + tint[c] * shadow;
        rgb[i + c] = clamp(lift + v * (1 - lift / 255));
      }
    }
  };

  // Render one of the seven film modes (index into MODES).
  const renderMode = (src, w, h, film, mode, { engine = 'lut', frame = 1 } = {}) => {
    const spec = MODES[mode];
    const out = engine === 'lut' ? applyLut(src, film.luts, mode) : applyStudent(src, film.students[spec.key]);
    if (spec.halation) addHalation(out, w, h);
    if (spec.expired) addExpiredDrift(out, frame);
    return out;
  };

  window.Charmera = {
    BASE, MODES, PIXEL, PIXEL_THRESHOLD, clamp, random, gaussian,
    loadFilm, loadImage, readPixels, toImageData, applyLut, applyStudent, applyPixelFilter, renderMode,
  };
})();
