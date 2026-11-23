/* Track drawing: the illustrative circuit, paddock and pit lane, and the live race canvas. */
(() => {
  'use strict';
  const { L, clamp, signed, LIME, CORAL, S, R, canvas, round, car, pitirre } = SRL;

  /* ---------------- Circuit (illustrative, not a survey of Ozarks) ---------------- */
  const W = 1000, H = 580;
  const points = [[560, 500], [400, 497], [240, 485], [140, 430], [105, 330], [150, 230], [250, 170], [360, 190], [420, 260], [500, 285], [575, 225], [560, 140], [650, 88], [785, 108], [865, 190], [855, 290], [775, 335], [695, 300], [640, 360], [705, 425], [690, 485]];
  const path = [];
  for (let i = 0; i < points.length; i++) for (let j = 0; j < 24; j++) {
    const t = j / 24, t2 = t * t, t3 = t2 * t, n = points.length, p0 = points[(i - 1 + n) % n], p1 = points[i], p2 = points[(i + 1) % n], p3 = points[(i + 2) % n];
    path.push([0, 1].map(k => 0.5 * ((2 * p1[k]) + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3)));
  }
  const lengths = [0];
  for (let i = 1; i <= path.length; i++) { const a = path[i - 1], b = path[i % path.length]; lengths.push(lengths[i - 1] + Math.hypot(a[0] - b[0], a[1] - b[1])); }
  function onTrack(f, lane = 0) {
    const target = ((f % 1) + 1) % 1 * lengths.at(-1); let lo = 1, hi = lengths.length - 1;
    while (lo < hi) { const m = (lo + hi) >> 1; if (lengths[m] < target) lo = m + 1; else hi = m; }
    const a = path[lo - 1], b = path[lo % path.length], r = (target - lengths[lo - 1]) / (lengths[lo] - lengths[lo - 1] || 1), ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
    return { x: a[0] + (b[0] - a[0]) * r - Math.sin(ang) * lane, y: a[1] + (b[1] - a[1]) * r + Math.cos(ang) * lane, angle: ang };
  }
  const pitBox = i => ({ x: 292 + i * 36, y: 452, angle: Math.PI });
  const paddock = i => ({ x: 258 + (i % 4) * 62, y: 352 + Math.floor(i / 4) * 46, angle: -Math.PI / 2 });
  let terrainCanvas;
  function terrain() {
    if (terrainCanvas) return terrainCanvas;
    const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
    const bg = g.createLinearGradient(0, 0, W, H); bg.addColorStop(0, '#b9c89b'); bg.addColorStop(1, '#8fa979'); g.fillStyle = bg; g.fillRect(0, 0, W, H);
    const rnd = L.rng(2027);
    for (let i = 0; i < 5000; i++) { g.fillStyle = i % 2 ? '#d8ddb31a' : '#57724d14'; g.fillRect(rnd() * W, rnd() * H, 1.6, 1.6); }
    g.strokeStyle = '#6d98a233'; g.lineWidth = 16; g.lineCap = 'round'; g.beginPath(); g.moveTo(930, -10); g.bezierCurveTo(900, 150, 960, 330, 925, 600); g.stroke();
    function road(width, color, dash = []) { g.strokeStyle = color; g.lineWidth = width; g.lineJoin = 'round'; g.lineCap = 'round'; g.setLineDash(dash); g.beginPath(); path.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.closePath(); g.stroke(); g.setLineDash([]); }
    g.save(); g.translate(0, 5); road(50, '#4f6d4c40'); g.restore();
    road(48, '#7c9568'); road(41, '#e7e4c9'); road(40, '#c1766255', [9, 12]); road(33, '#4f594f'); road(29, '#5d665a'); road(1, '#c0c5b077', [10, 14]);
    const p = onTrack(0); g.save(); g.translate(p.x, p.y); g.rotate(p.angle);
    for (let x = 0; x < 2; x++) for (let y = 0; y < 7; y++) { g.fillStyle = (x + y) % 2 ? '#2e3a2f' : '#f1f1d6'; g.fillRect(x * 4 - 4, y * 4.4 - 15.4, 4, 4.4); } g.restore();
    g.strokeStyle = '#7f8a74'; g.lineWidth = 15; g.lineCap = 'round'; g.beginPath(); g.moveTo(628, 478); g.quadraticCurveTo(600, 452, 560, 452); g.lineTo(290, 452); g.quadraticCurveTo(240, 452, 215, 474); g.stroke();
    g.strokeStyle = '#cfd4b6'; g.lineWidth = 1; g.setLineDash([5, 6]); g.stroke(); g.setLineDash([]);
    round(g, 222, 318, 262, 104, 10, '#a9b78f'); g.strokeStyle = '#dfe4c6'; g.lineWidth = 1; g.beginPath(); g.roundRect(222, 318, 262, 104, 10); g.stroke();
    for (let i = 0; i < 8; i++) { const s = paddock(i); g.strokeStyle = '#eef1d880'; g.strokeRect(s.x - 13, s.y - 20, 26, 40); }
    g.fillStyle = '#3e5738'; g.font = 'bold 10px Arial'; g.textAlign = 'center'; g.fillText('SOLAR PADDOCK', 353, 333); g.fillText('PIT LANE', 425, 437);
    const trees = [[52, 150, 22], [60, 500, 20], [80, 80, 17], [190, 90, 20], [300, 100, 16], [470, 120, 20], [455, 190, 13], [500, 60, 15], [640, 190, 15], [700, 200, 18], [760, 230, 13], [920, 420, 22], [870, 500, 19], [800, 430, 15], [790, 520, 21], [930, 80, 18], [600, 400, 14], [560, 370, 12], [190, 300, 13], [45, 300, 17], [330, 250, 14], [270, 262, 11], [140, 540, 16], [450, 545, 14], [300, 548, 12]];
    for (const [x, y, r] of trees) { g.fillStyle = '#4e674533'; g.beginPath(); g.ellipse(x + 8, y + 9, r * 1.1, r * .5, .3, 0, 7); g.fill(); for (let j = 0; j < 3; j++) { g.fillStyle = ['#5f8056', '#78945e', '#8ca46a'][j]; g.beginPath(); g.arc(x - j * 3, y - j * 4, r - j * 3, 0, 7); g.fill(); } }
    terrainCanvas = c; return c;
  }

  function drawTrack() {
    const { g, w, h } = canvas('track'); g.drawImage(terrain(), 0, 0, w, h); g.save(); g.scale(w / W, h / H);
    const s = R.cars[0].sample, cover = s.cloud / 100;
    for (const b of R.clouds) { g.fillStyle = `rgba(28,44,40,${0.26 * cover * b.w})`; g.beginPath(); g.ellipse(b.x, b.y, b.rx, b.ry, -.12, 0, 7); g.fill(); }
    for (let i = R.cars.length - 1; i >= 0; i--) {
      const c = R.cars[i], cs = c.sample;
      if (c.you) { // battery ring round the player's car
        const frac = clamp(cs.battery / S.config.battery, 0, 1);
        g.lineWidth = 4; g.strokeStyle = '#1c322099'; g.beginPath(); g.arc(c.x, c.y, 24, 0, 7); g.stroke();
        g.strokeStyle = frac < .15 ? CORAL : LIME; g.lineCap = 'round'; g.beginPath(); g.arc(c.x, c.y, 24, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2); g.stroke();
      }
      if (!cs.track && cs.sun > 20) { g.fillStyle = '#ffd95e'; g.beginPath(); g.arc(c.x + 12, c.y - 16, 3, 0, 7); g.fill(); }
      c.you ? pitirre(g, c.x, c.y, c.angle, 0.92, c.cfg, false) : car(g, c.x, c.y, c.angle, c.color, 0.92, c.cfg);
      g.font = 'bold 9px Arial'; g.textAlign = 'center'; const label = c.you ? 'SERRT' : c.abbr, tw = g.measureText(label).width;
      round(g, c.x - tw / 2 - 4, c.y - 43 + (c.you ? 0 : 13), tw + 8, 13, 3, c.you ? '#1c3220' : '#f0f2dcd9'); g.fillStyle = c.you ? '#e3faad' : '#2c402e'; g.fillText(label, c.x, c.y - 33.5 + (c.you ? 0 : 13));
      if (c.you && cs.track) { const net = cs.sun - cs.draw, t = signed(net) + ' W'; g.font = 'bold 11px Arial'; const nw = g.measureText(t).width; round(g, c.x - nw / 2 - 5, c.y + 30, nw + 10, 16, 4, '#111815d9'); g.fillStyle = net >= 0 ? LIME : CORAL; g.fillText(t, c.x, c.y + 42); }
    }
    g.fillStyle = `rgba(40,56,52,${0.2 * cover})`; g.fillRect(0, 0, W, H);
    const a = clamp(Math.sin(Math.PI * (s.hour - 6.1) / 14.8), 0, 1), low = (1 - a) * (1 - a);
    if (low > 0.02) { g.fillStyle = `rgba(255,168,84,${0.3 * low})`; g.fillRect(0, 0, W, H); g.fillStyle = `rgba(18,26,48,${0.38 * low * (1 - a)})`; g.fillRect(0, 0, W, H); }
    g.restore();
  }

  Object.assign(SRL, { W, H, onTrack, pitBox, paddock, drawTrack });
})();
