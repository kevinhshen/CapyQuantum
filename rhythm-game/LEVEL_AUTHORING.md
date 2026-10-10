# Maps and music: teammate integration

The engine is ready for authored content. The three built-in maps are generated examples with original synthesized accompaniment. They are not automatic transcriptions of imported songs. Your teammate supplies the BPM, timing, correction patterns, sections, and music alignment.

## The port

Edit `content.js`. All three entry points load this file before starting the game. Register JSON-shaped maps with `registerMap` from `maps.js`, and optional synthesized music with `registerComposer` from `audio.js`. This works in the modular local preview and Qollab. Rebuild `PLAY.html` to include the edits in the standalone version.

```js
import { registerMap } from './maps.js';
registerMap({
  version: 1, id: 'our-song', title: 'Our song', artist: 'Team name',
  qubits: 5, bpm: 120, durationBeats: 64,
  music: { url: './our-song.mp3', credit: 'Original music by our teammate',
           offsetSeconds: 0.25, gain: 0.7 },
  sections: [
    { beat: 0, label: 'Intro', intensity: 0.4, transpose: 0 },
    { beat: 32, label: 'Chorus', intensity: 1, transpose: 5 },
  ],
  events: [
    { id: 'one', beat: 4, error: [1] },
    { id: 'chord', beat: 8, error: [0, 3] },
    { id: 'burst', beat: 12, error: [1, 4], steps: [
      { offset: 0, lanes: [1] }, { offset: 0.25, lanes: [4] },
    ] },
    { id: 'rest', beat: 16, error: [], steps: [] },
  ],
});
```

Only use music you may distribute. Add your audio file to `tools/package_qollab.py`'s `FILES` list. Qollab limits each file to under 2 MB; confirm its supported upload and audio playback in the actual iframe. An external URL needs an allowed GET destination and browser CORS permission. A locally selected audio file stays in browser memory, overrides the selected map's soundtrack, and is not uploaded or persisted. Its duration must cover the map after the audio offset.

For an immediate no-code test, press **+ Map** and choose `examples/lantern-duet.json`. Press **+ Music** to pair your audio. **Tune → Export selected map JSON** gives a fully expanded map you can edit. Import rejects duplicate IDs: change `id` when iterating, or reload to reset the in-memory registry.

## Timing and correction fields

Lane indices are **zero-based**. Beat zero starts after a four-beat countdown. The Web Audio clock drives both audio and judgement; animation frames only draw the current song position.

| Field | Meaning |
|---|---|
| `qubits` | Fixed 3–7 lanes for this authored map |
| `bpm` | 40–220; this version supports one constant tempo per map |
| `durationBeats` | At least 8 beats, at most 5 minutes |
| `event.beat` | Beginning of one fresh encoded register's correction packet |
| `event.error` | Unique lanes receiving injected X errors |
| `event.steps` | Optional sequence; defaults to one chord containing all error lanes |
| `step.offset` | Beat offset from packet start, 0–2, in increasing order |
| `step.lanes` | Reference solution lanes; their count creates timing slots, but players choose any faulty qubits in any order |
| `sections` | Ordered scene/music cues, beginning at beat 0 |
| `section.intensity` | 0–1, used by the default composer |
| `section.transpose` | Integer semitones, −24 to +24, used by the default composer |
| `music.offsetSeconds` | Position within an audio file that corresponds to map beat 0 |
| `music.gain` | Master volume, 0–1 |
| `music.composer` | Registered scheduler ID; default `garden-lofi` |

The XOR of every authored correction step must equal the injected error. Each authored faulty lane must appear exactly once. Lane locations are hidden from the player; the sequence defines timing opportunities, rather than a required correction order. The player may still tap any key repeatedly, and two X operations cancel. The validator rejects errors beyond the code's guarantee, notes outside the song, duplicate IDs, malformed values, and same-lane notes less than 85 ms apart. Limits: 800 packets, 1,600 notes, 64 sections, JSON file under 2 MB. It sorts packets by beat.

3/4 data qubits guarantee one X error; 5/6 guarantee two; 7 guarantee three. Half-flipped patterns for even counts are ambiguous and rejected. Extra lanes add playing difficulty even where correction capacity stays the same. Packets show only parity clues and neutral qubit markers; the player must infer the correction. These are not measurements of the stored logical value. This MVP does not teach phase-error recovery.

## Write a music scheduler

```js
import { registerComposer } from './audio.js';
registerComposer('team-pulse', (tick, { at, context, map, section, tone, noise }) => {
  // Called ahead of time once per sixteenth note; tick / 4 is the beat.
  // Helpers schedule at `at`, a time on AudioContext's clock.
  if (tick % 4 === 0) tone(110, 0.18, 0.05, 'triangle');
  if (tick % 8 === 4) noise(0.05, 0.03 * section.intensity, 3000);
});
```

Use `{ composer: 'team-pulse', gain: 0.7 }` in the map. `tone(frequencyHz, durationSeconds, gain, oscillatorType?, endFrequencyHz?)` and `noise(durationSeconds, gain, highpassHz)` connect to the game's controlled master output. Use these helpers so pause, mute, and cleanup work. Keep schedulers fast and free of blocking work. Raw `context`/`at` are supplied for advanced integrations; custom nodes must manage their own connections and cleanup.

## Reactive events

After `startGame` initializes the UI, `window.QubitTempo` exposes:

```js
const unsubscribe = window.QubitTempo.on('note-hit', event => {
  // { mapId, lane, timing, correct, deltaMs, combo, packetId }
  // Add a scene reaction, or queue an extra musical accent.
});
window.QubitTempo.on('section-change', ({ mapId, section }) => {});
window.QubitTempo.on('packet-resolved', ({ id, error, applied, restored, syn, fidelity }) => {});
window.QubitTempo.on('map-end', ({ mapId, practice, summary }) => {});
window.QubitTempo.on('map-start', ({ map, practice }) => {});
window.QubitTempo.on('wrong-correction', ({ lane, time, correct }) => {});
window.QubitTempo.on('stray-input', ({ lane, time }) => {});
window.QubitTempo.on('map-import', ({ id }) => {});
// Call unsubscribe() when your integration is removed.
```

Also available: `registerMap(map)`, `registerComposer(id, fn)`, `maps()`, `selectMap(id)` while in the menu, and `state()` for mode, map, pause, qubits, combo, and song time. These are content/integration hooks, not a score-submission service. Hooks execute on the browser thread; schedule reactive sound using your own Web Audio clock rather than trusting frame timing. The built-in interaction grows flowers for correct corrections, changes live parity, and plays clear/buzzy melody feedback for recovered/corrupted memories; section changes alter the garden and synthesized arrangement.

## Review a map

1. Run `npm test` after changing validation or timing code.
2. Import the map and use untimed practice to check its chords and numbered sequences.
3. Play it with its actual soundtrack. Check early/late timing, manual compensation, and note travel under Tune. No automatic beat detection or device calibration is included.
4. Check pause, mute, touch controls, a complete report, and the intended screen size.
5. Rebuild the recorded player and Qollab package; test the actual Qollab runtime before publication.
