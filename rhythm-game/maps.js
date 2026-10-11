import { LEVELS, parseTune } from './songs.js';
import { beatToSeconds } from './timing.js';
import { COUNTS, seeded, weight, syndrome, decode } from './model.js';

const mapRegistry = new Map();
export const laneKeys = d => ({ 3: ['D', 'F', 'J'], 4: ['D', 'F', 'J', 'K'], 5: ['D', 'F', 'SPACE', 'J', 'K'], 6: ['S', 'D', 'F', 'J', 'K', 'L'], 7: ['S', 'D', 'F', 'SPACE', 'J', 'K', 'L'] })[d];
export function maskOf(lanes) { return lanes.reduce((mask, lane) => mask ^ 1 << lane, 0); }
export function validateMap(input) {
  if (!input || typeof input !== 'object') throw new Error('A map must be an object.');
  const map = structuredClone(input);
  map.version ??= 1;
  if (map.version !== 1) throw new Error('Expected map version 1.');
  for (const field of ['id', 'title', 'artist']) if (typeof map[field] !== 'string' || !map[field].trim() || map[field].length > 100) throw new Error(`Map ${field} must be short text.`);
  if (!COUNTS.includes(map.qubits)) throw new Error('Choose 3–7 data qubits.');
  if (!Number.isFinite(map.bpm) || map.bpm < 40 || map.bpm > 220) throw new Error('Tempo must be 40–220 BPM.');
  map.tempoChanges ??= [];
  if (!Array.isArray(map.tempoChanges) || map.tempoChanges.length > 64) throw new Error('Invalid tempo changes.');
  let previousTempoBeat = 0;
  for (const change of map.tempoChanges) {
    if (!Number.isFinite(change.beat) || change.beat <= previousTempoBeat || change.beat >= map.durationBeats || !Number.isFinite(change.bpm) || change.bpm < 40 || change.bpm > 220) throw new Error('Tempo changes must have increasing beats and 40–220 BPM.');
    previousTempoBeat = change.beat;
  }
  if (!Number.isFinite(map.durationBeats) || map.durationBeats < 8 || beatToSeconds(map, map.durationBeats) > 300) throw new Error('Maps must be between eight beats and five minutes.');
  if (!Array.isArray(map.events) || !map.events.length || map.events.length > 800) throw new Error('Provide 1–800 correction packets.');
  const ids = new Set(), occupied = new Map();
  const validLanes = lanes => Array.isArray(lanes) && new Set(lanes).size === lanes.length && lanes.every(q => Number.isInteger(q) && q >= 0 && q < map.qubits);
  map.events.forEach((event, index) => {
    event.id ??= `packet-${index}`;
    if (typeof event.id !== 'string' || ids.has(event.id) || event.id.length > 100) throw new Error('Packet IDs must be unique short strings.'); ids.add(event.id);
    if (!Number.isFinite(event.beat) || event.beat < 0 || event.beat >= map.durationBeats) throw new Error(`Invalid beat in ${event.id}.`);
    if (!validLanes(event.error)) throw new Error(`Invalid error lanes in ${event.id}.`);
    const error = maskOf(event.error), cap = Math.floor((map.qubits - 1) / 2);
    if (weight(error) > cap || decode(syndrome(error, map.qubits)) !== error) throw new Error(`${event.id} exceeds the ${cap}-flip guarantee of this code.`);
    event.steps ??= event.error.length ? [{ offset: 0, lanes: event.error }] : [];
    if (!Array.isArray(event.steps) || event.steps.length > map.qubits) throw new Error('Invalid correction sequence.');
    let recovery = 0, previous = -1; const used = new Set();
    event.steps.forEach(step => {
      step.holdBeats ??= 0;
      if (!Number.isFinite(step.holdBeats) || step.holdBeats < 0 || step.holdBeats > 8 || (step.holdBeats > 0 && step.holdBeats < .5)) throw new Error('Hold duration must be zero (tap) or 0.5–8 beats.');
      if (!Number.isFinite(step.offset) || step.offset < 0 || step.offset > 2 || step.offset <= previous || !validLanes(step.lanes) || !step.lanes.length) throw new Error(`Invalid steps in ${event.id}.`);
      previous = step.offset;
      if (event.beat + step.offset + step.holdBeats > map.durationBeats) throw new Error('Correction notes or hold tails extend past the song.');
      if (step.lanes.some(lane => used.has(lane) || !event.error.includes(lane))) throw new Error('Author correction slots for each faulty lane exactly once.');
      step.lanes.forEach(lane => used.add(lane));
      recovery ^= maskOf(step.lanes);
      for (const lane of step.lanes) {
        const at = beatToSeconds(map, event.beat + step.offset);
        const end = beatToSeconds(map, event.beat + step.offset + step.holdBeats);
        if (step.holdBeats && end - at < .3) throw new Error('Holds need at least 300 ms of duration.');
        const times = occupied.get(lane) || [];
        if (times.some(t => at < t.end + .085 && end > t.at - .085)) throw new Error('Notes on the same lane need at least 85 ms separation, including hold tails.');
        times.push({at, end}); occupied.set(lane, times);
      }
    });
    if (recovery !== error) throw new Error(`The authored solution for ${event.id} does not repair its error.`);
  });
  map.events.sort((a, b) => a.beat - b.beat);
  for (let i = 1; i < map.events.length; i++) {
    const previous = map.events[i - 1], next = map.events[i];
    const end = previous.beat + Math.max(0, ...previous.steps.map(step => step.offset + step.holdBeats));
    if (beatToSeconds(map, next.beat) - beatToSeconds(map, end) < .3) throw new Error('Separate memory packets need 300 ms between correction windows. Combine simultaneous corrections into a chord.');
  }
  const noteCount = map.events.reduce((n, e) => n + e.steps.reduce((s, step) => s + step.lanes.length, 0), 0);
  if (noteCount < 1 || noteCount > 1600) throw new Error('A level needs 1–1,600 correction notes.');
  map.sections ??= [{ beat: 0, label: 'Intro', intensity: .6, transpose: 0 }];
  if (!Array.isArray(map.sections) || !map.sections.length || map.sections.length > 64) throw new Error('Provide 1–64 music sections.');
  map.sections.forEach(section => {
    if (!Number.isFinite(section.beat) || section.beat < 0 || section.beat > map.durationBeats || typeof section.label !== 'string' || section.label.length > 100) throw new Error('Invalid music section.');
    section.intensity ??= .7; section.transpose ??= 0;
    if (!Number.isFinite(section.intensity) || section.intensity < 0 || section.intensity > 1 || !Number.isInteger(section.transpose) || Math.abs(section.transpose) > 24) throw new Error('Invalid section intensity or transposition.');
  });
  map.sections.sort((a, b) => a.beat - b.beat);
  if (map.sections[0].beat !== 0) throw new Error('The first section must start on beat zero.');
  map.music ??= { composer: 'garden-lofi', offsetSeconds: 0, gain: .7 };
  if (typeof map.music !== 'object' || Array.isArray(map.music)) throw new Error('Music must be an object.');
  map.music.offsetSeconds ??= 0; map.music.gain ??= .7;
  if (!Number.isFinite(map.music.offsetSeconds) || map.music.offsetSeconds < 0 || !Number.isFinite(map.music.gain) || map.music.gain < 0 || map.music.gain > 1) throw new Error('Invalid music offset or gain.');
  if (map.music.url && (typeof map.music.url !== 'string' || /^(?!https?:|data:audio\/)[a-z][a-z0-9+.-]*:/i.test(map.music.url) || typeof map.music.credit !== 'string')) throw new Error('Music needs a relative/HTTP/audio-data URL and a credit.');
  if (!map.music.url && (typeof map.music.composer !== 'string' || map.music.composer.length > 80)) throw new Error('Specify a music composer ID.');
  return map;
}
export function registerMap(map) {
  const checked = validateMap(map);
  if (mapRegistry.has(checked.id)) throw new Error(`A map named ${checked.id} already exists.`);
  mapRegistry.set(checked.id, { title: checked.title, artist: checked.artist, fixed: checked });
  return checked.id;
}
export function listMaps() { return [...mapRegistry].map(([id, entry]) => ({ id, title: entry.title, artist: entry.artist, qubits: entry.fixed?.qubits ?? null })); }
export function getMap(id, d = 3) {
  const entry = mapRegistry.get(id); if (!entry) throw new Error('Unknown map.');
  return entry.fixed ? structuredClone(entry.fixed) : validateMap(entry.build(d));
}
// Charts are authored in musical beats. Seconds only validate safety; they never
// invent a cue time or move it away from the soundtrack.
function songMap(level, number, d) {
  const timeline = { bpm: level.bpm, tempoChanges: level.tempoChanges ?? [] };
  const tune = parseTune(level.tune), candidates = new Map();
  for (let loop = 0; loop * tune.length < level.beats; loop++) for (const note of tune.notes) {
    const beat = loop * tune.length + note.at;
    if (beat >= 4 && beat < level.beats - 2) candidates.set(beat, { beat, note, anchor: 'melody' });
  }
  // Later charts also use the audible kick/hi-hat pulse. Melody cues take
  // precedence when both instruments sound at exactly the same beat.
  if (number >= 6) for (let beat = 4; beat < level.beats - 2; beat += number >= 9 ? .5 : 1) {
    if (!candidates.has(beat)) candidates.set(beat, { beat, anchor: 'pulse' });
  }
  const sections = level.sections ?? [{ beat: 0, label: 'Intro', intensity: .45, transpose: 0 }, { beat: 16, label: 'Verse', intensity: .7, transpose: 0 }, { beat: 32, label: 'Chorus', intensity: 1, transpose: 0 }, { beat: level.beats - 12, label: 'Outro', intensity: .65, transpose: 0 }];
  const minimumBeats = [2.5, 2, 2, 1.25, 1, 1, .75, .5, .5, .25][number - 1];
  const multiEvery = number < 5 ? Infinity : [8, 6, 5, 4, 3, 2][number - 5];
  const random = seeded(20261011 + number * 101 + d), capacity = Math.floor((d - 1) / 2);
  const attacks = [...candidates.values()].sort((a,b)=>a.beat-b.beat);
  const slots = []; let lastBeat = -Infinity;
  for (const candidate of attacks) {
    // Phrase boundaries retain occasional breaths. Keep the finale's last
    // section dense; no seconds-based interpolation or nearest-note fallback.
    const phrase = Math.floor(candidate.beat / (level.beatsPerBar ?? 4));
    const rest = number >= 6 && !(number === 10 && candidate.beat >= 96) && phrase % 4 === 3 && candidate.beat % (level.beatsPerBar ?? 4) >= (level.beatsPerBar ?? 4) - 1;
    if (rest || candidate.beat - lastBeat < minimumBeats - 1e-9) continue;
    if (slots.length && beatToSeconds(timeline, candidate.beat) - beatToSeconds(timeline, lastBeat) < .301) continue;
    slots.push(candidate); lastBeat = candidate.beat;
  }
  const events = slots.map((slot, i) => {
    const flips = i % multiEvery === multiEvery - 1 ? Math.min(capacity, number >= 9 ? 3 : 2) : 1;
    const lanes = []; while (lanes.length < flips) { const lane = Math.floor(random() * d); if (!lanes.includes(lane)) lanes.push(lane); }
    const nextBeat = slots[i+1]?.beat ?? level.beats;
    const at = beatToSeconds(timeline, slot.beat), nextAt = beatToSeconds(timeline, nextBeat);
    // Sequence taps must also coincide with actual musical sounds, never a
    // constant 160 ms offset. Only use a sequence when room remains afterwards.
    const sequence = []; let sequenceAt = at;
    for (const candidate of lanes.length > 1 ? attacks : []) {
      const candidateAt = beatToSeconds(timeline,candidate.beat);
      if (candidate.beat > slot.beat && candidate.beat-slot.beat <= 2 && candidate.beat < nextBeat && candidateAt-sequenceAt >= .085 && nextAt-candidateAt >= .301) {
        sequence.push(candidate); sequenceAt=candidateAt;
        if (sequence.length === lanes.length-1) break;
      }
    }
    const burst = number >= 6 && lanes.length > 1 && Math.floor(i/multiEvery)%2 === 1 && sequence.length === lanes.length-1;
    let holdBeats = 0;
    if (lanes.length === 1 && slot.note?.dur >= 1 && i % 8 === 3) {
      // Quarter-beat sustain tails share the music grid and stay inside the note.
      for (let length = Math.min(2,slot.note.dur); length >= .5; length -= .25) {
        const tail = beatToSeconds(timeline,slot.beat+length);
        if (tail-at >= .3 && nextAt-tail >= .301) { holdBeats=length; break; }
      }
    }
    const steps = burst ? lanes.map((lane,j)=>({offset:j ? sequence[j-1].beat-slot.beat : 0,lanes:[lane]})) : [{offset:0,lanes,holdBeats}];
    const transpose = [...sections].reverse().find(section=>section.beat<=slot.beat).transpose;
    const midi = (slot.note?.midi ?? level.bass[Math.floor(slot.beat/level.bassBeats)%level.bass.length]) + transpose;
    const wrongNote = [1,-1,6,-2,2].map(k=>midi+k).find(m=>!tune.notes.some(n=>(n.midi+transpose)%12===m%12)) ?? midi+1;
    return {id:`p${i}`,beat:slot.beat,error:lanes,steps,note:midi,wrongNote,noteBeats:slot.note?.dur??.5,
      anchor:slot.anchor,...(slot.note ? {tuneBeat:slot.beat} : {})};
  });
  const challenge = number === 10 ? 'Expert finale: follow the fate motif and accelerating beat. Wider lanes add frequent multi-flip chords.' : number < 5 ? 'Follow the melody, with room to read the checks.' : number < 8 ? 'Follow melody phrases and beat accents; wider lanes add chords.' : 'Dense melody and offbeat accents, with brief phrase breaks.';
  return {version:1,id:level.id,title:level.title,artist:level.artist,level:number,
    description:`Level ${number} · ${challenge}`,bpm:level.bpm,qubits:d,durationBeats:level.beats,
    tempoChanges:timeline.tempoChanges,events,sections,songMode:true,
    music:{composer:`song-${level.id}`,gain:.72,offsetSeconds:0,chartSynchronized:true}};
}
for (const [i, level] of LEVELS.entries()) mapRegistry.set(level.id, {
  title:level.title,artist:level.artist,build:d=>songMap(level,i+1,d)
});
