# Team-controlled levels and music

Players choose published levels. They cannot add maps, upload recordings, or export charts from the player.

Qollab runs the application in a sandboxed browser with a Python/Qiskit bridge. The “backend” content workflow is therefore **team-controlled source files**, not a writable player upload service. `content.js` loads before every entry point. Built-in phrase charts are in `maps.js`.

Start with [level-making-rules.md](level-making-rules.md) for enforced limits, music alignment, difficulty targets and the review checklist.

## Add a chart

Put this in `content.js` (use a unique ID):

```js
import { registerMap } from './maps.js';
registerMap({
  version: 1, id: 'our-song', title: 'Our song', artist: 'Team name',
  description: 'Offbeats and short rests. Practice reading the checks.',
  qubits: 4, bpm: 120, durationBeats: 32,
  tempoChanges: [{ beat: 16, bpm: 100 }], // Optional, increasing beat positions
  music: { url: './music/our-song.mp3', credit: 'Original music by our teammate',
    offsetSeconds: 0.25, gain: 0.7 },
  sections: [
    { beat: 0, label: 'Intro', intensity: 0.4, transpose: 0 },
    { beat: 16, label: 'Chorus', intensity: 1, transpose: 5 },
  ],
  events: [
    { id: 'first', beat: 4, error: [1] },
    { id: 'offbeat', beat: 5.5, error: [2] },
    { id: 'short-gap', beat: 6.25, error: [0] },
    { id: 'rest', beat: 9, error: [], steps: [] },
    { id: 'return', beat: 12, error: [3] },
    { id: 'new-tempo', beat: 17.5, error: [1] },
  ],
});
```

The exact beat positions, fractional beats, silence, and tempo changes are authored by the team. Randomizing intervals independently of the song makes synchronization worse. There is no automatic transcription or beat detection. Imported recordings retain their sound; tempo changes must match the recording rather than changing its playback speed.

## Add the recording to the package

1. Add audio under this game folder, such as `music/our-song.mp3`.
2. Add `"music/our-song.mp3"` to the array in `content-assets.json`.
3. Run `python3 tools/package_qollab.py`. The packager validates and includes those assets automatically. Upload the generated `upload/` contents, preserving paths, into the Qollab JS / Qiskit project.
4. Select a free simulator and Run. Verify playback in Qollab's actual iframe before publication.

Each Qollab file must be under 2 MB; the package allows at most 100 files. Use music you can distribute and include its credit. External HTTP URLs require an allowed GET destination and browser CORS permission. For offline single-file playback, use a `data:audio/...` URL in the chart; otherwise distribute local audio alongside `PLAY.html`. Rebuild the standalone player after chart edits.

## Chart fields

| Field | Meaning |
|---|---|
| `qubits` | Fixed 3–7 lanes for team-authored maps; default generated maps start at 4 |
| `bpm` | Initial tempo, 40–220 BPM |
| `tempoChanges` | Optional ordered `{ beat, bpm }` changes, strictly after beat 0 and before the end |
| `durationBeats` | At least 8 beats; at most 5 minutes on the full tempo timeline |
| `event.beat` | Start of a fresh encoded memory; fractional beats are allowed |
| `event.error` | Unique zero-based lanes with injected X errors |
| `event.steps` | Defaults to one simultaneous chord; `[]` for healthy memory |
| `step.offset` | Increasing beat offsets, 0–2; these use the same tempo timeline |
| `step.holdBeats` | Optional hold duration: 0 for tap, or 0.5–8 beats and at least 300 ms; shared by the step’s notes |
| `step.lanes` | A reference solution; players may choose the faulty qubits in any order |
| `sections` | Ordered scene/composer cues, starting at beat 0 |
| `music.offsetSeconds` | Recording position corresponding to map beat 0 |
| `music.gain` | Volume, 0–1 |
| `music.composer` | Synthesized scheduler ID, used when no recording URL is supplied |

1–800 packets, 1–1,600 correction inputs, 64 sections and 64 tempo changes. Each faulty lane appears exactly once in the reference solution. Same-lane notes need at least 85 ms after the earlier tap/head or hold tail. Different memory packets need 300 ms between the earlier last tap/hold tail and the next packet beat so a key has an unambiguous memory target. Put simultaneous flips in one chord, not overlapping memory packets.

For a five-lane chord/burst:

```js
// Use qubits: 5 or more for two-error examples.
{ beat: 8, error: [0, 3] }, // Same-time chord
{ beat: 12, error: [1, 4], steps: [
  { offset: 0, lanes: [1] }, { offset: 0.25, lanes: [4] },
] },
```

Four qubits guarantee one X error, five/six guarantee two, seven guarantee three. Three and four have the same guaranteed capacity. A four-lane map therefore has irregular single-flip corrections; wider codes add chords and multi-step recoveries. The code does not protect against Z/phase errors. Neutral markers hide the answer; parity lamps provide clues. A repeated X cancels and can reintroduce an error.

For a hold, add `holdBeats` to a step: `{ offset: 0, lanes: [1], holdBeats: 2 }`. Press once at the head and keep the key down to its tail. Sustain adds no further X gates. Early release loses rhythm credit without undoing the repair; untimed practice uses one press per hold. Every tail must finish within the map. `node tools/check_level.mjs examples/hold-garden.json` validates a sample and checks perfect recovery.

## Synthesized music and hooks

`registerComposer` from `audio.js` receives a sixteenth-note tick and `{ at, context, map, section, tone, noise }`. `at` comes from the shared tempo timeline. Helpers connect to the controlled output so mute/pause/stop remain consistent. The default soundtrack also schedules a short melody at each authored correction time, making offbeats audible even when the player misses them.

`window.QubitTempo` exposes `registerMap`, `registerComposer`, `maps`, `selectMap` (on Home/Levels), `state`, and `on(type, handler)`. Event types: `map-start`, `note-hit`, `note-miss`, `hold-complete`, `hold-break`, `wrong-correction`, `stray-input`, `packet-resolved`, `section-change`, and `map-end`. `note-miss` fires once per missed timing cue with `packetId` and `cueId`, and no solution lane. Recorded music uses unpitched effects automatically. These are developer hooks. Player controls do not expose content editing.

## Review before submitting

Run `npm test`, play the chart with its actual soundtrack, check untimed decoding and pause/resume, then rebuild `PLAY.html` and the Qollab package. Review file credits and check the live free backend/audio in Qollab. Local preview and recorded Qiskit results do not prove live platform execution.
