import test from 'node:test';
import assert from 'node:assert/strict';
import { allSpecs, COUNTS, STATES, localEngine, makeBank, syndrome, decode, weight, statevector, distribution } from '../model.js';
import { getMap, listMaps, validateMap, laneKeys, registerMap } from '../maps.js';
import { RhythmRun } from '../rhythm.js';
const specs = allSpecs(), rows = await localEngine.run(specs), bank = makeBank(specs, rows, () => .5);
const sample = () => ({version:1,id:'test-map',title:'Test',artist:'Team',qubits:7,bpm:120,durationBeats:16,events:[{id:'chord',beat:4,error:[0,2],steps:[{offset:0,lanes:[0,2]}]},{id:'burst',beat:8,error:[1,3,6],steps:[{offset:0,lanes:[1]},{offset:.25,lanes:[3]},{offset:.5,lanes:[6]}]},{id:'clean',beat:12,error:[],steps:[]}]});
test('all guaranteed errors decode; complementary errors alias and even-count ties refuse a guess',()=>{
 for(const d of COUNTS) for(let e=0;e<1<<d;e++) {
  const full=(1<<d)-1;assert.deepEqual(syndrome(e,d),syndrome(e^full,d));
  if(weight(e)<=Math.floor((d-1)/2)) assert.equal(decode(syndrome(e,d)),e);
  if(weight(e)*2===d) assert.equal(decode(syndrome(e,d)),null);
 }
});
test('298 unique reference circuits are normalized and use all supported lane counts',()=>{
 assert.equal(specs.length,298);assert.equal(new Set(specs.map(s=>JSON.stringify(s))).size,298);
 for(const spec of specs){const v=statevector(spec);const norm=v.re.reduce((s,r,i)=>s+r*r+v.im[i]*v.im[i],0);assert.ok(Math.abs(norm-1)<1e-12);}
});
test('net multi-action correction preserves arbitrary six-state inputs; logical X preserves only a third on average',()=>{
 for(const d of COUNTS) for(let error=0;error<1<<d;error++) {
  assert.ok(Math.abs(bank.fidelity(error,error,d)-1)<1e-12);
  assert.ok(Math.abs(bank.fidelity(error,error^((1<<d)-1),d)-1/3)<1e-12);
  assert.equal(bank.fidelity(error,error^1,d),0);
 }
 for(const state of STATES){const out=distribution({d:7,error:73,fix:73,state});assert.ok(Math.abs(out.reduce((s,r)=>s+(r.pass?r.weight:0),0)-1)<1e-12);}
});
test('every generated map validates for 3–7 qubits, remains deterministic, and includes wider chords / rapid sequences',()=>{
 for(const entry of listMaps())for(const d of COUNTS){const map=getMap(entry.id,d);assert.deepEqual(map,getMap(entry.id,d));assert.equal(laneKeys(d).length,d);validateMap(map);if(d>=5){assert.ok(map.events.some(e=>e.steps.length>1));assert.ok(map.events.some(e=>e.steps.some(s=>s.lanes.length>1)));}}
});
test('rolled chords in either order and quarter-beat bursts recover the whole register',()=>{
 const map=validateMap(sample()),run=new RhythmRun(map,bank);
 assert.equal(run.press(2,2.02).timing,'Perfect');assert.equal(run.press(0,2.04).timing,'Perfect');
 run.press(1,4);run.press(3,4.125);run.press(6,4.25);run.advance(8);
 const result=run.summary();assert.equal(result.restored,3);assert.equal(result.hits,5);assert.equal(result.best,5);assert.equal(result.grade,'S');assert.ok(Math.abs(result.fidelity-1)<1e-12);
});
test('missing one step, wrong-lane input, and duplicate taps affect quantum recovery independently of rhythm hits',()=>{
 const map=validateMap(sample());
 const missed=new RhythmRun(map,bank);missed.press(1,4);missed.press(6,4.25);missed.advance(8);assert.equal(missed.results.find(r=>r.id==='burst').restored,false);
 const duplicate=new RhythmRun(map,bank);duplicate.press(0,2);duplicate.press(2,2);duplicate.press(0,2.03);duplicate.advance(8);assert.equal(duplicate.results[0].restored,false);assert.equal(duplicate.summary().strays,1);
 const clean=new RhythmRun(map,bank);clean.press(6,6.01);clean.advance(8);assert.equal(clean.results[2].restored,false);
});
test('timing thresholds, misses, out-of-window strays, and one-time packet resolution',()=>{
 const map=validateMap({...sample(),events:[{beat:4,error:[0]}]});
 for(const [delta,timing] of [[0,'Perfect'],[.06,'Great'],[.12,'Good']]) {const run=new RhythmRun(map,bank);assert.equal(run.press(0,2+delta).timing,timing);run.advance(3);assert.equal(run.results[0].restored,true);assert.equal(run.advance(4).length,0);}
 const run=new RhythmRun(map,bank);assert.equal(run.press(0,1).type,'stray');run.advance(3);assert.equal(run.summary().judgements.Miss,1);assert.equal(run.results[0].applied,0);
});
test('authored maps reject ambiguous errors, incorrect solutions, collisions, unsafe URLs, and malformed music',()=>{
 const invalid=fn=>{const map=sample();fn(map);assert.throws(()=>validateMap(map));};
 invalid(m=>{m.qubits=4;m.events=[{beat:4,error:[0,1]}];});
 invalid(m=>{m.events[0].steps[0].lanes=[0];});
 invalid(m=>{m.events.push({beat:4,error:[0]});});
 invalid(m=>{m.music={url:'javascript:alert(1)',credit:'Team'};});
 invalid(m=>{m.music='bad';});
 invalid(m=>{m.events[0].error=[7];});
 const map=sample();assert.equal(registerMap(map),'test-map');assert.throws(()=>registerMap(map),/already exists/);assert.equal(getMap('test-map',3).qubits,7);
});
test('burst corrections accept a different key order from the authored reference',()=>{
 const run=new RhythmRun(validateMap(sample()),bank);run.press(6,4);run.press(1,4.125);run.press(3,4.25);run.advance(7);const result=run.results.find(r=>r.id==='burst');assert.equal(result.restored,true);assert.equal(run.goodFixes,3);
});
test('a perfectly timed wrong key earns no points and changes the live parity clues',()=>{
 const run=new RhythmRun(validateMap({...sample(),events:[{beat:4,error:[0]}]}),bank),p=run.packets[0];
 const before=run.checks(p);const hit=run.press(4,2);assert.equal(hit.timing,'Perfect');assert.equal(hit.correct,false);assert.equal(run.score,0);assert.notDeepEqual(run.checks(p),before);run.advance(4);assert.equal(run.summary().judgements.Wrong,1);assert.equal(run.summary().choiceAccuracy,0);assert.equal(run.summary().restored,0);
});
test('live checks become equal only after net correction; a repeated key can reintroduce an error',()=>{
 const run=new RhythmRun(validateMap(sample()),bank),p=run.packets[0];run.press(2,2);assert.notDeepEqual(run.checks(p),Array(6).fill(0));run.press(0,2);assert.deepEqual(run.checks(p),Array(6).fill(0));run.press(0,2.02);assert.notDeepEqual(run.checks(p),Array(6).fill(0));
});
test('malformed quantum references fail without silently substituting a different simulator',()=>{
 assert.throws(()=>makeBank(specs,[]),/Invalid quantum/);assert.throws(()=>makeBank(specs,rows.map(()=>[{syn:[0],pass:true,weight:0}])),/Invalid quantum/);
});
