import test from 'node:test';
import assert from 'node:assert/strict';
import { SONG_LEVELS, LEVELS, parseTune } from '../songs.js';
import { getMap, listMaps } from '../maps.js';
import { RhythmRun } from '../rhythm.js';
import { MusicTransport } from '../audio.js';
import { beatToSeconds } from '../timing.js';
const bank = {sample:(e,d)=>Array.from({length:d-1},(_,i)=>(e>>i&1)^(e>>(i+1)&1)),fidelity:(e,a)=>e===a?1:0};

test('all ten songs validate, preserve melody pitches and recover at every lane count', () => {
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
      if(i){const prev=map.events[i-1],end=prev.beat+Math.max(0,...prev.steps.map(s=>s.offset+s.holdBeats));assert.ok(beatToSeconds(map,e.beat)-beatToSeconds(map,end)>=.3-1e-8);}
    }
    for(const n of run.notes){assert.equal(run.press(n.lane,n.at).correct,true);if(n.holding)run.release(n.heldLane,n.endAt);}
    run.advance(beatToSeconds(map,map.durationBeats)+1);
    assert.equal(run.summary().grade,'S');assert.equal(run.summary().restored,map.events.length);
    assert.equal(run.packets[0].note,map.events[0].note);assert.ok(run.packets[0].noteSeconds>0);
  }
  for(const id of ['morning-dew','lantern-waltz','firefly-rush'])assert.throws(()=>getMap(id),/Unknown map/);
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


test('ten-song campaign keeps musical timing and an expert finale at every lane count', () => {
  assert.deepEqual(listMaps().map(x=>x.id),LEVELS.map(x=>x.id));assert.equal(LEVELS.length,10);
  for(const id of ['cubed-loop','funked-up','oldskool-synth','mecha-march','chiptune-1234'])assert.throws(()=>getMap(id),/Unknown map/);
  for(const d of [3,4,5,6,7]) {
    let hasBurst=false,hasChord=false;
    for(const [i,song] of LEVELS.entries()) {
      const map=getMap(song.id,d),run=new RhythmRun(map,bank);
      assert.equal(map.level,i+1);assert.equal(map.qubits,d);assert.equal(map.music.chartSynchronized,true);
      hasBurst ||= map.events.some(e=>e.steps.length>1);hasChord ||= map.events.some(e=>e.steps.some(s=>s.lanes.length>1));
      assert.equal(map.music.url,undefined);assert.equal(map.songMode,true);
      for(const note of run.notes){assert.equal(run.press(note.lane,note.at).correct,true);if(note.holding)run.release(note.heldLane,note.endAt);}
      run.advance(beatToSeconds(map,map.durationBeats)+1);assert.equal(run.summary().grade,'S');assert.equal(run.summary().restored,map.events.length);
    }
    if(d>=5){assert.ok(hasBurst);assert.ok(hasChord);}
    const intro=new RhythmRun(getMap('row-boat',d),bank),finale=new RhythmRun(getMap('beethoven-fifth',d),bank);
    const introRate=intro.notes.length/beatToSeconds(intro.map,intro.map.durationBeats),finaleRate=finale.notes.length/beatToSeconds(finale.map,finale.map.durationBeats);
    assert.ok(finaleRate>introRate*3);assert.ok(finaleRate>2.2);
    if(d>=5)assert.ok(finale.packets.filter(p=>p.notes.length>1).length/finale.packets.length>.4);
    if(d===7)assert.ok(finale.packets.some(p=>p.notes.length===3));
  }
});

test('every cue head and sequence step coincides with a melody or audible percussion onset',()=>{
  for(const song of LEVELS) {
    const map=getMap(song.id,7),tune=parseTune(song.tune);
    for(const event of map.events) for(const step of event.steps) {
      const beat=event.beat+step.offset,local=beat%tune.length;
      const melody=tune.notes.find(n=>Math.abs(n.at-local)<1e-9);
      const pulse=Math.abs(beat*2-Math.round(beat*2))<1e-9;
      assert.ok(melody || pulse,`${song.id}: cue at ${beat} has no musical sound`);
      assert.ok(Math.abs(beat*4-Math.round(beat*4))<1e-9);
      if(event.anchor==='melody' && step.offset===0){assert.ok(melody);assert.equal(event.tuneBeat,beat);assert.equal(event.note,melody.midi);}
    }
  }
});

test('backing melody sounds exactly at chart onsets even when cues are owned or missed',()=>{
  for(const song of LEVELS) {
    const map=getMap(song.id,7),run=new RhythmRun(map,bank);
    for(const event of map.events.filter(e=>e.anchor==='melody')) {
      const expected=beatToSeconds(map,event.beat),audio=new MusicTransport(),calls=[];
      audio.context={currentTime:expected-.01};audio.map=map;audio.origin=0;audio.leadIn=0;
      audio.running=true;audio.external=false;audio.tick=Math.round(event.beat*4);
      audio.melody=[];audio.melodyIndex=0;audio.fillQueue=[];audio.fillIndex=0;
      audio.noise=()=>{};audio.tone=(...args)=>{calls.push(args);return{}};
      audio.schedule();
      assert.ok(calls.some(args=>Math.abs(args[0]-440*2**((event.note-69)/12))<1e-9 && Math.abs(args[5]-expected)<1e-9),`${song.id} at ${event.beat}`);
      assert.ok(run.cues.some(c=>Math.abs(c.at-expected)<1e-9));
    }
  }
});

test('every musical cue including percussion and sequence taps has a sound at its exact hit time',()=>{
  for(const song of LEVELS) {
    const map=getMap(song.id,7);
    for(const event of map.events) for(const step of event.steps) {
      const beat=event.beat+step.offset,expected=beatToSeconds(map,beat),audio=new MusicTransport(),sounds=[];
      audio.context={currentTime:expected-.01};audio.map=map;audio.origin=0;audio.leadIn=0;
      audio.running=true;audio.external=false;audio.tick=Math.round(beat*4);
      audio.melody=[];audio.melodyIndex=0;audio.fillQueue=[];audio.fillIndex=0;
      audio.noise=(_duration,_gain,_frequency,at)=>sounds.push(at);
      audio.tone=(...args)=>{sounds.push(args[5]);return{}};
      audio.schedule();assert.ok(sounds.some(at=>Math.abs(at-expected)<1e-9),`${song.id}: no sound at ${beat}`);
    }
  }
});

test('Symphony No. 5 retains dense musical cues, phrase breaks, and its faster finish',()=>{
  const map=getMap('beethoven-fifth',4),times=map.events.map(e=>beatToSeconds(map,e.beat));
  const gaps=times.slice(1).map((t,i)=>t-times[i]),mean=xs=>xs.reduce((a,b)=>a+b,0)/xs.length;
  assert.ok(mean(gaps.slice(-32))<mean(gaps.slice(0,32)));
  assert.ok(Math.min(...gaps)>=.3);assert.ok(map.events.length>=100);
  assert.ok(gaps.filter(g=>g<.37).length>gaps.length*.25);assert.ok(gaps.some(g=>g>.65));
});

test('visible/input clock tracks heard audio and freezes during pause',async()=>{
  const audio=new MusicTransport();audio.origin=1;audio.leadIn=2;
  audio.context={currentTime:10,async suspend(){},getOutputTimestamp:()=>({contextTime:9.9,performanceTime:performance.now()})};
  assert.ok(Math.abs(audio.time()-6.9)<.01);
  await audio.pause();const stopped=audio.time();audio.context.currentTime=11;assert.equal(audio.time(),stopped);
  audio.context.getOutputTimestamp=()=>({contextTime:0,performanceTime:0});audio.paused=false;assert.equal(audio.time(),8);
});
