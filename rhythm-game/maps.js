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
  if (!Number.isFinite(map.durationBeats) || map.durationBeats < 8 || map.durationBeats * 60 / map.bpm > 300) throw new Error('Maps must be between eight beats and five minutes.');
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
      if (!Number.isFinite(step.offset) || step.offset < 0 || step.offset > 2 || step.offset <= previous || !validLanes(step.lanes) || !step.lanes.length) throw new Error(`Invalid steps in ${event.id}.`);
      previous = step.offset;
      if (event.beat + step.offset > map.durationBeats) throw new Error('Correction notes extend past the song.');
      if (step.lanes.some(lane => used.has(lane) || !event.error.includes(lane))) throw new Error('Author correction slots for each faulty lane exactly once.');
      step.lanes.forEach(lane => used.add(lane));
      recovery ^= maskOf(step.lanes);
      for (const lane of step.lanes) {
        const at = (event.beat + step.offset) * 60 / map.bpm;
        const times = occupied.get(lane) || [];
        if (times.some(t => Math.abs(t - at) < .085)) throw new Error('Notes on the same lane need at least 85 ms separation.');
        times.push(at); occupied.set(lane, times);
      }
    });
    if (recovery !== error) throw new Error(`The authored solution for ${event.id} does not repair its error.`);
  });
  map.events.sort((a, b) => a.beat - b.beat);
  if (map.events.reduce((n, e) => n + e.steps.reduce((s, step) => s + step.lanes.length, 0), 0) > 1600) throw new Error('Map has too many notes.');
  map.sections ??= [{ beat: 0, label: 'First light', intensity: .6, transpose: 0 }];
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
function gardenMap(id, title, bpm, duration, density, d) {
  const random = seeded(20261010 + d + bpm), capacity = Math.floor((d - 1) / 2), events = [];
  const stride = density === 'fast' ? 1 : 2;
  for (let beat = 4, index = 0; beat < duration - 2; beat += stride, index++) {
    const count = index % 11 === 8 ? 0 : index > 3 && index % 4 === 3 ? capacity : 1;
    const lanes = [];
    while (lanes.length < count) { const lane = Math.floor(random() * d); if (!lanes.includes(lane)) lanes.push(lane); }
    const burst = lanes.length > 1 && index % 3 !== 0;
    events.push({ id: `p${index}`, beat, error: lanes, steps: burst ? lanes.map((lane, i) => ({ offset: i * .25, lanes: [lane] })) : lanes.length ? [{ offset: 0, lanes }] : [] });
  }
  return { version: 1, id, title, artist: 'CapyQuantum · original synthesized music', bpm, qubits: d, durationBeats: duration,
    events, sections: [{ beat: 0, label: 'First light', intensity: .45, transpose: 0 }, { beat: 16, label: 'The garden wakes', intensity: .7, transpose: 0 }, { beat: 32, label: 'Lantern bloom', intensity: 1, transpose: 5 }, { beat: duration - 12, label: 'Homeward', intensity: .65, transpose: 0 }],
    music: { composer: 'garden-lofi', gain: .72, offsetSeconds: 0 } };
}
for (const [id, title, bpm, duration, density] of [
  ['morning-dew', 'Morning dew', 86, 56, 'gentle'],
  ['lantern-waltz', 'Lantern glow', 112, 80, 'steady'],
  ['firefly-rush', 'Firefly rush', 138, 96, 'fast'],
]) mapRegistry.set(id, { title, artist: 'CapyQuantum', build: d => gardenMap(id, title, bpm, duration, density, d) });
