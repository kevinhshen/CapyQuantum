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

## What Qiskit does

`main.js` calls `quantum/rhythm.py` with Qollab's selected backend. It runs **one job containing 298 reference circuits at 64 shots each**, using at most **13 physical qubits**. Changing or replaying a level reuses that reference bank; it does not submit another job. Press Qollab **Stop**, then **Run**, to start a fresh backend run.

The circuits encode one logical state across several data qubits, inject X errors, extract neighboring parity checks with ancillas, and measure recovery after decoding. Six input states test preservation of quantum information. The game updates the parity clues after each player correction, and the result distinguishes a repaired register from a logical flip that leaves the parity checks quiet.

The repetition code guarantees correction of `floor((d−1)/2)` bit flips for `d` data qubits. Four qubits guarantee one correction; seven guarantee three. This code does not protect against phase errors. Each packet represents a fresh register. Rhythm timing is a learning mechanic, not a physical processor's correction speed. Noisy-backend references estimate these reference experiments; they do not simulate the complete noisy gate history of every player input.

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
