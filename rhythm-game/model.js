// Pauli-X repetition-code reference model. Mirrors quantum/rhythm.py.
export const STATES = ['0', '1', '+', '-', '+i', '-i'];
export const COUNTS = [3, 4, 5, 6, 7];
export const weight = mask => mask.toString(2).replaceAll('0', '').length;
export function syndrome(mask, d = 3) {
  return Array.from({ length: d - 1 }, (_, i) => (mask >> i & 1) ^ (mask >> (i + 1) & 1));
}
export function decode(syn) {
  const bits = [0];
  syn.forEach(b => bits.push(bits.at(-1) ^ b));
  let mask = bits.reduce((m, b, i) => m | b << i, 0);
  const w = weight(mask), d = bits.length;
  if (w * 2 === d) return null; // Even-count ties contain insufficient information.
  if (w * 2 > d) mask ^= (1 << d) - 1;
  return mask;
}
export const keyOf = spec => `${spec.d}:${spec.error}:${spec.state}`;
// 248 syndrome cases plus 50 additional no-error/logical-X state references.
// Multi-key player recovery is represented by its net Pauli-X residual.
export function allSpecs() {
  return COUNTS.flatMap(d => [
    ...Array.from({ length: 1 << d }, (_, error) => ({ d, error, fix: 0, state: '0' })),
    ...[0, (1 << d) - 1].flatMap(error => STATES.slice(1).map(state => ({ d, error, fix: 0, state }))),
  ]);
}
export function buildOps({ d = 3, error, fix = 0, state }) {
  const ops = [], g = (gate, ...q) => ops.push({ gate, q });
  if (state === '1') g('x', 0);
  if (['+', '-', '+i', '-i'].includes(state)) g('h', 0);
  if (state === '-') g('z', 0);
  if (state === '+i') g('s', 0);
  if (state === '-i') g('sdg', 0);
  for (let q = 1; q < d; q++) g('cx', 0, q);
  for (let q = 0; q < d; q++) if (error >> q & 1) g('x', q);
  for (let q = 0; q < d - 1; q++) { g('cx', q, d + q); g('cx', q + 1, d + q); }
  for (let q = 0; q < d; q++) if (fix >> q & 1) g('x', q);
  for (let q = d - 1; q > 0; q--) g('cx', 0, q);
  if (state === '1') g('x', 0);
  if (state === '+i') g('sdg', 0);
  if (state === '-i') g('s', 0);
  if (state === '-') g('z', 0);
  if (['+', '-', '+i', '-i'].includes(state)) g('h', 0);
  return ops;
}
export function statevector(spec) {
  const size = 1 << (2 * (spec.d ?? 3) - 1), re = new Float64Array(size), im = new Float64Array(size); re[0] = 1;
  for (const { gate, q: [a, b] } of buildOps(spec)) {
    if (['z', 's', 'sdg'].includes(gate)) {
      for (let i = 0; i < size; i++) if (i >> a & 1) {
        const r = re[i], v = im[i];
        if (gate === 'z') { re[i] = -r; im[i] = -v; }
        else if (gate === 's') { re[i] = -v; im[i] = r; }
        else { re[i] = v; im[i] = -r; }
      }
      continue;
    }
    const target = gate === 'cx' ? b : a;
    for (let i = 0; i < size; i++) if (!(i >> target & 1)) {
      const j = i | 1 << target;
      if (gate === 'cx' && !(i >> a & 1)) continue;
      const r0 = re[i], v0 = im[i], r1 = re[j], v1 = im[j];
      if (gate === 'h') {
        re[i] = (r0 + r1) * Math.SQRT1_2; im[i] = (v0 + v1) * Math.SQRT1_2;
        re[j] = (r0 - r1) * Math.SQRT1_2; im[j] = (v0 - v1) * Math.SQRT1_2;
      } else { re[i] = r1; im[i] = v1; re[j] = r0; im[j] = v0; }
    }
  }
  return { re, im };
}
export function distribution(spec) {
  const { re, im } = statevector(spec), d = spec.d ?? 3, rows = [];
  for (let i = 0; i < re.length; i++) {
    const p = re[i] ** 2 + im[i] ** 2;
    if (p > 1e-12) rows.push({ syn: Array.from({ length: d - 1 }, (_, q) => i >> (d + q) & 1), pass: (i & ((1 << d) - 1)) === 0, weight: p });
  }
  return rows;
}
export const localEngine = { label: 'Exact local quantum simulation', kind: 'local', async run(specs) { return specs.map(distribution); } };
export function makeBank(specs, rows, random = Math.random) {
  if (rows.length !== specs.length || rows.some((group, i) => !group.length || group.some(r =>
    r.syn?.length !== specs[i].d - 1 || r.syn.some(b => b !== 0 && b !== 1) || typeof r.pass !== 'boolean' || !Number.isFinite(r.weight) || r.weight < 0) ||
    group.reduce((s, r) => s + r.weight, 0) <= 0)) throw new Error('Invalid quantum reference results');
  const data = new Map(specs.map((s, i) => [keyOf(s), rows[i]]));
  const preservation = (d, residual, state) => {
    const group = data.get(`${d}:${residual}:${state}`);
    return group.reduce((s, r) => s + (r.pass ? r.weight : 0), 0) / group.reduce((s, r) => s + r.weight, 0);
  };
  return {
    sample(error, d = 3) {
      const group = data.get(`${d}:${error}:0`);
      let r = random() * group.reduce((s, row) => s + row.weight, 0);
      for (const row of group) { r -= row.weight; if (r <= 0) return [...row.syn]; }
      return [...group.at(-1).syn];
    },
    fidelity(error, fix, d = 3) {
      const residual = error ^ fix;
      // Nonuniform residual X patterns leave the code space for every input.
      // The |0> reference tests that class; the six-state identity/logical-X
      // classes are separately measured. On noisy backends this is a reference
      // estimate, not a gate-noise-aware prediction of the player's trajectory.
      return residual === 0 || residual === (1 << d) - 1
        ? STATES.reduce((s, state) => s + preservation(d, residual, state), 0) / STATES.length
        : preservation(d, residual, '0');
    },
  };
}
export function seeded(seed) {
  let value = seed >>> 0;
  return () => { value += 0x6D2B79F5; let t = value; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
