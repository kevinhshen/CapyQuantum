# Level-making rules — Qubit Tempo

This guide is for teammates adding published levels. Add charts and music through the team-controlled source; players cannot upload either. A good level teaches players to read quantum error clues while following audible musical events. Random note spacing is not a substitute for a musical chart.

## What a new level must include

- A unique `id`, a short `title`, the creator in `artist`, and a one-sentence `description` explaining the challenge. Required text fields are 1–100 characters.
- A fixed `qubits` count, initial `bpm`, `durationBeats`, and a nonempty `events` array. Use version `1`.
- A soundtrack: an existing registered synthesized `composer`, or a recording with `url` and `credit`. Supply `gain` and, for recordings, the correct `offsetSeconds`.
- Error patterns and their correct tap/hold solutions. Every packet is a fresh encoded memory. Healthy packets are permitted, but the whole level must contain at least one playable correction.
- A section at beat zero. Optional later sections can label musical phrases and change synthesized arrangement or scenery.
- Optional `tempoChanges` matching genuine changes in the music. These change the chart timeline; they do not time-stretch a recording.

Register the finished map in `content.js` using `registerMap`. Build and validate from this game folder. See [LEVEL_AUTHORING.md](LEVEL_AUTHORING.md) for integration details and [examples/hold-garden.json](examples/hold-garden.json) for a valid tap/hold chart.

## Enforced engine limits

These are validator requirements, not difficulty targets.

| Item | Minimum | Maximum / rule |
|---|---|---|
| Keyboard lanes / physical qubits | 3 | 7; default gameplay uses 4 |
| Tempo | 40 BPM | 220 BPM, including tempo changes |
| Map length | 8 beats | 300 seconds across its full tempo timeline |
| Memory packets | 1 | 800 |
| Playable correction notes | 1 | 1,600 per level; a hold counts once |
| Simultaneous keys | 0 for a healthy packet; 1 for a correction | 1 at 3/4 lanes, 2 at 5/6 lanes, 3 at 7 lanes |
| Total required keys in one packet | 0 for a healthy packet | Same correction capacity as above, even if spread over several steps |
| Correction steps in a packet | 0 for healthy packets | At most the lane count; each faulty lane occurs exactly once |
| Step start offset | 0 beats | 2 beats after the packet beat; offsets strictly increase |
| Same-lane note separation | 85 ms | Measured from the earlier hold's tail, or the earlier tap's head |
| Gap between different packets | 300 ms | From the earlier packet's last tap/hold tail to the next packet beat |
| Hold duration | 0.5 beats **and** at least 300 ms | 8 beats; use `0` or omit for a tap |
| Hold tail | At or after its head | Must finish within `durationBeats` |
| Sections / tempo changes | At least 1 section; 0 changes allowed | 64 each; first section is at beat 0 |
| Music gain | 0 | 1 |
| Recording offset | 0 seconds | Must leave enough audio for the entire chart |
| Qollab package | Required runtime files | At most 100 files, each at most 2,000,000 bytes |

Lane indexes are zero-based: `0` means Q1. Never use duplicate lanes in an error/chord. The injected errors must be uniquely decodable within `floor((qubits - 1) / 2)` X flips. Four lanes do **not** support four-key correction chords: this code guarantees only one X correction at four lanes. To add two-key chords, use five or more lanes; for three-key chords, use seven.

| Lanes | Keys |
|---|---|
| 3 | D F J |
| 4 | D F J K |
| 5 | D F Space J K |
| 6 | S D F J K L |
| 7 | S D F Space J K L |

## Put keys on the music

1. Find beat zero and the initial tempo by listening and checking waveform/onset positions in your audio editor. Beat zero is the recording's `offsetSeconds`, not necessarily its first sound.
2. Place note heads on audible beats, offbeats, melody attacks or accents. Fractional beats such as `4.5` and `4.75` are supported. Vary spacing to follow the song, rather than generating unrelated random gaps.
3. Use silence deliberately. Repeat a recognizable phrase before introducing a variation. Give beginners time to read the lamps before the next decision.
4. Align hold heads with the start of a sustained sound and tails with its end or a clear musical boundary. Avoid a long ribbon over disconnected staccato sounds unless the relationship is obvious.
5. Check the beginning, middle and end against the recording. A correct initial offset with a wrong BPM will drift later. For steady tempo, beat `b` occurs at recording time `offsetSeconds + b * 60 / bpm`; for changes use `beatToSeconds(map, b)` plus the offset.
6. Leave a few beats before the first correction and space after the final tail. The engine gives a four-beat count-in, but an opening phrase still helps players orient themselves.

The built-in composer sounds a melody at each correction head and sustains it for authored holds. A custom composer should make those timings audible too. Recording playback keeps the original sound: chart edits cannot repair a bad audio alignment.

## Tap notes, hold notes and chords

```js
// Tap Q2 at beat 4.
{ beat: 4, error: [1] }

// Press Q2 at beat 8 and hold through beat 10.
{ beat: 8, error: [1], steps: [
  { offset: 0, lanes: [1], holdBeats: 2 },
] }

// At 5+ lanes: hold both faulty keys from beat 12 to beat 13.
{ beat: 12, error: [0, 3], steps: [
  { offset: 0, lanes: [0, 3], holdBeats: 1 },
] }

// At 5+ lanes: a hold and a later tap in the same memory.
{ beat: 16, error: [1, 4], steps: [
  { offset: 0, lanes: [1], holdBeats: 1 },
  { offset: 0.5, lanes: [4] },
] }
```

A step's `holdBeats` applies to every note in that step. For different durations, use separate steps with different offsets; simultaneous holds of different lengths are not currently supported. Keep the next memory packet at least 300 ms after the **longest** tail.

The player chooses the correction lane from the parity checks, rather than being told its lane by the ribbon. Correct lanes may be pressed in either order for multi-error solutions. Holding applies a single X at the head; neither staying down nor releasing applies another X. The key must stay down until its tail arrives; a 40 ms early-release tolerance handles very small release differences. Points/combo are awarded when the hold completes, using head timing (45/90/145 ms Perfect/Great/Good windows). Early release loses that note's rhythm credit, while the quantum repair can remain successful. A missed or wrong head earns no hold credit. Pause freezes the map; after resume, re-press held keys to continue without another X gate.

Untimed practice deliberately uses one press per hold and does not score sustain timing. Test real holds in timed play as well. One long hold scores as one note, so making it longer does not inflate score.

## What makes a level good

Use the following as starting guidelines. They are design targets to playtest, not enforced limits or measured difficulty ratings. BPM alone does not determine difficulty: reading demand, note density, simultaneous keys, offsets and holds matter together.

| Difficulty | Suggested design |
|---|---|
| Beginner | 3–4 lanes, one flip at a time; mostly whole/half-beat timing; roughly 1–2 seconds between decisions; 20–50 notes over 30–60 seconds; short 1–2 beat holds introduced separately |
| Intermediate | 4–5 lanes; recognizable offbeats and alternating hands; roughly 0.6–1.2 seconds between independent decisions; occasional two-key chords at 5 lanes; taps and 1–3 beat holds in repeated phrases |
| Advanced | 5–7 lanes; up to 2–3 simultaneous corrections within the code's limit; planned quarter-beat bursts; holds mixed with other corrections in the same packet; breathing space after dense phrases |

- Introduce one new skill at a time. Show an isolated hold before mixing it with a chord or rapid sequence. Build difficulty gradually rather than placing the hardest pattern first.
- Keep controls physically playable. Balance both hands; avoid repeated awkward stretches and long Space holds combined with difficult neighboring keys. Test on an ordinary keyboard and the touch receptors, including simultaneous holds.
- Respect sustained input. Never require a new press of a key before its hold is released. A player should have time to lift and reposition fingers after a tail; the 85/300 ms validator limits are minimum safety bounds, not recommended beginner pacing.
- Use musical phrases, not constant spam. Repeating a pattern helps learning; small variations keep it interesting. Include rests and healthy-memory packets that teach when to wait.
- Keep explanations short. The description should name the skill, such as “Offbeats and short holds.” Keep technical authoring details out of player-facing text.
- Teach honestly. The rhythm clock is a game mechanic; holding is not a repeated quantum operation. This repetition code handles X/bit flips, not Z/phase errors. Equal checks can hide logical errors outside its correction guarantee.
- Inspect results from actual players. If learners cannot read the checks before the next head, lower density or simplify error patterns. If they decode correctly but often lose holds, check tail readability, duration and audio alignment before increasing timing leniency.

## Music and packaging requirements

Use original, licensed or permission-granted audio that the team can distribute. Put creator/license information in `music.credit` and `ATTRIBUTION.md`; retain any required license material. Use a browser-decodable recording and verify it in the actual Qollab iframe. The recording must cover the full chart after its offset, including every hold tail.

For bundled audio, keep the file under this game folder (for example `music/song.mp3`) and list it in `content-assets.json`. The packager includes the file automatically. It rejects absolute paths, `..` paths, missing assets and oversized files. External audio requires an allowed HTTP GET destination and browser CORS permission, and will not work offline. A standalone `PLAY.html` needs local recordings distributed alongside it, or an embedded audio-data URL. Music you test only through the developer server is not proof that the submitted package contains it.

Rebuild source and generated players after every chart edit. Qiskit remains the quantum backend; holds reuse the existing reference bank and add no backend jobs. Qollab Run must remain compatible with the single batched job workflow.

## Review checklist before adding a level

From `rhythm-game/`:

```sh
node tools/check_level.mjs examples/hold-garden.json
node --test tests/*.test.mjs
python3 tools/build_standalone.py
python3 tools/package_qollab.py
```

For your own file, replace the example path with its JSON path, then register that map in `content.js`. The chart checker validates schema, reports note/hold counts and verifies a perfect recovery using the local reference model. It cannot establish music alignment or human difficulty.

Before merging:

- Chart passes validation and tests; taps-only charts still work.
- Correct solutions recover every memory. Wrong keys, early releases and missed heads produce understandable feedback.
- Audio is on time at the start, middle and end, including tempo changes and hold tails.
- Difficulty and simultaneous-key requirements fit the intended audience; someone else has tried the map.
- Touch release/cancel, keyboard hold/release, pause/resume, reduced motion and untimed practice behave correctly.
- Credits, local audio paths and package files are complete; each file meets the size limit.
- Run the packaged project with the selected free simulator in Qollab and test its audio before publication. The offline player uses recorded Qiskit results and does not verify live platform execution.

This effort is supported by Qollab & IonQ

## Built-in progression and synchronization

The catalog contains the ten synthesized melody lessons. The five CC0 recordings and the three original garden tracks are retired. All ten songs support 3–7 lanes.

Cue times come directly from the melody's beat positions, with audible kick/hi-hat accents added to later charts. Sequence taps use the same musical candidate positions. No elapsed-time interpolation, approximate nearest-note snapping, or artificial average note-rate target is used. A candidate that is too close for safe input is skipped rather than moved. Long melody notes can supply holds, whose tails remain on the musical grid.

Later charts select more musical accents and more multi-flip packets. Exact density depends on the tune, so it need not increase at every adjacent level. Symphony No. 5 remains a dense expert finale, with its 148 → 160 → 172 → 184 BPM climb, frequent multi-flip chords at wider lane counts, and fewer phrase rests in its final section. Synchronization takes priority over a prescribed average difficulty number.

The backing tune runs independently of player input. Hit feedback is unpitched and on the effects bus; missed/wrong/early/late inputs cannot retime the melody. Untimed practice still demonstrates note pitches. Audio output timestamps align rendering/judgement to heard audio where supported, with AudioContext time as the fallback. Existing 300 ms packet separation, 85 ms same-lane sequence spacing, and hold rules still apply.
