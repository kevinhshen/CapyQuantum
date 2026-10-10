// Exact five-qubit statevector model. q0 is the least significant bit.
// Circuit edits are actually executed; no success lookup table is used.
export const GATES={H:[[Math.SQRT1_2,0],[Math.SQRT1_2,0],[Math.SQRT1_2,0],[-Math.SQRT1_2,0]],X:[[0,0],[1,0],[1,0],[0,0]],Z:[[1,0],[0,0],[0,0],[-1,0]],Y:[[0,0],[0,-1],[0,1],[0,0]]};
export const STANDARD={"00":-1,"01":2,"10":1,"11":0};
export const PRESETS={
 bare:{name:'Bare wire',basis:'OFF',gates:[],decoder:{'00':-1,'01':-1,'10':-1,'11':-1}},
 bit:{name:'Bit shelter',basis:'Z',gates:[{type:'CX',q:1,control:0,col:0},{type:'CX',q:2,control:0,col:1}],decoder:{...STANDARD}},
 phase:{name:'Phase sail',basis:'X',gates:[{type:'CX',q:1,control:0,col:0},{type:'CX',q:2,control:0,col:1},{type:'H',q:0,col:2},{type:'H',q:1,col:2},{type:'H',q:2,col:2}],decoder:{...STANDARD}}
};
export const INPUTS=[['0',0,0],['1',Math.PI,0],['+',Math.PI/2,0],['−',Math.PI/2,Math.PI],['+i',Math.PI/2,Math.PI/2],['−i',Math.PI/2,3*Math.PI/2]];
export function clone(p){return JSON.parse(JSON.stringify(p));}
export function validate(p){
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
export function ordered(p){return [...p.gates].sort((a,b)=>a.col-b.col||a.q-b.q);}
export function initial(theta,phi){const v=new Float64Array(64);v[0]=Math.cos(theta/2);v[2]=Math.sin(theta/2)*Math.cos(phi);v[3]=Math.sin(theta/2)*Math.sin(phi);return v;}
export function gate(v,q,m){
 for(let i=0;i<32;i++)if(!(i&(1<<q))){const j=i|(1<<q),ar=v[2*i],ai=v[2*i+1],br=v[2*j],bi=v[2*j+1];
  v[2*i]=m[0][0]*ar-m[0][1]*ai+m[1][0]*br-m[1][1]*bi;v[2*i+1]=m[0][0]*ai+m[0][1]*ar+m[1][0]*bi+m[1][1]*br;
  v[2*j]=m[2][0]*ar-m[2][1]*ai+m[3][0]*br-m[3][1]*bi;v[2*j+1]=m[2][0]*ai+m[2][1]*ar+m[3][0]*bi+m[3][1]*br;
 }return v;
}
export function cx(v,controls,q){const mask=controls.reduce((a,c)=>a|(1<<c),0);for(let i=0;i<32;i++)if((i&mask)===mask&&!(i&(1<<q))){const j=i|(1<<q);[v[2*i],v[2*j]]=[v[2*j],v[2*i]];[v[2*i+1],v[2*j+1]]=[v[2*j+1],v[2*i+1]];}return v;}
function apply(v,g){g.type==='CX'?cx(v,[g.control],g.q):gate(v,g.q,GATES[g.type]);}
export function density(v,q=0){let p0=0,p1=0,re=0,im=0;for(let i=0;i<32;i++)if(!(i&(1<<q))){const j=i|(1<<q),ar=v[2*i],ai=v[2*i+1],br=v[2*j],bi=v[2*j+1];p0+=ar*ar+ai*ai;p1+=br*br+bi*bi;re+=ar*br+ai*bi;im+=ai*br-ar*bi;}return {p0,p1,x:2*re,y:-2*im,z:p0-p1};}
export function run(p,errors=['I','I','I'],theta=Math.PI/2,phi=0){
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
export function score(p,errors){return INPUTS.reduce((sum,[,t,f])=>sum+run(p,errors,t,f).fidelity,0)/6;}
export function bench(p){return ['I','X','Z','Y'].map(kind=>{const cases=Array.from({length:kind==='I'?1:3},(_,q)=>{const errors=['I','I','I'];if(kind!=='I')errors[q]=kind;return {kind,q,fidelity:score(p,errors),syndrome:run(p,errors).syndrome};});return cases.sort((a,b)=>a.fidelity-b.fidelity)[0];});}
export function compile(text){
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
export function script(p){return '# Gates run left to right. Recovery runs after the hazard.\n'+ordered(p).map(g=>g.type==='CX'?`CX q${g.control} q${g.q}`:`${g.type} q${g.q}`).join('\n')+`\nCHECK ${p.basis}\n`+Object.entries(p.decoder).map(([s,q])=>`RECOVER ${s} ${q<0?'NONE':'q'+q}`).join('\n');}
export function qiskitSource(p,errors=['I','X','I']){
 validate(p);const ops=ordered(p),lines=['# Qubit Drift: the currently installed player circuit.','from qiskit import QuantumCircuit','from qiskit.quantum_info import Statevector, partial_trace, state_fidelity','from qiskit.primitives import StatevectorSampler','import numpy as np','','def build(theta, phi):','    qc = QuantumCircuit(5)','    qc.ry(theta, 0)','    qc.p(phi, 0)'];
 const add=g=>lines.push('    '+(g.type==='CX'?`qc.cx(${g.control}, ${g.q})`:`qc.${g.type.toLowerCase()}(${g.q})`));ops.forEach(add);lines.push('    qc.barrier()');errors.forEach((e,q)=>{if(e!=='I')lines.push(`    qc.${e.toLowerCase()}(${q})`);});
 if(p.basis==='X')for(let q=0;q<3;q++)lines.push(`    qc.h(${q})`);
 if(p.basis!=='OFF')lines.push('    qc.cx(0, 3)','    qc.cx(1, 3)','    qc.cx(0, 4)','    qc.cx(2, 4)');
 for(const [s,q] of (p.basis==='OFF'?[]:Object.entries(p.decoder))){if(q<0)continue;if(s[0]==='0')lines.push('    qc.x(3)');if(s[1]==='0')lines.push('    qc.x(4)');lines.push(`    qc.ccx(3, 4, ${q})`);if(s[0]==='0')lines.push('    qc.x(3)');if(s[1]==='0')lines.push('    qc.x(4)');}
 if(p.basis==='X')for(let q=0;q<3;q++)lines.push(`    qc.h(${q})`);[...ops].reverse().forEach(add);lines.push('    return qc','','inputs = [(0,0), (np.pi,0), (np.pi/2,0), (np.pi/2,np.pi), (np.pi/2,np.pi/2), (np.pi/2,3*np.pi/2)]','fidelities = []','for theta, phi in inputs:','    qc = build(theta, phi)','    rho = partial_trace(Statevector.from_instruction(qc), [1,2,3,4])','    target = Statevector([np.cos(theta/2), np.exp(1j*phi)*np.sin(theta/2)])','    fidelities.append(float(state_fidelity(rho, target)))',"print('Six-state average fidelity:', np.mean(fidelities))",'qc = build(np.pi/2, 0)','qc.h(0)','qc.measure_all()',"print('X-basis counts (q4 q3 q2 q1 q0):', StatevectorSampler(seed=42).run([qc], shots=256).result()[0].data.meas.get_counts())",'# Ideal selected Pauli errors, one recovery round. No speedup or fault-tolerance claim.');return lines.join('\n')+'\n';
}
