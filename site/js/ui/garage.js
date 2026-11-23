/* Garage: the three-step car builder, live "why" chips, forecast and rival plans. */
(() => {
  'use strict';
  const { P, L, $, clamp, fmt, signed, LIME, CORAL, PIT, preset, S, R, toast, fill } = SRL;
  const renderHood = () => SRL.renderHood(), startRace = () => SRL.startRace(); // defined in modules loaded later
  const numeric = ['area', 'battery', 'length', 'width', 'height', 'chassis', 'cda', 'rolling', 'cell', 'motor', 'lap', 'climb', 'corners', 'swaps', 'swapMinutes'];

  const BODIES = [
    { id: 'pitirre', name: 'Pitirre 3', note: "SERRT's real body: 5.03 m long, 2.12 m wide, 1.40 m at the canopy.", dims: { length: PIT.length, width: PIT.width, height: PIT.height }, tags: [['real dimensions', 1], ['big panel deck', 1]] },
    { id: 'dart', name: 'Dart', note: 'Long, narrow and low. It slices the air but leaves less room for panel.', dims: { length: 5.6, width: 1.4, height: 0.85 }, tags: [['low drag', 1], ['tight panel', 0]] },
    { id: 'compact', name: 'Compact', note: 'Short and light. Not enough deck for a full panel.', dims: { length: 4.2, width: 1.7, height: 1.1 }, tags: [['lighter', 1], ['less panel', 0]] }
  ];
  const BATTS = [
    { id: 'light', name: 'Light pack', kwh: 3.0, note: 'Sheds weight. Thin reserve when clouds roll in.' },
    { id: 'mid', name: 'Mid pack', kwh: 4.2, note: 'A little lighter, a little less to lean on.' },
    { id: 'serrt', name: 'SERRT pack', kwh: 5.184, note: "The team's real pack: 288 cells, 5.18 kWh." }
  ];
  const PLANS = [
    { id: 'save', name: 'Save', off: -3, note: 'Bank charge early. Safer if the clouds run long.' },
    { id: 'coach', name: "Coach's pace", off: 0, note: 'The steady speed the forecast likes best.' },
    { id: 'push', name: 'Push', off: 3, note: 'Spend early and hope the sun pays you back.' }
  ];


  let locked = true, planOffset = 0, customPace = false, step = 0;
  let queued, lastControl = null, anchor = null, anchorTimer, rivalEst = null;

  /* ---------------- Static markup ---------------- */
  $('bodyCards').innerHTML = BODIES.map(b => `<button type="button" class="card" id="body-${b.id}" data-body="${b.id}" aria-pressed="false">
    <div class="shape"><i style="width:${b.dims.length * 13}px;height:${b.dims.width * 13}px"></i></div><div class="t"><b>${b.name}</b><br><small>${b.note}</small></div>
    <div class="tags">${b.tags.map(([t, good]) => `<i class="${good ? '' : 'bad'}">${good ? '+' : '−'} ${t}</i>`).join('')}</div></button>`).join('');
  $('battCards').innerHTML = BATTS.map(b => { const kg = Math.round((b.kwh - 5.184) / 0.18); return `<button type="button" class="card" id="batt-${b.id}" data-batt="${b.id}" aria-pressed="false">
    <div class="t"><b>${b.name}</b><br><small>${b.note}</small></div><div class="tags"><i>${fmt(b.kwh, 1)} kWh</i>${kg ? `<i>${kg} kg</i>` : '<i>documented</i>'}</div></button>`; }).join('');
  $('scenarios').innerHTML = L.SCENARIOS.map(s => `<button type="button" class="card" id="scen-${s.id}" data-scen="${s.id}" aria-pressed="false"><b>${s.name}</b>
    <span class="sky3">${s.clouds.map(c => `<i style="--c:${c / 100}"></i>`).join('')}</span><small>${s.note}</small></button>`).join('');
  $('planCards').innerHTML = PLANS.map(p => `<button type="button" class="card" id="plan-${p.id}" data-plan="${p.id}" aria-pressed="false"><div class="t"><b>${p.name}</b><br><small>${p.note}</small></div><div class="tags"><i id="planTag-${p.id}"></i></div></button>`).join('');
  $('dayControls').innerHTML = [0, 1, 2].map(d => `<div><h3 style="font-size:12px;letter-spacing:.14em;color:var(--muted)" id="dayTitle${d}">DAY ${d + 1}</h3>
    <div class="ctl"><div class="row"><label for="speed${d}">Pace</label><output id="speedValue${d}"></output></div><input id="speed${d}" type="range" min="15" max="65" step="1"></div>
    <div class="ctl"><div class="row"><label for="cloud${d}">Cloud</label><output id="cloudValue${d}"></output></div><input id="cloud${d}" type="range" min="0" max="100" step="5"></div></div>`).join('');

  const limits = () => L.LIMITS[S.config.rule] || L.LIMITS.r2026;
  const roofMax = () => Math.floor(Math.min(limits().area, S.config.length * S.config.width * 0.78) * 10) / 10;
  function metrics() { const g = P.geometry(S.config); return { sun: P.solar(S.config, 13.29, 0, false), cda: g.cda, mass: g.carMass, batt: S.config.battery, laps: S.optimization ? S.optimization.best.laps : 0 }; }

  /* ---------------- Garage ---------------- */
  function sync() {
    const lim = limits();
    for (const k of ['length', 'width', 'height', 'battery']) { S.config[k] = Math.min(S.config[k], lim[k]); $(k).max = lim[k]; }
    S.config.height = Math.max(S.config.height, 0.8);
    const roof = roofMax(); S.config.area = clamp(S.config.area, 1.5, roof); $('area').max = roof;
    const g0 = P.geometry(S.config);
    for (const k of numeric) { if (document.activeElement === $(k) && (k === 'chassis' || k === 'cda')) continue; $(k).value = k === 'chassis' ? Math.round(g0.carMass) : k === 'cda' ? +g0.cda.toFixed(3) : S.config[k]; }
    $('tilt').checked = S.config.tilt; $('sameSpeed').checked = locked; $('ruleSet').value = S.config.rule;
    $('areaValue').textContent = fmt(S.config.area, 1) + ' m²'; $('roofLimit').textContent = fmt(roof, 1) + ' m² is all that fits';
    $('batteryValue').textContent = fmt(S.config.battery, 2) + ' kWh';
    $('lengthValue').textContent = fmt(S.config.length, 2) + ' m'; $('widthValue').textContent = fmt(S.config.width, 2) + ' m'; $('heightValue').textContent = fmt(S.config.height, 2) + ' m';
    const real = ['length', 'width', 'height'].every(k => Math.abs(S.config[k] - PIT[k]) < 0.001) && Math.abs(S.config.battery - 5.184) < 0.001;
    $('batteryTag').textContent = real ? 'PITIRRE 3 · DESIGN REPORT DIMENSIONS' : 'MODIFIED DESIGN';
    $('dimsLabel').textContent = `${fmt(S.config.length, 2)} × ${fmt(S.config.width, 2)} × ${fmt(S.config.height, 2)} m`;
    for (const b of BODIES) $('body-' + b.id).setAttribute('aria-pressed', String(['length', 'width', 'height'].every(k => Math.abs(S.config[k] - Math.min(b.dims[k], lim[k])) < 0.001)));
    for (const b of BATTS) $('batt-' + b.id).setAttribute('aria-pressed', String(Math.abs(S.config.battery - b.kwh) < 0.001));
    for (const s of L.SCENARIOS) $('scen-' + s.id).setAttribute('aria-pressed', String(s.clouds.every((c, i) => c === S.config.clouds[i])));
    for (const p of PLANS) $('plan-' + p.id).setAttribute('aria-pressed', String(!customPace && p.off === planOffset));
    for (let d = 0; d < 3; d++) {
      $('speed' + d).value = S.config.speeds[d]; $('cloud' + d).value = S.config.clouds[d];
      $('speedValue' + d).textContent = S.config.speeds[d] + ' mph'; $('cloudValue' + d).textContent = S.config.clouds[d] + '%';
      $('speed' + d).disabled = locked && d > 0;
    }
    $('dayTitle0').textContent = locked ? 'DAY 1 · SETS ALL' : 'DAY 1';
    document.querySelectorAll('#garage input[type=range], #view-hood input[type=range]').forEach(fill);
    for (let i = 0; i < 3; i++) { $('step' + i).hidden = i !== step; document.querySelector(`[data-step="${i}"]`).toggleAttribute('aria-current', i === step); if (i === step) document.querySelector(`[data-step="${i}"]`).setAttribute('aria-current', 'step'); }
    $('back').style.visibility = step ? 'visible' : 'hidden'; $('lenWrap').hidden = step !== 2;
    $('next').textContent = ['Next: power →', 'Next: race day →', 'Go racing ▶'][step];
    const g1 = P.geometry(S.config);
    $('carSummary').textContent = `Top view of the car: ${fmt(S.config.length, 2)} m long, ${fmt(S.config.width, 2)} m wide, ${fmt(S.config.height, 2)} m tall, ${fmt(S.config.area, 1)} square metres of solar panel, ${fmt(S.config.battery, 2)} kWh battery, about ${fmt(g1.carMass)} kg without the driver, drag area ${fmt(g1.cda, 3)} square metres.`;
  }
  function renderMeters() {
    const m = metrics(), lim = limits();
    $('mSun').textContent = fmt(m.sun) + ' W'; $('mSunBar').style.width = clamp(m.sun / 1800, .03, 1) * 100 + '%';
    $('mAero').textContent = 'CdA ' + fmt(m.cda, 3); $('mAeroBar').style.width = clamp(1 - (m.cda - 0.04) / 0.2, .03, 1) * 100 + '%';
    $('mMass').textContent = fmt(m.mass) + ' kg'; $('mMassBar').style.width = clamp(1 - (m.mass - 180) / 260, .03, 1) * 100 + '%';
    $('mBatt').textContent = fmt(m.batt, 2) + ' kWh'; $('mBattBar').style.width = clamp(m.batt / lim.battery, .03, 1) * 100 + '%';
    if (anchor && lastControl) {
      const chip = (id, text, good, show) => { const e = $(id); e.textContent = text; e.className = (show ? 'show ' : '') + (good ? '' : 'bad'); };
      const ds = m.sun - anchor.sun, dd = (m.cda / anchor.cda - 1) * 100, dm = m.mass - anchor.mass, db = m.batt - anchor.batt, dl = m.laps - anchor.laps;
      chip('mSunD', signed(ds) + ' W', ds > 0, Math.abs(ds) >= 1);
      chip('mAeroD', signed(dd) + '% drag', dd < 0, Math.abs(dd) >= 0.5);
      chip('mMassD', signed(dm) + ' kg', dm < 0, Math.abs(dm) >= 0.5);
      chip('mBattD', signed(db, 2) + ' kWh', db > 0, Math.abs(db) >= 0.01);
      const dir = { length: S.config.length - anchor.length, width: S.config.width - anchor.width, height: S.config.height - anchor.height, area: S.config.area - anchor.area, battery: db }[lastControl];
      const text = {
        width: dir > 0 ? 'Wider: more room for panel, but more air to push and more weight.' : 'Narrower: less air to push, and less room for panel.',
        height: dir > 0 ? 'Taller: a bigger hole to punch through the air.' : 'Lower: a smaller hole in the air. Free speed.',
        length: dir > 0 ? 'Longer: more panel room for a little extra drag and weight.' : 'Shorter: lighter, but the panel may stop fitting.',
        area: dir > 0 ? 'More panel: more watts every sunny minute.' : 'Less panel: a touch lighter, fewer watts all day.',
        battery: dir > 0 ? 'Bigger pack: more reserve for clouds, more weight on every lap.' : 'Smaller pack: lighter, with less to lean on when clouds arrive.'
      }[lastControl] || lastControl;
      $('why').innerHTML = text + (dl ? ` <b style="color:${dl > 0 ? LIME : CORAL}">${signed(dl)} laps.</b>` : '');
    }
    const n = $('scoreLaps'); if (n.textContent !== String(m.laps)) { n.textContent = m.laps; n.classList.remove('pop'); void n.offsetWidth; n.classList.add('pop'); }
    if (rivalEst) { const pos = 1 + rivalEst.filter(l => l > m.laps).length; $('scorePos').textContent = `Forecast: P${pos} of 8`; $('scoreNote').textContent = pos === 1 ? 'On paper this car beats the field. Now drive it.' : `Laps at its best steady pace. The car ahead forecasts ${Math.min(...rivalEst.filter(l => l > m.laps))}.`; }
    else { $('scorePos').textContent = 'Forecast laps'; $('scoreNote').textContent = 'Sizing up the rivals…'; }
    for (const p of PLANS) $('planTag-' + p.id).textContent = clamp(S.optimization.best.speeds[0] + p.off, 15, 65) + ' mph';
  }
  function recompute() {
    sync();
    S.optimization = P.optimize({ ...S.config, speeds: [45, 45, 45] }, true);
    if (!customPace) S.config.speeds = S.optimization.best.speeds.map(v => clamp(v + planOffset, 15, 65));
    S.forecast = P.simulate(S.config, true);
    const fr = P.createRace(S.config); while (!fr.state.done) fr.step(); S.fcUsed = fr.state.used;
    R.last = null; sync(); renderMeters(); renderHood(); ensurePlans();
  }
  function begin() { if (!anchor) anchor = { ...metrics(), length: S.config.length, width: S.config.width, height: S.config.height, area: S.config.area }; }
  function touch(control) {
    begin(); lastControl = control;
    clearTimeout(anchorTimer); anchorTimer = setTimeout(() => { anchor = null; document.querySelectorAll('.m em').forEach(e => e.classList.remove('show')); }, 2600);
    clearTimeout(queued); sync(); queued = setTimeout(recompute, 90);
  }
  for (const k of numeric) $(k).addEventListener('input', e => { if (!Number.isFinite(e.target.valueAsNumber)) return; begin(); const v = clamp(e.target.valueAsNumber, Number(e.target.min), Number(e.target.max));
    if (k === 'chassis') S.config.chassis += v - P.geometry(S.config).carMass; else if (k === 'cda') S.config.cda *= v / P.geometry(S.config).cda; else S.config[k] = v;
    touch(k); });
  for (let d = 0; d < 3; d++) {
    $('speed' + d).addEventListener('input', e => { customPace = true; S.config.speeds[d] = Number(e.target.value); if (locked) S.config.speeds = [S.config.speeds[0], S.config.speeds[0], S.config.speeds[0]]; touch(null); });
    $('cloud' + d).addEventListener('input', e => { S.config.clouds[d] = Number(e.target.value); touch(null); });
  }
  document.querySelectorAll('[data-body]').forEach(b => b.addEventListener('click', () => { const body = BODIES.find(x => x.id === b.dataset.body); begin(); Object.assign(S.config, body.dims); sync(); S.config.area = roofMax(); touch(body.note); }));
  document.querySelectorAll('[data-batt]').forEach(b => b.addEventListener('click', () => { const x = BATTS.find(v => v.id === b.dataset.batt); begin(); S.config.battery = x.kwh; touch('battery'); }));
  document.querySelectorAll('[data-scen]').forEach(b => b.addEventListener('click', () => { const s = L.SCENARIOS.find(v => v.id === b.dataset.scen); begin(); S.config.clouds = [...s.clouds]; touch(s.note); }));
  document.querySelectorAll('[data-plan]').forEach(b => b.addEventListener('click', () => { const p = PLANS.find(v => v.id === b.dataset.plan); begin(); planOffset = p.off; customPace = false; touch(p.note); }));
  document.querySelectorAll('[data-step]').forEach(b => b.addEventListener('click', () => { step = Number(b.dataset.step); sync(); }));
  $('back').addEventListener('click', () => { step = Math.max(0, step - 1); sync(); });
  $('next').addEventListener('click', () => { if (step < 2) { step++; sync(); } else startRace(); });
  $('sameSpeed').addEventListener('change', e => { locked = e.target.checked; if (locked) S.config.speeds = [S.config.speeds[0], S.config.speeds[0], S.config.speeds[0]]; touch(null); });
  $('tilt').addEventListener('change', e => { S.config.tilt = e.target.checked; touch(null); });
  $('ruleSet').addEventListener('change', e => { S.config.rule = e.target.value; touch(null); });
  $('resetSetup').addEventListener('click', () => { S.config = preset(); locked = true; planOffset = 0; customPace = false; recompute(); toast('SERRT preset restored.'); });
  $('applyBest').addEventListener('click', () => { customPace = false; planOffset = 0; recompute(); toast("Coach's pace set."); });

  let planCache = { key: '', plans: [] }, planJob = 0, planTimer;
  const planKey = () => JSON.stringify([S.config.rule, S.config.lap, S.config.climb, S.config.corners, S.config.clouds]);
  async function buildPlans() {
    const key = planKey(); if (planCache.key === key) return;
    const job = ++planJob, plans = [], est = [];
    for (const r of L.RIVALS) { const p = L.rivalPlan(r, S.config); plans.push(p); est.push(P.simulate({ ...p.config, speeds: [p.base, p.base, p.base] }, false).laps); await new Promise(res => setTimeout(res, 0)); if (job !== planJob) return; }
    planCache = { key, plans }; rivalEst = est; if (S.optimization) renderMeters();
  }
  function ensurePlans() { if (planCache.key === planKey()) return; rivalEst = null; clearTimeout(planTimer); planTimer = setTimeout(buildPlans, 500); }

  /* ---------------- What the race engine and saved state need from the garage ---------------- */
  const flushGarage = () => { clearTimeout(queued); recompute(); };
  const preparePlans = async () => { clearTimeout(planTimer); await buildPlans(); if (planCache.key !== planKey()) await buildPlans(); return planCache.plans; };
  const setStep = n => { step = n; };
  const snapshotGarage = () => ({ v: 2, config: S.config, locked, planOffset, customPace, step });
  function restoreGarage(saved) {
    if (saved && saved.config && saved.v === 2) { S.config = { ...preset(), ...saved.config }; locked = saved.locked !== false; planOffset = saved.planOffset || 0; customPace = !!saved.customPace; step = saved.step || 0; }
  }

  Object.assign(SRL, { sync, recompute, flushGarage, preparePlans, setStep, snapshotGarage, restoreGarage });
})();
