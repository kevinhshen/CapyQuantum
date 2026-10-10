import test from 'node:test';
import assert from 'node:assert/strict';
import { allSpecs, localEngine, makeBank, syndrome, correction, chart, judge, missed, statevector } from '../model.js';

const specs = allSpecs(), bank = makeBank(specs, await localEngine.run(specs), () => .5);
test('all single errors are diagnosed and preserve every six-state input', () => {
  for (const mask of [0, 1, 2, 4]) {
    assert.equal(correction(syndrome(mask)), mask);
    assert.ok(Math.abs(bank.fidelity(mask, mask) - 1) < 1e-12);
  }
});
test('double errors are ambiguous and minimum-weight recovery leaves a logical error', () => {
  for (const mask of [3, 5, 6]) {
    const single = mask ^ 7;
    assert.deepEqual(syndrome(mask), syndrome(single));
    assert.equal(correction(syndrome(mask)), single);
    assert.ok(Math.abs(bank.fidelity(mask, single) - 1 / 3) < 1e-12);
  }
});
test('wrong corrections damage the encoded state even if a majority readout might look fine', () => {
  assert.equal(bank.fidelity(0, 2), 0);
  assert.equal(bank.fidelity(2, 0), 0);
  assert.equal(bank.fidelity(1, 2), 0);
});
test('all circuits are normalized and experiment identities are unique', () => {
  assert.equal(specs.length, 192);
  assert.equal(new Set(specs.map(s => JSON.stringify(s))).size, 192);
  for (const spec of specs) {
    const v = statevector(spec), sum = v.re.reduce((s, r, i) => s + r * r + v.im[i] * v.im[i], 0);
    assert.ok(Math.abs(sum - 1) < 1e-12);
  }
});
test('seeded chart contains only fresh single-error rounds and repeats exactly', () => {
  assert.deepEqual(chart(bank), chart(bank));
  assert.equal(chart(bank).length, 40);
  assert.ok(chart(bank).some(e => e.error === 0));
  assert.ok(chart(bank).every(e => [0, 1, 2, 4].includes(e.error)));
  assert.ok(chart(bank).every((e, i, a) => !i || e.at > a[i - 1].at));
});
test('timing and diagnosis are evaluated separately, and clean rounds require no input', () => {
  const e = { at: 5, expected: 2 };
  assert.equal(judge(e, 2, 4.7), null);
  assert.equal(judge(e, 2, 5.02).timing, 'Perfect');
  assert.equal(judge(e, 1, 5.02).correct, false);
  assert.equal(judge(e, 2, 5.2).correct, true);
  assert.equal(judge(e, 2, 5.2).timing, 'Good');
  assert.equal(missed(e).correct, false);
  assert.equal(missed({ expected: 0 }).correct, true);
  assert.equal(missed({ expected: 0 }).delta, null);
});
test('malformed backend results fail instead of silently using a local substitute', () => {
  assert.throws(() => makeBank(specs, []), /Invalid simulator/);
  assert.throws(() => makeBank(specs, specs.map(() => [{ syn: [0, 1], pass: true, weight: 0 }])), /Invalid simulator/);
});
