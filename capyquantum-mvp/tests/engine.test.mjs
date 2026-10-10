import test from 'node:test';
import assert from 'node:assert/strict';
import {experiment,syndrome,diagnosis,prepare,encode,inject,extract,correct,decode,density,qiskitSource} from '../web/engine.js';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-9,`${a} != ${b}`);
test('every single X error is corrected for varied amplitudes and phases',()=>{
 for(const theta of [0,.4,Math.PI/2,2.3,Math.PI])for(const phi of [0,.3,Math.PI/2,Math.PI,5.2])for(let q=0;q<3;q++){
  const e=['I','I','I'];e[q]='X';near(experiment(theta,phi,e).fidelity,1);
 }
});
test('no-error recovery preserves all tested input states',()=>{
 for(let i=0;i<25;i++)near(experiment(i*Math.PI/24,i*.271,['I','I','I']).fidelity,1);
});
test('two flips cause a logical X, not a successful correction',()=>{
 for(const errors of [['X','X','I'],['X','I','X'],['I','X','X']])near(experiment(0,0,errors).fidelity,0);
});
test('a hidden phase error changes plus to minus although Z probabilities stay identical',()=>{
 for(let q=0;q<3;q++){
  const e=['I','I','I'];e[q]='Z';const r=experiment(Math.PI/2,0,e);
  assert.deepEqual(r.syndrome,[0,0]);near(r.fidelity,0);near(r.r.p0,.5);near(r.r.x,-1);
 }
});
test('Y bit component is corrected but its phase component remains',()=>{
 for(let q=0;q<3;q++){const e=['I','I','I'];e[q]='Y';const r=experiment(Math.PI/2,0,e);near(r.fidelity,0);near(r.r.x,-1);}
});
test('syndrome register agrees with parity and does not reveal amplitudes',()=>{
 for(const a of ['I','X','Y','Z'])for(const b of ['I','X','Y','Z'])for(const c of ['I','X','Y','Z']){
  const e=[a,b,c],s=syndrome(e);let v=prepare(.73,1.91);encode(v);inject(v,e);extract(v);
  near(density(v,3).p1,s[0]);near(density(v,4).p1,s[1]);
 }
 assert.equal(diagnosis([1,1]),0);assert.equal(diagnosis([1,0]),1);assert.equal(diagnosis([0,1]),2);assert.equal(diagnosis([0,0]),null);
});
test('all Pauli combinations preserve normalization through every stage',()=>{
 for(const a of ['I','X','Y','Z'])for(const b of ['I','X','Y','Z'])for(const c of ['I','X','Y','Z'])for(let stage=0;stage<=4;stage++){
  const {v}=experiment(.91,2.73,[a,b,c],stage);near([...v].reduce((s,x)=>s+x*x,0),1);
 }
});
test('Qiskit export uses coherent recovery and reflects chosen errors',()=>{
 const s=qiskitSource(.5,1.2,['Y','I','Z']);assert.match(s,/qc.y\(0\)/);assert.match(s,/qc.z\(2\)/);assert.match(s,/qc.ccx\(3, 4, 0\)/);assert.match(s,/partial_trace/);assert.match(s,/StatevectorSampler/);
});
