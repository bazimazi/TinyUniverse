import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createUniverse } from '../src/core/universe.ts';
import { assertUniverse } from '../src/core/invariants.ts';
import { advance, resumeOffline } from '../src/simulation/engine.ts';
import { buyUpgrade, rates, spend } from '../src/simulation/economy.ts';
import { orbitPosition } from '../src/simulation/orbits.ts';
import { deserialize, load, save, serialize, SAVE_KEY, BACKUP_KEY } from '../src/persistence/save.ts';
test('same seed produces identical worlds', () => { assert.deepEqual(createUniverse(8, 0), createUniverse(8, 0)); assert.notDeepEqual(createUniverse(8, 0).objects, createUniverse(9, 0).objects); });
test('economy integrates production and purchases atomically', () => {
  const state = createUniverse(5, 0), initial = state.resources.energy;
  advance(state, 10); assert.equal(state.resources.energy, initial + rates(state).energy * 10);
  assert.equal(buyUpgrade(state, 'planet-0', 'solar').ok, true); assert.equal(rates(state).energy, 4);
  const before = structuredClone(state.resources); assert.equal(spend(state, { energy: 1e20 }), false); assert.deepEqual(state.resources, before);
});
test('offline cap and clock rollback cannot duplicate rewards', () => {
  const state = createUniverse(5, 10000);
  assert.equal(resumeOffline(state, 5000).seconds, 0); assert.equal(state.lastTimestamp, 10000);
  const result = resumeOffline(state, 10000 + 172800000); assert.equal(result.seconds, 86400); assert.equal(result.capped, true);
  assert.equal(resumeOffline(state, state.lastTimestamp).seconds, 0); assertUniverse(state);
});
test('orbit completes a period and remains bounded', () => {
  const planet = createUniverse(5, 0).objects['planet-0'];
  assert.deepEqual(orbitPosition(planet, 0), orbitPosition(planet, planet.orbit!.period));
  for (let time = 0; time < 500; time++) { const p = orbitPosition(planet, time); assert.ok(Math.hypot(p.x, p.y) <= planet.orbit!.radius * 1.06); }
});
test('save roundtrip, corruption recovery and malformed state rejection', () => {
  const state = createUniverse(5, 0); advance(state, 600);
  assert.deepEqual(deserialize(serialize(state)), state);
  const data = new Map<string, string>(); const storage = { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => { data.set(key, value); } };
  save(storage, state); save(storage, state); assert.ok(data.has(BACKUP_KEY)); data.set(SAVE_KEY, 'broken'); assert.deepEqual(load(storage).state, state);
  state.resources.energy = NaN; assert.throws(() => serialize(state));
});
test('negative time and cyclic object graphs are rejected', () => {
  const state = createUniverse(5, 0); assert.throws(() => advance(state, -1)); state.objects['star-0'].parentId = 'planet-0'; assert.throws(() => assertUniverse(state));
});
