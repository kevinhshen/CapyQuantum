import test from 'node:test';
import assert from 'node:assert/strict';
import { MusicTransport } from '../audio.js';
import { RhythmRun } from '../rhythm.js';
import { validateMap } from '../maps.js';

const bank = {sample: (error, d) => Array.from({length:d-1}, (_, i) => (error >> i & 1) ^ (error >> (i+1) & 1)), fidelity: (error, applied) => error === applied ? 1 : 0};
const chart = () => validateMap({id:'feedback',title:'Feedback',artist:'Team',qubits:5,bpm:120,durationBeats:12,events:[{beat:1,error:[0,3],steps:[{offset:0,lanes:[0,3]}]},{beat:3,error:[1],steps:[{offset:0,lanes:[1],holdBeats:1}]}]});

test('miss and sustain feedback occurs once without adding correction operations', () => {
  const run = new RhythmRun(chart(), bank);
  run.advance(.7); assert.equal(run.feedbackEvents.filter(e => e.type === 'note-miss').length, 2);
  run.feedbackEvents.length = 0; run.advance(.8); assert.equal(run.feedbackEvents.length, 0);
  run.press(1, 1.5); run.release(1, 1.6);
  assert.equal(run.feedbackEvents[0].type, 'hold-break');
  assert.equal(run.packets[1].applied, 2); assert.equal(run.goodFixes, 1);
  run.feedbackEvents.length = 0; run.advance(4); assert.equal(run.feedbackEvents.length, 0);
  assert.equal(run.summary().restored, 1); assert.equal(run.summary().holdsBroken, 1);
});

const parameter = () => ({ value: 0, setTargetAtTime(value) {this.value = value;}, setValueAtTime(value) {this.value = value;}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} });
class FakeAudio {
  constructor() { this.currentTime = 0; this.sampleRate = 1000; this.destination = {}; this.oscillators = []; this.sources = []; }
  async resume() {}
  createGain() { return {gain: parameter(), connect(to) {this.to = to;}, disconnect() {this.disconnected = true;}}; }
  createBuffer(_channels, length, _sampleRate) { const data = new Float32Array(length); return {getChannelData: () => data}; }
  createBufferSource() { const source = {connect(to) {this.to = to;}, start() {}, stop() {}, disconnect() {this.disconnected = true;}}; this.sources.push(source); return source; }
  createOscillator() { const source = this.createBufferSource(); source.frequency = parameter(); this.oscillators.push(source); return source; }
}

test('recorded music has unpitched hits and no recovery melody; effects routing stays independent', async () => {
  const original = globalThis.window; globalThis.window = {AudioContext: FakeAudio};
  try {
    const music = new MusicTransport(); await music.init(); music.external = true; music.running = true;
    music.hit(2); music.errorTone(); music.memory(true, 0); music.memory(false, 1);
    assert.equal(music.context.oscillators.length, 0);
    assert.equal(music.context.sources.length, 2);
    assert.ok(music.context.sources.every(source => source.to === music.effectsBus));
    assert.equal(music.context.sources[0].buffer, music.tapBuffers[0]);
    const source = music.context.sources[0]; source.onended(); assert.equal(source.disconnected, true);
    music.setVolumes(.7, 0); music.hit(2); music.errorTone(); assert.equal(music.context.sources.length, 2);
    assert.equal(music.effectsBus.gain.value, 0); assert.ok(music.musicBus.gain.value > 0);
    music.setVolumes(0, .8); assert.equal(music.musicBus.gain.value, 0); assert.equal(music.effectsBus.gain.value, .8);
    music.setMuted(true); assert.equal(music.master.gain.value, 0); music.hit(2); assert.equal(music.context.sources.length, 2);
    music.setMuted(false); assert.equal(music.master.gain.value, 1); assert.equal(music.musicVolume, 0); assert.equal(music.effectsVolume, .8);
    music.external = false; music.hit(2); assert.equal(music.context.oscillators.length, 1);
    music.paused = true; music.hit(2); music.errorTone(); assert.equal(music.context.oscillators.length, 1);
  } finally { globalThis.window = original; }
});


test('synchronized songs keep early/late/wrong input feedback out of the backing melody', async()=>{
  const original=globalThis.window;globalThis.window={AudioContext:FakeAudio};
  try {
    const music=new MusicTransport();await music.init();music.running=true;music.map={music:{chartSynchronized:true}};
    for(const time of [.9,1.0,1.1]){music.context.currentTime=time;music.songNote(60,.5,true);music.songNote(61,.5,false);music.hit(1);music.memory(false,0);}
    assert.equal(music.context.oscillators.length,0);
    assert.equal(music.context.sources.length,9);
    assert.ok(music.context.sources.every(source=>source.to===music.effectsBus));
    music.running=false;music.songNote(60,.5,true);assert.equal(music.context.oscillators.length,2);
  } finally {globalThis.window=original;}
});
