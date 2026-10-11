import './content.js';
// Qollab entry: upload this folder's runtime files at the project root.
import * as rhythm from 'quantum.rhythm';
import { startGame } from './game.js';
import { localEngine } from './model.js';
import { summarizeReference } from './reference.js';
let submitted = false;
const engine = {
  label: 'Preparing a live quantum recovery experiment', kind: 'qiskit',
  async run(specs) {
    if (submitted) throw new Error('One job per run. Use Qollab Run to restart.');
    submitted = true;
    this.reference = summarizeReference(JSON.parse(await rhythm.run_reference.callPromising(backend, 64)));
    this.label = `Live experiment: ${this.reference.backend} · Gameplay: exact ideal model`;
    return localEngine.run(specs);
  },
};
await startGame(document.getElementById('app'), engine);
