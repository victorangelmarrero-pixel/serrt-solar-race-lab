/* Tabs: Play, Under the hood and Meet SERRT (the team tab is static HTML). Also handles resize. */
(() => {
  'use strict';
  const { $, R, sync, renderHood, drawCharts } = SRL;
  const togglePause = () => SRL.togglePause(); // defined in game.js, loaded later

  /* ---------------- Tabs ---------------- */
  function route() {
    const view = { '#hood': 'hood', '#team': 'team' }[location.hash] || 'play';
    for (const v of ['play', 'hood', 'team']) { $('view-' + v).hidden = v !== view; v === view ? $('tab-' + v).setAttribute('aria-current', 'page') : $('tab-' + v).removeAttribute('aria-current'); }
    if (view !== 'play' && R.mode === 'running') togglePause();
    if (view === 'hood') { sync(); renderHood(); }
    R.dirty = true;
    window.scrollTo({ top: 0 });
  }
  addEventListener('hashchange', route);
  let rz; addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => { drawCharts(); R.dirty = true; }, 120); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(drawCharts);

  Object.assign(SRL, { route });
})();
