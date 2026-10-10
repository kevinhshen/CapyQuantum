# Qubit Drift — CapyQuantum

A playable orbital salvage and circuit-engineering prototype for Quantum Unlocked.

Fly a capybara courier through a gravity well, recover scrap, and build the quantum protection that keeps cargo intact. Clear four short contracts, repair broken circuits for bounties, and grow an idle recycler fleet.

This effort is supported by Qollab & IonQ.

## Play immediately

**Double-click `PLAY.html`.** It contains the whole game. No installation, server, API key, or account is required. Optional Google Fonts fall back to system fonts offline. A browser that supports Canvas and modern JavaScript is required. Some browsers restrict saving on file URLs; the game still runs, but use the Python server for reliable local saves.

Click **LAUNCH INTO THE BIT BELT**, or try the 20-second training flight. Cargo transmits automatically; steer for salvage and avoid collisions. Start with the installed bit shelter, then experiment with your own design.

| Control | Action |
|---|---|
| WASD / arrows | Thrust; momentum continues when released |
| Shift | Brake |
| Space | Dash; brief impact protection with a cooldown |
| P | Pause / resume |
| E | Pause and open circuit engineering |
| Pointer drag on empty space | Thrust toward the pointer |
| Mobile arrows | Touch steering and dash |

Win conditions are listed beneath each launch button. Survive the shift, deliver enough cargo, and meet its fidelity target. Failure still pays for delivered cargo and recovered scrap.

## Put it in the CapyQuantum repository

Copy this entire **`qubit-drift/` folder** into the CapyQuantum repository root. It is independent of the earlier lab and does not overwrite its files.

The build environment could not write into `/Users/Git Local/CapyQuantum`. This copy-ready folder was prepared separately; no commit or push was performed.

## Local server and Qiskit

From inside `qubit-drift/`:

```sh
python3 server.py
```

Open **http://127.0.0.1:8001**. The game works without additional packages. To enable the optional **VERIFY WITH QISKIT** button:

```sh
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
python server.py
```

Python 3.10+ is supported. Change ports with `python3 server.py --port 8002`. Stop with Ctrl+C. `PLAY.html` cannot use the server-only verification endpoint; export works without it.

## The game loop

1. **Build:** place encoder gates on a three-wire, eight-column board. Choose parity detection and write recovery rules.
2. **Fly:** steer with inertia and gravity, avoid orbiting debris, and collect amber scrap.
3. **Protect:** each fresh cargo pulse runs your actual circuit through an exact five-qubit simulation.
4. **Earn:** cargo fidelity and salvage determine credits. Success unlocks the next route.
5. **Upgrade:** improve hull, thrust, dash cooldown, salvage attraction, or the recycler fleet.

Routes introduce bit flips, phase flips, double flips, and an adaptive final encounter. The Clockwork Eye changes error type every ten seconds: pause and switch protection at the warnings. One three-qubit repetition code cannot protect against both error types simultaneously.

Three optional engineering bounties require repairing an incomplete encoder, correcting a wrong recovery rule, and converting bit protection into phase protection. Bounties test noiseless recovery and every single-error location, with a gate budget. They pay once per local save.

## Technical play: draw or program

The board is an actual encoder editor, not a decorative diagram. Select CX, choose a control, then a different target in the same column. H, X, Z, and erase act on individual cells. Decoder selectors determine the correction; changing a circuit pauses active flight.

The terminal uses a deliberately restricted circuit language:

```text
# Bit shelter
CX q0 q1
CX q0 q2
CHECK Z
RECOVER 00 NONE
RECOVER 01 q2
RECOVER 10 q1
RECOVER 11 q0
```

For phase protection, append `H q0`, `H q1`, `H q2` after the two CX gates and use `CHECK X`. `CHECK OFF` disables parity detection and correction for an unprotected reference. At most eight serial gates are allowed; the board also allows parallel gates. Compile with Ctrl/Command+Enter. Syntax errors leave the installed circuit intact. No arbitrary Python or JavaScript is evaluated.

**EXPORT CIRCUIT** produces executable Qiskit Python matching the installed encoder, parity basis, recovery table, and inverse decoder. The exported experiment checks all six input states and samples an X-basis readout.

## What is actually quantum?

The simulation represents complex amplitudes for five qubits: three data qubits and two syndrome ancillas. It applies player-defined H/X/Z/CX gates, injected I/X/Y/Z errors, parity extraction, ancilla-controlled recovery, and inverse encoding. The output data qubit is reduced to a density matrix and compared with the original input.

The bit shelter encodes `α|0⟩ + β|1⟩` as `α|000⟩ + β|111⟩`. These are not three independent copies. A phase sail adds H on all three encoded data qubits, checks parity in the X basis, and protects against single Z errors instead of single X errors.

The game's cargo score is **mean recovered-state fidelity across |0⟩, |1⟩, |±⟩, |±i⟩** for the pulse's error configuration. The wind tunnel reports the worst single-error location for each Pauli type. This prevents an apparently successful test of a convenient input from masquerading as general protection.

Cargo units, credits, ships, gravity weather, and hull upgrades are game fiction. Cargo units are a continuous game score proportional to mean fidelity, not physically sampled delivery counts. Each pulse is a fresh register and one correction round; this is not continuous quantum memory. All control gates are ideal. We do not claim general error correction, realistic noise, fault tolerance, or quantum speedup. The browser is ordinary computing simulating quantum operations.

## Qollab build

```sh
python3 build_qollab.py
```

Create a **JS / Qiskit** Qollab project. Copy the contents of `qollab/` to its root: `index.html`, `main.css`, `main.js`, `quantum/__init__.py`, and `quantum/engine.py`. Choose a free simulator.

The adapter replaces local verification with a `.callPromising` Python bridge. It executes the installed design on the selected simulator, submits one measured circuit with 256 shots, and reports sampled P(+) separately from ideal six-state fidelity. It rejects unsupported hardware and allows at most one submission attempt per project run. Rerun Qollab for another attempt.

Qollab's sandbox does not provide browser storage; progression is session-only there. Local saves are best-effort and gracefully fall back to in-memory play.

**Verification boundary:** the Python adapter was executed against Qiskit's BasicSimulator. Actual Qollab upload, JavaScript/Python bridge execution, sandbox input/animation behaviour, IonQ execution, and publication remain unverified. Upload and test before treating this as a valid submission. Browser-only play is not a Qollab submission.

Official platform reference: https://qollab.xyz/learn/docs/js-qiskit-projects

## Verification

```sh
node --test tests/*.test.mjs
```

The tests cover state preservation, phase and double-flip failures, decoder mistakes, circuit syntax, normalization, contract success/failure, adaptive boss behaviour, pause/abort, upgrades and income, one-time bounties, compilation, and drawing calls in a minimal DOM/canvas harness.

An independent Qiskit check compared **1,920 full statevectors and recovered-state fidelities**: five designs × 64 Pauli patterns × six input states. The executable Qiskit export and Qollab Python adapter were also run successfully. The fixture check is `tests/qiskit_crosscheck.py`; it accepts JS-generated fixtures on stdin.

The live preview server and file-URL browser navigation were blocked by environment policies. **Real-browser visual QA and human playtesting were not completed.** The DOM harness is not a replacement for testing movement feel, actual browser inputs, responsive layout, or educational effectiveness.

## Files

- `PLAY.html`: generated standalone launcher.
- `index.html`, `style.css`, `game.js`: source interface, original procedural art, physics, contracts and progression.
- `quantum.js`: exact statevector engine, circuit validation, DSL and Qiskit export.
- `server.py`: optional local server and independent Qiskit checks.
- `build_standalone.py`: rebuild `PLAY.html` after source edits.
- `build_qollab.py`: rebuild the Qollab adapter after source edits.
- `qollab/`: generated upload layout.
- `tests/`: quantum and gameplay checks.

## Attribution

Original interface and procedural artwork, with broad inspiration from incremental games, precision movement games, orbital simulators, ink illustration, and engineering puzzle games. No copied game art or characters from the cited inspirations.

Quantum reference: IBM Quantum, [Repetition codes](https://quantum.cloud.ibm.com/learning/en/courses/foundations-of-quantum-error-correction/correcting-quantum-errors/repetition-codes). The underlying codes are established; the game and interaction are the contribution.

Code and artwork were created with OpenAI Codex assistance. Disclose AI assistance and subsequent team contributions on the submission page. MIT licensed; third-party dependencies retain their own licences.
