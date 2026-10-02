import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createUniverse } from '../src/core/universe.ts';
import { advance } from '../src/simulation/engine.ts';
import { assertUniverse } from '../src/core/invariants.ts';
test('life emerges, ecosystems stay bounded, and hostile worlds evolve slowly', () => {
  const warm = createUniverse(19, 0), cold = createUniverse(19, 0);
  cold.objects['planet-0'].planet!.temperature = 180;
  advance(warm, 1200); advance(cold, 1200);
  assert.equal(warm.objects['planet-0'].life!.stage, 'intelligent');
  assert.equal(cold.objects['planet-0'].life!.stage, 'simple');
  assert.ok(warm.objects['planet-0'].life!.species > 1); assertUniverse(warm); assertUniverse(cold);
});
test('batched offline evolution agrees with small live steps', () => {
  const offline = createUniverse(31, 0), live = createUniverse(31, 0);
  advance(offline, 3600); for (let i = 0; i < 3600; i++) advance(live, 1);
  assert.deepEqual(offline.objects, live.objects); assert.deepEqual(offline.events, live.events);
  for (const key of Object.keys(offline.resources) as (keyof typeof offline.resources)[]) assert.ok(Math.abs(offline.resources[key] - live.resources[key]) < 1e-8);
});
