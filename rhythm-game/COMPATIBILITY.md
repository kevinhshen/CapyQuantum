# Simulator compatibility — October 11, 2026

## Change and evidence

The previous Qollab entry submitted 298 circuits in one job. On the live platform, AWS Braket completed that workload, but IBM Fez remained busy for several minutes. IonQ Forte 1 rejected it with HTTP 400. A minimal one-circuit Bell experiment succeeded, while a two-circuit experiment failed with `Only job type ionq.circuit.v1 is supported`.

The revised entry submits one seven-qubit |+⟩ recovery circuit for 64 shots using Qollab's supplied backend. It passes a single `QuantumCircuit`, rather than a list, and transpiles with one process at optimization level 1. Gameplay uses the exact ideal model; backend measurements are displayed separately. The live experiment covers one known input and correction, not six-state tomography or the player's noisy gate history.

## Local verification

- 41 Node tests passed, including independent recovery/parity measurement interpretation and rejection of incomplete results.
- 1,638 complete complex-statevector comparisons passed against Qiskit.
- All 298 local BasicSimulator reference circuits agreed with the game model.
- The revised 64-shot single-circuit experiment executed on native BasicSimulator, BraketLocalBackend, FakeBoston, FakeKingston, FakePittsburgh, FakeFez, FakeMarrakesh, FakeMiami, FakeAachen, and FakeBerlin.
- Offline IonQ serialization produced `ionq.circuit.v1`, seven qubits, and no multi-circuit array. It submitted no remote job.

Optional provider testing:

```sh
python tests/check_backends.py
```

That test requires Qiskit, qiskit-aer, qiskit-braket-provider, qiskit-ibm-runtime, and qiskit-ionq in a native test environment. These additional libraries are not upload requirements; Qollab supplies its backend adapters.

## Live Qollab verification

All **14 free simulator choices** completed the revised experiment and enabled Play on the signed-in Qollab project draft on October 11, 2026. Each run used 64 shots. The table records one observed run per model, not a statistical benchmark or an availability guarantee.

| Qollab choice | Startup/run seconds | |+⟩ recovery | Expected parity | Play enabled |
|---|---:|---:|---:|---|
| IonQ Forte 1 | 23.5 | 57/64 | 59/64 | Yes |
| IBM Fez | 26.0 | 56/64 | 55/64 | Yes |
| IBM Miami | 16.5 | 55/64 | 61/64 | Yes |
| Built-in | 6.9 | 64/64 | 64/64 | Yes |
| AWS Braket | 12.7 | 64/64 | 64/64 | Yes |
| IBM Boston | 16.7 | 58/64 | 61/64 | Yes |
| IBM Kingston | 18.6 | 54/64 | 57/64 | Yes |
| IBM Pittsburgh | 21.8 | 62/64 | 62/64 | Yes |
| IBM Marrakesh | 43.9 | 57/64 | 59/64 | Yes |
| IBM Aachen | 21.3 | 59/64 | 56/64 | Yes |
| IBM Berlin | 16.0 | 59/64 | 58/64 | Yes |
| IonQ Aria 1 | 23.0 | 57/64 | 61/64 | Yes |
| IonQ Aria 2 | 20.1 | 52/64 | 63/64 | Yes |
| IonQ Forte Enterprise 1 | 20.6 | 49/64 | 53/64 | Yes |

On IBM Fez and IonQ Forte 1, untimed practice also accepted a Q1 correction, changed the checks from ≠ = = to = = =, and awarded 300 points. The live project is [Qubit Tempo](https://qollab.xyz/u/kevinshen/qubit-tempo).

Native and live checks cover the current free simulators. Paid physical hardware was not tested. Account permissions, queue delays, device/browser resources, and future platform availability can still affect execution. No formal hackathon submission is made by these checks.
