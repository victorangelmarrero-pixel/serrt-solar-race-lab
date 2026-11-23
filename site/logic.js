/* Race-day logic for the game layer: weather that drifts around the forecast, and scripted rival teams.
   Pure functions, no DOM. Rival cars and strategies are invented for the game. They are not real team data. */
(function (root) {
  'use strict';
  const P = (typeof module !== 'undefined' && module.exports) ? require('./physics.js') : root.SolarPhysics;
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

  const SCENARIOS = [
    { id: 'classic', name: 'Classic Ozarks', note: 'Clear start, grey day 2, bright finish.', clouds: [10, 60, 20] },
    { id: 'clear', name: 'Blue-sky sprint', note: 'Sun all three days. Raw speed pays.', clouds: [5, 10, 5] },
    { id: 'front', name: 'Storm front', note: 'A wall of cloud parks over day 2.', clouds: [25, 95, 45] },
    { id: 'haze', name: 'Long haze', note: 'Half sun every day. Efficiency pays.', clouds: [55, 50, 60] }
  ];

  // Cloud cover in percent for a given day and hour. It wanders around the day's forecast and may carry
  // one passing cloud bank or sun break per day. Same seed, same weather.
  function makeWeather(forecast, seed) {
    const r = rng(seed);
    const days = forecast.map(f => ({
      f, amp: 5 + 0.2 * Math.min(f, 100 - f), p1: r() * 6.283, p2: r() * 6.283,
      bank: r() < 0.7 ? { at: 10 + r() * 6.5, width: 0.35 + r() * 0.6, size: (r() < 0.55 ? 1 : -1) * (18 + r() * 24) } : null
    }));
    function cloud(day, hour) {
      const d = days[day];
      let c = d.f + d.amp * (0.6 * Math.sin(hour * 1.19 + d.p1) + 0.4 * Math.sin(hour * 2.9 + d.p2));
      if (d.bank) { const z = (hour - d.bank.at) / d.bank.width; c += d.bank.size * Math.exp(-z * z); }
      return clamp(c, 0, 100);
    }
    return { cloud, days };
  }

  // Seven schools from the 2026 FSGP single-occupant entry list. Car numbers, cars and tactics below are invented.
  const RIVALS = [
    { id: 'purdue', school: 'Purdue', abbr: 'PUR', color: '#e6c15c', car: { chassis: 292, cda: 0.108, rolling: 0.0052, cell: 24.5 }, bias: 0, gain: 26 },
    { id: 'stanford', school: 'Stanford', abbr: 'STA', color: '#ef7d6b', car: { chassis: 285, cda: 0.114, rolling: 0.0053, cell: 24.0 }, bias: 2, gain: 14 },
    { id: 'berkeley', school: 'Berkeley', abbr: 'CAL', color: '#7fb4f2', car: { chassis: 310, cda: 0.120, rolling: 0.0052, cell: 24.5 }, bias: -1, gain: 22 },
    { id: 'kentucky', school: 'Kentucky', abbr: 'UK', color: '#9aa6ff', car: { chassis: 325, cda: 0.128, rolling: 0.0055, cell: 24.0 }, bias: 0, gain: 18 },
    { id: 'waterloo', school: 'Waterloo', abbr: 'WAT', color: '#f2a65a', car: { chassis: 335, cda: 0.136, rolling: 0.0056, cell: 23.5 }, bias: 1, gain: 10 },
    { id: 'florida', school: 'Florida', abbr: 'UF', color: '#5fd0c5', car: { chassis: 350, cda: 0.142, rolling: 0.0058, cell: 23.5 }, bias: -2, gain: 16 },
    { id: 'mst', school: 'Missouri S&T', abbr: 'S&T', color: '#c9a2e8', car: { chassis: 365, cda: 0.150, rolling: 0.0060, cell: 23.0 }, bias: 3, gain: 6 }
  ];
  const LIMITS = {
    r2026: { area: 6, battery: 5.25, length: 5.8, width: 2.3, height: 1.65 },
    r2025: { area: 4, battery: 5.25, length: 5, width: 2.2, height: 1.6 },
    free: { area: 8, battery: 8, length: 6, width: 2.5, height: 1.7 }
  };

  // Rivals race the same track and forecast as the player, in cars built to the reference rule limits.
  function rivalConfig(r, player) {
    const lim = LIMITS[player.rule === 'r2025' ? 'r2025' : 'r2026'];
    return { ...P.defaults, ...r.car, area: Math.min(6, lim.area), battery: 5.25, lap: player.lap, climb: player.climb, corners: player.corners,
      swaps: 1, swapMinutes: 5, tilt: true, clouds: [...player.clouds], speeds: [45, 45, 45] };
  }
  function rivalPlan(r, player) {
    const config = rivalConfig(r, player);
    const best = P.optimize(config, true).best.speeds[0];
    return { config, base: clamp(best + r.bias, 20, 65) };
  }
  // Pace for this step: the planned speed, nudged by how far the battery is from a simple reserve plan.
  const FLOOR = [0.28, 0.16, 0];
  function rivalPace(r, plan, race) {
    const s = race.state, { start } = P.schedule[s.day], hour = 7 + s.n / 120;
    const f = clamp((hour - start) / 8, 0, 1), cap = plan.config.battery;
    const target = s.green / cap + (FLOOR[s.day] - s.green / cap) * f;
    return clamp(Math.round(plan.base + r.gain * (s.battery / cap - target)), 20, 65);
  }
  function runField(player, seed, playerPace) {
    const weather = makeWeather(player.clouds, seed);
    const cars = [{ id: 'you', race: P.createRace(player) }, ...RIVALS.map(r => { const plan = rivalPlan(r, player); return { id: r.id, r, plan, race: P.createRace(plan.config) }; })];
    while (!cars[0].race.state.done) {
      const s = cars[0].race.state, c = weather.cloud(s.day, 7 + s.n / 120);
      for (const car of cars) car.race.step(car.r ? rivalPace(car.r, car.plan, car.race) : (playerPace ? playerPace(car.race) : null), c);
    }
    return cars.map(c => ({ id: c.id, laps: c.race.state.totalLaps, miles: c.race.state.totalDistance })).sort((a, b) => b.laps - a.laps || b.miles - a.miles);
  }

  const api = { rng, SCENARIOS, RIVALS, LIMITS, makeWeather, rivalConfig, rivalPlan, rivalPace, runField };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.RaceLogic = api;
})(typeof window !== 'undefined' ? window : globalThis);
