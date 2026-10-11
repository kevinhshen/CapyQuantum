# Qubit Tempo — learn quantum error correction through rhythm

**Demo video:** [Watch Qubit Tempo](https://drive.google.com/file/d/1ZAGesFAq3CTCUjCGP0y8OCDTDSiJbviY/view?usp=sharing)

## About

**Qubit Tempo** is an interactive rhythm game that makes **quantum error correction** easier to understand through music and hands-on learning.

🎵 **Read → Decide → Correct**

Players protect a quantum memory by reading *parity checks*, which indicate whether neighboring qubits agree **(=)** or differ **(≠)**. As each memory packet reaches the recovery line, players use the corresponding keys to apply bit-flip corrections. Harder levels introduce multiple corrections, faster sequences, and hold notes. *Correct timing alone is not enough:* choosing the wrong qubit can add an error instead of repairing one.

⚛ **Connect gameplay with quantum experiments**

The project runs a **live Qiskit recovery experiment** on the selected simulator and teaches corrections through an **exact ideal quantum model**. Results distinguish **rhythm performance**, **correction accuracy**, **ideal-model preservation**, and the separate live experiment, helping players understand what each result means.

📚 **Learn at your own pace**

An animated tutorial, four introductory lessons, untimed practice, and an interactive parity lab guide beginners through the concepts. The lab demonstrates a key limitation: *matching parity checks can still hide a logical error.*

With **ten song levels** and support for **three to seven data qubits**, Qubit Tempo introduces bit-flip error correction through an experience where players can experiment, make mistakes, and learn from the results.

**Theme: Quantum Unlocked.** The problem we explore is how to make quantum error correction understandable to someone with no quantum background. Players learn by making corrections, seeing the checks change, and comparing their rhythm performance with whether they actually restored the quantum memory.

## How to run on Qollab

1. Use a recent Chrome or Edge browser, or another browser supported by Qollab's runtime.
2. Click **Run**, choose the free **Built-in simulator**, and start the run. You can also choose a free simulator from the **Remotely run simulators** group for IonQ; hardware is not required.
3. Wait for the live quantum recovery experiment to finish. Follow the six-step tutorial, or skip it to reach Home.
4. Select **Start experience**, choose a level, and press **Play**. Start with **Twinkle, Twinkle, Little Star**, or use **Untimed practice** to learn the checks without a timing score.
5. Use **D, F, J, K** for the default four qubits. Press the key for the qubit you want to flip when its packet reaches the recovery line. Hold the chosen key for long notes. Equal checks can mean no correction is needed.

Press **P** or **Escape** to pause. On resume, re-press any held keys. Touch and pointer controls are available on the receptors. **Settings** includes music/effects volume, input compensation, note travel, and reduced motion. **Learn** includes four quantum lessons and an interactive parity lab. In practice, **W** advances to the next packet.

The game has ten synthesized song levels and supports 3–7 data qubits. The keyboard layout for the selected lane count is shown in the game. After a level, the report separates correct-on-beat accuracy, correction choices, restored memories, and reference-state preservation.

## ⚛ How the quantum simulator is used

**Run → one live recovery experiment → exact-model gameplay**

When you press **Run**, Qollab supplies your selected backend to `main.js`. The Qiskit function `run_reference` in `quantum/rhythm.py` submits **one circuit in one job, repeated for 64 shots**. A *shot* is one circuit execution ending in measurement.

### The live experiment

1. Prepare **|+⟩** and encode it across **four data qubits**.
2. Inject a bit flip on **Q2**, then extract the three neighboring parity checks with ancillas. The ideal pattern is **≠ ≠ =**.
3. Apply an **X correction on Q2**, undo the encoding and input preparation, and measure the data and ancillas.

The circuit starts with **seven qubits: four data + three ancillas**. Backend routing can add physical qubits or gates. The simulator's advertised qubit capacity is not the number of gameplay lanes.

The **Live quantum recovery experiment** panel reports two separate measurements: how many shots restored this specific **|+⟩ input**, and how many produced the expected parity pattern. Ideal execution gives **64/64** for both. Noise can reduce either count. *This single-input experiment is not a general fidelity estimate or a test of every logical state.*

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

## Understand and extend it

The source is available in the Code tab and in the [CapyQuantum repository](https://github.com/kevinhshen/CapyQuantum), under `rhythm-game/`.

- `quantum/rhythm.py`: Qiskit circuit construction and the single backend job.
- `model.js`: parity decoding and reference-result interpretation.
- `songs.js`, `maps.js`, and `timing.js`: song arrangements, charts, and the shared musical timeline.
- `rhythm.js`: input judgement, correction state, holds, and scoring.
- `game.js`, `tutorial.js`, and `audio.js`: interface, lessons, tutorial, and audio.
- `content.js`: team-authored content entry point. See `LEVEL_AUTHORING.md` and `level-making-rules.md` for chart requirements.

Qiskit is the only required Python dependency. No API keys, paid hardware, downloaded soundtrack, or external application service is required. Settings and scores last for the current run only.

## Starting points and contributions

The rhythm game extends the team's earlier CapyQuantum prototypes: [Qubit Factory](https://github.com/kevinhshen/CapyQuantum/tree/codex/archive-qubit-factory-2026-10-10), Ion Garden (`2100d7f`), and Qubit Symphony (`c6d2ad4`). They supplied starting ideas for neighbor-parity correction, beginner teaching, and the game interaction. Standard repetition-code circuits are established quantum techniques, not claimed as new inventions. See [IBM's quantum error-correction course](https://learning.quantum.ibm.com/course/foundations-of-quantum-error-correction/correcting-quantum-errors).

The October 10–11 rhythm-game work adds the vertical recovery interaction, 3–7 lane corrections, separate rhythm and quantum results, six-state reference experiment, lessons and parity lab, holds, shared timing, animated feedback, and the ten-song campaign. Teammates contributed the illustrated tutorial and song arrangements. OpenAI Codex assisted with application code, circuits, visuals, audio, tests, integration, and documentation at the team's direction. Full source and contribution history is in `ATTRIBUTION.md`.

## Validation and limits

Local verification on October 11 passed **41 gameplay, timing, chart, audio, visual-model, and measurement-validation tests**, plus a Qiskit cross-check of **1,638 complex statevectors** and the **298-circuit BasicSimulator batch**. Live Qollab verification on October 11 passed **all 14 free simulator choices**: built-in, AWS Braket, eight IBM models, and four IonQ models. Each completed the live experiment and enabled gameplay. Paid physical hardware was not tested. Queue times and platform availability can still vary. Educational effectiveness and difficulty balance have not been established by a user study.

Application code and documentation are released under the **MIT license** in `LICENSE`. Qiskit retains its own Apache-2.0 license.

This effort is supported by Qollab & IonQ
