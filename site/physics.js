/* Educational FSGP-inspired energy model. SI internally; mph/miles at the UI boundary. */
(function (root) {
  'use strict';
  const MPH = 0.44704, MILE = 1609.344;
  const defaults = { rule:'r2026', area:6, battery:5.184, length:4.5, width:1.8, height:1, chassis:220, cda:0.11, rolling:0.0055, cell:24, motor:94, lap:3.97, climb:45, corners:5, swaps:1, swapMinutes:5, tilt:true, speeds:[45,45,45], clouds:[10,60,20] };
  const schedule=[{start:10,end:18},{start:9,end:17},{start:9,end:17}];
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  function geometry(c) {
    const maxArea=c.length*c.width*0.78;
    const area=Math.min(c.area,maxArea);
    const carMass=c.chassis+(c.battery-5.184)/0.18+(area-6)*3+(c.length-4.5)*8+(c.width-1.8)*10;
    const cda=c.cda*(c.width/1.8)*(c.height/1)*(1+0.035*(c.length-4.5));
    return {area,maxArea,carMass,mass:carMass+80,cda};
  }
  function solar(c, hour, cloud, parked) {
    const lat=38.27*Math.PI/180, decl=21.5*Math.PI/180, angle=(hour-13.29)*Math.PI/12;
    const alt=Math.sin(lat)*Math.sin(decl)+Math.cos(lat)*Math.cos(decl)*Math.cos(angle);
    if(alt<=0.01)return 0;
    const elevation=Math.asin(alt)*180/Math.PI;
    const am=1/(alt+0.50572*Math.pow(elevation+6.07995,-1.6364));
    const dni=1353*Math.pow(0.7,Math.pow(am,0.678));
    const ghi=1.1*dni*alt, cover=cloud/100;
    const k=1-0.75*Math.pow(cover,3.4),direct=dni*alt*(1-cover);
    const diffuse=Math.max(0,k*ghi-direct);
    const irradiance=parked&&c.tilt ? dni*(1-cover)+diffuse : direct+diffuse;
    return geometry(c).area*(c.cell/100)*0.93*irradiance;
  }
  function power(c,mph) {
    if(mph<=0) return 25;
    const g=geometry(c), v=mph*MPH, corner=Math.min(v,35*MPH), lap=c.lap*MILE;
    const drag=0.5*1.17*g.cda*v*v*v;
    const rolling=g.mass*9.81*c.rolling*v;
    const corners=0.5*g.mass*(v*v-corner*corner)*c.corners*0.5*v/lap;
    const hills=g.mass*9.81*c.climb*0.2*v/lap;
    return (drag+rolling+corners+hills)/(c.motor/100)+25;
  }
  function sustainable(c,watts,max=65) {
    let lo=0,hi=max;
    for(let i=0;i<16;i++){const mid=(lo+hi)/2;if(power(c,mid)>watts)hi=mid;else lo=mid;}
    return lo;
  }
  function simulate(input, detailed=true) {
    const c={...defaults,...input};
    let battery=c.battery,totalDistance=0,totalLaps=0,totalSun=0;
    const days=[],samples=[];
    const dt=30/3600;
    for(let day=0;day<3;day++){
      let distance=0,sun=0,green=battery,flag=battery,stopped=0,parked=false;
      const {start,end}=schedule[day];
      for(let n=0;n<=1560;n++){
        const hour=7+n/120, track=hour>=start&&hour<end;
        if(n===(start-7)*120)green=battery;
        if(n===(end-7)*120)flag=battery;
        let pit=false;
        for(let s=1;s<=c.swaps;s++){
          const begin=start+8*s/(c.swaps+1);
          if(n>=Math.round((begin-7)*120)&&n<Math.round((begin-7)*120)+Math.round(c.swapMinutes*2))pit=true;
        }
        let speed=track&&!pit?c.speeds[day]:0;
        if(parked&&battery>=c.battery*0.15)parked=false;
        if(parked)speed=0;
        const charging=hour<start-0.25||hour>=end+1/6;
        let sunlight=solar(c,hour,c.clouds[day],charging||parked);
        if(track&&!pit&&!parked&&battery<0.0001){
          speed=Math.min(speed,sustainable(c,sunlight));
          if(speed<10){speed=0;parked=true;sunlight=solar(c,hour,c.clouds[day],true);}
        }
        let draw=track?power(c,speed):0;
        // Never spend energy the battery and current sunlight cannot supply in this step.
        if(speed>0 && draw>sunlight+battery*1000*0.97/dt){
          speed=sustainable(c,sunlight+battery*1000*0.97/dt,speed);
          if(speed<10){speed=0;parked=true;sunlight=solar(c,hour,c.clouds[day],true);}
          draw=power(c,speed);
        }
        const status=!track?'Solar charging':pit?'Driver swap':parked?'Charging in pit':speed<c.speeds[day]-0.1?'Solar-limited':'On track';
        if(detailed && n%2===0) samples.push({day,hour,t:day*13+hour-7,battery,sun:sunlight,draw,speed,distance:totalDistance+distance,dayDistance:distance,laps:totalLaps+Math.floor((distance+1e-8)/c.lap),status});
        if(n===1560)break;
        const net=(sunlight-draw)*dt/1000;
        battery=clamp(battery+(net>=0?net*0.97:net/0.97),0,c.battery);
        const added=sunlight*dt/1000;sun+=added;
        if(track){distance+=speed*dt;if(speed<10)stopped+=dt;}
      }
      const laps=Math.floor((distance+1e-8)/c.lap);
      days.push({day:day+1,distance,laps,sun,green,flag,end:battery,stopped,target:c.speeds[day],cloud:c.clouds[day]});
      totalDistance+=distance;totalLaps+=laps;totalSun+=sun;
    }
    return {laps:totalLaps,distance:totalDistance,sun:totalSun,battery,finalFlag:days[2].flag,days,samples,speeds:[...c.speeds]};
  }
  function optimize(c, same=true) {
    const curve=[];let best=simulate(c,false);
    const better=(a,b)=>a.laps>b.laps||(a.laps===b.laps&&a.distance>b.distance);
    for(let v=15;v<=65;v++){
      const r=simulate({...c,speeds:[v,v,v]},false);curve.push({speed:v,laps:r.laps});
      if(better(r,best))best=r;
    }
    if(!same){
      // Coordinate search; deliberately called best FOUND, not a global optimum.
      for(let pass=0;pass<2;pass++)for(let d=0;d<3;d++)for(let v=15;v<=65;v++){
        const speeds=[...best.speeds];speeds[d]=v;
        const r=simulate({...c,speeds},false);if(better(r,best))best=r;
      }
    }
    return {best,curve};
  }
  /* ---- Game extensions. Everything above is the tested model, unchanged. ---- */
  // Battery-side watts split by cause. The parts add up to power().
  function parts(c,mph) {
    if(mph<=0) return {drag:0,rolling:0,corners:0,hills:0,drivetrain:0,electronics:25};
    const g=geometry(c), v=mph*MPH, corner=Math.min(v,35*MPH), lap=c.lap*MILE;
    const drag=0.5*1.17*g.cda*v*v*v;
    const rolling=g.mass*9.81*c.rolling*v;
    const corners=0.5*g.mass*(v*v-corner*corner)*c.corners*0.5*v/lap;
    const hills=g.mass*9.81*c.climb*0.2*v/lap;
    const wheel=drag+rolling+corners+hills;
    return {drag,rolling,corners,hills,drivetrain:wheel/(c.motor/100)-wheel,electronics:25};
  }
  // Step-by-step version of simulate() so a player can change pace mid-race and cloud can vary within a day.
  // With no arguments to step() it reproduces simulate() exactly (see tests).
  function createRace(input) {
    const c={...defaults,...input};
    const dt=30/3600;
    const s={day:0,n:0,battery:c.battery,distance:0,totalDistance:0,totalLaps:0,totalSun:0,sun:0,green:c.battery,flag:c.battery,
      stopped:0,parked:false,done:false,days:[],clipped:0,limited:0,used:{drag:0,rolling:0,corners:0,hills:0,drivetrain:0,electronics:0}};
    function step(target,cloud) {
      if(s.done) return null;
      const day=s.day,n=s.n,{start,end}=schedule[day];
      if(target==null) target=c.speeds[day];
      if(cloud==null) cloud=c.clouds[day];
      const hour=7+n/120, track=hour>=start&&hour<end;
      if(n===(start-7)*120)s.green=s.battery;
      if(n===(end-7)*120)s.flag=s.battery;
      let pit=false;
      for(let k=1;k<=c.swaps;k++){
        const begin=start+8*k/(c.swaps+1);
        if(n>=Math.round((begin-7)*120)&&n<Math.round((begin-7)*120)+Math.round(c.swapMinutes*2))pit=true;
      }
      let speed=track&&!pit?target:0;
      if(s.parked&&s.battery>=c.battery*0.15)s.parked=false;
      if(s.parked)speed=0;
      const charging=hour<start-0.25||hour>=end+1/6;
      let sunlight=solar(c,hour,cloud,charging||s.parked);
      if(track&&!pit&&!s.parked&&s.battery<0.0001){
        speed=Math.min(speed,sustainable(c,sunlight));
        if(speed<10){speed=0;s.parked=true;sunlight=solar(c,hour,cloud,true);}
      }
      let draw=track?power(c,speed):0;
      if(speed>0 && draw>sunlight+s.battery*1000*0.97/dt){
        speed=sustainable(c,sunlight+s.battery*1000*0.97/dt,speed);
        if(speed<10){speed=0;s.parked=true;sunlight=solar(c,hour,cloud,true);}
        draw=power(c,speed);
      }
      const status=!track?'Solar charging':pit?'Driver swap':s.parked?'Charging in pit':speed<target-0.1?'Solar-limited':'On track';
      const sample={day,hour,t:day*13+hour-7,battery:s.battery,sun:sunlight,draw,speed,target,cloud,track,
        distance:s.totalDistance+s.distance,dayDistance:s.distance,laps:s.totalLaps+Math.floor((s.distance+1e-8)/c.lap),status};
      if(n===1560){
        const laps=Math.floor((s.distance+1e-8)/c.lap);
        s.days.push({day:day+1,distance:s.distance,laps,sun:s.sun,green:s.green,flag:s.flag,end:s.battery,stopped:s.stopped,cloud:c.clouds[day]});
        s.totalDistance+=s.distance;s.totalLaps+=laps;s.totalSun+=s.sun;
        s.day++;s.n=0;s.distance=0;s.sun=0;s.stopped=0;s.parked=false;
        if(s.day===3)s.done=true;
        sample.dayEnd=true;sample.dayLaps=laps;
        return sample;
      }
      const net=(sunlight-draw)*dt/1000;
      const raw=s.battery+(net>=0?net*0.97:net/0.97);
      if(raw>c.battery)s.clipped+=raw-c.battery;
      s.battery=clamp(raw,0,c.battery);
      s.sun+=sunlight*dt/1000;
      if(track){
        s.distance+=speed*dt;if(speed<10)s.stopped+=dt;
        if(status==='Solar-limited'||status==='Charging in pit')s.limited+=dt;
        const p=parts(c,speed);for(const k in s.used)s.used[k]+=p[k]*dt/1000;
      }
      s.n++;
      return sample;
    }
    return {config:c,state:s,step};
  }
  const api={defaults,schedule,geometry,solar,power,sustainable,simulate,optimize,parts,createRace};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  else root.SolarPhysics=api;
})(typeof window!=='undefined'?window:globalThis);
