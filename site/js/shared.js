/* SERRT Solar Race Lab: helpers, colours, the documented Pitirre 3 preset and the state every module shares.
   Load order: physics.js, logic.js, js/shared.js, js/draw/*.js, js/ui/*.js, js/game.js. */
window.SRL = (() => {
  'use strict';
  const P = SolarPhysics, L = RaceLogic, $ = id => document.getElementById(id);
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const fmt = (n, d = 0) => Number(n).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
  const hhmm = h => { const m = Math.floor((h + 1e-6) * 60); return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'); };
  const signed = (n, d = 0) => (n > 0 ? '+' : n < 0 ? '−' : '') + fmt(Math.abs(n), d);
  const LIME = '#d7f269', YELLOW = '#ffca54', CORAL = '#f18978', SKY = '#8fc7d8';

  // Pitirre 3 as documented in SERRT's FSGP 2027 Mechanical PVDR (11 Nov 2026). Drag area is NOT in the report: 0.14 m2 is assumed.
  const PIT = { length: 5.03, width: 2.12, height: 1.40, carMass: 453.6 - 80, cdaAssumed: 0.14, wheelbase: 3.25, tyreRadius: 0.271, cockpitAt: 0.57 };
  function preset() {
    const c = { ...structuredClone(P.defaults), length: PIT.length, width: PIT.width, height: PIT.height, area: 6, battery: 5.184 };
    let g = P.geometry(c); c.cda *= PIT.cdaAssumed / g.cda; c.chassis += PIT.carMass - g.carMass; return c;
  }

  /* ---------------- Shared state ---------------- */
  // S: the car being designed and its forecast. R: the live race.
  const S = { config: preset(), optimization: null, forecast: null, fcUsed: null };
  const R = { mode: 'idle', cars: [], weather: null, mult: 1, length: 120, acc: 0, pace: 45, samples: [], steps: 0, lastTs: 0, hudTs: 0, pos: 0, bannerUntil: 0, clouds: [], endAt: 0, asked: {}, restore: null, last: null, dTimer: 0, raf: 0 };

  let toastTimer;
  function toast(m) { $('toast').textContent = m; $('toast').classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => $('toast').classList.remove('show'), 3000); }
  function fill(el) { el.style.setProperty('--fill', 100 * (Number(el.value) - Number(el.min)) / (Number(el.max) - Number(el.min)) + '%'); }

  /* ---------------- Canvas helpers ---------------- */
  function canvas(id) {
    const el = $(id), w = el.clientWidth, h = el.clientHeight, dpr = Math.min(devicePixelRatio || 1, 2);
    if (el.width !== Math.round(w * dpr) || el.height !== Math.round(h * dpr)) { el.width = Math.round(w * dpr); el.height = Math.round(h * dpr); }
    const g = el.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, w, h); return { g, w, h };
  }
  function round(g, x, y, w, h, r, fillStyle) { g.fillStyle = fillStyle; g.beginPath(); g.roundRect(x, y, w, h, r); g.fill(); }

  return { P, L, $, clamp, fmt, hhmm, signed, LIME, YELLOW, CORAL, SKY, PIT, preset, S, R, toast, fill, canvas, round };
})();
