// Cross-checks the JS circuit builder + local simulator against Qiskit.
// Run from the project root: node tests/crosscheck.mjs
import { execFileSync } from 'node:child_process';
import { simulate } from '../engine-local.js';

const T = Math.PI / 3;
const specs = [];
for (const code of ['bit', 'phase']) {
  for (const d of [1, 3, 5]) {
    for (let q = 0; q < d; q++) {
      for (const p of ['X', 'Z']) {
        specs.push({ code, d, theta: T, errors: [{ q, p }] });
        specs.push({ code, d, theta: T, errors: [{ q, p }], fix: [q], late: [{ q: (q + 1) % d, p }] });
        specs.push({ code, d, theta: Math.PI / 2, basis: 'X', errors: [{ q, p }] });
      }
    }
  }
}
specs.push({ code: 'bit', d: 7, errors: [{ q: 0, p: 'X' }, { q: 4, p: 'X' }] });

const SHOTS = 4000;
const js = specs.map(s => simulate(s, SHOTS));
const py = JSON.parse(execFileSync('.venv/bin/python', ['-W', 'ignore', '-c', `
import json, sys
from qiskit.providers.basic_provider import BasicSimulator
from quantum import qec
print(qec.run_specs(BasicSimulator(), sys.stdin.read(), '${SHOTS}'))
`], { input: JSON.stringify(specs) }).toString());

const freq = rows => Object.fromEntries(rows.map(r => [r.syn.join('') + '|' + r.data.join(''), r.count / SHOTS]));
let bad = 0;
specs.forEach((s, i) => {
  const a = freq(js[i]), b = freq(py[i]);
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
    if (Math.abs((a[k] || 0) - (b[k] || 0)) > 0.05) {
      bad++;
      console.log('MISMATCH', JSON.stringify(s), k, a[k], b[k]);
      break;
    }
  }
});
console.log(`${specs.length - bad}/${specs.length} specs match Qiskit`);
process.exit(bad ? 1 : 0);
