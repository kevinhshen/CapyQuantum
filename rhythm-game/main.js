import './content.js';
// Qollab entry: upload this folder's runtime files at the project root.
import * as rhythm from 'quantum.rhythm';
import { startGame } from './game.js';
let submitted = false;
const engine = {
  label: 'Qiskit · selected free simulator', kind: 'qiskit',
  async run(specs) {
    if (submitted) throw new Error('One job per run. Use Qollab Run to restart.');
    submitted = true;
    this.label = `Qiskit · ${await rhythm.backend_name.callPromising(backend)}`;
    return JSON.parse(await rhythm.run_batch.callPromising(backend, JSON.stringify(specs), 64));
  },
};
await startGame(document.getElementById('app'), engine);
