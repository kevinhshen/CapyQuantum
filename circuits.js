// Mirrors quantum/qec.py build_circuit(): spec -> gate list.
// Used to draw circuit diagrams and by the local preview simulator.
// tests/crosscheck.mjs verifies it matches the Qiskit version.

export function buildOps(spec) {
  const code = spec.code || 'bit';
  const d = spec.d ?? 3;
  const theta = spec.theta || 0;
  const basis = spec.basis || 'Z';
  const nAnc = d - 1;
  const data = [...Array(d).keys()];
  const anc = data.slice(1).map((_, i) => d + i);
  const ops = [];
  const H = qs => qs.forEach(q => ops.push({ g: 'h', q: [q] }));
  const errs = (list, stage) => list.forEach(e => ops.push({ g: e.p.toLowerCase(), q: [e.q], stage }));
  const section = label => ops.push({ g: 'section', label });

  section('Encode');
  if (theta) ops.push({ g: 'ry', q: [0], theta });
  data.slice(1).forEach(q => ops.push({ g: 'cx', q: [0, q] }));
  if (code === 'phase') H(data);

  section('Error');
  errs(spec.errors || [], 'error');

  if (nAnc) {
    section('Check');
    if (code === 'phase') H(data);
    anc.forEach((a, i) => {
      ops.push({ g: 'cx', q: [data[i], a] });
      ops.push({ g: 'cx', q: [data[i + 1], a] });
    });
    if (code === 'phase') H(data);
  }

  if (spec.fix?.length) {
    section('Fix');
    spec.fix.forEach(q => ops.push({ g: code === 'phase' ? 'z' : 'x', q: [q], stage: 'fix' }));
  }
  if (spec.late?.length) {
    section('Error');
    errs(spec.late, 'error');
  }

  section('Measure');
  if (code === 'phase' || basis === 'X') H(data);
  data.forEach((q, i) => ops.push({ g: 'measure', q: [q], c: nAnc + i }));
  anc.forEach((a, i) => ops.push({ g: 'measure', q: [a], c: i }));
  return { ops, nQubits: d + nAnc, nClbits: nAnc + d };
}

// Logical value of one shot's data bits.
// Bit-flip code (Z basis) and phase-flip code: majority vote.
// Bit-flip code read in the X basis: parity (0 = "+", 1 = "−").
export function logicalValue(spec, dataBits) {
  if (spec.basis === 'X' && (spec.code || 'bit') === 'bit') {
    return dataBits.reduce((a, b) => a ^ b, 0);
  }
  const ones = dataBits.reduce((a, b) => a + b, 0);
  return ones * 2 > dataBits.length ? 1 : 0;
}

// Minimum-weight decoder for a repetition code.
// syn[i] = parity of data qubits i and i+1. Returns qubits to flip.
export function decode(syn) {
  const d = syn.length + 1;
  const a = [0];
  for (let i = 0; i < syn.length; i++) a.push(a[i] ^ syn[i]);
  const w = a.reduce((s, b) => s + b, 0);
  const pattern = w * 2 <= d ? a : a.map(b => 1 - b);
  return pattern.flatMap((b, i) => (b ? [i] : []));
}

// Probability that a distance-d repetition code fails when each data
// qubit flips independently with probability p (perfect checks).
export function theoryFail(d, p) {
  let total = 0;
  for (let k = Math.floor(d / 2) + 1; k <= d; k++) total += choose(d, k) * p ** k * (1 - p) ** (d - k);
  return total;
}

function choose(n, k) {
  let r = 1;
  for (let i = 1; i <= k; i++) r = (r * (n - k + i)) / i;
  return r;
}

// Stable key so identical experiments can be cached and batched.
export function specKey(spec) {
  const errs = l => (l || []).map(e => e.p + e.q).sort().join(',');
  return [spec.code || 'bit', spec.d ?? 3, (spec.theta || 0).toFixed(4), spec.basis || 'Z',
    errs(spec.errors), [...(spec.fix || [])].sort().join(','), errs(spec.late)].join('|');
}
