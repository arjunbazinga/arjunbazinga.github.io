(() => {
  const $ = (root, selector) => root.querySelector(selector);
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const read = (el, value) => { el.textContent = value; };
  function enable(root) {
    root.querySelectorAll('button, input').forEach(el => { el.disabled = false; });
  }

  const h = document.querySelector('.td-hilbert');
  if (h) {
    const square = $(h, '[data-square]'), slider = $(h, 'input');
    let x = .67, y = .36;
    const curves = [...square.querySelectorAll('[data-n]')].map(line => ({
      line, n: +line.dataset.n, points: line.getAttribute('points').split(' ').map(p => p.split(',').map(Number))
    }));
    function show() {
      const {line, n, points} = curves[+slider.value];
      curves.forEach(c => { c.line.style.display = c.line === line ? 'block' : 'none'; });
      const size = 256/n, col = Math.floor(x*n), row = Math.floor(y*n);
      const k = points.findIndex(([px,py]) => Math.floor(px/size) === col && Math.floor(py/size) === row);
      const cell = $(square, '[data-cell]'), dot = $(square, '[data-dot]'), bar = $(h, '[data-interval]');
      for (const [attr,v] of Object.entries({x:col*size,y:row*size,width:size,height:size})) cell.setAttribute(attr,v);
      dot.setAttribute('cx',x*256); dot.setAttribute('cy',y*256);
      bar.style.left = (100*k/points.length)+'%'; bar.style.width = (100/points.length)+'%';
      read($(h,'[data-grid]'), n+' × '+n+' grid');
      read($(h,'[data-fraction]'), 'Between '+k+'/'+points.length+' and '+(k+1)+'/'+points.length+' of the walk');
    }
    square.addEventListener('click', event => {
      const pt = square.createSVGPoint(); pt.x = event.clientX; pt.y = event.clientY;
      const local = pt.matrixTransform(square.getScreenCTM().inverse());
      x = clamp(local.x/256,0,.999999); y = clamp(local.y/256,0,.999999); show();
    });
    square.addEventListener('keydown', event => {
      const step = 1/curves[+slider.value].n;
      const moves = {ArrowLeft:[-step,0],ArrowRight:[step,0],ArrowUp:[0,-step],ArrowDown:[0,step]};
      if (!moves[event.key]) return;
      event.preventDefault(); const [dx,dy] = moves[event.key];
      x=clamp(x+dx,0,.999999); y=clamp(y+dy,0,.999999); show();
    });
    slider.addEventListener('input',show); enable(h); show();
  }

  const w = document.querySelector('.td-walls');
  if (w) {
    const slider = $(w,'input'), spec = $(w,'[data-dx]');
    function shift() {
      const f = +slider.value/100;
      $(w,'[data-flower]').setAttribute('transform','translate('+40*f+' 0)');
      $(spec,'[data-wall]').setAttribute('transform','translate('+spec.dataset.dx*f+' '+spec.dataset.dy*f+')');
      read($(w,'[data-alignment]'), f===0 ? 'Both tracings sit on the original walls.' :
        f===1 ? 'The flowers coincide. On the Spectre wall only the marked tile and scattered edges line up.' :
        'Compare the moving red edges with the fixed dark edges.');
    }
    slider.addEventListener('input',shift); enable(w); shift();
  }

  const walk = document.querySelector('.td-walk');
  if (walk) {
    const slider = $(walk,'input'), play = $(walk,'[data-play]'), tip = $(walk,'[data-tip]');
    const points = $(walk,'[data-ghost]').getAttribute('points').split(' ');
    const tiles = [...walk.querySelectorAll('[data-tile]')]; let timer = null;
    function draw() {
      const n = +slider.value, [x,y] = points[2*n-2].split(',');
      $(walk,'[data-ink]').setAttribute('points',points.slice(0,2*n-1).join(' '));
      tip.setAttribute('cx',x); tip.setAttribute('cy',y);
      tiles.forEach((tile,i) => tile.setAttribute('fill', i<n ? tile.dataset.colour : '#f0ebdf'));
      const label = n===9 ? ' · Pink is full.' : n===10 ? ' · First tile in orange.' : n===71 ? ' · Every tile visited.' : '';
      read($(walk,'[data-read]'),'Tile '+n+' of 71'+label);
    }
    function stop() { clearInterval(timer); timer=null; read(play,'Play'); }
    play.addEventListener('click',() => {
      if (timer!==null) { stop(); return; }
      if (+slider.value===71) slider.value=1;
      read(play,'Pause'); draw();
      timer=setInterval(()=>{ slider.value=Math.min(71,+slider.value+1); draw(); if (+slider.value===71) stop(); },170);
    });
    $(walk,'[data-door]').addEventListener('click',()=>{ stop(); slider.value=(+slider.value===9 ? 10 : 9); draw(); });
    slider.addEventListener('input',()=>{stop();draw();});
    document.addEventListener('visibilitychange',()=>{if(document.hidden) stop();});
    enable(walk);draw();
  }
})();
