import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createUniverse } from '../src/core/universe.ts';
import { useAbility } from '../src/gameplay/abilities.ts';
import { advance } from '../src/simulation/engine.ts';
import { foundCivilization } from '../src/simulation/civilizations.ts';
test('interventions cost resources, respect cooldowns and alter conditions', () => {
  const state = createUniverse(3, 0); state.resources.energy = 10000; state.resources.matter = 10000;
  const water = state.objects['planet-0'].planet!.water;
  assert.equal(useAbility(state, 'terraform', 'planet-0').ok, true); assert.ok(state.objects['planet-0'].planet!.water > water);
  const energy = state.resources.energy; assert.equal(useAbility(state, 'terraform', 'planet-0').ok, false); assert.equal(state.resources.energy, energy);
  assert.equal(useAbility(state, 'gravityUp', 'planet-0').ok, false); advance(state, 90); assert.equal(useAbility(state, 'terraform', 'planet-0').ok, true);
});
test('gifts affect civilization support and knowledge inspires ongoing research', () => {
  const state = createUniverse(3, 0), civ = foundCivilization(state, 'planet-0'); state.resources.energy = 1000; state.resources.minerals = 1000; state.resources.knowledge = 100;
  advance(state, 30); assert.equal(useAbility(state, 'gift', 'planet-0').ok, true); assert.ok(civ.supportUntil > state.time);
  const points = civ.researchPoints; assert.equal(useAbility(state, 'inspire', 'planet-0').ok, true); assert.ok(civ.researchPoints > points);
});
