// Local preview engine: a tiny statevector simulator in JavaScript.
// It only exists so the team can try the game in a plain browser.
// On Qollab, main.js uses engine-qiskit.js, which runs real Qiskit circuits.

import { buildOps } from './circuits.js';

export function createLocalEngine() {
  return {
    label: 'Local preview simulator (JS)',
    oneJob: false,
    async run(specs, shots) {
      const perSpec = Array.isArray(shots) ? shots : specs.map(() => shots);
      return specs.map((spec, i) => simulate(spec, perSpec[i]));
    },
  };
}

export function simulate(spec, shots, rand = Math.random) {
  const { ops, nQubits, nClbits } = buildOps(spec);
  const size = 1 << nQubits;
  const re = new Float64Array(size);
  const im = new Float64Array(size);
  re[0] = 1;
  const measures = [];

  for (const op of ops) {
    const [a, b] = op.q || [];
    switch (op.g) {
      case 'x': forPairs(a, (i, j) => { swap(re, i, j); swap(im, i, j); }); break;
      case 'z': for (let i = 0; i < size; i++) if (i >> a & 1) { re[i] = -re[i]; im[i] = -im[i]; } break;
      case 'h': rot(a, Math.SQRT1_2, Math.SQRT1_2, Math.SQRT1_2, -Math.SQRT1_2); break;
      case 'ry': {
        const c = Math.cos(op.theta / 2), s = Math.sin(op.theta / 2);
        rot(a, c, -s, s, c);
        break;
      }
      case 'cx': forPairs(b, (i, j) => { if (i >> a & 1) { swap(re, i, j); swap(im, i, j); } }); break;
      case 'measure': measures.push(op); break;
    }
  }

  // All measurements are at the end, so sample from the final distribution.
  const probs = new Float64Array(size);
  for (let i = 0; i < size; i++) probs[i] = re[i] * re[i] + im[i] * im[i];
  const tally = new Map();
  for (let s = 0; s < shots; s++) {
    let r = rand(), idx = 0;
    while (idx < size - 1 && (r -= probs[idx]) > 0) idx++;
    const bits = new Array(nClbits).fill(0);
    measures.forEach(m => { bits[m.c] = idx >> m.q[0] & 1; });
    const key = bits.join('');
    tally.set(key, (tally.get(key) || 0) + 1);
  }
  const nAnc = (spec.d ?? 3) - 1;
  return [...tally].map(([key, count]) => {
    const bits = key.split('').map(Number);
    return { syn: bits.slice(0, nAnc), data: bits.slice(nAnc), count };
  });

  function forPairs(q, fn) {
    for (let i = 0; i < size; i++) if (!(i >> q & 1)) fn(i, i | 1 << q);
  }
  // Apply the real 2x2 matrix [[m00, m01], [m10, m11]] to qubit q.
  function rot(q, m00, m01, m10, m11) {
    forPairs(q, (i, j) => {
      const r0 = re[i], i0 = im[i], r1 = re[j], i1 = im[j];
      re[i] = m00 * r0 + m01 * r1; im[i] = m00 * i0 + m01 * i1;
      re[j] = m10 * r0 + m11 * r1; im[j] = m10 * i0 + m11 * i1;
    });
  }
}

function swap(arr, i, j) {
  const t = arr[i]; arr[i] = arr[j]; arr[j] = t;
}
