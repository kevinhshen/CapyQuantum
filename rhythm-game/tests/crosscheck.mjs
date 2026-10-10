import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';
import { allSpecs, statevector, localEngine, makeBank } from '../model.js';

const specs = allSpecs();
const python = process.env.QISKIT_PYTHON || '.venv/bin/python';
const output = JSON.parse(execFileSync(python, ['-c', `
import json, sys
from qiskit.quantum_info import Statevector
from qiskit.providers.basic_provider import BasicSimulator
from quantum.rhythm import build_circuit, run_batch
specs = json.loads(sys.stdin.read())
vectors = [Statevector.from_instruction(build_circuit(s, measure=False)).data for s in specs]
class CountedBackend:
    def __init__(self):
        self.inner = BasicSimulator()
        self.jobs = 0
    def run(self, circuits, shots):
        self.jobs += 1
        return self.inner.run(circuits, shots=shots, seed_simulator=42)
backend = CountedBackend()
rows = json.loads(run_batch(backend, json.dumps(specs), 128))
print(json.dumps({'vectors': [{'re': v.real.tolist(), 'im': v.imag.tolist()} for v in vectors], 'rows': rows, 'jobs': backend.jobs}))
`], { input: JSON.stringify(specs), maxBuffer: 4 * 1024 * 1024 }).toString());
for (let i = 0; i < specs.length; i++) {
  const js = statevector(specs[i]), py = output.vectors[i];
  for (let j = 0; j < 32; j++) {
    assert.ok(Math.abs(js.re[j] - py.re[j]) < 1e-12, `real amplitude ${i}/${j}`);
    assert.ok(Math.abs(js.im[j] - py.im[j]) < 1e-12, `imaginary amplitude ${i}/${j}`);
  }
}
const a = makeBank(specs, await localEngine.run(specs), () => .5), b = makeBank(specs, output.rows, () => .5);
for (const s of specs) {
  assert.deepEqual(a.sample(s.error), b.sample(s.error));
  assert.ok(Math.abs(a.fidelity(s.error, s.fix) - b.fidelity(s.error, s.fix)) < 1e-12);
}
assert.equal(output.jobs, 1);
console.log('192/192 full complex statevectors match Qiskit; BasicSimulator syndrome and fidelity results match; exactly one backend job.');
