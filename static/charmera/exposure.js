// How the stock firmware spends exposure: the AE program line read from the
// binary, drawn as stops contributed by each stage at every AE index.
(() => {
  const root = document.getElementById('charmera-exposure');
  if (!root) return;

  const SVG = 'http://www.w3.org/2000/svg';
  const STAGES = [
    { key: 'shutter', label: 'Shutter', detail: 'integration lines' },
    { key: 'analog', label: 'Sensor gain', detail: 'SP140A analog gain' },
    { key: 'digital', label: 'Digital gain', detail: 'CDSP global gain' },
  ];
  const pad = { top: 16, right: 104, bottom: 40, left: 44 };
  const yMax = 13;
  let width, height, plotW, plotH;

  const chart = root.querySelector('.exposure-plot');
  const tooltip = root.querySelector('.exposure-tooltip');
  const tableBody = root.querySelector('.exposure-table tbody');
  let tables, current = '50Hz', rows = [], focusIndex = null;

  const el = (name, attrs = {}, parent) => {
    const node = document.createElementNS(SVG, name);
    for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
    parent?.append(node);
    return node;
  };

  const toRows = table => {
    const [lines0, analog0, digital0] = table[0];
    return table.map(([lines, analog, digital], index) => {
      const shutter = Math.log2(lines / lines0), gain = Math.log2(analog / analog0), global = Math.log2(digital / digital0);
      return { index, lines, analog, digital, stops: [shutter, gain, global], total: shutter + gain + global };
    });
  };

  const x = index => pad.left + (index / (rows.length - 1)) * plotW;
  const y = stops => pad.top + plotH - (stops / yMax) * plotH;

  // Draw at the rendered width so the text stays legible on a phone.
  const draw = () => {
    width = Math.round(Math.min(Math.max(chart.parentElement.clientWidth, 300), 680));
    height = width < 480 ? 250 : 300;
    pad.right = width < 480 ? 92 : 104;
    pad.left = width < 480 ? 36 : 44;
    plotW = width - pad.left - pad.right;
    plotH = height - pad.top - pad.bottom;
    rows = toRows(tables[current]);
    chart.replaceChildren();
    chart.setAttribute('viewBox', `0 0 ${width} ${height}`);

    const grid = el('g', { class: 'exposure-grid' }, chart);
    for (let stop = 0; stop <= 12; stop += 2) {
      el('line', { x1: pad.left, x2: pad.left + plotW, y1: y(stop), y2: y(stop) }, grid);
      el('text', { x: pad.left - 8, y: y(stop) + 4, 'text-anchor': 'end' }, grid).textContent = stop;
    }
    for (let index = 0; index < rows.length; index += width < 480 ? 100 : 50) {
      el('text', { x: x(index), y: pad.top + plotH + 18, 'text-anchor': 'middle' }, grid).textContent = index;
    }
    el('text', { x: pad.left + plotW / 2, y: height - 4, 'text-anchor': 'middle', class: 'exposure-axis-title' }, grid).textContent = 'Auto-exposure table index (darker scene →)';
    el('text', { x: 12, y: pad.top + plotH / 2, transform: `rotate(-90 12 ${pad.top + plotH / 2})`, 'text-anchor': 'middle', class: 'exposure-axis-title' }, grid).textContent = 'Stops of exposure added';

    // Stack shutter, then sensor gain, then digital gain.
    let lower = rows.map(() => 0);
    STAGES.forEach((stage, s) => {
      const upper = rows.map((row, i) => lower[i] + row.stops[s]);
      const top = upper.map((v, i) => `${x(i)},${y(v)}`).join(' L');
      const bottom = lower.map((v, i) => `${x(i)},${y(v)}`).reverse().join(' L');
      el('path', { d: `M${top} L${bottom} Z`, class: `exposure-band exposure-${stage.key}` }, chart);
      // Trace a stage's edge only where it contributes, so an idle stage draws no line.
      const edge = upper.map((v, i) => {
        const active = row => row && row.stops[s] > 1e-6;
        if (!active(rows[i]) && !active(rows[i + 1]) && !active(rows[i - 1])) return null;
        return `${x(i)},${y(v)}`;
      });
      const d = edge.map((point, i) => point && `${edge[i - 1] ? 'L' : 'M'}${point}`).filter(Boolean).join(' ');
      if (d) el('path', { d, class: `exposure-edge exposure-${stage.key}` }, chart);
      const end = rows.length - 1, thickness = upper[end] - lower[end];
      if (thickness > 0.35) {
        el('text', { x: pad.left + plotW + 8, y: y((upper[end] + lower[end]) / 2) + 4, class: 'exposure-direct-label' }, chart)
          .textContent = `${stage.label} ${thickness.toFixed(1)}`;
      }
      lower = upper;
    });
    el('line', { x1: pad.left, x2: pad.left + plotW, y1: y(0), y2: y(0), class: 'exposure-baseline' }, chart);

    const cursor = el('g', { class: 'exposure-cursor', visibility: 'hidden' }, chart);
    el('line', { y1: pad.top, y2: pad.top + plotH }, cursor);
    el('circle', { r: 4 }, cursor);
    el('rect', { x: pad.left, y: pad.top, width: plotW, height: plotH, class: 'exposure-hit' }, chart);

    const total = rows[rows.length - 1].total;
    chart.setAttribute('aria-label', `${current} program line: ${rows.length} indices spanning ${total.toFixed(1)} nominal stops. Use the arrow keys to read individual indices.`);
    fillTable();
    if (focusIndex !== null) show(Math.min(focusIndex, rows.length - 1));
  };

  const show = index => {
    focusIndex = index;
    const row = rows[index];
    const cursor = chart.querySelector('.exposure-cursor');
    cursor.setAttribute('visibility', 'visible');
    cursor.querySelector('line').setAttribute('x1', x(index));
    cursor.querySelector('line').setAttribute('x2', x(index));
    cursor.querySelector('circle').setAttribute('cx', x(index));
    cursor.querySelector('circle').setAttribute('cy', y(row.total));
    tooltip.innerHTML = `<strong>Index ${index}</strong>` +
      `<span><i class="swatch exposure-shutter"></i>${row.lines} lines</span>` +
      `<span><i class="swatch exposure-analog"></i>${(row.analog / 256).toFixed(2)}× sensor gain</span>` +
      `<span><i class="swatch exposure-digital"></i>${(row.digital / 64).toFixed(2)}× digital gain</span>` +
      `<span class="exposure-total">${row.total.toFixed(2)} stops over index 0</span>`;
    tooltip.hidden = false;
    const box = chart.getBoundingClientRect(), scale = box.width / width;
    const left = x(index) * scale;
    tooltip.style.left = `${Math.min(Math.max(left, 90), box.width - 90)}px`;
  };

  const hide = () => {
    focusIndex = null;
    tooltip.hidden = true;
    chart.querySelector('.exposure-cursor')?.setAttribute('visibility', 'hidden');
  };

  // Summarise the program line as its anti-flicker shutter plateaus.
  const fillTable = () => {
    tableBody.replaceChildren();
    let start = 0;
    for (let i = 1; i <= rows.length; i++) {
      if (i < rows.length && rows[i].lines === rows[start].lines) continue;
      const run = rows.slice(start, i);
      if (run.length >= 4 && run[0].lines >= 100) {
        const tr = document.createElement('tr');
        const range = (values, unit) => {
          const low = (Math.min(...values) / unit).toFixed(2), high = (Math.max(...values) / unit).toFixed(2);
          return low === high ? `${low}×` : `${low}–${high}×`;
        };
        [`${run[0].index}–${run[run.length - 1].index}`, run[0].lines,
          range(run.map(row => row.analog), 256), range(run.map(row => row.digital), 64)]
          .forEach(value => { const td = document.createElement('td'); td.textContent = value; tr.append(td); });
        tableBody.append(tr);
      }
      start = i;
    }
  };

  chart.addEventListener('pointermove', event => {
    const box = chart.getBoundingClientRect();
    const px = (event.clientX - box.left) * (width / box.width);
    const index = Math.round(((px - pad.left) / plotW) * (rows.length - 1));
    if (index >= 0 && index < rows.length) show(index); else hide();
  });
  chart.addEventListener('pointerleave', hide);
  chart.addEventListener('blur', hide);
  chart.addEventListener('keydown', event => {
    const step = event.shiftKey ? 10 : 1;
    const from = focusIndex ?? 0;
    if (event.key === 'ArrowRight') show(Math.min(from + step, rows.length - 1));
    else if (event.key === 'ArrowLeft') show(Math.max(from - step, 0));
    else if (event.key === 'Escape') hide();
    else return;
    event.preventDefault();
  });

  root.querySelectorAll('.exposure-toggle button').forEach((button, _, all) => {
    button.addEventListener('click', () => {
      current = button.dataset.value;
      all.forEach(other => other.setAttribute('aria-pressed', String(other === button)));
      root.querySelector('.exposure-table caption').textContent = `Shutter plateaus in the ${current} program line`;
      draw();
    });
  });

  let resizeFrame;
  new ResizeObserver(() => {
    cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(() => tables && draw());
  }).observe(chart.parentElement);

  fetch('/static/charmera/ae-tables.json').then(response => response.json()).then(data => {
    tables = data;
    draw();
  }).catch(() => { chart.replaceChildren(); root.querySelector('.exposure-error').hidden = false; });
})();
