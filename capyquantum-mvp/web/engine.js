// Exact, five-qubit pure-state simulation. Qubit q0 is the least significant bit.
// Deliberately dependency-free, so the learning lab also works offline.
export const I = [[1,0],[0,0],[0,0],[1,0]];
export const X = [[0,0],[1,0],[1,0],[0,0]];
export const Z = [[1,0],[0,0],[0,0],[-1,0]];
export const Y = [[0,0],[0,-1],[0,1],[0,0]];
export const H = [[Math.SQRT1_2,0],[Math.SQRT1_2,0],[Math.SQRT1_2,0],[-Math.SQRT1_2,0]];
export function initial(n=5) { const v=new Float64Array(2*(1<<n)); v[0]=1; return v; }
export function gate(v,q,m) {
  const bit=1<<q;
  for(let i=0;i<v.length/2;i++) if(!(i&bit)) {
    const j=i|bit, ar=v[2*i],ai=v[2*i+1],br=v[2*j],bi=v[2*j+1];
    v[2*i]=m[0][0]*ar-m[0][1]*ai+m[1][0]*br-m[1][1]*bi;
    v[2*i+1]=m[0][0]*ai+m[0][1]*ar+m[1][0]*bi+m[1][1]*br;
    v[2*j]=m[2][0]*ar-m[2][1]*ai+m[3][0]*br-m[3][1]*bi;
    v[2*j+1]=m[2][0]*ai+m[2][1]*ar+m[3][0]*bi+m[3][1]*br;
  }
  return v;
}
export function controlledX(v,controls,target) {
  const mask=controls.reduce((a,q)=>a|(1<<q),0), bit=1<<target;
  for(let i=0;i<v.length/2;i++) if((i&mask)===mask && !(i&bit)) {
    const j=i|bit;
    [v[2*i],v[2*j]]=[v[2*j],v[2*i]];
    [v[2*i+1],v[2*j+1]]=[v[2*j+1],v[2*i+1]];
  }
  return v;
}
export function prepare(theta,phi,n=5) {
  const v=initial(n),c=Math.cos(theta/2),s=Math.sin(theta/2);
  v[0]=c;v[2]=s*Math.cos(phi);v[3]=s*Math.sin(phi);return v;
}
export function encode(v) { controlledX(v,[0],1);controlledX(v,[0],2);return v; }
export function inject(v,errors) { errors.forEach((e,q)=>gate(v,q,({I,X,Y,Z})[e]));return v; }
export function extract(v) {
  controlledX(v,[0],3);controlledX(v,[1],3);
  controlledX(v,[0],4);controlledX(v,[2],4);return v;
}
export function correct(v) {
  controlledX(v,[3,4],0);
  gate(v,4,X);controlledX(v,[3,4],1);gate(v,4,X);
  gate(v,3,X);controlledX(v,[3,4],2);gate(v,3,X);return v;
}
export function decode(v) { controlledX(v,[0],2);controlledX(v,[0],1);return v; }
export function density(v,q=0) {
  const b=1<<q;let p0=0,p1=0,re=0,im=0;
  for(let i=0;i<v.length/2;i++) if(!(i&b)) {
    const j=i|b,ar=v[2*i],ai=v[2*i+1],br=v[2*j],bi=v[2*j+1];
    p0+=ar*ar+ai*ai;p1+=br*br+bi*bi;re+=ar*br+ai*bi;im+=ai*br-ar*bi;
  }
  return {p0,p1,x:2*re,y:-2*im,z:p0-p1};
}
export function fidelity(v,theta,phi) {
  const r=density(v),x=Math.sin(theta)*Math.cos(phi),y=Math.sin(theta)*Math.sin(phi),z=Math.cos(theta);
  return Math.max(0,Math.min(1,(1+r.x*x+r.y*y+r.z*z)/2));
}
export function syndrome(errors) {
  const e=errors.map(x=>Number(x==='X'||x==='Y'));
  return [e[0]^e[1],e[0]^e[2]];
}
export function diagnosis(s) { return ({'00':null,'11':0,'10':1,'01':2})[s.join('')]; }
export function experiment(theta,phi,errors,stage=4) {
  const v=prepare(theta,phi);
  if(stage>=1) encode(v);
  if(stage>=2) inject(v,errors);
  if(stage>=3) extract(v);
  if(stage>=4) {correct(v);decode(v);}
  const baseline=prepare(theta,phi,1);inject(baseline,[errors[0]]);
  const r=density(v);
  return {v,r,fidelity:fidelity(v,theta,phi),baselineFidelity:fidelity(baseline,theta,phi),syndrome:syndrome(errors)};
}
export function qiskitSource(theta,phi,errors) {
  return `# CapyQuantum: coherent three-qubit bit-flip recovery\n# Ideal gates, selected Pauli errors; no mid-circuit measurement required.\nfrom qiskit import QuantumCircuit\nfrom qiskit.quantum_info import Statevector, partial_trace, state_fidelity\nfrom qiskit.primitives import StatevectorSampler\nimport numpy as np\n\ntheta = ${theta.toPrecision(12)}\nphi = ${phi.toPrecision(12)}\nqc = QuantumCircuit(5)\nqc.ry(theta, 0)\nqc.p(phi, 0)\nqc.cx(0, 1)\nqc.cx(0, 2)\nqc.barrier()\n${errors.map((e,q)=>e==='I'?`# q${q}: no error`:`qc.${e.toLowerCase()}(${q})`).join('\n')}\nqc.barrier()\n# Syndrome ancillas: s01=q3 and s02=q4\nqc.cx(0, 3)\nqc.cx(1, 3)\nqc.cx(0, 4)\nqc.cx(2, 4)\n# Coherent recovery, assuming at most one bit flip\nqc.ccx(3, 4, 0)\nqc.x(4)\nqc.ccx(3, 4, 1)\nqc.x(4)\nqc.x(3)\nqc.ccx(3, 4, 2)\nqc.x(3)\n# Decode the logical state into q0\nqc.cx(0, 2)\nqc.cx(0, 1)\n\nsv = Statevector.from_instruction(qc)\nrecovered = partial_trace(sv, [1, 2, 3, 4])\ntarget = Statevector([np.cos(theta/2), np.exp(1j*phi)*np.sin(theta/2)])\nprint('Recovered-state fidelity:', state_fidelity(recovered, target))\n# Measurements in both bases reveal errors that Z measurement can miss.\nfor basis in ('Z', 'X'):\n    measured = qc.copy()\n    if basis == 'X':\n        measured.h(0)\n    measured.measure_all()\n    result = StatevectorSampler(seed=42).run([measured], shots=1024).result()[0]\n    print(basis, result.data.meas.get_counts())\n# Qiskit bitstrings are q4 q3 q2 q1 q0.\n# To run on Qollab's selected backend, use its documented submission API.\n`;
}
