import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createUniverse } from '../src/core/universe.ts';
import { generateSystem } from '../src/gameplay/systems.ts';
import { advance } from '../src/simulation/engine.ts';
import { assertUniverse } from '../src/core/invariants.ts';
test('seeded systems are idempotent and have valid parent-child orbits', () => {
  const a = createUniverse(3, 0), b = createUniverse(3, 0); generateSystem(a, 2); generateSystem(b, 2);
  assert.deepEqual(a, b); const count = Object.keys(a.objects).length; generateSystem(a, 2); assert.equal(Object.keys(a.objects).length, count); assertUniverse(a);
});
test('mass determines stellar remnants and affects planetary climates', () => {
  const state = createUniverse(3, 0), system = generateSystem(state, 3), star = state.objects[system.starId];
  star.stellar!.lifespan = 90; const planet = state.objects[star.children[0]], before = planet.planet!.temperature;
  advance(state, 60); assert.equal(star.stellar!.stage, 'main-sequence'); advance(state, 30);
  assert.equal(star.type, 'black-hole'); assert.ok(planet.planet!.temperature < before); assertUniverse(state);
});
