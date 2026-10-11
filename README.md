# CapyQuantum — Qubit Tempo

## About

**Qubit Tempo** is an interactive rhythm game that makes **quantum error correction** easier to understand through music and hands-on learning.

🎵 **Read → Decide → Correct**

Players protect a quantum memory by reading *parity checks*, which indicate whether neighboring qubits agree **(=)** or differ **(≠)**. As each memory packet reaches the recovery line, players use the corresponding keys to apply bit-flip corrections. Harder levels introduce multiple corrections, faster sequences, and hold notes. *Correct timing alone is not enough:* choosing the wrong qubit can add an error instead of repairing one.

⚛ **Connect gameplay with quantum experiments**

The project uses **Qiskit reference circuits** on the selected simulator. Results separate **rhythm performance**, **correction accuracy**, and **preservation of the original quantum information**, helping players understand the consequences of their choices.

📚 **Learn at your own pace**

An animated tutorial, four introductory lessons, untimed practice, and an interactive parity lab guide beginners through the concepts. The lab demonstrates a key limitation: *matching parity checks can still hide a logical error.*

With **ten song levels** and support for **three to seven data qubits**, Qubit Tempo introduces bit-flip error correction through an experience where players can experiment, make mistakes, and learn from the results.

**Theme:** Quantum Unlocked · **Application license:** MIT

This effort is supported by Qollab & IonQ

## ▶ Run on Qollab

1. Open the published project in a browser supported by Qollab, such as recent Chrome or Edge.
2. Click **Run**, choose the free **Built-in simulator**, and start the run. A free IonQ remote simulator can also be selected; paid hardware is not required.
3. Wait for the quantum reference experiments to finish. Follow or skip the six-step tutorial.
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
- **Separate outcomes:** rhythm accuracy, successful correction, and quantum reference preservation measure different things.

The Qollab runtime batches **298 reference circuits at 64 shots each into one job**, using at most **13 physical qubits**. Level replays reuse the results. Each packet represents a fresh register. This model focuses on bit flips, does not protect against phase errors, and does not model the complete noisy gate history of each player input. The falling speed is a teaching mechanic.

## ⚛ How the quantum simulator is used

**Run → quantum experiments → reference bank → gameplay**

The simulator calculates quantum measurement outcomes used by the game. It runs a batch of reference experiments when Qollab starts the project, and gameplay reuses those results.

### 1. When you press Run

Qollab passes the selected simulator to `rhythm-game/main.js`, which calls the Qiskit code in `rhythm-game/quantum/rhythm.py`. The project builds **298 circuits** covering error patterns for **3–7 data qubits**, including six-input references for the no-error and logical-flip cases.

Each circuit prepares an input state, encodes it across the data qubits, injects an X-error pattern, and extracts neighboring parity checks using ancillas. It then undoes the encoding and input preparation and measures the register. These measurements supply both the parity outcomes and a reference for how well the original state was preserved.

All circuits are submitted in **one backend job**, with **64 shots per circuit**. A *shot* is one repetition of a circuit ending in a measurement. The resulting counts are stored in a reference bank for the current run. Circuits use **5–13 physical qubits**, including the ancillas; the simulator's displayed qubit count is its capacity, not the number our game always uses.

### 2. While you play

- **Initial parity clues** are sampled from the backend's measurement counts for the packet's injected error pattern.
- **Your key presses** apply bit flips in the JavaScript game model and update the displayed checks immediately.
- **Correction accuracy and memories restored** are calculated from the known injected errors and your accumulated flips.
- **Reference preservation** is looked up using the error pattern remaining after your corrections. No-error and logical-flip cases average the six input-state references.

**Each key press does not submit a quantum job.** Music, animation, timing, scoring, and immediate correction updates run in the browser. Changing or replaying a level reuses the same bank. Use Qollab **Stop → Run** to start a fresh simulator job.

For example, on an ideal simulator a bit flip on **Q2** in a four-data-qubit register gives **≠ ≠ =**. Flipping Q2 again returns the checks to **= = =** and restores the state. Flipping every data qubit afterward also leaves equal checks, but can change the logical information; the preservation references expose that limitation.

### 3. What the simulator choice changes

| Simulator | Reference experiments |
|---|---|
| Built-in / AWS Braket local | Ideal quantum operations |
| IBM noise-model simulators | Simulated device noise, running locally |
| IonQ remote simulators | Simulated IonQ device noise, running remotely |

Start with the **free built-in simulator** for clear learning examples. A noise-model simulator can produce imperfect parity clues and lower reference preservation. These simulator options are software models; physical IonQ hardware is a separate choice. [Qollab backend documentation](https://qollab.xyz/learn/docs/compute-backends)

The noisy results describe **reference experiments**, not the complete gate-noise history of every player correction sequence. Each packet is a fresh register, and rhythm speed is a learning mechanic. The standalone `PLAY.html` uses recorded Qiskit results when a bank was embedded at build time; `dev.html` uses the exact JavaScript model. Neither submits a live Qollab job.

## 🛠 Develop and verify

The active game is in [`rhythm-game/`](rhythm-game/README.md). Qiskit setup and local reference generation are documented there.

```sh
npm test
npm run test:quantum
```

The quantum check requires Qiskit in `rhythm-game/.venv` or a `QISKIT_PYTHON` variable pointing to a Python installation with Qiskit. Local verification on October 11 passed **39 tests**, **1,638 complex-statevector comparisons**, and the **298-circuit BasicSimulator batch**. Live Qollab/IonQ testing, publication, and formal submission remain separate verification steps.

For team-authored levels, start with [LEVEL_AUTHORING.md](rhythm-game/LEVEL_AUTHORING.md) and [level-making-rules.md](rhythm-game/level-making-rules.md). Rebuild the standalone player after changing game source:

```sh
python3 rhythm-game/tools/build_standalone.py
```

## License, contributions, and history

Application code and documentation use the **MIT license**. Qiskit retains its Apache-2.0 license. Starting prototypes, teammate contributions, quantum references, visual inspiration, and **OpenAI Codex assistance** are disclosed in [ATTRIBUTION.md](rhythm-game/ATTRIBUTION.md).

The original Qubit Factory is preserved on [`codex/archive-qubit-factory-2026-10-10`](https://github.com/kevinhshen/CapyQuantum/tree/codex/archive-qubit-factory-2026-10-10) at commit `4bf75fd`. The active rhythm game builds on the team's earlier prototypes; its contribution is the educational interaction and implementation, rather than inventing repetition-code error correction.
