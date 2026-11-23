const assert=require('node:assert/strict');
const P=require('../site/physics.js');
const c=structuredClone(P.defaults),r=P.simulate(c);
assert.equal(c.battery,115.2*45/1000);
assert.equal(r.days.length,3);
assert.equal(r.laps,r.days.reduce((s,d)=>s+d.laps,0));
assert.equal(r.samples.at(-1).laps,r.laps);
assert.equal(r.samples.at(-1).t,39);
for(const s of r.samples){assert(s.battery>=0&&s.battery<=c.battery);assert(Number.isFinite(s.distance));assert(s.speed>=0&&s.speed<=65);}
for(let d=1;d<3;d++){assert.equal(r.samples.find(s=>s.day===d).battery,r.days[d-1].end);}
const noPit=P.simulate({...c,swaps:0});
assert(Math.abs(noPit.distance-45*24)<1e-6);
assert(Math.abs(noPit.distance-r.distance-45*3*5/60)<1e-6);
assert(P.power(c,60)>P.power(c,30));
assert(P.power({...c,width:2.2},45)>P.power(c,45));
assert(P.solar(c,13,0,false)>P.solar(c,13,100,false));
assert(P.geometry({...c,length:3,width:1.3}).area<=3*1.3*.78);
const empty=P.simulate({...c,battery:1,area:1.5,clouds:[100,100,100],speeds:[65,65,65]});
assert(empty.samples.some(s=>s.status==='Charging in pit'));
assert(empty.distance<r.distance);
for(const s of empty.samples)assert(s.battery>=0&&s.battery<=1);
const best=P.optimize(c,true);assert(best.best.laps>=r.laps);
assert.equal(best.curve.length,51);
assert.equal(P.simulate({...c,speeds:best.best.speeds}).laps,best.best.laps);
const daily=P.optimize(c,false);assert(daily.best.laps>=best.best.laps);
console.log('PASS: battery units, charge bounds, 3-day carryover, lap counting, pit timing, cloud/drag effects, roof limits, low-energy recovery, constant and daily optimization.');
console.log(JSON.stringify({defaultLaps:r.laps,bestConstant:best.best.speeds,bestConstantLaps:best.best.laps,bestDaily:daily.best.speeds,bestDailyLaps:daily.best.laps,lowEnergyLaps:empty.laps}));

// ---- Game extensions ----
for(const mph of [0,20,45,65]){const p=P.parts(c,mph);assert(Math.abs(Object.values(p).reduce((a,b)=>a+b,0)-P.power(c,mph))<1e-9);}
for(const cfg of [c,{...c,speeds:[60,35,50],clouds:[0,100,40]},{...c,battery:1,area:1.5,clouds:[100,100,100],speeds:[65,65,65]},{...c,swaps:3,swapMinutes:7,tilt:false}]){
  const ref=P.simulate(cfg,false),race=P.createRace(cfg);let n=0,last;while(!race.state.done){last=race.step();n++;}
  assert.equal(n,3*1561);assert.equal(race.state.totalLaps,ref.laps);assert.equal(race.state.totalDistance,ref.distance);
  assert.equal(race.state.battery,ref.battery);assert.equal(race.state.totalSun,ref.sun);
  race.state.days.forEach((d,i)=>{for(const k of ['laps','distance','sun','green','flag','end','stopped'])assert.equal(d[k],ref.days[i][k]);});
  assert.equal(last.laps,ref.laps);assert.equal(race.step(),null);
}
{ // live pace and cloud overrides change the outcome, and energy stays accounted for
  const a=P.createRace(c),b=P.createRace(c);while(!a.state.done){a.step(45,10);b.step(45,90);}
  assert(a.state.totalSun>b.state.totalSun);
  const used=Object.values(a.state.used).reduce((x,y)=>x+y,0);assert(used>0&&Number.isFinite(used));
  const fast=P.createRace(c);while(!fast.state.done)fast.step(65,90);assert(fast.state.limited>0);
}
console.log('PASS: energy parts sum to power; stepper reproduces simulate() exactly; live pace/cloud overrides.');
