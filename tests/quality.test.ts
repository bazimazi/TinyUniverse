import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createUniverse, makeObject } from '../src/core/universe.ts';
import { foundCivilization } from '../src/simulation/civilizations.ts';
import { advance } from '../src/simulation/engine.ts';
import { buildStructure } from '../src/gameplay/megastructures.ts';
import { useAbility } from '../src/gameplay/abilities.ts';
import { assertUniverse } from '../src/core/invariants.ts';
import { buyUpgrade } from '../src/simulation/economy.ts';
import { startExploration } from '../src/gameplay/exploration.ts';
test('fractional live time never skips decision boundaries', () => {
  const a = createUniverse(101, 0), b = createUniverse(101, 0); advance(a, 1200);
  for (let i = 0; i < 12001; i++) advance(b, 0.1);
  assert.deepEqual(a.objects['planet-0'].life, b.objects['planet-0'].life);
  assert.equal(a.civilizations['civ-planet-0'].technologies.length, b.civilizations['civ-planet-0'].technologies.length);
});
test('a deliberate first ten-minute session finds a moon and intelligent life', () => {
  const state = createUniverse(1307, 0); let firstMoon = 0;
  for (let elapsed = 0; elapsed <= 600; elapsed += 5) {
    const world = state.objects['planet-0'];
    if (!world.upgrades.solar) buyUpgrade(state, world.id, 'solar');
    else if (!world.upgrades.mining) buyUpgrade(state, world.id, 'mining');
    else if (!state.exploration.completed.orbital && !state.exploration.job) startExploration(state);
    else for (const id of ['atmosphere', 'oceans', 'biodiversity'] as const) buyUpgrade(state, world.id, id);
    advance(state, 5);
    if (!firstMoon && state.exploration.completed.orbital) firstMoon = state.time;
  }
  assert.ok(firstMoon > 0 && firstMoon <= 180, `First moon at ${firstMoon}s`);
  assert.equal(state.objects['planet-0'].life!.stage, 'intelligent'); assert.ok(state.civilizations['civ-planet-0']); assertUniverse(state);
});
test('construction completes at the exact deadline even between decision ticks', () => {
  const state = createUniverse(101, 0); advance(state, 12.5); const civ = foundCivilization(state, 'planet-0'); civ.technologies = ['spaceflight']; state.resources.minerals = 5000; state.resources.matter = 5000;
  assert.equal(buildStructure(state, civ.id, 'habitat').ok, true); advance(state, 299.9); assert.equal(state.megastructures[`${civ.id}:habitat`].status, 'building');
  advance(state, 0.1); assert.equal(state.megastructures[`${civ.id}:habitat`].status, 'complete'); assertUniverse(state);
});
test('orbital capture preserves reciprocal hierarchy and has a cooldown', () => {
  const state = createUniverse(101, 0), asteroid = makeObject(state.seed, 'test-asteroid', 'asteroid', 'star-0'); state.objects[asteroid.id] = asteroid; state.objects['star-0'].children.push(asteroid.id);
  const civ = foundCivilization(state, 'planet-0'); civ.technologies = ['gravity']; state.resources.energy = 10000; state.resources.matter = 10000;
  assert.equal(useAbility(state, 'capture', asteroid.id).ok, true); assert.equal(asteroid.parentId, 'planet-0'); assert.equal(useAbility(state, 'capture', asteroid.id).ok, false); assertUniverse(state);
});
