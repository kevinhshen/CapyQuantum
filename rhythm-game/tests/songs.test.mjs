import test from 'node:test';
import assert from 'node:assert/strict';
import { SONG_LEVELS, parseTune } from '../songs.js';
import { getMap, listMaps } from '../maps.js';
import { RhythmRun } from '../rhythm.js';
import { MusicTransport } from '../audio.js';
import { beatToSeconds } from '../timing.js';
const bank = {sample:(e,d)=>Array.from({length:d-1},(_,i)=>(e>>i&1)^(e>>(i+1)&1)),fidelity:(e,a)=>e===a?1:0};

test('all ten songs validate, preserve melody ownership and recover at every lane count', () => {
  assert.equal(SONG_LEVELS.length,10);
  assert.deepEqual(listMaps().slice(0,10).map(x=>x.id),SONG_LEVELS.map(x=>x.id));
  for (const song of SONG_LEVELS) for (const d of [3,4,5,6,7]) {
    const map=getMap(song.id,d), tune=parseTune(song.tune), run=new RhythmRun(map,bank), owned=new Set();
    assert.deepEqual(map,getMap(song.id,d));
    assert.ok(map.events.length>10);
    for (const [i,e] of map.events.entries()) {
      assert.ok(Number.isInteger(e.note) && Number.isInteger(e.wrongNote));
      assert.notEqual(e.note,e.wrongNote);
      if(e.tuneBeat!=null){assert.equal(e.beat,e.tuneBeat);assert.ok(!owned.has(e.tuneBeat));owned.add(e.tuneBeat);assert.ok(tune.notes.some(n=>Math.abs(n.at-e.tuneBeat%tune.length)<1e-9 && n.midi===e.note));}
      if(i){const prev=map.events[i-1],end=prev.beat+Math.max(0,...prev.steps.map(s=>s.offset+s.holdBeats));assert.ok(beatToSeconds(map,e.beat)-beatToSeconds(map,end)>=.9-1e-8);}
    }
    for(const n of run.notes){assert.equal(run.press(n.lane,n.at).correct,true);if(n.holding)run.release(n.heldLane,n.endAt);}
    run.advance(beatToSeconds(map,map.durationBeats)+1);
    assert.equal(run.summary().grade,'S');assert.equal(run.summary().restored,map.events.length);
    assert.equal(run.packets[0].note,map.events[0].note);assert.ok(run.packets[0].noteSeconds>0);
  }
  for(const id of ['morning-dew','lantern-waltz','firefly-rush'])assert.ok(getMap(id).events.length);
});

test('backing fills follow the changing tempo, happen once, and cancel when a player claims a note', () => {
  const map=getMap('beethoven-fifth'), audio=new MusicTransport(), calls=[];
  audio.context={currentTime:beatToSeconds(map,65)-.1};audio.map=map;audio.origin=0;audio.leadIn=0;
  audio.running=true;audio.external=false;audio.tick=260;audio.melody=[];audio.melodyIndex=0;
  audio.noise=()=>{};
  audio.tone=(...args)=>{const voice={osc:{stop:at=>calls.push({stop:at})},gain:{disconnect:()=>calls.push({disconnect:true})}};calls.push({args,voice});return voice;};
  audio.fillQueue=[{id:'auto',beat:65,midi:60,seconds:.4,gain:.07},{id:'claimed',beat:66,midi:62,seconds:.4,gain:.07}];
  audio.claimFill('claimed');audio.schedule();
  const fills=calls.filter(x=>x.args?.[0]===440*2**((60-69)/12));assert.equal(fills.length,1);assert.equal(fills[0].args[5],beatToSeconds(map,65));
  assert.equal(audio.bandCovered('auto'),true);audio.schedule();assert.equal(calls.filter(x=>x.args?.[0]===fills[0].args[0]).length,1);
  audio.claimFill('auto');assert.equal(audio.bandCovered('auto'),false);assert.ok(calls.some(x=>x.stop===audio.context.currentTime));
  audio.context.currentTime=beatToSeconds(map,66)-.1;audio.schedule();assert.equal(audio.bandCovered('claimed'),false);
});

test('melody and wrong-note feedback honor separate volumes, mute, pause and recorded tracks', () => {
  const audio=new MusicTransport(),calls=[];audio.context={currentTime:0};audio.musicBus={};audio.effectsBus={};audio.tone=(...args)=>calls.push(args);
  audio.effectsVolume=0;audio.songNote(60,.5,true);audio.songNote(61,.5,false);assert.equal(calls.length,2);
  audio.effectsVolume=.5;audio.musicVolume=0;audio.songNote(60,.5,true);audio.songNote(61,.5,false);assert.equal(calls.length,3);assert.equal(calls[2][6],audio.effectsBus);
  for(const flag of ['paused','muted','external']){audio[flag]=true;audio.songNote(60,.5,true);audio.songNote(61,.5,false);audio[flag]=false;assert.equal(calls.length,3);}
});
