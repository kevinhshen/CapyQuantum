// TEAM CONTENT PORT: players cannot upload maps or music.
// All entry points load this team-controlled file before initializing the game.
// Import registerMap/registerComposer and register your chart or composer here.
// Built-in charts live in maps.js. See LEVEL_AUTHORING.md for a complete example.
// Add local music paths to content-assets.json so the Qollab packager includes them.
// import { registerMap } from './maps.js';
// import { registerComposer } from './audio.js';

import { registerMap } from './maps.js';

// Phrase helper: one packet per [beat, lane] pair (single X error, 4 lanes).
const taps = (pairs) => pairs.map(([beat, lane], i) => ({ id: `n${i}`, beat, error: [lane] }));
const phrase = (start, lanes, gap) => lanes.map((lane, i) => [start + i * gap, lane]);

registerMap({
  version: 1, id: 'chiptune-1234', title: '1-2-3-4 (Chiptune)', artist: 'Pro Sensory',
  description: 'Bright jazz-pop chiptune. Steady beats, then offbeats.',
  qubits: 4, bpm: 167, durationBeats: 168,
  music: { url: './music/one-two-three-four.m4a', credit: '"1-2-3-4 (Chiptune)" by Pro Sensory, CC0 (opengameart.org/content/1-2-3-4-chiptune)', offsetSeconds: 0, gain: 0.7 },
  sections: [{ beat: 0, label: 'Intro', intensity: 0.4 }, { beat: 64, label: 'Groove', intensity: 0.8 }, { beat: 128, label: 'Finale', intensity: 1 }],
  events: taps([
    ...phrase(8, [1, 2, 0, 3, 1, 2, 0, 3], 4),
    ...phrase(44, [2, 1, 3, 0, 2, 1, 3, 0], 3),
    ...phrase(72, [1, 3, 0, 2, 1, 3, 0, 2], 2),
    ...phrase(97, [0, 2, 1, 3, 0, 2, 1, 3], 3.5),
    ...phrase(132, [3, 1, 2, 0, 3, 1, 2, 0], 2.5),
  ]),
});

registerMap({
  version: 1, id: 'mecha-march', title: 'Mecha Collection', artist: 'Jonathan So',
  description: 'NES-style action chiptune. Half-beat pulses and short rests.',
  qubits: 4, bpm: 120, durationBeats: 112,
  music: { url: './music/mecha-collection.m4a', credit: '"Mecha Collection" by Jonathan So, CC0 (opengameart.org/content/mecha-collection)', offsetSeconds: 0.07, gain: 0.7 },
  sections: [{ beat: 0, label: 'Boot', intensity: 0.5 }, { beat: 48, label: 'Charge', intensity: 1 }],
  events: taps([
    ...phrase(8, [0, 1, 2, 3, 2, 1], 2),
    ...phrase(24, [1, 3, 0, 2, 3, 1, 0, 2], 1.5),
    ...phrase(48, [2, 0, 3, 1, 2, 0, 3, 1, 2, 0], 1),
    ...phrase(60, [1, 2, 1, 3, 0, 3, 2, 0, 1, 2, 3, 0], 1.5),
    ...phrase(82, [3, 2, 1, 0, 1, 2, 3, 0], 2.5),
  ]),
});

// Preserve the teammate's tutorial presets in source, rather than editing PLAY.html.
export const learningPath = [
  { name: 'Seedling', map: 'morning-dew', qubits: 3, description: 'Read the checks slowly; one bit flip.' },
  { name: 'Sprout', map: 'lantern-waltz', qubits: 4, description: 'Four lanes and offbeat corrections.' },
  { name: 'Sapling', map: 'lantern-waltz', qubits: 5, description: 'Two bit flips; chords and short sequences.' },
  { name: 'Bloom', map: 'firefly-rush', qubits: 7, description: 'Seven lanes and up to three bit flips.' },
];

registerMap({
  version: 1, id: 'funked-up', title: 'Funked Up', artist: 'Joth',
  description: 'Groovy funk-rock loop. Steady taps with a few offbeats.',
  qubits: 4, bpm: 87, durationBeats: 92,
  music: { url: './music/funked-up.m4a', credit: '"Funked Up" by Joth, CC0 (opengameart.org/content/funked-up)', offsetSeconds: 0.07, gain: 0.7 },
  sections: [{ beat: 0, label: 'Groove', intensity: 0.6 }, { beat: 48, label: 'Peak', intensity: 1 }],
  events: taps([
    ...phrase(8, [1, 2, 0, 3, 1, 2], 3),
    ...phrase(28, [0, 3, 1, 2, 0, 3], 2),
    ...phrase(48, [2, 1, 3, 0, 2, 1, 3, 0], 1.5),
    ...phrase(62, [1, 3, 2, 0, 1, 3, 2, 0], 2.5),
  ]),
});

registerMap({
  version: 1, id: 'oldskool-synth', title: 'Oldskool', artist: 'Of Far Different Nature',
  description: 'Short retro synth loop. A quick warm-up level.',
  qubits: 4, bpm: 120, durationBeats: 58,
  music: { url: './music/oldskool.m4a', credit: '"Oldskool (CC0)" by Of Far Different Nature, CC0 (opengameart.org/node/107451)', offsetSeconds: 0.02, gain: 0.7 },
  sections: [{ beat: 0, label: 'Boot', intensity: 0.5 }, { beat: 32, label: 'Drive', intensity: 0.9 }],
  events: taps([
    ...phrase(8, [0, 2, 1, 3, 0, 2], 2),
    ...phrase(22, [3, 1, 2, 0, 3, 1, 2, 0], 1.5),
    ...phrase(36, [1, 0, 2, 3, 1, 0, 3, 2], 2),
  ]),
});

registerMap({
  version: 1, id: 'cubed-loop', title: 'Loop', artist: 'Cubed Canada',
  description: 'Slow, long loop. Room to read the checks between notes.',
  qubits: 4, bpm: 66, durationBeats: 100,
  music: { url: './music/cubed-loop.m4a', credit: '"Loop" by cubedcanada, CC0 (opengameart.org/node/88983)', offsetSeconds: 0.01, gain: 0.7 },
  sections: [{ beat: 0, label: 'Drift', intensity: 0.4 }, { beat: 50, label: 'Rise', intensity: 0.8 }],
  events: taps([
    ...phrase(8, [2, 0, 3, 1, 2, 0], 4),
    ...phrase(34, [1, 3, 0, 2, 1, 3], 3),
    ...phrase(52, [0, 2, 1, 3, 0, 2, 1, 3], 2),
    ...phrase(70, [3, 1, 2, 0, 3, 1], 2.5),
  ]),
});
