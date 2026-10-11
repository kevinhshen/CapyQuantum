# Qubit Tempo — learn quantum error correction through rhythm

## About

**Qubit Tempo** is an interactive rhythm game that makes **quantum error correction** easier to understand through music and hands-on learning.

🎵 **Read → Decide → Correct**

Players protect a quantum memory by reading *parity checks*, which indicate whether neighboring qubits agree **(=)** or differ **(≠)**. As each memory packet reaches the recovery line, players use the corresponding keys to apply bit-flip corrections. Harder levels introduce multiple corrections, faster sequences, and hold notes. *Correct timing alone is not enough:* choosing the wrong qubit can add an error instead of repairing one.

⚛ **Connect gameplay with quantum experiments**

The project uses **Qiskit reference circuits** on the selected simulator. Results separate **rhythm performance**, **correction accuracy**, and **preservation of the original quantum information**, helping players understand the consequences of their choices.

📚 **Learn at your own pace**

An animated tutorial, four introductory lessons, untimed practice, and an interactive parity lab guide beginners through the concepts. The lab demonstrates a key limitation: *matching parity checks can still hide a logical error.*

With **ten song levels** and support for **three to seven data qubits**, Qubit Tempo introduces bit-flip error correction through an experience where players can experiment, make mistakes, and learn from the results.

**Theme: Quantum Unlocked.** The problem we explore is how to make quantum error correction understandable to someone with no quantum background. Players learn by making corrections, seeing the checks change, and comparing their rhythm performance with whether they actually restored the quantum memory.

## How to run on Qollab

1. Use a recent Chrome or Edge browser, or another browser supported by Qollab's runtime.
2. Click **Run**, choose the free **Built-in simulator**, and start the run. You can also choose a free simulator from the **Remotely run simulators** group for IonQ; hardware is not required.
3. Wait for the quantum reference experiments to finish. Follow the six-step tutorial, or skip it to reach Home.
4. Select **Start experience**, choose a level, and press **Play**. Start with **Twinkle, Twinkle, Little Star**, or use **Untimed practice** to learn the checks without a timing score.
5. Use **D, F, J, K** for the default four qubits. Press the key for the qubit you want to flip when its packet reaches the recovery line. Hold the chosen key for long notes. Equal checks can mean no correction is needed.

Press **P** or **Escape** to pause. On resume, re-press any held keys. Touch and pointer controls are available on the receptors. **Settings** includes music/effects volume, input compensation, note travel, and reduced motion. **Learn** includes four quantum lessons and an interactive parity lab. In practice, **W** advances to the next packet.

The game has ten synthesized song levels and supports 3–7 data qubits. The keyboard layout for the selected lane count is shown in the game. After a level, the report separates correct-on-beat accuracy, correction choices, restored memories, and reference-state preservation.

## ⚛ How the quantum simulator is used

**Run → quantum experiments → reference bank → gameplay**

The simulator calculates quantum measurement outcomes used by the game. It runs a batch of reference experiments when Qollab starts the project, and gameplay reuses those results.

### 1. When you press Run

Qollab passes the selected simulator to `main.js`, which calls the Qiskit code in `quantum/rhythm.py`. The project builds **298 circuits** covering error patterns for **3–7 data qubits**, including six-input references for the no-error and logical-flip cases.

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

The repetition code guarantees correction of `floor((d−1)/2)` bit flips for `d` data qubits. Four qubits guarantee one correction; seven guarantee three. This code does not protect against phase errors.

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

Local verification on October 11 passed **39 gameplay, timing, chart, audio, and visual-model tests**, plus a Qiskit cross-check of **1,638 complex statevectors** and the **298-circuit BasicSimulator batch**. Live Qollab/IonQ execution must be verified separately; this write-up does not claim it has already passed. Educational effectiveness and difficulty balance have not been established by a user study.

Application code and documentation are released under the **MIT license** in `LICENSE`. Qiskit retains its own Apache-2.0 license.

This effort is supported by Qollab & IonQ
