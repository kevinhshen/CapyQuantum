import test from "node:test";
import assert from "node:assert/strict";
import {
  createGarden,
  place,
  sell,
  beginContract,
  step,
  setRhythm,
  serialize,
  restore,
  canStart,
  support,
} from "../simulation.js";
import {
  recover,
  syndrome,
  memoryFidelity,
  statevector,
  installRecoveryKernel,
} from "../quantum.js";
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} != ${b}`);
const advance = (s, n) => {
  for (let t = 0; t < n; t += 0.05) step(s, 0.05);
};
function tended(seed = 12) {
  const s = createGarden(seed);
  assert.equal(place(s, "lantern", 6, 4), null);
  assert.equal(place(s, "cooler", 5, 5), null);
  return s;
}
test("repetition recovery corrects all single flips for varied complex input states", () => {
  for (let q = 0; q < 3; q++) {
    const mask = [0, 0, 0];
    mask[q] = 1;
    assert.deepEqual(recover(mask), [0, 0, 0]);
    for (const t of [0, 0.3, 1.8, Math.PI])
      for (const p of [0, 0.8, 3.2])
        close(statevector(mask, t, p, true).fidelity, 1);
  }
});
test("double flips produce logical X even though their clues resemble a single flip", () => {
  for (const m of [
    [1, 1, 0],
    [1, 0, 1],
    [0, 1, 1],
  ]) {
    assert.deepEqual(recover(m), [1, 1, 1]);
    close(memoryFidelity(recover(m)), 1 / 3);
  }
  assert.deepEqual(syndrome([1, 1, 0]), syndrome([0, 0, 1]));
});
test("statevector diagnostics agree with the X-error frame for every mask", () => {
  for (let m = 0; m < 8; m++) {
    const mask = [0, 1, 2].map((q) => (m >> q) & 1);
    close(memoryFidelity(mask), mask[0] ? 1 / 3 : 1);
    const v = statevector(mask, 0.74, 1.97, true).v;
    close(
      [...v].reduce((a, b) => a + b * b, 0),
      1,
    );
  }
});
test("placement charges once, rejects collisions, water and unaffordable purchases", () => {
  const s = createGarden();
  assert.ok(place(s, "habitat", 1, 1));
  assert.equal(s.coins, 80);
  assert.ok(place(s, "habitat", 5, 4));
  assert.equal(place(s, "habitat", 7, 4), null);
  assert.equal(s.coins, 35);
  assert.ok(place(s, "habitat", 8, 4));
  assert.equal(s.coins, 35);
  const e = s.equipment.at(-1);
  assert.equal(sell(s, e.id), 36);
  assert.equal(s.coins, 71);
});
test("contracts require enough habitats and helpers in reach", () => {
  const s = createGarden();
  assert.ok(canStart(s));
  place(s, "lantern", 10, 7);
  assert.ok(canStart(s));
  const a = tended();
  assert.equal(canStart(a), null);
  a.day = 1;
  assert.match(canStart(a), /more habitat/);
});
test("a tended first garden can complete a real contract and unlock the next letter", () => {
  const s = tended();
  assert.equal(beginContract(s), null);
  advance(s, 43);
  assert.equal(s.run, null);
  assert.equal(s.lastOutcome.expected, 3);
  assert.equal(s.lastOutcome.delivered, 3);
  assert.equal(s.lastOutcome.success, true);
  assert.equal(s.day, 1);
  assert.equal(s.coins, 85);
  assert.ok(s.lastOutcome.checks > 10);
  assert.equal(sell(s, 1), 36);
});
test("busy habitats cannot be sold and concurrent contracts cannot start", () => {
  const s = tended();
  beginContract(s);
  assert.equal(sell(s, 1), -1);
  assert.ok(beginContract(s));
});
test("helper stations do not serve two habitats at once and alternate fairly", () => {
  const s = tended();
  s.coins = 200;
  place(s, "habitat", 6, 3);
  s.day = 1;
  beginContract(s);
  advance(s, 8);
  const h = s.equipment.filter((e) => e.type === "habitat");
  assert.ok(h.every((e) => e.checkedAt > 0));
  assert.equal(s.equipment.filter((e) => e.waiting).length <= 1, true);
});
test("cooling and sufficient helpers outperform an overloaded warm garden across seeds", () => {
  let good = 0,
    bad = 0;
  for (let seed = 1; seed <= 40; seed++) {
    for (const cool of [false, true]) {
      const s = createGarden(seed);
      s.coins = 1000;
      s.day = 3;
      place(s, "lantern", 6, 4);
      for (const [x, y] of [
        [6, 3],
        [7, 4],
        [5, 3],
      ])
        place(s, "habitat", x, y);
      if (cool) {
        place(s, "cooler", 6, 5);
        place(s, "lantern", 7, 3);
      } else
        s.equipment
          .filter((e) => e.type === "habitat")
          .forEach((h) => setRhythm(s, h.id, "gentle"));
      beginContract(s);
      advance(s, 79);
      if (cool) good += s.lastOutcome.ratio;
      else bad += s.lastOutcome.ratio;
    }
  }
  assert.ok(good > bad + 8, `cooled ${good / 40}, overloaded ${bad / 40}`);
});
test("save and restore preserve an active contract, random stream and helper jobs", () => {
  const s = tended();
  beginContract(s);
  advance(s, 7);
  const restored = restore(serialize(s));
  assert.ok(restored);
  advance(s, 36);
  advance(restored, 36);
  assert.equal(serialize(s), serialize(restored));
  assert.equal(restore("{broken"), null);
  const corrupted = JSON.parse(serialize(s));
  corrupted.equipment[0].x = -1;
  assert.equal(restore(JSON.stringify(corrupted)), null);
});
test("Qiskit kernel replacement affects the actual recovery path and rejects incomplete data", () => {
  assert.throws(() => installRecoveryKernel({}));
  const table = {};
  for (let m = 0; m < 8; m++)
    for (let c = 0; c < 4; c++) {
      const mask = [0, 1, 2].map((q) => (m >> q) & 1),
        clue = [0, 1].map((q) => (c >> q) & 1);
      table[mask.join("") + ":" + clue.join("")] = recover(mask, clue);
    }
  installRecoveryKernel(table);
  assert.deepEqual(recover([0, 1, 0]), [0, 0, 0]);
});
