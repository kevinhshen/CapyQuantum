import {experiment,prepare,density,diagnosis,qiskitSource} from './engine.js';
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const degrees=x=>x*Math.PI/180, pct=x=>`${(100*x).toFixed(1)}%`;
let theta=90,phi=0,errors=['I','X','I'],step=1,timer=null,mission=null,prediction=null,checkGeneration=0;
const missions=[{theta:180,phi:0,errors:['I','X','I'],answer:'yes',question:'Can the code recover |1⟩ after one X error on q1?',explain:'Yes. Syndrome 10 identifies q1 under the one-flip assumption, and recovery restores |1⟩.'},{theta:180,phi:0,errors:['X','X','I'],answer:'no',question:'Will the code recover |1⟩ after X errors on q0 and q1?',explain:'No. Syndrome 01 looks like a single error on q2. The decoder flips q2, turning the pair of errors into a logical bit flip.'},{theta:90,phi:0,errors:['I','Z','I'],answer:'no',question:'The syndrome is 00. Is |+⟩ safe after a Z error on q1?',explain:'No. The bit-flip code misses the phase error. |+⟩ becomes |−⟩: Z measurements still look 50/50, but X measurements distinguish them perfectly.'}];
const stages=[['PREPARED','A state worth protecting.','Choose amplitudes and phase. q0 holds your input; the other qubits begin in |0⟩.'],['ENCODED','One state. Shared protection.','Encoding spreads the information across a joint state of three data qubits. No independent copies are made.'],['DISTURBED','A small glitch enters the room.','Your selected Pauli errors act on the encoded data. Can the code find the damage?'],['DETECTED','Find the disagreement.','Two ancillas record pairwise parity. These clues locate a single bit flip without reading the logical state.'],['RECOVERED','The moment of truth.','Ancilla-controlled gates apply recovery. Decoding returns the logical information to q0 for comparison.']];
const notices=['Your original state is the reference. We use exact state information only because this is a simulator.','Three data qubits hold α|000⟩ + β|111⟩. Select an error, then inject it.','The code has not checked for errors yet. The error you chose is known to you, but the decoder only gets the syndrome.',''];
function stop(){if(timer)clearTimeout(timer);timer=null;$('#play').textContent='▶';$('#play').setAttribute('aria-label','Play the full experiment');}
function resetPrediction(){mission=null;prediction=null;$('#prediction').hidden=true;}
function renderControls(){
 $('#theta').value=theta;$('#phi').value=phi;$('#theta-value').textContent=`${theta}°`;$('#phi-value').textContent=`${phi}°`;
 $$('#presets button').forEach(b=>{const yes=+b.dataset.theta===theta && (+b.dataset.phi===phi||theta===0||theta===180);b.classList.toggle('selected',yes);b.setAttribute('aria-pressed',yes);});
 const a=Math.cos(degrees(theta)/2),b=Math.sin(degrees(theta)/2);
 $('#input-state').textContent=`${a.toFixed(3)} |0⟩ + ${b.toFixed(3)} eⁱ⁽${phi}°⁾ |1⟩`;
 $('#error-controls').innerHTML=errors.map((e,q)=>`<div class="error-row"><span class="qubit-label">q${q}</span><div class="error-buttons" role="group" aria-label="Error on qubit ${q}">${['I','X','Z','Y'].map(x=>`<button data-q="${q}" data-error="${x}" aria-label="${({I:'No error',X:'Bit flip',Z:'Phase flip',Y:'Bit and phase flip'})[x]} on q${q}" aria-pressed="${e===x}" class="${e===x?'selected':''}">${x==='I'?'—':x}</button>`).join('')}</div></div>`).join('');
 $$('#error-controls button').forEach(b=>b.onclick=()=>{stop();errors[+b.dataset.q]=b.dataset.error;step=1;resetPrediction();render();});
}
function registerSvg(result){
 const full=step>=1,errorActive=step>=2,done=step===4;
 const xs=[110,270,430];
 return `<svg viewBox="0 0 540 230" role="img" aria-label="Three data qubits ${done?'after recovery and decoding':full?'encoded together':'before encoding'}. ${errorActive?'Selected errors: '+errors.join(', '):'No errors applied yet'}. The circles are schematic, not individual qubit states."><defs><filter id="glow"><feGaussianBlur stdDeviation="8"/></filter></defs>${full&&!done?`<path d="M110 107Q270 27 430 107M110 107Q270 188 430 107" fill="none" class="register-line ${errorActive&&!done?'active':''}"/>`:''}${xs.map((x,q)=>{
 const e=errorActive?errors[q]:'I';const damaged=(e!=='I'&&!done)||(done&&q===0&&result.fidelity<1-1e-9);
 return `<g><circle cx="${x}" cy="106" r="43" class="register-ring orbit"/><circle cx="${x}" cy="106" r="32" class="qubit-shell ${damaged?'error':done?'done':''}"/><circle cx="${x}" cy="106" r="19" fill="${damaged?'#ef9b70':'#90b48d'}" opacity=".22" filter="url(#glow)"/><circle cx="${x}" cy="106" r="7" class="qubit-core ${damaged?'error':''} pulse"/><text x="${x}" y="169" text-anchor="middle" fill="#535d51" font-family="monospace" font-size="13">q${q}</text><text x="${x}" y="192" text-anchor="middle" fill="#72756b" font-size="10">${done?(q===0?'decoded state':'data helper'):damaged?({X:'bit flip · X',Z:'phase flip · Z',Y:'both · Y'})[e]:full?'encoded data':q===0?'input state':'|0⟩ helper'}</text>${damaged&&!done?`<rect x="${x+19}" y="65" width="23" height="23" rx="5" fill="#ce532c"/><text x="${x+30.5}" y="81" text-anchor="middle" fill="white" font-family="monospace" font-size="12">${e}</text>`:''}</g>`;
 }).join('')}<text x="270" y="22" text-anchor="middle" fill="#72756b" font-size="9" font-family="monospace" letter-spacing="1.2">${done?'RECOVERED LOGICAL QUBIT → q0':full?'ONE JOINT QUANTUM STATE':'FIVE QUBITS · THREE DATA + TWO ANCILLAS'}</text></svg>`;
}
function blochSvg(r){
 const t=degrees(theta),p=degrees(phi),original={x:Math.sin(t)*Math.cos(p),y:Math.sin(t)*Math.sin(p),z:Math.cos(t)};
 const project=a=>[120+56*a.x+24*a.y,79-58*a.z+17*a.y];
 const arrow=(a,c,id,dashed=false)=>{const [x,y]=project(a);return `<path d="M120 79L${x} ${y}" stroke="${c}" stroke-width="2.5" ${dashed?'stroke-dasharray="4 3"':''} marker-end="url(#${id})"/><circle cx="${x}" cy="${y}" r="3" fill="${c}"/>`;};
 return `<svg viewBox="0 0 240 160" role="img" aria-label="Bloch sphere schematic showing original ${step===4?'and recovered':'state; recovered state not yet available'}"><defs><marker id="a-original" markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto"><path d="M0 0L5 2.5L0 5Z" fill="#237d86"/></marker><marker id="a-recovered" markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto"><path d="M0 0L5 2.5L0 5Z" fill="#ce532c"/></marker></defs><circle cx="120" cy="79" r="58" fill="none" stroke="#d4d9ca"/><ellipse cx="120" cy="79" rx="58" ry="18" fill="none" stroke="#d4d9ca"/><ellipse cx="120" cy="79" rx="22" ry="58" fill="none" stroke="#e0e3d6"/><path d="M120 15V142M58 79H184M89 56L150 102" stroke="#d4d9ca" stroke-dasharray="3 4"/><text x="120" y="11" text-anchor="middle" font-family="monospace" font-size="9" fill="#72756b">|0⟩</text><text x="120" y="155" text-anchor="middle" font-family="monospace" font-size="9" fill="#72756b">|1⟩</text><text x="187" y="82" font-size="9" fill="#72756b">X</text><text x="154" y="110" font-size="9" fill="#72756b">Y</text>${arrow(original,'#237d86','a-original',true)}${step===4?arrow(r,'#ce532c','a-recovered'):''}<circle cx="120" cy="79" r="2" fill="#8d9585"/></svg>`;
}
function circuitSvg(){
 const groups=[['Input',0,2],['Encode',2,4],['Error',4,5],['Syndrome',5,9],['Recover',9,16],['Decode',16,18]];
 const pos=c=>78+c*44,yy=q=>49+q*32;
 const ops=[{c:0,q:0,label:'Ry'},{c:1,q:0,label:'P'}, {c:2,ctrl:[0],q:1},{c:3,ctrl:[0],q:2},...errors.map((e,q)=>({c:4,q,label:e})),{c:5,ctrl:[0],q:3},{c:6,ctrl:[1],q:3},{c:7,ctrl:[0],q:4},{c:8,ctrl:[2],q:4},{c:9,ctrl:[3,4],q:0},{c:10,q:4,label:'X'},{c:11,ctrl:[3,4],q:1},{c:12,q:4,label:'X'},{c:13,q:3,label:'X'},{c:14,ctrl:[3,4],q:2},{c:15,q:3,label:'X'},{c:16,ctrl:[0],q:2},{c:17,ctrl:[0],q:1}];
 return `<svg viewBox="0 0 900 210" role="img" aria-label="Qiskit-equivalent circuit: prepare, encode, apply errors, extract syndrome, coherently correct, decode">${groups.map(([label,a,b])=>`<text x="${(pos(a)+pos(b-1))/2}" y="16" text-anchor="middle" font-size="9" fill="#72756b" font-family="monospace">${label}</text>`).join('')}${[0,1,2,3,4].map(q=>`<text x="9" y="${yy(q)+4}" font-family="monospace" font-size="11" fill="#72756b">${q<3?'q'+q:'s'+(q===3?'01':'02')}</text><path d="M49 ${yy(q)}H880" stroke="#d5d9cc"/>`).join('')}${ops.map(o=>o.ctrl?`<path d="M${pos(o.c)} ${Math.min(yy(o.q),...o.ctrl.map(yy))}V${Math.max(yy(o.q),...o.ctrl.map(yy))}" stroke="#5d705a"/>${o.ctrl.map(q=>`<circle cx="${pos(o.c)}" cy="${yy(q)}" r="3" fill="#5d705a"/>`).join('')}<circle cx="${pos(o.c)}" cy="${yy(o.q)}" r="9" fill="#fffcf5" stroke="#5d705a"/><path d="M${pos(o.c)-5} ${yy(o.q)}h10M${pos(o.c)} ${yy(o.q)-5}v10" stroke="#5d705a"/>`:`<rect x="${pos(o.c)-12}" y="${yy(o.q)-11}" width="24" height="22" rx="4" fill="${o.c===4&&o.label!=='I'?'#fbe5da':'#eeeee3'}" stroke="${o.c===4&&o.label!=='I'?'#d7967d':'#c8cfc0'}"/><text x="${pos(o.c)}" y="${yy(o.q)+3}" text-anchor="middle" font-family="monospace" font-size="9" fill="#4f5d4d">${o.label}</text>`).join('')}</svg>`;
}
function render(){
 checkGeneration++; $('#qiskit-verification').textContent='Run an independent Qiskit check when using the local Python server.'; renderControls();const res=experiment(degrees(theta),degrees(phi),errors,step),[tag,title,desc]=stages[step];
 $('#stage-tag').textContent=tag;$('#stage-title').textContent=title;$('#stage-description').textContent=desc;$('#step-counter').textContent=`0${step+1} / 05`;
 $('#register').innerHTML=registerSvg(res);$('#back').disabled=step===0;
 $('#next').textContent=['Encode state →','Inject errors →','Read syndrome →','Recover state →','Run again ↺'][step];
 $$('#steps button').forEach(b=>{b.classList.toggle('active',+b.dataset.step===step);b.setAttribute('aria-current',+b.dataset.step===step?'step':'false');});
 $('#s01').textContent=step>=3?res.syndrome[0]:'—';$('#s02').textContent=step>=3?res.syndrome[1]:'—';
 const where=diagnosis(res.syndrome);
 $('#syndrome-caption').textContent=step<3?'Check agreement, not the secret.':where===null?'00: no bit-flip disagreement detected.':`${res.syndrome.join('')}: decoder suspects q${where}.`;
 const status=$('#status');status.className='status';
 if(step<3)status.textContent=notices[step];
 else if(step===3)status.textContent=where===null?'The syndrome is quiet. That does not prove the state is intact: this code cannot detect phase errors.':`Under the at-most-one-bit-flip assumption, this syndrome points to q${where}. Multiple flips can produce the same clue.`;
 else {const good=res.fidelity>1-1e-9;status.classList.add(good?'success':'failure');status.textContent=good?'State recovered. The output matches the original amplitudes and relative phase. Try the ghost mission to discover the boundary.':'Recovery did not restore the original state. A quiet syndrome or confident correction is not a guarantee. Compare both measurement bases.';}
 $('#fidelity').textContent=step===4?(100*res.fidelity).toFixed(1):'—';$('#fidelity-bar').style.width=step===4?pct(res.fidelity):'0';$('#fidelity-bar').style.background=res.fidelity>.999?'var(--green)':'var(--orange)';
 $('#result-note').textContent=step===4?(res.fidelity>.999?'Same state, up to an irrelevant global phase.':'The state changed. Fidelity checks phase as well as measurement probabilities.'):'Recover the state to reveal its fidelity.';
 $('#bloch').innerHTML=blochSvg(res.r);
 const original=density(prepare(degrees(theta),degrees(phi)));
 $('#measurement-bars').innerHTML=[['Z','0',original.p0,res.r.p0],['X','+', (1+original.x)/2,(1+res.r.x)/2]].map(([basis,out,a,b])=>`<div class="measurement-row"><div><span>${basis} basis · P(${out})</span><span>${pct(a)} / ${step===4?pct(b):'—'}</span></div><div class="measurement-track" role="img" aria-label="${basis} basis probability of ${out}. Original ${pct(a)}. Recovered ${step===4?pct(b):'not available yet'}"><span class="input-fill" style="width:${pct(a)}"></span><span class="output-fill" style="width:${step===4?pct(b):'0'}"></span></div></div>`).join('');
 $('#circuit').innerHTML=circuitSvg();$('#source-code').textContent=qiskitSource(degrees(theta),degrees(phi),errors);
 const amps=[];for(let i=0;i<32;i++){const re=res.v[2*i],im=res.v[2*i+1],p=re*re+im*im;if(p>1e-10)amps.push({bits:i.toString(2).padStart(5,'0').split('').reverse().join(''),p,phase:Math.round(Math.atan2(im,re)*180/Math.PI)});}
 $('#amplitudes').innerHTML=amps.map(a=>`<div class="amp-row"><span>|${a.bits}⟩</span><span class="amp-track"><span style="width:${pct(a.p)}"></span></span><span>${pct(a.p)} · ${a.phase}°</span></div>`).join('');
 if(mission!==null&&prediction){$('#prediction-feedback').textContent=step===4?`${prediction===missions[mission].answer?'Your prediction was right.':'A useful surprise.'} ${missions[mission].explain}`:'Prediction saved. Run recovery to test it.';}
}
function toast(message){$('.toast')?.remove();const el=document.createElement('div');el.className='toast';el.role='status';el.textContent=message;document.body.append(el);setTimeout(()=>el.remove(),3000);}
$('#theta').oninput=e=>{stop();theta=+e.target.value;step=0;resetPrediction();render();};$('#phi').oninput=e=>{stop();phi=+e.target.value;step=0;resetPrediction();render();};
$$('#presets button').forEach(b=>b.onclick=()=>{stop();theta=+b.dataset.theta;phi=+b.dataset.phi;step=0;resetPrediction();render();});
$('#clear').onclick=()=>{stop();errors=['I','I','I'];step=1;resetPrediction();render();};
$('#next').onclick=()=>{stop();step=step===4?0:step+1;render();};$('#back').onclick=()=>{stop();step=Math.max(0,step-1);render();};
$$('#steps button').forEach(b=>b.onclick=()=>{stop();step=+b.dataset.step;render();});
$('#play').onclick=()=>{if(timer){stop();return;}step=0;render();$('#play').textContent='Ⅱ';$('#play').setAttribute('aria-label','Pause the experiment');const tick=()=>{step++;render();if(step<4)timer=setTimeout(tick,1100);else stop();};timer=setTimeout(tick,1100);};
$$('[data-mission]').forEach(b=>b.onclick=()=>{stop();mission=+b.dataset.mission;prediction=null;const m=missions[mission];theta=m.theta;phi=m.phi;errors=[...m.errors];step=1;$('#prediction').hidden=false;$('#prediction-question').textContent=m.question;$('#prediction-feedback').textContent='Make a prediction, then use Recover or play the experiment.';$$('[data-answer]').forEach(x=>{x.setAttribute('aria-pressed','false');x.style.background='transparent';});render();$('.workspace').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});});
$$('[data-answer]').forEach(b=>b.onclick=()=>{prediction=b.dataset.answer;$$('[data-answer]').forEach(x=>{x.setAttribute('aria-pressed',x===b);x.style.background=x===b?'#d9e4d3':'transparent';});render();});
$('#help').onclick=()=>$('#notes').showModal();$('#basis-help').onclick=()=>$('#notes').showModal();$('#close-notes').onclick=()=>$('#notes').close();$('#notes').onclick=e=>{if(e.target===$('#notes')){const r=$('#notes').getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)$('#notes').close();}};
$('#export').onclick=()=>{const blob=new Blob([qiskitSource(degrees(theta),degrees(phi),errors)],{type:'text/x-python'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='capyquantum_experiment.py';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('Matching Qiskit circuit exported.');};
$('#copy-code').onclick=async()=>{try{await navigator.clipboard.writeText($('#source-code').textContent);toast('Qiskit code copied.');}catch{toast('Clipboard unavailable. Use Export Qiskit instead.');}};
$('#verify-qiskit').onclick=async()=>{
 stop();step=4;render();const generation=checkGeneration,button=$('#verify-qiskit'),label=$('#qiskit-verification');
 button.disabled=true;label.textContent='Checking the circuit with Qiskit…';
 try{
  const query=new URLSearchParams({theta:String(theta),phi:String(phi),errors:errors.join('')});
  const response=await fetch('/api/experiment?'+query,{signal:AbortSignal.timeout(15000)});
  if(!(response.headers.get('content-type')||'').includes('application/json'))throw new Error('Start python3 server.py and install requirements.txt to enable this check.');
  const result=await response.json();if(!response.ok)throw new Error(result.error||'Qiskit verification failed.');
  if(generation!==checkGeneration)return;
  const browser=experiment(degrees(theta),degrees(phi),errors);
  const matches=Math.abs(result.fidelity-browser.fidelity)<1e-9 && Math.abs(result.p0_z-browser.r.p0)<1e-9 && Math.abs(result.pplus_x-(1+browser.r.x)/2)<1e-9;
  label.textContent=matches?`Qiskit confirmed · fidelity ${pct(result.fidelity)} · both measurement bases match the browser model.`:'Verification mismatch. Do not use these results until investigated.';
 }catch(error){if(generation===checkGeneration)label.textContent=error.message;}
 finally{button.disabled=false;}
};
render();
