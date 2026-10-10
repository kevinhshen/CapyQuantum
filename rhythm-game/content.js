// TEAM CONTENT PORT: players cannot upload maps or music.
// All entry points load this team-controlled file before initializing the game.
// Import registerMap/registerComposer and register your chart or composer here.
// Built-in charts live in maps.js. See LEVEL_AUTHORING.md for a complete example.
// Add local music paths to content-assets.json so the Qollab packager includes them.
// import { registerMap } from './maps.js';
// import { registerComposer } from './audio.js';
// registerMap({ version: 1, id: 'our-song', ... });

// Preserve the teammate's tutorial presets in source, rather than editing PLAY.html.
export const learningPath = [
  { name: 'Seedling', map: 'morning-dew', qubits: 3, description: 'Read the checks slowly; one bit flip.' },
  { name: 'Sprout', map: 'lantern-waltz', qubits: 4, description: 'Four lanes and offbeat corrections.' },
  { name: 'Sapling', map: 'lantern-waltz', qubits: 5, description: 'Two bit flips; chords and short sequences.' },
  { name: 'Bloom', map: 'firefly-rush', qubits: 7, description: 'Seven lanes and up to three bit flips.' },
];
