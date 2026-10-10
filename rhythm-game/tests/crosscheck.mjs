// Compare every residual / six-state input, plus actual multi-key recoveries.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { allSpecs, COUNTS, STATES, statevector, syndrome, localEngine, makeBank } from '../model.js';
const specs=allSpecs();
const exhaustive=COUNTS.flatMap(d=>Array.from({length:1<<d},(_,error)=>STATES.map(state=>({d,error,fix:0,state}))).flat());
const corrections=COUNTS.flatMap(d=>[0,1,3,5,(1<<d)-1].flatMap(error=>STATES.map(state=>({d,error,fix:error,state}))));
const checked=[...exhaustive,...corrections];
const python=process.env.QISKIT_PYTHON||new URL('../.venv/bin/python',import.meta.url).pathname;
const script=`import sys,json
from qiskit.quantum_info import Statevector
from qiskit.providers.basic_provider import BasicSimulator
from quantum.rhythm import build_circuit,run_batch,all_specs
payload=json.load(sys.stdin)
assert payload['bank']==all_specs()
vectors=[]
for spec in payload['checked']:
 v=Statevector.from_instruction(build_circuit(spec,False)).data
 vectors.append([[int(i),float(z.real),float(z.imag)] for i,z in enumerate(v) if abs(z)>1e-12])
class Counted:
 def __init__(self): self.calls=0;self.inner=BasicSimulator(seed_simulator=42)
 def run(self,*args,**kwargs): self.calls+=1;return self.inner.run(*args,**kwargs)
b=Counted()
rows=json.loads(run_batch(b,json.dumps(all_specs()),64))
assert b.calls==1
print(json.dumps({'vectors':vectors,'rows':rows,'calls':b.calls}))`;
const result=spawnSync(python,['-c',script],{cwd:new URL('..',import.meta.url),input:JSON.stringify({bank:specs,checked}),encoding:'utf8',maxBuffer:12_000_000});
assert.equal(result.status,0,result.stderr);const data=JSON.parse(result.stdout);
for(let k=0;k<checked.length;k++){
 const actual=statevector(checked[k]),expected=new Map(data.vectors[k].map(([i,re,im])=>[i,[re,im]]));
 for(let i=0;i<actual.re.length;i++){const [re,im]=expected.get(i)||[0,0];assert.ok(Math.abs(re-actual.re[i])<1e-11&&Math.abs(im-actual.im[i])<1e-11,`Amplitude mismatch ${JSON.stringify(checked[k])}, index ${i}`);}
}
const qbank=makeBank(specs,data.rows,()=>.5),local=makeBank(specs,await localEngine.run(specs),()=>.5);
for(const d of COUNTS) for(let error=0;error<1<<d;error++){
 assert.deepEqual(qbank.sample(error,d),syndrome(error,d));
 for(const fix of [0,error,error^1,error^((1<<d)-1)])assert.ok(Math.abs(qbank.fidelity(error,fix,d)-local.fidelity(error,fix,d))<1e-10);
}
console.log(`PASS: ${checked.length} complete complex statevectors; 298 Qiskit reference circuits / 64 shots in ${data.calls} backend job; all syndrome and recovery classes agree.`);
