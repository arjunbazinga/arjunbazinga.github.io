// Frame maker: draw or upload a frame, see it composited exactly as the camera's
// frame routine does, and encode it in the firmware's own strip format.
(() => {
  const W = 800, H = 600, PAIRS = W / 2, ROWPAIR = W * 3, BYTES = ROWPAIR * (H / 2);
  const KEY = 140; // a pixel pair whose two lumas are both 140 lets the photo through

  // Full-range BT.601, as the camera's YUV surfaces use.
  const toY = (r, g, b) => 0.299 * r + 0.587 * g + 0.114 * b;
  const toU = (r, g, b) => -0.168736 * r - 0.331264 * g + 0.5 * b + 128;
  const toV = (r, g, b) => 0.5 * r - 0.418688 * g - 0.081312 * b + 128;
  const byte = v => (v < 0 ? 0 : v > 255 ? 255 : Math.round(v));

  // RGBA (800×600) -> row-pair 4:2:0 bytes: [Y even row][U,V per pixel pair][Y odd row].
  // Transparent pairs become the key; opaque pairs that land on the key by accident
  // are nudged one level so they don't become holes.
  const frameToRowPair = rgba => {
    const out = new Uint8Array(BYTES);
    let nudged = 0;
    const opaque = i => rgba[i * 4 + 3] >= 128;
    for (let p = 0; p < H / 2; p++) {
      const base = p * ROWPAIR;
      for (let k = 0; k < PAIRS; k++) {
        let su = 0, sv = 0, n = 0;
        for (let half = 0; half < 2; half++) {
          const y = 2 * p + half, i0 = y * W + 2 * k, i1 = i0 + 1;
          const row = base + (half ? 2 * W : 0) + 2 * k;
          if (!opaque(i0) && !opaque(i1)) { out[row] = KEY; out[row + 1] = KEY; continue; }
          // A pair is all frame or all photo, so a half-transparent pair borrows its opaque pixel.
          const a = opaque(i0) ? i0 : i1, b = opaque(i1) ? i1 : i0;
          let y0 = byte(toY(rgba[a * 4], rgba[a * 4 + 1], rgba[a * 4 + 2]));
          let y1 = byte(toY(rgba[b * 4], rgba[b * 4 + 1], rgba[b * 4 + 2]));
          if (y0 === KEY && y1 === KEY) { y1 = KEY + 1; nudged++; }
          out[row] = y0; out[row + 1] = y1;
          for (const i of [a, b]) {
            su += toU(rgba[i * 4], rgba[i * 4 + 1], rgba[i * 4 + 2]);
            sv += toV(rgba[i * 4], rgba[i * 4 + 1], rgba[i * 4 + 2]);
            n++;
          }
        }
        out[base + W + 2 * k] = n ? byte(su / n) : 128;
        out[base + W + 2 * k + 1] = n ? byte(sv / n) : 128;
      }
    }
    return { bytes: out, nudged };
  };

  // RGB float (0–255) photo -> row-pair bytes, chroma averaged over each 2×2 block.
  const photoToRowPair = rgb => {
    const out = new Uint8Array(BYTES);
    for (let p = 0; p < H / 2; p++) {
      const base = p * ROWPAIR;
      for (let x = 0; x < W; x++) {
        for (let half = 0; half < 2; half++) {
          const i = ((2 * p + half) * W + x) * 3;
          out[base + (half ? 2 * W : 0) + x] = byte(toY(rgb[i], rgb[i + 1], rgb[i + 2]));
        }
      }
      for (let k = 0; k < PAIRS; k++) {
        let su = 0, sv = 0;
        for (const [dy, dx] of [[0, 0], [0, 1], [1, 0], [1, 1]]) {
          const i = ((2 * p + dy) * W + 2 * k + dx) * 3;
          su += toU(rgb[i], rgb[i + 1], rgb[i + 2]); sv += toV(rgb[i], rgb[i + 1], rgb[i + 2]);
        }
        out[base + W + 2 * k] = byte(su / 4); out[base + W + 2 * k + 1] = byte(sv / 4);
      }
    }
    return out;
  };

  // The camera's rule (file 0xEDA4): for each row and pixel pair, if the frame's two
  // lumas are not both 140, copy them; on even rows also copy the pair's U,V.
  const compose = (photo, frame) => {
    const out = photo.slice();
    for (let p = 0; p < H / 2; p++) {
      const base = p * ROWPAIR;
      for (let half = 0; half < 2; half++) {
        const row = base + (half ? 2 * W : 0);
        for (let k = 0; k < PAIRS; k++) {
          const i = row + 2 * k;
          if (frame[i] === KEY && frame[i + 1] === KEY) continue;
          out[i] = frame[i]; out[i + 1] = frame[i + 1];
          if (!half) { out[base + W + 2 * k] = frame[base + W + 2 * k]; out[base + W + 2 * k + 1] = frame[base + W + 2 * k + 1]; }
        }
      }
    }
    return out;
  };

  const rowPairToImageData = bytes => {
    const image = new ImageData(W, H);
    for (let y = 0; y < H; y++) {
      const p = y >> 1, base = p * ROWPAIR, row = base + (y & 1 ? 2 * W : 0);
      for (let x = 0; x < W; x++) {
        const Y = bytes[row + x], U = bytes[base + W + (x & ~1)] - 128, V = bytes[base + W + (x & ~1) + 1] - 128;
        const o = (y * W + x) * 4;
        image.data[o] = byte(Y + 1.402 * V);
        image.data[o + 1] = byte(Y - 0.344136 * U - 0.714136 * V);
        image.data[o + 2] = byte(Y + 1.772 * U);
        image.data[o + 3] = 255;
      }
    }
    return image;
  };

  const isKeyPair = (bytes, row, k) => bytes[row + 2 * k] === KEY && bytes[row + 2 * k + 1] === KEY;

  window.CharmeraFrame = { W, H, KEY, frameToRowPair, photoToRowPair, compose, rowPairToImageData, isKeyPair };

  const root = typeof document !== 'undefined' && document.getElementById('charmera-frames');
  if (!root || !window.Charmera) return;
  const C = window.Charmera;

  const $ = s => root.querySelector(s);
  const preview = $('.frames-canvas'), status = $('.frames-status'), table = $('.frames-strips tbody');
  const caption = $('.frames-caption'), captionWrap = $('.frames-caption-wrap'), slotSelect = $('.frames-slot');
  const downloads = $('.frames-downloads'), verify = $('.frames-verify'), nudgedNote = $('.frames-nudged');
  const state = { template: 'film', photo: 'charmera-street', film: false, slot: 3, upload: null, holes: false };
  let slots, photoRgb = new Map(), film, frame, encoded;

  const art = document.createElement('canvas');
  art.width = W; art.height = H;
  const actx = art.getContext('2d', { willReadFrequently: true });

  const roundRect = (ctx, x, y, w, h, r) => { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); };

  // Original templates, drawn at the camera's 800×600 frame size. Cleared areas are see-through.
  const TEMPLATES = {
    film: { label: 'Film strip', caption: false, draw: ctx => {
      ctx.fillStyle = '#16120e'; ctx.fillRect(0, 0, W, H);
      roundRect(ctx, 24, 78, W - 48, H - 156, 18); ctx.save(); ctx.clip(); ctx.clearRect(0, 0, W, H); ctx.restore();
      ctx.fillStyle = '#3a332c';
      for (let x = 30; x < W; x += 62) { roundRect(ctx, x, 22, 34, 36, 6); ctx.fill(); roundRect(ctx, x, H - 58, 34, 36, 6); ctx.fill(); }
      ctx.fillStyle = '#f08a3c'; ctx.font = '600 20px ui-monospace, Menlo, monospace'; ctx.textBaseline = 'middle';
      ctx.fillText('▸ 23A', 34, 68); ctx.textAlign = 'right'; ctx.fillText('FILM 400  ◂ 24', W - 34, H - 68); ctx.textAlign = 'left';
    } },
    instant: { label: 'Instant', caption: 'Tokyo, autumn', draw: (ctx, text) => {
      ctx.fillStyle = '#f6f1e7'; ctx.fillRect(0, 0, W, H);
      ctx.clearRect(44, 40, W - 88, H - 170);
      ctx.fillStyle = '#2b2620'; ctx.font = 'italic 500 42px Fraunces, Georgia, serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(text, W / 2, H - 66); ctx.textAlign = 'left';
    } },
    postcard: { label: 'Postcard', caption: 'TOKYO', draw: (ctx, text) => {
      ctx.fillStyle = '#8b2942'; ctx.fillRect(0, 0, W, H);
      roundRect(ctx, 28, 28, W - 56, H - 168, 22); ctx.save(); ctx.clip(); ctx.clearRect(0, 0, W, H); ctx.restore();
      ctx.fillStyle = '#f4efe6'; ctx.textBaseline = 'alphabetic';
      ctx.font = 'italic 400 26px Fraunces, Georgia, serif'; ctx.fillText('Greetings from', 40, H - 92);
      ctx.font = '700 64px Fraunces, Georgia, serif'; ctx.fillText(text.toUpperCase(), 38, H - 34);
      ctx.strokeStyle = '#f4efe6'; ctx.lineWidth = 3; ctx.setLineDash([6, 5]); roundRect(ctx, W - 132, H - 128, 96, 102, 4); ctx.stroke(); ctx.setLineDash([]);
      ctx.font = '600 16px ui-monospace, Menlo, monospace'; ctx.textAlign = 'center'; ctx.fillText('¥ 80', W - 84, H - 72); ctx.textAlign = 'left';
    } },
    corners: { label: 'Rounded', caption: false, draw: ctx => {
      ctx.fillStyle = '#101010'; ctx.fillRect(0, 0, W, H);
      roundRect(ctx, 18, 18, W - 36, H - 36, 56); ctx.save(); ctx.clip(); ctx.clearRect(0, 0, W, H); ctx.restore();
    } },
  };

  const drawArt = () => {
    actx.clearRect(0, 0, W, H);
    if (state.template === 'upload' && state.upload) {
      const img = state.upload, scale = Math.max(W / img.width, H / img.height);
      const sw = W / scale, sh = H / scale;
      actx.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, 0, 0, W, H);
    } else {
      const t = TEMPLATES[state.template];
      t.draw(actx, caption.value || t.caption || '');
    }
    return actx.getImageData(0, 0, W, H).data;
  };

  const photoFor = async id => {
    const key = `${id}:${state.film}`;
    if (!photoRgb.has(key)) {
      let rgb = C.readPixels(await C.loadImage(`${C.BASE}scenes/${id}.webp`), W, H);
      if (state.film) { film ??= await C.loadFilm(); rgb = C.renderMode(rgb, W, H, film, 0); }
      photoRgb.set(key, photoToRowPair(rgb));
    }
    return photoRgb.get(key);
  };

  const kb = n => `${(n / 1024).toFixed(1)} KB`;

  // Encode each 200-row strip as "GPZP" + fixed-Huffman raw DEFLATE, the only kind the
  // stock frames use, then prove it inflates back to the same bytes.
  const encode = bytes => {
    const strips = [];
    for (let s = 0; s < 3; s++) {
      const raw = bytes.subarray(s * BYTES / 3, (s + 1) * BYTES / 3);
      const packed = window.pako.deflateRaw(raw, { level: 9, strategy: 4, windowBits: 15, memLevel: 8 });
      const back = window.pako.inflateRaw(packed);
      const same = back.length === raw.length && back.every((v, i) => v === raw[i]);
      const file = new Uint8Array(packed.length + 4);
      file.set([0x47, 0x50, 0x5a, 0x50]); file.set(packed, 4);
      strips.push({ file, size: file.length, same });
    }
    return strips;
  };

  const showStrips = () => {
    const slot = slots[state.slot];
    table.replaceChildren();
    let fits = true;
    encoded.forEach((strip, s) => {
      const budget = slot.strips[s].budget, ok = strip.size <= budget;
      fits = fits && ok;
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${s + 1} · rows ${s * 200}–${s * 200 + 199}</td><td>${kb(strip.size)}</td><td>${kb(budget)}</td><td class="${ok ? 'is-ok' : 'is-over'}">${ok ? 'fits' : `over by ${kb(strip.size - budget)}`}</td>`;
      table.append(tr);
    });
    const verified = encoded.every(strip => strip.same);
    verify.textContent = verified ? 'All three strips inflate back to exactly the bytes shown.' : 'Round-trip check failed.';
    downloads.querySelectorAll('a').forEach(a => URL.revokeObjectURL(a.href));
    downloads.replaceChildren();
    encoded.forEach((strip, s) => {
      const a = document.createElement('a');
      const name = slot.strips[s].name;
      a.href = URL.createObjectURL(new Blob([strip.file], { type: 'application/octet-stream' }));
      a.download = `${name}.bin`;
      a.textContent = `${name}.bin`;
      a.className = 'frames-download';
      downloads.append(a);
    });
    status.textContent = fits ? `Fits frame slot ${state.slot + 1}.` : `Too detailed for frame slot ${state.slot + 1}; simplify the strips marked over, or pick a larger slot.`;
    return fits;
  };

  const render = async () => {
    if (!window.pako || !slots) return;
    const rgba = drawArt();
    const { bytes, nudged } = frameToRowPair(rgba);
    frame = bytes;
    const photo = await photoFor(state.photo);
    const out = compose(photo, frame);
    const image = rowPairToImageData(out);
    if (state.holes) {
      for (let y = 0; y < H; y++) {
        const p = y >> 1, row = p * W * 3 + (y & 1 ? 2 * W : 0);
        for (let k = 0; k < W / 2; k++) {
          if (!isKeyPair(frame, row, k)) continue;
          for (const x of [2 * k, 2 * k + 1]) { // tint see-through pairs magenta
            const o = (y * W + x) * 4;
            image.data[o] = (image.data[o] + 255) / 2; image.data[o + 2] = (image.data[o + 2] + 255) / 2;
          }
        }
      }
    }
    preview.getContext('2d').putImageData(image, 0, 0);
    nudgedNote.textContent = nudged ? `${nudged.toLocaleString()} pixel pairs landed exactly on the see-through value and were nudged so they stay solid.` : '';
    encoded = encode(frame);
    showStrips();
    preview.setAttribute('aria-label', `${TEMPLATES[state.template]?.label ?? 'Your'} frame on a real Charmera photo, composited with the camera's rule`);
  };

  // Controls.
  const templateButtons = [...root.querySelectorAll('.frames-templates button')];
  const press = (group, value) => group.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.value === value)));
  templateButtons.forEach(button => button.addEventListener('click', () => {
    state.template = button.dataset.value;
    press(templateButtons, state.template);
    const t = TEMPLATES[state.template];
    captionWrap.hidden = !t?.caption;
    if (t?.caption) caption.value = t.caption;
    render();
  }));
  $('.frames-upload input').addEventListener('change', async event => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      state.upload = await createImageBitmap(file);
      state.template = 'upload';
      press(templateButtons, '');
      captionWrap.hidden = true;
      render();
    } catch { status.textContent = 'That file could not be read as an image.'; }
  });
  caption.addEventListener('input', render);
  const photoButtons = [...root.querySelectorAll('.frames-photo button')];
  photoButtons.forEach(button => button.addEventListener('click', () => { state.photo = button.dataset.value; press(photoButtons, state.photo); render(); }));
  $('.frames-film').addEventListener('change', e => { state.film = e.target.checked; render(); });
  $('.frames-holes').addEventListener('change', e => { state.holes = e.target.checked; render(); });
  slotSelect.addEventListener('change', () => { state.slot = Number(slotSelect.value); if (encoded) showStrips(); });

  const start = () => Promise.all([
    fetch(`${C.BASE}frame-slots.json`).then(r => r.json()),
    new Promise((resolve, reject) => {
      if (window.pako) return resolve();
      const s = document.createElement('script');
      s.src = `${C.BASE}vendor/pako.min.js`; s.onload = resolve; s.onerror = reject;
      document.head.append(s);
    }),
    document.fonts?.load('italic 400 26px Fraunces').catch(() => {}),
  ]).then(([data]) => {
    slots = data;
    slots.forEach((slot, i) => {
      const o = document.createElement('option');
      o.value = String(i);
      o.textContent = `Slot ${i + 1} · ${kb(slot.strips.reduce((a, s) => a + s.budget, 0))} total`;
      slotSelect.append(o);
    });
    slotSelect.value = String(state.slot);
    press(templateButtons, state.template);
    press(photoButtons, state.photo);
    root.classList.add('is-ready');
    render();
  }).catch(() => { status.textContent = 'The frame maker could not load.'; });

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      if (!entries.some(e => e.isIntersecting)) return;
      observer.disconnect(); start();
    }, { rootMargin: '600px 0px' });
    observer.observe(root);
  } else start();
})();
