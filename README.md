# CapyQuantum — Qubit Tempo

## About

**Qubit Tempo** is an interactive rhythm game that makes **quantum error correction** easier to understand through music and hands-on learning.

🎵 **Read → Decide → Correct**

Players protect a quantum memory by reading *parity checks*, which indicate whether neighboring qubits agree **(=)** or differ **(≠)**. As each memory packet reaches the recovery line, players use the corresponding keys to apply bit-flip corrections. Harder levels introduce multiple corrections, faster sequences, and hold notes. *Correct timing alone is not enough:* choosing the wrong qubit can add an error instead of repairing one.

⚛ **Connect gameplay with quantum experiments**

The project runs a **live Qiskit recovery experiment** on the selected simulator and teaches corrections through an **exact ideal quantum model**. Results distinguish **rhythm performance**, **correction accuracy**, **ideal-model preservation**, and the separate live experiment, helping players understand what each result means.

📚 **Learn at your own pace**

An animated tutorial, four introductory lessons, untimed practice, and an interactive parity lab guide beginners through the concepts. The lab demonstrates a key limitation: *matching parity checks can still hide a logical error.*

With **ten song levels** and support for **three to seven data qubits**, Qubit Tempo introduces bit-flip error correction through an experience where players can experiment, make mistakes, and learn from the results.

**Theme:** Quantum Unlocked · **Application license:** MIT

This effort is supported by Qollab & IonQ

## ▶ Run on Qollab

1. Open [Qubit Tempo on Qollab](https://qollab.xyz/u/kevinshen/qubit-tempo) in a browser supported by Qollab, such as recent Chrome or Edge.
2. Click **Run**, choose the free **Built-in simulator**, and start the run. A free IonQ remote simulator can also be selected; paid hardware is not required.
3. Wait for the live quantum recovery experiment to finish. Follow or skip the six-step tutorial.
4. Select **Start experience → choose a level → Play**. Start with **Twinkle, Twinkle, Little Star**, or try **Untimed practice** first.
5. Use **D / F / J / K** for the default four lanes. Hold the chosen key for long notes. **P** or **Escape** pauses the game.

To create your own Qollab project from this repository, run:

```sh
python3 rhythm-game/tools/package_qollab.py
```

Choose **No template → Upload your own files** and upload `rhythm-game/qubit-tempo-qollab.zip`. Qollab detects the JS/Qiskit runtime from the entry files at the archive root and imports its README as the project-page write-up. See the [Qollab write-up](rhythm-game/QOLLAB_PROJECT.md) and [packaging instructions](rhythm-game/README.md).

## ▶ Play locally

From the repository root:

```sh
python3 -m http.server 8766 --bind 127.0.0.1
```

Open [http://127.0.0.1:8766/](http://127.0.0.1:8766/) for the standalone player. The committed player uses **recorded Qiskit BasicSimulator results** and submits no live backend job. For the exact JavaScript reference simulator, open [rhythm-game/dev.html](http://127.0.0.1:8766/rhythm-game/dev.html).

The live Qollab entry uses the simulator selected by the person pressing Run. Local playback and live Qollab execution are separate paths. The [game README](rhythm-game/README.md) explains setup, controls, and the quantum model.

## ⚛ What the quantum model demonstrates

One logical state is encoded across several data qubits. Ancillas extract neighboring parity checks, allowing players to infer bit-flip errors without measuring the logical value directly.

- **Correction capacity:** `floor((d−1)/2)` X errors for `d` data qubits. Four lanes guarantee one correction; seven guarantee three.
- **Logical errors:** flipping an entire register can leave all parity checks equal while changing the encoded information.
- **Separate outcomes:** rhythm accuracy, successful correction, and ideal-model preservation measure different things.

The Qollab runtime submits **one seven-qubit recovery circuit at 64 shots**. Gameplay uses the exact ideal model and reuses it across level replays. Each packet represents a fresh register; the live experiment is displayed separately.

## ⚛ How the quantum simulator is used

**Run → one live recovery experiment → exact-model gameplay**

When you press **Run**, Qollab supplies your selected backend to `main.js`. The Qiskit function `run_reference` in `quantum/rhythm.py` submits **one circuit in one job, repeated for 64 shots**. A *shot* is one circuit execution ending in measurement.

### The live experiment

1. Prepare **|+⟩** and encode it across **four data qubits**.
2. Inject a bit flip on **Q2**, then extract the three neighboring parity checks with ancillas. The ideal pattern is **≠ ≠ =**.
3. Apply an **X correction on Q2**, undo the encoding and input preparation, and measure the data and ancillas.

The circuit starts with **seven qubits: four data + three ancillas**. Backend routing can add physical qubits or gates. The simulator's advertised qubit capacity is not the number of gameplay lanes.

Open **Live results ↗** to view the **Live quantum recovery experiment**. It reports two separate measurements: how many shots restored this specific **|+⟩ input**, and how many produced the expected parity pattern. Ideal execution gives **64/64** for both. Noise can reduce either count. *This single-input experiment is not a general fidelity estimate or a test of every logical state.*

### While you play

**Rhythm gameplay uses the exact ideal quantum model**, independently of the selected backend's noisy measurements. Parity clues, immediate X corrections, and ideal-model preservation come from that model; timing and correction choices determine your score. The preservation examples compare six input states for the no-error and logical-X cases.

For example, correcting Q2 returns **≠ ≠ = → = = =**. Flipping every data qubit can leave equal checks while changing the logical information; averaging six input states exposes this limitation. The game supports **3–7 data qubits**, even though the separate live experiment always uses four.

**Key presses and level replays do not submit more quantum jobs.** Use Qollab **Stop → Run** to repeat the live experiment. Backend failures remain visible; the project does not silently replace the selected backend.

### What your simulator choice changes

| Simulator | Live recovery experiment |
|---|---|
| Built-in / AWS Braket local | Ideal operations |
| IBM noise-model simulators | Simulated device noise, running locally |
| IonQ remote simulators | Simulated IonQ device noise, running remotely |

Simulator choice changes the **live experiment**, while the educational gameplay stays ideal and consistent. The built-in simulator is a good first choice; paid physical hardware is not needed. [Qollab backend documentation](https://qollab.xyz/learn/docs/compute-backends)

A single circuit avoids the IonQ simulator's rejection of multi-circuit jobs and reduces the workload for browser-based IBM simulation. The complete **298-case reference bank** remains available for local Qiskit cross-checks; it is not submitted during a Qollab run.

Each packet represents a fresh register. This repetition code protects against bit flips, **not phase errors**, and does not reproduce the noisy history of player keystrokes. Rhythm speed is a teaching mechanic. The standalone `PLAY.html` uses recorded Qiskit results when embedded at build time; `dev.html` uses the exact JavaScript model. Neither submits a live Qollab experiment.

## 🛠 Develop and verify

The active game is in [`rhythm-game/`](rhythm-game/README.md). Qiskit setup and local reference generation are documented there.

```sh
npm test
npm run test:quantum
```

The quantum check requires Qiskit in `rhythm-game/.venv` or a `QISKIT_PYTHON` variable pointing to a Python installation with Qiskit. Local verification on October 11 passed **41 tests**, **1,638 complex-statevector comparisons**, and the **298-circuit BasicSimulator batch**. Live Qollab verification on October 11 also passed **all 14 free simulator choices**: built-in, AWS Braket, eight IBM models, and four IonQ models. See [compatibility evidence](rhythm-game/COMPATIBILITY.md). Paid hardware and formal hackathon submission are separate.

For team-authored levels, start with [LEVEL_AUTHORING.md](rhythm-game/LEVEL_AUTHORING.md) and [level-making-rules.md](rhythm-game/level-making-rules.md). Rebuild the standalone player after changing game source:

```sh
python3 rhythm-game/tools/build_standalone.py
```

## License, contributions, and history

Application code and documentation use the **MIT license**. Qiskit retains its Apache-2.0 license. Starting prototypes, teammate contributions, quantum references, visual inspiration, and **OpenAI Codex assistance** are disclosed in [ATTRIBUTION.md](rhythm-game/ATTRIBUTION.md).

The original Qubit Factory is preserved on [`codex/archive-qubit-factory-2026-10-10`](https://github.com/kevinhshen/CapyQuantum/tree/codex/archive-qubit-factory-2026-10-10) at commit `4bf75fd`. The active rhythm game builds on the team's earlier prototypes; its contribution is the educational interaction and implementation, rather than inventing repetition-code error correction.
