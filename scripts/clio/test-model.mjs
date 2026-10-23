// Run: node scripts/clio/test-model.mjs
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import {facets, groupCases, outcomeCounts, releaseGroups, gate} from '../../posts/reading-millions-of-conversations/model.mjs';

const cases = JSON.parse(readFileSync(new URL('../../posts/reading-millions-of-conversations/cases.json', import.meta.url)));

test('Every question partitions the same twelve unique exchanges exactly once', () => {
  assert.equal(cases.length, 12);
  assert.equal(new Set(cases.map(item => item.id)).size, 12);
  for (const facet of Object.keys(facets)) {
    const ids = groupCases(cases, facet).flatMap(group => group.cases.map(item => item.id));
    assert.deepEqual(ids.sort(), cases.map(item => item.id).sort());
  }
});

test('Missing outcomes remain distinct from failure and change the denominator', () => {
  const result = outcomeCounts(cases);
  assert.deepEqual(result, {successes:3, failures:2, unknown:7, total:12});
  assert.equal(result.successes / result.total, .25);
  assert.equal(result.successes / (result.successes + result.failures), .6);
  for (const item of cases.filter(item => item.outcome !== 'Not observable')) assert.ok(item.followup);
});

test('Historical floors include their exact boundaries and require both counts', () => {
  const group = {identifiable:false, conversations:15, accounts:5};
  assert.ok(gate(group, 'counts').released);
  assert.equal(gate({...group, conversations:14}, 'counts').released, false);
  assert.equal(gate({...group, accounts:4}, 'counts').released, false);
  assert.ok(gate({...group, conversations:500, accounts:250}, 'descriptions').released);
  assert.equal(gate({...group, conversations:499, accounts:250}, 'descriptions').released, false);
  assert.equal(gate({...group, conversations:500, accounts:249}, 'descriptions').released, false);
});

test('More messages cannot manufacture more distinct accounts or clear identifying text', () => {
  for (let volume = 1; volume <= 10; volume++) {
    for (const group of releaseGroups) {
      const result = gate(group, 'descriptions', volume);
      assert.equal(result.accounts, group.accounts);
      assert.equal(result.conversations, group.conversations * volume);
      if (group.accounts < 250 || group.identifiable) assert.equal(result.released, false);
    }
  }
  const repeated = releaseGroups.find(group => group.id === 'repeat');
  assert.equal(gate(repeated, 'counts', 10).released, false);
  const identifying = releaseGroups.find(group => group.id === 'specific');
  assert.ok(gate(identifying, 'counts').released); // Only a broad fixed label leaves.
  assert.equal(gate(identifying, 'descriptions').released, false);
});

test('Starting and doubled-volume releases agree with the static explanation', () => {
  const eligible = (mode, volume) => releaseGroups.filter(group => gate(group, mode, volume).released).map(group => group.id);
  assert.deepEqual(eligible('counts', 1), ['debug', 'writing', 'study', 'interview', 'specific']);
  assert.deepEqual(eligible('descriptions', 1), ['debug', 'writing']);
  assert.deepEqual(eligible('descriptions', 2), ['debug', 'writing', 'interview']);
});

test('Invalid modes and volume values fail rather than produce plausible results', () => {
  assert.throws(() => groupCases(cases, 'imaginary'));
  assert.throws(() => gate(releaseGroups[0], 'imaginary'));
  for (const volume of [0, 11, 1.5, NaN]) assert.throws(() => gate(releaseGroups[0], 'counts', volume));
});
