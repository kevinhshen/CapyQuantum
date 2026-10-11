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

The report separates **correct-on-beat accuracy**, **correction-choice accuracy**, **combo**, **timing**, **whole-register restoration**, and **quantum reference preservation**. Accuracy weights Perfect / Great / Good as `1 / ⅔ / ⅓` and penalizes stray input. A stray near a live packet can apply an extra X; out-of-window strays penalize rhythm without changing a resolved memory.

Song charts follow exact melody attacks and audible percussion accents. The backing melody stays on its audio clock through early, late, wrong, and missed input; short unpitched feedback uses the separate effects channel. Tempo changes, note judgement, and animation share the beat-to-seconds timeline. Supported browsers use audio output timestamps to align visible cues and input with heard sound.

## 📚 Learn the science

**Learn the science** replays the tutorial. The Learn page includes four short lessons on qubits, X/Z errors, encoding, and parity checks.

In the **four-qubit parity lab**, inject a bit flip and try X corrections. A successful repair gives equal checks and 100% ideal reference preservation. Then try **Flip all**: the checks stay equal, but the mean preservation drops to one third across the six test inputs. *Quiet parity checks alone cannot certify recovery.*

Keyboard controls, visible focus, labeled touch controls, text/symbol clues, live announcements, untimed practice, reduced motion, and sound controls support accessibility. This is not a WCAG certification.

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

## ⚛ Quantum model

One logical state `α|0⟩ + β|1⟩` is encoded across `d` data qubits as `α|0…0⟩ + β|1…1⟩`. These qubits form an encoded state, not independent copies. Neighboring ancillas reveal relative bit flips without measuring the logical value. Each packet starts a fresh register.

For three data qubits, `≠ =` identifies Q1, `≠ ≠` identifies Q2, `= ≠` identifies Q3, and `= =` means no correction within the single-error guarantee. Wider codes require the smallest set of flips consistent with every check.

The repetition code guarantees `floor((d−1)/2)` X-error corrections. Even lane counts do not increase that guarantee over the preceding odd count; half-flip patterns are ambiguous and are rejected in authored charts. The code **does not protect against phase errors**. Rhythm speed is a teaching mechanic, not a physical processor's correction speed or a demonstration of general fault tolerance.

The net residual is `injected error XOR applied corrections`. After undoing encoding and input preparation, measuring every data qubit as zero tests overlap with the original encoded pure state.

The bank contains **248 computational-input error patterns** and **50 additional identity/logical-X cases**, totaling **298 reference circuits**. The six inputs are `|0⟩`, `|1⟩`, `|+⟩`, `|−⟩`, `|+i⟩`, and `|−i⟩`. Zero residual preserves all six; a full-register X preserves only the two X-basis inputs, averaging one third. Other residual patterns leave the code space and give zero ideal overlap.

Register restoration uses the known injected error. Displayed initial checks and preservation references come from the selected backend and can be noisy. These sampled reference experiments **do not model the complete gate-noise history of each player input sequence**. See [IBM's error-correction course](https://learning.quantum.ibm.com/course/foundations-of-quantum-error-correction/correcting-quantum-errors).

## ▶ Qollab upload

From this folder:

```sh
python3 tools/package_qollab.py
```

Choose **No template → Upload your own files** and upload **`qubit-tempo-qollab.zip`**. Alternatively, upload the contents of `upload/`, preserving `quantum/`. The top-level `index.html` and `main.js` identify it as a JS/Qiskit project.

The packager creates body-only HTML and combines the visual theme with `feedback.css` into the uploaded **`main.css`**, the only stylesheet Qollab loads. Local preview pages and the standalone player are excluded. The package declares Qiskit in `requirements.txt` and stays within the 100-file / 2-MB-per-file limits.

**`QOLLAB_PROJECT.md` becomes the packaged `README.md`.** When creating a project, Qollab imports it as the Project Card write-up. When adding files to an existing project, Qollab skips README; paste the write-up into Project Card separately. [Qollab upload documentation](https://qollab.xyz/learn/docs/upload-your-files)

Press **Run**, select a free simulator, and wait for setup. `main.js` imports `quantum.rhythm` and calls `.callPromising` with the provided backend. The runtime sends **one job with 298 circuits at 64 shots each**, using H/S/S†/X/Z/CX gates, terminal measurements, and **5–13 physical qubits**. Replaying levels reuses the bank. Press Qollab **Stop → Run** for a fresh backend job.

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

The quantum check needs `.venv` or `QISKIT_PYTHON` pointing to Qiskit Python. Local verification on October 11 passed **39 tests**, covering decoding, lane counts, charts, timing, audio, chords, sequences, holds, pause/resume, wrong inputs, and malformed references. The Qiskit cross-check passed **1,638 complete complex statevectors** (1,488 residual/six-input combinations plus 150 correction circuits) and **one 298-circuit BasicSimulator job**.

Live Qollab/IonQ execution, perceptual audio quality, device latency, human difficulty balance, and educational effectiveness require separate checks. See [REVISION_NOTES.md](REVISION_NOTES.md) for earlier verification history.

### Add levels or adjust effects

**`content.js` is the team content entry point.** Register charts and optional composers in source. Players do not upload music or charts. Read [LEVEL_AUTHORING.md](LEVEL_AUTHORING.md) for the schema and [level-making-rules.md](level-making-rules.md) for timing, holds, difficulty, and validation requirements.

`feedback.js` owns the effect pool; `feedback.css` supplies its styles. Local modular pages load it after `main.css`; both the standalone build and Qollab package bundle them in that order. Themes can override `--fx-hit`, `--fx-second`, and `--fx-error` on `.highway`. Reduced motion retains text and static feedback while suppressing bursts and receptor movement.

## License and hackathon handoff

Application code and documentation use the **MIT license** in [LICENSE](LICENSE). Qiskit retains Apache-2.0. [ATTRIBUTION.md](ATTRIBUTION.md) records the team's starting prototypes, tutorial and song contributions, visual inspiration, quantum references, and OpenAI Codex assistance.

Before submission, verify the actual Qollab run on the free built-in and IonQ simulators, review the project page, add a public **2–3 minute demo video**, publish a **public default version**, and submit through the team captain's form. Local checks do not establish that publication or competition submission has happened.
