// The stock tone curve is also the auto-exposure meter's input transform.
// Slide a uniform scene's raw statistic and see what each curve makes the
// meter read, and which way the engine would push exposure.
(() => {
  const root = document.getElementById('charmera-meter');
  if (!root) return;

  const SVG = 'http://www.w3.org/2000/svg';
  const chart = root.querySelector('.meter-plot');
  const slider = root.querySelector('.meter-slider');
  const readout = root.querySelector('.meter-readout');
  const pad = { top: 14, right: 18, bottom: 40, left: 44 };
  let data, width, height, plotW, plotH, nodes = {};

  const el = (name, attrs = {}, parent) => {
    const node = document.createElementNS(SVG, name);
    for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
    parent?.append(node);
    return node;
  };
  const x = v => pad.left + (v / 255) * plotW;
  const y = v => pad.top + plotH - (v / 255) * plotH;

  const draw = () => {
    width = Math.round(Math.min(Math.max(chart.parentElement.clientWidth, 300), 680));
    height = width < 480 ? 280 : 320;
    pad.left = width < 480 ? 36 : 44;
    plotW = width - pad.left - pad.right; plotH = height - pad.top - pad.bottom;
    chart.replaceChildren();
    chart.setAttribute('viewBox', `0 0 ${width} ${height}`);

    const grid = el('g', { class: 'exposure-grid' }, chart);
    for (let v = 0; v <= 255; v += 64) {
      el('line', { x1: pad.left, x2: pad.left + plotW, y1: y(v), y2: y(v) }, grid);
      el('text', { x: pad.left - 8, y: y(v) + 4, 'text-anchor': 'end' }, grid).textContent = v;
      el('text', { x: x(v), y: pad.top + plotH + 18, 'text-anchor': 'middle' }, grid).textContent = v;
    }
    el('text', { x: pad.left + plotW / 2, y: height - 4, 'text-anchor': 'middle', class: 'exposure-axis-title' }, grid).textContent = 'Raw scene statistic (what the sensor measured)';
    el('text', { x: 12, y: pad.top + plotH / 2, transform: `rotate(-90 12 ${pad.top + plotH / 2})`, 'text-anchor': 'middle', class: 'exposure-axis-title' }, grid).textContent = 'Meter reading';

    // The target band: brightness the engine is satisfied with in the tested state.
    const { target, deadband } = data;
    el('rect', { x: pad.left, width: plotW, y: y(target + deadband), height: y(target - deadband) - y(target + deadband), class: 'meter-band' }, chart);
    el('text', { x: pad.left + plotW - 4, y: y(target + deadband) - 5, 'text-anchor': 'end', class: 'meter-band-label' }, chart).textContent = `target ${target} ± ${deadband}`;

    el('path', { d: `M${x(0)},${y(0)} L${x(255)},${y(255)}`, class: 'meter-identity' }, chart);
    el('path', { d: 'M' + data.stock.map((v, i) => `${x(i)},${y(v)}`).join(' L'), class: 'meter-stock' }, chart);
    el('text', { x: x(176), y: y(176) + 20, 'text-anchor': 'middle', class: 'meter-line-label' }, chart).textContent = 'No curve';
    el('text', { x: x(110), y: y(data.stock[110]) - 12, 'text-anchor': 'middle', class: 'meter-line-label' }, chart).textContent = 'Stock curve';

    // Executed original-engine cases, marked where they sit.
    for (const [curve, raw, measured] of data.cases) {
      el('circle', { cx: x(raw), cy: y(measured), r: 4, class: `meter-case meter-case-${curve}` }, chart);
    }

    const cursor = el('g', { class: 'meter-cursor' }, chart);
    nodes = {
      line: el('line', { y1: pad.top, y2: pad.top + plotH }, cursor),
      identity: el('circle', { r: 6, class: 'meter-dot-identity' }, cursor),
      stock: el('circle', { r: 6, class: 'meter-dot-stock' }, cursor),
    };
    update();
  };

  const verdict = reading => {
    if (reading > data.target + data.deadband) return { word: 'darken', cls: 'is-down' };
    if (reading < data.target - data.deadband) return { word: 'brighten', cls: 'is-up' };
    return { word: 'hold', cls: 'is-hold' };
  };

  const update = () => {
    const raw = Number(slider.value);
    const readings = { identity: raw, stock: data.stock[raw] };
    nodes.line.setAttribute('x1', x(raw)); nodes.line.setAttribute('x2', x(raw));
    for (const key of ['identity', 'stock']) {
      nodes[key].setAttribute('cx', x(raw));
      nodes[key].setAttribute('cy', y(readings[key]));
    }
    const executed = curve => data.cases.find(([c, r]) => c === curve && r === raw);
    const row = (label, key) => {
      const reading = readings[key], v = verdict(reading), run = executed(key);
      const proof = run ? `<span class="meter-proof">original engine: ${run[3] > 0 ? '+' : ''}${run[3]} steps</span>` : '';
      return `<div class="meter-row"><span class="meter-label">${label}</span><span>meter reads <b>${reading}</b></span><span class="meter-verdict ${v.cls}">${v.word}</span>${proof}</div>`;
    };
    readout.innerHTML = row('No curve', 'identity') + row('Stock curve', 'stock');
    const a = verdict(readings.identity).word, b = verdict(readings.stock).word;
    root.querySelector('.meter-summary').textContent = a !== b
      ? `Same scene, opposite decisions: without the curve the camera would ${a}; with it, ${b}.`
      : `Both curves agree here: ${a}.`;
    slider.setAttribute('aria-valuetext', `raw statistic ${raw}; no curve reads ${readings.identity} (${a}); stock curve reads ${readings.stock} (${b})`);
  };

  slider.addEventListener('input', update);
  let resizeFrame;
  new ResizeObserver(() => {
    cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(() => data && draw());
  }).observe(chart.parentElement);

  fetch('/static/charmera/meter.json').then(response => response.json()).then(json => { data = json; draw(); })
    .catch(() => { readout.textContent = 'The curve data could not be loaded.'; });
})();
