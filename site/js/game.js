/* SERRT Solar Race Lab: the live race. Decision cards, pace control, HUD and the debrief.
   Energy maths lives in physics.js; rivals and weather in logic.js; drawing in js/draw; garage and charts in js/ui. */
(() => {
  'use strict';
  const { P, L, $, clamp, fmt, hhmm, signed, LIME, YELLOW, CORAL, SKY, S, R, fill, W, H, onTrack, pitBox, paddock, drawTrack, drawShowroom,
    sync, recompute, flushGarage, preparePlans, setStep, snapshotGarage, restoreGarage, renderHood, route } = SRL;

  /* ---------------- Race engine ---------------- */
  function show(id) { for (const s of ['garage', 'race', 'results']) $(s).hidden = s !== id; window.scrollTo({ top: 0 }); }
  function tick(text, color) { const d = document.createElement('div'); d.textContent = text; if (color) d.style.setProperty('--c', color); $('ticker').prepend(d); while ($('ticker').children.length > 4) $('ticker').lastChild.remove(); setTimeout(() => d.remove(), 5200); }
  function banner(title, sub, secs = 2) { $('bannerTitle').textContent = title; $('bannerSub').textContent = sub; $('banner').classList.add('show'); R.bannerUntil = performance.now() + secs * 1000; }
  const coachDay = () => S.optimization.best.speeds[Math.min(R.cars.length ? R.cars[0].race.state.day : 0, 2)];
  const modePace = m => clamp(coachDay() + { save: -5, cruise: 0, push: 5 }[m], 15, 65);
  function setPace(v) {
    R.pace = clamp(Math.round(v), 15, 65); $('pace').value = R.pace; $('paceValue').textContent = R.pace; fill($('pace'));
    for (const m of ['save', 'cruise', 'push']) { const b = document.querySelector(`[data-mode="${m}"]`); b.setAttribute('aria-pressed', String(modePace(m) === R.pace)); b.querySelector('small').textContent = modePace(m) + ' mph'; }
  }
  // Running order, sorted once per simulation step in stepAll().
  const ranked = () => R.order;
  // What happens by today's flag if the player holds this pace and the sky follows the forecast.
  function project(pace) {
    const live = R.cars[0].race.state, race = P.createRace(S.config), day = live.day; Object.assign(race.state, structuredClone(live));
    while (!race.state.done && race.state.day === day) race.step(pace, S.config.clouds[day]);
    const d = race.state.days[day]; return { laps: d.laps, flag: d.flag / S.config.battery };
  }
  function ask({ eyebrow, title, why, options, timeout, def = 0, focus = 0 }) {
    R.mode = 'deciding'; $('dEyebrow').textContent = eyebrow; $('dTitle').textContent = title; $('dWhy').textContent = why;
    $('dOpts').innerHTML = options.map((o, i) => `<button type="button" data-opt="${i}"${o.rec ? ' class="rec"' : ''}><b>${o.label}</b><small>${o.sub}</small></button>`).join('');
    const choose = i => { clearTimeout(R.dTimer); $('decision').hidden = true; if (R.mode === 'deciding') R.mode = 'running'; options[i].act(); };
    $('dOpts').querySelectorAll('button').forEach(b => b.addEventListener('click', () => choose(Number(b.dataset.opt))));
    R.choose = choose; R.optCount = options.length;
    const t = $('dTimer'); t.hidden = !timeout; if (timeout) { t.style.animation = 'none'; void t.offsetWidth; t.style.animation = `shrink ${timeout}s linear forwards`; R.dTimer = setTimeout(() => choose(def), timeout * 1000); }
    $('decision').hidden = false; $('dOpts').querySelectorAll('button')[focus].focus({ preventScroll: true });
  }
  function askDayPlan(day) {
    const st = R.cars[0].race.state, prev = st.days[day - 1], last = day === 2;
    const opts = ['save', 'cruise', 'push'].map(m => {
      const v = modePace(m), p = project(v), left = p.flag * 100;
      const note = last ? (left > 8 ? ` Charge left at the final flag scores nothing.` : '') : (left > 55 ? ` Evening sun refills most of that, so it buys nothing.` : '');
      return { label: `${m[0].toUpperCase() + m.slice(1)} · ${v} mph`, rec: m === 'cruise', sub: `${m === 'cruise' ? 'The coach’s pace. ' : ''}About ${p.laps} laps today, ${fmt(left)}% left at the flag.${note}`, act: () => setPace(v) };
    });
    ask({ eyebrow: `Day ${day + 1} · green flag`, title: last ? 'Last day. How do you spend it?' : 'How do you attack today?', focus: 1,
      why: (prev ? `Yesterday: ${prev.laps} laps, ${fmt(prev.flag / S.config.battery * 100)}% left at the flag. ` : '') + `Forecast ${S.config.clouds[day]}% cloud. ` + (last ? 'Charge left at tonight’s flag scores nothing.' : 'Sun refills the pack every evening and morning, so a slow day does not bank laps for tomorrow. Laps come from using the battery well.'), options: opts });
  }
  async function startRace() {
    flushGarage();
    $('next').disabled = true; $('next').textContent = 'Lining up the grid…';
    const plans = await preparePlans();
    $('next').disabled = false;
    const seed = (Math.random() * 2 ** 31) >>> 0;
    R.weather = L.makeWeather(S.config.clouds, seed); R.seed = seed;
    R.cars = [{ id: 'you', you: true, name: 'SERRT', abbr: 'YOU', color: LIME, cfg: { ...S.config }, race: P.createRace(S.config) },
      ...L.RIVALS.map((r, i) => ({ id: r.id, r, name: r.school, abbr: r.abbr, color: r.color, plan: plans[i], cfg: plans[i].config, race: P.createRace(plans[i].config) }))];
    R.cars.forEach((c, i) => { const s = paddock(i); Object.assign(c, { i, visF: 0, x: s.x, y: s.y, angle: s.angle, lane: ((i % 3) - 1) * 6, wasTrack: false }); });
    Object.assign(R, { mode: 'running', acc: 0, samples: [], steps: 0, pos: 0, lastTs: 0, length: Number($('raceLength').value), endAt: 0, asked: {}, restore: null });
    const cr = L.rng(seed ^ 99); R.clouds = Array.from({ length: 9 }, () => ({ x: cr() * W, y: cr() * H, rx: 70 + cr() * 90, ry: 26 + cr() * 30, w: .5 + cr() * .5 }));
    $('ticker').innerHTML = ''; $('decision').hidden = true; $('pause').textContent = '❚❚'; $('lapLabel').textContent = fmt(S.config.lap, 2) + ' MI / LAP';
    setMult(1); setPace(S.config.speeds[0]); stepAll(); show('race');
    banner('Day 1', 'Charging in the paddock until the 10:00 start', 2.2);
    cancelAnimationFrame(R.raf); R.raf = requestAnimationFrame(frame);
  }
  function stepAll() {
    const you = R.cars[0], st = you.race.state, day = st.day, hour = 7 + st.n / 120, cloud = R.weather.cloud(day, hour), cap = S.config.battery;
    if (st.n === 0) setPace(S.config.speeds[day]);
    for (const c of R.cars) { c.prev = c.sample; c.sample = c.race.step(c.you ? R.pace : L.rivalPace(c.r, c.plan, c.race), cloud); }
    R.order = [...R.cars].sort((a, b) => b.sample.laps - a.sample.laps || b.sample.distance - a.sample.distance);
    R.steps++;
    const s = you.sample, p = you.prev;
    if (R.steps % 2 === 0) R.samples.push({ t: s.t, battery: s.battery, sun: s.sun, draw: s.draw, cloud: s.cloud, speed: s.speed });
    if (s.dayEnd) {
      const pos = ranked().indexOf(you) + 1;
      if (st.done) { R.mode = 'done'; R.endAt = performance.now() + 1900; banner('Checkered flag', `${st.totalLaps} laps · P${pos} of ${R.cars.length}`, 1.9); }
      else banner('Checkered flag', `Day ${day + 1}: ${s.dayLaps} laps · P${pos}`, 2);
      return;
    }
    if (!p) return;
    if (s.track && !p.track) { for (const c of R.cars) c.visF = -0.012 - 0.011 * c.i; askDayPlan(day); return; }
    if (s.status !== p.status) {
      if (s.status === 'Solar-limited') tick('Battery flat. Crawling on sun power', CORAL);
      else if (s.status === 'Charging in pit') tick('Too little sun to move. Parked to recharge', CORAL);
      else if (s.status === 'Driver swap') tick('Driver swap in the pits', YELLOW);
    }
    if (!s.track) return;
    const end = P.schedule[day].end, bank = R.weather.days[day].bank, net = s.sun - s.draw;
    if (R.restore && hour > R.restore.until) { if (R.pace === R.restore.set) { setPace(R.restore.pace); tick(`Sky back to forecast. Back to ${R.pace} mph`); } R.restore = null; }
    if (bank && !R.asked['bank' + day] && hour >= bank.at - 1.3 * bank.width - 0.2 && hour < bank.at && bank.at < end - 0.4 && Math.abs(R.weather.cloud(day, bank.at) - S.config.clouds[day]) >= 12 && s.status === 'On track') {
      R.asked['bank' + day] = 1; const old = R.pace, until = bank.at + 1.4 * bank.width, dark = bank.size > 0, v = clamp(old + (dark ? -5 : 4), 15, 65);
      ask({ eyebrow: `Day ${day + 1} · ${hhmm(hour)} · weather`, title: dark ? 'Cloud bank rolling in.' : 'The sky is opening up.',
        why: dark ? 'Less sun for a while. Every watt you spend under it comes straight out of the battery.' : 'Extra sun for a while. Power you do not use now is gone.', timeout: 10, def: 1,
        options: [{ label: dark ? `Lift to ${v} mph` : `Push to ${v} mph`, sub: dark ? 'Protect the battery until it passes' : 'Turn the free sun into laps', act: () => { setPace(v); R.restore = { until, pace: old, set: v }; } },
          { label: `Hold ${old} mph`, sub: dark ? 'Keep the laps coming and pay from the battery' : 'Bank the extra sun in the battery', act: () => {} }] });
      return;
    }
    if (!R.asked['low' + day] && s.battery / cap < 0.12 && net < 0 && hour < end - 1 && s.status === 'On track') {
      R.asked['low' + day] = 1; const sunPace = Math.max(15, Math.floor(P.sustainable(S.config, s.sun))), flat = s.hour + s.battery * 970 / -net;
      ask({ eyebrow: `Day ${day + 1} · ${hhmm(hour)} · battery ${fmt(s.battery / cap * 100)}%`, title: 'The battery is nearly empty.',
        why: `At ${R.pace} mph you use ${fmt(-net)} W more than the sun gives. A flat battery means crawling at whatever the sun allows.`, timeout: 10, def: 1,
        options: [{ label: `Lift to ${sunPace} mph`, sub: 'The pace the sun can pay for right now', act: () => setPace(sunPace) }, { label: `Keep ${R.pace} mph`, sub: `Flat by about ${hhmm(flat)}, then a crawl`, act: () => {} }] });
      return;
    }
    if (day === 2 && !R.asked.final && hour >= end - 1.5 && s.status === 'On track') {
      R.asked.final = 1; const hold = project(R.pace);
      if (hold.flag > 0.06) { let v = R.pace, best = hold, hi = 66; // bisect for the fastest pace that still reaches the flag
        while (hi - v > 1) { const t = (v + hi) >> 1, pr = project(t); if (pr.flag < 0.005) hi = t; else { v = t; best = pr; } }
        if (v > R.pace) { ask({ eyebrow: `Day 3 · ${hhmm(hour)} · final 90 minutes`, title: `${fmt(s.battery / cap * 100)}% still in the battery.`, why: 'Charge left at the final flag scores nothing. This is the moment to spend it.', timeout: 12, def: 1,
          options: [{ label: `Empty the tank · ${v} mph`, sub: `${best.laps - hold.laps > 0 ? '+' + (best.laps - hold.laps) + ' laps' : 'More distance'}, finishing near 0%`, act: () => setPace(v) }, { label: `Hold ${R.pace} mph`, sub: `Finish with about ${fmt(hold.flag * 100)}% unused`, act: () => {} }] }); return; } }
    }
    if (s.battery / cap < 0.1 && !R.asked['warn' + day] && s.status === 'On track') { R.asked['warn' + day] = 1; tick('Battery under 10%', CORAL); }
    if (R.steps % 12 === 0) { const pos = ranked().indexOf(you) + 1; if (R.pos && pos !== R.pos) tick(pos < R.pos ? `Up to P${pos}` : `Down to P${pos}`, pos < R.pos ? LIME : CORAL); R.pos = pos; }
  }
  function frame(ts) {
    if (R.mode === 'idle') return;
    const dt = Math.min(0.05, R.lastTs ? (ts - R.lastTs) / 1000 : 0); R.lastTs = ts;
    let n = 0, moved = 0;
    if (R.mode === 'running') {
      const track = R.cars[0].sample.track, rate = (track ? 2880 / (0.86 * R.length) : 1803 / (0.14 * R.length)) * R.mult;
      R.acc += rate * dt;
      while (R.acc >= 1 && n < 80 && R.mode === 'running') { stepAll(); R.acc -= 1; n++; }
      if (n >= 80 || R.mode !== 'running') R.acc = 0;
    }
    const moving = R.mode === 'running';
    for (const c of R.cars) {
      const s = c.sample; let target;
      if (s.track && s.speed > 0) { if (moving) c.visF += s.speed / 45 * 0.26 * (1 + 0.3 * (R.mult - 1)) * dt; target = onTrack(c.visF, c.lane); }
      else if (s.track) target = pitBox(c.i);
      else target = paddock(c.i);
      const k = s.track && s.speed > 0 && c.wasTrack ? 1 : Math.min(1, dt * 7);
      const dx = (target.x - c.x) * k, dy = (target.y - c.y) * k; moved = Math.max(moved, Math.abs(dx), Math.abs(dy)); c.x += dx; c.y += dy; c.angle = target.angle; c.wasTrack = s.track && s.speed > 0;
    }
    if (moving) for (const b of R.clouds) { b.x += 14 * dt * (1 + .4 * R.mult); if (b.x - b.rx > W) b.x = -b.rx; }
    // Repaint only when something on the canvas changed: paused and deciding frames are skipped.
    const cw = $('track').clientWidth;
    if (moving || n > 0 || moved > 0.02 || R.dirty || cw !== R.cw) { drawTrack(); R.dirty = false; R.cw = cw; }
    if (ts - R.hudTs > 90) { R.hudTs = ts; renderHud(); }
    if (R.bannerUntil && ts > R.bannerUntil) { $('banner').classList.remove('show'); R.bannerUntil = 0; }
    if (R.mode === 'done' && ts > R.endAt) { finish(); return; }
    R.raf = requestAnimationFrame(frame);
  }
  function renderHud() {
    const you = R.cars[0], s = you.sample, cap = S.config.battery, pct = clamp(s.battery / cap * 100, 0, 100), order = ranked(), pos = order.indexOf(you) + 1, net = s.sun - s.draw;
    $('rDay').textContent = `DAY ${Math.min(s.day + 1, 3)} / 3`; $('rClock').textContent = hhmm(s.hour);
    $('rPhase').textContent = s.status + (s.speed > 0 ? ' · ' + fmt(s.speed) + ' mph' : '');
    $('rCloud').textContent = fmt(s.cloud) + '%'; $('rWx').style.left = s.cloud + '%';
    $('hudSun').textContent = fmt(s.sun); $('hudDraw').textContent = fmt(s.draw); $('hudBatt').textContent = fmt(pct) + '%'; $('hudBattK').textContent = fmt(s.battery, 1) + ' kWh';
    $('battDot').style.background = pct < 15 ? '#4a2a24' : '#2c3a26';
    $('arrSun').style.setProperty('--o', s.sun > 5 ? clamp(s.sun / 900, .3, 1) : 0);
    const wrap = $('arrBattWrap'); wrap.classList.toggle('rev', net < 0); wrap.style.setProperty('--c', net >= 0 ? LIME : CORAL); $('arrBatt').style.setProperty('--o', Math.abs(net) < 3 ? 0 : clamp(Math.abs(net) / 700, .3, 1));
    let v, col = 'var(--text)';
    if (!s.track) v = 'Parked in the paddock, soaking up sun.';
    else if (s.status === 'Driver swap') v = 'Driver swap. The panels keep collecting.';
    else if (s.status !== 'On track') { v = 'Battery empty. The car only gets what the sun gives.'; col = CORAL; }
    else if (net >= 0) { v = `The sun covers this pace. ${fmt(net)} W spare is filling the battery.`; col = LIME; }
    else { const until = s.hour + s.battery * 970 / -net, end = P.schedule[s.day].end; v = `Using ${fmt(-net)} W more than the sun gives. ` + (until >= end ? 'The battery lasts to today’s flag.' : `The battery is flat by ${hhmm(until)}.`); col = until >= end ? 'var(--text)' : CORAL; }
    $('verdict').textContent = v; $('verdict').style.color = col;
    $('hudLaps').textContent = s.laps; $('hudPos').textContent = 'P' + pos;
    const other = pos === 1 ? order[1] : order[pos - 2], gap = Math.abs(other.sample.laps - s.laps);
    $('hudGap').textContent = gap === 0 ? `Level on laps with ${other.name}` : pos === 1 ? `Leading ${other.name} by ${gap} lap${gap === 1 ? '' : 's'}` : `${gap} lap${gap === 1 ? '' : 's'} behind ${other.name}`;
    $('progressFill').style.width = clamp(s.t / 39 * 100, 0, 100) + '%';
    const sum = `Day ${Math.min(s.day + 1, 3)} of 3, ${s.status.toLowerCase()}. SERRT is P${pos} of ${order.length} with ${s.laps} laps, battery ${fmt(pct)}%, ${fmt(s.speed)} mph. ${pos === 1 ? 'Next' : 'Leader'}: ${(pos === 1 ? order[1] : order[0]).name}, ${(pos === 1 ? order[1] : order[0]).sample.laps} laps.`;
    if ($('trackSummary').textContent !== sum) $('trackSummary').textContent = sum;
    $('board').innerHTML = order.map((c, i) => `<div class="row8${c.you ? ' you' : ''}"><span class="pos">${i + 1}</span><span class="chip" style="--c:${c.color}">${c.abbr}</span><div><b>${c.name}</b><small>${c.sample.track ? (c.sample.speed > 0 ? fmt(c.sample.speed) + ' mph' : c.sample.status) : 'Charging'}</small></div><span class="n">${c.sample.laps}</span></div>`).join('');
  }
  function setMult(m) { R.mult = m; document.querySelectorAll('[data-mult]').forEach(b => b.setAttribute('aria-pressed', String(Number(b.dataset.mult) === m))); }
  function togglePause() { if (R.mode === 'running') { R.mode = 'paused'; $('pause').textContent = '▶'; } else if (R.mode === 'paused') { R.mode = 'running'; $('pause').textContent = '❚❚'; } }
  function toGarage(toStep) { clearTimeout(R.dTimer); R.mode = 'idle'; if (typeof toStep === 'number') setStep(toStep); show('garage'); sync(); }
  $('pause').addEventListener('click', togglePause);
  document.querySelectorAll('[data-mult]').forEach(b => b.addEventListener('click', () => setMult(Number(b.dataset.mult))));
  document.querySelectorAll('[data-mode]').forEach(b => b.addEventListener('click', () => setPace(modePace(b.dataset.mode))));
  $('quit').addEventListener('click', () => toGarage()); $('rebuild').addEventListener('click', () => toGarage(0)); $('again').addEventListener('click', () => startRace());
  $('pace').addEventListener('input', e => setPace(Number(e.target.value)));
  $('paceDown').addEventListener('click', () => setPace(R.pace - 1)); $('paceUp').addEventListener('click', () => setPace(R.pace + 1));
  document.addEventListener('keydown', e => {
    if ($('view-play').hidden || $('race').hidden || /INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName)) return;
    if (R.mode === 'deciding') { const n = Number(e.key); if (n >= 1 && n <= R.optCount) { e.preventDefault(); R.choose(n - 1); } return; }
    if (e.code === 'Space') { e.preventDefault(); togglePause(); }
    else if (e.code === 'ArrowUp' || e.code === 'ArrowRight') { e.preventDefault(); setPace(R.pace + 1); }
    else if (e.code === 'ArrowDown' || e.code === 'ArrowLeft') { e.preventDefault(); setPace(R.pace - 1); }
  });

  /* ---------------- Debrief ---------------- */
  function finish() {
    R.mode = 'idle';
    const you = R.cars[0], st = you.race.state, cap = S.config.battery, order = [...R.cars].sort((a, b) => b.race.state.totalLaps - a.race.state.totalLaps || b.race.state.totalDistance - a.race.state.totalDistance);
    const pos = order.indexOf(you) + 1, avg = st.totalDistance / 24, left = st.days[2].flag, b = S.optimization.best, lead = order[pos === 1 ? 1 : 0].race.state.totalLaps;
    $('resPlace').textContent = pos; $('resOf').textContent = 'of ' + order.length;
    $('resTitle').textContent = pos === 1 ? 'First across the sun.' : pos <= 3 ? 'On the podium.' : pos <= 5 ? 'Mid-pack. There is more in this car.' : 'Back to the garage.';
    $('resCopy').textContent = `${st.totalLaps} laps and ${fmt(st.totalDistance)} miles.` + (pos === 1 ? (st.totalLaps === lead ? ` ${order[1].name} matched your laps but covered less distance.` : ` ${order[1].name} finished ${st.totalLaps - lead} back.`) : ` ${order[0].name} won with ${lead}.`);
    const cards = [];
    if (left / cap > 0.08) { const laps = Math.floor(left * 970 / P.power(S.config, Math.max(20, avg)) * avg / S.config.lap); cards.push({ c: CORAL, k: 'LEFT IN THE TANK', v: fmt(left / cap * 100) + '%', t: `Worth about ${laps} more lap${laps === 1 ? '' : 's'}. Charge at the final flag scores nothing, so spend it on day 3.` }); }
    { const eve = [0, 1].map(i => st.days[i].flag / cap), slow = b.speeds[0] - avg;
      if (Math.max(...eve) > 0.55 && slow >= 2) cards.push({ c: CORAL, k: 'SAVING DOES NOT CARRY OVER', v: `${fmt(slow)} mph slow`, t: `You held about ${fmt(avg)} mph, the coach's plan is ${b.speeds[0]}. You ended a day with ${fmt(Math.max(...eve) * 100)}% in the pack, and the evening and morning sun refilled it for free. That charge could have been laps.` }); }
    if (st.limited > 0.25) cards.push({ c: CORAL, k: 'RAN FLAT', v: `${Math.floor(st.limited)} h ${String(Math.round(st.limited % 1 * 60)).padStart(2, '0')}`, t: 'The car crawled on sun power. Lifting a few mph earlier beats sprinting and then crawling.' });
    if (st.clipped > 0.3) cards.push({ c: YELLOW, k: 'WASTED SUN', v: fmt(st.clipped, 1) + ' kWh', t: 'The battery was full while the sun kept shining. Start each day faster to make room.' });
    if (!cards.length) cards.push({ c: LIME, k: 'CLEAN RUN', v: '0 wasted', t: 'No sun thrown away on a full battery and nothing left at the flag.' });
    const used = st.used, total = Object.values(used).reduce((a, v) => a + v, 0), top = Object.keys(used).sort((a, c) => used[c] - used[a])[0];
    cards.push(top === 'drag' ? { c: SKY, k: 'BIGGEST COST: AIR', v: fmt(used.drag / total * 100) + '%', t: 'Air drag ate the largest share of your energy. A lower, narrower body is free speed.', btn: ['Reshape the body', 0] }
      : { c: SKY, k: 'BIGGEST COST: WEIGHT', v: fmt(used[top] / total * 100) + '%', t: 'Rolling and hills cost more than the air did. Weight is the thing to cut.', btn: ['Change the pack', 1] });
    const d = st.totalLaps - b.laps; cards.push({ c: d >= 0 ? LIME : CORAL, k: 'YOU VS A FIXED PLAN', v: signed(d) + ' laps', t: `Holding ${b.speeds[0]} mph all weekend forecast ${b.laps} laps for this car. ${d >= 0 ? 'Your calls beat it.' : 'Your calls cost laps.'}` });
    $('whys').innerHTML = cards.map((c, i) => `<div class="whycard" style="--c:${c.c}"><span class="k">${c.k}</span><span class="v">${c.v}</span><p>${c.t}</p>${c.btn ? `<button class="quiet" data-fix="${c.btn[1]}">${c.btn[0]}</button>` : ''}</div>`).join('');
    $('whys').querySelectorAll('[data-fix]').forEach(x => x.addEventListener('click', () => toGarage(Number(x.dataset.fix))));
    $('resBoard').innerHTML = order.map((c, i) => `<div class="row8${c.you ? ' you' : ''}" style="break-inside:avoid"><span class="pos">${i + 1}</span><span class="chip" style="--c:${c.color}">${c.abbr}</span><div><b>${c.name}</b><small>${fmt(c.race.state.totalDistance)} mi</small></div><span class="n">${c.race.state.totalLaps}</span></div>`).join('');
    R.last = { samples: R.samples, days: st.days, used: st.used, laps: st.totalLaps, miles: st.totalDistance, sun: st.totalSun, avg, position: pos, seed: R.seed,
      field: order.map(c => ({ team: c.name, laps: c.race.state.totalLaps, miles: +c.race.state.totalDistance.toFixed(1), simulatedRival: !c.you })) };
    show('results'); renderHood();
  }

  function start(saved) {
    restoreGarage(saved);
    $('why').textContent = 'Change something and watch what it does to the car.';
    recompute(); route(); requestAnimationFrame(drawShowroom);
  }
  window.claude?.hot?.snapshot?.(() => snapshotGarage());
  window.claude?.hot?.ready ? window.claude.hot.ready(start) : start(window.claude?.hot?.data ?? {});

  Object.assign(SRL, { startRace, togglePause });
})();
