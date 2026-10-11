// Song arrangements and level definitions from the team new-music branch.
const NOTE_BASE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
export function parseTune(text) {
  let beat = 0; const notes = [];
  for (const token of text.trim().split(/\s+/)) {
    const [name, length] = token.split(':'), dur = Number(length);
    if (name !== 'R') { const m = /^([A-G])(#|b)?(\d)$/.exec(name); notes.push({ at: beat, dur, midi: 12 * (Number(m[3]) + 1) + NOTE_BASE[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) }); }
    beat += dur;
  }
  return { notes, length: beat };
}

export const SONG_LEVELS = [
  { id: 'twinkle', title: 'Twinkle, Twinkle, Little Star', artist: 'Traditional · nursery rhyme', bpm: 90, beats: 96, density: 'gentle',
    description: 'Level 1 · nursery rhyme. Short phrases and generous gaps for learning the parity checks.',
    tune: 'C4:1 C4:1 G4:1 G4:1 A4:1 A4:1 G4:2 F4:1 F4:1 E4:1 E4:1 D4:1 D4:1 C4:2 G4:1 G4:1 F4:1 F4:1 E4:1 E4:1 D4:2 G4:1 G4:1 F4:1 F4:1 E4:1 E4:1 D4:2 C4:1 C4:1 G4:1 G4:1 A4:1 A4:1 G4:2 F4:1 F4:1 E4:1 E4:1 D4:1 D4:1 C4:2',
    bass: [48, 53, 53, 55, 48, 55, 48, 55, 48, 53, 53, 48], bassBeats: 4 },
  { id: 'mary-lamb', title: 'Mary Had a Little Lamb', artist: 'Traditional · nursery rhyme', bpm: 100, beats: 80, density: 'gentle',
    description: 'Level 2 · nursery rhyme. A steady stepwise tune with a little more to do between phrases.',
    tune: 'E4:1 D4:1 C4:1 D4:1 E4:1 E4:1 E4:2 D4:1 D4:1 D4:2 E4:1 G4:1 G4:2 E4:1 D4:1 C4:1 D4:1 E4:1 E4:1 E4:1 E4:1 D4:1 D4:1 E4:1 D4:1 C4:4',
    bass: [48, 48, 55, 48, 48, 48, 55, 48], bassBeats: 4 },
  { id: 'row-boat', title: 'Row, Row, Row Your Boat', artist: 'Traditional · nursery rhyme', bpm: 116, beats: 96, density: 'gentle', beatsPerBar: 3,
    description: 'Level 3 · nursery rhyme. A brighter, buoyant three-beat swing with smoother phrasing and a lively finish.',
    tune: 'C4:1 C4:1 C4:1 D4:.5 E4:1.5 E4:1.5 D4:.5 E4:1 F4:.5 G4:2 G4:1 E4:1 C5:1 C5:1 C5:1 G4:1 G4:1 G4:1 E4:1 E4:1 E4:1 C4:1 C4:1 C4:1 G4:1 F4:.5 E4:1 D4:.5 C4:2',
    bass: [48, 48, 48, 55, 48, 48, 55, 48], bassBeats: 3 },
  { id: 'ode-to-joy', title: 'Ode to Joy', artist: 'Ludwig van Beethoven · classical', bpm: 108, beats: 96, density: 'steady',
    description: 'Level 4 · classical. A familiar march with offbeat corrections arriving between the beats.',
    tune: 'E4:1 E4:1 F4:1 G4:1 G4:1 F4:1 E4:1 D4:1 C4:1 C4:1 D4:1 E4:1 E4:1.5 D4:.5 D4:2 E4:1 E4:1 F4:1 G4:1 G4:1 F4:1 E4:1 D4:1 C4:1 C4:1 D4:1 E4:1 D4:1.5 C4:.5 C4:2',
    bass: [48, 48, 48, 55, 48, 48, 55, 48], bassBeats: 4 },
  { id: 'fur-elise', title: 'Für Elise', artist: 'Ludwig van Beethoven · classical', bpm: 84, beats: 96, density: 'steady', beatsPerBar: 3,
    description: 'Level 5 · classical. A slowed-down, easier take on the famous theme, with longer holds and changing gaps.',
    tune: 'E5:.25 D#5:.25 E5:.25 D#5:.25 E5:.25 B4:.25 D5:.25 C5:.25 A4:.5 C4:.25 E4:.25 A4:.5 B4:.5 E4:.25 G#4:.25 B4:.25 C5:.5 R:.25 E5:.25 D#5:.25 E5:.25 D#5:.25 E5:.25 B4:.25 D5:.25 C5:.25 A4:.5 C4:.25 E4:.25 A4:.5 B4:.5 E4:.25 C5:.25 B4:.25 A4:1 R:.75',
    bass: [57, 52, 57, 52], bassBeats: 3 },
  { id: 'canon-in-d', title: 'Canon in D', artist: 'Johann Pachelbel · classical', bpm: 96, beats: 112, density: 'steady',
    description: 'Level 6 · classical. A long, flowing build: slow half notes, then quarters, then running eighths.',
    tune: 'F#5:2 E5:2 D5:2 C#5:2 B4:2 A4:2 B4:2 C#5:2 D5:1 F#5:1 A5:1 G5:1 F#5:1 D5:1 F#5:1 E5:1 D5:1 B4:1 D5:1 A4:1 G4:1 B4:1 A4:1 G4:1 D5:.5 F#5:.5 A5:.5 F#5:.5 A4:.5 C#5:.5 E5:.5 C#5:.5 B4:.5 D5:.5 F#5:.5 D5:.5 F#4:.5 A4:.5 C#5:.5 A4:.5 G4:.5 B4:.5 D5:.5 B4:.5 D5:.5 F#5:.5 A5:.5 F#5:.5 G4:.5 B4:.5 D5:.5 B4:.5 A4:.5 C#5:.5 E5:.5 C#5:.5',
    bass: [50, 57, 59, 54, 55, 50, 55, 57], bassBeats: 2 },
  { id: 'eine-kleine', title: 'Eine kleine Nachtmusik', artist: 'Wolfgang Amadeus Mozart · classical', bpm: 116, beats: 112, density: 'steady',
    description: 'Level 7 · classical. A clearer, more recognizable opening theme followed by contrasting rising and falling phrases.',
    tune: 'G4:1 D5:1 G4:1 D5:1 G4:.5 B4:.5 D5:1 G5:2 D5:1 B4:1 G4:1 D5:1 G4:1 D5:1 G4:.5 B4:.5 D5:1 G5:2 F#5:1 E5:1 D5:1 C5:1 A4:1 C5:1 E5:1 A5:2 E5:1 C5:1 A4:1 D5:1 F#5:1 A5:1 D5:1 F#5:1 A5:2',
    bass: [55, 55, 48, 50, 55, 55], bassBeats: 4 },
  { id: 'sugar-plum', title: 'Dance of the Sugar Plum Fairy', artist: 'Pyotr Tchaikovsky · The Nutcracker', bpm: 96, beats: 112, density: 'fast',
    description: 'Level 8 · classical. Light, staccato triplets that tumble downward, with the odd burst or two-flip chord between them.',
    tune: 'F5:.5 D5:.5 F5:.5 E5:.5 C#5:1 D5:1 C5:.5 C5:.5 C5:1 B4:.5 B4:.5 B4:1 A#4:.5 A#4:.5 A#4:1 A4:2 F5:.5 D5:.5 F5:.5 E5:.5 A#4:1 A4:1 F5:.5 F5:.5 F5:1 E5:.5 E5:.5 E5:1 D5:.5 D5:.5 D5:1 D5:2',
    bass: [50, 57, 50, 57, 50, 57], bassBeats: 4 },
  { id: 'turkish-march', title: 'Rondo alla Turca', artist: 'Wolfgang Amadeus Mozart · classical', bpm: 120, beats: 120, density: 'fast',
    description: 'Level 9 · classical. A longer, varied rondo-inspired melody with changing runs, register shifts, and contrasting phrases.',
    tune: 'B4:.5 A4:.5 G#4:.5 A4:.5 C5:.5 E5:.5 A5:1 G#5:.5 A5:.5 B5:.5 C6:.5 D6:1 C6:.5 B5:.5 A5:.5 G#5:.5 A5:1 E5:.5 C#5:.5 E5:.5 A5:.5 C6:1 B5:.5 A5:.5 G#5:.5 A5:.5 B5:1 E5:1 C#5:.5 D5:.5 E5:.5 F#5:.5 G#5:1 A5:1 R:.5 E5:.5 C#5:.5 A4:.5 B4:.5 C#5:.5 D5:.5 E5:1 A5:1 E5:1 C#5:1 A4:2',
    bass: [57, 52, 57, 52, 57], bassBeats: 2 },
  { id: 'beethoven-fifth', title: "Symphony No. 5 in C Minor", artist: 'Ludwig van Beethoven · classical', bpm: 148, beats: 128, density: 'driving', pulse: true,
    description: 'Level 10 · expert finale. Beethoven’s famous four-note fate motif drives a relentless, high-pressure correction challenge.',
    tune: 'G4:.75 G4:.75 G4:.75 Eb4:2.5 F4:.75 F4:.75 F4:.75 D4:2.5 G4:.75 G4:.75 G4:.75 Eb4:2.5 F4:.75 F4:.75 F4:.75 D4:2.5 G4:.75 G4:.75 G4:.75 Eb4:2 F4:.75 F4:.75 F4:.75 D4:2 G4:.75 G4:.75 G4:.75 Eb4:2.5 F4:.75 F4:.75 F4:.75 D4:2.5 Bb4:1 Bb4:1 Bb4:1 G4:2 Ab4:1 Ab4:1 Ab4:1 F4:2 G4:.75 G4:.75 G4:.75 Eb4:2 F4:.75 F4:.75 F4:.75 D4:2 G4:1 Bb4:1 D5:1 G5:2 F5:1 Eb5:1 D5:1 C5:2',
    bass: [43, 43, 38, 43, 41, 41, 36, 41], bassBeats: 1,
    tempoChanges: [{ beat: 32, bpm: 160 }, { beat: 64, bpm: 172 }, { beat: 96, bpm: 184 }],
    sections: [{ beat: 0, label: 'Fate Motif', intensity: .75, transpose: 0 }, { beat: 32, label: 'Relentless', intensity: .85, transpose: 0 }, { beat: 64, label: 'Fortissimo', intensity: .95, transpose: 0 }, { beat: 96, label: 'Finale', intensity: 1, transpose: 0 }] }
];

// Shared catalog for the ten synthesized song levels.
export const LEVELS = SONG_LEVELS;
