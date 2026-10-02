import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createUniverse } from '../src/core/universe.ts';
import { advance } from '../src/simulation/engine.ts';
import { foundCivilization } from '../src/simulation/civilizations.ts';
import { assertUniverse } from '../src/core/invariants.ts';
test('intelligence forms a civilization with population, research and personal history', () => {
  const state = createUniverse(12, 0); advance(state, 7200);
  const civ = Object.values(state.civilizations)[0]; assert.ok(civ); assert.ok(civ.population > 1000);
  assert.ok(civ.technologies.length > 4); assert.equal(civ.timeline[0].type, 'CivilizationFounded'); assertUniverse(state);
});
test('civilization collapse archives history and prevents negative populations', () => {
  const state = createUniverse(12, 0), civ = foundCivilization(state, 'planet-0');
  state.objects['planet-0'].planet!.temperature = 600; advance(state, 240);
  assert.equal(civ.status, 'extinct'); assert.equal(civ.population, 0); assert.equal(civ.timeline.at(-1)!.type, 'CivilizationCollapse'); assertUniverse(state);
});
test('research remains deterministic across live and offline stepping', () => {
  const a = createUniverse(98, 0), b = createUniverse(98, 0); advance(a, 7200);
  for (let i = 0; i < 720; i++) advance(b, 10);
  assert.deepEqual(a.civilizations, b.civilizations); assert.deepEqual(a.objects, b.objects);
});
