// Standalone rhythm rules and five-qubit circuit model. Mirrors quantum/rhythm.py.
export const STATES = ['0', '1', '+', '-', '+i', '-i'];
export const FIXES = [0, 1, 2, 4];
export const KEYS = ['A', 'S', 'D'];
export const syndrome = mask => [(mask & 1) ^ ((mask >> 1) & 1), ((mask >> 1) & 1) ^ ((mask >> 2) & 1)];
export function correction(syn) {
  return ({ '00': 0, '10': 1, '11': 2, '01': 4 })[syn.join('')];
}
export const keyFor = fix => fix ? KEYS[Math.log2(fix)] : 'WAIT';
export const keyOf = spec => `${spec.error}:${spec.fix}:${spec.state}`;
export function allSpecs() {
  return Array.from({ length: 8 }, (_, error) => FIXES.flatMap(fix => STATES.map(state => ({ error, fix, state })))).flat();
}
export function buildOps({ error, fix, state }) {
  const ops = [];
  const g = (gate, ...q) => ops.push({ gate, q });
  if (state === '1') g('x', 0);
  if (['+', '-', '+i', '-i'].includes(state)) g('h', 0);
  if (state === '-') g('z', 0);
  if (state === '+i') g('s', 0);
  if (state === '-i') g('sdg', 0);
  g('cx', 0, 1); g('cx', 0, 2);
  for (let q = 0; q < 3; q++) if (error >> q & 1) g('x', q);
  g('cx', 0, 3); g('cx', 1, 3); g('cx', 1, 4); g('cx', 2, 4);
  for (let q = 0; q < 3; q++) if (fix >> q & 1) g('x', q);
  g('cx', 0, 2); g('cx', 0, 1);
  if (state === '1') g('x', 0);
  if (state === '+i') g('sdg', 0);
  if (state === '-i') g('s', 0);
  if (state === '-') g('z', 0);
  if (['+', '-', '+i', '-i'].includes(state)) g('h', 0);
  return ops;
}
export function statevector(spec) {
  const re = new Float64Array(32), im = new Float64Array(32); re[0] = 1;
  for (const { gate, q: [a, b] } of buildOps(spec)) {
    if (['z', 's', 'sdg'].includes(gate)) {
      for (let i = 0; i < 32; i++) if (i >> a & 1) {
        const r = re[i], v = im[i];
        if (gate === 'z') { re[i] = -r; im[i] = -v; }
        else if (gate === 's') { re[i] = -v; im[i] = r; }
        else { re[i] = v; im[i] = -r; }
      }
      continue;
    }
    const target = gate === 'cx' ? b : a;
    for (let i = 0; i < 32; i++) if (!(i >> target & 1)) {
      const j = i | 1 << target;
      if (gate === 'cx' && !(i >> a & 1)) continue;
      const r0 = re[i], v0 = im[i], r1 = re[j], v1 = im[j];
      if (gate === 'h') {
        re[i] = (r0 + r1) * Math.SQRT1_2; im[i] = (v0 + v1) * Math.SQRT1_2;
        re[j] = (r0 - r1) * Math.SQRT1_2; im[j] = (v0 - v1) * Math.SQRT1_2;
      } else { re[i] = r1; im[i] = v1; re[j] = r0; im[j] = v0; }
    }
  }
  return { re: [...re], im: [...im] };
}
export function distribution(spec) {
  const { re, im } = statevector(spec);
  return re.flatMap((r, i) => {
    const p = r * r + im[i] * im[i];
    return p < 1e-12 ? [] : [{ syn: [i >> 3 & 1, i >> 4 & 1], pass: (i & 7) === 0, weight: p }];
  });
}
export const localEngine = {
  label: 'Local preview · exact JS simulation', kind: 'local',
  async run(specs) { return specs.map(distribution); },
};
export function makeBank(specs, rows, random = Math.random) {
  if (rows.length !== specs.length || rows.some(group => !group.length || group.some(r =>
    !Array.isArray(r.syn) || r.syn.length !== 2 || r.syn.some(b => b !== 0 && b !== 1) ||
    typeof r.pass !== 'boolean' || !Number.isFinite(r.weight) || r.weight < 0) ||
    group.reduce((s, r) => s + r.weight, 0) <= 0)) throw new Error('Invalid simulator results');
  const map = new Map(specs.map((s, i) => [keyOf(s), rows[i]]));
  return {
    sample(error) {
      const group = map.get(`${error}:0:0`);
      let r = random() * group.reduce((s, row) => s + row.weight, 0);
      for (const row of group) { r -= row.weight; if (r <= 0) return [...row.syn]; }
      return [...group.at(-1).syn];
    },
    fidelity(error, fix) {
      return STATES.reduce((sum, state) => {
        const group = map.get(`${error}:${fix}:${state}`);
        return sum + group.reduce((s, r) => s + (r.pass ? r.weight : 0), 0) / group.reduce((s, r) => s + r.weight, 0);
      }, 0) / STATES.length;
    },
  };
}
export function seeded(seed) {
  let value = seed >>> 0;
  return () => { value += 0x6D2B79F5; let t = value; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
export function chart(bank, bpm = 96, seed = 20261010, count = 40) {
  const random = seeded(seed), beat = 60 / bpm;
  return Array.from({ length: count }, (_, i) => {
    const pick = random();
    const error = pick < .2 ? 0 : 1 << Math.floor((pick - .2) / .8 * 3);
    const syn = bank.sample(error);
    return { error, syn, expected: correction(syn), at: 5 * beat + i * 2 * beat, done: false };
  });
}
export function judge(event, fix, time, window = .23) {
  const delta = time - event.at;
  if (Math.abs(delta) > window) return null;
  const correct = fix === event.expected;
  const timing = fix === 0 ? 'Held' : Math.abs(delta) <= .075 ? 'Perfect' : Math.abs(delta) <= .15 ? 'Great' : 'Good';
  return { correct, fix, delta, timing, points: correct ? (fix === 0 ? 100 : timing === 'Perfect' ? 150 : timing === 'Great' ? 125 : 100) : 0 };
}
export function missed(event) {
  return { correct: event.expected === 0, fix: 0, delta: null, timing: event.expected === 0 ? 'Held' : 'Miss', points: event.expected === 0 ? 100 : 0 };
}
