import * as quantumBridge from 'quantum.engine';
// Exact five-qubit statevector model. q0 is the least significant bit.
// Circuit edits are actually executed; no success lookup table is used.
const GATES={H:[[Math.SQRT1_2,0],[Math.SQRT1_2,0],[Math.SQRT1_2,0],[-Math.SQRT1_2,0]],X:[[0,0],[1,0],[1,0],[0,0]],Z:[[1,0],[0,0],[0,0],[-1,0]],Y:[[0,0],[0,-1],[0,1],[0,0]]};
const STANDARD={"00":-1,"01":2,"10":1,"11":0};
const PRESETS={
 bare:{name:'Bare wire',basis:'OFF',gates:[],decoder:{'00':-1,'01':-1,'10':-1,'11':-1}},
 bit:{name:'Bit shelter',basis:'Z',gates:[{type:'CX',q:1,control:0,col:0},{type:'CX',q:2,control:0,col:1}],decoder:{...STANDARD}},
 phase:{name:'Phase sail',basis:'X',gates:[{type:'CX',q:1,control:0,col:0},{type:'CX',q:2,control:0,col:1},{type:'H',q:0,col:2},{type:'H',q:1,col:2},{type:'H',q:2,col:2}],decoder:{...STANDARD}}
};
const INPUTS=[['0',0,0],['1',Math.PI,0],['+',Math.PI/2,0],['−',Math.PI/2,Math.PI],['+i',Math.PI/2,Math.PI/2],['−i',Math.PI/2,3*Math.PI/2]];
function clone(p){return JSON.parse(JSON.stringify(p));}
function validate(p){
 if(!p||!['X','Z','OFF'].includes(p.basis)||!Array.isArray(p.gates)||p.gates.length>24)throw Error('Use CHECK X or CHECK Z and at most 24 gates.');
 const used=new Set();
 for(const g of p.gates){
  if(!['H','X','Z','CX'].includes(g.type)||!Number.isInteger(g.q)||g.q<0||g.q>2||!Number.isInteger(g.col)||g.col<0||g.col>7)throw Error('Gates must use q0–q2, in columns 0–7.');
  const qs=[g.q];
  if(g.type==='CX'){if(!Number.isInteger(g.control)||g.control<0||g.control>2||g.control===g.q)throw Error('CX needs two different data qubits.');qs.push(g.control);}
  for(const q of qs){const key=g.col+':'+q;if(used.has(key))throw Error('Two gates share a qubit in the same column.');used.add(key);}
 }
 for(const s of ['00','01','10','11'])if(!Number.isInteger(p.decoder?.[s])||p.decoder[s]<-1||p.decoder[s]>2)throw Error('Each RECOVER rule must name NONE or q0–q2.');
 return p;
}
function ordered(p){return [...p.gates].sort((a,b)=>a.col-b.col||a.q-b.q);}
function initial(theta,phi){const v=new Float64Array(64);v[0]=Math.cos(theta/2);v[2]=Math.sin(theta/2)*Math.cos(phi);v[3]=Math.sin(theta/2)*Math.sin(phi);return v;}
function gate(v,q,m){
 for(let i=0;i<32;i++)if(!(i&(1<<q))){const j=i|(1<<q),ar=v[2*i],ai=v[2*i+1],br=v[2*j],bi=v[2*j+1];
  v[2*i]=m[0][0]*ar-m[0][1]*ai+m[1][0]*br-m[1][1]*bi;v[2*i+1]=m[0][0]*ai+m[0][1]*ar+m[1][0]*bi+m[1][1]*br;
  v[2*j]=m[2][0]*ar-m[2][1]*ai+m[3][0]*br-m[3][1]*bi;v[2*j+1]=m[2][0]*ai+m[2][1]*ar+m[3][0]*bi+m[3][1]*br;
 }return v;
}
function cx(v,controls,q){const mask=controls.reduce((a,c)=>a|(1<<c),0);for(let i=0;i<32;i++)if((i&mask)===mask&&!(i&(1<<q))){const j=i|(1<<q);[v[2*i],v[2*j]]=[v[2*j],v[2*i]];[v[2*i+1],v[2*j+1]]=[v[2*j+1],v[2*i+1]];}return v;}
function apply(v,g){g.type==='CX'?cx(v,[g.control],g.q):gate(v,g.q,GATES[g.type]);}
function density(v,q=0){let p0=0,p1=0,re=0,im=0;for(let i=0;i<32;i++)if(!(i&(1<<q))){const j=i|(1<<q),ar=v[2*i],ai=v[2*i+1],br=v[2*j],bi=v[2*j+1];p0+=ar*ar+ai*ai;p1+=br*br+bi*bi;re+=ar*br+ai*bi;im+=ai*br-ar*bi;}return {p0,p1,x:2*re,y:-2*im,z:p0-p1};}
function run(p,errors=['I','I','I'],theta=Math.PI/2,phi=0){
 validate(p);if(errors.length!==3||errors.some(e=>!['I','X','Z','Y'].includes(e)))throw Error('Three I/X/Y/Z errors are required.');
 const v=initial(theta,phi),ops=ordered(p);ops.forEach(g=>apply(v,g));errors.forEach((e,q)=>{if(e!=='I')gate(v,q,GATES[e]);});
 if(p.basis==='X')for(let q=0;q<3;q++)gate(v,q,GATES.H);
 if(p.basis!=='OFF'){cx(v,[0],3);cx(v,[1],3);cx(v,[0],4);cx(v,[2],4);}
 const syndrome={};for(const s of ['00','01','10','11'])syndrome[s]=0;
 for(let i=0;i<32;i++){const s=((i>>3)&1)+''+((i>>4)&1);syndrome[s]+=v[2*i]**2+v[2*i+1]**2;}
 for(const s of (p.basis==='OFF'?[]:['00','01','10','11'])){const target=p.decoder[s];if(target<0)continue;if(s[0]==='0')gate(v,3,GATES.X);if(s[1]==='0')gate(v,4,GATES.X);cx(v,[3,4],target);if(s[0]==='0')gate(v,3,GATES.X);if(s[1]==='0')gate(v,4,GATES.X);}
 if(p.basis==='X')for(let q=0;q<3;q++)gate(v,q,GATES.H);
 [...ops].reverse().forEach(g=>apply(v,g));
 const r=density(v),fidelity=Math.max(0,Math.min(1,(1+r.x*Math.sin(theta)*Math.cos(phi)+r.y*Math.sin(theta)*Math.sin(phi)+r.z*Math.cos(theta))/2));
 return {fidelity,syndrome,r,v};
}
function score(p,errors){return INPUTS.reduce((sum,[,t,f])=>sum+run(p,errors,t,f).fidelity,0)/6;}
function bench(p){return ['I','X','Z','Y'].map(kind=>{const cases=Array.from({length:kind==='I'?1:3},(_,q)=>{const errors=['I','I','I'];if(kind!=='I')errors[q]=kind;return {kind,q,fidelity:score(p,errors),syndrome:run(p,errors).syndrome};});return cases.sort((a,b)=>a.fidelity-b.fidelity)[0];});}
function compile(text){
 const p={name:'Custom circuit',basis:'Z',gates:[],decoder:{...STANDARD}};let col=0;
 for(const [i,raw] of text.split('\n').entries()){const line=raw.split('#')[0].trim().toUpperCase();if(!line)continue;
  const parts=line.replace(/,/g,' ').split(/\s+/),op=parts.shift(),qubit=s=>{if(!/^Q?[012]$/.test(s||''))throw Error(`Line ${i+1}: use q0, q1 or q2.`);return Number(s.replace('Q',''));};
  if(['H','X','Z'].includes(op)&&parts.length===1){p.gates.push({type:op,q:qubit(parts[0]),col:col++});}
  else if(op==='CX'&&parts.length===2){p.gates.push({type:'CX',control:qubit(parts[0]),q:qubit(parts[1]),col:col++});}
  else if(op==='CHECK'&&parts.length===1&&['X','Z','OFF'].includes(parts[0]))p.basis=parts[0];
  else if(op==='RECOVER'&&parts.length===2&&/^[01]{2}$/.test(parts[0]))p.decoder[parts[0]]=parts[1]==='NONE'?-1:qubit(parts[1]);
  else throw Error(`Line ${i+1}: expected H q0, CX q0 q1, CHECK Z or RECOVER 10 q1.`);
 }return validate(p);
}
function script(p){return '# Gates run left to right. Recovery runs after the hazard.\n'+ordered(p).map(g=>g.type==='CX'?`CX q${g.control} q${g.q}`:`${g.type} q${g.q}`).join('\n')+`\nCHECK ${p.basis}\n`+Object.entries(p.decoder).map(([s,q])=>`RECOVER ${s} ${q<0?'NONE':'q'+q}`).join('\n');}
function qiskitSource(p,errors=['I','X','I']){
 validate(p);const ops=ordered(p),lines=['# Qubit Drift: the currently installed player circuit.','from qiskit import QuantumCircuit','from qiskit.quantum_info import Statevector, partial_trace, state_fidelity','from qiskit.primitives import StatevectorSampler','import numpy as np','','def build(theta, phi):','    qc = QuantumCircuit(5)','    qc.ry(theta, 0)','    qc.p(phi, 0)'];
 const add=g=>lines.push('    '+(g.type==='CX'?`qc.cx(${g.control}, ${g.q})`:`qc.${g.type.toLowerCase()}(${g.q})`));ops.forEach(add);lines.push('    qc.barrier()');errors.forEach((e,q)=>{if(e!=='I')lines.push(`    qc.${e.toLowerCase()}(${q})`);});
 if(p.basis==='X')for(let q=0;q<3;q++)lines.push(`    qc.h(${q})`);
 if(p.basis!=='OFF')lines.push('    qc.cx(0, 3)','    qc.cx(1, 3)','    qc.cx(0, 4)','    qc.cx(2, 4)');
 for(const [s,q] of (p.basis==='OFF'?[]:Object.entries(p.decoder))){if(q<0)continue;if(s[0]==='0')lines.push('    qc.x(3)');if(s[1]==='0')lines.push('    qc.x(4)');lines.push(`    qc.ccx(3, 4, ${q})`);if(s[0]==='0')lines.push('    qc.x(3)');if(s[1]==='0')lines.push('    qc.x(4)');}
 if(p.basis==='X')for(let q=0;q<3;q++)lines.push(`    qc.h(${q})`);[...ops].reverse().forEach(add);lines.push('    return qc','','inputs = [(0,0), (np.pi,0), (np.pi/2,0), (np.pi/2,np.pi), (np.pi/2,np.pi/2), (np.pi/2,3*np.pi/2)]','fidelities = []','for theta, phi in inputs:','    qc = build(theta, phi)','    rho = partial_trace(Statevector.from_instruction(qc), [1,2,3,4])','    target = Statevector([np.cos(theta/2), np.exp(1j*phi)*np.sin(theta/2)])','    fidelities.append(float(state_fidelity(rho, target)))',"print('Six-state average fidelity:', np.mean(fidelities))",'qc = build(np.pi/2, 0)','qc.h(0)','qc.measure_all()',"print('X-basis counts (q4 q3 q2 q1 q0):', StatevectorSampler(seed=42).run([qc], shots=256).result()[0].data.meas.get_counts())",'# Ideal selected Pauli errors, one recovery round. No speedup or fault-tolerance claim.');return lines.join('\n')+'\n';
}

const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)],clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),rnd=(a,b)=>a+Math.random()*(b-a),pct=v=>Math.round(v*100)+'%';
const STORAGE='capyquantum.qubit-drift.v1';
const ROUTES=[
 {name:'BIT BELT',short:'Bit Belt',duration:35,kind:'X',target:.88,cargo:30,bonus:100,desc:'Bit-flip weather. One error per pulse. A bit shelter is a good start.',color:'#b5d3b7'},
 {name:'PHASE GARDEN',short:'Phase Garden',duration:40,kind:'Z',target:.88,cargo:34,bonus:140,desc:'Phase-flip weather. The old bit shelter is blind here. Try a phase sail.',color:'#bfb8df'},
 {name:'THE SCRAPYARD',short:'The Scrapyard',duration:45,kind:'XX',target:.87,cargo:38,bonus:180,desc:'Dense debris and occasional double flips. Dash through trouble; accept the code’s limits.',color:'#d89a63'},
 {name:'THE CLOCKWORK EYE',short:'Clockwork Eye',duration:50,kind:'boss',target:.94,cargo:45,bonus:300,desc:'The Eye changes X/Z weather every 10 seconds. Rewire at the warnings. E pauses the orbit.',color:'#d97c62'}
];
const UPGRADE={hull:{name:'Riveted hull',desc:'Adds 25 hull per level. More room for piloting mistakes.',base:100,max:4},engine:{name:'Afterburner',desc:'Stronger thrust and a shorter dash cooldown. Momentum is still yours to manage.',base:120,max:3},magnet:{name:'Salvage magnet',desc:'Scrap drifts toward your ship from a greater distance.',base:90,max:3},drone:{name:'Recycler fleet',desc:'Each recycler earns 1 credit every 4 seconds while the station tab is active. It also collects nearby scrap in flight.',base:80,max:5}};
const cleanSave=()=>({credits:0,cleared:[],bounties:[],upgrades:{hull:0,engine:0,magnet:0,drone:0},history:[],program:clone(PRESETS.bit),totalCargo:0});
function readSave(){try{const s=JSON.parse(localStorage.getItem(STORAGE));if(!s)return cleanSave();validate(s.program);if(!Number.isFinite(s.credits)||s.credits<0||!Array.isArray(s.cleared)||!Array.isArray(s.history))throw Error();const d=cleanSave();for(const k of Object.keys(UPGRADE))d.upgrades[k]=clamp(Math.floor(s.upgrades?.[k]||0),0,UPGRADE[k].max);return {...d,...s,upgrades:d.upgrades,cleared:s.cleared.filter(n=>Number.isInteger(n)&&n>=0&&n<4),history:s.history.slice(0,8)};}catch{return cleanSave();}}
let save=readSave(),program=clone(save.program),selected=0,tool='CX',pending=null,activeTab='circuit',keys=new Set(),pointer=null,sound=false,audio=null,mutedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches,checkToken=0,bounty=null;
let W=1000,H=700,clock=0,lastFrame=performance.now(),idle=0,saveClock=0,runState=null,particles=[],trails=[],scraps=[],rocks=[],pulses=[],ship={x:260,y:300,vx:0,vy:0,angle:0},toastTimer,messageTimer;
const canvas=$('#world'),ctx=canvas.getContext('2d'),stars=Array.from({length:130},()=>({x:Math.random(),y:Math.random(),size:rnd(.7,2),phase:rnd(0,6.28)}));
function persist(){save.program=clone(program);try{localStorage.setItem(STORAGE,JSON.stringify(save));}catch{}}
function toast(text){$('.toast')?.remove();window.clearTimeout(toastTimer);const el=document.createElement('div');el.className='toast';el.role='status';el.textContent=text;document.body.append(el);toastTimer=window.setTimeout(()=>el.remove(),3500);}
function say(text){$('#dispatch').textContent=text;$('#floating-message').textContent=text;window.clearTimeout(messageTimer);messageTimer=window.setTimeout(()=>$('#floating-message').textContent='',4500);}
function beep(freq=300,len=.09,type='triangle',gain=.03){if(!sound)return;try{audio??=new AudioContext();audio.resume();const o=audio.createOscillator(),g=audio.createGain();o.type=type;o.frequency.setValueAtTime(freq,audio.currentTime);o.frequency.exponentialRampToValueAtTime(freq*.65,audio.currentTime+len);g.gain.setValueAtTime(gain,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+len);o.connect(g);g.connect(audio.destination);o.start();o.stop(audio.currentTime+len);}catch{}}
function resources(){
 $('#credits').textContent=Math.floor(save.credits).toLocaleString();$('#cleared').textContent=save.cleared.length+' / 4';$('#fleet').textContent=save.upgrades.drone?save.upgrades.drone+' × RECYCLER':'OFFLINE';$('#circuit-name').textContent=program.name.toUpperCase();$('#gate-cost').textContent=program.gates.length+' gates';
 $$('#routes button').forEach((b,i)=>{b.disabled=i>0&&!save.cleared.includes(i-1);b.classList.toggle('selected',i===selected);b.querySelector('span').textContent=save.cleared.includes(i)?'✓':b.disabled?'⌑':'↗';});
 if(activeTab==='upgrades')renderUpgrades();
}
function renderRoutes(){ $('#routes').innerHTML=ROUTES.map((r,i)=>`<button class="route-card" data-route="${i}"><small>0${i+1} / ${r.duration} SECONDS</small><strong>${r.name}</strong><span></span></button>`).join('');$$('[data-route]').forEach(b=>b.onclick=()=>{if(runState){toast('Finish or abort this shift before choosing a new contract.');return;}selected=+b.dataset.route;$('#debrief').hidden=true;$('#dock-card').hidden=false;updateRoute();resources();});}
function updateRoute(){const r=ROUTES[selected];$('#launch').innerHTML=`LAUNCH INTO ${r.name} <span>↗</span>`;$('#route-brief').textContent=r.desc+' CONTRACT: survive '+r.duration+'s · '+pct(r.target)+' fidelity · '+r.cargo+' cargo.';$('#flight-label').textContent='ORBITAL VIEW / '+r.name;}
function pause(on=true){if(!runState)return;runState.paused=on;keys.clear();pointer=null;$('#pause-card').hidden=!on;$('#pause').textContent=on?'RESUME':'PAUSE';if(!on)canvas.focus({preventScroll:true});}
function edit(){if(runState&&!runState.paused)pause(true);checkToken++;$('#check-note').textContent='Design changed. Run Qiskit verification again when ready.';program.name='Custom circuit';save.program=clone(program);persist();resources();}
function install(p){edit();program=clone(p);pending=null;persist();renderCircuit();resources();$('#terminal-output').textContent='INSTALLED '+p.name.toUpperCase()+'.\n'+p.gates.length+' gates · '+p.basis+' parity · recovery rules active.';say('New circuit installed: '+p.name+'. The next cargo pulse will use this design.');}
function renderBoard(){
 let html='';for(let q=0;q<3;q++){html+=`<span class="wire-label">q${q}</span>`;for(let col=0;col<8;col++){
  const g=program.gates.find(g=>g.col===col&&(g.q===q||(g.type==='CX'&&g.control===q))),isControl=g?.type==='CX'&&g.control===q,isTarget=g?.type==='CX'&&g.q===q,isPending=pending?.q===q&&pending?.col===col;
  let line='';if(g?.type==='CX'&&Math.min(g.q,g.control)===q)line=`<i class="connector" style="height:calc(var(--row-pitch, 44px) * ${Math.abs(g.q-g.control)})"></i>`;
  html+=`<button class="board-cell ${g?'':'empty'} ${isControl?'control':''} ${isTarget?'target':''} ${isPending?'pending':''}" data-cell="${q},${col}" aria-label="q${q}, column ${col+1}, ${isControl?'CX control':isTarget?'CX target':g?.type||'empty'}"><span>${isControl?'':isTarget?'⊕':g?.type||'+'}</span>${line}</button>`;
 }}$('#board').innerHTML=html;
 $$('[data-cell]').forEach(b=>b.onclick=()=>{const [q,col]=b.dataset.cell.split(',').map(Number);edit();const occupied=program.gates.findIndex(g=>g.col===col&&(g.q===q||g.control===q));
  if(tool==='erase'){if(occupied>=0)program.gates.splice(occupied,1);pending=null;}
  else if(tool==='CX'){
   if(!pending){pending={q,col};$('#board-feedback').textContent=`Control q${q} selected. Pick a different target in column ${col+1}.`;renderBoard();return;}
   if(pending.col!==col||pending.q===q){pending={q,col};$('#board-feedback').textContent=`Control moved to q${q}. Pick a target in this column.`;renderBoard();return;}
   program.gates=program.gates.filter(g=>g.col!==col||![g.q,g.control].some(x=>x===q||x===pending.q));program.gates.push({type:'CX',q,control:pending.q,col});pending=null;
  }else{if(occupied>=0)program.gates.splice(occupied,1);program.gates.push({type:tool,q,col});pending=null;}
  persist();renderCircuit();resources();$('#board-feedback').textContent='Design installed. The next pulse uses this circuit.';
 });
}
function renderCircuit(){
 renderBoard();$('#check-basis').value=program.basis;
 $('#decoder').innerHTML=['00','01','10','11'].map(s=>`<label>${s}<select data-syndrome="${s}" ${program.basis==='OFF'?'disabled':''} aria-label="Recovery for syndrome ${s}">${[-1,0,1,2].map(q=>`<option value="${q}" ${program.decoder[s]===q?'selected':''}>${q<0?'NONE':'q'+q}</option>`).join('')}</select></label>`).join('');
 $$('[data-syndrome]').forEach(el=>el.onchange=()=>{edit();program.decoder[el.dataset.syndrome]=+el.value;persist();renderBench();});
 renderBench();$$('[data-preset]').forEach(b=>b.classList.toggle('selected',program.name===PRESETS[b.dataset.preset].name));
}
function renderBench(){try{const data=bench(program);$('#bench').innerHTML=data.map(b=>`<div class="bench-row"><span>${b.kind==='I'?'NO NOISE':b.kind+' WORST q'}</span><span class="bench-track"><span style="width:${b.fidelity*100}%;background:${b.fidelity>.98?'#668c76':b.fidelity>.75?'#b59758':'#cc7753'}"></span></span><span>${pct(b.fidelity)}</span></div>`).join('');$('#build-status').textContent=data[0].fidelity>.99?'BASELINE OK':'NOISELESS FAIL';}catch(e){toast(e.message);}}
function tab(name,autoPause=true){if(autoPause&&runState&&!runState.paused)pause(true);activeTab=name;$$('[data-tab]').forEach(b=>b.classList.toggle('active',b.dataset.tab===name));$$('.tab-panel').forEach(p=>p.hidden=p.id!=='panel-'+name);if(name==='terminal')$('#code').value=script(program);if(name==='upgrades')renderUpgrades();}
function renderUpgrades(){
 $('#upgrades').innerHTML=Object.entries(UPGRADE).map(([k,u])=>{const lv=save.upgrades[k],cost=Math.round(u.base*Math.pow(1.65,lv));return `<article class="upgrade"><h3>${u.name}</h3><small>LV ${lv} / ${u.max}</small><p>${u.desc}</p><button data-upgrade="${k}" ${save.credits<cost||lv>=u.max?'disabled':''}>${lv>=u.max?'MAXED OUT':`INSTALL · ${cost} CR`}</button></article>`;}).join('');
 $$('[data-upgrade]').forEach(b=>b.onclick=()=>{const k=b.dataset.upgrade,u=UPGRADE[k],cost=Math.round(u.base*Math.pow(1.65,save.upgrades[k]));if(save.credits<cost||save.upgrades[k]>=u.max)return;save.credits-=cost;save.upgrades[k]++;persist();resources();beep(700);toast(u.name+' installed.');});
 $('#archive').innerHTML=save.history.length?save.history.map(h=>`<div class="archive-entry"><span>${h.route}<br>${h.success?'CONTRACT CLEARED':'FIELD REPORT'} · ${pct(h.fidelity)}</span><span>+${h.reward} cr</span></div>`).join(''):'No flights recorded. Make a little history.';
}
function emit(x,y,color='#b5d3b7',n=12,speed=90){for(let i=0;i<n;i++){const a=rnd(0,6.28),v=rnd(speed*.3,speed);particles.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,life:rnd(.3,.8),max:.8,color,size:rnd(2,4)});}if(particles.length>350)particles.splice(0,particles.length-350);}
function populate(){scraps=Array.from({length:16},()=>({x:rnd(70,940),y:rnd(125,H-60),a:rnd(0,6.28),alive:true}));rocks=Array.from({length:selected===2?13:7},()=>({a:rnd(0,6.28),radius:rnd(175,315),speed:rnd(-.22,.22),size:rnd(10,22),seed:rnd(1,8),hit:0}));}
function start(demo=false){
 const r=ROUTES[selected],maxHull=100+save.upgrades.hull*25;
 runState={elapsed:0,duration:demo?20:r.duration,paused:false,demo,hull:maxHull,maxHull,cargo:0,pulses:0,sum:0,scrap:0,combo:0,nextPulse:.8,cooldown:0,dash:0,invulnerable:0,collisionNoise:false,weather:'X',lastWeather:null,announced:-1,nextScrap:5};
 ship={x:215,y:H*.48,vx:20,vy:-30,angle:-.2};particles=[];pulses=[];trails=[];populate();keys.clear();pointer=null;$('#dock-card').hidden=true;$('#debrief').hidden=true;$('#pause-card').hidden=true;$('#pause').disabled=false;$('#restart').disabled=false;$('#weather').hidden=false;$('#flight-label').textContent=(demo?'TRAINING SHIFT':'LIVE CONTRACT')+' / '+r.name;canvas.focus({preventScroll:true});
 say('Cargo goes out automatically. Fly for scrap; your circuit keeps the cargo intact.');beep(450,.2);updateHud();
}
function currentWeather(){if(selected===1)return 'Z';if(selected===3)return Math.floor(runState.elapsed/10)%2===0?'X':'Z';return 'X';}
function cargoPulse(){
 const state=runState,errors=['I','I','I'],kind=currentWeather(),q=Math.floor(rnd(0,3));if(Math.random()<.78)errors[q]=kind;
 if(selected===2&&Math.random()<.23){errors[q]='X';errors[(q+1)%3]='X';}
 if(state.collisionNoise){errors[q]='X';errors[(q+1)%3]='X';state.collisionNoise=false;}
 const f=score(program,errors),check=run(program,errors),main=Object.entries(check.syndrome).sort((a,b)=>b[1]-a[1])[0],syn=program.basis==='OFF'?'OFF':main[1]>.999?main[0]:'mixed';state.pulses++;state.sum+=f;state.cargo+=2*f;state.combo=f>.999?state.combo+1:0;
 const destination={x:W*.94,y:H*.25};pulses.push({x:ship.x,y:ship.y,to:destination,age:0,life:1.2,fidelity:f,color:f>.99?'#b5e2bb':'#e78256'});
 $('#last-pulse').textContent=`${errors.join(' · ')} → syndrome ${syn} → ${pct(f)} mean fidelity${state.combo>1?' · '+state.combo+' clean pulses':''}`;
 if(f<.9){say(kind==='Z'&&program.basis==='Z'?'Phase damage. The bit shelter cannot see it. E → phase sail.':'Cargo degraded. Test the encoder and recovery rules in the wind tunnel.');emit(ship.x,ship.y,'#df7444',9);beep(140,.12,'sawtooth',.015);}else{beep(540+state.combo*12,.04,'sine',.01);}
}
function updateHud(){const s=runState;$('#hull-bar').style.width=s?pct(s.hull/s.maxHull):'100%';$('#hull-bar').style.background=s&&s.hull/s.maxHull<.3?'#df7444':'#a8d5bc';$('#integrity').textContent=s&&s.pulses?pct(s.sum/s.pulses):'—';$('#cargo').textContent=s?s.cargo.toFixed(1):'0';$('#time').textContent=s?Math.max(0,s.duration-s.elapsed).toFixed(0)+'s':'—';}
function finish(aborted=false){
 const s=runState;if(!s)return;const r=ROUTES[selected],f=s.pulses?s.sum/s.pulses:0,success=!aborted&&!s.demo&&s.hull>0&&f>=r.target&&s.cargo>=r.cargo;
 const first=success&&!save.cleared.includes(selected),reward=Math.floor(s.cargo*3+s.scrap*5+(success?r.bonus:0)+(first?60:0));save.credits+=reward;save.totalCargo+=s.cargo;if(first)save.cleared.push(selected);save.history.unshift({route:s.demo?'Training':r.short,success,fidelity:f,reward});save.history=save.history.slice(0,8);persist();
 let reason=success?'The signal held. The station has a new route on the map.':s.demo?'Training complete. Now take a contract, or build your own protection.':aborted?'Shift aborted. Recovered cargo and scrap are still yours.':s.hull<=0?'Hull lost. Try braking, keep clear of the planet, and use the dash.':f<r.target?`Signal fidelity missed ${pct(r.target)}. ${selected===1?'Phase weather needs a phase sail.':selected===3?'The Eye changes noise every 10 seconds. Pause and switch your circuit.':'Test your circuit against the route’s noise.'}`:'Not enough cargo delivered. Keep the circuit healthy and survive the full shift.';
 $('#debrief').innerHTML=`<span class="kicker">${s.demo?'FLIGHT SCHOOL':success?'CONTRACT CLEARED':'FIELD REPORT / TRY AGAIN'}</span><h2>${success?'A good day<br>to be a <em>capy.</em>':s.demo?'You have the controls.':'Space keeps<br>the <em>receipts.</em>'}</h2><p>${reason}</p><div class="debrief-stats"><div><small>MEAN FIDELITY</small><b>${pct(f)}</b></div><div><small>CARGO SAVED</small><b>${s.cargo.toFixed(0)}</b></div><div><small>CREDITS EARNED</small><b>+${reward}</b></div></div><div class="debrief-actions"><button class="primary" id="next-contract">${first&&selected<3?'NEXT CONTRACT →':'FLY AGAIN →'}</button><button id="return-dock">BACK TO STATION</button></div>`;
 runState=null;keys.clear();pointer=null;$('#debrief').hidden=false;$('#dock-card').hidden=true;$('#pause-card').hidden=true;$('#weather').hidden=true;$('#pause').disabled=true;$('#restart').disabled=true;$('#flight-label').textContent='ORBITAL VIEW / DEBRIEF';
 $('#next-contract').onclick=()=>{if(first&&selected<3)selected++;$('#debrief').hidden=true;$('#dock-card').hidden=false;updateRoute();resources();say(ROUTES[selected].desc);};$('#return-dock').onclick=()=>{$('#debrief').hidden=true;$('#dock-card').hidden=false;updateRoute();};resources();say(reason);beep(success?740:220,.2);if(first&&selected===3)toast('All four contracts cleared. Refine your own circuit, grow the fleet, and chase cleaner runs.');
}
function damage(amount,x,y){const s=runState;if(!s||s.invulnerable>0||s.dash>0)return;s.hull-=amount;s.invulnerable=.8;s.collisionNoise=true;ship.vx+=(ship.x-x)*1.1;ship.vy+=(ship.y-y)*1.1;emit(ship.x,ship.y,'#df7444',18,150);say('Impact! The next pulse carries a double bit flip.');beep(100,.13,'sawtooth');if(!mutedMotion){$('.flight-window').classList.remove('shake');void $('.flight-window').offsetWidth;$('.flight-window').classList.add('shake');}if(s.hull<=0)finish();}
function collect(scrap){if(!scrap.alive||!runState)return;scrap.alive=false;runState.scrap++;emit(scrap.x,scrap.y,'#e7b864',8,65);beep(800,.035);}
function planet(){return {x:W*.72,y:H*.57,r:118};}
function update(dt){clock+=dt;idle+=dt;saveClock+=dt;if(idle>=4){const ticks=Math.floor(idle/4);idle-=ticks*4;if(save.upgrades.drone){save.credits+=ticks*save.upgrades.drone;resources();}}if(saveClock>5){persist();saveClock=0;}
 particles.forEach(p=>{p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt;});particles=particles.filter(p=>p.life>0);pulses.forEach(p=>{p.age+=dt;});pulses=pulses.filter(p=>p.age<p.life);trails.forEach(t=>t.life-=dt);trails=trails.filter(t=>t.life>0);
 if(!runState||runState.paused)return;const s=runState,p=planet();s.elapsed+=dt;s.cooldown=Math.max(0,s.cooldown-dt);s.dash=Math.max(0,s.dash-dt);s.invulnerable=Math.max(0,s.invulnerable-dt);
 const kind=currentWeather(),segment=Math.floor(s.elapsed/10),until=10-s.elapsed%10;
 $('#weather').textContent=selected===3?`THE EYE: ${kind==='X'?'BIT':'PHASE'} WEATHER · ${until<3?'SWITCH TO '+(kind==='X'?'PHASE SAIL':'BIT SHELTER')+' IN '+Math.ceil(until)+'s':Math.ceil(until)+'s TO CHANGE'} · E TO REWIRE`:kind==='X'?'BIT-FLIP WEATHER / X ERRORS':'PHASE-FLIP WEATHER / Z ERRORS';$('#weather').classList.toggle('phase',kind==='Z');
 if(selected===3&&s.lastWeather!==kind){s.lastWeather=kind;say('The Eye switched to '+(kind==='X'?'X errors. Install a bit shelter.':'Z errors. Install a phase sail.')+' E pauses the orbit.');beep(kind==='X'?350:650,.2);}
 let ax=(keys.has('d')||keys.has('arrowright')?1:0)-(keys.has('a')||keys.has('arrowleft')?1:0),ay=(keys.has('s')||keys.has('arrowdown')?1:0)-(keys.has('w')||keys.has('arrowup')?1:0);
 if(pointer){ax=clamp((pointer.x-ship.x)/100,-1,1);ay=clamp((pointer.y-ship.y)/100,-1,1);}const len=Math.hypot(ax,ay);if(len>1){ax/=len;ay/=len;}
 const force=245+save.upgrades.engine*45,dx=p.x-ship.x,dy=p.y-ship.y,dist=Math.max(140,Math.hypot(dx,dy)),gravity=1900000/(dist*dist);ship.vx+=(ax*force+dx/dist*gravity)*dt;ship.vy+=(ay*force+dy/dist*gravity)*dt;
 if(keys.has('shift')){ship.vx*=Math.pow(.06,dt);ship.vy*=Math.pow(.06,dt);}else{ship.vx*=Math.pow(.72,dt);ship.vy*=Math.pow(.72,dt);}
 if(keys.has(' ')&&s.cooldown===0){const angle=len?Math.atan2(ay,ax):ship.angle;ship.vx+=Math.cos(angle)*390;ship.vy+=Math.sin(angle)*390;s.dash=.32;s.cooldown=Math.max(.9,2.1-save.upgrades.engine*.25);emit(ship.x,ship.y,'#b5dfba',18,170);beep(320,.12);}
 const speed=Math.hypot(ship.vx,ship.vy),limit=s.dash>0?650:320+save.upgrades.engine*25;if(speed>limit){ship.vx*=limit/speed;ship.vy*=limit/speed;}ship.x+=ship.vx*dt;ship.y+=ship.vy*dt;
 if(len>.1)ship.angle=Math.atan2(ay,ax);else if(speed>15)ship.angle=Math.atan2(ship.vy,ship.vx);
 if(ship.x<25||ship.x>W-25){ship.x=clamp(ship.x,25,W-25);ship.vx*=-.5;}if(ship.y<100||ship.y>H-30){ship.y=clamp(ship.y,100,H-30);ship.vy*=-.5;}
 if(len>.1&&!mutedMotion){trails.push({x:ship.x-Math.cos(ship.angle)*23,y:ship.y-Math.sin(ship.angle)*23,life:.4,angle:ship.angle});if(trails.length>100)trails.shift();}
 if(Math.hypot(ship.x-p.x,ship.y-p.y)<p.r+20){damage(18,p.x,p.y);if(!runState)return;const a=Math.atan2(ship.y-p.y,ship.x-p.x);ship.x=p.x+Math.cos(a)*(p.r+25);ship.y=p.y+Math.sin(a)*(p.r+25);ship.vx=Math.cos(a)*160;ship.vy=Math.sin(a)*160;}
 for(const rock of rocks){rock.a+=rock.speed*dt;const x=p.x+Math.cos(rock.a)*rock.radius,y=p.y+Math.sin(rock.a)*rock.radius*.65;if(Math.hypot(ship.x-x,ship.y-y)<rock.size+16){damage(12,x,y);if(!runState)return;}}
 if(selected===3){const a=s.elapsed*.23,ex=p.x+Math.cos(a)*390,ey=p.y+Math.sin(a)*390,t=clamp(((ship.x-p.x)*(ex-p.x)+(ship.y-p.y)*(ey-p.y))/390**2,0,1);if(t>.36&&Math.hypot(ship.x-(p.x+t*(ex-p.x)),ship.y-(p.y+t*(ey-p.y)))<12){damage(10,p.x,p.y);if(!runState)return;}}
 const magnet=45+save.upgrades.magnet*38;
 for(const item of scraps){if(!item.alive)continue;const d=Math.hypot(ship.x-item.x,ship.y-item.y);if(d<magnet){item.x+=(ship.x-item.x)*dt*3;item.y+=(ship.y-item.y)*dt*3;}if(d<25)collect(item);for(let n=0;n<save.upgrades.drone;n++){const a=clock*.8+n*6.28/Math.max(1,save.upgrades.drone),x=ship.x+Math.cos(a)*65,y=ship.y+Math.sin(a)*65;if(Math.hypot(item.x-x,item.y-y)<23)collect(item);}}
 s.nextScrap-=dt;if(s.nextScrap<=0){for(let n=0;n<3;n++)scraps.push({x:rnd(60,950),y:rnd(130,H-70),a:rnd(0,6.28),alive:true});s.nextScrap=4;}scraps=scraps.filter(x=>x.alive);
 s.nextPulse-=dt;if(s.nextPulse<=0){cargoPulse();s.nextPulse=1.45;}updateHud();if(s.elapsed>=s.duration)finish();
}
function line(x1,y1,x2,y2,color,width=1){ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();}
function circle(x,y,r,fill,stroke,width=1){ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.stroke();}}
function text(content,x,y,size=10,color='#b1c7b9',align='left'){ctx.font=`${size}px "DM Mono",monospace`;ctx.fillStyle=color;ctx.textAlign=align;ctx.fillText(content,x,y);ctx.textAlign='left';}
function capy(x,y,angle,t=1){
 ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.scale(t,t);ctx.fillStyle='#d0b087';ctx.strokeStyle='#10272b';ctx.lineWidth=2;
 ctx.beginPath();ctx.ellipse(0,0,23,15,0,0,6.28);ctx.fill();ctx.stroke();ctx.fillStyle='#e6c8a1';ctx.beginPath();ctx.ellipse(16,-2,13,12,0,0,6.28);ctx.fill();ctx.stroke();
 circle(10,-14,5,'#d0b087','#10272b',2);circle(20,-6,2,'#10272b');line(26,-1,30,0,'#10272b',2);
 ctx.strokeStyle='#afd8c0';ctx.lineWidth=3;ctx.beginPath();ctx.arc(17,-2,19,-1.7,1.8);ctx.stroke();ctx.fillStyle='#6b8c79';ctx.fillRect(-18,-17,12,34);ctx.strokeRect(-18,-17,12,34);ctx.fillStyle='#d6dcc6';ctx.fillRect(-22,-10,5,20);line(-8,-15,-3,-18,'#d3ddbd',2);line(-8,15,-3,18,'#d3ddbd',2);ctx.restore();
}
function draw(){
 const rect=canvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2);if(canvas.width!==Math.round(rect.width*dpr)||canvas.height!==Math.round(rect.height*dpr)){canvas.width=Math.round(rect.width*dpr);canvas.height=Math.round(rect.height*dpr);const oldH=H;H=clamp(W*rect.height/rect.width,650,1450);if(runState)ship.y*=H/oldH;}
 ctx.setTransform(canvas.width/W,0,0,canvas.height/H,0,0);ctx.clearRect(0,0,W,H);const gradient=ctx.createLinearGradient(0,0,W,H);gradient.addColorStop(0,'#101e29');gradient.addColorStop(.65,'#173238');gradient.addColorStop(1,'#213c35');ctx.fillStyle=gradient;ctx.fillRect(0,0,W,H);
 ctx.save();ctx.globalAlpha=.18;for(let x=0;x<W;x+=65)line(x,0,x,H,'#83a697',.5);for(let y=0;y<H;y+=65)line(0,y,W,y,'#83a697',.5);ctx.restore();
 for(const star of stars){ctx.globalAlpha=.25+.5*(.5+.5*Math.sin((mutedMotion?0:clock*.3)+star.phase));circle(star.x*W,star.y*H,star.size,'#d2dfc4');}ctx.globalAlpha=1;
 const p=planet();ctx.save();ctx.translate(p.x,p.y);ctx.strokeStyle='#8eaa8466';ctx.lineWidth=1;ctx.setLineDash([4,11]);for(const radius of [185,260,335]){ctx.beginPath();ctx.ellipse(0,0,radius,radius*.65,0,0,6.28);ctx.stroke();}ctx.setLineDash([]);
 const pg=ctx.createRadialGradient(-30,-40,15,0,0,p.r+30);pg.addColorStop(0,'#98bfa0');pg.addColorStop(.65,'#527868');pg.addColorStop(1,'#17332f');ctx.shadowColor='#7aa088';ctx.shadowBlur=30;circle(0,0,p.r,pg,'#91af91',2);ctx.shadowBlur=0;
 ctx.save();ctx.beginPath();ctx.arc(0,0,p.r-2,0,6.28);ctx.clip();ctx.strokeStyle='#1c483e';ctx.lineWidth=16;for(let n=0;n<6;n++){ctx.beginPath();ctx.ellipse(-14+n*9,-50+n*20,155,22,-.25,0,6.28);ctx.stroke();}circle(-34,-42,23,'#a6c2a0');circle(52,22,17,'#86a186');circle(-25,65,12,'#294e43');ctx.restore();
 ctx.rotate(-.23);ctx.strokeStyle='#b2c5a2aa';ctx.lineWidth=12;ctx.beginPath();ctx.ellipse(0,0,168,34,0,0,Math.PI);ctx.stroke();ctx.strokeStyle='#132c31';ctx.lineWidth=2;ctx.stroke();ctx.restore();
 text('CQ—03 / CAPY’S REST',p.x,p.y+p.r+76,11,'#9abca1','center');text('GRAVITY WELL · KEEP YOUR DISTANCE',p.x,p.y+p.r+95,8,'#6a9882','center');
 // Receiver beacon and its packet destination.
 const bx=W*.94,by=H*.25;circle(bx,by,18,'#273c35','#9cbaa0');ctx.save();ctx.translate(bx,by);ctx.rotate(Math.PI/4);ctx.strokeStyle='#afd8b8';ctx.lineWidth=2;ctx.strokeRect(-24,-24,48,48);ctx.restore();text('UPLINK',bx,by+44,9,'#b1c8ae','center');
 if(!runState){for(let n=0;n<10;n++){const a=clock*.02+n*.65,r=205+n%3*35;circle(p.x+Math.cos(a)*r,p.y+Math.sin(a)*r*.65,3,'#c5a465');}capy(W*.81,H*.24,Math.sin(clock*.2)*.2,1.4);}
 for(const rock of rocks){const x=p.x+Math.cos(rock.a)*rock.radius,y=p.y+Math.sin(rock.a)*rock.radius*.65;ctx.save();ctx.translate(x,y);ctx.rotate(rock.a+rock.seed);ctx.beginPath();for(let n=0;n<7;n++){const a=n*6.28/7,r=rock.size*(.8+.2*Math.sin(n*3+rock.seed));n?ctx.lineTo(Math.cos(a)*r,Math.sin(a)*r):ctx.moveTo(Math.cos(a)*r,Math.sin(a)*r);}ctx.closePath();ctx.fillStyle='#4b5550';ctx.fill();ctx.strokeStyle='#b2ab8b';ctx.lineWidth=1.5;ctx.stroke();line(-5,-7,3,4,'#263f3b',2);ctx.restore();}
 for(const item of scraps){ctx.save();ctx.translate(item.x,item.y);ctx.rotate(item.a+clock*.4);ctx.shadowColor='#e0ab58';ctx.shadowBlur=10;ctx.fillStyle='#e0ae62';ctx.fillRect(-5,-5,10,10);ctx.shadowBlur=0;ctx.strokeStyle='#f3d39a';ctx.strokeRect(-8,-8,16,16);ctx.restore();}
 for(const pulse of pulses){const t=clamp(pulse.age/pulse.life,0,1),x=pulse.x+(pulse.to.x-pulse.x)*t,y=pulse.y+(pulse.to.y-pulse.y)*t-Math.sin(t*Math.PI)*65;circle(x,y,5,pulse.color);circle(x,y,10,null,pulse.color+'55');}
 if(runState){
  if(selected===1||currentWeather()==='Z'){ctx.save();ctx.globalAlpha=.13;for(let n=0;n<4;n++){ctx.strokeStyle='#bdb8e6';ctx.lineWidth=12;ctx.beginPath();ctx.arc(p.x,p.y,200+n*40,clock*.15+n,clock*.15+n+1.4);ctx.stroke();}ctx.restore();}
  if(selected===3){const a=runState.elapsed*.23,color=currentWeather()==='X'?'#ef9673':'#c6b7f5';circle(p.x,p.y,38,'#182b2e','#df9574',2);ctx.save();ctx.translate(p.x,p.y);ctx.rotate(a);ctx.fillStyle=color;ctx.beginPath();ctx.ellipse(0,0,29,12,0,0,6.28);ctx.fill();circle(8,0,8,'#172c2d');ctx.restore();line(p.x+Math.cos(a)*135,p.y+Math.sin(a)*135,p.x+Math.cos(a)*390,p.y+Math.sin(a)*390,color,2);text('CLOCKWORK EYE',p.x,p.y-60,9,color,'center');}
  for(const t of trails){ctx.globalAlpha=t.life/.4;circle(t.x,t.y,3+t.life*8,'#9fe0ba');}ctx.globalAlpha=1;
  // Three data-qubit escort lights are a schematic, not three independent states.
  for(let n=0;n<3;n++){const a=clock*1.4+n*6.28/3,x=ship.x+Math.cos(a)*43,y=ship.y+Math.sin(a)*43;line(ship.x,ship.y,x,y,'#93bba944',1);circle(x,y,4,'#b8d8ba');}
  ctx.globalAlpha=runState.invulnerable>0&&Math.floor(clock*14)%2?.5:1;capy(ship.x,ship.y,ship.angle,.85);ctx.globalAlpha=1;
  if(runState.dash>0)circle(ship.x,ship.y,30,null,'#d4f5c4',2);if(runState.cooldown>0){ctx.strokeStyle='#a6c7aa';ctx.lineWidth=2;ctx.beginPath();ctx.arc(ship.x,ship.y,29,-Math.PI/2,-Math.PI/2+6.28*(1-runState.cooldown/2.1));ctx.stroke();}
  for(let n=0;n<save.upgrades.drone;n++){const a=clock*.8+n*6.28/Math.max(1,save.upgrades.drone),x=ship.x+Math.cos(a)*65,y=ship.y+Math.sin(a)*65;ctx.fillStyle='#749e89';ctx.fillRect(x-6,y-4,12,8);circle(x,y,2,'#e9c076');}
 }
 for(const part of particles){ctx.globalAlpha=clamp(part.life/part.max,0,1);ctx.fillStyle=part.color;ctx.fillRect(part.x,part.y,part.size,part.size);}ctx.globalAlpha=1;
 text('QUANTUM CARGO / ORDINARY SPACE',25,H-27,8,'#7e9e90');text('N 51.035 · E 03.001',W-25,H-27,8,'#7e9e90','right');
}
function frame(now){const dt=Math.min(.04,(now-lastFrame)/1000);lastFrame=now;if(!document.hidden)update(dt);draw();requestAnimationFrame(frame);}
// UI wiring
renderRoutes();renderCircuit();resources();updateRoute();$('#code').value=script(program);
$$('[data-tab]').forEach(b=>b.onclick=()=>tab(b.dataset.tab));$$('[data-tool]').forEach(b=>b.onclick=()=>{tool=b.dataset.tool;pending=null;$$('[data-tool]').forEach(x=>x.classList.toggle('selected',x===b));$('#board-feedback').textContent=tool==='CX'?'Choose a control, then a target in the same column.':tool==='erase'?'Click a gate to remove it.':`Place ${tool} on a wire.`;renderBoard();});
$$('[data-preset]').forEach(b=>b.onclick=()=>install(PRESETS[b.dataset.preset]));$('#clear-board').onclick=()=>{edit();program.gates=[];pending=null;persist();renderCircuit();resources();};$('#standard-decoder').onclick=()=>{edit();program.decoder={...STANDARD};persist();renderCircuit();};$('#check-basis').onchange=e=>{edit();program.basis=e.target.value;persist();renderCircuit();};$('#bench-run').onclick=()=>{renderBench();toast('Design tested against all six input states. Compare X and Z resilience.');};
function compileCode(){try{const p=compile($('#code').value);install(p);$('#terminal-output').textContent='COMPILE OK. '+p.gates.length+' gates installed.\n'+bench(p).map(x=>`${x.kind}: ${pct(x.fidelity)} six-state fidelity`).join('\n');beep(660);}catch(e){$('#terminal-output').textContent='COMPILE ERROR\n'+e.message;beep(160);}}
$('#compile').onclick=compileCode;$('#code').onkeydown=e=>{if((e.metaKey||e.ctrlKey)&&e.key==='Enter'){e.preventDefault();compileCode();}};$('#sync-code').onclick=()=>{$('#code').value=script(program);$('#terminal-output').textContent='Installed circuit loaded. Compiling serializes parallel columns.';};
$('#launch').onclick=()=>start();$('#demo-flight').onclick=()=>start(true);$('#pause').onclick=()=>pause(!runState?.paused);$('#resume').onclick=()=>pause(false);$('#restart').onclick=()=>finish(true);$('#open-workshop').onclick=()=>{tab('circuit');$('.workshop').scrollIntoView({behavior:mutedMotion?'instant':'smooth',block:'start'});toast('Choose a tool and place gates. Or open TERMINAL to program the circuit.');};
$('#sound').onclick=()=>{sound=!sound;$('#sound').textContent=sound?'SOUND ON':'SOUND OFF';if(sound)beep(600,.12);};$('#guide').onclick=()=>{if(runState)pause(true);$('#manual').showModal();};$('#close-manual').onclick=()=>$('#manual').close();
$('#reset-save').onclick=()=>{if(!confirm('Reset the game’s local credits, routes, upgrades and circuit?'))return;if(runState)finish(true);save=cleanSave();program=clone(save.program);selected=0;persist();renderCircuit();resources();updateRoute();$('#debrief').hidden=true;$('#dock-card').hidden=false;toast('Station reset. New shift, clean slate.');};
$('#qiskit-check').onclick=async()=>{if(runState)pause(true);const p=clone(program),token=++checkToken,button=$('#qiskit-check');button.disabled=true;$('#check-note').textContent='Checking X and Z errors with independent Qiskit statevectors…';try{const tests=[['I','I','I'],...['X','Z'].flatMap(kind=>Array.from({length:3},(_,q)=>{const e=['I','I','I'];e[q]=kind;return e;})),['X','X','I']];for(const errors of tests){const resp=await fetch('/api/check',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({program:p,errors}),signal:AbortSignal.timeout(15000)});if(!(resp.headers.get('content-type')||'').includes('json'))throw Error('Use python3 server.py for optional Qiskit verification.');const data=await resp.json();if(!resp.ok)throw Error(data.error);if(Math.abs(data.fidelity-score(p,errors))>1e-9)throw Error('Models disagree. Investigate before using this circuit.');}if(token===checkToken)$('#check-note').textContent='QISKIT CONFIRMED · no noise, X, Z and double-X cases agree across six states.';}catch(e){if(token===checkToken)$('#check-note').textContent=e.message;}finally{button.disabled=false;}};
$('#qiskit-export').onclick=()=>{const blob=new Blob([qiskitSource(program)],{type:'text/x-python'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='qubit_drift_circuit.py';a.click();window.setTimeout(()=>URL.revokeObjectURL(url),1000);toast('Installed design exported as an executable Qiskit circuit.');};
const BOUNTIES=[{title:'Broken relay',kind:'X',pay:50,brief:'The encoder is missing a connection. Restore perfect fidelity for no noise and an X error on ANY one data qubit. Limit: 2 encoder gates.',seed:()=>{const p=clone(PRESETS.bit);p.gates.pop();return p;},limit:2},{title:'Wrong diagnosis',kind:'X',pay:80,brief:'The encoder is good. One recovery rule points at the wrong wire. Repair it so ALL three single-X cases preserve the input.',seed:()=>{const p=clone(PRESETS.bit);p.decoder['11']=2;return p;},limit:2},{title:'Phase conversion',kind:'Z',pay:110,brief:'The client moved to phase weather. Reuse the bit shelter, change its basis, and preserve ANY single-Z error. Limit: 5 encoder gates.',seed:()=>clone(PRESETS.bit),limit:5}];
$$('[data-bounty]').forEach(b=>b.onclick=()=>{bounty=+b.dataset.bounty;const job=BOUNTIES[bounty];install(job.seed());program.name=job.title+' / repair';$('#bounty-brief').textContent=job.brief+' Bounty: '+job.pay+' cr.';$('#submit-bounty').hidden=false;persist();resources();renderCircuit();});
$('#submit-bounty').onclick=()=>{if(bounty===null)return;const job=BOUNTIES[bounty],tests=[['I','I','I'],...Array.from({length:3},(_,q)=>{const e=['I','I','I'];e[q]=job.kind;return e;})],worst=Math.min(...tests.map(e=>score(program,e)));if(program.gates.length>job.limit){$('#bounty-brief').textContent='Over budget: use at most '+job.limit+' encoder gates.';return;}if(worst<1-1e-9){$('#bounty-brief').textContent='NOT YET. Worst-case six-state fidelity: '+pct(worst)+'. Test every data-qubit location; q1 alone is not enough.';beep(160);return;}save.bounties??=[];const paid=save.bounties.includes(bounty);if(!paid){save.credits+=job.pay;save.bounties.push(bounty);}$('#bounty-brief').textContent='DESIGN ACCEPTED · every tested state recovered. '+(paid?'This bounty was already paid.':'+'+job.pay+' cr earned.');persist();resources();beep(820);toast(paid?'Design verified. Bounty already collected.':'Engineering bounty collected: +'+job.pay+' cr.');};
document.addEventListener('keydown',e=>{if(['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName)||$('#manual').open)return;const k=e.key.toLowerCase();if(['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright',' ','shift','p','e'].includes(k)&&runState){e.preventDefault();if(k==='p'&&!e.repeat)pause(!runState.paused);else if(k==='e'&&!e.repeat){pause(true);tab('circuit',false);$('.workshop').scrollIntoView({behavior:mutedMotion?'instant':'smooth',block:'start'});}else keys.add(k);}});document.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));window.addEventListener('blur',()=>{keys.clear();pointer=null;if(runState)pause(true);});document.addEventListener('visibilitychange',()=>{if(document.hidden&&runState)pause(true);});
canvas.addEventListener('pointerdown',e=>{if(!runState||runState.paused)return;canvas.focus({preventScroll:true});canvas.setPointerCapture(e.pointerId);const r=canvas.getBoundingClientRect();pointer={x:(e.clientX-r.left)/r.width*W,y:(e.clientY-r.top)/r.height*H};});canvas.addEventListener('pointermove',e=>{if(!pointer)return;const r=canvas.getBoundingClientRect();pointer={x:(e.clientX-r.left)/r.width*W,y:(e.clientY-r.top)/r.height*H};});for(const event of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(event,()=>pointer=null);
$$('[data-touch]').forEach(b=>{b.onpointerdown=e=>{e.preventDefault();b.setPointerCapture(e.pointerId);keys.add(b.dataset.touch);};b.onpointerup=b.onpointercancel=()=>keys.delete(b.dataset.touch);});
requestAnimationFrame(frame);

// Qollab supplies the backend and Python import bridge.
$('#qiskit-check').textContent='RUN ON QOLLAB';
$('#check-note').textContent='One selected free-simulator job per project run. Ideal fidelity and sampled counts are separate.';
let qollabJobUsed=false;
$('#qiskit-check').onclick=async()=>{
  if(qollabJobUsed)return;
  if(runState)pause(true);
  const p=clone(program),token=++checkToken,button=$('#qiskit-check');
  button.disabled=true;qollabJobUsed=true;
  const errors=['I',selected===1||(runState&&currentWeather()==='Z')?'Z':'X','I'];
  $('#check-note').textContent='Submitting the installed circuit to the selected free simulator…';
  try{
    const raw=await quantumBridge.run_json.callPromising(backend,JSON.stringify(p),errors.join(''));
    const result=JSON.parse(typeof raw==='string'?raw:raw.toJs());
    if(token===checkToken)$('#check-note').textContent=`Qiskit ideal mean fidelity ${pct(result.ideal_mean)} · backend sampled P(+) ${pct(result.sampled_pplus)} (${result.shots} shots on |+⟩). Counts may differ with noise or finite sampling.`;
    button.textContent='COMPLETE · RERUN FOR ANOTHER JOB';
  }catch(e){$('#check-note').textContent=String(e)+' Rerun the Qollab project before trying again.';button.textContent='RERUN QOLLAB TO RETRY';}
};
