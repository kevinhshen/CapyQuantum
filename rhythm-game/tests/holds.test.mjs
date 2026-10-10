import test from 'node:test';
import assert from 'node:assert/strict';
import { validateMap, getMap } from '../maps.js';
import { RhythmRun } from '../rhythm.js';
import { beatToSeconds } from '../timing.js';
const bank = {sample:(e,d)=>Array.from({length:d-1},(_,i)=>(e>>i&1)^(e>>(i+1)&1)),fidelity:(e,f)=>e===f?1:0};
const chart = (changes={}) => validateMap({id:'holds',title:'Holds',artist:'Team',qubits:4,bpm:120,durationBeats:16,events:[{beat:4,error:[1],steps:[{offset:0,lanes:[1],holdBeats:2}]}],...changes});
test('hold awards one note after sustain; repeated down events never add an X',()=>{
 const run=new RhythmRun(chart(),bank), p=run.packets[0];
 assert.equal(run.press(1,2).holding,true);assert.equal(p.applied,2);assert.equal(run.score,0);
 assert.equal(run.press(1,2.4).type,'hold-resume');assert.equal(p.applied,2);assert.equal(run.goodFixes,1);
 run.advance(2.99);assert.equal(run.score,0);assert.equal(p.done,false);
 run.advance(3);assert.equal(run.score,300);assert.equal(run.combo,1);assert.equal(run.release(1,3.02),null);
 run.advance(4);assert.equal(run.score,300);assert.equal(run.summary().holdsCompleted,1);assert.equal(run.summary().restored,1);
});
test('early release misses rhythm credit but never reverses the correction',()=>{
 const run=new RhythmRun(chart(),bank);run.press(1,2);
 assert.equal(run.release(1,2.5).type,'hold-break');run.advance(4);
 assert.equal(run.score,0);assert.equal(run.summary().judgements.Miss,1);assert.equal(run.summary().holdsBroken,1);assert.equal(run.summary().restored,1);assert.equal(run.goodFixes,1);
});
test('release grace, missed heads and wrong keys have distinct outcomes',()=>{
 const near=new RhythmRun(chart(),bank);near.press(1,2);assert.equal(near.release(1,2.97).type,'hold-complete');assert.equal(near.score,300);
 const missed=new RhythmRun(chart(),bank);missed.advance(4);assert.equal(missed.summary().restored,0);assert.equal(missed.summary().judgements.Miss,1);
 const wrong=new RhythmRun(chart(),bank);assert.equal(wrong.press(0,2).holding,false);wrong.advance(4);assert.equal(wrong.score,0);assert.equal(wrong.summary().judgements.Wrong,1);assert.equal(wrong.summary().restored,0);
});
test('two holds accept either faulty lane order and both must be sustained',()=>{
 const map=chart({qubits:5,events:[{beat:4,error:[0,3],steps:[{offset:0,lanes:[0,3],holdBeats:2}]}]});
 const run=new RhythmRun(map,bank);run.press(3,2);run.press(0,2.02);run.release(3,2.5);run.advance(4);
 assert.equal(run.summary().holdsCompleted,1);assert.equal(run.summary().holdsBroken,1);assert.equal(run.summary().restored,1);assert.equal(run.score,300);
});
test('hold resume applies no extra gate; an unresumed hold loses credit',()=>{
 const resumed=new RhythmRun(chart(),bank);resumed.press(1,2);resumed.suspendHolds();resumed.press(1,2.4);resumed.advance(4);assert.equal(resumed.summary().holdsCompleted,1);assert.equal(resumed.goodFixes,1);assert.equal(resumed.summary().restored,1);
 const abandoned=new RhythmRun(chart(),bank);abandoned.press(1,2);abandoned.suspendHolds();abandoned.advance(4);assert.equal(abandoned.summary().holdsBroken,1);assert.equal(abandoned.score,0);
});
test('hold tails follow tempo changes and resolve the packet only after its end',()=>{
 const map=chart({tempoChanges:[{beat:5,bpm:60}]}),run=new RhythmRun(map,bank);
 assert.equal(run.notes[0].endAt,3.5);run.press(1,2);run.advance(3.4);assert.equal(run.packets[0].done,false);run.advance(4);assert.equal(run.summary().holdsCompleted,1);
});
test('validation rejects invalid durations, tails past the song, and packet overlap with tails',()=>{
 for(const holdBeats of [-1,.1,NaN,Infinity,'2',9]) assert.throws(()=>chart({events:[{beat:4,error:[1],steps:[{offset:0,lanes:[1],holdBeats}]}]}),/Hold duration/);
 assert.throws(()=>chart({bpm:220,events:[{beat:4,error:[1],steps:[{offset:0,lanes:[1],holdBeats:.5}]}]}),/300 ms/);
 assert.throws(()=>chart({events:[{beat:15,error:[1],steps:[{offset:0,lanes:[1],holdBeats:2}]}]}),/past the song/);
 assert.throws(()=>chart({events:[{beat:4,error:[1],steps:[{offset:0,lanes:[1],holdBeats:2}]},{beat:5,error:[2]}]}),/300 ms/);
});
test('untimed practice removes sustain demand; built-in maps contain both taps and holds',()=>{
 const run=new RhythmRun(chart(),bank,{untimed:true});run.press(1,2);assert.equal(run.score,300);assert.equal(run.notes[0].holding,false);run.advance(4);assert.equal(run.summary().restored,1);
 for(const id of ['morning-dew','lantern-waltz','firefly-rush']) for(const d of [3,4,5,6,7]) {
  const map=getMap(id,d);assert.ok(map.events.some(e=>e.steps.some(s=>s.holdBeats>0)));assert.ok(map.events.some(e=>e.steps.some(s=>s.holdBeats===0)));
  const game=new RhythmRun(map,bank);for(const note of game.notes)game.press(note.lane,note.at);game.advance(beatToSeconds(map,map.durationBeats)+1);assert.equal(game.summary().grade,'S');assert.equal(game.summary().holdsCompleted,game.summary().holds);
 }
});
test('a playable level needs an action; a hold is one note rather than repeated inputs',()=>{
 assert.throws(()=>chart({events:[{beat:4,error:[],steps:[]}]}),/1–1,600/);
 const map=chart(),run=new RhythmRun(map,bank);run.press(1,2);run.advance(4);assert.equal(run.summary().total,1);assert.equal(run.goodFixes,1);
});
