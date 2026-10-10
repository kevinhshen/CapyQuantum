# CapyQuantum — A little room for error

An interactive Quantum Unlocked lab about what a small quantum error-correcting code can—and cannot—protect. Prepare a state, encode it, inject errors, inspect the syndrome, recover it, and verify the result. A capybara keeps watch.

This effort is supported by Qollab & IonQ.

## Run locally

Python 3.10+ is sufficient for the browser lab:

```sh
python3 server.py
```

Open **http://127.0.0.1:8000**. The interface and exact browser simulation work without installing packages. To enable **Check with Qiskit**:

```sh
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
python server.py
```

Use `--port 8001` if needed. Stop with Ctrl+C. Google Fonts is optional; system fonts are used offline. No build step, API key, account, or persistent storage.

## Features

- Four state presets, arbitrary balance and phase controls.
- Independent I/X/Y/Z errors on three data qubits.
- Five navigable stages and automatic playback.
- Animated register, parity syndrome, original/recovered Bloch vectors.
- Exact recovered-state fidelity and X/Z measurement probabilities.
- Prediction missions: recoverable single flip, misleading double flip, invisible phase error.
- Circuit diagram, amplitude inspector, matching Qiskit export.
- Responsive layout, keyboard controls, accessible names, live feedback, reduced-motion support.

## Physics and assumptions

Input `α|0⟩ + β|1⟩` is encoded as `α|000⟩ + β|111⟩`. These are not three independent copies.

Two ancillas store `s01 = q0 XOR q1` and `s02 = q0 XOR q2`. The decoder assumes at most one X error: 00→none, 11→q0, 10→q1, 01→q2. Recovery is coherent (ancilla-controlled), so no mid-circuit measurements or classical feedforward are required. The logical state is decoded into q0.

**Limits:** one correction round, ideal encoding/recovery gates, selected Pauli errors. The code corrects any single X error. It does not correct arbitrary phase errors or multiple bit flips. Some input states are unchanged by otherwise uncorrectable logical operations; high fidelity on one input is not proof of general protection. Y includes bit and phase components. We do not claim realistic hardware reliability, fault tolerance, or quantum speedup.

Fidelity compares the recovered q0 density matrix with the input. It is an ideal simulator diagnostic, not a quantity obtainable from one unknown physical qubit. The register circles are schematic, not independent pure states. The Bloch sphere displays only unencoded input and decoded output. UI statevector labels are **q0 q1 q2 q3 q4**; Qiskit count strings are **q4 q3 q2 q1 q0**.

## Qiskit experiment

```sh
python -m quantum.bitflip --theta 180 --errors I X I
python -m quantum.bitflip --theta 180 --errors X X I
python -m quantum.bitflip --theta 90 --errors I Z I
```

The last case changes |+⟩ to |−⟩: syndrome 00, fidelity 0, unchanged Z probabilities, reversed X probabilities.

## Qollab version

Build the documented JS/Qiskit project layout:

```sh
python3 tools/build_qollab.py
```

Create a **JS / Qiskit** project on Qollab. Add the **contents** of `qollab/` at its root: `index.html`, `main.css`, `main.js`, `quantum/__init__.py`, `quantum/bitflip.py`. Do not upload `.venv`, `server.py`, or tests. Choose a free simulator and run. The Qollab button calls the Python bridge with `callPromising` and the pre-created backend. It submits one X-basis circuit with 256 shots; rerun the Qollab project for another backend job. Browser controls continue supporting ideal exploration without more jobs.

Sampled backend probabilities are separate from ideal Qiskit fidelity. A noise-model simulator may produce different counts. Physical hardware is rejected to keep this MVP on free simulators.

**Validation boundary:** the adapter's Python path was tested with Qiskit's `BasicSimulator`, documented as Qollab's built-in simulator class. Actual upload, Qollab bridge execution, IonQ simulator execution, and publication are not yet verified. Check before submission; this repo alone is not a submission.

Official references:
- https://qollab.xyz/learn/docs/js-qiskit-projects
- https://qollab.xyz/learn/docs/python-qiskit-projects
- https://qollab.xyz/learn/docs/compute-backends

## Tests

Node 18+ and installed Python requirements:

```sh
node --test tests/engine.test.mjs
python -m unittest discover -s tests -p 'test_*.py' -v
```

Set `NODE_BIN=/absolute/path/to/node` if Node isn't on PATH. Tests cover all Pauli errors at every stage (320 browser/Qiskit statevector comparisons), varied-state single-X recovery, failure missions, and execution of exported code.

## Two-minute demo

1. Explain the lab tests the boundary of a bit-flip code, not general fault tolerance.
2. Load the single-flip mission. Predict and recover; show syndrome 10 and 100% fidelity.
3. Load the double-flip mission. Explain why syndrome 01 makes the decoder choose the wrong qubit.
4. Load the phase mission: syndrome 00, fidelity zero, identical Z probabilities, opposite X probabilities.
5. Show Qiskit export and selected Qollab simulator results; distinguish ideal diagnostics from sampled counts.

## Attribution and originality

The three-qubit repetition code is established, not our invention. Conceptual references:
- IBM Quantum: https://quantum.cloud.ibm.com/docs/en/tutorials/repetition-codes
- Riverlane: https://textbook.riverlane.com/en/latest/notebooks/ch2-classical-to-quantum-repcodes/bit-flip-repetition-codes.html

App code, simulator, interaction design, and artwork were generated with OpenAI Codex assistance during the hackathon window. Disclose this and subsequent team contributions on the Qollab page. The educational contribution is the prediction sequence comparing recovery, ambiguous syndromes, and phase-blind verification. Its effectiveness has not yet been measured with learners.

MIT licensed; see LICENSE. Dependencies retain their own licenses.
