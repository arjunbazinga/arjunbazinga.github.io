// How much fine detail real Charmera photos hold, against phone photos sent
// through the same recompression, with and without an 800×600 squeeze.
(() => {
  const root = document.getElementById('charmera-detail');
  if (!root) return;

  const SVG = 'http://www.w3.org/2000/svg';
  const SERIES = [
    { key: 'charmera', label: 'Charmera', short: 'Charmera', cls: 'detail-charmera' },
    { key: 'squeezed', label: 'Phone through 800 × 600', short: 'Via 800 × 600', cls: 'detail-squeezed' },
    { key: 'phone', label: 'Phone', short: 'Phone', cls: 'detail-phone' },
  ];
  const chart = root.querySelector('.detail-plot');
  const tooltip = root.querySelector('.detail-tooltip');
  const pad = { top: 14, right: 18, bottom: 40, left: 48 };
  const Y_MIN = -3, Y_MAX = 0.3; // log10 of relative power
  let data, width, height, plotW, plotH, focus = null;

  const el = (name, attrs = {}, parent) => {
    const node = document.createElementNS(SVG, name);
    for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
    parent?.append(node);
    return node;
  };
  const F_MIN = 100, F_MAX = 640; // below 100 is the coarse reference itself
  const x = f => pad.left + ((f - F_MIN) / (F_MAX - F_MIN)) * plotW;
  const y = v => pad.top + plotH - ((Math.log10(Math.max(v, 1e-6)) - Y_MIN) / (Y_MAX - Y_MIN)) * plotH;
  const pct = v => (v * 100 >= 10 ? (v * 100).toFixed(0) : (v * 100).toFixed(1)) + '%';

  const draw = () => {
    width = Math.round(Math.min(Math.max(chart.parentElement.clientWidth, 300), 680));
    height = width < 480 ? 260 : 300;
    pad.left = width < 480 ? 38 : 48;
    plotW = width - pad.left - pad.right; plotH = height - pad.top - pad.bottom;
    chart.replaceChildren();
    chart.setAttribute('viewBox', `0 0 ${width} ${height}`);

    const grid = el('g', { class: 'exposure-grid' }, chart);
    for (const v of [1, 0.1, 0.01, 0.001]) {
      el('line', { x1: pad.left, x2: pad.left + plotW, y1: y(v), y2: y(v) }, grid);
      el('text', { x: pad.left - 8, y: y(v) + 4, 'text-anchor': 'end' }, grid).textContent = pct(v);
    }
    for (let f = F_MIN; f <= F_MAX; f += width < 480 ? 200 : 100) {
      el('text', { x: x(f), y: pad.top + plotH + 18, 'text-anchor': 'middle' }, grid).textContent = f;
    }
    el('text', { x: pad.left + plotW / 2, y: height - 4, 'text-anchor': 'middle', class: 'exposure-axis-title' }, grid).textContent = 'Detail fineness (cycles per picture width) →';
    // On narrow screens the legend and caption carry the axis meaning.
    if (width >= 480) el('text', { x: 12, y: pad.top + plotH / 2, transform: `rotate(-90 12 ${pad.top + plotH / 2})`, 'text-anchor': 'middle', class: 'exposure-axis-title' }, grid).textContent = 'Detail energy vs coarse';

    // The finest detail an 800-pixel-wide image can hold.
    el('line', { x1: x(400), x2: x(400), y1: pad.top, y2: pad.top + plotH, class: 'detail-limit' }, chart);
    el('text', { x: x(400) + 6, y: pad.top + 12, class: 'detail-limit-label' }, chart).textContent = '800-pixel limit';

    const shown = data.frequencies.map((f, i) => i).filter(i => data.frequencies[i] >= F_MIN);
    for (const series of SERIES) {
      const values = data.series[series.key];
      el('path', { d: 'M' + shown.map(i => `${x(data.frequencies[i])},${y(values[i])}`).join(' L'), class: `detail-line ${series.cls}` }, chart);
    }
    // Direct labels sit where the lines are well separated, just right of the limit.
    const narrow = width < 480;
    const at = data.frequencies.findIndex(f => f >= (narrow ? 440 : 470));
    for (const series of SERIES) {
      const v = data.series[series.key][at];
      el('text', { x: x(data.frequencies[at]) + 6, y: y(v) - 9, class: 'detail-direct-label' }, chart).textContent = narrow ? series.short : series.label;
    }

    const cursor = el('g', { class: 'meter-cursor', visibility: 'hidden' }, chart);
    el('line', { y1: pad.top, y2: pad.top + plotH }, cursor);
    el('rect', { x: pad.left, y: pad.top, width: plotW, height: plotH, class: 'exposure-hit' }, chart);
    chart.setAttribute('aria-label', 'Fine-detail energy by frequency for real Charmera photos, phone photos through 800 by 600, and phone photos. Use the arrow keys to read values.');
    if (focus !== null) show(focus);
  };

  const show = i => {
    focus = i;
    const f = data.frequencies[i];
    const cursor = chart.querySelector('.meter-cursor');
    cursor.setAttribute('visibility', 'visible');
    cursor.querySelector('line').setAttribute('x1', x(f));
    cursor.querySelector('line').setAttribute('x2', x(f));
    tooltip.innerHTML = `<strong>${f}–${f + data.bin} cycles</strong>` + SERIES.map(series =>
      `<span><i class="swatch ${series.cls}"></i>${series.label}: ${pct(data.series[series.key][i])}</span>`).join('');
    tooltip.hidden = false;
    const box = chart.getBoundingClientRect();
    tooltip.style.left = `${Math.min(Math.max(x(f) * box.width / width, 110), box.width - 110)}px`;
  };
  const hide = () => { focus = null; tooltip.hidden = true; chart.querySelector('.meter-cursor')?.setAttribute('visibility', 'hidden'); };

  chart.addEventListener('pointermove', event => {
    const box = chart.getBoundingClientRect();
    const f = F_MIN + ((event.clientX - box.left) * (width / box.width) - pad.left) / plotW * (F_MAX - F_MIN);
    const i = data.frequencies.findIndex(v => v + data.bin > f);
    if (f >= F_MIN && i >= 0) show(i); else hide();
  });
  chart.addEventListener('pointerleave', hide);
  chart.addEventListener('blur', hide);
  chart.addEventListener('keydown', event => {
    const from = focus ?? data.frequencies.findIndex(f => f >= 400);
    const first = data.frequencies.findIndex(f => f >= F_MIN);
    if (event.key === 'ArrowRight') show(Math.min(from + 1, data.frequencies.length - 1));
    else if (event.key === 'ArrowLeft') show(Math.max(from - 1, first));
    else if (event.key === 'Escape') hide();
    else return;
    event.preventDefault();
  });

  const fillTable = () => {
    const body = root.querySelector('.detail-table tbody');
    for (const [group, name, mid, near, beyond] of data.table) {
      const tr = document.createElement('tr');
      [group, name.replace('-', ' '), `${mid}%`, `${near}%`, `${beyond}%`].forEach(v => { const td = document.createElement('td'); td.textContent = v; tr.append(td); });
      body.append(tr);
    }
  };

  let resizeFrame;
  new ResizeObserver(() => { cancelAnimationFrame(resizeFrame); resizeFrame = requestAnimationFrame(() => data && draw()); }).observe(chart.parentElement);
  fetch('/static/charmera/spectrum.json').then(r => r.json()).then(json => { data = json; draw(); fillTable(); })
    .catch(() => { chart.replaceChildren(); root.querySelector('.detail-error').hidden = false; });
})();
