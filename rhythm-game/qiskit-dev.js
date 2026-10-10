import { startGame } from './game.js';
import { keyOf } from './model.js';
const engine = {
  label: 'Qiskit · BasicSimulator (cached shots)', kind: 'qiskit',
  async run(specs) {
    const response = await fetch('./qiskit-results.json');
    if (!response.ok) throw new Error('Run tools/prepare_preview.py with Qiskit installed first');
    const data = await response.json();
    if (data.specs.length !== specs.length || data.specs.some((s, i) => keyOf(s) !== keyOf(specs[i]))) throw new Error('Qiskit cache does not match these circuits');
    return data.rows;
  },
};
await startGame(document.getElementById('app'), engine);
