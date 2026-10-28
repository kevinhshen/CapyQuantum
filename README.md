# Cappy Quantum

### Qubit Tempo — learn quantum error correction through rhythm

**Cappy Quantum** is a Quantum Unlocked hackathon project built around **Qubit Tempo**, a browser-based rhythm game that introduces quantum error correction through music, visual clues, and hands-on experiments.

Players protect an encoded quantum memory by reading parity checks, identifying bit-flip errors, and applying corrections on the beat. The project connects this interaction to **Qiskit quantum circuits executed on a selected quantum-computing simulator through Qollab**, including IonQ simulator options.

**[Play on Qollab](https://qollab.xyz/u/kevinshen/qubit-tempo)** · [Game documentation](rhythm-game/README.md) · [Simulator verification](rhythm-game/COMPATIBILITY.md) · [Attribution](rhythm-game/ATTRIBUTION.md)

**Hackathon theme:** Quantum Unlocked · **Application license:** MIT  
This effort is supported by Qollab & IonQ.

## The idea

Quantum information can be damaged by errors. Quantum error correction encodes one logical qubit across multiple data qubits and uses auxiliary qubits to reveal information about errors without directly reading out the encoded logical value.

Qubit Tempo makes that process playable:

1. **Read:** neighboring parity checks show whether qubits agree (**=**) or differ (**≠**).
2. **Decide:** infer the smallest set of bit flips consistent with those checks.
3. **Correct:** press the corresponding lane keys when the memory packet reaches the recovery line.
4. **Reflect:** compare rhythm performance, correction choices, and preservation of the encoded state.

A correctly timed press on the wrong lane can introduce an error. Matching parity checks can also hide a logical error. Both are deliberate parts of the learning experience.

The game includes a six-step animated tutorial, four introductory lessons, untimed practice, an interactive parity lab, and ten song levels with **3–7 data-qubit lanes**.

## Quantum technologies used

| Technology or concept | Role in the project |
|---|---|
| **Qiskit** | Constructs quantum circuits, transpiles them for a selected backend, executes the recovery experiment, and reads measurement counts. |
| **Qollab** | Hosts the JavaScript/Python experience and supplies the simulator backend selected when the user presses Run. |
| **IonQ remote simulators** | Provide a remote execution option for the Qiskit recovery circuit, with simulated IonQ device noise. |
| **Other Qollab simulators** | Built-in and AWS Braket local options provide ideal execution; IBM noise-model options simulate device noise locally. |
| **Quantum repetition code** | Encodes a logical state across several data qubits to demonstrate protection against Pauli-X bit flips. |
| **Superposition and entanglement** | The live experiment prepares a superposition and uses controlled-NOT gates to produce an entangled encoded state. |
| **Ancillas and parity extraction** | Auxiliary qubits record neighboring parity checks, also called the error syndrome. |
| **Quantum gates and measurement** | H, X, and CX gates prepare, encode, disturb, and recover the live test state; terminal measurements produce the results. |
| **Exact statevector simulation** | A JavaScript model supplies ideal quantum predictions for responsive gameplay and is cross-checked against Qiskit. |

**The selected execution path uses simulators running on classical computers.** It executes quantum circuits in simulation; physical quantum hardware is not required, and hardware execution has not been verified. The project's contribution is an interactive way to teach quantum error correction, with circuit-based experiments and validation.

## How the quantum simulator is used

The application has two connected parts: a **live backend experiment** and an **ideal model for gameplay**.

### 1. A live quantum recovery experiment

When a user presses **Run** on Qollab, [`main.js`](rhythm-game/main.js) passes the selected backend to Qiskit's [`run_reference`](rhythm-game/quantum/rhythm.py). It submits **one seven-qubit circuit in one job, repeated for 64 shots**. A shot is one execution of the circuit ending in measurement.

The experiment:

1. Prepares the logical input **|+⟩**, an equal superposition of |0⟩ and |1⟩.
2. Encodes it across **four data qubits**, using CX gates.
3. Injects an X error on **Q2**.
4. Extracts three neighboring parity checks into **three ancilla qubits**. The expected syndrome is **≠ ≠ =**.
5. Applies a predetermined X correction to Q2.
6. Reverses the encoding and input preparation, then measures the data and ancillas.

The circuit starts with **four data qubits + three ancillas**. Backend routing can add physical qubits or gates. The syndrome is stored before correction and read at the end; this demonstration uses terminal measurements and a known correction rather than a dynamic feedback decoder.

The **Live quantum recovery experiment** panel reports the number of shots that restored this specific input and the number that produced the expected syndrome. Ideal execution gives **64/64** for both; simulated noise can reduce either count.

This is a fixed, single-input recovery demonstration. In particular, |+⟩ is unchanged by a logical X, so this experiment alone cannot establish preservation of arbitrary quantum information.

### 2. Immediate feedback during gameplay

After the experiment, gameplay uses the [exact ideal model](rhythm-game/model.js) for parity clues, corrections, and preservation feedback. A key press applies an X operation in that model. Each packet represents a fresh encoded register.

**Key presses and level replays do not submit additional backend jobs.** Qollab **Stop → Run** repeats the live experiment. The standalone player instead embeds recorded Qiskit BasicSimulator results, and the development player runs the JavaScript model locally.

| Execution path | Quantum calculation | Live backend job? |
|---|---|---|
| Qollab launch | Selected backend executes the fixed recovery circuit | Yes: one circuit, 64 shots |
| Qollab gameplay | Exact ideal JavaScript quantum model | No |
| Standalone `PLAY.html` | Recorded Qiskit results embedded in the committed build | No |
| Development `dev.html` | Exact JavaScript statevector simulation | No |

Changing the selected simulator changes the live experiment's measurements. Gameplay remains ideal and consistent. Backend failures are displayed rather than silently replaced with another backend.

## What the error-correction model teaches

A logical state is encoded as:

```text
α|0⟩ + β|1⟩  →  α|00…0⟩ + β|11…1⟩
```

These data qubits form one encoded state; they are not independent copies of an unknown qubit.

For three data qubits, assuming at most one bit flip:

| Parity checks | Inferred error | Correction |
|---|---|---|
| = = | No bit flip | None |
| ≠ = | Q1 | X on Q1 |
| ≠ ≠ | Q2 | X on Q2 |
| = ≠ | Q3 | X on Q3 |

With `d` data qubits, the repetition code guarantees correction of up to `floor((d−1)/2)` X errors. Three or four data qubits guarantee one correction; seven guarantee three.

The parity lab also demonstrates **logical errors**: flipping every data qubit leaves all neighboring checks equal but can change the logical information. The ideal preservation examples compare six input states, including computational and superposition states, to expose what a single input can miss.

**Scope:** this repetition code protects against bit flips, not phase errors. The project does not demonstrate general fault tolerance, quantum speedup, or the complete noisy history of player actions. Rhythm speed is a teaching mechanic, not a physical quantum processor's correction rate.

## Design decisions

| Decision | Reason |
|---|---|
| **Make error correction a rhythm game** | Gives players a repeated read–decide–correct loop with immediate consequences and increasing difficulty. |
| **Use a repetition code** | Keeps encoding, syndrome clues, and correction choices understandable for beginners. |
| **Show parity clues instead of revealing faulty lanes** | Makes the player reason from error information, rather than simply follow highlighted answers. |
| **Separate rhythm, correction, and preservation results** | Prevents good timing or equal parity checks from being mistaken for successful quantum recovery. |
| **Keep gameplay ideal and the live experiment separate** | Supports immediate feedback while making backend noise visible in its own results. |
| **Submit one circuit per Qollab run** | Avoids the IonQ simulator's observed rejection of multi-circuit jobs and reduces browser simulation workload. |
| **Include practice and accessibility controls** | Lets players explore the concepts without timing pressure, with reduced motion, sound controls, and text/symbol clues. |

The full **298-case Qiskit reference bank** remains available for local cross-checks; it is not submitted during a Qollab run.

## Run the project

### Play on Qollab

1. Open [Qubit Tempo](https://qollab.xyz/u/kevinshen/qubit-tempo).
2. Press **Run** and choose a simulator. The free **Built-in** simulator is a simple starting point; an **IonQ remote simulator** provides another execution option.
3. Wait for the recovery experiment to finish, then follow the tutorial or try **Untimed practice**.
4. Select a song and play. The default four lanes use **D / F / J / K**. Hold the chosen key for long notes; **P / Escape** pauses.

No paid hardware is required. The [compatibility record](rhythm-game/COMPATIBILITY.md) documents observed simulator results and their limits.

### Play locally

From the repository root:

```sh
python3 -m http.server 8766 --bind 127.0.0.1
```

Open [http://127.0.0.1:8766/](http://127.0.0.1:8766/) for the standalone player, or [the development player](http://127.0.0.1:8766/rhythm-game/dev.html) for the exact JavaScript simulator. Neither local path submits a live Qollab job.

### Package for Qollab

```sh
python3 rhythm-game/tools/package_qollab.py
```

Choose **No template → Upload your own files** and upload `rhythm-game/qubit-tempo-qollab.zip`. The packager uses [QOLLAB_PROJECT.md](rhythm-game/QOLLAB_PROJECT.md) as the uploaded project-page write-up. See the [game README](rhythm-game/README.md) for the full upload workflow.

## Development and verification

The active application lives in [`rhythm-game/`](rhythm-game/README.md).

| Area | Entry points |
|---|---|
| Game interface and interaction | `game.js`, `rhythm.js`, `main.css` |
| Quantum circuits and backend execution | `quantum/rhythm.py`, `main.js` |
| Ideal quantum model and results | `model.js`, `reference.js` |
| Tutorial, songs, and team content | `tutorial.js`, `songs.js`, `content.js` |
| Tests and packaging | `tests/`, `tools/` |

From the repository root:

```sh
npm test
npm run test:quantum
```

The quantum check requires Qiskit in `rhythm-game/.venv` or a `QISKIT_PYTHON` variable pointing to a Python installation with Qiskit. Setup instructions are in the [game README](rhythm-game/README.md).

**Recorded verification on October 11, 2026:** 41 Node tests, 1,638 complete complex-statevector comparisons against Qiskit, and a 298-circuit BasicSimulator batch passed. The compatibility report also records successful runs on 14 free Qollab simulator choices. These are dated observations, not guarantees of current backend availability or evidence of educational effectiveness. See [COMPATIBILITY.md](rhythm-game/COMPATIBILITY.md).

For new levels, read [LEVEL_AUTHORING.md](rhythm-game/LEVEL_AUTHORING.md) and [level-making-rules.md](rhythm-game/level-making-rules.md). After changing game source, rebuild the standalone player:

```sh
python3 rhythm-game/tools/build_standalone.py
```

## License, attribution, and history

Application code and documentation use the [MIT license](LICENSE). Qiskit retains its Apache-2.0 license. Team prototypes, teammate contributions, quantum references, visual inspiration, and **AI assistance (OpenAI Codex, Claude)** are disclosed in [ATTRIBUTION.md](rhythm-game/ATTRIBUTION.md).

The original Qubit Factory prototype is preserved on [`codex/archive-qubit-factory-2026-10-10`](https://github.com/kevinhshen/CapyQuantum/tree/codex/archive-qubit-factory-2026-10-10) at commit `4bf75fd`. Cappy Quantum builds on the team's earlier work; its contribution is the educational interaction and implementation of established quantum error-correction concepts.
