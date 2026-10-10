# Qubit Tempo — CapyQuantum rhythm MVP

**Three qubits. Two clues. One well-timed correction.** Read neighboring parity signals, choose the faulty qubit, and apply a correction to the beat. No quantum background required.

Theme: **Quantum Unlocked** · Qollab + IonQ hackathon 2026

This effort is supported by Qollab & IonQ

This is an additional MVP inside `rhythm-game/`. The main-branch Qubit Factory remains a separate game. See [ATTRIBUTION.md](ATTRIBUTION.md) for starting points and AI disclosure. Application license: MIT.

## Play immediately

**Double-click `PLAY.html`.** It includes the entire game and a recorded 128-shot Qiskit BasicSimulator batch for every supported case. No installation, account, server, external assets, storage, or paid hardware is required. The file clearly identifies its recorded results; it does not submit a live backend job.

- **Learn to play:** six untimed rounds, then a report. The first four teach the rules; the final two ask you to apply them without a direct hint.
- **Rhythm run:** 40 fresh correction rounds at 96 BPM, roughly 55 seconds. Clean rounds are included, so unnecessary taps can damage the state.
- **Two-error experiment:** compare Q3 flipping once with Q1 + Q2 flipping simultaneously. Same ideal syndrome, different correctable status.

| Control | Action |
|---|---|
| A / S / D | Apply X to Q1 / Q2 / Q3 |
| W, in practice | Leave a clean round alone |
| P | Pause / resume the rhythm run |
| Pointer / touch | Use the equivalent correction buttons |
| Relaxed tempo | 70 BPM, roughly 72 seconds; select before starting |
| Still notes | Display a stationary current round with a countdown |
| Sound | Toggle original synthesized percussion and correction tones |

Two checks compare Q1–Q2 and Q2–Q3. Different / same → A; different / different → S; same / different → D; same / same → wait. This decoder assumes at most one bit flip. The note dots hide the logical value; they are lane markers, not measurements of the data qubits.

Timing window: ±230 ms; perfect ≤75 ms, great ≤150 ms. A correct tap earns 150 / 125 / 100 points for perfect / great / good timing. A correctly untouched clean round earns 100. Wrong choices and missed corrections earn zero. Inputs outside the window do not apply a correction. Repeated keydown events are ignored. Hiding the page, leaving the window, or a frame delay over 1.5 seconds pauses the run.

The report separates correction choices, perfect hits, streak, and physical state preservation. A no-input round is not counted as a perfectly timed tap. The seeded ideal-backend chart repeats, so replay can serve as deliberate practice.

## Local development

From this folder:

```sh
python3 -m http.server 8766 --bind 127.0.0.1
```

Open `http://127.0.0.1:8766/dev.html` for the exact JavaScript simulator. This preview has no dependencies and is labeled as a local simulation.

For **actual local Qiskit results**:

```sh
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements.txt
.venv/bin/python tools/prepare_preview.py
```

With the server running, open `http://127.0.0.1:8766/qiskit.html`. This loads the generated cached BasicSimulator shots. Rebuild the standalone player after source changes with `python3 tools/build_standalone.py`; when `qiskit-results.json` exists it embeds those results, otherwise it uses the labeled local simulator.

## Run on Qollab

1. Create a **JS / Qiskit** project.
2. Run `python3 tools/package_qollab.py` locally.
3. Upload the contents of `upload/` at the Qollab project root, preserving the `quantum/` directory. The zip provides the same 10-file package for sharing; use the platform's supported upload interface.
4. Select a free simulator, preferably the built-in ideal simulator for a first demo, and press Run.
5. Verify keyboard, touch, audio, all lesson rounds, both lab cases, and a complete run inside the actual Qollab iframe before publishing.

Runtime files: `index.html`, `main.js`, `main.css`, `game.js`, `model.js`, `quantum/__init__.py`, `quantum/rhythm.py`. License, README, and attribution are included. Do not upload development environments, local preview files, snapshots, tests, or `PLAY.html` as the Qollab runtime.

Qollab owns execution of `main.js`; its `index.html` intentionally has no browser module script tag. The entry imports `quantum.rhythm` as a namespace and calls Python through `.callPromising`. It uses the platform-provided `backend`, with exactly one `backend.run([...], shots=128)` call. Every error mask and supported player action is batched at startup: 8 masks × 4 actions × 6 input states = **192 five-qubit circuits**. Replaying the game reuses the returned results and does not submit another job. A failed backend setup is reported; it does not silently substitute browser-only results.

The circuits use H, S, S†, X, Z, and CX with terminal measurements. No dynamic circuits, Aer, paid hardware, network POST, workers, browser storage, or credentials are needed by the application. Provider-specific limits still require a real platform test, particularly for the full 192-circuit batch on the free IonQ simulator.

## Why this is quantum error correction

One logical state `α|0⟩ + β|1⟩` is encoded as `α|000⟩ + β|111⟩`; these are not three independent copies. Two additional ancilla qubits acquire the neighboring parity syndromes. The player applies a candidate X recovery. The quantum model keeps coherent amplitudes, so the experiment includes superpositions and phase-sensitive inputs rather than checking only a classical bit.

For each injected error and candidate correction, the validation prepares all six states `|0⟩`, `|1⟩`, `|+⟩`, `|−⟩`, `|+i⟩`, `|−i⟩`. After correction, it undoes the encoding and input preparation and measures the three data qubits. **P(000) is fidelity with the original encoded pure state**. The report averages this quantity across all six inputs. This checks state restoration; it is not majority-vote decoding or a claim that every player round independently runs all six preparations.

Ideal results:

| Injected error | Recovery | Mean encoded-state preservation |
|---|---|---|
| None | Wait | 100% |
| One X, any location | X on the same location | 100% |
| One X | Wait, or X on a wrong location | 0% |
| Q1 + Q2 flip | Syndrome rule selects Q3 | 33⅓% |

The double-error recovery leaves a triple X, which becomes a logical X. The two X-basis inputs survive that logical operation; the four Z/Y-basis inputs do not. Thus the six-state mean is 1/3. Agreement of the parity checks alone does not establish that the logical state survived.

The novel application is making the player act as a human decoder to a beat, with distinct timing and reasoning feedback and a hands-on ambiguity experiment. The repetition code itself is established science. No learning-outcome improvement has been measured yet.

## Scope and limits

- The scored run includes at most one injected X error per fresh register. Double errors appear in the separate lab.
- It does not correct general quantum noise or phase errors, or model continuous memory, realistic hardware timing, or fault tolerance.
- Rhythm is an educational mechanic, not a representation of physical correction speed.
- Scores are game points. State-preservation percentages are exact local values or sampled backend estimates, explicitly labeled.
- On noisy backends, observed syndromes may disagree with injected-error ground truth. Choice scoring follows the displayed decoder rule; preservation comes from the separately batched circuit experiment.
- All measurements are terminal. The ancillas retain the earlier syndrome while the data undergo recovery and validation. This is equivalent for the ideal syndromes used here, but is not a demonstration of live classical-feedback control on hardware.

## Verification

```sh
npm test
npm run test:quantum
```

The second command needs the local `.venv` above. Alternatively set `QISKIT_PYTHON` to an existing Qiskit Python executable. The quantum cross-check compares every complex amplitude of **192 full statevectors**, compares BasicSimulator syndromes and preservation with the JS model, and asserts exactly one backend job. Unit tests cover single-error correction, all double-error ambiguities, damage from wrong corrections, normalization, seeded charts, timing versus choice, clean rounds, and invalid backend output.

Accessibility features include semantic buttons and tables, native dialog focus, visible keyboard focus, text and symbols in addition to color, announced feedback and current clues, untimed practice, relaxed tempo, optional static notes, reduced-motion defaults, and touch-sized actions. This is not a WCAG certification; assistive-technology testing remains useful.

Browser checks on October 10: completed all six practice rounds using keyboard and pointer controls; verified the single/double-error lab; registered a Perfect keyboard hit; completed a full 40-round Qiskit-backed run; verified pause; checked the 390-pixel mobile layout without horizontal overflow; loaded the packaged single-file player over HTTP with its recorded Qiskit results. No browser console errors were observed. Direct `file://` testing was blocked by the automation browser's URL policy, so manually confirm double-click playback in your ordinary browser. Sound is implemented, but perceptual audio quality and input feel still need human playtesting.

## Submission readiness

See the root `CLAUDE.md` for the team's copied rules. This MVP includes Qiskit, free local simulator verification, MIT licensing, attribution, starting-point disclosure, a project-page draft below, and a demo outline. **Actual Qollab execution, free IonQ execution, publication, and the public demo video remain submission tasks.** Local testing alone does not establish a valid hackathon submission. Deadline recorded in `CLAUDE.md`: October 11, 2026 at 19:00 ET.

## Suggested project page

**Qubit Tempo** turns quantum error correction into a rhythm game. Players read two parity clues, select a qubit, and apply a correction on the beat. Six short practice rounds introduce the rules with no quantum background required. A separate experiment shows why the same clues can hide a double-error failure.

The problem we explore is how to make syndrome decoding intuitive while keeping the limits of the code visible. The Qollab version runs 192 five-qubit Qiskit experiments in one simulator job, including six quantum input states for each error and candidate recovery. Players see separate feedback for correction choices and timing, plus state-preservation results after a run.

To run, choose a free simulator and press Run, then Learn to play. Use A / S / D or the touch buttons. See the README for circuit layout, validation, limitations, and extensions. The application is MIT licensed. It builds on the team's earlier CapyQuantum factory MVP and the standard three-qubit repetition code; OpenAI Codex assisted with code, original assets, tests, and documentation. This effort is supported by Qollab & IonQ.

## 2–3 minute demo outline

1. **0:00–0:25:** Explain the goal: protect one quantum state by reading two clues; show the three controls.
2. **0:25–0:55:** Play the guided middle-qubit and clean-round examples.
3. **0:55–1:35:** Play part of a rhythm run. Show a correctly timed hit and explain separate choice/timing feedback.
4. **1:35–2:10:** Open the double-error lab. Same clues, different preservation; explain the single-error assumption.
5. **2:10–2:40:** Show the selected Qollab free simulator and briefly explain the single Qiskit batch, six-state checks, MIT license, starting point, and AI assistance.

Record the actual Qollab version after it passes its platform test. Upload a public video that opens without sign-in; do not describe the local recorded player as a live Qollab run.

## Extend it

Keep `model.js` `buildOps` and `quantum/rhythm.py` `build_circuit` synchronized. Extend `allSpecs()` and the Python batch-size validation for new cases, then rerun the full quantum cross-check. Five data qubits could support a two-error lesson; phase protection should be taught as a separate code/basis rather than added as a cosmetic note type.
