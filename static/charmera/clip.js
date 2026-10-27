// One look, one switch: VIVID distilled with and without the fitter knowing
// that the camera clips. Both students are fitted in the browser on load.
(() => {
  const root = document.getElementById('charmera-clip');
  if (!root || !window.Charmera) return;
  const C = window.Charmera;

  const W = 400, H = 300, MODE = 5, SCENE = 'akama-jingu'; // VIVID on the Shimonoseki shrine
  const NOTES = {
    false: 'Every colour counts the same, and the fitter scores its own raw output. Straining to land saturated colours exactly on the edge of what can be stored, it has flattened the greys.',
    true: 'Now the fitter knows the camera clips whatever it writes, so overshooting the edge costs nothing. The same 274 bytes buy back the contrast.',
  };
  const state = { clip: false };
  let fits, teacherCurve;

  const $ = selector => root.querySelector(selector);
  const studentCanvas = $('.clip-student'), chart = $('.clip-plot'), note = $('.clip-note');
  const cubeScore = $('.clip-score-cube'), photoScore = $('.clip-score-photo');
  const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const luma = (rgb, i) => 0.299 * rgb[i] + 0.587 * rgb[i + 1] + 0.114 * rgb[i + 2];
  const greys = Float32Array.from({ length: 256 * 3 }, (_, i) => Math.floor(i / 3));
  const greyLuma = rgb => Array.from({ length: 256 }, (_, k) => luma(rgb, k * 3));
  const draw = (canvas, rgb) => canvas.getContext('2d').putImageData(C.toImageData(rgb, W, H), 0, 0);

  // Tone response on greys: the teacher's, the student's, and no change.
  const SVG = 'http://www.w3.org/2000/svg';
  const el = (name, attrs, parent) => {
    const node = document.createElementNS(SVG, name);
    for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
    parent?.append(node);
    return node;
  };
  let plot;
  const drawChart = studentCurve => {
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
      el('path', { d: `M${x(0)},${y(0)} L${x(255)},${y(255)}`, class: 'meter-identity' }, chart);
      plot = { width, teacher: el('path', { class: 'compiler-line-teacher' }, chart), student: el('path', { class: 'compiler-line-student' }, chart) };
    }
    plot.teacher.setAttribute('d', path(teacherCurve));
    plot.student.setAttribute('d', path(studentCurve));
  };

  // The student's line glides between the two fits, so the change in contrast is visible as motion.
  let shownCurve, glide = 0;
  const show = () => {
    const fit = fits[state.clip];
    draw(studentCanvas, fit.photo);
    cubeScore.textContent = `${fit.cubeDb.toFixed(1)} dB`;
    photoScore.textContent = `${fit.photoDb.toFixed(1)} dB`;
    note.textContent = NOTES[state.clip];
    studentCanvas.setAttribute('aria-label', `The Shimonoseki shrine through VIVID's student, fitted ${state.clip ? 'knowing' : 'without knowing'} that the camera clips: ${fit.photoDb.toFixed(1)} dB from the teacher on this photo`);
    const from = shownCurve ?? fit.curve, to = fit.curve, token = ++glide, start = performance.now();
    const step = now => {
      if (token !== glide) return;
      const t = reduceMotion ? 1 : Math.min((now - start) / 450, 1), ease = t * t * (3 - 2 * t);
      shownCurve = from.map((v, k) => v + (to[k] - v) * ease);
      drawChart(shownCurve);
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  $('.clip-box').addEventListener('change', event => { state.clip = event.target.checked; show(); });
  let resizeTimer;
  window.addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(() => { plot = undefined; if (shownCurve) drawChart(shownCurve); }, 200); });

  const start = async () => {
    try {
      const [film, image] = await Promise.all([C.loadFilm(), C.loadImage(`${C.BASE}scenes/${SCENE}.webp`)]);
      const lut = film.luts.subarray(MODE * C.LUT_BYTES, (MODE + 1) * C.LUT_BYTES);
      const cube = C.cubeInputs(), teacherCube = Float32Array.from(lut);
      const photo = C.readPixels(image, W, H), teacherPhoto = C.applyLut(photo, lut, 0);
      teacherCurve = greyLuma(C.applyLut(greys, lut, 0));
      draw($('.clip-teacher'), teacherPhoto);
      fits = {};
      for (const clip of [false, true]) {
        const student = C.fitStudent(cube, teacherCube, { clip });
        const rendered = C.applyStudent(photo, student);
        fits[clip] = {
          photo: rendered,
          curve: greyLuma(C.applyStudent(greys, student)),
          cubeDb: C.psnr(C.applyStudent(cube, student), teacherCube),
          photoDb: C.psnr(rendered, teacherPhoto),
        };
      }
      root.classList.add('is-ready');
      $('.compiler-stage').setAttribute('aria-busy', 'false');
      show();
    } catch {
      note.textContent = 'The film data could not be loaded.';
    }
  };
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      if (!entries.some(entry => entry.isIntersecting)) return;
      observer.disconnect();
      start();
    }, { rootMargin: '600px 0px' });
    observer.observe(root);
  } else start();
})();
