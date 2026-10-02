import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createUniverse } from '../src/core/universe.ts';
import { startExploration, mineAsteroid } from '../src/gameplay/exploration.ts';
import { advance } from '../src/simulation/engine.ts';
import { assertUniverse } from '../src/core/invariants.ts';
import { deserialize } from '../src/persistence/save.ts';
import { hash } from '../src/core/random.ts';
test('exploration gates, discovers deterministic bodies and completes offline', () => {
  const a = createUniverse(41, 0), b = createUniverse(41, 0);
  assert.equal(startExploration(a).ok, false);
  for (const state of [a, b]) { state.totalUpgrades = 2; state.resources.energy = 10000; state.resources.minerals = 10000; }
  for (let i = 0; i < 3; i++) { assert.equal(startExploration(a).ok, true); assert.equal(startExploration(b).ok, true); advance(a, 45); advance(b, 45); }
  assert.deepEqual(a, b); assert.equal(Object.values(a.objects).filter(o => o.type === 'moon').length, 1); assert.equal(Object.values(a.objects).filter(o => o.type === 'planet').length, 2);
  a.resources.matter = 100; const asteroid = Object.values(a.objects).find(o => o.type === 'asteroid')!;
  assert.equal(mineAsteroid(a, asteroid.id).ok, true); assert.equal(mineAsteroid(a, asteroid.id).ok, false); assertUniverse(a);
});
test('phase 1 save migrates without losing progression', () => {
  const old: Record<string, unknown> = { ...createUniverse(41, 0), version: 1 }; delete old.exploration;
  const payload = JSON.stringify(old); const state = deserialize(JSON.stringify({ format: 'TinyUniverse', checksum: hash(payload), payload }));
  assert.equal(state.exploration.completed.orbital, 0); assert.equal(state.seed, 41); assertUniverse(state);
});
