# Qubit Tempo — learn quantum error correction through rhythm

Read parity lamps on falling quantum memories, decide which qubits to flip, and repair them to the beat. One encoded quantum memory per correction packet; three original synthesized maps, with 3–7 lanes. Home, Levels, Learn, Settings, and gameplay have separate screens. Four lanes are the default; a report appears after the song.

This effort is supported by Qollab & IonQ

Theme: Quantum Unlocked · application license: MIT. This is the active project on `main`, in `rhythm-game/`. The original factory is preserved on `codex/archive-qubit-factory-2026-10-10`. Visual direction follows the team's Ion Garden branch. See [ATTRIBUTION.md](ATTRIBUTION.md) for starting points and AI disclosure.

## Play

`PLAY.html` is the generated single-file player, with recorded Qiskit BasicSimulator results embedded. It submits no live backend job. Serve this folder locally and open `http://127.0.0.1:8766/PLAY.html`:

```sh
python3 -m http.server 8766 --bind 127.0.0.1
```

The file also contains everything needed for offline playback in an ordinary browser. Direct `file://` playback remains a manual check; the automation browser restricts that scheme.

The teammate’s six-step animated tutorial, including hold notes, opens automatically on every program run. Skip or finish it to reach Home; **Learn** replays it from step one. Back, Next, Replay, step buttons, arrow keys and Escape are available. The tutorial also links to the quantum lessons and parity lab.

Use **Start** on Home to open Levels. Choose Morning dew (86 BPM), Lantern glow (112→124→112 BPM), or Firefly rush (138 BPM), then Play. Four physical qubits are selected initially; 3–7 are available on generated maps. Team-authored maps fix their own lane count. The optional Guided learning path preserves the teammate’s Seedling, Sprout, Sapling, and Bloom presets in source; selecting one sets its song and lane count. Memory packets fall **top to bottom**. Every qubit marker is neutral: no lane reveals the answer. Lamps between qubits show neighboring parity (`≠` different, `=` same). Choose the smallest correction within the code's guarantee and press those keys at the recovery line. Multiple errors can be repaired as a chord or at numbered rapid beats, in any order. Lamps update after every flip; clean packets need no input. Long packets have a ribbon: press the chosen key at the head and hold until its tail reaches the line. The correction applies once; points are awarded after a successful hold. Early release loses rhythm credit without undoing the quantum repair. Repeated keydown events are ignored, but separate taps apply separate X operations.

| Lanes | Keyboard |
|---|---|
| 3 | D F J |
| 4 | D F J K |
| 5 | D F Space J K |
| 6 | S D F J K L |
| 7 | S D F Space J K L |

P / Escape pauses; pointer/touch receptors apply the same input. **Untimed practice** selects up to six representative packets, including holds, chords, bursts, and clean registers when the map supplies them. Practice holds use one press and do not score sustain timing. After pause/resume, re-press held keys to continue. W advances any practice packet when the player is satisfied with the correction; it does not reveal whether the answer was right. **Settings** adjusts note travel, input compensation, and still notes. The reduced-motion preference enables still notes by default. Mute silences audio while preserving the song clock.

A hit is Perfect within 45 ms, Great within 90 ms, or Good within 145 ms. Correct corrections earn 300/200/100 points. A perfectly timed healthy-qubit flip earns zero, adds an error, and breaks combo. Any key can occupy a rhythm timing slot; correctness depends on the current quantum residual, rather than a prescribed key order. Accuracy weights those judgements 1 / ⅔ / ⅓ and includes stray inputs in its denominator. Misses reset combo. A stray near a live packet applies an extra X; out-of-window strays penalize rhythm but do not alter a resolved register. The report separates correct-on-beat accuracy, correction-choice accuracy, combo, timing, whole-register restoration, and quantum reference preservation. Practice gets no rhythm rank.

The original Web Audio accompaniment is scheduled against AudioContext's clock. Song sections change its arrangement and the garden palette; correct hits add double expanding rings, a lane flare, particles, and a receptor rebound. Judgements pop into view with early/late millisecond feedback; holds pulse at contact and burst on completion. Missed beats fracture and fade with explicit Miss feedback; wrong corrections show Added an error. Hold completion and early release have distinct effects. Every ten consecutive scored notes triggers a streak banner, garden growth and a capybara reaction. Synthesized levels retain musical hit/recovery accents. Team-provided recordings play continuously with soft unpitched hit/error taps and no pitched recovery melody. Settings provide independent music and effects volumes; effects at 0% leaves the soundtrack alone. Reduced motion keeps text and static feedback without bursts. Authored fractional beat positions and optional tempo changes share one timeline for music, validation and judgement. Built-in maps use distinct repeating musical phrases with offbeats, rests and varying gaps; their melody makes correction beats audible. Automatic beat detection and online leaderboards are outside this MVP.

## Animation and theme changes

`feedback.js` owns the effect pool and motion; `feedback.css` supplies its styles independently of `main.css`. Load the effect stylesheet after the theme. A theme can override `--fx-hit`, `--fx-second` and `--fx-error` on `.highway`; defaults use the theme's accent/green, cyan/peach and danger colors. The effects use transforms and opacity, precomputed paths and reused browser animations. Reduced motion omits bursts and receptor movement.

When merging the wireframe design, retain these two effect files and the feedback calls in `game.js`, preserve the stylesheet link in each entry page, and rebuild `PLAY.html` from source. Resolve any generated-player conflict by rebuilding after merging the sources. Theme layout changes to the recovery line/receptors may require adjusting the effect positions in `feedback.css`.

## Add levels and music

**Your teammate's entry point is `content.js`.** Register authored maps, optional composers, or use the runtime event hooks. Maps support hold durations, simultaneous chords, rapid multi-step corrections, rest packets, music URLs/offsets, and section cues.

Read [level-making-rules.md](level-making-rules.md) for requirements and difficulty guidance. See [LEVEL_AUTHORING.md](LEVEL_AUTHORING.md) for the schema, examples, file limits, clock conventions, and reactive events. Add local soundtrack paths to `content-assets.json`; packaging includes them automatically. Players cannot upload music/maps or export charts. Qollab content comes from team-controlled source files; no writable player upload backend is required. Settings and scores remain in session memory.

## Learn

Four short lessons explain qubits, X/Z errors, encoding, and parity checks. The interactive four-qubit lab lets players inject one error and try X corrections. Repairing it gives equal checks and 100% ideal reference preservation; flipping the whole register afterward keeps the checks equal but creates logical X (one-third mean preservation across six inputs). This uses the same reference bank as gameplay and needs no additional backend job. Sources link to IBM Quantum.

## Local development and Qiskit

`dev.html` runs the exact JavaScript reference simulator. For locally executed Qiskit, install the pinned dependencies and generate the recorded bank:

```sh
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements.txt
.venv/bin/python tools/prepare_preview.py
python3 tools/build_standalone.py
```

Open `qiskit.html` with the server running to use that cached batch. Rebuild `PLAY.html` after source or content edits. It embeds the recorded bank when present and otherwise labels its exact local JS simulator. The snapshot itself is ignored by Git; the generated standalone player is committed.

## Qollab package

```sh
python3 tools/package_qollab.py
```

Create a JS / Qiskit project, upload the contents of `upload/` preserving `quantum/`, select a free simulator, and Run. The same files are in `qubit-tempo-qollab.zip`. `index.html` intentionally has no module script tag: Qollab executes `main.js`. It imports the Python namespace and calls `.callPromising` with Qollab's provided `backend`.

The runtime makes **one job containing 298 circuits at 64 shots each**. Restarting a map reuses its references. Circuits use H/S/S†/X/Z/CX and terminal measurement, with 3–7 data qubits plus 2–6 syndrome ancillas (5–13 physical qubits). No Aer, paid hardware, storage, POST, workers, or credentials are needed by the application. Failed backend setup stays visible rather than silently replacing Qiskit with another simulator.

Local BasicSimulator verification passes. The complete batch, audio, keyboard, pointer input, and authored content must still be tested inside the actual Qollab iframe, including the free IonQ simulator, before publication. This is not a claim of live Qollab or IonQ execution.

## Quantum model

A logical state `α|0⟩ + β|1⟩` is encoded across `d` data qubits as `α|0…0⟩ + β|1…1⟩`. These are not independent copies. Neighboring parity ancillas reveal relative bit flips without measuring the logical value. The game follows Qubit Symphony’s parity-decoding interaction: players infer faults without direct error-location hints. The lamps are syndromes, not logical-value measurements. In three lanes, `≠ =` identifies Q1, `≠ ≠` Q2, `= ≠` Q3, and `= =` means wait. Wider codes require the smallest set of flips that accounts for every parity check. Player mistakes can exceed the code’s guarantee or create a logical X with quiet lamps; the post-map state-preservation result exposes that failure.

The repetition code guarantees `floor((d−1)/2)` X errors: 3/4 → 1, 5/6 → 2, 7 → 3. Even-count half-flip patterns are ambiguous, so authored maps reject them. 4 and 6 add rhythm difficulty without increasing guaranteed correction capacity over 3 and 5. The code does not protect against phase errors. See [IBM's error-correction course](https://learning.quantum.ibm.com/course/foundations-of-quantum-error-correction/correcting-quantum-errors).

Rapid player corrections combine by XOR: two X operations on a lane cancel. The residual `injected error XOR applied corrections` determines ideal recovery. After undoing encoding and preparation, measuring all data qubits as zero tests overlap with the original encoded pure state.

The reference bank contains **248** computational-input error patterns (`8+16+32+64+128`) and **50** additional identity/logical-X cases (`5 counts × 2 residual classes × 5 other inputs`). Total: **298**. Zero residual preserves all six inputs; a full-register X preserves only the two X-basis inputs, averaging ⅓; all other residual patterns leave the code space, giving zero ideal overlap. This classification avoids batching every possible player sequence.

The six inputs are `|0⟩`, `|1⟩`, `|+⟩`, `|−⟩`, `|+i⟩`, and `|−i⟩`. The exact-class reduction is verified against every residual/input combination. On a noisy provider, sampled references are an estimate from those reference circuits; they do **not** model the full gate-noise history of an individual correction sequence. Register restoration in the game uses injected-error ground truth, while displayed checks are sampled from the backend and can be noisy. Each packet starts a fresh register. Rhythm speed is a teaching/game mechanic, not physical quantum correction timing or general fault tolerance.

## Validation

```sh
npm test
npm run test:quantum
```

The quantum check needs `.venv` or `QISKIT_PYTHON` pointing to Qiskit Python. Tests cover all guaranteed decoders and even-count ties; all built-in maps at every lane count; chords, rapid sequences, free correction order, live parity updates, perfectly timed wrong keys, misses and strays; timing; map validation; malformed backend data. The Qiskit cross-check compares **1,638 full complex statevectors** (1,488 residual/six-input combinations plus 150 actual correction circuits), and checks one 298-circuit BasicSimulator job against the JS reference bank.

Earlier revision verification on October 10: 16 model/gameplay/timing tests passed; the 1,638-statevector Qiskit cross-check passed with one 298-circuit reference job. Browser verification covered separate pages, four-lane practice, parity updates, pause/navigation, and the logical-X learning experiment. See `REVISION_NOTES.md` for final browser and packaging checks. Perceptual audio quality, device latency, and difficulty balance need human playtesting.

Accessibility includes native focus-managed dialogs, visible focus, labeled touch controls, keyboard equivalents, text/symbol clues, live announcements, untimed practice, adjustable travel/compensation, reduced motion, and sound controls. This is not a WCAG certification.

## Hackathon handoff

The repository's `CLAUDE.md` is the rule reference. This MVP includes Qiskit, local free-simulator verification, MIT application licensing, support acknowledgement, starting-point disclosure, and AI attribution. Remaining submission work: run and publish on Qollab, verify the free IonQ simulator, create the public 2–3 minute video and project page, confirm all rule requirements, and submit before the stated deadline. These steps have not been performed here.

For a short demo: show vertical gameplay and a seven-lane chord/burst; show the post-song rhythm/quantum report; explain why 7 qubits support three X flips; demonstrate the teammate map/music port; identify the actual Qollab backend and disclose the starting point and AI assistance.
