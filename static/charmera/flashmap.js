// The 2 MiB firmware image as a map, with where the updater's final erase lands
// for a full dump versus a software-only package.
(() => {
  const root = document.getElementById('charmera-flash');
  if (!root) return;

  const SVG = 'http://www.w3.org/2000/svg';
  const chart = root.querySelector('.flash-plot');
  const tooltip = root.querySelector('.flash-tooltip');
  const note = root.querySelector('.flash-note');
  const ZOOM = [0x168000, 0x1B0000]; // the camera's live state, magnified
  const SCENARIOS = {
    full: {
      written: 0x200000, erase: [0x210000, 0x220000],
      note: 'A full 2 MiB image fills the chip. The updater then erases 64 KiB starting at 0x210000, past the end of the chip. If the flash controller wraps that address, the block erased is 0x10000–0x1FFFF, inside the program itself.',
    },
    package: {
      written: 0x169000, erase: [0x170000, 0x180000],
      note: 'A software-only package ends at 0x169000. The same final erase lands on 0x170000: the settings and photo index. The firmware finds no valid settings and takes its own reset path. It reads as a factory reset.',
    },
  };
  let data, width, scenario = 'full', focus = null;
  const pad = { left: 8, right: 8 };
  const ROW = { main: 34, zoom: 128 }, BAR = 38;

  const el = (name, attrs = {}, parent) => {
    const node = document.createElementNS(SVG, name);
    for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
    parent?.append(node);
    return node;
  };
  const hex = v => '0x' + v.toString(16).toUpperCase().padStart(6, '0');
  const size = b => (b >= 1048576 ? `${(b / 1048576).toFixed(2)} MiB` : b >= 1024 ? `${(b / 1024).toFixed(1)} KiB` : `${b} B`);

  const draw = () => {
    width = Math.round(Math.min(Math.max(chart.parentElement.clientWidth, 300), 680));
    const plotW = width - pad.left - pad.right, height = 230;
    const xMain = v => pad.left + (v / data.size) * plotW;
    const xZoom = v => pad.left + ((v - ZOOM[0]) / (ZOOM[1] - ZOOM[0])) * plotW;
    chart.replaceChildren();
    chart.setAttribute('viewBox', `0 0 ${width} ${height}`);
    const s = SCENARIOS[scenario];

    const bar = (x, y, regions, clipTo) => {
      const g = el('g', {}, chart);
      regions.forEach((r, i) => {
        let [a, b] = r;
        if (clipTo) { a = Math.max(a, clipTo[0]); b = Math.min(b, clipTo[1]); if (b <= a) return; }
        const x0 = x(a), x1 = Math.max(x(b), x0 + 0.75);
        const rect = el('rect', { x: x0, y, width: x1 - x0, height: BAR, class: `flash-region flash-${r[2]}`, 'data-index': i }, g);
        rect.addEventListener('pointerenter', () => show(i));
        rect.addEventListener('pointerleave', hide);
        if (x1 - x0 > 64 && r[2] !== 'blank') {
          el('text', { x: (x0 + x1) / 2, y: y + BAR / 2 + 4, 'text-anchor': 'middle', class: 'flash-label' }, g).textContent = r[3];
        }
      });
      el('rect', { x: pad.left, y, width: plotW, height: BAR, class: 'flash-outline' }, g);
    };

    // Main bar: the whole chip.
    bar(xMain, ROW.main, data.regions);
    for (const v of [0, 0x80000, 0x100000, 0x180000, 0x200000]) {
      el('text', { x: xMain(v), y: ROW.main + BAR + 14, 'text-anchor': v === 0 ? 'start' : v === 0x200000 ? 'end' : 'middle', class: 'flash-tick' }, chart).textContent = `${v / 1048576} MiB`;
    }
    // What the update writes, as a bracket above the bar.
    el('line', { x1: xMain(0), x2: xMain(s.written), y1: ROW.main - 4, y2: ROW.main - 4, class: 'flash-written' }, chart);
    el('text', { x: scenario === 'full' ? pad.left : xMain(s.written) - 2, y: ROW.main - 10, 'text-anchor': scenario === 'full' ? 'start' : 'end', class: 'flash-written-label' }, chart).textContent = `written: ${hex(0)}–${hex(s.written)}`;

    // The final erase.
    if (scenario === 'full') {
      const wrapped = [0x10000, 0x20000];
      el('rect', { x: xMain(wrapped[0]), y: ROW.main - 3, width: Math.max(xMain(wrapped[1]) - xMain(wrapped[0]), 3), height: BAR + 6, class: 'flash-erase' }, chart);
      el('text', { x: xMain(wrapped[1]) + 4, y: ROW.main + BAR + 28, class: 'flash-erase-label' }, chart).textContent = 'erased if 0x210000 wraps to 0x010000';
      el('text', { x: pad.left + plotW, y: ROW.main - 10, 'text-anchor': 'end', class: 'flash-erase-label' }, chart).textContent = 'final erase: 0x210000, past the end →';
    } else {
      el('rect', { x: xMain(s.erase[0]), y: ROW.main - 3, width: xMain(s.erase[1]) - xMain(s.erase[0]), height: BAR + 6, class: 'flash-erase' }, chart);
    }

    // Zoom bar: the live camera state.
    el('line', { x1: xMain(ZOOM[0]), y1: ROW.main + BAR, x2: pad.left, y2: ROW.zoom - 18, class: 'flash-connector' }, chart);
    el('line', { x1: xMain(ZOOM[1]), y1: ROW.main + BAR, x2: pad.left + plotW, y2: ROW.zoom - 18, class: 'flash-connector' }, chart);
    el('text', { x: pad.left, y: ROW.zoom - 6, class: 'flash-axis-title' }, chart).textContent = `Zoomed: ${hex(ZOOM[0])}–${hex(ZOOM[1])}`;
    bar(xZoom, ROW.zoom, data.regions, ZOOM);
    for (const v of [0x170000, 0x180000, 0x1A5800]) {
      el('text', { x: xZoom(v), y: ROW.zoom + BAR + 14, 'text-anchor': 'middle', class: 'flash-tick' }, chart).textContent = hex(v);
    }
    if (scenario === 'package') {
      el('rect', { x: xZoom(s.erase[0]), y: ROW.zoom - 3, width: xZoom(s.erase[1]) - xZoom(s.erase[0]), height: BAR + 6, class: 'flash-erase' }, chart);
      el('text', { x: xZoom(s.erase[0]) + 4, y: ROW.zoom + BAR + 30, class: 'flash-erase-label' }, chart).textContent = 'final erase: settings + photo index';
    } else {
      el('text', { x: pad.left + plotW, y: ROW.zoom + BAR + 30, 'text-anchor': 'end', class: 'flash-erase-label' }, chart).textContent = 'untouched by the final erase';
    }
    el('line', { x1: xZoom(s.written), x2: xZoom(s.written), y1: ROW.zoom - 6, y2: ROW.zoom + BAR + 6, class: 'flash-written-end' }, chart);

    note.textContent = s.note;
    chart.setAttribute('aria-label', `Map of the 2 MiB firmware image. ${s.note}`);
    if (focus !== null) show(focus);
  };

  const show = i => {
    focus = i;
    const [a, b, , name, text] = data.regions[i];
    tooltip.innerHTML = `<strong>${name}</strong><span>${hex(a)}–${hex(b)} · ${size(b - a)}</span><span>${text}</span>`;
    tooltip.hidden = false;
    chart.querySelectorAll('.flash-region').forEach(r => r.classList.toggle('is-focus', Number(r.dataset.index) === i));
  };
  const hide = () => {
    focus = null;
    tooltip.hidden = true;
    chart.querySelectorAll('.flash-region.is-focus').forEach(r => r.classList.remove('is-focus'));
  };
  chart.addEventListener('keydown', event => {
    const n = data.regions.length;
    if (event.key === 'ArrowRight') show(focus === null ? 0 : Math.min(focus + 1, n - 1));
    else if (event.key === 'ArrowLeft') show(focus === null ? 0 : Math.max(focus - 1, 0));
    else if (event.key === 'Escape') hide();
    else return;
    event.preventDefault();
  });
  chart.addEventListener('blur', hide);

  root.querySelectorAll('.flash-toggle button').forEach((button, _, all) => {
    button.addEventListener('click', () => {
      scenario = button.dataset.value;
      all.forEach(b => b.setAttribute('aria-pressed', String(b === button)));
      draw();
    });
  });

  const fillTable = () => {
    const body = root.querySelector('.flash-table tbody');
    for (const [a, b, , name, text] of data.regions) {
      const tr = document.createElement('tr');
      [`${hex(a)}–${hex(b)}`, name, size(b - a), text].forEach(v => { const td = document.createElement('td'); td.textContent = v; tr.append(td); });
      body.append(tr);
    }
  };

  let resizeFrame;
  new ResizeObserver(() => { cancelAnimationFrame(resizeFrame); resizeFrame = requestAnimationFrame(() => data && draw()); }).observe(chart.parentElement);
  fetch('/static/charmera/flash-map.json').then(r => r.json()).then(json => { data = json; draw(); fillTable(); })
    .catch(() => { note.textContent = 'The map could not be loaded.'; });
})();
