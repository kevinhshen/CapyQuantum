import { syndrome } from './model.js';

// The backend experiment and ideal gameplay results remain separate.
export function summarizeReference(value) {
  if (!value || value.version !== 1 || value.d !== 4 || value.state !== '+' ||
      value.error !== 2 || value.fix !== 2 || typeof value.backend !== 'string' || !value.backend ||
      !Number.isInteger(value.shots) || value.shots < 1 || value.shots > 1024 ||
      !value.counts || Array.isArray(value.counts) || typeof value.counts !== 'object') {
    throw new Error('Invalid live quantum experiment');
  }
  const expected = syndrome(value.error, value.d);
  let total = 0, recovered = 0, parityMatched = 0;
  for (const [bits, count] of Object.entries(value.counts)) {
    if (!/^[01]{7}$/.test(bits) || !Number.isInteger(count) || count < 0) {
      throw new Error('Invalid live quantum measurement counts');
    }
    const measured = [...bits].reverse().map(Number);
    total += count;
    if (measured.slice(0, value.d).every(bit => bit === 0)) recovered += count;
    if (expected.every((bit, i) => measured[value.d + i] === bit)) parityMatched += count;
  }
  if (total !== value.shots) throw new Error('Incomplete live quantum experiment');
  return { ...value, recovered, parityMatched, expected };
}
