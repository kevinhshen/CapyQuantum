# CapyQuantum — Qubit Tempo

A garden rhythm game: read quantum parity lamps, choose which qubits to flip, and repair encoded memories to the beat. The active project is in [`rhythm-game/`](rhythm-game/README.md), with 3–7 lanes, original music, practice, and Qiskit validation.

This effort is supported by Qollab & IonQ

## Play and develop

From the repository root:

```sh
npm run dev
```

Open <http://localhost:8766/> for the standalone player with recorded Qiskit results. Open <http://localhost:8766/rhythm-game/dev.html> for development with the JavaScript reference simulator. Rebuild `rhythm-game/PLAY.html` after game changes.

```sh
npm test
npm run test:quantum
```

The quantum check requires Qiskit in `rhythm-game/.venv` or a `QISKIT_PYTHON` environment variable pointing to a Python installation with Qiskit. See the [game README](rhythm-game/README.md) for setup, quantum-model limitations, and Qollab packaging. For teammate maps and music, see [LEVEL_AUTHORING.md](rhythm-game/LEVEL_AUTHORING.md).

## Repository history

`main` contains the rhythm game MVP. The original Qubit Factory source, README, and plan are preserved on [`codex/archive-qubit-factory-2026-10-10`](https://github.com/kevinhshen/CapyQuantum/tree/codex/archive-qubit-factory-2026-10-10), at the former `main` commit `4bf75fd`. Its application files have been removed from the active project. The `codex/quantum-rhythm-mvp` and `qubit-symphony` branches remain available as development history.

Git does not remove ignored or untracked build output when switching branches. Local `rhythm-game/upload/`, ZIPs, recorded-result files, and Python environments can therefore remain in a folder even when its checked-out branch does not track the rhythm game. Generate fresh Qollab output from the current source using `python3 rhythm-game/tools/package_qollab.py`.

## License and attribution

Application license: MIT. Starting points, quantum references, and AI assistance are disclosed in [ATTRIBUTION.md](rhythm-game/ATTRIBUTION.md). Live Qollab execution and hackathon publication remain separate verification steps; see the game README.
