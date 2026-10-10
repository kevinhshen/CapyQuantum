// AudioContext is the master clock. Frame rate never sets the song tempo.
const composers = new Map();
export function registerComposer(id, composer) {
  if (typeof id !== 'string' || !id || typeof composer !== 'function' || composers.has(id)) throw new Error('Register a unique composer ID and a scheduling function.');
  composers.set(id, composer);
}
const midiHz = midi => 440 * 2 ** ((midi - 69) / 12);
registerComposer('garden-lofi', (tick, { tone, noise, section }) => {
  const beat = tick / 4, sixteenth = tick % 16, bar = Math.floor(beat / 4), root = [48, 45, 53, 43][bar % 4] + section.transpose;
  if (tick % 8 === 0) tone(95, .15, .15, 'sine', 38);
  if (tick % 16 === 4 || tick % 16 === 12) noise(.1, .045 * section.intensity, 1800);
  if (tick % (section.intensity > .8 ? 1 : 2) === 0) noise(.025, .012, 7000);
  if (tick % 4 === 0) tone(midiHz(root - 12 + [0, 0, 7, 0][Math.floor(sixteenth / 4)]), .28, .065, 'triangle');
  if (tick % 16 === 0) [0, 3, 7, 10].forEach(n => tone(midiHz(root + n), 1.6, .018, 'sine'));

});
export class MusicTransport {
  constructor() { this.context = null; this.nodes = new Set(); this.muted = false; this.loaded = null; this.timer = null; this.running = false; this.paused = false; }
  async init() {
    if (!this.context) {
      const Audio = window.AudioContext || window.webkitAudioContext;
      if (!Audio) throw new Error('Web Audio is unavailable. Use a current browser.');
      this.context = new Audio(); this.master = this.context.createGain(); this.master.connect(this.context.destination);
      this.noiseBuffer = this.context.createBuffer(1, this.context.sampleRate * .3, this.context.sampleRate);
      const data = this.noiseBuffer.getChannelData(0); for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    }
    await this.context.resume();
  }
  async loadFile(file) { await this.init(); this.loaded = await this.context.decodeAudioData(await file.arrayBuffer()); this.loadedName = file.name; }
  async start(map, useLoaded = false) {
    await this.init(); this.stop(); this.map = map; this.beatSeconds = 60 / map.bpm;
    this.leadIn = 4 * this.beatSeconds; this.origin = this.context.currentTime + .12;
    this.paused = false; this.running = true; this.master.gain.value = this.muted ? 0 : map.music.gain;
    this.tick = -16;
    let buffer = useLoaded ? this.loaded : null;
    if (map.music.url && !buffer) {
      const response = await fetch(map.music.url, { credentials: 'omit' });
      if (!response.ok) throw new Error('Could not load the map’s music.');
      buffer = await this.context.decodeAudioData(await response.arrayBuffer());
      // Fetch/decode happened before the actual countdown starts.
      this.origin = this.context.currentTime + .12;
    }
    if (!buffer && !composers.has(map.music.composer)) throw new Error(`Unknown composer: ${map.music.composer}`);
    if (buffer) {
      const offset = map.music.offsetSeconds;
      if (offset >= buffer.duration || buffer.duration - offset < map.durationBeats * this.beatSeconds) throw new Error('The audio file is shorter than this map after its offset.');
      const source = this.context.createBufferSource(); source.buffer = buffer; source.connect(this.master);
      source.start(this.origin + this.leadIn, offset); this.nodes.add(source); this.external = true;
    } else this.external = false;
    this.timer = setInterval(() => this.schedule(), 25); this.schedule();
  }
  time() { return this.context.currentTime - this.origin - this.leadIn; }
  schedule() {
    if (!this.running || this.paused) return;
    const limit = this.context.currentTime + .12;
    // A throttled timer resumes at the current tick, rather than playing a backlog.
    this.tick = Math.max(this.tick, Math.floor((this.context.currentTime - this.origin - this.leadIn) / (this.beatSeconds / 4)));
    while (this.origin + this.leadIn + this.tick * this.beatSeconds / 4 < limit) {
      const tick = this.tick++, at = this.origin + this.leadIn + tick * this.beatSeconds / 4;
      if (at < this.context.currentTime || tick > this.map.durationBeats * 4) continue;
      if (tick < 0) { if (tick % 4 === 0) this.tone(660, .055, .07, 'sine', null, at); continue; }
      if (this.external) continue;
      const beat = tick / 4, section = [...this.map.sections].reverse().find(s => s.beat <= beat) || this.map.sections[0];
      composers.get(this.map.music.composer)(tick, {
        map: this.map, section, context: this.context, at,
        tone: (freq, duration, gain, type = 'sine', endFrequency = null) => this.tone(freq, duration, gain, type, endFrequency, at),
        noise: (duration, gain, frequency) => this.noise(duration, gain, frequency, at),
      });
    }
  }
  tone(freq, duration, volume, type = 'sine', endFrequency = null, at = this.context.currentTime) {
    const c = this.context, osc = c.createOscillator(), gain = c.createGain();
    osc.type = type; osc.frequency.setValueAtTime(freq, at); if (endFrequency) osc.frequency.exponentialRampToValueAtTime(endFrequency, at + duration);
    gain.gain.setValueAtTime(.0001, at); gain.gain.linearRampToValueAtTime(volume, at + .008); gain.gain.exponentialRampToValueAtTime(.0001, at + duration);
    osc.connect(gain); gain.connect(this.master); osc.start(at); osc.stop(at + duration + .01);
    this.nodes.add(osc); osc.onended = () => this.nodes.delete(osc);
  }
  noise(duration, volume, frequency, at) {
    const source = this.context.createBufferSource(), filter = this.context.createBiquadFilter(), gain = this.context.createGain();
    source.buffer = this.noiseBuffer; filter.type = 'highpass'; filter.frequency.value = frequency;
    gain.gain.setValueAtTime(volume, at); gain.gain.exponentialRampToValueAtTime(.0001, at + duration);
    source.connect(filter); filter.connect(gain); gain.connect(this.master); source.start(at); source.stop(at + duration);
    this.nodes.add(source); source.onended = () => this.nodes.delete(source);
  }
  memory(restored, index) { if (!this.running || this.paused) return; const note = [72, 75, 79, 82, 79, 75, 74, 70][index % 8]; this.tone(midiHz(note + (restored ? 0 : 1)), .28, .045, restored ? 'triangle' : 'sawtooth'); }
  errorTone(lane) { if (this.context && !this.paused) this.tone(180 + lane * 15, .16, .03, 'sawtooth'); }
  hit(lane) { if (this.running && !this.paused) this.tone(midiHz([72, 74, 75, 79, 82, 84, 86][lane]), .16, .035, 'sine'); }
  setMuted(muted) { this.muted = muted; if (this.master) this.master.gain.value = muted ? 0 : this.map?.music.gain ?? .7; }
  async pause() { this.paused = true; if (this.context) await this.context.suspend(); }
  async resume() { if (this.context) await this.context.resume(); this.paused = false; }
  stop() { clearInterval(this.timer); this.running = false; for (const node of this.nodes) { try { node.stop(); } catch {} } this.nodes.clear(); }
}
