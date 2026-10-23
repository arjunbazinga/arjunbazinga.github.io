// Follow one photograph through the traced still path, stage by stage, with a
// loupe that always shows the same patch of the scene at that stage's resolution.
(() => {
  const root = document.getElementById('charmera-pipeline');
  if (!root || !window.Charmera) return;
  const C = window.Charmera;

  const SENSOR = { w: 1280, h: 720 };
  const CROP = { x: 160, y: 0, w: 960, h: 720 };
  const CAPTURE = { w: 800, h: 600 };
  // Photo-size configurations in the firmware; every one starts from 800×600.
  const SIZES = [[1440, 1080], [2048, 1536], [2592, 1944], [3264, 2448], [4032, 3024], [4672, 3504], [4960, 3720]];
  // The loupe's patch, in sensor coordinates: the torii's left pillar and crossbar.
  const PATCH = { x: 700, y: 352, w: 64, h: 48 };
  const LOUPE = { w: 480, h: 360 };

  const STAGES = [
    { id: 'sensor', label: 'Sensor', raster: () => SENSOR,
      title: '1280 × 720 · 0.92 MP',
      text: 'The SP140A sensor runs a 16:9 mode. This is the most detail the photo path ever sees.' },
    { id: 'crop', label: 'Crop', raster: () => SENSOR,
      title: '960 × 720 · 0.69 MP',
      text: 'The firmware keeps a centred 4:3 window starting 160 pixels in. Everything outside it, including the swan boat on the right, never reaches the photo.' },
    { id: 'capture', label: 'Capture', raster: () => CAPTURE,
      title: '800 × 600 · 0.48 MP',
      text: 'The colour processor resamples the crop onto the capture surface: 720,000 bytes, with colour stored at a quarter of the brightness resolution. From here on, this is the photograph.' },
    { id: 'film', label: 'Film', raster: () => CAPTURE,
      title: 'The hook · still 800 × 600',
      text: 'The stock Pixel filters already run CPU code over this whole surface here. It is where a film renderer would go. Shown: FILM.' },
    { id: 'overlay', label: 'Overlays', raster: () => CAPTURE,
      title: 'Frame, then date',
      text: 'Frames and the date stamp are drawn after the hook, so a film look would never tint the date. This stamp copies the format of the camera’s own.' },
    { id: 'jpeg', label: 'JPEG', raster: () => ({ w: state.size[0], h: state.size[1] }),
      title: '',
      text: '' },
  ];

  const state = { stage: 0, size: SIZES[0] };
  let sources;

  const $ = selector => root.querySelector(selector);
  const main = $('.pipeline-canvas'), loupe = $('.pipeline-loupe');
  const nav = $('.pipeline-steps'), title = $('.pipeline-title'), text = $('.pipeline-text');
  const loupeNote = $('.pipeline-loupe-note'), sizeWrap = $('.pipeline-size'), sizeSelect = $('.pipeline-size select');
  const bars = $('.pipeline-bars');

  const canvasFrom = (w, h, draw) => {
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingQuality = 'high';
    draw(ctx);
    return canvas;
  };

  // Matches the camera's own stamp: DD MM YYYY in orange, about 3% of the
  // frame high, set in from the bottom-right corner.
  const drawDate = (ctx, w, h) => {
    const size = Math.round(h * 0.045);
    ctx.font = `600 ${size}px ui-monospace, SFMono-Regular, Menlo, monospace`;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'alphabetic';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
    ctx.shadowBlur = size * 0.08;
    ctx.fillStyle = '#f2733f';
    ctx.fillText('23 10 2026', w - w * 0.031, h - h * 0.049);
    ctx.shadowBlur = 0;
  };

  // Build every stage's raster once.
  const prepare = async () => {
    const [image, film] = await Promise.all([C.loadImage(`${C.BASE}sensor/hakone-torii-1280x720.webp`), C.loadFilm()]);
    const sensor = canvasFrom(SENSOR.w, SENSOR.h, ctx => ctx.drawImage(image, 0, 0));
    const capture = canvasFrom(CAPTURE.w, CAPTURE.h, ctx => ctx.drawImage(sensor, CROP.x, CROP.y, CROP.w, CROP.h, 0, 0, CAPTURE.w, CAPTURE.h));
    const rgb = C.readPixels(capture, CAPTURE.w, CAPTURE.h);
    const filmed = canvasFrom(CAPTURE.w, CAPTURE.h, ctx => ctx.putImageData(C.toImageData(C.renderMode(rgb, CAPTURE.w, CAPTURE.h, film, 0), CAPTURE.w, CAPTURE.h), 0, 0));
    const overlaid = canvasFrom(CAPTURE.w, CAPTURE.h, ctx => { ctx.drawImage(filmed, 0, 0); drawDate(ctx, CAPTURE.w, CAPTURE.h); });
    sources = { sensor, capture, filmed, overlaid };
  };

  // The patch expressed in a raster derived from the 960×720 crop.
  const patchIn = (w, h) => {
    const sx = w / CROP.w, sy = h / CROP.h;
    return { x: (PATCH.x - CROP.x) * sx, y: (PATCH.y - CROP.y) * sy, w: PATCH.w * sx, h: PATCH.h * sy };
  };

  const drawMain = () => {
    const stage = STAGES[state.stage];
    const ctx = main.getContext('2d');
    const box = { w: SENSOR.w, h: SENSOR.h };
    if (stage.id === 'sensor' || stage.id === 'crop') {
      main.width = SENSOR.w; main.height = SENSOR.h;
      ctx.drawImage(sources.sensor, 0, 0);
      if (stage.id === 'crop') {
        ctx.fillStyle = 'rgba(21, 18, 15, 0.72)';
        ctx.fillRect(0, 0, CROP.x, box.h);
        ctx.fillRect(CROP.x + CROP.w, 0, box.w - CROP.x - CROP.w, box.h);
        ctx.strokeStyle = '#f4efe6'; ctx.lineWidth = 3;
        ctx.strokeRect(CROP.x + 1.5, 1.5, CROP.w - 3, CROP.h - 3);
      }
      ctx.strokeStyle = '#ffd45a'; ctx.lineWidth = 3;
      ctx.strokeRect(PATCH.x, PATCH.y, PATCH.w, PATCH.h);
      return;
    }
    // The 4:3 stages are drawn at display size; the raster is described in text.
    const out = stage.id === 'jpeg' ? { w: 1440, h: 1080 } : CAPTURE;
    main.width = out.w; main.height = out.h;
    ctx.imageSmoothingQuality = 'high';
    const src = stage.id === 'capture' ? sources.capture : stage.id === 'film' ? sources.filmed : sources.overlaid;
    ctx.drawImage(src, 0, 0, out.w, out.h);
    const p = patchIn(out.w, out.h);
    ctx.strokeStyle = '#ffd45a'; ctx.lineWidth = out.w / 400;
    ctx.strokeRect(p.x, p.y, p.w, p.h);
  };

  // The loupe draws the patch at the stage's own pixel grid with no smoothing,
  // so each stored pixel is visible as a block.
  const drawLoupe = () => {
    const stage = STAGES[state.stage];
    const ctx = loupe.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, LOUPE.w, LOUPE.h);
    let pixels;
    if (stage.id === 'sensor' || stage.id === 'crop') {
      ctx.drawImage(sources.sensor, PATCH.x, PATCH.y, PATCH.w, PATCH.h, 0, 0, LOUPE.w, LOUPE.h);
      pixels = [PATCH.w, PATCH.h];
    } else if (stage.id !== 'jpeg') {
      const src = stage.id === 'capture' ? sources.capture : stage.id === 'film' ? sources.filmed : sources.overlaid;
      const p = patchIn(CAPTURE.w, CAPTURE.h);
      const x0 = Math.floor(p.x), y0 = Math.floor(p.y), w = Math.round(p.w), h = Math.round(p.h);
      ctx.drawImage(src, x0, y0, w, h, 0, 0, LOUPE.w, LOUPE.h);
      pixels = [w, h];
    } else {
      // Enlarge only the patch, as the final scaler would: interpolation, no new detail.
      const [W, H] = state.size, p = patchIn(W, H);
      const w = Math.round(p.w), h = Math.round(p.h);
      const scaled = canvasFrom(w, h, c => {
        const q = patchIn(CAPTURE.w, CAPTURE.h);
        c.imageSmoothingEnabled = true;
        c.drawImage(sources.overlaid, q.x, q.y, q.w, q.h, 0, 0, w, h);
      });
      ctx.imageSmoothingEnabled = w < LOUPE.w;
      ctx.drawImage(scaled, 0, 0, LOUPE.w, LOUPE.h);
      pixels = [w, h];
    }
    loupeNote.textContent = `This patch: ${pixels[0]} × ${pixels[1]} stored pixels`;
  };

  const megapixels = (w, h) => (w * h / 1e6).toFixed(2);

  const describe = () => {
    const stage = STAGES[state.stage];
    if (stage.id === 'jpeg') {
      const [w, h] = state.size;
      title.textContent = `${w} × ${h} · ${megapixels(w, h)} MP file`;
      text.textContent = 'A streaming scaler enlarges the surface into the JPEG encoder 32 lines at a time. The firmware has seven photo-size configurations. I traced all seven, and every one starts from the same 800 × 600 surface.';
      const capture = 0.48, file = (w * h) / 1e6, max = (4960 * 3720) / 1e6;
      bars.innerHTML = `<div><span>Detail captured</span><i style="width:${(capture / max) * 100}%"></i><b>0.48 MP</b></div>` +
        `<div><span>Pixels in the file</span><i style="width:${(file / max) * 100}%"></i><b>${file.toFixed(2)} MP</b></div>`;
    } else {
      title.textContent = stage.title;
      text.textContent = stage.text;
    }
    sizeWrap.hidden = stage.id !== 'jpeg';
    bars.hidden = stage.id !== 'jpeg';
    main.setAttribute('aria-label', `Stage ${state.stage + 1} of ${STAGES.length}, ${stage.label}: ${title.textContent}`);
    nav.querySelectorAll('button').forEach((button, i) => button.setAttribute('aria-current', i === state.stage ? 'step' : 'false'));
    $('.pipeline-prev').disabled = state.stage === 0;
    $('.pipeline-next').disabled = state.stage === STAGES.length - 1;
  };

  const show = index => {
    state.stage = Math.min(Math.max(index, 0), STAGES.length - 1);
    describe();
    if (!sources) return;
    drawMain();
    drawLoupe();
  };

  STAGES.forEach((stage, i) => {
    const li = document.createElement('li');
    const button = document.createElement('button');
    button.type = 'button';
    button.innerHTML = `<span class="pipeline-step-number">${i + 1}</span>${stage.label}`;
    button.addEventListener('click', () => show(i));
    li.append(button);
    nav.append(li);
  });
  $('.pipeline-prev').addEventListener('click', () => show(state.stage - 1));
  $('.pipeline-next').addEventListener('click', () => show(state.stage + 1));
  SIZES.forEach(([w, h], i) => {
    const option = document.createElement('option');
    option.value = String(i);
    option.textContent = `${w} × ${h}${i === 0 ? ' (default)' : ''}`;
    sizeSelect.append(option);
  });
  sizeSelect.addEventListener('change', () => { state.size = SIZES[Number(sizeSelect.value)]; show(state.stage); });

  show(0);
  prepare().then(() => { root.classList.add('is-ready'); show(state.stage); })
    .catch(() => { text.textContent = 'The pipeline images could not be loaded.'; });
})();
