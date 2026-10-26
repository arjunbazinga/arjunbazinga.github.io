// A look is a process, not a tint: one real Charmera photo built up under
// NIGHT one term at a time, so the reader sees where a LUT stops.
(() => {
  const root = document.getElementById('charmera-process');
  if (!root || !window.Charmera) return;
  const C = window.Charmera;

  const W = 800, H = 600, MODE = 3, SCENE = 'charmera-street'; // NIGHT on the street photo
  const STEPS = [
    { label: 'Captured', note: 'The photo as my Charmera saved it, at 800 × 600: its own exposure, tone and colour.' },
    { label: '+ Tone', note: 'NIGHT’s tone curve alone, applied to brightness. Every pixel of the same brightness moves the same way, and colour is untouched. A LUT holds this.' },
    { label: '+ Colour', note: 'NIGHT’s full LUT: tone plus tungsten colour, with each hue treated differently. Still one lookup per pixel, so still a LUT.' },
    { label: '+ Glow', note: 'Halation. Strong highlights are found at quarter resolution, blurred, and only the halo that spills past their edges is kept, tinted red the way film’s red layer catches light scattered back from its base. Each pixel now depends on its neighbours, which no LUT can know.' },
  ];
  const state = { step: 0 };
  let frames;

  const $ = selector => root.querySelector(selector);
  const canvas = $('.process-canvas'), note = $('.process-note');
  const buttons = [...root.querySelectorAll('.process-steps button')];

  // Tone only: move each pixel's brightness along the teacher's grey response.
  // Adding the same amount to R, G and B changes luma and leaves chroma alone.
  const toneOnly = (src, lut) => {
    const greys = Float32Array.from({ length: 256 * 3 }, (_, i) => Math.floor(i / 3));
    const response = C.applyLut(greys, lut, 0);
    const curve = Array.from({ length: 256 }, (_, k) => 0.299 * response[k * 3] + 0.587 * response[k * 3 + 1] + 0.114 * response[k * 3 + 2]);
    const out = new Float32Array(src.length);
    for (let i = 0; i < src.length; i += 3) {
      const y = 0.299 * src[i] + 0.587 * src[i + 1] + 0.114 * src[i + 2];
      const shift = curve[Math.min(255, Math.max(0, Math.round(y)))] - y;
      for (let c = 0; c < 3; c++) out[i + c] = C.clamp(src[i + c] + shift);
    }
    return out;
  };

  const show = step => {
    state.step = step;
    buttons.forEach((button, k) => button.setAttribute('aria-pressed', String(k === step)));
    note.textContent = STEPS[step].note;
    if (!frames) return;
    canvas.getContext('2d').putImageData(C.toImageData(frames[step], W, H), 0, 0);
    canvas.setAttribute('aria-label', `The street photo, ${['as captured', 'with NIGHT’s tone curve only', 'through NIGHT’s full LUT', 'through NIGHT’s LUT with halation'][step]}`);
  };
  buttons.forEach((button, k) => button.addEventListener('click', () => show(k)));
  show(0);

  const start = async () => {
    try {
      const [film, image] = await Promise.all([C.loadFilm(), C.loadImage(`${C.BASE}scenes/${SCENE}.webp`)]);
      const src = C.readPixels(image, W, H);
      const lut = film.luts.subarray(MODE * C.LUT_BYTES, (MODE + 1) * C.LUT_BYTES);
      frames = [src, toneOnly(src, lut), C.applyLut(src, lut, 0), C.renderMode(src, W, H, film, MODE)];
      root.classList.add('is-ready');
      show(state.step);
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
