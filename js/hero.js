// Portada (index.html): franja de circuito animada del hero. Fuera del HTML por la CSP.
/* Franja de circuito del hero: 10 pistas de izquierda a derecha. Cada haz recorre su pista y enciende
   el destino al llegar. Se recalcula al cambiar el tamaño de la ventana. */
(function(){
  const N = 10;          // número de pistas
  const T = 7000;        // ciclo de cada pista (ms)
  const SPEED = 0.42;    // velocidad del haz (px/ms)
  const LD = 38;         // longitud del haz (px)

  const NS = 'http://www.w3.org/2000/svg';
  const hero = document.getElementById('top');
  const svg = document.getElementById('hero-flow');
  if (!hero || !svg || !svg.animate) return;
  const wrap = hero.querySelector('.wrap'), flow = svg.parentNode;
  const G = n => svg.querySelector('.' + n);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // las 3 pistas de arriba suben un carril (y la primera otro más); las 3 de abajo bajan igual; las 4 centrales van rectas
  const X0  = [.05,.02,.07,0,.04,.01,.06,.03,.08,.02];          // inicio escalonado (fracción del ancho)
  const END = [.74,.90,.80,.97,.70,1,.85,.93,.77,.88];          // destino
  // derivaciones: salen de la última recta de una pista y ocupan el carril que dejan libre los quiebros
  const branches = [ {parent:3, dir:-1}, {parent:1, dir:-1}, {parent:6, dir:1}, {parent:8, dir:1} ];

  const polyLen = pts => pts.slice(1).reduce((s, p, i) => s + Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]), 0);
  const toD = pts => 'M' + pts.map(p => p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' L');
  function mk(tag, attrs, parent){ const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); parent.appendChild(e); return e; }

  function build(){
    ['wires','vias','dests','sparks','lit'].forEach(n => G(n).replaceChildren());
    const fr = flow.getBoundingClientRect(), wr = wrap.getBoundingClientRect();
    const W = fr.width, H = fr.height;
    if (!W || !H) return;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);

    // desde el borde izquierdo de la pantalla hasta el borde derecho del contenido (alineado con «Hablemos»)
    const rx0 = 0, rx1 = Math.min(W - 16, wr.right - 28 - fr.left);
    const RW = rx1 - rx0, X = f => rx0 + f * RW;
    const S = (H - 24) / (N + 3);                 // 10 carriles + el desplazamiento de los quiebros
    const cy = H / 2, laneY = i => cy + (i - (N - 1) / 2) * S;

    // fundido de entrada: en escritorio hasta el borde izquierdo del texto; en móvil, un tramo corto
    const xf = Math.max(60, Math.min(wr.left + 28 - fr.left, RW * .25));
    const fg = svg.getElementById('hf-fade-grad'), fa = svg.getElementById('hf-fade-a'), fb = svg.getElementById('hf-fade-b');
    fg.setAttribute('x1', rx0); fg.setAttribute('x2', xf);
    Object.entries({x:rx0, y:0, width:xf - rx0, height:H}).forEach(([k, v]) => fa.setAttribute(k, v));
    Object.entries({x:xf, y:0, width:W, height:H}).forEach(([k, v]) => fb.setAttribute(k, v));

    // geometría
    const traces = [];
    for (let lane = 0; lane < N; lane++){
      const jogs = [];
      if (lane <= 2)     jogs.push([X(.36), -1]);
      if (lane === 0)    jogs.push([X(.54), -1]);
      if (lane >= N - 3) jogs.push([X(.39), 1]);
      if (lane === N-1)  jogs.push([X(.57), 1]);
      let y = laneY(lane);
      const pts = [[X(X0[lane]), y]];
      for (const [jx, dl] of jogs){ pts.push([jx, y]); y += dl * S; pts.push([jx + S, y]); }
      pts.push([X(END[lane]), y]);
      traces.push({pts, len: polyLen(pts), delay: ((lane * 2.37) % 7) * 1000 - T});
    }
    const all = traces.slice();
    for (const b of branches){
      const p = traces[b.parent], [px, py] = p.pts[p.pts.length - 1], bx = X(.63), ny = py + b.dir * S;
      const pts = [[bx, py], [bx + S, ny], [bx + S + RW * .09, ny]];
      all.push({pts, len: polyLen(pts), delay: p.delay + (p.len - (px - bx)) / SPEED});
      mk('circle', {cx:bx, cy:py, r:2.3}, G('vias'));
    }

    // vías intermedias: pocas, solo sobre tramos rectos
    const flatY = (pts, x) => {
      for (let i = 1; i < pts.length; i++){
        const [ax, ay] = pts[i-1], [bx, by] = pts[i];
        if (ay === by && x > Math.min(ax, bx) + 14 && x < Math.max(ax, bx) - 14) return ay;
      }
      return null;
    };
    traces.forEach((t, i) => {
      [.22, .46, .70].forEach((f, k) => {
        if ((i + k) % 2) return;
        const x = X(f + (((i * 37) % 9) - 4) / 100), y = flatY(t.pts, x);
        if (y === null) return;
        if ((i + k) % 4 === 0) mk('rect', {x:x - 2.2, y:y - 2.2, width:4.4, height:4.4, transform:`rotate(45 ${x} ${y})`}, G('vias'));
        else mk('circle', {cx:x, cy:y, r:2}, G('vias'));
      });
    });

    // dibujo + animación
    const rNode = Math.max(3, Math.min(4.5, S * .3)), rHalo = rNode * 3.6;
    for (const t of all){
      const d = toD(t.pts), [ex, ey] = t.pts[t.pts.length - 1];
      mk('path', {d}, G('wires'));
      mk('circle', {cx:ex, cy:ey, r:rNode, class:'dest-off'}, G('dests'));
      const lit = mk('g', {}, G('lit'));
      mk('circle', {cx:ex, cy:ey, r:rHalo, fill:'url(#hf-halo)'}, lit);
      mk('circle', {cx:ex, cy:ey, r:rNode, fill:'url(#hf-gold)'}, lit);
      if (reduce) continue;

      const sp = mk('path', {d, 'stroke-dasharray':`${LD} ${t.len + LD + 20}`}, G('sparks'));
      const tr = (t.len + LD) / SPEED;
      sp.animate([
        {strokeDashoffset: LD,     opacity: 1, offset: 0},
        {strokeDashoffset: -t.len, opacity: 1, offset: Math.min(tr / T, .98)},
        {strokeDashoffset: -t.len, opacity: 0, offset: 1},
      ], {duration: T, delay: t.delay, iterations: Infinity});

      // destino apagado hasta que llega la cabeza del haz
      const a = Math.min((t.len / SPEED) / T, .6);
      lit.animate([
        {opacity: 0, transform: 'scale(.6)',   offset: 0},
        {opacity: 0, transform: 'scale(.6)',   offset: a},
        {opacity: 1, transform: 'scale(1.15)', offset: a + 0.015},
        {opacity: 1, transform: 'scale(1)',    offset: a + 0.09},
        {opacity: 0, transform: 'scale(1)',    offset: Math.min(a + 0.34, 0.99)},
        {opacity: 0, transform: 'scale(1)',    offset: 1},
      ], {duration: T, delay: t.delay, iterations: Infinity});
    }
  }

  let rt;
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(build);
  addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(build, 150); });
})();
