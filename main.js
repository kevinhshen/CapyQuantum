// Qollab entry point (JS / Qiskit project).
// `backend` is created by Qollab from the Select QPU dialog.
import * as qec from 'quantum.qec';
import { createQiskitEngine } from './engine-qiskit.js';
import { startGame } from './game.js';

const root = document.getElementById('app');
try {
  await startGame(root, await createQiskitEngine(qec, backend));
} catch (err) {
  root.textContent = `Qubit Factory could not start: ${err.message}`;
  console.log(JSON.stringify({ error: String(err) }));
}
