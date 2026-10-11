# Qubit Tempo — learn quantum error correction through rhythm

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

## ▶ Play locally

From this `rhythm-game` folder:

```sh
python3 -m http.server 8766 --bind 127.0.0.1
```

Open [http://127.0.0.1:8766/PLAY.html](http://127.0.0.1:8766/PLAY.html). `PLAY.html` is the generated standalone player. The committed build embeds **recorded Qiskit BasicSimulator results** and submits no live backend job. It contains the code and synthesized audio needed for offline playback; direct `file://` playback remains a manual check.

For development, `dev.html` uses the exact JavaScript reference simulator. `qiskit.html` uses a locally generated Qiskit result bank. The live Qollab entry is `main.js`, which calls Python/Qiskit using Qollab's selected backend.

## 🎵 How to play

1. Follow or skip the **six-step animated tutorial** that opens on launch.
2. Select **Start experience**, choose a song, and press **Play**. The ten-song campaign starts with **Twinkle, Twinkle, Little Star** and ends with **Symphony No. 5 in C Minor**. The old garden tracks and five CC0 recordings are retired.
3. Read the checks between qubits: **≠ means different; = means the same**. Find the smallest set of bit flips that explains the pattern.
4. Apply those corrections when the packet reaches the recovery line. Clean packets need no input. Qubit markers do not reveal which lane is faulty.
5. For a long packet, press the chosen key at its head and hold until the tail reaches the line. The correction applies **once**; releasing early loses rhythm credit without undoing the repair.

Multiple corrections can be played as chords or short sequences. Their key order is flexible: the current quantum error determines whether a flip repairs the memory or adds an error. Two separate X flips on the same qubit cancel.

| Data qubits / lanes | Keys | Guaranteed X-error correction |
|---|---|---|
| 3 | D F J | 1 bit flip |
| 4 (default) | D F J K | 1 bit flip |
| 5 | D F Space J K | 2 bit flips |
| 6 | S D F J K L | 2 bit flips |
| 7 | S D F Space J K L | 3 bit flips |

**P / Escape** pauses. Re-press held keys after resuming. Pointer/touch receptors apply the same corrections. **Untimed practice** presents representative packets without a rhythm rank; holds need only one press, and **W** advances to the next packet.

**Settings** controls music/effects volume, note travel, input compensation, and reduced motion. Mute preserves the song clock. The Home Bloch sphere illustrates a fixed single-qubit pure state; its moving view is separate from gameplay and backend results.

### Rhythm and recovery results

Perfect, Great, and Good use windows of **45 / 90 / 145 ms** and award **300 / 200 / 100 points** for correct corrections. A perfectly timed wrong-lane flip earns zero, adds an error, and breaks the combo. Repeated keydown events are ignored; separate taps apply separate X operations.

The report separates **correct-on-beat accuracy**, **correction-choice accuracy**, **combo**, **timing**, **whole-register restoration**, and **ideal-model preservation**. Accuracy weights Perfect / Great / Good as `1 / ⅔ / ⅓` and penalizes stray input. A stray near a live packet can apply an extra X; out-of-window strays penalize rhythm without changing a resolved memory.

Song charts follow exact melody attacks and audible percussion accents. The backing melody stays on its audio clock through early, late, wrong, and missed input; short unpitched feedback uses the separate effects channel. Tempo changes, note judgement, and animation share the beat-to-seconds timeline. Supported browsers use audio output timestamps to align visible cues and input with heard sound.

## 📚 Learn the science

**Learn the science** replays the tutorial. The Learn page includes four short lessons on qubits, X/Z errors, encoding, and parity checks.

In the **four-qubit parity lab**, inject a bit flip and try X corrections. A successful repair gives equal checks and 100% ideal reference preservation. Then try **Flip all**: the checks stay equal, but the mean preservation drops to one third across the six test inputs. *Quiet parity checks alone cannot certify recovery.*

Keyboard controls, visible focus, labeled touch controls, text/symbol clues, live announcements, untimed practice, reduced motion, and sound controls support accessibility. This is not a WCAG certification.

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

## ⚛ Quantum model

One logical state `α|0⟩ + β|1⟩` is encoded across `d` data qubits as `α|0…0⟩ + β|1…1⟩`. These qubits form an encoded state, not independent copies. Neighboring ancillas reveal relative bit flips without measuring the logical value. Each packet starts a fresh register.

For three data qubits, `≠ =` identifies Q1, `≠ ≠` identifies Q2, `= ≠` identifies Q3, and `= =` means no correction within the single-error guarantee. Wider codes require the smallest set of flips consistent with every check.

The repetition code guarantees `floor((d−1)/2)` X-error corrections. Even lane counts do not increase that guarantee over the preceding odd count; half-flip patterns are ambiguous and are rejected in authored charts. The code **does not protect against phase errors**. Rhythm speed is a teaching mechanic, not a physical processor's correction speed or a demonstration of general fault tolerance.

The net residual is `injected error XOR applied corrections`. After undoing encoding and input preparation, measuring every data qubit as zero tests overlap with the original encoded pure state.

The bank contains **248 computational-input error patterns** and **50 additional identity/logical-X cases**, totaling **298 reference circuits**. The six inputs are `|0⟩`, `|1⟩`, `|+⟩`, `|−⟩`, `|+i⟩`, and `|−i⟩`. Zero residual preserves all six; a full-register X preserves only the two X-basis inputs, averaging one third. Other residual patterns leave the code space and give zero ideal overlap.

Register restoration uses the known injected error. Gameplay checks and preservation use the exact ideal model. The selected backend measures a separate fixed recovery experiment; its noise does not change gameplay clues or scoring. Neither path models the complete noisy history of player keystrokes. See [IBM's error-correction course](https://learning.quantum.ibm.com/course/foundations-of-quantum-error-correction/correcting-quantum-errors).

## ▶ Qollab upload

From this folder:

```sh
python3 tools/package_qollab.py
```

Choose **No template → Upload your own files** and upload **`qubit-tempo-qollab.zip`**. Alternatively, upload the contents of `upload/`, preserving `quantum/`. The top-level `index.html` and `main.js` identify it as a JS/Qiskit project.

The packager creates body-only HTML and combines the visual theme with `feedback.css` into the uploaded **`main.css`**, the only stylesheet Qollab loads. Local preview pages and the standalone player are excluded. The package declares Qiskit in `requirements.txt` and stays within the 100-file / 2-MB-per-file limits.

**`QOLLAB_PROJECT.md` becomes the packaged `README.md`.** When creating a project, Qollab imports it as the Project Card write-up. When adding files to an existing project, Qollab skips README; paste the write-up into Project Card separately. [Qollab upload documentation](https://qollab.xyz/learn/docs/upload-your-files)

Press **Run**, select a free simulator, and wait for setup. `main.js` imports `quantum.rhythm` and calls `run_reference.callPromising` with the provided backend. The runtime sends **one seven-qubit circuit at 64 shots**, using H/X/CX gates and terminal measurements. The game uses its exact ideal model for all lane counts. Press Qollab **Stop → Run** for a fresh backend experiment.

No Aer, paid hardware, storage, POST requests, workers, API keys, or credentials are required. Settings and scores last for the current run. Backend errors stay visible instead of silently switching simulators.

## 🛠 Development and validation

Generate local Qiskit references and rebuild the standalone player:

```sh
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements.txt
.venv/bin/python tools/prepare_preview.py
python3 tools/build_standalone.py
```

`PLAY.html` embeds the result bank when present and otherwise labels its exact local JavaScript simulator. Rebuild after source/content edits. The recorded result file is ignored by Git; the generated standalone player is committed.

```sh
npm test
npm run test:quantum
```

The quantum check needs `.venv` or `QISKIT_PYTHON` pointing to Qiskit Python. Local verification on October 11 passed **41 tests**, covering decoding, lane counts, charts, timing, audio, chords, sequences, holds, pause/resume, wrong inputs, and malformed references. The Qiskit cross-check passed **1,638 complete complex statevectors** (1,488 residual/six-input combinations plus 150 correction circuits) and **one 298-circuit BasicSimulator job**.

The optional `tests/check_backends.py` check passed native execution on BasicSimulator, Braket, and all eight IBM fake backends, plus offline IonQ single-circuit serialization. It requires additional provider libraries only in the test environment. Live Qollab checks also passed **all 14 free simulator choices**, with startup/run times of **6.9–43.9 seconds** in these observed runs. See [COMPATIBILITY.md](COMPATIBILITY.md) for the per-model results. Paid physical hardware, perceptual audio quality, device latency, human difficulty balance, and educational effectiveness require separate checks. See [REVISION_NOTES.md](REVISION_NOTES.md) for earlier verification history.

### Add levels or adjust effects

**`content.js` is the team content entry point.** Register charts and optional composers in source. Players do not upload music or charts. Read [LEVEL_AUTHORING.md](LEVEL_AUTHORING.md) for the schema and [level-making-rules.md](level-making-rules.md) for timing, holds, difficulty, and validation requirements.

`feedback.js` owns the effect pool; `feedback.css` supplies its styles. Local modular pages load it after `main.css`; both the standalone build and Qollab package bundle them in that order. Themes can override `--fx-hit`, `--fx-second`, and `--fx-error` on `.highway`. Reduced motion retains text and static feedback while suppressing bursts and receptor movement.

## License and hackathon handoff

Application code and documentation use the **MIT license** in [LICENSE](LICENSE). Qiskit retains Apache-2.0. [ATTRIBUTION.md](ATTRIBUTION.md) records the team's starting prototypes, tutorial and song contributions, visual inspiration, quantum references, and OpenAI Codex assistance.

Before submission, verify the actual Qollab run on the free built-in and IonQ simulators, review the project page, add a public **2–3 minute demo video**, publish a **public default version**, and submit through the team captain's form. Local checks do not establish that publication or competition submission has happened.
