import { LEVELS, parseTune } from './songs.js';
import { beatToSeconds, secondsToBeat } from './timing.js';
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
// Minimum real-time breathing room between memory packets, how far apart the taps of a burst fall, how
// often a multi-flip packet appears, and how many flips it may carry. Faster songs get more room, not less.
const PACING = {
  gentle:  { gap: 1.0,  burst: .5,  multiEvery: 4, maxFlips: 3 },
  steady:  { gap: .95,  burst: .5,  multiEvery: 4, maxFlips: 3 },
  fast:    { gap: 1.05, burst: .55, multiEvery: 6, maxFlips: 2 },
  driving: { gap: 1.0,  burst: .55, multiEvery: 6, maxFlips: 2 },
};
function songMap(id, title, bpm, duration, density, d, extra = {}) {
  const random = seeded(20261010 + d + bpm), capacity = Math.floor((d - 1) / 2), events = [];
  // The tune plays across the whole level. Every falling packet is snapped onto one note of it and "owns" that note:
  // fixing the packet plays the note, a wrong flip plays an out-of-key note. Notes no packet owns are played by the backing track,
  // so the melody never stops.
  const tune = extra.tune ? parseTune(extra.tune) : null, onsets = [];
  const sections = extra.sections ?? [{ beat: 0, label: 'Intro', intensity: .45, transpose: 0 }, { beat: 16, label: 'Verse', intensity: .7, transpose: 0 }, { beat: 32, label: 'Chorus', intensity: 1, transpose: 0 }, { beat: duration - 12, label: 'Outro', intensity: .65, transpose: 0 }];
  if (tune) for (let loop = 0; loop * tune.length < duration; loop++) for (const n of tune.notes) if (loop * tune.length + n.at < duration) onsets.push({ at: loop * tune.length + n.at, n, taken: false });
  // Pacing is set in real seconds, not beats, so a fast tempo (or a tempo climb) never crowds the player.
  // A packet is only placed once the previous one has been finished for `gapSeconds`; phrase hits that
  // land too soon are skipped, and the backing track plays their melody notes instead.
  const timeline = { bpm, tempoChanges: extra.tempoChanges ?? [] }, pace = PACING[density] ?? PACING.steady;
  // The same spacing at every qubit count keeps the packet pattern comparable between 3 and 7 qubits.
  // A small tolerance stops a gap that lands exactly on a beat from flipping between "kept" and "skipped".
  const maxFlips = Math.min(capacity, pace.maxFlips), burstBeats = Math.min(1, Math.max(.5, Math.ceil(pace.burst * bpm / 60 * 4) / 4));
  const floorBeat = () => secondsToBeat(timeline, beatToSeconds(timeline, lastEnd) + pace.gap - .04);
  const claimNote = (beat, floor) => {
    let best = null;
    for (const o of onsets) if (!o.taken && o.at >= floor && o.at <= duration - 3 && Math.abs(o.at - beat) <= 1.25 && (!best || Math.abs(o.at - beat) < best.dist)) best = { o, dist: Math.abs(o.at - beat), snapped: true };
    if (best) best.o.taken = true;
    // No free note close enough: double the nearest melody note instead; the backing track keeps playing it.
    else for (const o of onsets) if (!best || Math.abs(o.at - beat) < best.dist) best = { o, dist: Math.abs(o.at - beat), snapped: false };
    return best;
  };
  const songFields = (o, owns) => {
    const transpose = ([...sections].reverse().find(x => x.beat <= o.at) || sections[0]).transpose, midi = o.n.midi + transpose;
    const key = new Set(tune.notes.map(x => (x.midi + transpose) % 12));
    return { note: midi, noteBeats: o.n.dur, ...(owns ? { tuneBeat: o.at } : {}), wrongNote: [1, -1, 6, -2, 2].map(k => midi + k).find(m => !key.has(m % 12)) ?? midi + 1 };
  };
  let lastEnd = 0;
  // Authored phrases repeat every eight beats; rests and syncopation vary by section.
  const phrases = density === 'gentle' ? [[0, 2, 3.5, 6], [0, 1.5, 4, 6.5]]
    : density === 'steady' ? [[0, 1, 2.5, 4, 6, 7], [0, 1.5, 3, 4.5, 6, 7]]
    // 'driving' never gaps under one beat, so 150+ BPM songs still leave 300 ms between correction windows.
    : density === 'driving' ? [[0, 1, 2, 3.5, 4.5, 5.5, 6.5], [0, 1, 2.5, 3.5, 4.5, 5.5, 7]]
    : [[0, .75, 1.5, 3, 4, 4.75, 6, 7], [0, 1, 1.75, 3, 4.5, 5.25, 6, 7]];
  let index = 0;
  for (let bar = 4; bar < duration - 2; bar += 8) {
    const phrase = phrases[Math.floor((bar - 4) / 8) % phrases.length];
    for (let i = 0; i < phrase.length; i++, index++) {
      let beat = bar + phrase[i]; if (beat >= duration - 2) break;
      const gap = (phrase[i + 1] ?? 8) - phrase[i];
      const count = index % 11 === 8 ? 0 : index > 3 && index % pace.multiEvery === pace.multiEvery - 1 ? maxFlips : 1;
      const lanes = [];
      while (lanes.length < count) { const lane = Math.floor(random() * d); if (!lanes.includes(lane)) lanes.push(lane); }
      const burst = lanes.length > 1 && index % 3 !== 0 && gap >= 1.5 && density !== 'driving';
      const holdBeats = lanes.length === 1 && index % 8 === 2 && gap >= 1.5 && density !== 'driving' ? Math.min(1, gap - .75) : 0;
      const claim = tune ? claimNote(beat, floorBeat()) : null;
      if (claim?.snapped) beat = claim.o.at;
      if (beat < floorBeat() - 1e-9) { if (claim?.snapped) claim.o.taken = false; continue; }
      if (beat >= duration - 3) { if (claim?.snapped) claim.o.taken = false; break; }
      const steps = burst ? lanes.map((lane, i) => ({ offset: i * burstBeats, lanes: [lane] })) : lanes.length ? [{ offset: 0, lanes, holdBeats }] : [];
      events.push({ id: `p${index}`, beat, error: lanes, ...(claim ? songFields(claim.o, claim.snapped) : {}), steps });
      lastEnd = beat + Math.max(0, ...steps.map(st => st.offset + (st.holdBeats || 0)));
    }
  }
  return { version: 1, id, title, artist: extra.artist ?? 'CapyQuantum · original synthesized music', description: extra.description, bpm, qubits: d, durationBeats: duration,
    tempoChanges: extra.tempoChanges ?? [],
    events, sections, songMode: Boolean(tune),
    music: { composer: `song-${id}`, gain: .72, offsetSeconds: 0 } };
}



// Level difficulty is a chart property, independent of soundtrack BPM. Later levels
// demand more corrections per second, with chords/sequences introduced gradually.
function progressiveMap(level, number, d) {
  const timeline = { bpm: level.bpm, tempoChanges: level.tempoChanges ?? [] };
  const duration = beatToSeconds(timeline, level.beats);
  const rate = .55 + (number - 3) * .08;
  const count = Math.floor(duration * rate);
  const start = beatToSeconds(timeline, 4), end = beatToSeconds(timeline, level.beats - 3);
  const slots = Array.from({ length: count }, (_, i) => {
    // Eighth-beat grid keeps recorded charts rhythmic even when their tempo is slow.
    const beat = Math.round(secondsToBeat(timeline, start + (end - start) * (i + (i && i < count - 1 ? [0, .12, -.12, .06][i % 4] : 0)) / (count - 1)) * 8) / 8;
    return { beat, at: beatToSeconds(timeline, beat) };
  });
  const tune = level.tune ? parseTune(level.tune) : null, onsets = [];
  if (tune) for (let loop = 0; loop * tune.length < level.beats; loop++) for (const note of tune.notes) {
    const beat = loop * tune.length + note.at;
    if (beat < level.beats) onsets.push({ ...note, beat, atSeconds: beatToSeconds(timeline, beat) });
  }
  // Move a cue to a nearby melody onset only when it keeps safe packet spacing.
  const claimed = new Set();
  for (let i = 0; i < slots.length; i++) {
    const slot = slots[i], note = onsets.reduce((best, n) => !claimed.has(n.beat) && Math.abs(n.atSeconds - slot.at) < .06 && (!best || Math.abs(n.atSeconds - slot.at) < Math.abs(best.atSeconds - slot.at)) ? n : best, null);
    if (note && note.atSeconds - (slots[i - 1]?.at ?? 0) >= .34 && (slots[i + 1]?.at ?? duration) - note.atSeconds >= .34) {
      slot.beat = note.beat; slot.at = note.atSeconds; slot.owned = note; claimed.add(note.beat);
    }
  }
  const random = seeded(20261011 + number * 101 + d), capacity = Math.floor((d - 1) / 2);
  const multiEvery = number < 5 ? Infinity : Math.max(4, 10 - Math.floor((number - 5) / 2));
  const events = slots.map((slot, i) => {
    const flips = i % multiEvery === multiEvery - 1 ? Math.min(capacity, number >= 11 ? 3 : 2) : 1;
    const lanes = []; while (lanes.length < flips) { const lane = Math.floor(random() * d); if (!lanes.includes(lane)) lanes.push(lane); }
    const nextAt = slots[i + 1]?.at ?? duration;
    const room = nextAt - slot.at - .32;
    const burstSpan = .16 * (lanes.length - 1);
    const burst = number >= 6 && lanes.length > 1 && Math.floor(i / multiEvery) % 2 === 1 && room > burstSpan;
    let holdBeats = 0;
    if (lanes.length === 1 && i % 10 === 3) {
      const available = secondsToBeat(timeline, slot.at + Math.min(.65, room)) - slot.beat;
      holdBeats = Math.floor(Math.min(1, available) * 4) / 4;
      if (holdBeats < .5 || beatToSeconds(timeline, slot.beat + holdBeats) - slot.at < .3) holdBeats = 0;
    }
    const steps = burst ? lanes.map((lane, j) => ({ offset: j ? secondsToBeat(timeline, slot.at + j * .16) - slot.beat : 0, lanes: [lane] })) : [{ offset: 0, lanes, holdBeats }];
    const note = slot.owned ?? onsets.reduce((best, n) => !best || Math.abs(n.atSeconds - slot.at) < Math.abs(best.atSeconds - slot.at) ? n : best, null);
    const melody = note ? { note: note.midi, noteBeats: note.dur, wrongNote: [1,-1,6,-2,2].map(k => note.midi+k).find(m => !tune.notes.some(n => n.midi % 12 === m % 12)) ?? note.midi+1, ...(slot.owned ? { tuneBeat: slot.beat } : {}) } : {};
    return { id: `p${i}`, beat: slot.beat, error: lanes, steps, ...melody };
  });
  const challenge = number < 5 ? 'Steady corrections with short holds.' : number < 8 ? 'More frequent corrections; wider lane counts introduce chords and short sequences.' : number < 11 ? 'Quicker corrections, changing rhythms, and less time to read each check.' : 'Dense, rapid corrections; wider lane counts add multi-flip challenges.';
  return { version: 1, id: level.id, title: level.title, artist: level.artist, level: number,
    description: `Level ${number} · ${challenge}`, bpm: level.bpm, qubits: d, durationBeats: level.beats,
    tempoChanges: timeline.tempoChanges, events, songMode: Boolean(tune),
    sections: level.sections ?? [{ beat: 0, label: 'Intro', intensity: .5 }, { beat: Math.floor(level.beats / 2), label: 'Build', intensity: .85 }],
    music: level.file ? { url: `./music/${level.file}`, credit: level.credit, offsetSeconds: level.offset, gain: .7 } : { composer: `song-${level.id}`, gain: .72, offsetSeconds: 0 } };
}
for (const [i, level] of LEVELS.entries()) mapRegistry.set(level.id, {
  title: level.title, artist: level.artist,
  build: d => i < 2 ? { ...songMap(level.id, level.title, level.bpm, level.beats, level.density, d, level), level: i + 1 } : progressiveMap(level, i + 1, d)
});
