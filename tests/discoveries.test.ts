import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createUniverse } from '../src/core/universe.ts';
import { findAnomaly, investigate } from '../src/gameplay/discoveries.ts';
import { advance } from '../src/simulation/engine.ts';
import { deserialize, serialize } from '../src/persistence/save.ts';
test('investigation chains offer choices and persist distinct rewards', () => {
  const state = createUniverse(45, 0); state.resources.energy = 10000; state.resources.knowledge = 10000; findAnomaly(state, 'planet-0', 0);
  const id = Object.keys(state.anomalies)[0]; assert.ok(id); assert.equal(investigate(state, id).ok, true); advance(state, 60);
  assert.equal(state.anomalies[id].status, 'choice'); assert.equal(investigate(state, id, 'decode').ok, true); advance(state, 90);
  assert.equal(state.anomalies[id].status, 'resolved'); assert.equal(state.resources.exotic, 60); assert.equal(state.artifacts.length, 1);
  assert.deepEqual(deserialize(serialize(state)), state); assert.equal(investigate(state, id).ok, false);
});
test('codex and milestone achievements are deduplicated', () => {
  const state = createUniverse(45, 0); advance(state, 120);
  assert.equal(new Set(state.achievements).size, state.achievements.length); const keys = Object.keys(state.discoveries); advance(state, 30); assert.deepEqual(Object.keys(state.discoveries), keys);
});
