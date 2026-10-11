import test from 'node:test';
import assert from 'node:assert/strict';
import { beatToSeconds, secondsToBeat } from '../timing.js';
import { getMap, validateMap } from '../maps.js';
import { RhythmRun } from '../rhythm.js';
import { MusicTransport, registerComposer } from '../audio.js';
const authored = () => ({id:'tempo-test',title:'Tempo test',artist:'Team',qubits:4,bpm:120,durationBeats:16,tempoChanges:[{beat:8,bpm:60}],events:[{beat:4,error:[1]},{beat:8.5,error:[2]},{beat:10,error:[3]}]});
const bank = {sample: (e,d)=>Array.from({length:d-1},(_,i)=>(e>>i&1)^(e>>(i+1)&1)),fidelity:(e,f)=>e===f?1:0};
test('tempo changes roundtrip beats, fractional beats, boundaries and countdown',()=>{
 const map=validateMap(authored());
 assert.equal(beatToSeconds(map,8),4);assert.equal(beatToSeconds(map,8.5),4.5);assert.equal(beatToSeconds(map,16),12);
 for(const beat of [-4,0,7.999,8,8.5,12,16]) assert.ok(Math.abs(secondsToBeat(map,beatToSeconds(map,beat))-beat)<1e-12);
 const run=new RhythmRun(map,bank);assert.deepEqual(run.notes.map(n=>n.at),[2,4.5,6]);
 for(const note of run.notes) assert.equal(run.press(note.lane,note.at).timing,'Perfect');
 run.advance(13);assert.equal(run.summary().restored,3);
});
test('invalid tempo maps and overlapping packet windows are rejected',()=>{
 for(const changes of [[{beat:8,bpm:0}],[{beat:8,bpm:120},{beat:7,bpm:90}],[{beat:0,bpm:120}],[{beat:17,bpm:120}]]) assert.throws(()=>validateMap({...authored(),tempoChanges:changes}));
 assert.throws(()=>validateMap({...authored(),events:[{beat:4,error:[0]},{beat:4.1,error:[1]}]}),/300 ms/);
 assert.throws(()=>validateMap({...authored(),durationBeats:400}),/five minutes/);
});
test('all built-in maps have varied timing, reproducible phrases and perfect recoveries at every lane count',()=>{
 for(const id of ['twinkle','ode-to-joy','canon-in-d']) for(const d of [3,4,5,6,7]) {
  const map=getMap(id,d),run=new RhythmRun(map,bank);
  const gaps=new Set(map.events.slice(1).map((e,i)=>e.beat-map.events[i].beat));assert.ok(gaps.size>=2);
  for(const n of run.notes) assert.equal(run.press(n.lane,n.at).correct,true);
  run.advance(beatToSeconds(map,map.durationBeats)+1);assert.equal(run.summary().grade,'S');assert.equal(run.summary().restored,map.events.length);
 }
});
test('audio scheduler uses tempo timeline and schedules authored offbeat melody',()=>{
 const calls=[];registerComposer('timing-test',(tick,{at})=>calls.push({tick,at}));
 const map=validateMap({...authored(),music:{composer:'timing-test',gain:.7}});
 const audio=new MusicTransport();audio.context={currentTime:4.39};audio.map=map;audio.origin=0;audio.leadIn=0;audio.tick=0;audio.running=true;audio.paused=false;audio.external=false;
 audio.melody=[{beat:8.5,lane:2}];audio.melodyIndex=0;const tones=[];audio.tone=(...args)=>tones.push(args);
 audio.schedule();assert.equal(calls.find(c=>c.tick===34).at,4.5);assert.equal(tones[0].at(-1),4.5);assert.equal(audio.melodyIndex,1);
 audio.schedule();assert.equal(tones.length,1);
});
