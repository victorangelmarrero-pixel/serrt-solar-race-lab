/* Under the hood: specs, energy breakdown, day table, charts and the copy-data button. */
(() => {
  'use strict';
  const { P, $, clamp, fmt, LIME, YELLOW, CORAL, SKY, S, R, canvas, toast } = SRL;

  /* ---------------- Under the hood ---------------- */
  function renderHood() {
    if (!S.forecast) return;
    const g = P.geometry(S.config), peak = P.solar(S.config, 13.29, 0, false), cap = S.config.battery, last = R.last;
    $('hoodSpecs').innerHTML = [[fmt(g.carMass) + ' kg', 'car mass, est.'], [fmt(g.cda, 3) + ' m²', 'drag area'], [fmt(peak) + ' W', 'peak sun power'], [fmt(P.sustainable(S.config, peak)) + ' mph', 'cruise on sun alone'], [fmt(cap * 970 / P.power(S.config, 45) * 45) + ' mi', 'battery-only range at 45 mph']]
      .map(([v, l]) => `<div class="spec"><b>${v}</b><span>${l}</span></div>`).join('');
    $('coachCopy').textContent = `Coach: ${S.optimization.best.speeds[0]} mph steady forecasts ${S.optimization.best.laps} laps. Your plan forecasts ${S.forecast.laps}.`;
    for (const id of ['energyPill', 'barsPill']) $(id).textContent = last ? 'YOUR LAST RACE' : 'FORECAST';
    const used = last ? last.used : S.fcUsed, total = Object.values(used).reduce((a, v) => a + v, 0), names = { drag: 'Air drag', rolling: 'Rolling resistance', corners: 'Corner braking', hills: 'Hills', drivetrain: 'Motor and controller losses', electronics: 'Electronics' };
    $('resBars').innerHTML = Object.keys(names).sort((a, c) => used[c] - used[a]).map(k => `<span>${names[k]}</span><div class="meter"><i style="width:${used[k] / total * 100}%;background:${k === 'drag' ? CORAL : k === 'rolling' ? YELLOW : SKY}"></i></div><b>${fmt(used[k], 1)} kWh</b>`).join('');
    $('dayTable').innerHTML = (last ? last.days : S.forecast.days).map((d, i) => `<tr><td>Day ${d.day}</td><td>${S.config.clouds[i]}%</td><td><strong>${d.laps}</strong></td><td>${fmt(d.distance, 1)}</td><td>${fmt(d.sun, 1)} kWh</td><td>${fmt(d.green / cap * 100)}%</td><td>${fmt(d.flag / cap * 100)}%</td></tr>`).join('');
    const curve = S.optimization.curve, top = curve.reduce((x, y) => x.laps >= y.laps ? x : y);
    $('energySummary').textContent = (last ? 'Your last race. ' : 'Forecast. ') + (last ? last.days : S.forecast.days).map(d => `Day ${d.day}: ${d.laps} laps, ${fmt(d.sun, 1)} kWh of sun, battery ${fmt(d.green / cap * 100)}% at the green flag and ${fmt(d.flag / cap * 100)}% at the checkered flag`).join('. ') + '.';
    $('speedSummary').textContent = `Laps forecast for each constant speed. Best: ${top.speed} mph with ${top.laps} laps. At ${curve[0].speed} mph: ${curve[0].laps} laps. At ${curve.at(-1).speed} mph: ${curve.at(-1).laps} laps.` + (last ? ` Your last race: ${last.laps} laps at about ${fmt(last.avg)} mph.` : '');
    drawCharts();
  }
  function drawCharts() {
    if ($('view-hood').hidden || !S.forecast) return;
    const last = R.last, samples = last ? last.samples : S.forecast.samples.map(s => ({ ...s, cloud: S.config.clouds[s.day] }));
    { const { g, w, h } = canvas('energyChart'), left = 38, right = w - 44, top = 12, bottom = h - 34, X = t => left + t / 39 * (right - left), Y = p => bottom - p * (bottom - top);
      const maxP = Math.max(2, Math.ceil(samples.reduce((m, s) => Math.max(m, s.sun / 1000, s.draw / 1000), 0)));
      g.font = '12px "DM Sans", Arial'; g.fillStyle = '#94a588'; g.strokeStyle = '#34402f'; g.lineWidth = 1;
      for (let i = 0; i <= 4; i++) { const y = Y(i / 4); g.beginPath(); g.moveTo(left, y); g.lineTo(right, y); g.stroke(); g.textAlign = 'right'; g.fillText(i * 25 + '%', left - 6, y + 4); g.textAlign = 'left'; g.fillText(fmt(maxP * i / 4, 1) + (i === 4 ? ' kW' : ''), right + 6, y + 4); }
      for (let d = 0; d < 3; d++) { const sc = P.schedule[d]; g.fillStyle = '#cfe59212'; g.fillRect(X(d * 13 + sc.start - 7), top, X(sc.end) - X(sc.start), bottom - top); g.fillStyle = '#94a588'; g.textAlign = 'center'; g.fillText('Day ' + (d + 1), X(d * 13 + 6.5), h - 6); g.fillText('07:00', X(d * 13) + 16, bottom + 13); if (d === 2) g.fillText('20:00', X(39) - 16, bottom + 13); }
      g.save(); g.beginPath(); g.rect(left, top, right - left, bottom - top); g.clip();
      for (const [key, color, scale, lw] of [['cloud', '#7f8b8688', 100, 1], ['sun', YELLOW, maxP * 1000, 1.4], ['draw', CORAL, maxP * 1000, 1.4], ['battery', LIME, S.config.battery, 2.2]]) {
        g.strokeStyle = color; g.lineWidth = lw; g.beginPath(); samples.forEach((s, i) => { const x = X(s.t), y = Y(s[key] / scale); i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.stroke(); }
      g.restore(); }
    { const { g, w, h } = canvas('speedChart'), a = S.optimization.curve, left = 38, right = w - 16, top = 22, bottom = h - 34;
      const min = Math.max(0, Math.floor(Math.min(...a.map(v => v.laps)) / 10) * 10 - 10), max = Math.ceil(Math.max(...a.map(v => v.laps), last ? last.laps : 0) / 10) * 10 + 10;
      const X = v => left + (v - 15) / 50 * (right - left), Y = l => bottom - (l - min) / (max - min) * (bottom - top);
      g.font = '12px "DM Sans", Arial'; g.fillStyle = '#94a588'; g.strokeStyle = '#34402f'; g.textAlign = 'right';
      for (let v = Math.ceil(min / 50) * 50; v <= max; v += 50) { const y = Y(v); g.beginPath(); g.moveTo(left, y); g.lineTo(right, y); g.stroke(); g.fillText(fmt(v), left - 6, y + 4); }
      g.textAlign = 'center'; for (const v of [15, 25, 35, 45, 55, 65]) g.fillText(v, X(v), bottom + 14); g.fillText('constant speed, mph', (left + right) / 2, h - 4);
      g.strokeStyle = LIME; g.lineWidth = 2; g.beginPath(); a.forEach((p, i) => i ? g.lineTo(X(p.speed), Y(p.laps)) : g.moveTo(X(p.speed), Y(p.laps))); g.stroke();
      const best = a.reduce((x, y) => x.laps >= y.laps ? x : y); g.fillStyle = LIME; g.beginPath(); g.arc(X(best.speed), Y(best.laps), 4.5, 0, 7); g.fill();
      g.font = 'bold 12px "DM Sans", Arial'; g.fillText(`${best.speed} mph · ${best.laps} laps`, clamp(X(best.speed), left + 55, right - 55), Y(best.laps) - 10);
      if (last) { const av = clamp(last.avg, 15, 65); g.strokeStyle = CORAL; g.lineWidth = 2; g.beginPath(); g.arc(X(av), Y(last.laps), 5.5, 0, 7); g.stroke(); g.fillStyle = CORAL; g.fillText(`Your race · ${last.laps}`, clamp(X(av), left + 45, right - 45), Y(last.laps) + 20); } }
  }
  $('copyRun').addEventListener('click', async () => {
    const last = R.last, payload = { name: 'SERRT Solar Race Lab', type: 'output of an educational model, not a race prediction', car: S.config,
      confirmedCarData: { name: 'Pitirre 3', lengthM: 5.029, widthM: 2.116, heightM: 1.405, wheelbaseM: 3.251, designWeightWithDriverLb: 1000, dimensionsSource: 'SERRT FSGP 2027 Mechanical PVDR, 11 Nov 2026', dragAreaAssumedNotDocumented: 0.14, cells: 'Samsung 50S 21700', arrangement: '32s9p', cellCount: 288, nominalVoltage: 115.2, maximumVoltage: 134.4, capacityAh: 45, derivedCapacityKWh: 5.184, source: 'SERRT Companies Presentation, page 8' },
      forecast: { laps: S.forecast.laps, miles: S.forecast.distance, days: S.forecast.days, coachSpeed: S.optimization.best.speeds[0], coachLaps: S.optimization.best.laps },
      lastRace: last ? { position: last.position, laps: last.laps, miles: last.miles, sunKWh: last.sun, days: last.days, energyUsedKWh: last.used, field: last.field, weatherSeed: last.seed } : null };
    try { await navigator.clipboard.writeText(JSON.stringify(payload, null, 2)); toast('Race data copied to the clipboard.'); } catch { toast('Copying was blocked by the browser.'); }
  });

  Object.assign(SRL, { renderHood, drawCharts });
})();
