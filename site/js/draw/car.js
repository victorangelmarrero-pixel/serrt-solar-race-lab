/* Car drawings: generic rival car, Pitirre 3 from the design report's top view, and the garage showroom. */
(() => {
  'use strict';
  const { $, clamp, fmt, PIT, S, canvas, round } = SRL;

  function car(g, x, y, angle, color, scale, shape) {
    g.save(); g.translate(x, y); g.rotate(angle); g.scale(scale, scale);
    const len = shape.length * 7, wide = shape.width * 7;
    g.fillStyle = '#1b2b2155'; g.beginPath(); g.ellipse(3, 4, len * .62, wide * .69, 0, 0, Math.PI * 2); g.fill();
    round(g, -len * .34, -wide * .63, len * .18, wide * .21, 2, '#25332c'); round(g, -len * .34, wide * .42, len * .18, wide * .21, 2, '#25332c');
    round(g, len * .24, -wide * .54, len * .18, wide * .17, 2, '#25332c'); round(g, len * .24, wide * .37, len * .18, wide * .17, 2, '#25332c');
    g.fillStyle = color; g.beginPath(); g.moveTo(len * .50, 0); g.bezierCurveTo(len * .50, -wide * .5, len * .2, -wide * .57, -len * .43, -wide * .47);
    g.quadraticCurveTo(-len * .55, 0, -len * .43, wide * .47); g.bezierCurveTo(len * .2, wide * .57, len * .50, wide * .5, len * .50, 0); g.fill();
    const ps = Math.sqrt(Math.min(1, shape.area / (shape.length * shape.width * .78)));
    const pl = len * .65 * ps, pw = wide * .77 * ps; round(g, -pl * .62, -pw / 2, pl, pw, 2, '#133b4b');
    g.strokeStyle = '#72a2ac66'; g.lineWidth = .45;
    for (let a = 1; a < 7; a++) { g.beginPath(); g.moveTo(-pl * .62 + pl * a / 7, -pw / 2); g.lineTo(-pl * .62 + pl * a / 7, pw / 2); g.stroke(); }
    for (let a = 1; a < 3; a++) { g.beginPath(); g.moveTo(-pl * .62, -pw / 2 + pw * a / 3); g.lineTo(pl * .38, -pw / 2 + pw * a / 3); g.stroke(); }
    g.fillStyle = '#bdd9d2'; g.beginPath(); g.ellipse(len * .22, 0, len * .15, wide * .23, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#315768'; g.beginPath(); g.ellipse(len * .24, 0, len * .11, wide * .19, 0, 0, Math.PI * 2); g.fill(); g.restore();
  }
  // Pitirre 3 from the design report's top view: bullet nose, flat panel deck, canopy bubble behind the centre,
  // four enclosed wheels (motor on the left-rear).
  function pitirre(g, x, y, angle, scale, shape, detail) {
    g.save(); g.translate(x, y); g.rotate(angle); g.scale(scale, scale);
    const len = shape.length * 7, wide = shape.width * 7, hw = wide / 2, n = len / 2;
    const body = () => { g.beginPath(); g.moveTo(n, 0); g.bezierCurveTo(n, -hw * .78, n - len * .13, -hw, n - len * .27, -hw); g.lineTo(-n + len * .30, -hw); g.lineTo(-n + len * .22, -hw * .88); g.lineTo(-n + len * .03, -hw * .88); g.lineTo(-n, -hw * .74);
      g.lineTo(-n, hw * .74); g.lineTo(-n + len * .03, hw * .88); g.lineTo(-n + len * .22, hw * .88); g.lineTo(-n + len * .30, hw); g.lineTo(n - len * .27, hw); g.bezierCurveTo(n - len * .13, hw, n, hw * .78, n, 0); g.closePath(); };
    g.fillStyle = '#1b2b2155'; g.beginPath(); g.ellipse(3, 4, len * .56, wide * .6, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#e4f391'; body(); g.fill();
    const ps = Math.sqrt(Math.min(1, shape.area / (shape.length * shape.width * .78)));
    g.save(); body(); g.clip(); g.fillStyle = '#133b4b'; g.beginPath(); g.roundRect(-n * .93 * ps, -hw * .9 * ps, len * .9 * ps, wide * .9 * ps, 3); g.fill();
    g.strokeStyle = '#72a2ac66'; g.lineWidth = .4;
    for (let a = 1; a < 10; a++) { const px = -n * .93 * ps + len * .9 * ps * a / 10; g.beginPath(); g.moveTo(px, -hw * ps); g.lineTo(px, hw * ps); g.stroke(); }
    for (let a = 1; a < 4; a++) { const py = -hw * .9 * ps + wide * .9 * ps * a / 4; g.beginPath(); g.moveTo(-n, py); g.lineTo(n, py); g.stroke(); }
    g.restore();
    g.strokeStyle = '#e4f391'; g.lineWidth = 1; body(); g.stroke();
    const fx = n - len * .22, rx = fx - PIT.wheelbase / PIT.length * len;
    if (detail) { g.fillStyle = '#0d141099'; for (const wx of [fx, rx]) for (const s of [-1, 1]) { g.beginPath(); g.roundRect(wx - len * .055, s * hw * .78 - wide * .035, len * .11, wide * .07, 1.2); g.fill(); }
      g.strokeStyle = '#d7f269'; g.lineWidth = .7; g.beginPath(); g.roundRect(rx - len * .055, -hw * .78 - wide * .035, len * .11, wide * .07, 1.2); g.stroke(); }
    const cxp = n - PIT.cockpitAt * len;
    g.fillStyle = '#e4f391'; g.beginPath(); g.moveTo(cxp + len * .13, 0); g.bezierCurveTo(cxp + len * .13, -hw * .34, cxp - len * .02, -hw * .36, cxp - len * .22, -hw * .08); g.lineTo(cxp - len * .22, hw * .08); g.bezierCurveTo(cxp - len * .02, hw * .36, cxp + len * .13, hw * .34, cxp + len * .13, 0); g.fill();
    g.fillStyle = '#bdd9d2'; g.beginPath(); g.ellipse(cxp + len * .03, 0, len * .085, hw * .25, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#315768'; g.beginPath(); g.ellipse(cxp + len * .04, 0, len * .065, hw * .19, 0, 0, Math.PI * 2); g.fill();
    g.restore();
  }
  // Showroom: air streaks bend round the body (more frontal area, more and redder streaks); sun rays scale with panel area.
  const streaks = Array.from({ length: 90 }, (_, i) => ({ x: Math.random(), y: (i + Math.random()) / 90, v: .5 + Math.random() * .6 }));
  let showTs = 0;
  function drawShowroom(ts) {
    requestAnimationFrame(drawShowroom);
    if ($('view-play').hidden || $('garage').hidden) return;
    const dt = Math.min(.05, (ts - showTs) / 1000 || 0); showTs = ts;
    const { g, w, h } = canvas('carCanvas'); if (w < 120) return;
    const sc = Math.min((w - 90) / (5.8 * 7), 7, (h - 100) / (2.3 * 7 * 1.25)), cx = w / 2, cy = (h - 44) * .46, len = S.config.length * 7 * sc, wide = S.config.width * 7 * sc;
    const frontal = clamp((S.config.width * S.config.height - 1.1) / 2.7, 0, 1), sunFrac = clamp(S.config.area / 8, 0, 1);
    const glow = g.createRadialGradient(40, 30, 4, 40, 30, 200); glow.addColorStop(0, `rgba(255,214,102,${.25 + .45 * sunFrac})`); glow.addColorStop(1, 'rgba(255,214,102,0)'); g.fillStyle = glow; g.fillRect(0, 0, w, h);
    g.strokeStyle = `rgba(255,214,102,${.10 + .3 * sunFrac})`; g.lineWidth = 2;
    for (let i = 0; i < 6; i++) { const tx = cx - len * .35 + len * .55 * i / 5; g.beginPath(); g.moveTo(40, 30); g.lineTo(tx, cy - wide * .15 + (i % 2) * wide * .3); g.stroke(); }
    const n = Math.round(26 + 64 * frontal); g.lineWidth = 1.6; g.lineCap = 'round';
    for (let i = 0; i < n; i++) {
      const s = streaks[i]; s.x -= s.v * dt * .55; if (s.x < -.1) { s.x = 1.1; s.y = Math.random(); }
      const x = s.x * w, y0 = 20 + s.y * (h * .84 - 40), u = (x - cx) / (len * .58), hw = Math.abs(u) < 1 ? wide * .64 * Math.sqrt(1 - u * u) + 7 : 0;
      const dy = y0 - cy, y = hw && Math.abs(dy) < hw ? cy + (dy < 0 ? -1 : 1) * (hw + Math.abs(dy) * .15) : y0;
      const near = hw && Math.abs(dy) < hw * 1.6;
      g.strokeStyle = near ? `rgba(241,137,120,${.35 + .5 * frontal})` : `rgba(143,199,216,${.22 + .2 * frontal})`;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + 22 + 16 * s.v, y); g.stroke();
    }
    pitirre(g, cx, cy, 0, sc, S.config, true);
    if (w >= 520) { // side profile: flat deck, canopy bubble at the report's cockpit position; total height follows the slider
      const k = Math.min(24, (w * .34) / 5.8), sl = S.config.length * k, sx = w - 14 - sl, gy = 46 + 1.65 * k + 8, top = gy - S.config.height * k, deck = gy - Math.min(S.config.height * .42, .62) * k, wr = PIT.tyreRadius * k;
      g.fillStyle = '#e4f391'; g.beginPath(); g.moveTo(sx + sl, gy - wr * .9); g.quadraticCurveTo(sx + sl * .9, deck, sx + sl * .7, deck); g.lineTo(sx + sl * .12, deck); g.lineTo(sx, deck + (gy - wr * .7 - deck) * .5); g.lineTo(sx + sl * .04, gy - wr * .7); g.lineTo(sx + sl * .97, gy - wr * .7); g.closePath(); g.fill();
      const cpx = sx + sl * (1 - PIT.cockpitAt); g.beginPath(); g.moveTo(cpx + sl * .12, deck + 1); g.quadraticCurveTo(cpx + sl * .06, top, cpx - sl * .02, top); g.quadraticCurveTo(cpx - sl * .12, top, cpx - sl * .26, deck + 1); g.closePath(); g.fill();
      g.fillStyle = '#25332c'; for (const f of [.22, .22 + PIT.wheelbase / PIT.length]) { g.beginPath(); g.arc(sx + sl * (1 - f), gy - wr, wr, 0, 7); g.fill(); }
      g.fillStyle = '#a0ada2'; g.font = '12px "DM Sans", Arial'; g.textAlign = 'right'; g.fillText('side · ' + fmt(S.config.height, 2) + ' m tall', w - 14, gy + 14);
    }
    g.strokeStyle = '#a0ada299'; g.fillStyle = '#c3cdbf'; g.lineWidth = 1; g.font = '600 12px "DM Sans", Arial'; g.textAlign = 'center';
    const ly = cy + wide * .62 + 14; g.beginPath(); g.moveTo(cx - len * .5, ly); g.lineTo(cx + len * .5, ly); g.moveTo(cx - len * .5, ly - 5); g.lineTo(cx - len * .5, ly + 5); g.moveTo(cx + len * .5, ly - 5); g.lineTo(cx + len * .5, ly + 5); g.stroke();
    g.fillText(fmt(S.config.length, 2) + ' m', cx, ly + 15);
    const lx = cx - len * .5 - 16; g.beginPath(); g.moveTo(lx, cy - wide * .5); g.lineTo(lx, cy + wide * .5); g.moveTo(lx - 5, cy - wide * .5); g.lineTo(lx + 5, cy - wide * .5); g.moveTo(lx - 5, cy + wide * .5); g.lineTo(lx + 5, cy + wide * .5); g.stroke();
    g.save(); g.translate(lx - 8, cy); g.rotate(-Math.PI / 2); g.fillText(fmt(S.config.width, 2) + ' m', 0, 0); g.restore();
  }

  Object.assign(SRL, { car, pitirre, drawShowroom });
})();
