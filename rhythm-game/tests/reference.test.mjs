import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizeReference } from '../reference.js';

const sample = counts => ({version:1,d:4,state:'+',error:2,fix:2,shots:64,backend:'test_backend',counts});
test('live recovery and syndrome rates read distinct classical measurement bits', () => {
  const value = summarizeReference(sample({'0110000':40,'0110010':8,'0100000':16}));
  assert.equal(value.recovered,56);
  assert.equal(value.parityMatched,48);
  assert.deepEqual(value.expected,[1,1,0]);
});
test('a failed, incomplete, or mismatched experiment cannot be labeled as a successful backend run', () => {
  for (const value of [null, sample({}), sample({'0110000':63}), sample({'011000':64}),
    sample({'0110000':64.5}), {...sample({'0110000':64}),state:'0'},
    {...sample({'0110000':64}),backend:''}]) {
    assert.throws(() => summarizeReference(value));
  }
});
