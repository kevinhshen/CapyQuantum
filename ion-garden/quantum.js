// Exact five-qubit statevector diagnostics. Three data qubits, two ancillas.
// The management simulation tracks stochastic X errors as an equivalent Pauli frame.
export function diagnose(a, b) {
  return a ? (b ? 0 : 1) : b ? 2 : -1;
}
export function syndrome(mask) {
  return [mask[0] ^ mask[1], mask[0] ^ mask[2]];
}
let kernel = null;
export function installRecoveryKernel(table) {
  for (let m = 0; m < 8; m++)
    for (let c = 0; c < 4; c++) {
      const key =
          [0, 1, 2].map((q) => (m >> q) & 1).join("") +
          ":" +
          [0, 1].map((q) => (c >> q) & 1).join(""),
        v = table?.[key];
      if (
        !Array.isArray(v) ||
        v.length !== 3 ||
        v.some((b) => b !== 0 && b !== 1)
      )
        throw Error("Incomplete Qiskit recovery kernel.");
    }
  kernel = JSON.parse(JSON.stringify(table));
}
export function recover(mask, clue = syndrome(mask)) {
  if (kernel) return [...kernel[mask.join("") + ":" + clue.join("")]];
  const next = [...mask],
    q = diagnose(...clue);
  if (q >= 0) next[q] ^= 1;
  return next;
}
export function statevector(
  mask,
  theta = Math.PI / 2,
  phi = 0,
  correction = false,
  clue = null,
) {
  const v = new Float64Array(64);
  v[0] = Math.cos(theta / 2);
  v[2] = Math.sin(theta / 2) * Math.cos(phi);
  v[3] = Math.sin(theta / 2) * Math.sin(phi);
  const x = (q, controls = []) => {
    for (let i = 0; i < 32; i++)
      if (!(i & (1 << q)) && controls.every((c) => i & (1 << c))) {
        const j = i | (1 << q);
        [v[2 * i], v[2 * j]] = [v[2 * j], v[2 * i]];
        [v[2 * i + 1], v[2 * j + 1]] = [v[2 * j + 1], v[2 * i + 1]];
      }
  };
  x(1, [0]);
  x(2, [0]);
  mask.forEach((e, q) => {
    if (e) x(q);
  });
  x(3, [0]);
  x(3, [1]);
  x(4, [0]);
  x(4, [2]);
  if (correction) {
    const s = clue || syndrome(mask),
      q = diagnose(...s);
    if (q >= 0) x(q);
  }
  x(2, [0]);
  x(1, [0]);
  let p0 = 0,
    p1 = 0,
    re = 0,
    im = 0;
  for (let i = 0; i < 32; i += 2) {
    const ar = v[2 * i],
      ai = v[2 * i + 1],
      br = v[2 * (i + 1)],
      bi = v[2 * (i + 1) + 1];
    p0 += ar * ar + ai * ai;
    p1 += br * br + bi * bi;
    re += ar * br + ai * bi;
    im += ai * br - ar * bi;
  }
  const r = { x: 2 * re, y: -2 * im, z: p0 - p1 };
  const f =
    (1 +
      r.x * Math.sin(theta) * Math.cos(phi) +
      r.y * Math.sin(theta) * Math.sin(phi) +
      r.z * Math.cos(theta)) /
    2;
  return { v, fidelity: Math.max(0, Math.min(1, f)), r };
}
export function memoryFidelity(mask) {
  return (
    [
      [0, 0],
      [Math.PI, 0],
      [Math.PI / 2, 0],
      [Math.PI / 2, Math.PI],
      [Math.PI / 2, Math.PI / 2],
      [Math.PI / 2, (3 * Math.PI) / 2],
    ].reduce((n, [t, p]) => n + statevector(mask, t, p).fidelity, 0) / 6
  );
}
export function qiskitSource() {
  return `# Ion Garden: one coherent three-qubit bit-flip recovery round.
# Actual game uses repeated stochastic X errors, limited helper queues, and
# additional classical measurement/gate error probabilities. This circuit
# isolates the ideal correction kernel; it does not validate those assumptions.
import itertools
import numpy as np
from qiskit import QuantumCircuit
from qiskit.quantum_info import Statevector, partial_trace, state_fidelity

def circuit(errors, theta, phi):
    qc = QuantumCircuit(5)
    qc.ry(theta, 0)
    qc.p(phi, 0)
    qc.cx(0, 1)
    qc.cx(0, 2)
    for q, error in enumerate(errors):
        if error: qc.x(q)
    qc.cx(0, 3)
    qc.cx(1, 3)
    qc.cx(0, 4)
    qc.cx(2, 4)
    qc.ccx(3, 4, 0)
    qc.x(4)
    qc.ccx(3, 4, 1)
    qc.x(4)
    qc.x(3)
    qc.ccx(3, 4, 2)
    qc.x(3)
    qc.cx(0, 2)
    qc.cx(0, 1)
    return qc

inputs = [(0,0),(np.pi,0),(np.pi/2,0),(np.pi/2,np.pi),(np.pi/2,np.pi/2),(np.pi/2,3*np.pi/2)]
for errors in itertools.product([0,1], repeat=3):
    scores = []
    for theta, phi in inputs:
        rho = partial_trace(Statevector.from_instruction(circuit(errors,theta,phi)),[1,2,3,4])
        target = Statevector([np.cos(theta/2),np.exp(1j*phi)*np.sin(theta/2)])
        scores.append(float(state_fidelity(rho,target)))
    print(errors, 'six-state mean fidelity:', np.mean(scores))
`;
}
